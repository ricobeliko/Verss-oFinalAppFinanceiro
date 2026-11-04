// e2e/capture-screenshots.spec.js
import { test, expect } from '@playwright/test';

test.describe('Fase 1 — Captura de Screenshots Visuais (Abyss Teal & Default Dark)', () => {

  const setupMockSession = async (page, { theme = 'dark' } = {}) => {
    await page.addInitScript(({ initialTheme }) => {
      localStorage.setItem('theme', initialTheme);
      window.__FINCONTROL_E2E_USER__ = {
        uid: 'e2e-theme-tester',
        email: 'theme@fincontrol.local',
        name: 'Ana Silva',
        plan: 'pro',
        trialExpiresAt: null,
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
          { id: 'client-1', name: 'Ana Silva', phone: '11988887777' },
          { id: 'client-2', name: 'Carlos Eduardo', phone: '11977776666' },
        ],
        loans: [
          {
            id: 'loan-1',
            description: 'Notebook Dell XPS',
            cardId: 'card-1',
            clientId: 'client-1',
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
            date: new Date(),
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
            category: 'Lazer',
          },
        ],
        incomes: [
          {
            id: 'inc-1',
            description: 'Salário',
            value: 8500,
            date: new Date(),
            clientId: 'client-1',
          },
        ],
      };
    }, { initialTheme: theme });
  };

  test('01. Clean localStorage load: abre em Dark Mode sem piscar', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    const htmlTheme = await page.locator('html').getAttribute('data-theme');
    expect(htmlTheme).toBe('dark');
    await page.screenshot({ path: 'screenshots/initial-load-clean-localstorage-dark.png', fullPage: true });
  });

  test('02. /login: Dark Mode e Light Mode', async ({ page }) => {
    // Dark
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'screenshots/login-dark.png', fullPage: true });

    // Light
    await page.evaluate(() => {
      localStorage.setItem('theme', 'light');
      document.documentElement.setAttribute('data-theme', 'light');
      document.documentElement.classList.remove('dark');
    });
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'screenshots/login-light.png', fullPage: true });
  });

  test('03. Dashboard Resumo: Dark Mode e Light Mode', async ({ page }) => {
    // Dark
    await setupMockSession(page, { theme: 'dark' });
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'screenshots/dashboard-resumo-dark.png', fullPage: true });

    // Light
    await page.getByRole('button', { name: /Alternar tema/i }).click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: 'screenshots/dashboard-resumo-light.png', fullPage: true });
  });

  test('04. Dashboard Cartões: Dark Mode e Light Mode', async ({ page }) => {
    // Dark
    await setupMockSession(page, { theme: 'dark' });
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: 'Cartões' }).first().click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: 'screenshots/dashboard-cartoes-dark.png', fullPage: true });

    // Light
    await page.getByRole('button', { name: /Alternar tema/i }).click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: 'screenshots/dashboard-cartoes-light.png', fullPage: true });
  });

  test('05. Dashboard Movimentações/Transações: Dark Mode e Light Mode', async ({ page }) => {
    // Dark
    await setupMockSession(page, { theme: 'dark' });
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: 'Movimentações' }).first().click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: 'screenshots/dashboard-transacoes-dark.png', fullPage: true });

    // Light
    await page.getByRole('button', { name: /Alternar tema/i }).click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: 'screenshots/dashboard-transacoes-light.png', fullPage: true });
  });

  test('06. Modal Aberto no Dark Mode: Adicionar Cartão', async ({ page }) => {
    await setupMockSession(page, { theme: 'dark' });
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: 'Cartões' }).first().click();
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: /Adicionar Cartão/i }).first().click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: 'screenshots/modal-adicionar-cartao-dark.png', fullPage: true });
  });
});
