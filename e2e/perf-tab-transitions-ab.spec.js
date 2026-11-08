/* global process */
// e2e/perf-tab-transitions-ab.spec.js
import { test } from '@playwright/test';
import { getHeavyAccountData } from './fixtures/heavyAccountFixture.js';
import fs from 'fs';
import path from 'path';

function calculateStats(values) {
  if (!values || values.length === 0) return { median: 0, p90: 0, min: 0, max: 0 };
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  
  // Mediana
  const mid = Math.floor(n / 2);
  const median = n % 2 !== 0 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
  
  // P90 (índice ceil(0.9 * n) - 1)
  const p90Index = Math.min(n - 1, Math.max(0, Math.ceil(0.9 * n) - 1));
  const p90 = sorted[p90Index];
  
  return {
    median: Math.round(median),
    p90: Math.round(p90),
    min: Math.round(sorted[0]),
    max: Math.round(sorted[n - 1]),
  };
}

const TRANSITIONS_BY_CPU = {
  1: [
    { from: 'resumo', to: 'pessoas', name: 'Resumo -> Pessoas (fria)', isCold: true },
    { from: 'resumo', to: 'pessoas', name: 'Resumo -> Pessoas (quente)', isCold: false },
    { from: 'pessoas', to: 'cards', name: 'Pessoas -> Cartões' },
    { from: 'subscriptions', to: 'resumo', name: 'Assinaturas -> Resumo' },
  ],
  4: [
    { from: 'resumo', to: 'pessoas', name: 'Resumo -> Pessoas (fria)', isCold: true },
    { from: 'resumo', to: 'pessoas', name: 'Resumo -> Pessoas (quente)', isCold: false },
    { from: 'pessoas', to: 'cards', name: 'Pessoas -> Cartões' },
    { from: 'subscriptions', to: 'resumo', name: 'Assinaturas -> Resumo' },
  ],
  6: [
    { from: 'resumo', to: 'pessoas', name: 'Resumo -> Pessoas (fria)', isCold: true },
    { from: 'resumo', to: 'pessoas', name: 'Resumo -> Pessoas (quente)', isCold: false },
    { from: 'subscriptions', to: 'resumo', name: 'Assinaturas -> Resumo' },
  ],
};

const CPU_RATES = [1, 4, 6];
const REPETITIONS = 7;

