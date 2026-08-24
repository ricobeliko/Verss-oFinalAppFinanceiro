// e2e/auth-validations.spec.js
import { test, expect } from '@playwright/test';

test.describe('E2E Real Browser - Validações de Formulário de Autenticação', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/login');
    });

    test('deve validar tentativa de login com credenciais sintéticas inexistentes', async ({ page }) => {
        await page.getByLabel('Email').fill('usuario-sintetico-nao-existe@fincontrol.local');
        await page.getByLabel('Senha', { exact: true }).fill('SenhaInvalida123!');

        const submitBtn = page.getByRole('button', { name: 'Entrar', exact: true });
        await submitBtn.click();

        // Deve permanecer seguro na tela de login
        await expect(page).toHaveURL(/.*login/);
    });

    test('deve validar preenchimento de campos obrigatórios no cadastro', async ({ page }) => {
        await page.getByRole('button', { name: /Não tem uma conta\? Cadastre-se/i }).click();

        const nameInput = page.getByLabel('Nome');
        const emailInput = page.getByLabel('Email');
        const passwordInput = page.getByLabel('Senha', { exact: true });
        const confirmPasswordInput = page.getByLabel('Confirmar Senha');

        await expect(nameInput).toHaveAttribute('required', '');
        await expect(emailInput).toHaveAttribute('required', '');
        await expect(passwordInput).toHaveAttribute('required', '');
        await expect(confirmPasswordInput).toHaveAttribute('required', '');
    });
});
