/* global process */
// e2e/capture-landing-fase6-screenshots.spec.js
import { test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const outDir = path.resolve('public', 'screenshots-fase-6-1');

test.describe('Captura Oficial de Provas Visuais — Fase 6.1', () => {
  test.beforeEach(() => {
    test.setTimeout(60000);
    test.skip(
      process.env.CAPTURE_SCREENSHOTS !== '1',
      'Execução opt-in com CAPTURE_SCREENSHOTS=1'
    );
  });

  test.beforeAll(() => {
    fs.mkdirSync(outDir, { recursive: true });
  });

  const viewports = [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'mobile', width: 390, height: 844 },
  ];

  const themes = ['dark', 'light'];

  for (const vp of viewports) {
    for (const th of themes) {
      test(`Captura Landing ${vp.name} - ${th}`, async ({ page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.goto('/');
        await page.waitForTimeout(600);

        // Alterna tema se necessário usando o botão visível
        const currentTheme = await page.locator('html').getAttribute('data-theme');
        if (currentTheme !== th) {
          const toggleBtn = page.locator('header button[aria-label*="Alternar"]:visible').first();
          await toggleBtn.click();
          await page.waitForTimeout(600);
        }

        // 1. Header com logo animada
        const header = page.locator('header');
        await header.screenshot({ path: path.join(outDir, `${vp.name}-${th}-header.png`) });

        // 2. Living Ledger
        const hero = page.locator('#hero');
        await hero.screenshot({ path: path.join(outDir, `${vp.name}-${th}-living-ledger.png`) });

        // 3. Financial Control - Faturas
        const finControl = page.locator('section:has-text("Visão Panorâmica")');
        await finControl.scrollIntoViewIfNeeded();
        await finControl.getByRole('button', { name: 'Faturas por Cartão' }).click();
        await page.waitForTimeout(300);
        await finControl.screenshot({ path: path.join(outDir, `${vp.name}-${th}-fincontrol-invoices.png`) });

        // 4. Financial Control - Parcelamentos
        await finControl.getByRole('button', { name: 'Parcelamentos' }).click();
        await page.waitForTimeout(300);
        await finControl.screenshot({ path: path.join(outDir, `${vp.name}-${th}-fincontrol-installments.png`) });

        // 5. Financial Control - Assinaturas
        await finControl.getByRole('button', { name: 'Assinaturas' }).click();
        await page.waitForTimeout(300);
        await finControl.screenshot({ path: path.join(outDir, `${vp.name}-${th}-fincontrol-subscriptions.png`) });

        // 6. Timeline de Faturas & Princípio R$ 0,01
        const timeline = page.locator('#invoices-timeline');
        await timeline.scrollIntoViewIfNeeded();
        await page.waitForTimeout(300);
        await timeline.screenshot({ path: path.join(outDir, `${vp.name}-${th}-timeline.png`) });
      });
    }
  }

  test('Captura Estados Específicos do Simulador de Divisão', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');

    const shared = page.locator('#shared-purchases');
    await shared.scrollIntoViewIfNeeded();
    const input = shared.locator('input[type="text"]');

    // Estado A: 3 pessoas, 1.000,00
    await shared.screenshot({ path: path.join(outDir, 'sim-3p-1000.png') });

    // Estado B: 2 pessoas, 1.000,00
    await shared.getByRole('button', { name: '2 pessoas' }).click();
    await page.waitForTimeout(300);
    await shared.screenshot({ path: path.join(outDir, 'sim-2p-1000.png') });

    // Estado C: Valor vazio
    await input.click();
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Backspace');
    await page.locator('body').click();
    await page.waitForTimeout(300);
    await shared.screenshot({ path: path.join(outDir, 'sim-empty.png') });

    // Estado D: 5 pessoas, 1.234,56
    await input.click();
    await input.pressSequentially('1234,56', { delay: 40 });
    await page.locator('body').click();
    await shared.getByRole('button', { name: '5 pessoas' }).click();
    await page.waitForTimeout(300);
    await shared.screenshot({ path: path.join(outDir, 'sim-5p-1234-56.png') });
  });
});
