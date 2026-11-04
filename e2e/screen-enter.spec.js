// e2e/screen-enter.spec.js
import { test, expect } from '@playwright/test';

test.describe('Dashboard Screen Entrance & Visual Safety (Commit C)', () => {

  const setupMockSession = async (page) => {
    await page.addInitScript(() => {
      localStorage.setItem('theme', 'dark');
      window.__FINCONTROL_E2E_USER__ = {
        uid: 'e2e-enter-tester',
        email: 'enter@fincontrol.local',
        name: 'Enter Tester',
        plan: 'pro',
        trialExpiresAt: null,
        budgets: {},
        notificationSettings: { cardDueEnabled: true, cardDueDays: 3 },
        aiPreferences: { optIn: false },
      };
      window.__FINCONTROL_E2E_MOCK_DATA__ = {
        cards: [
          { id: 'card-1', name: 'Nubank Platinum', limit: 8000, color: '#820AD1', closingDay: 10, dueDay: 17 },
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
            description: 'Supermercado Mensal',
            cardId: 'card-1',
            value: 450,
            date: '2026-11-01',
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
            isActive: true,
          },
        ],
        incomes: [
          {
            id: 'inc-1',
            description: 'Consultoria Financeira',
            value: 3500,
            date: '2026-09-01',
            clientId: 'client-1',
          },
        ],
        paidSubscriptions: [],
      };
    });
  };

  test('Em todas as abas, após a animação de entrada, nenhum elemento possui opacity: 0 ou transform residual inline', async ({ page }) => {
    await setupMockSession(page);
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const tabsToVerify = [
      { name: 'Resumo', selector: 'text=Resumo financeiro' },
      { name: 'Pessoas', selector: 'text=Gerenciamento de Pessoas' },
      { name: 'Cartões', selector: 'text=Gerenciamento de Cartões' },
      { name: 'Assinaturas', selector: 'text=Gerenciamento de Assinaturas' },
      { name: 'Movimentações', selector: 'text=Adicionar Movimentações' },
    ];

    for (const tab of tabsToVerify) {
      // Clica na aba se não for a inicial
      if (tab.name !== 'Resumo') {
        const tabButton = page.getByRole('button', { name: tab.name }).first();
        await tabButton.click();
      }

      // Aguarda o elemento de título da aba aparecer
      await page.waitForSelector(tab.selector, { timeout: 10000 });

      // Aguarda a janela da animação escalonada e contadores terminarem
      await page.waitForTimeout(1200);

      // 1. Invariante: Nenhum elemento na página pode ter opacity inline 0
      const zeroElements = await page.evaluate(() => {
        const els = document.querySelectorAll('main [style*="opacity: 0"], main [style*="opacity:0"]');
        return els.length;
      });
      expect(zeroElements, `Aba ${tab.name} não deve ter elementos presos com opacity: 0`).toBe(0);

      // 2. Invariante: Elementos com data-enter devem ter estilos inline de transform limpos (clearProps)
      const hasResidualTransform = await page.evaluate(() => {
        const els = document.querySelectorAll('[data-enter="title"], [data-enter="item"]');
        return Array.from(els).some(
          (el) => el.style.transform && el.style.transform !== 'none' && el.style.transform !== ''
        );
      });
      expect(hasResidualTransform, `Aba ${tab.name} deve ter clearProps executado em transform`).toBe(false);

      // 3. Invariante: Elementos marcados com data-enter estão visíveis
      const titleEl = page.locator('[data-enter="title"]').first();
      await expect(titleEl).toBeVisible();
    }
  });

  test('Sob prefers-reduced-motion: reduce, o conteúdo fica imediatamente visível sem animação', async ({ page }) => {
    await setupMockSession(page);
    await page.emulateMedia({ reducedMotion: 'reduce' });

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Verifica que o conteúdo está visível imediatamente
    const title = page.locator('[data-enter="title"]').first();
    await expect(title).toBeVisible();

    // Invariante de ausência de opacity 0
    const zeroOpacityCount = await page.evaluate(() => {
      const els = document.querySelectorAll('main [style*="opacity: 0"], main [style*="opacity:0"]');
      return els.length;
    });
    expect(zeroOpacityCount).toBe(0);
  });
});
