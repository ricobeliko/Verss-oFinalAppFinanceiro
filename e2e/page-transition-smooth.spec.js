// e2e/page-transition-smooth.spec.js
import { test, expect } from '@playwright/test';

test.describe('FinControl — Smooth Page Wave Transition & Choreography (Commit C & Ajuste Fino)', () => {
  const setupMockSession = async (page) => {
    await page.addInitScript(() => {
      localStorage.setItem('theme', 'dark');
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

    // 1. Amostra inicial (~150ms): onda iniciando subida (opacidade > 0)
    await page.waitForTimeout(150);
    const op150 = await waveContainer.evaluate((el) => {
      return parseFloat(window.getComputedStyle(el).opacity || '0');
    });
    expect(op150).toBeGreaterThan(0);

    // 2. Amostra no ápice (~450ms - ~600ms): opacidade atinge o pico >= 0.85 e fc-transitioning ativo
    await expect(async () => {
      const op = await waveContainer.evaluate((el) => {
        return parseFloat(window.getComputedStyle(el).opacity || '0');
      });
      const isTransitioning = await html.evaluate((el) => el.classList.contains('fc-transitioning'));
      expect(isTransitioning).toBe(true);
      expect(op).toBeGreaterThanOrEqual(0.85);
    }).toPass({ timeout: 1500 });

    // 3. Final da transição (~1.5s - 2s): onda oculta e fc-transitioning removido
    await expect(async () => {
      const isTrans = await html.evaluate((el) => el.classList.contains('fc-transitioning'));
      expect(isTrans).toBe(false);
    }).toPass({ timeout: 2500 });

    // Conteúdo da aba Cartões está visível e sem estilos residuais de opacity: 0
    await expect(page.locator('h1:has-text("Gerenciamento de Cartões")')).toBeVisible();
    const mainOpacity = await page.locator('main').evaluate((el) => {
      return parseFloat(window.getComputedStyle(el).opacity || '1');
    });
    expect(mainOpacity).toBeGreaterThan(0.9);
  });

  test('Navegação sequencial por todas as 6 abas preserva integridade visual e limpa fc-transitioning', async ({ page }) => {
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
      { name: 'Modo Crise', titleMatch: /Crise/i },
      { name: 'Resumo', titleMatch: /Resumo/i },
    ];

    for (const tab of tabsToTest) {
      const tabBtn = page.getByRole('button', { name: tab.name }).first();
      await tabBtn.click();

      // Aguarda término da transição (~1.5s - 2s)
      await expect(async () => {
        const isTransitioning = await html.evaluate((el) => el.classList.contains('fc-transitioning'));
        expect(isTransitioning).toBe(false);
      }).toPass({ timeout: 3000 });

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

  test('Reduced Motion: troca de aba é instantânea sem disparar classe fc-transitioning nem animação', async ({ page }) => {
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
});
