// e2e/auth.spec.js
import { test, expect } from '@playwright/test';

test.describe('E2E Real Browser - Autenticação e Interface', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/login');
    });

    test('deve renderizar a tela de autenticação com campos acessíveis e tema DS2 Obsidian & Gold', async ({ page }) => {
        // Valida título da aplicação
        await expect(page.locator('h1')).toContainText('FinControl');

        // Valida campos de entrada por label acessível
        const emailInput = page.getByRole('textbox', { name: /^E-?mail/i });
        const passwordInput = page.locator('#password');

        await expect(emailInput).toBeVisible();
        await expect(passwordInput).toBeVisible();
        await expect(emailInput).toHaveAttribute('type', 'email');
        await expect(passwordInput).toHaveAttribute('type', 'password');
        await expect(emailInput).toHaveAttribute('autocomplete', 'email');
        await expect(passwordInput).toHaveAttribute('autocomplete', 'current-password');

        // Valida botão de submissão
        const submitButton = page.getByRole('button', { name: /Entrar na Conta|Entrar/i });
        await expect(submitButton).toBeVisible();
    });

    test('deve alternar entre modo de Login e Cadastro com validação de campos', async ({ page }) => {
        // Clicar em alternância para cadastro
        const toggleRegisterBtn = page.getByRole('button', { name: /Cadastre-se/i });
        await toggleRegisterBtn.click();

        // Campos adicionais de cadastro devem aparecer
        await expect(page.getByRole('textbox', { name: /Nome/i })).toBeVisible();
        await expect(page.locator('#confirmPassword')).toBeVisible();
        await expect(page.getByRole('button', { name: /Criar Minha Conta|Criar Conta/i })).toBeVisible();

        // Alternar de volta para login
        const toggleLoginBtn = page.getByRole('button', { name: /Já possui uma conta|Faça login/i });
        await toggleLoginBtn.click();
        await expect(page.getByRole('button', { name: /Entrar na Conta|Entrar/i })).toBeVisible();
    });

    test('deve abrir e fechar o modal de Recuperação de Senha DS2', async ({ page }) => {
        const forgotPasswordBtn = page.getByRole('button', { name: /Esqueceu a senha\?/i });
        await forgotPasswordBtn.click();

        // Modal deve abrir com título oficial
        const modalHeading = page.getByRole('heading', { name: /Recuperar Senha/i });
        await expect(modalHeading).toBeVisible();

        // Fechar modal pelo botão Fechar ou X
        const closeBtn = page.getByRole('button', { name: 'Fechar modal' }).or(page.getByRole('button', { name: 'Fechar', exact: true })).first();
        await closeBtn.click();
        await expect(modalHeading).not.toBeVisible();
    });
});
