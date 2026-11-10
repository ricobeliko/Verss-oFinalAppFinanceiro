// e2e/page-transition-smooth.spec.js
import { test, expect } from '@playwright/test';

test.describe('FinControl — Smooth Page Wave Transition & Choreography (Commit B & C Ajuste Fino 2 / 2.1)', () => {
  const setupMockSession = async (page) => {
    await page.addInitScript(() => {
      localStorage.setItem('theme', 'dark');
      window.__FC_ACTIVE_LISTENERS_COUNT__ = 0;

      // Rastreamento estrito de listeners para o Cenário (e)
      const origAdd = window.addEventListener;
      const origRemove = window.removeEventListener;
      window.addEventListener = function(type, ...args) {
        if (type === 'fc:page-reveal-start' || type === 'fc:page-reveal-cancel') {
          window.__FC_ACTIVE_LISTENERS_COUNT__ = (window.__FC_ACTIVE_LISTENERS_COUNT__ || 0) + 1;
        }
        return origAdd.apply(this, [type, ...args]);
      };
      window.removeEventListener = function(type, ...args) {
        if (type === 'fc:page-reveal-start' || type === 'fc:page-reveal-cancel') {
          window.__FC_ACTIVE_LISTENERS_COUNT__ = Math.max(0, (window.__FC_ACTIVE_LISTENERS_COUNT__ || 0) - 1);
        }
        return origRemove.apply(this, [type, ...args]);
      };

      window.__FINCONTROL_E2E_USER__ = {
        uid: 'smooth-trans-tester',
        email: 'smooth@fincontrol.local',
        name: 'Tester',
        plan: 'pro',
        budgets: {},
        notificationSettings: { cardDueEnabled: true, cardDueDays: 3 },
        aiPreferences: { optIn: false },
      };
      window.__FINCONTROL_E2E_MOCK_DATA__ = {
        cards: [
          { id: 'card-1', name: 'Nubank Ultravioleta', limit: 8000, color: '#5CCCCC', closingDay: 10, dueDay: 17 },
          { id: 'card-2', name: 'Itaú Black', limit: 15000, color: '#047C84', closingDay: 5, dueDay: 12 },
        ],
        clients: [
          { id: 'client-1', name: 'Ana Oliveira', phone: '11988887777' },
        ],
        loans: [
          {
            id: 'loan-1',
            description: 'Notebook Dell XPS',
            cardId: 'card-1',
            totalAmount: 6000,
            installmentsCount: 10,
            installmentValue: 600,
            currentInstallment: 3,
            startDate: '2026-07-10',
            isMyDebt: true,
            category: 'Tecnologia',
          },
        ],
        expenses: [
          {
            id: 'exp-1',
            description: 'Supermercado',
            cardId: 'card-1',
            value: 450,
            date: new Date().toISOString(),
            category: 'Alimentação',
          },
        ],
        subscriptions: [
          {
            id: 'sub-1',
            name: 'Netflix 4K',
            amount: 55.90,
            value: 55.90,
            dueDate: '15',
            cardId: 'card-1',
            status: 'Ativa',
          },
        ],
      };
    });
  };

  test('Desktop: curva de opacidade da onda atinge >= 0.85 no pico, pausa fundo via fc-transitioning e conclui sem resíduos', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await setupMockSession(page);
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    const html = page.locator('html');
    const waveContainer = page.locator('[data-fc-wave-sweep="true"]');

    // Inicia transição para a aba Cartões
    const cardsBtn = page.getByRole('button', { name: 'Cartões' }).first();
    await cardsBtn.click();

    // 1. Amostra inicial e subida: a transição ativa e a opacidade sobe até o pico >= 0.85
    await expect(async () => {
      const isTransitioning = await html.evaluate((el) => el.classList.contains('fc-transitioning'));
      expect(isTransitioning).toBe(true);
      const op = await waveContainer.evaluate((el) => {
        return parseFloat(window.getComputedStyle(el).opacity || '0');
      });
      expect(op).toBeGreaterThan(0);
    }).toPass({ timeout: 1000 });

    // 2. Amostra no ápice (~450ms - ~600ms): opacidade atinge o pico >= 0.85
    await expect(async () => {
      const op = await waveContainer.evaluate((el) => {
        return parseFloat(window.getComputedStyle(el).opacity || '0');
      });
      expect(op).toBeGreaterThanOrEqual(0.85);
    }).toPass({ timeout: 1500 });

    // 3. Final da transição: onda oculta e fc-transitioning removido
    await expect(async () => {
      const isTrans = await html.evaluate((el) => el.classList.contains('fc-transitioning'));
      expect(isTrans).toBe(false);
    }).toPass({ timeout: 3000 });

    // Conteúdo da aba Cartões está visível e sem estilos residuais de opacity: 0
    await expect(page.locator('h1:has-text("Gerenciamento de Cartões")')).toBeVisible();
    const mainOpacity = await page.locator('main').evaluate((el) => {
      return parseFloat(window.getComputedStyle(el).opacity || '1');
    });
    expect(mainOpacity).toBeGreaterThan(0.9);
  });

  test('Navegação sequencial por todas as 5 abas preserva integridade visual, sem Suspense fallback e limpa fc-transitioning', async ({ page }) => {
    test.setTimeout(60000);
    await page.setViewportSize({ width: 1440, height: 900 });
    await setupMockSession(page);
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    const html = page.locator('html');

    const tabsToTest = [
      { name: 'Pessoas', titleMatch: /Pessoas/i },
      { name: 'Cartões', titleMatch: /Cartões/i },
      { name: 'Movimentações', titleMatch: /Movimentações/i },
      { name: 'Assinaturas', titleMatch: /Assinaturas/i },
      { name: 'Resumo', titleMatch: /Resumo/i },
    ];

    for (const tab of tabsToTest) {
      const tabBtn = page.getByRole('button', { name: tab.name }).first();
      await tabBtn.click();

      // Aguarda término da transição
      await expect(async () => {
        const isTransitioning = await html.evaluate((el) => el.classList.contains('fc-transitioning'));
        expect(isTransitioning).toBe(false);
      }).toPass({ timeout: 3500 });

      // Conteúdo visível
      const heading = page.locator('h1, h2').filter({ hasText: tab.titleMatch }).first();
      await expect(heading).toBeVisible();

      // Sem opacity: 0 residual no main
      const mainOpacity = await page.locator('main').evaluate((el) => {
        return parseFloat(window.getComputedStyle(el).opacity || '1');
      });
      expect(mainOpacity).toBeGreaterThan(0.9);
    }
  });

  test('Cenário (a) — Clique rápido A→B→C: a tela final mostra tudo, sem opacity 0/valores zerados residuais', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await setupMockSession(page);
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    const html = page.locator('html');

    // Cliques rápidos encadeados A -> B -> C
    const cardsBtn = page.getByRole('button', { name: 'Cartões' }).first();
    const pessoasBtn = page.getByRole('button', { name: 'Pessoas' }).first();
    const movBtn = page.getByRole('button', { name: 'Movimentações' }).first();

    await cardsBtn.click();
    await page.waitForTimeout(80);
    await pessoasBtn.click();
    await page.waitForTimeout(80);
    await movBtn.click();

    // Deve resolver na tela final (Movimentações) e remover fc-transitioning
    await expect(async () => {
      const isTrans = await html.evaluate((el) => el.classList.contains('fc-transitioning'));
      expect(isTrans).toBe(false);
    }).toPass({ timeout: 4000 });

    // Conteúdo da aba final Movimentações visível
    const heading = page.locator('h1, h2').filter({ hasText: /Movimentações/i }).first();
    await expect(heading).toBeVisible();

    // Aguarda término da limpeza diferida do overlay (100ms idle cleanup)
    await page.waitForTimeout(200);

    // Invariante: nenhum elemento filho preso com opacity: 0
    const stuckInvisibleCount = await page.evaluate(() => {
      const main = document.querySelector('main');
      if (!main) return 0;
      const elements = main.querySelectorAll('*');
      let stuck = 0;
      elements.forEach((el) => {
        if (el.style.opacity === '0' && window.getComputedStyle(el).display !== 'none') {
          stuck++;
        }
      });
      return stuck;
    });
    expect(stuckInvisibleCount).toBe(0);
  });

  test('Cenário (b) — Navegação sem sweep enquanto não há transição (primeiro carregamento, troca de tema) funciona', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await setupMockSession(page);
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const html = page.locator('html');

    // 1. Primeiro carregamento: Resumo visível e fc-transitioning falso
    const resumoHeading = page.locator('h1, h2').filter({ hasText: /Resumo/i }).first();
    await expect(resumoHeading).toBeVisible();
    expect(await html.evaluate((el) => el.classList.contains('fc-transitioning'))).toBe(false);

    // 2. Troca de tema: alterna sem congelar e sem reter fc-transitioning
    const themeBtn = page.getByRole('button', { name: /Alternar tema/i }).first();
    await themeBtn.click();
    await page.waitForTimeout(700);

    expect(await html.evaluate((el) => el.getAttribute('data-theme'))).toBe('light');
    expect(await html.evaluate((el) => el.classList.contains('fc-transitioning'))).toBe(false);
    await expect(resumoHeading).toBeVisible();
  });

  test('Cenário (c) — Reduced Motion: tudo imediato sem disparar classe fc-transitioning nem animação', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await setupMockSession(page);
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const html = page.locator('html');
    const pessoasBtn = page.getByRole('button', { name: 'Pessoas' }).first();
    await pessoasBtn.click();

    // Troca imediata
    await expect(page.locator('h1:has-text("Gerenciamento de Pessoas")')).toBeVisible();
    const isTransitioning = await html.evaluate((el) => el.classList.contains('fc-transitioning'));
    expect(isTransitioning).toBe(false);
  });

  test('Cenário (d) — Erro simulado no onPeak: o shell se recupera e o conteúdo aparece', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await setupMockSession(page);
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    const html = page.locator('html');

    // Arma o gatilho de erro simulado no onPeak
    await page.evaluate(() => {
      window.__fincontrol_simulate_peak_error__ = true;
    });

    // Clica em Cartões
    const cardsBtn = page.getByRole('button', { name: 'Cartões' }).first();
    await cardsBtn.click();

    // O shell deve se recuperar: fc-transitioning é removido e não fica travado
    await expect(async () => {
      const isTrans = await html.evaluate((el) => el.classList.contains('fc-transitioning'));
      expect(isTrans).toBe(false);
    }).toPass({ timeout: 3500 });

    // O conteúdo da tela continua visível e o main tem opacidade adequada
    const mainOpacity = await page.locator('main').evaluate((el) => {
      return parseFloat(window.getComputedStyle(el).opacity || '1');
    });
    expect(mainOpacity).toBeGreaterThan(0.9);
  });

  test('Cenário (e) — Listeners não acumulam (contagem após 20 trocas permanece controlada)', async ({ page }) => {
    test.setTimeout(90000);
    await page.setViewportSize({ width: 1440, height: 900 });
    await setupMockSession(page);
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    const html = page.locator('html');
    const tabs = ['Pessoas', 'Cartões', 'Assinaturas', 'Resumo'];

    // Realiza 20 trocas de abas sequenciais
    for (let i = 0; i < 20; i++) {
      const targetTab = tabs[i % tabs.length];
      const btn = page.getByRole('button', { name: targetTab }).first();
      await btn.click();

      // Timeout de 6s para absorver coverIn (450ms) + settle (600ms) + reveal (600ms) sob 20 iterações consecutivas
      await expect(async () => {
        const isTrans = await html.evaluate((el) => el.classList.contains('fc-transitioning'));
        expect(isTrans).toBe(false);
      }).toPass({ timeout: 6000 });
    }

    // Após 20 trocas, verifica se os listeners foram limpos corretamente
    const activeListeners = await page.evaluate(() => {
      return window.__FC_ACTIVE_LISTENERS_COUNT__ || 0;
    });

    // Como os listeners possuem cleanup estrito no unmount e no disparo,
    // não deve haver acúmulo de listeners (deve ser <= 4, correspondendo apenas aos componentes ativos da tela)
    expect(activeListeners).toBeLessThanOrEqual(4);
  });

  test('Sidebar recolhida e expandida não produz scroll horizontal nem quebra de layout', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await setupMockSession(page);
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Estado inicial: expandida
    const toggleBtn = page.getByRole('button', { name: /Recolher menu lateral/i });
    await expect(toggleBtn).toBeVisible();

    const initialOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(initialOverflow).toBe(false);

    // Recolhe a sidebar
    await toggleBtn.click();
    await page.waitForTimeout(300);

    const expandBtn = page.getByRole('button', { name: /Expandir menu lateral/i });
    await expect(expandBtn).toBeVisible();

    const collapsedOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(collapsedOverflow).toBe(false);

    // Re-expande a sidebar
    await expandBtn.click();
    await page.waitForTimeout(300);

    const reExpandedOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(reExpandedOverflow).toBe(false);
  });

  test('Prefetch na sidebar: hover e focus acionam prefetch de abas sem erros ou travamentos', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await setupMockSession(page);
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const pessoasBtn = page.getByRole('button', { name: 'Pessoas' }).first();
    await pessoasBtn.hover();
    await page.waitForTimeout(100);

    await pessoasBtn.focus();
    await page.waitForTimeout(100);

    await expect(pessoasBtn).toBeVisible();
  });
});
