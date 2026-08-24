// e2e/user-isolation.spec.js
import { test, expect } from '@playwright/test';

test.describe('E2E Real Browser - Isolamento Estrito entre Usuários (User A vs User B)', () => {
    test('User A (Black Pro) deve ver seu plano e métricas Pro', async ({ page }) => {
        await page.addInitScript(() => {
            window.__FINCONTROL_E2E_USER__ = {
                uid: 'e2e-user-alpha',
                email: 'user-alpha@fincontrol.local',
                name: 'Usuário Alfa',
                plan: 'pro'
            };
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
                plan: 'free'
            };
        });

        await page.goto('/dashboard');
        await expect(page.getByText('Resumo Financeiro 💳')).toBeVisible({ timeout: 10000 });
        await expect(page.getByText('STANDARD')).toBeVisible();
        await expect(page.getByText('BLACK PRO')).not.toBeVisible();
    });
});
