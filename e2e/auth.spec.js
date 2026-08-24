// e2e/auth.spec.js
import { test, expect } from '@playwright/test';

test.describe('E2E Real Browser - Autenticação e Interface', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/login');
    });

    test('deve renderizar a tela de autenticação com campos acessíveis e tema Carbon Black & Gold', async ({ page }) => {
        // Valida título da aplicação
        await expect(page.locator('h1')).toContainText('FinControl');

        // Valida campos de entrada por label acessível
        const emailInput = page.getByLabel('Email');
        const passwordInput = page.getByLabel('Senha');

        await expect(emailInput).toBeVisible();
        await expect(passwordInput).toBeVisible();
        await expect(emailInput).toHaveAttribute('type', 'email');
        await expect(passwordInput).toHaveAttribute('type', 'password');

        // Valida botão de submissão
        const submitButton = page.getByRole('button', { name: 'Entrar', exact: true });
        await expect(submitButton).toBeVisible();
    });

    test('deve alternar entre modo de Login e Cadastro com validação de campos', async ({ page }) => {
        // Clicar em "Não tem uma conta? Cadastre-se"
        const toggleRegisterBtn = page.getByRole('button', { name: /Não tem uma conta\? Cadastre-se/i });
        await toggleRegisterBtn.click();

        // Campos adicionais de cadastro devem aparecer
        await expect(page.getByLabel('Nome')).toBeVisible();
        await expect(page.getByLabel('Confirmar Senha')).toBeVisible();
        await expect(page.getByRole('button', { name: 'Criar Conta', exact: true })).toBeVisible();

        // Alternar de volta para login
        const toggleLoginBtn = page.getByRole('button', { name: /Já tem uma conta\? Faça login/i });
        await toggleLoginBtn.click();
        await expect(page.getByRole('button', { name: 'Entrar', exact: true })).toBeVisible();
    });

    test('deve abrir e fechar o modal de Recuperação de Senha', async ({ page }) => {
        const forgotPasswordBtn = page.getByRole('button', { name: /Esqueceu a senha\?/i });
        await forgotPasswordBtn.click();

        // Modal deve abrir
        const modalHeading = page.getByRole('heading', { name: /Recuperar Senha/i });
        await expect(modalHeading).toBeVisible();

        // Fechar modal
        const closeBtn = page.getByRole('button', { name: '✕' });
        await closeBtn.click();
        await expect(modalHeading).not.toBeVisible();
    });
});
