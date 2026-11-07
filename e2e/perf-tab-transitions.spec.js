/* global process */
// e2e/perf-tab-transitions.spec.js
import { test } from '@playwright/test';
import { getHeavyAccountData } from './fixtures/heavyAccountFixture.js';
import fs from 'fs';
import path from 'path';

const TRANSITIONS = [
  { from: 'resumo', to: 'pessoas', name: 'Resumo -> Pessoas (1ª vez / visita fria)', isCold: true },
  { from: 'resumo', to: 'pessoas', name: 'Resumo -> Pessoas (2ª vez / visita quente)', isCold: false },
  { from: 'pessoas', to: 'cards', name: 'Pessoas -> Cartões' },
  { from: 'cards', to: 'transactions', name: 'Cartões -> Movimentações' },
  { from: 'transactions', to: 'subscriptions', name: 'Movimentações -> Assinaturas' },
  { from: 'subscriptions', to: 'resumo', name: 'Assinaturas -> Resumo' },
];

const CPU_RATES = [1, 4, 6];

test.describe('Bloco C: Medição Sistemática de Fluidez da Troca de Abas', () => {
  test.skip(!process.env.FC_PERF, 'benchmark de performance: rode com FC_PERF=1');

  test('Mede trocas de abas sob CPU 1x, 4x e 6x com profiling CDP e detecção de Long Tasks', async ({ browser }) => {
    test.setTimeout(300000);
    const heavyData = getHeavyAccountData('2026-11');
    const allResults = [];
    const cdpProfiles = {};

    for (const rate of CPU_RATES) {
      console.log(`\n========================================`);
      console.log(`INICIANDO MEDIÇÕES SOB CPU THROTTLING ${rate}x`);
      console.log(`========================================`);

      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await context.newPage();
      const cdp = await context.newCDPSession(page);

      if (rate > 1) {
        await cdp.send('Emulation.setCPUThrottlingRate', { rate });
      }

      await page.addInitScript(({ d }) => {
        localStorage.setItem('theme', 'dark');
        const user = {
          uid: 'heavy-perf-user',
          email: 'perf@fincontrol.app',
          displayName: 'Mariana Vasconcelos',
          plan: 'pro',
        };
        window.__FINCONTROL_E2E_USER__ = user;
        window.__FINCONTROL_E2E_MOCK_DATA__ = d;
        sessionStorage.setItem('fincontrol_e2e_user', JSON.stringify(user));
        sessionStorage.setItem('fincontrol_e2e_plan', 'pro');
        sessionStorage.setItem('fincontrol_e2e_data', JSON.stringify(d));

        window.__FC_LONG_TASKS__ = [];
        try {
          const obs = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              window.__FC_LONG_TASKS__.push({
                name: entry.name,
                startTime: entry.startTime,
                duration: entry.duration,
              });
            }
          });
          obs.observe({ entryTypes: ['longtask'] });
        } catch (_e) {
          // PerformanceObserver fallback
        }
      }, { d: heavyData });

      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      for (const trans of TRANSITIONS) {
        // Se for visita quente de Pessoas, primeiro volta para Resumo
        if (!trans.isCold && trans.name.includes('2ª vez')) {
          const resumoBtn = page.getByRole('button', { name: 'Resumo' }).first();
          await resumoBtn.click();
          await page.waitForTimeout(1500);
        }

        // Limpa long tasks antes da transição
        await page.evaluate(() => {
          window.__FC_LONG_TASKS__ = [];
          window.__FC_TRANS_START__ = performance.now();
          window.__FC_PEAK_TIME__ = null;

          const onRevealStart = () => {
            window.__FC_PEAK_TIME__ = performance.now();
            window.removeEventListener('fc:page-reveal-start', onRevealStart);
          };
          window.addEventListener('fc:page-reveal-start', onRevealStart);
        });

        // Habilita profiler CDP se estiver em CPU 4x para coletar traces profundos
        const shouldProfile = rate === 4;
        if (shouldProfile) {
          await cdp.send('Profiler.enable');
          await cdp.send('Profiler.start');
        }

        const targetLabel = trans.to === 'resumo' ? 'Resumo'
          : trans.to === 'pessoas' ? 'Pessoas'
          : trans.to === 'cards' ? 'Cartões'
          : trans.to === 'transactions' ? 'Movimentações'
          : 'Assinaturas';

        const navBtn = page.getByRole('button', { name: targetLabel }).first();
        const clickStart = Date.now();
        await navBtn.click();

        // Aguarda o término da transição
        await page.waitForFunction(() => {
          return !document.documentElement.classList.contains('fc-transitioning');
        }, { timeout: 25000 });
        const clickEnd = Date.now();

        let profileData = null;
        if (shouldProfile) {
          profileData = await cdp.send('Profiler.stop');
          await cdp.send('Profiler.disable');
          cdpProfiles[`${trans.name}-cpu${rate}`] = profileData.profile;
        }

        const perfMetrics = await page.evaluate(() => {
          const tasks = window.__FC_LONG_TASKS__ || [];
          const maxDuration = tasks.reduce((max, t) => Math.max(max, t.duration), 0);
          const tbt = tasks.reduce((sum, t) => sum + Math.max(0, t.duration - 50), 0);
          const peak = window.__FC_PEAK_TIME__ && window.__FC_TRANS_START__
            ? window.__FC_PEAK_TIME__ - window.__FC_TRANS_START__
            : null;
          return {
            longTasksCount: tasks.length,
            maxLongTaskMs: Math.round(maxDuration),
            tbtMs: Math.round(tbt),
            peakMs: peak ? Math.round(peak) : null,
            tasks: tasks.map(t => ({ duration: Math.round(t.duration), startTime: Math.round(t.startTime) })),
          };
        });

        const totalTransitionMs = clickEnd - clickStart;

        const record = {
          cpuRate: `${rate}x`,
          transition: trans.name,
          from: trans.from,
          to: trans.to,
          totalTransitionMs,
          peakMs: perfMetrics.peakMs,
          longTasksCount: perfMetrics.longTasksCount,
          maxLongTaskMs: perfMetrics.maxLongTaskMs,
          tbtMs: perfMetrics.tbtMs,
          tasks: perfMetrics.tasks,
        };

        console.log(`[${rate}x] ${trans.name}: Total = ${totalTransitionMs}ms | Peak = ${perfMetrics.peakMs}ms | LongTasks = ${perfMetrics.longTasksCount} (Max = ${perfMetrics.maxLongTaskMs}ms, TBT = ${perfMetrics.tbtMs}ms)`);
        allResults.push(record);
        await page.waitForTimeout(600);
      }

      await context.close();
    }

    // Salva dados brutos e perfis em scratch
    const outDir = path.resolve(process.cwd(), 'scratch');
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }
    fs.writeFileSync(path.resolve(outDir, 'perf-measurements-after.json'), JSON.stringify(allResults, null, 2));

    // Analisa nós mais lentos nos perfis CDP coletados
    const analyzedProfiles = {};
    for (const [key, profile] of Object.entries(cdpProfiles)) {
      if (!profile || !profile.nodes) continue;
      const nodeTimes = {};
      const samples = profile.samples || [];
      const timeDeltas = profile.timeDeltas || [];

      for (let i = 0; i < samples.length; i++) {
        const nodeId = samples[i];
        const delta = (timeDeltas[i] || 0) / 1000; // micros to ms
        nodeTimes[nodeId] = (nodeTimes[nodeId] || 0) + delta;
      }

      const topNodes = Object.entries(nodeTimes)
        .map(([nodeId, timeMs]) => {
          const node = profile.nodes.find(n => n.id === Number(nodeId));
          return {
            functionName: node?.callFrame?.functionName || '(anonymous)',
            url: node?.callFrame?.url || '',
            lineNumber: node?.callFrame?.lineNumber || 0,
            selfTimeMs: Math.round(timeMs),
          };
        })
        .filter(n => n.selfTimeMs > 5 && !n.url.includes('node_modules'))
        .sort((a, b) => b.selfTimeMs - a.selfTimeMs)
        .slice(0, 10);

      analyzedProfiles[key] = topNodes;
    }

    fs.writeFileSync(path.resolve(outDir, 'cdp-top-nodes-after.json'), JSON.stringify(analyzedProfiles, null, 2));
    console.log('\n[MEDIÇÕES AFTER CONCLUÍDAS COM SUCESSO. DADOS SALVOS EM scratch/]');
  });
});
