// e2e/plan-entitlements.spec.js
import { test, expect } from '@playwright/test';

test.describe('FinControl — Canonical Plan Entitlements & Pro Gating (Fase 8.7 Stage A.3)', () => {

  const setupMockSession = async (page, { isPro = false, peopleCount = 3, cardCount = 2 } = {}) => {
    const clients = Array.from({ length: peopleCount }, (_, i) => ({
      id: `client-${i + 1}`,
      name: `Pessoa Teste ${i + 1}`,
      phone: `1199999000${i + 1}`,
    }));

    const cards = Array.from({ length: cardCount }, (_, i) => ({
      id: `card-${i + 1}`,
      name: `Cartão Teste ${i + 1}`,
      limit: 3000 + i * 1000,
      color: i === 0 ? '#F2B705' : '#4F46E5',
      closingDay: 15,
      dueDay: 22,
    }));

    await page.addInitScript(({ isPro, clients, cards }) => {
      localStorage.setItem('theme', 'dark');
      window.__FINCONTROL_E2E_USER__ = {
        uid: 'e2e-tester-uid',
        email: 'tester@fincontrol.local',
        name: 'Tester FinControl',
        plan: isPro ? 'pro' : 'free',
        trialExpiresAt: null,
        budgets: {},
        notificationSettings: { cardDueEnabled: true, cardDueDays: 3 },
        aiPreferences: { optIn: false },
      };
      window.__FINCONTROL_E2E_MOCK_DATA__ = {
        cards,
        clients,
        loans: [],
        expenses: [],
        subscriptions: [],
        incomes: [],
      };
    }, { isPro, clients, cards });
  };

  test('Free Plan: Limite de 3 Pessoas bloqueia a 4ª com fail-closed e abre UpgradePrompt', async ({ page }) => {
    await setupMockSession(page, { isPro: false, peopleCount: 3 });
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Navega para aba Pessoas
    await page.getByRole('button', { name: 'Pessoas' }).first().click();

    // Verifica que as 3 pessoas existentes estão listadas na tabela
    for (let i = 1; i <= 3; i++) {
      await expect(page.locator('td', { hasText: `Pessoa Teste ${i}` })).toBeVisible();
    }

    // Tenta adicionar a 4ª pessoa
    const nameInput = page.locator('#clientName');
    await nameInput.fill('Quarta Pessoa Bloqueada');
    await page.locator('button:has-text("Adicionar")').click();

    // Deve exibir toast de bloqueio exato do plano Free
    await expect(page.locator('text=Você atingiu o limite de 3 pessoas do plano Free.')).toBeVisible({ timeout: 5000 });

    // Deve abrir o modal de Upgrade Pro
    const upgradeModal = page.getByRole('dialog');
    await expect(upgradeModal.getByRole('heading', { name: 'Conheça o FinControl Pro' })).toBeVisible({ timeout: 5000 });

    // Fail-closed: garante que a 4ª pessoa NÃO foi inserida
    await expect(page.locator('td', { hasText: 'Quarta Pessoa Bloqueada' })).not.toBeVisible();
  });

  test('Free Plan: Limite de 2 Cartões bloqueia o 3º com fail-closed e abre UpgradePrompt', async ({ page }) => {
    await setupMockSession(page, { isPro: false, cardCount: 2 });
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Navega para aba Cartões
    await page.getByRole('button', { name: 'Cartões' }).first().click();

    // Verifica que os 2 cartões existentes estão listados na tabela
    await expect(page.locator('td', { hasText: 'Cartão Teste 1' })).toBeVisible();
    await expect(page.locator('td', { hasText: 'Cartão Teste 2' })).toBeVisible();

    // Tenta abrir o modal para adicionar o 3º cartão
    await page.getByRole('button', { name: 'Adicionar Cartão' }).first().click();

    // Deve exibir toast de bloqueio exato do plano Free
    await expect(page.locator('text=Você atingiu o limite de 2 cartões do plano Free.')).toBeVisible({ timeout: 5000 });

    // Deve abrir o modal de Upgrade Pro
    const upgradeModal = page.getByRole('dialog');
    await expect(upgradeModal.getByRole('heading', { name: 'Conheça o FinControl Pro' })).toBeVisible({ timeout: 5000 });

    // Fecha o modal de upgrade e verifica que o count continua 2
    await page.keyboard.press('Escape');
    await expect(page.locator('td', { hasText: 'Cartão Teste 3' })).not.toBeVisible();
  });

  test('Data Preservation: Usuário Free visualiza integralmente 5 pessoas e 4 cartões legados', async ({ page }) => {
    await setupMockSession(page, { isPro: false, peopleCount: 5, cardCount: 4 });
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Pessoas: todas as 5 visíveis
    await page.getByRole('button', { name: 'Pessoas' }).first().click();
    for (let i = 1; i <= 5; i++) {
      await expect(page.locator('td', { hasText: `Pessoa Teste ${i}` })).toBeVisible();
    }

    // Cartões: todos os 4 visíveis
    await page.getByRole('button', { name: 'Cartões' }).first().click();
    for (let i = 1; i <= 4; i++) {
      await expect(page.locator('td', { hasText: `Cartão Teste ${i}` })).toBeVisible();
    }
  });

  test('Free Plan: Toolbar e Widgets do Dashboard bloqueiam recursos Pro com ProFeatureLock e UpgradePrompt', async ({ page }) => {
    await setupMockSession(page, { isPro: false });
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const upgradeModal = page.getByRole('dialog');

    // 1. Resumo Executivo bloqueado no Free
    await page.locator('button:has-text("Resumo Executivo")').click();
    await expect(upgradeModal.getByRole('heading', { name: 'Conheça o FinControl Pro' })).toBeVisible();
    await page.keyboard.press('Escape');

    // 2. Simulador bloqueado no Free
    await page.locator('button:has-text("Simulador")').click();
    await expect(upgradeModal.getByRole('heading', { name: 'Conheça o FinControl Pro' })).toBeVisible();
    await page.keyboard.press('Escape');

    // 3. Exportação CSV bloqueada no Free
    await page.locator('button:has-text("CSV Mês")').click();
    await expect(upgradeModal.getByRole('heading', { name: 'Conheça o FinControl Pro' })).toBeVisible();
    await page.keyboard.press('Escape');

    // 4. Relatório Anual bloqueado no Free
    await page.locator('button:has-text("Relatório Anual")').click();
    await expect(upgradeModal.getByRole('heading', { name: 'Conheça o FinControl Pro' })).toBeVisible();
    await page.keyboard.press('Escape');

    // 5. ProFeatureLock visível nos widgets do Dashboard
    await expect(page.locator('h4:has-text("Auditoria Relâmpago & Metas de Quitação")')).toBeVisible();
    await expect(page.locator('h4:has-text("Insights Financeiros Determinísticos")')).toBeVisible();
    await expect(page.locator('h4:has-text("Projeção de Faturas Futuras")')).toBeVisible();
    await expect(page.locator('h4:has-text("Metas de Orçamento por Categoria")')).toBeVisible();
  });

  test('Free Plan: Abas de Receitas e Despesas em Movimentações exibem ProFeatureLock', async ({ page }) => {
    await setupMockSession(page, { isPro: false });
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Navega para aba Movimentações
    await page.getByRole('button', { name: 'Movimentações' }).first().click();

    // Aba Receitas
    await page.locator('button:has-text("Receitas")').click();
    await expect(page.locator('h4:has-text("Gerenciamento de Receitas")')).toBeVisible();
    await expect(page.locator('text=O gerenciamento e registro de receitas faz parte dos recursos do plano Pro.')).toBeVisible();

    // Aba Despesas
    await page.locator('button:has-text("Despesas")').click();
    await expect(page.locator('h4:has-text("Despesas Avulsas")')).toBeVisible();
    await expect(page.locator('text=O gerenciamento e registro de despesas avulsas faz parte dos recursos do plano Pro.')).toBeVisible();
  });
});
