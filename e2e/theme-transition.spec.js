// e2e/theme-transition.spec.js
import { test, expect } from '@playwright/test';

test.describe('FinControl — Theme Transition (Circular Reveal & Fallback) (Fase 5)', () => {
  const setupMockSession = async (page, { initialTheme = 'dark' } = {}) => {
    await page.addInitScript(({ theme }) => {
      localStorage.setItem('theme', theme);
      window.__FINCONTROL_E2E_USER__ = {
        uid: 'e2e-theme-tester',
        email: 'theme@fincontrol.local',
        name: 'Theme Tester',
        plan: 'pro',
        trialExpiresAt: null,
        budgets: {},
        notificationSettings: { cardDueEnabled: true, cardDueDays: 3 },
        aiPreferences: { optIn: false },
      };
      window.__FINCONTROL_E2E_MOCK_DATA__ = {
        cards: [
          { id: 'card-1', name: 'Nubank Platinum', limit: 8000, color: '#820AD1', closingDay: 10, dueDay: 17 },
          { id: 'card-2', name: 'Itaú Personalité', limit: 15000, color: '#C5A059', closingDay: 5, dueDay: 12 },
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
    }, { theme: initialTheme });
  };

  test('Desktop: alternância Dark -> Light -> Dark no Dashboard limpa fc-theme-switching e preserva KPIs', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await setupMockSession(page, { initialTheme: 'dark' });
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Estado inicial: dark
    const html = page.locator('html');
    await expect(html).toHaveAttribute('data-theme', 'dark');
    await expect(html).toHaveClass(/dark/);

    // Botão de alternar tema na topbar
    const themeBtn = page.getByRole('button', { name: 'Alternar tema' }).first();
    await expect(themeBtn).toBeVisible();

    // 1. Troca Dark -> Light
    await themeBtn.click();
    await expect(html).toHaveAttribute('data-theme', 'light');
    await expect(html).not.toHaveClass(/dark/);

    // fc-theme-switching deve ser removido em no máximo 1.5s
    await expect(async () => {
      const isSwitching = await html.evaluate(el => el.classList.contains('fc-theme-switching'));
      expect(isSwitching).toBe(false);
    }).toPass({ timeout: 1500 });

    // Nenhum elemento crítico com opacity: 0 residual
    const mainContent = page.locator('main');
    await expect(mainContent).toBeVisible();
    const mainOpacity = await mainContent.evaluate(el => window.getComputedStyle(el).opacity);
    expect(Number(mainOpacity)).toBeGreaterThan(0.9);

    // KPIs continuam visíveis e com formatação canônica (R$)
    const kpiElements = page.locator('[data-animated-currency]');
    const count = await kpiElements.count();
    if (count > 0) {
      for (let i = 0; i < count; i++) {
        const text = await kpiElements.nth(i).innerText();
        expect(text).toContain('R$');
        expect(text).not.toContain('NaN');
        expect(text).not.toContain('undefined');
      }
    }

    // 2. Troca Light -> Dark
    await themeBtn.click();
    await expect(html).toHaveAttribute('data-theme', 'dark');
    await expect(html).toHaveClass(/dark/);

    await expect(async () => {
      const isSwitching = await html.evaluate(el => el.classList.contains('fc-theme-switching'));
      expect(isSwitching).toBe(false);
    }).toPass({ timeout: 1500 });
  });

  test('Reduced Motion: troca de tema é imediata sem transição em prefers-reduced-motion', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await setupMockSession(page, { initialTheme: 'dark' });
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const html = page.locator('html');
    await expect(html).toHaveAttribute('data-theme', 'dark');

    const themeBtn = page.getByRole('button', { name: 'Alternar tema' }).first();
    await themeBtn.click();

    // Troca imediata
    await expect(html).toHaveAttribute('data-theme', 'light');
    const isSwitching = await html.evaluate(el => el.classList.contains('fc-theme-switching'));
    expect(isSwitching).toBe(false);
  });

  test('Design System Lab: alternância de tema no lab (/design-system-lab)', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/design-system-lab');
    await page.waitForLoadState('networkidle');

    const labRoot = page.locator('div[data-theme]');
    await expect(labRoot).toBeVisible();
    await expect(labRoot).toHaveAttribute('data-theme', 'dark');

    const lightThemeBtn = page.getByRole('button', { name: /Claro \((Crisp Teal|Warm White)\)/i });
    await lightThemeBtn.click();
    await expect(labRoot).toHaveAttribute('data-theme', 'light');

    const darkThemeBtn = page.getByRole('button', { name: /Escuro \((Abyss Teal|Obsidian)\)/i });
    await darkThemeBtn.click();
    await expect(labRoot).toHaveAttribute('data-theme', 'dark');
  });
});
