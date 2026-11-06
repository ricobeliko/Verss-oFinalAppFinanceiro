/* global process */
// e2e/capture-landing-fase6-screenshots.spec.js
import { test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const outDir = path.resolve('screenshots');

test.describe('Captura Oficial de Provas Visuais — Fase 6.2 (Somente em screenshots/)', () => {
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
      test(`Captura Timeline e Simulador ${vp.name} - ${th}`, async ({ page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.goto('/');
        await page.waitForTimeout(600);

        // Alterna tema se necessário
        const currentTheme = await page.locator('html').getAttribute('data-theme');
        if (currentTheme !== th) {
          const toggleBtn = page.locator('header button[aria-label*="Alternar"]:visible').first();
          await toggleBtn.click();
          await page.waitForTimeout(600);
        }

        // 1. Timeline de Faturas Coerente & Princípio R$ 0,01
        const timeline = page.locator('#invoices-timeline');
        await timeline.scrollIntoViewIfNeeded();
        await page.waitForTimeout(400);
        await timeline.screenshot({ path: path.join(outDir, `${vp.name}-${th}-timeline-coerente.png`) });

        // 2. Simulador Fiel ao App - Estado Padrão (Meio a meio 1.000,01 e 3x)
        const shared = page.locator('#shared-purchases');
        await shared.scrollIntoViewIfNeeded();
        const totalInput = shared.locator('input[type="text"]').first();

        await totalInput.click();
        await page.keyboard.press('Control+A');
        await page.keyboard.press('Backspace');
        await totalInput.pressSequentially('1000,01', { delay: 30 });
        await page.locator('body').click();

        const btn3x = shared.getByRole('button', { name: '3 parcelas' });
        await btn3x.click();
        await page.waitForTimeout(300);
        await shared.screenshot({ path: path.join(outDir, `${vp.name}-${th}-sim-half-1000-01-3x.png`) });

        // 3. Simulador - Valor Personalizado da Pessoa 1
        const btnCustom = shared.getByRole('button', { name: 'Definir Pessoa 1' });
        await btnCustom.click();
        await page.waitForTimeout(300);

        const p1Input = shared.locator('input[type="text"]').nth(1);
        if (await p1Input.isVisible()) {
          await p1Input.click();
          await page.keyboard.press('Control+A');
          await page.keyboard.press('Backspace');
          await p1Input.pressSequentially('400,00', { delay: 30 });
          await page.locator('body').click();
          await page.waitForTimeout(300);
          await shared.screenshot({ path: path.join(outDir, `${vp.name}-${th}-sim-custom-p1.png`) });
        }

        // 4. Simulador - Erro quando Pessoa 1 > total
        if (await p1Input.isVisible()) {
          await p1Input.click();
          await page.keyboard.press('Control+A');
          await page.keyboard.press('Backspace');
          await p1Input.pressSequentially('1200,00', { delay: 30 });
          await page.locator('body').click();
          await page.waitForTimeout(300);
          await shared.screenshot({ path: path.join(outDir, `${vp.name}-${th}-sim-error-p1-gt-total.png`) });
        }

        // 5. Simulador - Campo vazio
        await totalInput.click();
        await page.keyboard.press('Control+A');
        await page.keyboard.press('Backspace');
        await page.locator('body').click();
        await page.waitForTimeout(300);
        await shared.screenshot({ path: path.join(outDir, `${vp.name}-${th}-sim-empty.png`) });
      });
    }
  }
});
