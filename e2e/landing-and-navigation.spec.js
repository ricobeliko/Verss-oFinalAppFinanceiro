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
    await expect(page).toHaveURL(/.*login/, { timeout: 15000 });
    await expect(page.getByLabel('Email')).toBeVisible({ timeout: 15000 });
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
    await expect(page.locator('text=3.840,25').first()).toBeVisible();
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

    // Features oficiais do plano Pro e Free
    await expect(pricing.locator('text=Até 3 pessoas e até 2 cartões de crédito')).toBeVisible();
    await expect(pricing.locator('text=Gestão de cartões de crédito e faturas')).toBeVisible();
    await expect(pricing.locator('text=Registro de receitas e balanço mensal')).toBeVisible();
    await expect(pricing.locator('text=Pessoas e cartões de crédito ilimitados')).toBeVisible();
    await expect(pricing.locator('text=Projeção de parcelas futuras por pessoa')).toBeVisible();
    await expect(pricing.locator('text=Modo Crise')).toHaveCount(0);

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
    const menuBtn = page.getByRole('button', { name: /menu de navegação/i });
    await expect(menuBtn).toBeVisible();

    // 1. Initial state: aria-expanded=false, aria-controls="landing-mobile-nav"
    await expect(menuBtn).toHaveAttribute('aria-expanded', 'false');
    await expect(menuBtn).toHaveAttribute('aria-controls', 'landing-mobile-nav');

    // 2. Click: abre drawer mobile
    await menuBtn.click();
    await expect(menuBtn).toHaveAttribute('aria-expanded', 'true');

    // 3. Drawer visível com id="landing-mobile-nav"
    const drawer = page.locator('#landing-mobile-nav');
    await expect(drawer).toBeVisible();

    const navComoFuncionaMobile = drawer.getByRole('link', { name: 'Como Funciona' });
    await expect(navComoFuncionaMobile).toBeVisible();

    // 4. Click novamente: fecha drawer mobile e aria-expanded=false
    await menuBtn.click();
    await expect(menuBtn).toHaveAttribute('aria-expanded', 'false');
    await expect(drawer).toHaveCount(0);
  });

  test('deve alternar tema dark <-> light via botão do header e aplicar tokens corretamente', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');

    // Inicialmente no tema escuro (padrão)
    const root = page.locator('html');
    await expect(root).toHaveAttribute('data-theme', 'dark');

    // Botão de alternância de tema no header
    const toggleBtn = page.locator('header button[aria-label*="Alternar"]').first();
    await expect(toggleBtn).toBeVisible();

    // Clica para alternar para claro
    await toggleBtn.click();
    await page.waitForTimeout(600);
    await expect(root).toHaveAttribute('data-theme', 'light');

    // Verifica que o fundo do hero aplicou o token claro (#E6F4F7 / rgb(230, 244, 247))
    const hero = page.locator('#hero');
    const heroBg = await hero.evaluate((el) => window.getComputedStyle(el).backgroundColor);
    expect(heroBg).toBe('rgb(230, 244, 247)');

    // Clica novamente para voltar para escuro
    await toggleBtn.click();
    await page.waitForTimeout(600);
    await expect(root).toHaveAttribute('data-theme', 'dark');

    const heroBgDark = await hero.evaluate((el) => window.getComputedStyle(el).backgroundColor);
    expect(heroBgDark).toBe('rgb(4, 23, 31)');
  });

  test('todos os CTAs principais devem apontar para rotas canônicas (/login e /login?mode=register)', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');

    // 1. Hero Primary CTA
    const heroCta = page.locator('#hero a:has-text("Criar conta gratuita")');
    await expect(heroCta).toHaveAttribute('href', '/login?mode=register');

    // 2. Pricing Free CTA
    const freeCta = page.locator('#pricing a:has-text("Começar gratuitamente")');
    await expect(freeCta).toHaveAttribute('href', '/login?mode=register');

    // 3. Pricing Pro CTA
    const proCta = page.locator('#pricing a:has-text("Desbloquear FinControl Pro")');
    await expect(proCta).toHaveAttribute('href', '/login?mode=register');

    // 4. Final CTA
    const finalCta = page.locator('#final-cta a:has-text("Criar Conta Gratuita")');
    await expect(finalCta).toHaveAttribute('href', '/login?mode=register');

    // 5. Header Login
    const headerLogin = page.locator('header a:has-text("Entrar")').first();
    await expect(headerLogin).toHaveAttribute('href', '/login');
  });

  test('não deve conter estilos inline com cores hex fixas residuais na Landing', async ({ page }) => {
    await page.goto('/');

    const inlineHexColors = await page.evaluate(() => {
      const allElements = document.querySelectorAll('main *, header *, footer *');
      const hexPattern = /#[0-9a-fA-F]{3,8}/;
      const offenders = [];
      allElements.forEach(el => {
        const style = el.getAttribute('style') || '';
        // Ignora radial-gradient dinâmico com rgba gerado pelo sheen de movimento se houver
        if (hexPattern.test(style) && !style.includes('var(')) {
          offenders.push({ tag: el.tagName, style, text: el.textContent?.slice(0, 30) });
        }
      });
      return offenders;
    });

    expect(inlineHexColors).toHaveLength(0);
  });

  test('prefers-reduced-motion: reduce deve desativar animações contínuas e tracking do cursor', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');

    // Move mouse over hero
    await page.mouse.move(700, 450);
    await page.waitForTimeout(300);

    // Em reduced-motion, as ondas devem ter animação cancelada via CSS
    const waveLayer = page.locator('.fc-wave-layer-1').first();
    if (await waveLayer.count() > 0) {
      const animName = await waveLayer.evaluate((el) => window.getComputedStyle(el).animationName);
      expect(animName).toBe('none');
    }
  });

  test('Simulador de Divisão Exata: corrige bug do 11000, valida digitação, estado vazio e divisão de 5 pessoas', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');

    const sharedSection = page.locator('#shared-purchases');
    await expect(sharedSection).toBeVisible();
    await sharedSection.scrollIntoViewIfNeeded();

    const input = sharedSection.locator('input[type="text"]');
    await expect(input).toBeVisible();
    await expect(input).toHaveValue('1.000,00');

    // Estado inicial: 3 pessoas, total 1.000,00 -> 333,34 / 333,33 / 333,33
    await expect(sharedSection.locator('text=R$ 333,34')).toBeVisible();
    await expect(sharedSection.locator('text=R$ 333,33').first()).toBeVisible();
    await expect(sharedSection.locator('text=R$ 1.000,00').first()).toBeVisible();
    await expect(sharedSection.locator('text=R$ 0,00').first()).toBeVisible();

    // 1. Testa reprodução do bug antigo: apagar tudo e digitar 1000 não pode virar 11000
    await input.click();
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Backspace');
    await input.pressSequentially('1000', { delay: 50 });
    await page.locator('body').click(); // dispara onBlur

    // Verifica que formatou para 1.000,00 e não 11.000,00
    await expect(input).toHaveValue('1.000,00');

    // Clica no botão de 2 pessoas
    const btn2 = sharedSection.getByRole('button', { name: '2 pessoas' });
    await btn2.click();
    await expect(btn2).toHaveAttribute('aria-pressed', 'true');
    // 2 pessoas com 1.000,00 -> cada uma R$ 500,00
    await expect(sharedSection.locator('text=R$ 500,00').first()).toBeVisible();
    await expect(sharedSection.locator('text=R$ 1.000,00').first()).toBeVisible();
    await expect(sharedSection.locator('text=R$ 0,00').first()).toBeVisible();

    // 2. Testa estado vazio: apagar tudo
    await input.click();
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Backspace');
    await page.locator('body').click(); // dispara onBlur

    // Cards exibem "Informe um valor" e auditoria exibe "—"
    await expect(sharedSection.locator('text=Informe um valor').first()).toBeVisible();
    await expect(sharedSection.locator('text=—').first()).toBeVisible();

    // 3. Testa valor com centavos e 5 pessoas: 1.234,56
    await input.click();
    await input.pressSequentially('1234,56', { delay: 50 });
    await page.locator('body').click(); // dispara onBlur
    await expect(input).toHaveValue('1.234,56');

    const btn5 = sharedSection.getByRole('button', { name: '5 pessoas' });
    await btn5.click();
    await expect(btn5).toHaveAttribute('aria-pressed', 'true');

    // 1234,56 / 5 = 246,91 com resto de 1 centavo: primeiro recebe 246,92 e demais 246,91
    await expect(sharedSection.locator('text=R$ 246,92')).toBeVisible();
    await expect(sharedSection.locator('text=R$ 246,91').first()).toBeVisible();
    await expect(sharedSection.locator('text=R$ 1.234,56').first()).toBeVisible();
    await expect(sharedSection.locator('text=R$ 0,00').first()).toBeVisible();
  });

  test('Performance e Motion: FinControlMark sempre animada não gera Long Tasks nem CLS em repouso', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');

    // Verifica que as ondas possuem classes de animação contínua ativas no header e no footer
    const headerMark = page.locator('header svg.fc-mark');
    await expect(headerMark).toBeVisible();
    const animatedWaveHeader = headerMark.locator('.fc-mark-wave-anim-1');
    await expect(animatedWaveHeader).toHaveCount(1);

    const footerMark = page.locator('footer svg.fc-mark');
    await expect(footerMark).toBeVisible();
    const animatedWaveFooter = footerMark.locator('.fc-mark-wave-anim-1');
    await expect(animatedWaveFooter).toHaveCount(1);

    // Aguarda hidratação inicial e estabilização de entrada
    await page.waitForTimeout(6500);

    // Instala observer para medir estritamente o período de repouso (3 segundos)
    await page.evaluate(() => {
      window.__restLongTasks = [];
      window.__restClsScore = 0;

      try {
        const restObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            window.__restLongTasks.push({
              duration: entry.duration,
              startTime: entry.startTime,
            });
          }
        });
        restObserver.observe({ entryTypes: ['longtask'] });
      } catch (e) {
        // longtask
      }

      try {
        const restClsObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!entry.hadRecentInput) {
              window.__restClsScore += entry.value;
            }
          }
        });
        restClsObserver.observe({ type: 'layout-shift', buffered: false });
      } catch (e) {
        // layout-shift
      }
    });

    await page.waitForTimeout(3000);

    const perfMetrics = await page.evaluate(() => {
      return {
        longTasksCount: window.__restLongTasks?.length || 0,
        clsScore: window.__restClsScore || 0,
      };
    });

    // Em repouso não há Long Tasks nem CLS provocados pela animação GPU das ondas
    expect(perfMetrics.longTasksCount).toBe(0);
    expect(perfMetrics.clsScore).toBe(0);
  });
});