test.describe('FinControl — Benchmark Científico A/B de Troca de Abas (N >= 7, 1x, 4x, 6x)', () => {
  test.skip(!process.env.FC_PERF, 'benchmark de performance: rode com FC_PERF=1');

  test('Executa N=7 medições sistemáticas por cenário e calcula Mediana e P90', async ({ browser }) => {
    test.setTimeout(1200000); // 20 minutos para suite completa de múltiplos cenários em CPU 1x, 4x e 6x
    const heavyData = getHeavyAccountData('2026-11');
    const fullReport = [];

    for (const rate of CPU_RATES) {
      console.log(`\n==================================================`);
      console.log(`BENCHMARK A/B: CPU THROTTLING ${rate}x (${REPETITIONS} REPETIÇÕES)`);
      console.log(`==================================================`);

      for (const trans of TRANSITIONS_BY_CPU[rate]) {
        console.log(`\n--- Testando cenário: [${rate}x] ${trans.name} ---`);
        const maxTasksList = [];
        const tbtsList = [];
        const timeToUsableList = [];
        const veilDurationsList = [];

        for (let rep = 1; rep <= REPETITIONS; rep++) {
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
              void _e;
            }
          }, { d: heavyData });

          await page.goto('/dashboard');
          await page.waitForLoadState('networkidle');
          await page.waitForTimeout(1000);

          // Se for visita quente de Pessoas, primeiro visita Pessoas e volta para Resumo
          if (!trans.isCold && trans.name.includes('quente')) {
            const pBtn = page.getByRole('button', { name: 'Pessoas' }).first();
            await pBtn.click();
            await page.waitForFunction(() => !document.documentElement.classList.contains('fc-transitioning'), { timeout: 20000 });
            await page.waitForTimeout(500);

            const rBtn = page.getByRole('button', { name: 'Resumo' }).first();
            await rBtn.click();
            await page.waitForFunction(() => !document.documentElement.classList.contains('fc-transitioning'), { timeout: 20000 });
            await page.waitForTimeout(500);
          } else if (trans.from !== 'resumo') {
            // Navega até a aba de origem
            const fromLabel = trans.from === 'pessoas' ? 'Pessoas'
              : trans.from === 'cards' ? 'Cartões'
              : trans.from === 'transactions' ? 'Movimentações'
              : 'Assinaturas';
            const fromBtn = page.getByRole('button', { name: fromLabel }).first();
            await fromBtn.click();
            await page.waitForFunction(() => !document.documentElement.classList.contains('fc-transitioning'), { timeout: 20000 });
            await page.waitForTimeout(500);
          }

          // Inicia rastreamento da transição alvo
          await page.evaluate(() => {
            window.__FC_LONG_TASKS__ = [];
            window.__FC_CLICK_TIME__ = performance.now();
            window.__FC_USABLE_TIME__ = null;

            const onRevealStart = () => {
              window.__FC_USABLE_TIME__ = performance.now();
              window.removeEventListener('fc:page-reveal-start', onRevealStart);
            };
            window.addEventListener('fc:page-reveal-start', onRevealStart);
          });

          const targetLabel = trans.to === 'resumo' ? 'Resumo'
            : trans.to === 'pessoas' ? 'Pessoas'
            : trans.to === 'cards' ? 'Cartões'
            : trans.to === 'transactions' ? 'Movimentações'
            : 'Assinaturas';

          const navBtn = page.getByRole('button', { name: targetLabel }).first();
          await navBtn.click();

          await page.waitForFunction(() => {
            return !document.documentElement.classList.contains('fc-transitioning');
          }, { timeout: 25000 });

          const repMetrics = await page.evaluate(() => {
            const end = performance.now();
            const start = window.__FC_CLICK_TIME__ || end;
            const usable = window.__FC_USABLE_TIME__ || end;

            const tasks = window.__FC_LONG_TASKS__ || [];
            const maxDuration = tasks.reduce((max, t) => Math.max(max, t.duration), 0);
            const tbt = tasks.reduce((sum, t) => sum + Math.max(0, t.duration - 50), 0);

            return {
              maxLongTask: Math.round(maxDuration),
              tbt: Math.round(tbt),
              timeToUsable: Math.round(usable - start),
              veilDuration: Math.round(end - start),
            };
          });

          maxTasksList.push(repMetrics.maxLongTask);
          tbtsList.push(repMetrics.tbt);
          timeToUsableList.push(repMetrics.timeToUsable);
          veilDurationsList.push(repMetrics.veilDuration);

          await context.close();
        }

        const maxTaskStats = calculateStats(maxTasksList);
        const tbtStats = calculateStats(tbtsList);
        const usableStats = calculateStats(timeToUsableList);
        const veilStats = calculateStats(veilDurationsList);

        const summary = {
          cpuRate: `${rate}x`,
          transition: trans.name,
          repetitions: REPETITIONS,
          maxLongTask: { median: maxTaskStats.median, p90: maxTaskStats.p90, raw: maxTasksList },
          tbt: { median: tbtStats.median, p90: tbtStats.p90, raw: tbtsList },
          timeToUsable: { median: usableStats.median, p90: usableStats.p90, raw: timeToUsableList },
          veilDuration: { median: veilStats.median, p90: veilStats.p90, raw: veilDurationsList },
        };

        console.log(`[${rate}x] ${trans.name} (N=${REPETITIONS}): MaxLongTask Med=${maxTaskStats.median}ms (P90=${maxTaskStats.p90}ms) | TBT Med=${tbtStats.median}ms (P90=${tbtStats.p90}ms) | Usable Med=${usableStats.median}ms | Veil Med=${veilStats.median}ms`);
        fullReport.push(summary);
      }
    }

    // Salvar relatório consolidado em scratch/
    const outDir = path.resolve(process.cwd(), 'scratch');
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }
    fs.writeFileSync(path.resolve(outDir, 'perf-ab-benchmark-results.json'), JSON.stringify(fullReport, null, 2));

    console.log('\n==================================================');
    console.log('TABELA SINTÉTICA FINAL (MEDIANA / P90):');
    console.log('==================================================');
    console.table(fullReport.map(r => ({
      Cenário: `[${r.cpuRate}] ${r.transition}`,
      'Max Task Med (ms)': r.maxLongTask.median,
      'Max Task P90 (ms)': r.maxLongTask.p90,
      'TBT Med (ms)': r.tbt.median,
      'TBT P90 (ms)': r.tbt.p90,
      'Usable Med (ms)': r.timeToUsable.median,
      'Veil Med (ms)': r.veilDuration.median,
    })));
  });
});
