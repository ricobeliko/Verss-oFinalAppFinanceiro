/* global process */
// e2e/invoice-table-responsive.spec.js
import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { getTableHeavyData } from './fixtures/tableFixture.js';

const VIEWPORTS = [
  { width: 1920, height: 1080, name: '1920x1080' },
  { width: 1536, height: 864, name: '1536x864' },
  { width: 1366, height: 768, name: '1366x768' },
  { width: 1280, height: 800, name: '1280x800' },
  { width: 1024, height: 768, name: '1024x768' },
  { width: 768, height: 1024, name: '768x1024' },
  { width: 390, height: 844, name: '390x844' },
];

test.describe('Bloco A: Tabela Responsiva de Itens da Fatura', () => {
  test.beforeAll(() => {
    const dir = path.resolve(process.cwd(), 'screenshots/fase10-bloco-a');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  const setupHeavySession = async (page, theme = 'dark') => {
    const heavyData = getTableHeavyData('2026-11');
    await page.addInitScript(({ d, t }) => {
      localStorage.setItem('theme', t);
      const user = {
        uid: 'heavy-table-user',
        email: 'heavy@fincontrol.app',
        displayName: 'Mariana Vasconcelos',
        plan: 'pro',
      };
      window.__FINCONTROL_E2E_USER__ = user;
      window.__FINCONTROL_E2E_MOCK_DATA__ = d;
      sessionStorage.setItem('fincontrol_e2e_user', JSON.stringify(user));
      sessionStorage.setItem('fincontrol_e2e_plan', 'pro');
      sessionStorage.setItem('fincontrol_e2e_data', JSON.stringify(d));
    }, { d: heavyData, t: theme });
  };

  test('Em 1366x768 e 1280x800: todas as 8 colunas cabem na viewport do container sem quebra', async ({ page }) => {
    for (const res of [{ width: 1366, height: 768 }, { width: 1280, height: 800 }]) {
      await page.setViewportSize(res);
      await setupHeavySession(page, 'dark');
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);

      // Colunas essenciais visíveis
      const thValor = page.locator('th:has-text("Valor")').first();
      const thParcelas = page.locator('th:has-text("Nº Parcelas")').first();
      const thStatus = page.locator('th:has-text("Status")').first();
      const thAcoes = page.locator('th:has-text("Ações")').first();

      await expect(thValor).toBeVisible();
      await expect(thParcelas).toBeVisible();
      await expect(thStatus).toBeVisible();
      await expect(thAcoes).toBeVisible();

      // Confirma que a tabela cabe na largura do container
      const { tableScrollWidth, containerClientWidth } = await page.evaluate(() => {
        const tables = Array.from(document.querySelectorAll('table'));
        const table = tables.find(t => t.innerText && t.innerText.includes('Tipo'));
        const container = table ? table.parentElement : null;
        return {
          tableScrollWidth: table ? table.scrollWidth : 0,
          containerClientWidth: container ? container.clientWidth : 0,
        };
      });

      expect(tableScrollWidth).toBeLessThanOrEqual(containerClientWidth + 1);
    }
  });

  test('Em mobile 390x844: modo cartões empilhados é renderizado, botões de ação têm >= 44px e são clicáveis', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await setupHeavySession(page, 'dark');
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Tabela tradicional deve estar oculta em mobile
    const tableContainer = page.locator('.sm\\:block');
    await expect(tableContainer).toBeHidden();

    // Container de cards mobile deve estar visível
    const cardsMobile = page.locator('[data-testid="invoice-cards-mobile"]');
    await expect(cardsMobile).toBeVisible();

    // Botões de ação em cada card têm altura >= 44px (touch target WCAG)
    const actionButtons = cardsMobile.locator('button');
    const firstButton = actionButtons.first();
    await expect(firstButton).toBeVisible();

    const box = await firstButton.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      expect(box.height).toBeGreaterThanOrEqual(44);
    }

    // Ação de clicar e interagir
    await firstButton.click();
    await expect(cardsMobile.locator('button').first()).toBeVisible();
  });

  test('Captura screenshots em 7 viewports (Dark e Light) para tabela e cards', async ({ page }) => {
    test.setTimeout(180000);
    const dir = path.resolve(process.cwd(), 'screenshots/fase10-bloco-a');

    for (const vp of VIEWPORTS) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      for (const theme of ['dark', 'light']) {
        await setupHeavySession(page, theme);
        await page.goto('/dashboard');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(400);

        await page.evaluate((t) => {
          document.documentElement.setAttribute('data-theme', t);
          const layout = document.querySelector('[data-theme]');
          if (layout) layout.setAttribute('data-theme', t);
          localStorage.setItem('theme', t);
        }, theme);
        await page.waitForTimeout(300);

        const filename = `invoice-table-${vp.name}-${theme}.png`;
        await page.screenshot({
          path: path.resolve(dir, filename),
          fullPage: false,
        });
      }
    }
  });
});
