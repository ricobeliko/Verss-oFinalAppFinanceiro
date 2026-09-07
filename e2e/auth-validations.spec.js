// e2e/auth-validations.spec.js
import { test, expect } from '@playwright/test';

test.describe('E2E Real Browser - Validações de Formulário de Autenticação', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/login');
    });

    test('deve validar tentativa de login com credenciais sintéticas inexistentes', async ({ page }) => {
        await page.getByRole('textbox', { name: /^E-?mail/i }).fill('usuario-sintetico-nao-existe@fincontrol.local');
        await page.locator('#password').fill('SenhaInvalida123!');

        const submitBtn = page.getByRole('button', { name: 'Entrar', exact: true });
        await submitBtn.click();

        // Deve permanecer seguro na tela de login
        await expect(page).toHaveURL(/.*login/);
    });

    test('deve validar preenchimento de campos obrigatórios no cadastro', async ({ page }) => {
        await page.getByRole('button', { name: /Não tem uma conta\? Cadastre-se/i }).click();

        const nameInput = page.getByRole('textbox', { name: /Nome/i });
        const emailInput = page.getByRole('textbox', { name: /^E-?mail/i });
        const passwordInput = page.locator('#password');
        const confirmPasswordInput = page.locator('#confirmPassword');

        await expect(nameInput).toHaveAttribute('required', '');
        await expect(emailInput).toHaveAttribute('required', '');
        await expect(passwordInput).toHaveAttribute('required', '');
        await expect(confirmPasswordInput).toHaveAttribute('required', '');
    });

    test('deve bloquear submissão de cadastro com nome vazio via validação nativa do formulário', async ({ page }) => {
        await page.getByRole('button', { name: /Não tem uma conta\? Cadastre-se/i }).click();

        const nameInput = page.getByRole('textbox', { name: /Nome/i });
        const emailInput = page.getByRole('textbox', { name: /^E-?mail/i });
        const passwordInput = page.locator('#password');
        const confirmPasswordInput = page.locator('#confirmPassword');

        // Preenche todos os campos exceto o nome
        await nameInput.fill('');
        await emailInput.fill('teste.nome.vazio@fincontrol.com');
        await passwordInput.fill('SenhaValida123');
        await confirmPasswordInput.fill('SenhaValida123');

        // Validação HTML5 nativa ativa (noValidate foi removido)
        const isInvalid = await nameInput.evaluate((el) => !el.checkValidity());
        expect(isInvalid).toBe(true);

        // Tentativa de submissão não deve redirecionar nem avançar
        const submitBtn = page.getByRole('button', { name: 'Criar Conta', exact: true });
        await submitBtn.click();
        await expect(page.getByRole('button', { name: 'Criar Conta', exact: true })).toBeVisible();
    });

    test('deve bloquear cadastro com nome contendo apenas espaços via verificação fail-closed do handler', async ({ page }) => {
        await page.getByRole('button', { name: /Não tem uma conta\? Cadastre-se/i }).click();

        const nameInput = page.getByRole('textbox', { name: /Nome/i });
        const emailInput = page.getByRole('textbox', { name: /^E-?mail/i });
        const passwordInput = page.locator('#password');
        const confirmPasswordInput = page.locator('#confirmPassword');

        // Preenche com espaços em branco
        await nameInput.fill('     ');
        await emailInput.fill('teste.espacos@fincontrol.com');
        await passwordInput.fill('SenhaValida123');
        await confirmPasswordInput.fill('SenhaValida123');

        const submitBtn = page.getByRole('button', { name: 'Criar Conta', exact: true });
        await submitBtn.click();

        // Deve exibir toast e não prosseguir
        await expect(page.getByText('Informe seu nome para continuar.')).toBeVisible();
        await expect(page.getByRole('button', { name: 'Criar Conta', exact: true })).toBeVisible();
    });
});

