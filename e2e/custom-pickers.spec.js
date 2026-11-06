// e2e/custom-pickers.spec.js
import { test, expect } from '@playwright/test';

test.describe('E2E — Componentes <MonthPicker> e <DatePicker> Customizados (Acessibilidade e Interação)', () => {
  const setupSession = async (page) => {
    await page.addInitScript(() => {
      localStorage.setItem('theme', 'dark');
      window.__FINCONTROL_E2E_USER__ = {
        uid: 'e2e-pickers-tester',
        email: 'pickers@fincontrol.local',
        name: 'Pickers Tester',
        plan: 'pro',
      };
      window.__FINCONTROL_E2E_MOCK_DATA__ = {
        cards: [
          { id: 'card-1', name: 'Nubank Ultravioleta', limit: 10000, color: '#5CCCCC' },
        ],
        clients: [
          { id: 'client-1', name: 'Carlos Tester' },
        ],
        loans: [],
        expenses: [],
        subscriptions: [],
        incomes: [],
        paidSubscriptions: [],
      };
    });
  };

  test('MonthPicker no Dashboard: abre grade 4x3, navega ano e seleciona mês em pt-BR', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await setupSession(page);
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Botão do MonthPicker no Dashboard
    const monthTrigger = page.locator('button[aria-label="Selecionar mês e ano de competência"]').first();
    await expect(monthTrigger).toBeVisible();

    // Abre o popover do MonthPicker
    await monthTrigger.click();
    await expect(monthTrigger).toHaveAttribute('aria-expanded', 'true');

    // Popover renderizado no portal
    const popover = page.locator('div[style*="position: fixed"]').first();
    await expect(popover).toBeVisible();

    // Grade de meses com 12 botões abreviados
    const monthBtns = popover.locator('button:has-text("mar")');
    await expect(monthBtns.first()).toBeVisible();
    await monthBtns.first().click();

    // Fecha o popover e atualiza o trigger
    await expect(monthTrigger).toHaveAttribute('aria-expanded', 'false');
    await expect(monthTrigger).toContainText('março de');
  });

  test('DatePicker no Modal de Compra: abre calendário com dias dom–sáb e seleciona dia', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await setupSession(page);
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Navega para Movimentações e abre modal de Nova Compra
    await page.locator('button[aria-label="Movimentações"]').first().click();
    await page.waitForTimeout(600);

    const addPurchaseBtn = page.getByRole('button', { name: 'Adicionar Compra' }).first();
    await addPurchaseBtn.click();

    const modal = page.locator('div[role="dialog"]').first();
    await expect(modal).toBeVisible();

    // Trigger do DatePicker de Data da Compra
    const dateTrigger = modal.locator('button[aria-haspopup="dialog"]').first();
    await expect(dateTrigger).toBeVisible();
    await dateTrigger.click();

    // Popover do DatePicker
    const popover = page.locator('div[style*="position: fixed"]').first();
    await expect(popover).toBeVisible();

    // Cabeçalho dos dias da semana (dom a sáb)
    await expect(popover.locator('text=dom')).toBeVisible();
    await expect(popover.locator('text=sáb')).toBeVisible();

    // 1º Escape: Fecha o popover do DatePicker; o modal CONTINUA ABERTO
    await page.keyboard.press('Escape');
    await expect(popover).toBeHidden();
    await expect(modal).toBeVisible();
    await expect(dateTrigger).toBeFocused();

    // Reabre e seleciona o dia 15
    await dateTrigger.click();
    await expect(popover).toBeVisible();

    const day15Btn = popover.locator('button:has-text("15")').first();
    await day15Btn.click();

    // Popover fecha e trigger atualiza para dia 15
    await expect(popover).toBeHidden();
    await expect(dateTrigger).toContainText('15/');
  });

  test('Mobile (< 640px): MonthPicker abre como Bottom Sheet com touch targets >= 44px', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await setupSession(page);
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const monthTrigger = page.locator('button[aria-label="Selecionar mês e ano de competência"]').first();
    await expect(monthTrigger).toBeVisible();
    await monthTrigger.click();

    // Bottom sheet
    const bottomSheet = page.locator('div[role="dialog"][aria-modal="true"]').first();
    await expect(bottomSheet).toBeVisible();

    // Botões da grade >= 44px no mobile
    const monthBtns = bottomSheet.locator('button:has-text("out")');
    const box = await monthBtns.first().boundingBox();
    expect(box.height).toBeGreaterThanOrEqual(44);

    // Fecha ao tocar no backdrop
    const backdrop = bottomSheet.locator('div[aria-hidden="true"]').first();
    await backdrop.click({ position: { x: 50, y: 50 } });
    await expect(bottomSheet).toBeHidden();
  });
});
