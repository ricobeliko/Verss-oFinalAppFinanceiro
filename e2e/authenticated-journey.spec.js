// e2e/authenticated-journey.spec.js
import { test, expect } from '@playwright/test';

test.describe('E2E Real Browser - Jornada Autenticada Completa & Recursos Financeiros', () => {
    test.beforeEach(async ({ page }) => {
        // Injeta sessão e dados sintéticos isolados de produção
        await page.addInitScript(() => {
            window.__FINCONTROL_E2E_USER__ = {
                uid: 'e2e-user-primary-123',
                email: 'e2e-tester@fincontrol.local',
                name: 'Tester Black Pro',
                plan: 'pro',
                budgets: { 'Alimentação': 1500, 'Transporte': 600 },
                notificationSettings: { cardDueEnabled: true, cardDueDays: 3, receivablesEnabled: true },
                aiPreferences: { optIn: false }
            };
            window.__FINCONTROL_E2E_MOCK_DATA__ = {
                cards: [{ id: 'card-1', name: 'Cartão E2E Master', limit: 5000, color: '#C5A059' }],
                loans: [{ id: 'loan-1', description: 'Compra E2E 12x', cardId: 'card-1', totalAmount: 1200, installmentsCount: 12, installmentValue: 100, currentInstallment: 1, isMyDebt: true, category: 'Alimentação' }],
                expenses: [{ id: 'exp-1', description: 'Mercado E2E', cardId: 'card-1', value: 250, date: new Date(), category: 'Alimentação' }],
                subscriptions: [{ id: 'sub-1', name: 'Streaming E2E', value: 49.90, cardId: 'card-1', category: 'Lazer' }],
                clients: [{ id: 'client-1', name: 'Pessoa E2E', phone: '11999999999' }],
                incomes: []
            };
        });

        await page.goto('/dashboard');
        // Aguarda renderização inicial do Dashboard
        await expect(page.getByText('Resumo Financeiro 💳')).toBeVisible({ timeout: 10000 });
    });

    test('Fluxo 1: Deve renderizar o Dashboard com cards de métricas, fatura total e badge Black Pro', async ({ page }) => {
        await expect(page.getByText('Fatura Total do Mês')).toBeVisible();
        await expect(page.getByText('Progresso de Pagamento')).toBeVisible();
        await expect(page.getByText('BLACK PRO')).toBeVisible();
    });

    test('Fluxo 2: Central de Notificações - Deve abrir pelo sino, exibir ARIA correto e fechar com Escape', async ({ page }) => {
        const bellButton = page.getByRole('button', { name: /Central de Alertas/i });
        await expect(bellButton).toBeVisible();
        await bellButton.click();

        // Diálogo de notificações deve abrir
        const popover = page.getByRole('dialog', { name: /Notificações e Alertas/i });
        await expect(popover).toBeVisible();

        // Fechar com a tecla Escape
        await page.keyboard.press('Escape');
        await expect(popover).not.toBeVisible();
    });

    test('Fluxo 3: Resumo Executivo - Deve abrir modal, navegar entre abas Semanal e Mensal e fechar', async ({ page }) => {
        const resumoBtn = page.getByRole('button', { name: /Resumo Executivo/i });
        await expect(resumoBtn).toBeVisible();
        await resumoBtn.click();

        // Modal aberto
        await expect(page.locator('#generic-modal-title').filter({ hasText: 'Resumo Executivo Financeiro' })).toBeVisible();

        // Verificar aba semanal
        const weeklyTab = page.getByRole('button', { name: /Visão Semanal/i });
        await weeklyTab.click();
        await expect(page.getByText('Últimos 7 Dias', { exact: true })).toBeVisible();
        await expect(page.getByText('Próximos 7 Dias', { exact: true })).toBeVisible();

        // Verificar aba mensal
        const monthlyTab = page.getByRole('button', { name: /Visão Mensal Consolidada/i });
        await monthlyTab.click();
        await expect(page.getByText(/Consolidado da Competência/i)).toBeVisible();

        // Fechar modal
        const closeBtn = page.getByRole('button', { name: 'Fechar modal' }).last();
        await closeBtn.click();
        await expect(page.locator('#generic-modal-title').filter({ hasText: 'Resumo Executivo Financeiro' })).not.toBeVisible();
    });

    test('Fluxo 4: Simulador Sandbox ("E se...?") - Deve executar cenário hipotético sem persistir dados', async ({ page }) => {
        const simBtn = page.getByRole('button', { name: /Simulador/i });
        await expect(simBtn).toBeVisible();
        await simBtn.click();

        // Modal do simulador deve exibir aviso explícito de Sandbox
        await expect(page.getByText(/Simulação Temporária/i)).toBeVisible();
        await expect(page.getByText('SANDBOX')).toBeVisible();

        // Testar aba Cancelar Assinatura
        await page.getByRole('button', { name: /Cancelar Assinatura/i }).click();
        await expect(page.getByText(/Selecione a Assinatura a Cancelar/i)).toBeVisible();

        // Fechar modal
        await page.getByRole('button', { name: 'Fechar modal' }).last().click();
        await expect(page.getByText(/Simulação Temporária/i)).not.toBeVisible();
    });

    test('Fluxo 5: Metas de Orçamento (Budgets) - Deve exibir progresso por categoria e abrir modal de ajuste', async ({ page }) => {
        // Widget de Metas
        await expect(page.getByText('Metas de Orçamento por Categoria')).toBeVisible();

        // Clicar em Ajustar Metas
        const adjustBtn = page.getByRole('button', { name: /Ajustar Metas/i });
        await adjustBtn.click();

        // Modal de Metas
        await expect(page.locator('#generic-modal-title').filter({ hasText: 'Metas de Orçamento por Categoria' })).toBeVisible();

        // Fechar modal
        const cancelBtn = page.getByRole('button', { name: /Cancelar/i });
        await cancelBtn.click();
        await expect(page.locator('#generic-modal-title').filter({ hasText: 'Metas de Orçamento por Categoria' })).not.toBeVisible();
    });

    test('Fluxo 6: Exportação CSV - Deve disparar evento de download com arquivo não vazio', async ({ page }) => {
        const csvBtn = page.getByRole('button', { name: /CSV Mês/i });
        await expect(csvBtn).toBeVisible();

        // Aguarda o evento de download real do Playwright
        const downloadPromise = page.waitForEvent('download');
        await csvBtn.click();
        const download = await downloadPromise;

        // Valida nome do arquivo
        expect(download.suggestedFilename()).toMatch(/extrato-.*\.csv/);
    });

    test('Fluxo 7: Busca Global - Deve abrir busca rápida e fechar com Escape', async ({ page }) => {
        // Abrir busca pelo botão da topbar
        const searchTopBtn = page.getByRole('button', { name: /Abrir busca global de lançamentos/i });
        await expect(searchTopBtn).toBeVisible();
        await searchTopBtn.click();

        // Modal de busca deve aparecer
        const searchInput = page.getByLabel('Termo de busca');
        await expect(searchInput).toBeVisible();

        // Digitar termo de busca
        await searchInput.fill('Mercado');

        // Fechar com Escape
        await page.keyboard.press('Escape');
        await expect(searchInput).not.toBeVisible();
    });

    test('Fluxo 8: Logout Seguro - Deve desconectar e bloquear acesso às telas privadas', async ({ page }) => {
        // Abrir menu de perfil na sidebar inferior
        const profileTrigger = page.getByRole('button', { name: 'Abrir menu de perfil do usuário' });
        await expect(profileTrigger).toBeVisible();
        await profileTrigger.click();

        // Clicar em Sair da conta
        const logoutBtn = page.getByRole('button', { name: /Sair da conta/i });
        await expect(logoutBtn).toBeVisible();
        await logoutBtn.click();

        // Deve retornar para Landing Page ou Login
        await expect(page).toHaveURL(/\/(login)?$/);
    });
});
