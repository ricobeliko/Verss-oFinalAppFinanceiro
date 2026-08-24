// e2e/landing-and-navigation.spec.js
import { test, expect } from '@playwright/test';

test.describe('E2E Real Browser - Landing Page e Navegação Pública', () => {
    test('deve carregar a Landing Page com Design System Carbon Black & Gold e navegar para Login', async ({ page }) => {
        await page.goto('/');

        // Verifica a presença do logotipo e título
        await expect(page.locator('header')).toBeVisible();
        await expect(page.locator('header')).toContainText('FinControl');

        // Verifica botão de Entrar na barra de navegação
        const loginBtn = page.getByRole('button', { name: 'Entrar' }).first();
        await expect(loginBtn).toBeVisible();

        // Clica no botão de login e valida redirecionamento
        await loginBtn.click();
        await expect(page).toHaveURL(/.*login/);
        await expect(page.getByLabel('Email')).toBeVisible();
    });

    test('deve renderizar a seção de recursos na Landing Page', async ({ page }) => {
        await page.goto('/');

        // Verifica elementos da landing page
        await expect(page.getByText('O controle financeiro para seus cartões')).toBeVisible();
        await expect(page.getByRole('button', { name: /Comece agora, é grátis!/i })).toBeVisible();
        await expect(page.getByText('Tudo o que você precisa em um só lugar')).toBeVisible();
    });
});
