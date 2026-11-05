import { getDemoData } from './fixtures/demoData.js';
/* global process */
// e2e/capture-screenshots.spec.js
/**
 * Execução opt-in para capturas visuais da aplicação FinControl.
 * Por padrão, estes testes são ignorados durante a execução normal do test runner E2E.
 * 
 * Como executar:
 * - Windows PowerShell:
 *   $env:CAPTURE_SCREENSHOTS="1"; npm run test:e2e -- e2e/capture-screenshots.spec.js; Remove-Item Env:\CAPTURE_SCREENSHOTS
 * - Linux / macOS:
 *   CAPTURE_SCREENSHOTS=1 npm run test:e2e -- e2e/capture-screenshots.spec.js
 */
import { test, expect } from '@playwright/test';

test.describe('Captura de Screenshots Visuais (Opt-in)', () => {

  test.beforeEach(() => {
    test.skip(
      process.env.CAPTURE_SCREENSHOTS !== '1',
      'Screenshots desativados por padrão para velocidade do pipeline. Execute com CAPTURE_SCREENSHOTS=1 para gerar imagens.'
    );
  });

  const setupMockSession = async (page, { theme = 'dark' } = {}) => {
    await page.addInitScript(({ initialTheme }) => {
      localStorage.setItem('theme', initialTheme);
      window.__FINCONTROL_E2E_USER__ = {
        uid: 'e2e-theme-tester',
        email: 'theme@fincontrol.local',
        name: 'Ana Silva',
        plan: 'pro',
        trialExpiresAt: null,
        budgets: {},
        notificationSettings: { cardDueEnabled: true, cardDueDays: 3 },
        aiPreferences: { optIn: false },
      };
      window.__FINCONTROL_E2E_MOCK_DATA__ = {
        cards: [
          { id: 'card-1', name: 'Nubank Ultravioleta', limit: 8000, color: '#5CCCCC', closingDay: 10, dueDay: 17 },
          { id: 'card-2', name: 'Itaú Black', limit: 15000, color: '#047C84', closingDay: 5, dueDay: 12 },
        ],
        clients: [
          { id: 'client-1', name: 'Ana Silva', phone: '11988887777' },
          { id: 'client-2', name: 'Carlos Eduardo', phone: '11977776666' },
        ],
        loans: [
          {
            id: 'loan-1',
            description: 'Notebook Dell XPS',
            cardId: 'card-1',
            clientId: 'client-1',
            totalAmount: 6000,
            installmentsCount: 10,
            installmentValue: 600,
            currentInstallment: 3,
            startDate: '2026-07-10',
            isMyDebt: true,
            category: 'Tecnologia',
          },
        ],
        expenses: [
          {
            id: 'exp-1',
            description: 'Supermercado Mensal',
            cardId: 'card-1',
            value: 450,
            date: new Date(),
            category: 'Alimentação',
          },
        ],
        subscriptions: [
          {
            id: 'sub-1',
            name: 'Netflix 4K',
            amount: 55.90,
            value: 55.90,
            dueDate: '15',
            cardId: 'card-1',
            status: 'Ativa',
            category: 'Lazer',
          },
        ],
        incomes: [
          {
            id: 'inc-1',
            description: 'Salário',
            value: 8500,
            date: new Date(),
            clientId: 'client-1',
          },
        ],
      };
    }, { initialTheme: theme });
  };

  test('01. Clean localStorage load: abre em Dark Mode sem piscar', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    const htmlTheme = await page.locator('html').getAttribute('data-theme');
    expect(htmlTheme).toBe('dark');
    await page.screenshot({ path: 'screenshots/initial-load-clean-localstorage-dark.png', fullPage: true });
  });

  test('02. Desktop (1440x900): Resumo, Cartões e Transações (Dark e Light)', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    // --- Dark Mode ---
    await setupMockSession(page, { theme: 'dark' });
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(400);
    await page.screenshot({ path: 'screenshots/fase2-desktop-resumo-dark.png' });

    await page.getByRole('button', { name: 'Cartões' }).first().click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'screenshots/fase2-desktop-cartoes-dark.png' });

    await page.getByRole('button', { name: 'Movimentações' }).first().click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'screenshots/fase2-desktop-transacoes-dark.png' });

    // --- Light Mode ---
    await page.getByRole('button', { name: /Alternar tema/i }).click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: 'screenshots/fase2-desktop-transacoes-light.png' });

    await page.getByRole('button', { name: 'Cartões' }).first().click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'screenshots/fase2-desktop-cartoes-light.png' });

    await page.getByRole('button', { name: 'Resumo' }).first().click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'screenshots/fase2-desktop-resumo-light.png' });
  });

  test('03. Mobile (390x844): Resumo, Cartões e Transações (Dark e Light)', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    // --- Dark Mode ---
    await setupMockSession(page, { theme: 'dark' });
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(400);
    await page.screenshot({ path: 'screenshots/fase2-mobile-resumo-dark.png' });

    // Mobile nav trigger
    await page.getByRole('button', { name: 'Abrir menu de navegação' }).click();
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: 'Cartões' }).last().click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'screenshots/fase2-mobile-cartoes-dark.png' });

    await page.getByRole('button', { name: 'Abrir menu de navegação' }).click();
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: 'Movimentações' }).last().click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'screenshots/fase2-mobile-transacoes-dark.png' });

    // Alternar tema direto na Topbar mobile
    await page.getByRole('button', { name: /Alternar tema/i }).first().click();
    await page.waitForTimeout(400);

    // Light screenshots in mobile
    await page.screenshot({ path: 'screenshots/fase2-mobile-transacoes-light.png' });

    await page.getByRole('button', { name: 'Abrir menu de navegação' }).click();
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: 'Cartões' }).last().click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'screenshots/fase2-mobile-cartoes-light.png' });

    await page.getByRole('button', { name: 'Abrir menu de navegação' }).click();
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: 'Resumo' }).last().click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'screenshots/fase2-mobile-resumo-light.png' });
  });

  test('04. Fase 4 Dados Vivos: Contadores e Gráficos (~0.3s e ~1.5s Dark/Light + Lab)', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    // 1. Dashboard Dark aos ~300ms (contadores em contagem)
    await setupMockSession(page, { theme: 'dark' });
    await page.goto('/dashboard');
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'screenshots/fase4-dashboard-dark-300ms.png' });

    // 2. Dashboard Dark aos ~1.5s (contadores convergidos e gráficos desenhados)
    await page.waitForTimeout(1200);
    await page.screenshot({ path: 'screenshots/fase4-dashboard-dark-1500ms.png' });

    // 3. Dashboard Light aos ~1.5s
    await page.getByRole('button', { name: /Alternar tema/i }).click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'screenshots/fase4-dashboard-light-1500ms.png' });

    // 4. Laboratório Seção I (AnimatedCurrency)
    await page.goto('/design-system');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(600);
    await page.screenshot({ path: 'screenshots/fase4-design-system-lab-section-i.png', fullPage: true });
  });

  test('05. Fase 5 Troca de Tema: Revelação Circular Dark -> Light e Light -> Dark (~100ms, ~300ms, ~700ms)', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await setupMockSession(page, { theme: 'dark' });
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    const themeToggleBtn = page.getByRole('button', { name: /Alternar tema/i }).first();

    // --- DARK -> LIGHT ---
    await themeToggleBtn.click();
    await page.waitForTimeout(100);
    await page.screenshot({ path: 'screenshots/fase5-theme-dark-to-light-100ms.png' });

    await page.waitForTimeout(200); // total ~300ms
    await page.screenshot({ path: 'screenshots/fase5-theme-dark-to-light-300ms.png' });

    await page.waitForTimeout(400); // total ~700ms
    await page.screenshot({ path: 'screenshots/fase5-theme-dark-to-light-700ms.png' });

    // Aguarda término da transição e estabilização
    await page.waitForTimeout(500);

    // --- LIGHT -> DARK ---
    await themeToggleBtn.click();
    await page.waitForTimeout(100);
    await page.screenshot({ path: 'screenshots/fase5-theme-light-to-dark-100ms.png' });

    await page.waitForTimeout(200); // total ~300ms
    await page.screenshot({ path: 'screenshots/fase5-theme-light-to-dark-300ms.png' });

    await page.waitForTimeout(400); // total ~700ms
    await page.screenshot({ path: 'screenshots/fase5-theme-light-to-dark-700ms.png' });
  });

  test('06. Ajuste Fino 2 Transição de Telas (~150ms, ~450ms, ~700ms, ~1100ms, ~1400ms Dark e Light)', async ({ page }) => {
    test.setTimeout(45000);
    await page.setViewportSize({ width: 1440, height: 900 });

    // --- DARK MODE: Resumo -> Cartões ---
    await setupMockSession(page, { theme: 'dark' });
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    const cardsBtn = page.getByRole('button', { name: 'Cartões' }).first();
    await cardsBtn.click();

    await page.waitForTimeout(150);
    await page.screenshot({ path: 'screenshots/transicao2-dark-150ms.png' });

    await page.waitForTimeout(300); // 150 + 300 = 450ms
    await page.screenshot({ path: 'screenshots/transicao2-dark-450ms.png' });

    await page.waitForTimeout(250); // 450 + 250 = 700ms
    await page.screenshot({ path: 'screenshots/transicao2-dark-700ms.png' });

    await page.waitForTimeout(400); // 700 + 400 = 1100ms
    await page.screenshot({ path: 'screenshots/transicao2-dark-1100ms.png' });

    await page.waitForTimeout(300); // 1100 + 300 = 1400ms
    await page.screenshot({ path: 'screenshots/transicao2-dark-1400ms.png' });

    // Aguarda término completo antes do ciclo Light
    await page.waitForTimeout(500);

    // --- LIGHT MODE: Cartões -> Resumo ---
    // Alterna para tema claro
    await page.getByRole('button', { name: /Alternar tema/i }).first().click();
    await page.waitForTimeout(800);

    const resumoBtn = page.getByRole('button', { name: 'Resumo' }).first();
    await resumoBtn.click();

    await page.waitForTimeout(150);
    await page.screenshot({ path: 'screenshots/transicao2-light-150ms.png' });

    await page.waitForTimeout(300); // 450ms
    await page.screenshot({ path: 'screenshots/transicao2-light-450ms.png' });

    await page.waitForTimeout(250); // 700ms
    await page.screenshot({ path: 'screenshots/transicao2-light-700ms.png' });

    await page.waitForTimeout(400); // 1100ms
    await page.screenshot({ path: 'screenshots/transicao2-light-1100ms.png' });

    await page.waitForTimeout(300); // 1400ms
    await page.screenshot({ path: 'screenshots/transicao2-light-1400ms.png' });
  });

  test('07. Fase 4B.1 KPIs Vivos e Evolução Mensal (Desktop e Mobile, Dark e Light, 6m e 12m, Filtro de Cartão)', async ({ page }) => {
    test.setTimeout(60000);
    const demoData = getDemoData('2026-11');

    const setupSession = async (th, vp) => {
      await page.setViewportSize(vp);
      await page.addInitScript(({ th, d }) => {
        localStorage.setItem('theme', th);
        const user = {
          uid: 'e2e-screenshot-user',
          email: 'demo@fincontrol.app',
          displayName: 'Mariana Silva',
          name: 'Mariana Silva',
          plan: 'pro'
        };
        window.__FINCONTROL_E2E_USER__ = user;
        window.__FINCONTROL_E2E_MOCK_DATA__ = d;
        sessionStorage.setItem('fincontrol_e2e_user', JSON.stringify(user));
        sessionStorage.setItem('fincontrol_e2e_plan', 'pro');
        sessionStorage.setItem('fincontrol_e2e_data', JSON.stringify(d));
      }, { th, d: demoData });
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1400);
      await page.evaluate((th) => {
        document.documentElement.setAttribute('data-theme', th);
        if (th === 'dark') document.documentElement.classList.add('dark');
        else document.documentElement.classList.remove('dark');
      }, th);
      await page.waitForTimeout(400);
    };

    // --- DESKTOP (1440x900) DARK ---
    await setupSession('dark', { width: 1440, height: 900 });
    await page.screenshot({ path: 'screenshots/desktop-dark-6m.png', fullPage: true });

    // Alterna para 12m
    const btn12mDark = page.locator('.fc-monthly-evolution-chart [role="radiogroup"]').nth(1).locator('[role="radio"]:has-text("12 meses")');
    if (await btn12mDark.isVisible()) {
      await btn12mDark.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: 'screenshots/desktop-dark-12m.png', fullPage: true });
    }

    // Aplica filtro de cartão (Nubank)
    const cardSelect = page.locator('select').first();
    if (await cardSelect.isVisible()) {
      await cardSelect.selectOption({ label: 'Nubank Ultravioleta' });
      await page.waitForTimeout(500);
      await page.screenshot({ path: 'screenshots/desktop-dark-card-filter.png', fullPage: true });
    }

    // --- DESKTOP (1440x900) LIGHT ---
    await setupSession('light', { width: 1440, height: 900 });
    await page.screenshot({ path: 'screenshots/desktop-light-6m.png', fullPage: true });

    const btn12mLight = page.locator('.fc-monthly-evolution-chart [role="radiogroup"]').nth(1).locator('[role="radio"]:has-text("12 meses")');
    if (await btn12mLight.isVisible()) {
      await btn12mLight.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: 'screenshots/desktop-light-12m.png', fullPage: true });
    }

    const cardSelectLight = page.locator('select').first();
    if (await cardSelectLight.isVisible()) {
      await cardSelectLight.selectOption({ label: 'Nubank Ultravioleta' });
      await page.waitForTimeout(500);
      await page.screenshot({ path: 'screenshots/desktop-light-card-filter.png', fullPage: true });
    }

    // --- MOBILE (390x844) DARK & LIGHT ---
    await setupSession('dark', { width: 390, height: 844 });
    await page.screenshot({ path: 'screenshots/mobile-dark-6m.png', fullPage: true });

    await setupSession('light', { width: 390, height: 844 });
    await page.screenshot({ path: 'screenshots/mobile-light-6m.png', fullPage: true });
   });
  test('08. Fase Ícone — Contact sheet dos ícones (16/32/48/180/512) e marca no login e sidebar', async ({ page }) => {
    test.setTimeout(60000);

    // 1. Contact sheet comparativo de todos os ícones estáticos em superfícies escura e clara
    await page.setViewportSize({ width: 1200, height: 800 });
    const fs = await import('node:fs');
    const path = await import('node:path');
    const toB64 = (filename) => {
      const b = fs.readFileSync(path.resolve('public', filename));
      return `data:image/png;base64,${b.toString('base64')}`;
    };
    const b16 = toB64('favicon-16.png');
    const b32 = toB64('favicon-32.png');
    const b48 = toB64('favicon-48.png');
    const b180 = toB64('apple-touch-icon.png');
    const b192 = toB64('icon-192.png');
    const b512 = toB64('icon-512.png');
    const bMaskable = toB64('icon-maskable-512.png');

    const contactSheetHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Contact Sheet — Ícones FinControl</title>
  <style>
    body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #020B0F; color: #EAF7F7; padding: 40px; }
    h1 { font-size: 24px; margin-bottom: 24px; color: #5CCCCC; }
    .surface { padding: 30px; border-radius: 16px; margin-bottom: 30px; }
    .surface.dark { background: #04171F; border: 1px solid rgba(140, 220, 225, 0.15); }
    .surface.light { background: #E6F4F7; color: #0B2530; border: 1px solid rgba(8, 60, 72, 0.15); }
    .grid { display: flex; align-items: flex-end; gap: 32px; flex-wrap: wrap; }
    .item { text-align: center; }
    .item span { display: block; margin-top: 10px; font-size: 12px; opacity: 0.8; }
    img { display: inline-block; vertical-align: bottom; image-rendering: auto; }
    .pixelated { image-rendering: pixelated; }
  </style>
</head>
<body>
  <h1>FinControl — Contact Sheet de Favicons e Ícones de Aplicação</h1>

  <div class="surface dark">
    <h3>Superfície Escura (#04171F - Abyss Teal)</h3>
    <div class="grid">
      <div class="item"><img src="${b16}" width="16" height="16"><span>16x16</span></div>
      <div class="item"><img src="${b32}" width="32" height="32"><span>32x32</span></div>
      <div class="item"><img src="${b48}" width="48" height="48"><span>48x48</span></div>
      <div class="item"><img src="${b180}" width="90" height="90"><span>180x180 (Apple)</span></div>
      <div class="item"><img src="${b192}" width="96" height="96"><span>192x192 (PWA)</span></div>
      <div class="item"><img src="${b512}" width="128" height="128"><span>512x512 (PWA)</span></div>
      <div class="item"><img src="${bMaskable}" width="128" height="128"><span>Maskable 512</span></div>
    </div>
  </div>

  <div class="surface light">
    <h3>Superfície Clara (#E6F4F7 - Crisp Teal)</h3>
    <div class="grid">
      <div class="item"><img src="${b16}" width="16" height="16"><span>16x16</span></div>
      <div class="item"><img src="${b32}" width="32" height="32"><span>32x32</span></div>
      <div class="item"><img src="${b48}" width="48" height="48"><span>48x48</span></div>
      <div class="item"><img src="${b180}" width="90" height="90"><span>180x180 (Apple)</span></div>
      <div class="item"><img src="${b192}" width="96" height="96"><span>192x192 (PWA)</span></div>
      <div class="item"><img src="${b512}" width="128" height="128"><span>512x512 (PWA)</span></div>
      <div class="item"><img src="${bMaskable}" width="128" height="128"><span>Maskable 512</span></div>
    </div>
  </div>
</body>
</html>`;
    await page.setContent(contactSheetHtml);
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'screenshots/contact-sheet-icons.png', fullPage: true });

    // 2. Tela de login em Dark e Light Mode
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(600);
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'dark');
      document.documentElement.classList.add('dark');
    });
    await page.screenshot({ path: 'screenshots/brand-login-dark.png', fullPage: true });

    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'light');
      document.documentElement.classList.remove('dark');
    });
    await page.waitForTimeout(400);
    await page.screenshot({ path: 'screenshots/brand-login-light.png', fullPage: true });

    // 3. Marca na Sidebar (Dark e Light)
    const demoData = getDemoData('2026-11');
    const setupDashboard = async (theme) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.addInitScript(({ th, d }) => {
        localStorage.setItem('theme', th);
        const user = { uid: 'u-brand', email: 'user@fincontrol.app', plan: 'pro' };
        window.__FINCONTROL_E2E_USER__ = user;
        window.__FINCONTROL_E2E_MOCK_DATA__ = d;
        sessionStorage.setItem('fincontrol_e2e_user', JSON.stringify(user));
        sessionStorage.setItem('fincontrol_e2e_plan', 'pro');
        sessionStorage.setItem('fincontrol_e2e_data', JSON.stringify(d));
      }, { th: theme, d: demoData });
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
      await page.evaluate((th) => {
        document.documentElement.setAttribute('data-theme', th);
        if (th === 'dark') document.documentElement.classList.add('dark');
        else document.documentElement.classList.remove('dark');
      }, theme);
      await page.waitForTimeout(300);
    };

    await setupDashboard('dark');
    const sidebarDark = page.locator('aside');
    await sidebarDark.screenshot({ path: 'screenshots/brand-sidebar-dark.png' });

    await setupDashboard('light');
    const sidebarLight = page.locator('aside');
    await sidebarLight.screenshot({ path: 'screenshots/brand-sidebar-light.png' });
  });
});
