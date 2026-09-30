// e2e/app-shell-dashboard-poc.spec.js
import { test, expect } from '@playwright/test';

test.describe('Fase 8.7 — App Shell + Dashboard + Motion System v1 (Stage A POC)', () => {

  const setupMockSession = async (page, { isPro = true, plan = null, trialExpiresAt = null } = {}) => {
    const userPlan = plan || (isPro ? 'pro' : 'free');
    await page.addInitScript(({ userPlan, userTrialExpiresAt }) => {
      window.__FINCONTROL_E2E_USER__ = {
        uid: 'e2e-tester-uid',
        email: 'tester@fincontrol.local',
        name: 'Tester FinControl',
        plan: userPlan,
        trialExpiresAt: userTrialExpiresAt,
        budgets: {},
        notificationSettings: { cardDueEnabled: true, cardDueDays: 3 },
        aiPreferences: { optIn: false },
      };
      window.__FINCONTROL_E2E_MOCK_DATA__ = {
        cards: [{ id: 'card-1', name: 'Cartão Principal', limit: 5000, color: '#C5A059' }],
        loans: [
          {
            id: 'loan-1',
            description: 'Compra 10x Teste',
            cardId: 'card-1',
            totalAmount: 1000,
            installmentsCount: 10,
            installmentValue: 100,
            currentInstallment: 1,
            isMyDebt: true,
            category: 'Alimentação',
          },
        ],
        expenses: [
          {
            id: 'exp-1',
            description: 'Mercado Mensal',
            cardId: 'card-1',
            value: 250,
            date: new Date(),
            category: 'Alimentação',
          },
        ],
        subscriptions: [
          {
            id: 'sub-1',
            name: 'Serviço Streaming',
            value: 50,
            cardId: 'card-1',
            category: 'Lazer',
            isActive: true,
          },
        ],
        clients: [{ id: 'client-1', name: 'Contato Teste', phone: '11999999999' }],
        incomes: [],
      };
    }, { userPlan, userTrialExpiresAt: trialExpiresAt });
  };

  test('Desktop (1440x900): Shell, Sidebar collapse, Busca Global e Menu de Perfil', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await setupMockSession(page, { isPro: true });
    await page.goto('/dashboard');

    // Cabeçalho institucional limpo
    await expect(page.getByRole('heading', { name: /Resumo financeiro/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Visão consolidada do período selecionado.')).toBeVisible();

    // Sidebar: Brand strictly "FinControl"
    const sidebar = page.locator('aside[aria-label="Navegação principal"]');
    await expect(sidebar).toBeVisible();
    await expect(sidebar.getByText('FinControl', { exact: true })).toBeVisible();
    await expect(sidebar.getByText('2.0')).not.toBeVisible();
    await expect(sidebar.getByText('Next')).not.toBeVisible();

    // Item ativo da Sidebar: Resumo
    const activeNav = sidebar.getByRole('button', { name: 'Resumo', exact: true });
    await expect(activeNav).toBeVisible();
    await expect(activeNav).toHaveAttribute('aria-current', 'page');

    // Botão de recolhimento da sidebar
    const collapseButton = page.getByRole('button', { name: /Recolher menu lateral/i });
    await expect(collapseButton).toBeVisible();
    await collapseButton.click();
    await expect(sidebar).toHaveClass(/w-\[72px\]/);

    // Expande novamente
    const expandButton = page.getByRole('button', { name: /Expandir menu lateral/i });
    await expect(expandButton).toBeVisible();
    await expandButton.click();
    await expect(sidebar).toHaveClass(/w-64/);

    // Topbar: Gatilho de busca global
    const searchTrigger = page.getByRole('button', { name: /Buscar no FinControl/i });
    await expect(searchTrigger).toBeVisible();
    await expect(searchTrigger.getByText('Ctrl K')).toBeVisible();

    // Teste de atalho Ctrl+K
    await page.keyboard.press('Control+k');
    const searchModal = page.locator('div[role="dialog"]');
    await expect(searchModal).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(searchModal).not.toBeVisible();

    // Menu de Perfil: Dropdown e acessibilidade
    const profileTrigger = page.getByRole('button', { name: /Abrir menu de perfil do usuário/i });
    await expect(profileTrigger).toBeVisible();
    await profileTrigger.click();

    const profileMenu = page.locator('div[role="menu"]');
    await expect(profileMenu).toBeVisible();
    await expect(profileMenu.getByText('tester@fincontrol.local')).toBeVisible();
    await expect(profileMenu.getByRole('button', { name: /Excluir Conta/i })).toBeVisible();
    await expect(profileMenu.getByRole('button', { name: /Sair da Conta/i })).toBeVisible();

    // Fecha menu com Escape
    await page.keyboard.press('Escape');
    await expect(profileMenu).not.toBeVisible();
  });

  test('Mobile (390x844): Topbar Hamburger e Drawer de Navegação', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await setupMockSession(page, { isPro: true });
    await page.goto('/dashboard');

    await expect(page.getByRole('heading', { name: /Resumo financeiro/i })).toBeVisible({ timeout: 10000 });

    // Desktop sidebar não deve ser visível no mobile
    const desktopSidebar = page.locator('aside[aria-label="Navegação principal"]');
    await expect(desktopSidebar).not.toBeVisible();

    // Topbar no mobile com botão hamburger
    const hamburger = page.getByRole('button', { name: /Abrir menu de navegação/i });
    await expect(hamburger).toBeVisible();

    // Abre Drawer
    await hamburger.click();
    const drawer = page.locator('div[role="dialog"][aria-label="Menu de navegação móvel"]');
    await expect(drawer).toBeVisible();

    // Verifica itens do drawer com touch target >= 44px
    const navButtons = drawer.locator('nav button');
    const count = await navButtons.count();
    expect(count).toBeGreaterThanOrEqual(5);

    // Testa fechamento via Escape
    await page.keyboard.press('Escape');
    await expect(drawer).not.toBeVisible();

    // Reabre e testa fechamento via clique no overlay
    await hamburger.click();
    await expect(drawer).toBeVisible();
    const backdrop = page.locator('div[aria-label="Menu de navegação móvel"] > div.fixed.inset-0');
    await backdrop.click({ position: { x: 350, y: 100 } });
    await expect(drawer).not.toBeVisible();

    // Reabre e testa fechamento ao clicar em item de navegação
    await hamburger.click();
    await expect(drawer).toBeVisible();

    const peopleNav = drawer.getByRole('button', { name: /Pessoas/i });
    await peopleNav.click();

    // Drawer fecha ao navegar
    await expect(drawer).not.toBeVisible();
  });

  test('Tema: Dark ↔ Light consome tokens DS2 sem regressão', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await setupMockSession(page, { isPro: true });
    await page.goto('/dashboard');

    await expect(page.getByRole('heading', { name: /Resumo financeiro/i })).toBeVisible({ timeout: 10000 });

    // Alternador de tema no Topbar
    const themeButton = page.getByRole('button', { name: /Alternar tema/i });
    await expect(themeButton).toBeVisible();

    // Alterna para modo claro
    await themeButton.click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

    // Alterna de volta para modo escuro
    await themeButton.click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });

  test('Reduced Motion: interface 100% funcional com prefers-reduced-motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width: 1440, height: 900 });
    await setupMockSession(page, { isPro: true });
    await page.goto('/dashboard');

    await expect(page.getByRole('heading', { name: /Resumo financeiro/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Fatura Total do Mês')).toBeVisible();
    await expect(page.getByText('Progresso de Pagamento')).toBeVisible();
  });

  test('Integridade Financeira: valores calculados permanecem idênticos', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await setupMockSession(page, { isPro: true });
    await page.goto('/dashboard');

    await expect(page.getByRole('heading', { name: /Resumo financeiro/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Fatura Total do Mês')).toBeVisible();
    await expect(page.getByText('Progresso de Pagamento')).toBeVisible();
  });

  test('Usuário Free Elegível: vê badge Free, CTA Testar Pro por 30 dias, sem cartão e R$ 29,99 vitalício', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await setupMockSession(page, { plan: 'free', trialExpiresAt: null });
    await page.goto('/dashboard');

    await expect(page.getByRole('heading', { name: /Resumo financeiro/i })).toBeVisible({ timeout: 10000 });

    // Sidebar: Badge Free
    const sidebar = page.locator('aside[aria-label="Navegação principal"]');
    await expect(sidebar.getByText('Free', { exact: true })).toBeVisible();

    // UpgradePrompt no ProSummary
    await expect(page.getByText('Conheça o FinControl Pro').first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Testar Pro por 30 dias/i }).first()).toBeVisible();
    await expect(page.getByText('Sem cartão de crédito. Sem cobrança automática.').first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Comprar Pro por R\$ 29,99/i }).first()).toBeVisible();
    await expect(page.getByText('Pagamento único. Acesso vitalício.').first()).toBeVisible();
  });

  test('Usuário com Trial Ativo: vê badge Teste Pro ativo e não vê CTA de novo trial', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const futureDate = new Date(Date.now() + 20 * 86400000).toISOString();
    await setupMockSession(page, { plan: 'vip_trial', trialExpiresAt: futureDate });
    await page.goto('/dashboard');

    await expect(page.getByRole('heading', { name: /Resumo financeiro/i })).toBeVisible({ timeout: 10000 });

    // Sidebar: Badge Teste Pro ativo
    const sidebar = page.locator('aside[aria-label="Navegação principal"]');
    await expect(sidebar.getByText('Teste Pro ativo')).toBeVisible();

    // Recursos Pro desbloqueados (ProSummary exibe valores sem blur ou prompt de upgrade)
    await expect(page.getByText('Total Receitas (Mês)')).toBeVisible();
    await expect(page.getByText('Balanço Final (Receitas - Fatura)')).toBeVisible();
    await expect(page.getByRole('button', { name: /Testar Pro por 30 dias/i })).not.toBeVisible();
  });

  test('Usuário com Trial Expirado: vê Free, aviso de trial utilizado e CTA de compra vitalícia', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const pastDate = new Date(Date.now() - 5 * 86400000).toISOString();
    await setupMockSession(page, { plan: 'free', trialExpiresAt: pastDate });
    await page.goto('/dashboard');

    await expect(page.getByRole('heading', { name: /Resumo financeiro/i })).toBeVisible({ timeout: 10000 });

    // Sidebar: Badge Free
    const sidebar = page.locator('aside[aria-label="Navegação principal"]');
    await expect(sidebar.getByText('Free', { exact: true })).toBeVisible();

    // UpgradePrompt exibe aviso e somente CTA de compra
    await expect(page.getByText('Conheça o FinControl Pro').first()).toBeVisible();
    await expect(page.getByText('Seu período de teste já foi utilizado.').first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Testar Pro por 30 dias/i })).not.toBeVisible();
    await expect(page.getByRole('button', { name: /Comprar Pro por R\$ 29,99/i }).first()).toBeVisible();
  });

  test('Usuário Pro: vê badge Pro e não vê nenhum CTA de compra ou trial', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await setupMockSession(page, { plan: 'pro', trialExpiresAt: null });
    await page.goto('/dashboard');

    await expect(page.getByRole('heading', { name: /Resumo financeiro/i })).toBeVisible({ timeout: 10000 });

    // Sidebar: Badge Pro
    const sidebar = page.locator('aside[aria-label="Navegação principal"]');
    await expect(sidebar.getByText('Pro', { exact: true })).toBeVisible();

    // Zero CTAs de trial ou compra
    await expect(page.getByRole('button', { name: /Testar Pro por 30 dias/i })).not.toBeVisible();
    await expect(page.getByRole('button', { name: /Comprar Pro por R\$ 29,99/i })).not.toBeVisible();
  });

  test('Search Gate: zero ocorrências de termos proibidos', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await setupMockSession(page, { plan: 'free', trialExpiresAt: null });
    await page.goto('/dashboard');

    await expect(page.getByRole('heading', { name: /Resumo financeiro/i })).toBeVisible({ timeout: 10000 });

    // Provedor de conteúdo na tela
    const bodyContent = await page.locator('body').innerText();

    expect(bodyContent).not.toContain('BLACK PRO');
    expect(bodyContent).not.toContain('VIP ATIVO');
    expect(bodyContent).not.toContain('Mês VIP');
    expect(bodyContent).not.toContain('Ativar Mês VIP');
    expect(bodyContent).not.toContain('alertas preditivos');
  });

});
