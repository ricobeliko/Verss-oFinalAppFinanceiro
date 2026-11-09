// e2e/invoice-pagination-and-staging.spec.js
// Testes determinísticos do Bloco C (Fase 11):
// 1. Paginação da Fatura (INVOICE_BATCH_SIZE = 50, >= 130 itens)
// 2. Confirmação do "Marcar Tudo Como Pago" com contagem global
// 3. Montagem em Duas Etapas e Gate Pro

import { test, expect } from '@playwright/test';
import { getInvoice130Fixture } from './fixtures/invoice130Fixture.js';

async function setupLargeInvoiceSession(page, plan = 'pro') {
  const fixture = getInvoice130Fixture('2026-11');
  await page.addInitScript(({ fixtureData, userPlan }) => {
    localStorage.setItem('theme', 'dark');
    const user = {
      uid: 'test-user-130',
      email: 'test130@fincontrol.local',
      emailVerified: true,
      displayName: 'Tester Large Invoice',
      name: 'Tester Large Invoice',
      plan: userPlan,
      budgets: {},
      notificationSettings: {},
      aiPreferences: { optIn: false },
    };
    window.__FINCONTROL_E2E_USER__ = user;
    window.__FINCONTROL_E2E_MOCK_DATA__ = fixtureData;
    sessionStorage.setItem('fincontrol_e2e_user', JSON.stringify(user));
    sessionStorage.setItem('fincontrol_e2e_plan', userPlan);
    sessionStorage.setItem('fincontrol_e2e_data', JSON.stringify(fixtureData));
  }, { fixtureData: fixture, userPlan: plan });
}

test.describe('Bloco C: Paginação de Faturas Grandes (>= 130 Itens) e Lotes', () => {
  test.beforeEach(async ({ page }) => {
    await setupLargeInvoiceSession(page, 'pro');
    await page.goto('/dashboard');
    // Aguarda o Dashboard carregar com a tabela
    await expect(page.getByRole('heading', { name: 'Itens da Fatura', level: 3 })).toBeVisible({ timeout: 15000 });
  });

  test('renderiza inicialmente lote de 50 itens e expande via "Mostrar mais" e "Mostrar todos"', async ({ page }) => {
    const statusText = page.locator('span[role="status"]').filter({ hasText: /Exibindo/ });
    await expect(statusText).toBeVisible();
    await expect(statusText).toContainText('Exibindo 50 de');

    // Conta linhas da tabela desktop da fatura no tbody
    const invoiceTable = page.locator('table', { has: page.locator('th', { hasText: 'Nº Parcelas' }) });
    const rows = invoiceTable.locator('tbody tr');
    await expect(rows).toHaveCount(50);

    // Botão "Mostrar mais" expande para 100 itens
    const showMoreBtn = page.getByRole('button', { name: /Mostrar mais \d+ itens/i });
    await expect(showMoreBtn).toBeVisible();
    await showMoreBtn.click();

    await expect(statusText).toContainText('Exibindo 100 de');
    await expect(rows).toHaveCount(100);

    // Botão "Mostrar todos" expande para todos os itens
    const showAllBtn = page.getByRole('button', { name: /Mostrar todos/i });
    await expect(showAllBtn).toBeVisible();
    await showAllBtn.click();

    // Com todos renderizados, os controles de lote somem
    await expect(showMoreBtn).toHaveCount(0);
    const totalCount = await rows.count();
    expect(totalCount).toBeGreaterThanOrEqual(130);
  });

  test('lote reseta para 50 ao alterar filtro de cartão, pessoa ou ordenação', async ({ page }) => {
    const statusText = page.locator('span[role="status"]').filter({ hasText: /Exibindo/ });
    const showMoreBtn = page.getByRole('button', { name: /Mostrar mais \d+ itens/i });
    const invoiceTable = page.locator('table', { has: page.locator('th', { hasText: 'Nº Parcelas' }) });
    const rows = invoiceTable.locator('tbody tr');

    // Expande para 100 itens
    await showMoreBtn.click();
    await expect(statusText).toContainText('Exibindo 100 de');
    await expect(rows).toHaveCount(100);

    // Altera ordenação clicando na coluna "Valor"
    const valueHeader = invoiceTable.locator('thead th', { hasText: 'Valor' });
    await valueHeader.click();

    // Deve resetar o lote para 50
    await expect(statusText).toContainText('Exibindo 50 de');
    await expect(rows).toHaveCount(50);

    // Expande novamente para 100
    await showMoreBtn.click();
    await expect(statusText).toContainText('Exibindo 100 de');

    // Altera filtro de cartão
    const cardCombobox = page.getByRole('combobox', { name: 'Filtrar por cartão' });
    if (await cardCombobox.isVisible()) {
      await cardCombobox.click();
      const option = page.locator('[role="option"]').nth(1);
      await option.click();
      // Lote deve estar em <= 50
      const countAfterCard = await rows.count();
      expect(countAfterCard).toBeLessThanOrEqual(50);
    }
  });

  test('modo mobile com viewport estreita segue rigorosamente a mesma paginação em lote de 50', async ({ page }) => {
    // Altera para viewport mobile
    await page.setViewportSize({ width: 375, height: 667 });

    const mobileCards = page.locator('[data-testid="invoice-cards-mobile"] > div');
    await expect(mobileCards).toHaveCount(50);

    const showMoreBtn = page.getByRole('button', { name: /Mostrar mais \d+ itens/i });
    await expect(showMoreBtn).toBeVisible();
    await showMoreBtn.click();

    await expect(mobileCards).toHaveCount(100);
  });
});

