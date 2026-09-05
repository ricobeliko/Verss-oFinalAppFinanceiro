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

    test('deve renderizar Hero com Mascote Fin e Living Ledger funcional', async ({ page }) => {
        await page.goto('/');

        // Verifica headline e CTAs
        await expect(page.getByText('Suas faturas sob controle.')).toBeVisible();
        await expect(page.getByRole('button', { name: /Criar conta gratuita/i }).first()).toBeVisible();

        // Verifica CTA "Ver como funciona" e Nav "Como funciona" apontando para #living-ledger
        const ctaVerComoFunciona = page.getByRole('link', { name: 'Ver como funciona' });
        await expect(ctaVerComoFunciona).toBeVisible();
        await expect(ctaVerComoFunciona).toHaveAttribute('href', '#living-ledger');

        const navComoFunciona = page.locator('header').getByRole('link', { name: 'Como funciona' });
        await expect(navComoFunciona).toHaveAttribute('href', '#living-ledger');

        // Verifica o Living Ledger no DOM
        const livingLedger = page.locator('#living-ledger');
        await expect(livingLedger).toBeVisible();
        await expect(livingLedger).toContainText('FinControl Platinum');
        await expect(livingLedger).toContainText('•••• 4821');
        await expect(livingLedger).toContainText('R$ 1.284,60');

        // Verifica regra de R$ 0,01 residual (Pago Parcial)
        await expect(livingLedger).toContainText('Notebook (Parcela 03/10)');
        await expect(livingLedger).toContainText('Pago Parcial');

        // Verifica presença do Mascote Fin e fala contextual
        await expect(page.getByText('Veja sua fatura organizada no FinControl.')).toBeVisible();
    });

    test('deve garantir ausência total de prova social fictícia (No Fake Social Proof)', async ({ page }) => {
        await page.goto('/');

        // Zero métricas fictícias
        await expect(page.getByText(/50\s*mil\+/i)).toHaveCount(0);
        await expect(page.getByText(/4[.,]9\s*\/\s*5/i)).toHaveCount(0);
        await expect(page.getByText(/100%\s*seguro/i)).toHaveCount(0);
        await expect(page.getByText(/100%\s*privado/i)).toHaveCount(0);
        await expect(page.getByText(/avaliações médias/i)).toHaveCount(0);
        await expect(page.getByText(/usuários confiando/i)).toHaveCount(0);
    });

    test('deve renderizar light preview em DEV quando solicitado via query param', async ({ page }) => {
        await page.goto('/?landingTheme=light');

        const landingRoot = page.locator('.landing-root');
        await expect(landingRoot).toBeVisible();
        await expect(landingRoot).toHaveClass(/landing-theme-light/);
    });

    test('deve abrir e fechar menu mobile com atributos de acessibilidade', async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 844 });
        await page.goto('/');

        const toggleBtn = page.getByRole('button', { name: /menu de navegação/i });
        await expect(toggleBtn).toBeVisible();
        await expect(toggleBtn).toHaveAttribute('aria-expanded', 'false');
        await expect(toggleBtn).toHaveAttribute('aria-label', 'Abrir menu de navegação');

        // Abre menu mobile
        await toggleBtn.click();
        await expect(toggleBtn).toHaveAttribute('aria-expanded', 'true');
        await expect(toggleBtn).toHaveAttribute('aria-label', 'Fechar menu de navegação');
        const mobileMenu = page.locator('#mobile-nav-menu');
        await expect(mobileMenu).toBeVisible();
        await expect(mobileMenu.getByRole('link', { name: 'Como funciona' })).toHaveAttribute('href', '#living-ledger');

        // Fecha menu mobile
        await toggleBtn.click();
        await expect(toggleBtn).toHaveAttribute('aria-expanded', 'false');
        await expect(toggleBtn).toHaveAttribute('aria-label', 'Abrir menu de navegação');
    });
});
