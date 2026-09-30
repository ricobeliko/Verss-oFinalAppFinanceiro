// e2e/theme-sweep.spec.js
import { test, expect } from '@playwright/test';

test.describe('FinControl — Full App Light Mode Sweep & Dark Regression Check (Fase 8.7 Stage A.3)', () => {

  const setupMockSession = async (page, { theme = 'light' } = {}) => {
    await page.addInitScript(({ initialTheme }) => {
      localStorage.setItem('theme', initialTheme);
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
          { id: 'client-2', name: 'Carlos Santos', phone: '11977776666' },
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
      };
    }, { initialTheme: theme });
  };

  /**
   * Valida se um elemento não possui fundo escuro de ilha no Light Mode.
   */
  const assertNotDarkIsland = async (locator, elementName) => {
    const isDarkSurface = await locator.evaluate((el) => {
      let cur = el;
      let bg = 'rgba(0, 0, 0, 0)';
      while (cur && cur !== document.documentElement) {
        const style = window.getComputedStyle(cur);
        const curBg = style.backgroundColor;
        if (curBg && curBg !== 'transparent' && curBg !== 'rgba(0, 0, 0, 0)') {
          bg = curBg;
          break;
        }
        cur = cur.parentElement;
      }
      const match = bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
      if (!match) return false;
      const alpha = match[4] !== undefined ? parseFloat(match[4]) : 1;
      if (alpha === 0) return false;
      const [r, g, b] = [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])];
      return r < 60 && g < 60 && b < 60;
    });
    expect(isDarkSurface, `Elemento "${elementName}" não deve ser uma ilha escura em Light Mode`).toBe(false);
  };

  test('Light Mode Sweep: Dashboard (/dashboard) sem superfícies escuras', async ({ page }) => {
    await setupMockSession(page, { theme: 'light' });
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Verifica que html NÃO tem classe .dark
    const isDarkRoot = await page.locator('html').evaluate(el => el.classList.contains('dark'));
    expect(isDarkRoot).toBe(false);

    // Valida container de resumo/filtros
    const filterHeader = page.locator('h2:has-text("Resumo financeiro")').locator('..').locator('..');
    await assertNotDarkIsland(filterHeader, 'Header de Filtros do Dashboard');

    // Valida tabela de faturas
    const tableContainer = page.locator('table').locator('..').locator('..');
    await assertNotDarkIsland(tableContainer, 'Container da Tabela do Dashboard');
  });

  test('Light Mode Sweep: Pessoas (Tab Pessoas) harmonizado em Light Mode', async ({ page }) => {
    await setupMockSession(page, { theme: 'light' });
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: 'Pessoas' }).first().click();

    // Header de Pessoas
    const header = page.locator('h1:has-text("Gerenciamento de Pessoas")').locator('..').locator('..');
    await assertNotDarkIsland(header, 'Header de Pessoas');

    // Card de formulário de adição
    const formCard = page.locator('form').first();
    await assertNotDarkIsland(formCard, 'Formulário de Adicionar Pessoa');

    // Input de nome de pessoa tem fundo claro
    const nameInput = page.locator('#clientName');
    await assertNotDarkIsland(nameInput, 'Input clientName');

    // Tabela de pessoas
    const table = page.locator('table').locator('..').locator('..');
    await assertNotDarkIsland(table, 'Tabela de Pessoas');
  });

  test('Light Mode Sweep: Cartões (Tab Cartões) harmonizado em Light Mode', async ({ page }) => {
    await setupMockSession(page, { theme: 'light' });
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: 'Cartões' }).first().click();

    // Header de Cartões
    const header = page.locator('h1:has-text("Gerenciamento de Cartões")').locator('..').locator('..');
    await assertNotDarkIsland(header, 'Header de Cartões');

    // Tabela de Cartões
    const table = page.locator('table').locator('..').locator('..');
    await assertNotDarkIsland(table, 'Tabela de Cartões');
  });

  test('Light Mode Sweep: Assinaturas (Tab Assinaturas) harmonizado em Light Mode', async ({ page }) => {
    await setupMockSession(page, { theme: 'light' });
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: 'Assinaturas' }).first().click();

    // Header de Assinaturas
    const header = page.locator('h1:has-text("Gerenciamento de Assinaturas")').locator('..').locator('..');
    await assertNotDarkIsland(header, 'Header de Assinaturas');

    // Card de Assinatura
    const subCard = page.locator('h3:has-text("Netflix 4K")').locator('..').locator('..');
    await assertNotDarkIsland(subCard, 'Card de Assinatura');
  });

  test('Light Mode Sweep: Movimentações (Tab Movimentações) harmonizado em Light Mode', async ({ page }) => {
    await setupMockSession(page, { theme: 'light' });
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: 'Movimentações' }).first().click();

    // Header de Movimentações
    const header = page.locator('h1:has-text("Adicionar Movimentações")').locator('..').locator('..');
    await assertNotDarkIsland(header, 'Header de Movimentações');

    // Abas de Compras, Receitas, Despesas
    const tabsContainer = page.locator('[role="group"][aria-label="Tipos de movimentação"]');
    await assertNotDarkIsland(tabsContainer, 'Seletor de Abas de Movimentação');
  });

  test('Light Mode Sweep: Modo Crise (Tab Modo Crise) harmonizado em Light Mode', async ({ page }) => {
    await setupMockSession(page, { theme: 'light' });
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: 'Modo Crise' }).first().click();

    // Header do Modo Crise
    const header = page.locator('h2:has-text("Modo Crise & Raio-X Financeiro")').locator('..').locator('..');
    await assertNotDarkIsland(header, 'Header do Modo Crise');
  });

  test('Dark Mode Regression: Alternância mantém integridade em Dark Mode', async ({ page }) => {
    await setupMockSession(page, { theme: 'dark' });
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Verifica que html possui classe .dark
    const isDarkRoot = await page.locator('html').evaluate(el => el.classList.contains('dark'));
    expect(isDarkRoot).toBe(true);

    // Header do dashboard permanece legível
    await expect(page.locator('h2:has-text("Resumo financeiro")')).toBeVisible();
  });
});
