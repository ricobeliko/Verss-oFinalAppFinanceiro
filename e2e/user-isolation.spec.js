// e2e/user-isolation.spec.js
import { test, expect } from '@playwright/test';

test.describe('E2E Real Browser - Isolamento Estrito entre Usuários (User A vs User B)', () => {
    test('User A (Black Pro) deve ver seu plano e métricas Pro', async ({ page }) => {
        await page.addInitScript(() => {
            window.__FINCONTROL_E2E_USER__ = {
                uid: 'e2e-user-alpha',
                email: 'user-alpha@fincontrol.local',
                name: 'Usuário Alfa',
                plan: 'pro',
                budgets: {},
                notificationSettings: {},
                aiPreferences: { optIn: false }
            };
            window.__FINCONTROL_E2E_MOCK_DATA__ = {
                cards: [{ id: 'card-alpha', name: 'Cartão Alfa Pro', limit: 8000, color: '#C5A059', userId: 'e2e-user-alpha' }],
                loans: [{ id: 'loan-alpha', description: 'Compra Alfa 12x', totalAmount: 1200, installmentsCount: 12, installmentValue: 100, currentInstallment: 1, cardId: 'card-alpha', isMyDebt: true, category: 'Alimentação' }],
                expenses: [{ id: 'exp-alpha', description: 'Despesa Alfa', cardId: 'card-alpha', value: 150, date: new Date(), category: 'Alimentação' }],
                subscriptions: [],
                clients: [],
                incomes: []
            };
            sessionStorage.setItem('hasSeenWelcomeModal', 'true');
        });

        await page.goto('/dashboard');
        await expect(page.getByText('Resumo Financeiro 💳')).toBeVisible({ timeout: 10000 });
        await expect(page.getByText('BLACK PRO')).toBeVisible();
    });

    test('User B (Standard) deve ver plano Standard e NÃO ver privilégios Pro do User A', async ({ page }) => {
        await page.addInitScript(() => {
            window.__FINCONTROL_E2E_USER__ = {
                uid: 'e2e-user-beta',
                email: 'user-beta@fincontrol.local',
                name: 'Usuário Beta',
                plan: 'free',
                budgets: {},
                notificationSettings: {},
                aiPreferences: { optIn: false }
            };
            window.__FINCONTROL_E2E_MOCK_DATA__ = {
                cards: [{ id: 'card-beta', name: 'Cartão Beta Free', limit: 2000, color: '#4A4A4A', userId: 'e2e-user-beta' }],
                loans: [],
                expenses: [],
                subscriptions: [],
                clients: [],
                incomes: []
            };
            sessionStorage.setItem('hasSeenWelcomeModal', 'true');
        });

        await page.goto('/dashboard');
        await expect(page.getByText('Resumo Financeiro 💳')).toBeVisible({ timeout: 10000 });
        await expect(page.getByText('STANDARD')).toBeVisible();
        await expect(page.getByText('BLACK PRO')).not.toBeVisible();
    });
});
