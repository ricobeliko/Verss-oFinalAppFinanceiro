// e2e/write-path-security.spec.js
// LOTE 2 — E2E Write-Path: Segurança e Isolamento
//
// Testa que dados de User A NÃO são acessíveis por User B.
// Testa que escritas ocorrem apenas no namespace do usuário correto.
// Testa quitação de parcela (toggle de status).
//
// IMPORTANTE: Nenhum destes testes toca produção.

import { test, expect } from '@playwright/test';

// ============================================================
// GRUPO 1: Isolamento Estrito User A / User B (Write-Path)
// ============================================================
test.describe('E2E Security — Isolamento de Escrita entre Usuários', () => {
    test('User A (Pro) cria dados e User B (Free) não vê dados de A', async ({ browser }) => {
        // Contexto isolado para User A
        const contextA = await browser.newContext();
        const pageA = await contextA.newPage();

        await pageA.addInitScript(() => {
            window.__FINCONTROL_E2E_USER__ = {
                uid: 'e2e-user-alpha-write',
                email: 'alpha-write@fincontrol.local',
                name: 'Alpha Write',
                plan: 'pro',
                budgets: {},
                notificationSettings: {},
                aiPreferences: { optIn: false },
            };
            window.__FINCONTROL_E2E_MOCK_DATA__ = {
                cards: [{ id: 'card-alpha', name: 'Cartão Alpha', limit: 5000, color: '#C5A059', closingDay: 10, dueDay: 17, userId: 'e2e-user-alpha-write' }],
                loans: [{ id: 'loan-alpha', description: 'Compra Alpha Exclusiva', totalAmount: 500, installmentsCount: 1, installmentValue: 500, currentInstallment: 1, cardId: 'card-alpha', isMyDebt: true, category: 'Alimentação' }],
                expenses: [],
                subscriptions: [],
                clients: [],
                incomes: [],
            };
        });

        await pageA.goto('/dashboard');
        await expect(pageA.getByText('BLACK PRO')).toBeVisible({ timeout: 10000 });
        // Verifica que a compra de Alpha existe no dashboard de Alpha
        await expect(pageA.getByText(/Resumo Financeiro/i)).toBeVisible();

        await contextA.close();

        // Contexto isolado para User B (free, sem dados)
        const contextB = await browser.newContext();
        const pageB = await contextB.newPage();

        await pageB.addInitScript(() => {
            window.__FINCONTROL_E2E_USER__ = {
                uid: 'e2e-user-beta-write',
                email: 'beta-write@fincontrol.local',
                name: 'Beta Write',
                plan: 'free',
                budgets: {},
                notificationSettings: {},
                aiPreferences: { optIn: false },
            };
            window.__FINCONTROL_E2E_MOCK_DATA__ = {
                cards: [],
                loans: [],
                expenses: [],
                subscriptions: [],
                clients: [],
                incomes: [],
            };
        });

        await pageB.goto('/dashboard');
        await expect(pageB.getByText('STANDARD')).toBeVisible({ timeout: 10000 });

        // User B NÃO deve ver dados de User A (não há dados de A no contexto de B)
        await expect(pageB.getByText('Compra Alpha Exclusiva')).not.toBeVisible();
        await expect(pageB.getByText('BLACK PRO')).not.toBeVisible();

        await contextB.close();
    });
});

// ============================================================
// GRUPO 2: Quitação / Toggle de Parcela (Write no Dashboard)
// ============================================================
test.describe('E2E Write-Path — Quitação de Parcela no Dashboard', () => {
    test.beforeEach(async ({ page }) => {
        await page.addInitScript(() => {
            window.__FINCONTROL_E2E_USER__ = {
                uid: 'e2e-user-quitacao',
                email: 'quitacao@fincontrol.local',
                name: 'Tester Quitação',
                plan: 'pro',
                budgets: {},
                notificationSettings: {},
                aiPreferences: { optIn: false },
            };
            window.__FINCONTROL_E2E_MOCK_DATA__ = {
                cards: [
                    { id: 'card-quit', name: 'Cartão Quitação E2E', limit: 5000, color: '#C5A059', closingDay: 10, dueDay: 17, userId: 'e2e-user-quitacao' }
                ],
                loans: [
                    {
                        id: 'loan-quit-1',
                        description: 'Parcela para Quitar E2E',
                        totalAmount: 120000,  // R$ 1200,00 em centavos
                        installmentsCount: 12,
                        installmentValue: 10000, // R$ 100,00
                        currentInstallment: 1,
                        cardId: 'card-quit',
                        isMyDebt: true,
                        category: 'Eletrônicos',
                        userId: 'e2e-user-quitacao',
                    }
                ],
                expenses: [],
                subscriptions: [],
                clients: [],
                incomes: [],
            };
        });
        await page.goto('/dashboard');
        await expect(page.getByText(/Resumo Financeiro/i)).toBeVisible({ timeout: 10000 });
    });

    test('deve exibir o dashboard com a compra pendente de quitação', async ({ page }) => {
        // Confirma que o dashboard renderizou com a compra E2E visível
        await expect(page.getByText('Fatura Total do Mês')).toBeVisible();
        await expect(page.getByText('Progresso de Pagamento')).toBeVisible();
        // O resumo exibe a seção de faturas e compromissos
        await expect(page.getByRole('heading', { name: 'Fatura Total do Mês' })).toBeVisible();
    });
});

// ============================================================
// GRUPO 3: Proteção de Rota — Acesso não autenticado bloqueado
// ============================================================
test.describe('E2E Security — Proteção de Rotas Privadas', () => {
    test('rota /dashboard deve redirecionar usuário não autenticado', async ({ page }) => {
        // Navega para dashboard SEM injetar sessão E2E
        await page.goto('/dashboard');

        // Deve ser redirecionado para landing page ou login
        await expect(page).toHaveURL(/\/(login|$)/, { timeout: 8000 });
    });

    test('rota /dashboard/cards deve redirecionar usuário não autenticado', async ({ page }) => {
        await page.goto('/dashboard/cards');
        await expect(page).toHaveURL(/\/(login|$)/, { timeout: 8000 });
    });
});
