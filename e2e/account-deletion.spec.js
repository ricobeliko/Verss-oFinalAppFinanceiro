// e2e/account-deletion.spec.js
import { test, expect } from '@playwright/test';

test.describe('E2E Security & Privacy — Exclusão de Conta (LGPD)', () => {
    test.beforeEach(async ({ page }) => {
        // Injeta sessão autenticada com dados simulados
        await page.addInitScript(() => {
            window.__FINCONTROL_E2E_USER__ = {
                uid: 'user-lgpd-delete-test',
                email: 'delete.me@fincontrol.com',
                displayName: 'Usuário Deletável',
                plan: 'pro',
            };
            window.__FINCONTROL_E2E_MOCK_DATA__ = {
                cards: [{ id: 'card-del-1', name: 'Cartão Deletável', limit: 1000, currentInvoice: 0 }],
                loans: [],
                expenses: [],
                subscriptions: [],
                clients: [],
                incomes: [],
            };
        });

        await page.goto('/dashboard');
        await expect(page.getByText(/Resumo Financeiro/i)).toBeVisible({ timeout: 10000 });
    });

    test('deve abrir o modal de exclusão, exigir confirmação "EXCLUIR" e processar logout', async ({ page }) => {
        // Abre o dropdown de perfil do usuário
        const profileTrigger = page.getByRole('button', { name: 'Abrir menu de perfil do usuário' });
        await expect(profileTrigger).toBeVisible({ timeout: 10000 });
        await profileTrigger.click();

        // Clica no botão de exclusão de conta
        const deleteOption = page.getByRole('button', { name: /Excluir conta/i });
        await expect(deleteOption).toBeVisible({ timeout: 5000 });
        await deleteOption.click();

        // Verifica abertura do modal de Zona de Perigo
        await expect(page.getByText('Zona de Perigo — Excluir Conta')).toBeVisible();
        await expect(page.getByText('Ação permanente e irreversível!')).toBeVisible();

        // Botão de exclusão deve começar desabilitado
        const submitBtn = page.getByRole('button', { name: 'Excluir Minha Conta' });
        await expect(submitBtn).toBeDisabled();

        // Digitar texto incorreto não deve habilitar
        const input = page.locator('#confirmDeletionInput');
        await input.fill('CANCELAR');
        await expect(submitBtn).toBeDisabled();

        // Digitar "EXCLUIR" deve habilitar o botão
        await input.fill('EXCLUIR');
        await expect(submitBtn).toBeEnabled();

        // Executar exclusão
        await submitBtn.click();

        // Deve redirecionar para a Landing Page / Login após exclusão segura
        await expect(page).toHaveURL(/\/(login|$)/, { timeout: 8000 });
        await expect(page.getByRole('button', { name: /Entrar|Acessar/i })).toBeVisible({ timeout: 8000 });
    });
});
