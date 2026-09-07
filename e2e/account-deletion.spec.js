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

    test('deve abrir o modal DS2, exigir confirmação "EXCLUIR" (Step 1), validar senha no Recent Auth (Step 2) e processar logout', async ({ page }) => {
        // Abre o dropdown de perfil do usuário
        const profileTrigger = page.getByRole('button', { name: 'Abrir menu de perfil do usuário' });
        await expect(profileTrigger).toBeVisible({ timeout: 10000 });
        await profileTrigger.click();

        // Clica no botão de exclusão de conta
        const deleteOption = page.getByRole('button', { name: /Excluir conta/i });
        await expect(deleteOption).toBeVisible({ timeout: 5000 });
        await deleteOption.click();

        // ETAPA 1: Verifica abertura do modal de Zona de Perigo
        await expect(page.getByText('Zona de Perigo — Excluir Conta')).toBeVisible();
        await expect(page.getByText('Ação permanente e irreversível!')).toBeVisible();

        // Botão "Continuar" deve começar desabilitado
        const continueBtn = page.getByRole('button', { name: 'Continuar' });
        await expect(continueBtn).toBeDisabled();

        // Digitar texto incorreto não deve habilitar
        const confirmInput = page.locator('#confirmDeletionInput');
        await confirmInput.fill('CANCELAR');
        await expect(continueBtn).toBeDisabled();

        // Digitar "EXCLUIR" deve habilitar o botão Continuar
        await confirmInput.fill('EXCLUIR');
        await expect(continueBtn).toBeEnabled();
        await continueBtn.click();

        // ETAPA 2: Reautenticação Recente com Senha
        await expect(page.getByRole('heading', { name: 'Confirme sua Senha' })).toBeVisible();
        await expect(page.getByText(/Por segurança, precisamos confirmar novamente sua identidade/i)).toBeVisible();

        const passwordInput = page.locator('#reauth-password-input');
        const confirmDeleteBtn = page.getByRole('button', { name: 'Confirmar Exclusão' });

        // Botão de confirmação de exclusão desabilitado sem senha
        await expect(confirmDeleteBtn).toBeDisabled();

        // Testar senha incorreta
        await passwordInput.fill('wrong-password');
        await expect(confirmDeleteBtn).toBeEnabled();
        await confirmDeleteBtn.click();

        // Mensagem de erro de senha incorreta deve ser exibida e modal não fecha
        await expect(page.getByText('Senha incorreta. Tente novamente.')).toBeVisible();

        // Digitar senha correta
        await passwordInput.fill('senhaCorreta123');
        await confirmDeleteBtn.click();

        // Deve redirecionar para a Landing Page / Login após exclusão segura
        await expect(page).toHaveURL(/\/(login|$)/, { timeout: 8000 });
        await expect(page.getByRole('button', { name: /Entrar|Acessar/i }).or(page.getByRole('link', { name: /Entrar|Acessar/i })).first()).toBeVisible({ timeout: 8000 });
    });
});
