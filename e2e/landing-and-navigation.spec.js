// e2e/landing-and-navigation.spec.js
import { test, expect } from '@playwright/test';

test.describe('E2E Real Browser - Landing Page Oficial e Navegação Pública', () => {
  test('deve carregar a Landing Page oficial com Obsidian + Champagne Gold e navegar para Login', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');

    // 1. Header & Brand
    const header = page.locator('header');
    await expect(header).toBeVisible();
    await expect(header).toContainText('FinControl');

    // 2. Ausência obrigatória do badge de laboratório "Next 2.0"
    await expect(header.locator('text=Next 2.0')).toHaveCount(0);
    await expect(page.locator('text=Next 2.0')).toHaveCount(0);

    // 3. Links de navegação com âncoras reais
    const navComoFunciona = header.getByRole('link', { name: 'Como Funciona' });
    await expect(navComoFunciona).toHaveAttribute('href', '#how-it-works');

    const navDivisao = header.getByRole('link', { name: 'Divisão & Parcelas' });
    await expect(navDivisao).toHaveAttribute('href', '#shared-purchases');

    const navRecursos = header.getByRole('link', { name: 'Recursos' });
    await expect(navRecursos).toHaveAttribute('href', '#features');

    const navPlanos = header.getByRole('link', { name: 'Planos' });
    await expect(navPlanos).toHaveAttribute('href', '#pricing');

    // 4. Botão Entrar na barra de navegação
    const loginLink = header.getByRole('link', { name: 'Entrar' }).first();
    await expect(loginLink).toBeVisible();

    // 5. Clica no botão de login e valida navegação
    await loginLink.click();
    await expect(page).toHaveURL(/.*login/);
    await expect(page.getByLabel('Email')).toBeVisible();
  });

  test('deve renderizar Hero com Living Ledger como protagonista e ausência total do Mascote Fin', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');

    // 1. Headline e Supporting Copy factuais
    const headline = page.locator('h1');
    await expect(headline).toBeVisible();
    await expect(headline).toContainText('Suas faturas sob controle');
    await expect(headline).toContainText('Suas compras compartilhadas resolvidas');

    // CTAs do Hero
    const ctaCriar = page.locator('#hero a:has-text("Criar conta gratuita")');
    await expect(ctaCriar).toBeVisible();
    await expect(ctaCriar).toHaveAttribute('href', '/login?mode=register');

    const ctaComoFunciona = page.locator('#hero a:has-text("Ver como funciona")');
    await expect(ctaComoFunciona).toBeVisible();
    await expect(ctaComoFunciona).toHaveAttribute('href', '#how-it-works');

    // 2. Ausência total do mascote Fin na Landing
    const finMascot = page.locator('div[role="button"][aria-label*="Fin"]');
    await expect(finMascot).toHaveCount(0);
    await expect(page.locator('text=Mascote Fin')).toHaveCount(0);

    // 3. Living Ledger como protagonista visual
    await expect(page.locator('text=Cartão Principal').first()).toBeVisible();
    await expect(page.locator('text=4.280,50').first()).toBeVisible();
    await expect(page.locator('text=Notebook de Trabalho').first()).toBeVisible();
    await expect(page.locator('text=Lucas deve R$ 575,00').first()).toBeVisible();

    // 4. Regra de R$ 0,01 residual (Pago Parcial)
    const timelineSection = page.locator('#invoices-timeline');
    await expect(timelineSection).toBeVisible();
    await expect(timelineSection).toContainText('O Princípio de R$ 0,01');
    await expect(timelineSection).toContainText('Pago Parcial');
  });

  test('deve renderizar o Pricing Canônico (Gratuito R$ 0 + Pro R$ 29,99 Vitalício)', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');

    const pricing = page.locator('#pricing');
    await expect(pricing).toBeVisible();
    await pricing.scrollIntoViewIfNeeded();

    // Card Gratuito
    await expect(pricing.locator('text=Gratuito').first()).toBeVisible();
    await expect(pricing.locator('text=R$ 0').first()).toBeVisible();
    await expect(pricing.locator('text=Para sempre').first()).toBeVisible();
    await expect(pricing.locator('text=Começar gratuitamente').first()).toBeVisible();

    // Card Pro Vitalício
    await expect(pricing.locator('text=FinControl Pro').first()).toBeVisible();
    await expect(pricing.locator('text=R$ 29,99').first()).toBeVisible();
    await expect(pricing.locator('text=pagamento único').first()).toBeVisible();
    await expect(pricing.locator('text=acesso vitalício').first()).toBeVisible();
    await expect(pricing.locator('text=Desbloquear FinControl Pro').first()).toBeVisible();
    await expect(pricing.locator('text=Pagamento único. Acesso vitalício.').first()).toBeVisible();

    // Features oficiais do plano Pro
    await expect(pricing.locator('text=Cadastro de pessoas e divisão de compras')).toBeVisible();
    await expect(pricing.locator('text=Gestão de cartões de crédito e faturas')).toBeVisible();
    await expect(pricing.locator('text=Registro de receitas e balanço mensal')).toBeVisible();
    await expect(pricing.locator('text=Modo Crise para auditoria e corte de gastos')).toBeVisible();

    // Ausência de modelos de assinatura não canônicos
    await expect(page.locator('button:has-text("Anual")')).toHaveCount(0);
    await expect(page.locator('button:has-text("Mensal")')).toHaveCount(0);
    await expect(page.locator('text=2 meses grátis')).toHaveCount(0);
    await expect(page.locator('text=Degustação VIP')).toHaveCount(0);
  });

  test('deve garantir ausência total de métricas falsas e marcadores de lab (Search Gates)', async ({ page }) => {
    await page.goto('/');

    const bodyText = await page.textContent('body');

    // Prova social fictícia (Zero tolerância)
    expect(bodyText).not.toContain('4,9/5');
    expect(bodyText).not.toContain('4.9/5');
    expect(bodyText).not.toContain('50 mil+');
    expect(bodyText).not.toContain('50.000+');
    expect(bodyText).not.toContain('100% seguro');
    expect(bodyText).not.toContain('100% privado');
    expect(bodyText).not.toContain('avaliações médias');
    expect(bodyText).not.toContain('usuários confiando');

    // Marcadores de lab / piloto
    expect(bodyText).not.toContain('NEXT 2.0');
    expect(bodyText).not.toContain('Next 2.0');
    expect(bodyText).not.toContain('VISUAL LAB');
    expect(bodyText).not.toContain('STAGE A');
    expect(bodyText).not.toContain('PILOT');
    expect(bodyText).not.toContain('DEMO MODE');
  });

  test('deve ser totalmente responsivo no Mobile (390x844) e controlar o menu drawer', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    // Header mobile e botão menu
    const menuBtn = page.getByRole('button', { name: /abrir menu de navegação/i });
    await expect(menuBtn).toBeVisible();

    // Abre drawer mobile
    await menuBtn.click();
    const navComoFuncionaMobile = page.locator('nav').getByRole('link', { name: 'Como Funciona' });
    await expect(navComoFuncionaMobile).toBeVisible();

    // Fecha drawer clicando no botão toggle
    await page.getByRole('button', { name: /abrir menu de navegação/i }).click();
  });
});
