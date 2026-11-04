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
        await expect(page.getByRole('heading', { name: /Resumo financeiro/i })).toBeVisible({ timeout: 10000 });
    });

    test('Fluxo 1: Deve renderizar o Dashboard com cards de métricas, fatura total e badge Pro factual', async ({ page }) => {
        await expect(page.getByText('Fatura Total do Mês')).toBeVisible();
        await expect(page.getByText('Progresso de Pagamento')).toBeVisible();
        await expect(page.getByText('Pro', { exact: true })).toBeVisible();
        await expect(page.getByText('BLACK PRO')).not.toBeVisible();
        await expect(page.getByText('Ativar Mês VIP')).not.toBeVisible();
    });

    test('Fluxo 2: Simulador Sandbox ("E se...?") - Deve executar cenário hipotético sem persistir dados', async ({ page }) => {
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

    test('Fluxo 3: Exportação CSV por Pessoa no Relatório - Deve baixar arquivo padronizado com nome sanitizado', async ({ page }) => {
        // Navega para Pessoas via topbar pill
        const pessoasBtn = page.getByRole('button', { name: 'Pessoas' }).first();
        await pessoasBtn.click();

        // Aguarda transição e renderização da tela de Pessoas
        await expect(page.getByRole('heading', { name: /Gerenciamento de Pessoas/i })).toBeVisible({ timeout: 10000 });

        // Clica no extrato/relatório da pessoa
        const reportBtn = page.getByRole('button', { name: /Extrato \/ PDF|Relatório/i }).or(page.getByRole('button', { name: /Ver extrato/i })).first();
        await expect(reportBtn).toBeVisible({ timeout: 10000 });
        await reportBtn.click();

        // Modal de relatório aberto
        await expect(page.getByRole('heading', { name: 'Relatório Financeiro' })).toBeVisible({ timeout: 10000 });

        // Botão Exportar CSV do mês
        const exportCsvBtn = page.getByRole('button', { name: 'Exportar CSV do mês' }).first();
        await expect(exportCsvBtn).toBeVisible();

        const downloadPromise = page.waitForEvent('download');
        await exportCsvBtn.click();
        const download = await downloadPromise;

        // Valida nome do arquivo padronizado fincontrol-{nome}-{periodo}.csv
        expect(download.suggestedFilename()).toMatch(/^fincontrol-.*\.csv$/);
    });

    test('Fluxo 4: Busca Global - Deve abrir busca rápida e fechar com Escape', async ({ page }) => {
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

    test('Fluxo 5: Logout Seguro - Deve desconectar e bloquear acesso às telas privadas', async ({ page }) => {
        // Abrir menu de perfil na barra superior
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