test.describe('Bloco C: "Marcar Tudo Como Pago" e Contagem Global', () => {
  test('confirmação mostra contagem de TODOS os pendentes (não apenas os 50 visíveis)', async ({ page }) => {
    await setupLargeInvoiceSession(page, 'pro');
    await page.goto('/dashboard');

    await expect(page.getByRole('heading', { name: 'Itens da Fatura', level: 3 })).toBeVisible({ timeout: 15000 });

    // Botão "Marcar Tudo Como Pago"
    const markAllBtn = page.getByRole('button', { name: /Marcar Tudo Como Pago/i });
    await expect(markAllBtn).toBeVisible();
    await markAllBtn.click();

    // Modal de confirmação
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();

    // O texto deve mencionar a contagem global (>= 130 itens), não apenas 50
    const modalText = await modal.innerText();
    const match = modalText.match(/TODOS os (\d+) itens pendentes/i);
    expect(match).not.toBeNull();
    const count = parseInt(match[1], 10);
    expect(count).toBeGreaterThanOrEqual(130);

    // Cancela o modal para não alterar estado
    const cancelBtn = modal.getByRole('button', { name: /Cancelar/i });
    await cancelBtn.click();
    await expect(modal).not.toBeVisible();
  });
});

test.describe('Bloco C: Montagem em Duas Etapas e Gate Pro', () => {
  test('usuário Pro acessa os gráficos avançados e projeções', async ({ page }) => {
    await setupLargeInvoiceSession(page, 'pro');
    await page.goto('/dashboard');

    await expect(page.locator('main')).toBeVisible({ timeout: 15000 });

    // Projeções futuras montam sem bloqueio Pro para usuário Pro
    const projectionsHeading = page.getByRole('heading', { name: 'Projeção dos Próximos Meses' });
    await expect(projectionsHeading).toBeVisible({ timeout: 10000 });
  });

  test('usuário Free visualiza trava de Pro para gráficos e recursos premium', async ({ page }) => {
    await setupLargeInvoiceSession(page, 'free');
    await page.goto('/dashboard');

    await expect(page.locator('main')).toBeVisible({ timeout: 15000 });

    // Gráfico de Projeções futuras exibe lock para plano gratuito
    const proGateHeading = page.getByRole('heading', { name: 'Projeção de Faturas Futuras' });
    await expect(proGateHeading).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Bloco C: Medição de Cumulative Layout Shift (CLS) no Resumo', () => {
  async function setupClsTracking(page) {
    await page.addInitScript(() => {
      window.__FC_CLS__ = 0;
      try {
        new PerformanceObserver((entryList) => {
          for (const entry of entryList.getEntries()) {
            if (!entry.hadRecentInput) {
              window.__FC_CLS__ += entry.value;
            }
          }
        }).observe({ type: 'layout-shift', buffered: true });
      } catch (_e) {
        // noop
      }
    });
  }

  test('CLS em 1366x768 (Notebook) durante a carga do Resumo é < 0.05', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await setupClsTracking(page);
    await setupLargeInvoiceSession(page, 'pro');
    await page.goto('/dashboard');
    await page.waitForSelector('table', { timeout: 15000 });
    // Aguarda o frame ocioso e montagem da segunda etapa
    await page.waitForTimeout(600);

    const cls = await page.evaluate(() => Math.round((window.__FC_CLS__ || 0) * 10000) / 10000);
    console.log(`[CLS 1366x768 Carga Direta]: ${cls}`);
    expect(cls).toBeLessThan(0.05);
  });

  test('CLS em 1920x1080 (Full HD) durante a carga do Resumo é < 0.05', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await setupClsTracking(page);
    await setupLargeInvoiceSession(page, 'pro');
    await page.goto('/dashboard');
    await page.waitForSelector('table', { timeout: 15000 });
    // Aguarda o frame ocioso e montagem da segunda etapa
    await page.waitForTimeout(600);

    const cls = await page.evaluate(() => Math.round((window.__FC_CLS__ || 0) * 10000) / 10000);
    console.log(`[CLS 1920x1080 Carga Direta]: ${cls}`);
    expect(cls).toBeLessThan(0.05);
  });

  test('CLS durante troca de abas (Resumo -> Movimentações -> Resumo) é < 0.05', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await setupLargeInvoiceSession(page, 'pro');
    await page.goto('/dashboard');
    await page.waitForSelector('table', { timeout: 15000 });
    await page.waitForTimeout(600);

    await setupClsTracking(page);
    await page.evaluate(() => { window.__FC_CLS__ = 0; });

    // Alterna para Movimentações
    const navMov = page.getByRole('button', { name: /Movimentações/i });
    if (await navMov.isVisible()) {
      await navMov.click();
      await page.waitForTimeout(400);

      // Retorna para Resumo
      const navResumo = page.getByRole('button', { name: /Resumo/i });
      await navResumo.click();
      await page.waitForSelector('table', { timeout: 15000 });
      await page.waitForTimeout(600);

      const switchCls = await page.evaluate(() => Math.round((window.__FC_CLS__ || 0) * 10000) / 10000);
      console.log(`[CLS Troca de Abas]: ${switchCls}`);
      expect(switchCls).toBeLessThan(0.05);
    }
  });
});
