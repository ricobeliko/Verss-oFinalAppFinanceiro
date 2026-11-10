/* global process */
// e2e/veil-canvas-large-screens.spec.js
import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { getDemoData } from './fixtures/demoData.js';

const RESOLUTIONS = [
  { width: 1366, height: 768, name: '1366x768' },
  { width: 1920, height: 1080, name: '1920x1080' },
  { width: 2560, height: 1440, name: '2560x1440' },
  { width: 3840, height: 2160, name: '3840x2160' },
];

const TABS = [
  { id: 'resumo', label: 'Resumo', titleMatch: /Resumo financeiro|Itens da Fatura/i },
  { id: 'pessoas', label: 'Pessoas', titleMatch: /Pessoas/i },
  { id: 'cards', label: 'Cartões', titleMatch: /Cartões/i },
  { id: 'transactions', label: 'Movimentações', titleMatch: /Movimentações|Transações/i },
  { id: 'subscriptions', label: 'Assinaturas', titleMatch: /Assinaturas/i },
];

const setupPageSession = async (page, theme = 'dark') => {
  const demoData = getDemoData('2026-11');
  await page.addInitScript(({ d, t }) => {
    localStorage.setItem('theme', t);
    const user = {
      uid: 'e2e-fase10-user',
      email: 'fase10@fincontrol.app',
      displayName: 'Mariana Silva',
      plan: 'pro',
    };
    window.__FINCONTROL_E2E_USER__ = user;
    window.__FINCONTROL_E2E_MOCK_DATA__ = d;
    sessionStorage.setItem('fincontrol_e2e_user', JSON.stringify(user));
    sessionStorage.setItem('fincontrol_e2e_plan', 'pro');
    sessionStorage.setItem('fincontrol_e2e_data', JSON.stringify(d));
  }, { d: demoData, t: theme });
};

test.describe('Bloco B: Véu de transição e Layout Responsivo em Telas Grandes', () => {
  test.beforeAll(() => {
    const dir = path.resolve(process.cwd(), 'screenshots/fase10-bloco-b');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  for (const res of RESOLUTIONS) {
    test(`Resolução ${res.name}: BoundingBox do véu e scroll horizontal com sidebar expandida e recolhida`, async ({ page }) => {
      test.setTimeout(90000);
      await page.setViewportSize({ width: res.width, height: res.height });
      await setupPageSession(page, 'dark');
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);

      const html = page.locator('html');
      const waveSweep = page.locator('[data-fc-wave-sweep="true"]');

      // 1. Sidebar Expandida (desktop >= 1024px é w-64 = 256px)
      const sidebarWidthExpanded = 256;

      // Dispara transição para 'Pessoas'
      const pessoasBtn = page.getByRole('button', { name: 'Pessoas' }).first();
      await pessoasBtn.click();

      // Aguarda classe fc-transitioning ou elemento visível
      await expect(async () => {
        const isTrans = await html.evaluate(el => el.classList.contains('fc-transitioning'));
        expect(isTrans).toBe(true);
      }).toPass({ timeout: 2000 });

      // Mede coordenadas do elemento do véu
      const boxExp = await waveSweep.boundingBox();
      expect(boxExp).not.toBeNull();
      if (boxExp) {
        expect(boxExp.width).toBeGreaterThanOrEqual(res.width - sidebarWidthExpanded - 2);
        expect(boxExp.height).toBeGreaterThanOrEqual(res.height - 2);
        expect(boxExp.x).toBeGreaterThanOrEqual(sidebarWidthExpanded - 2);
      }

      // Aguarda fim da transição (timeout estendido para 12s para absorver renderização 4K via software no Chromium)
      await expect(async () => {
        const isTrans = await html.evaluate(el => el.classList.contains('fc-transitioning'));
        expect(isTrans).toBe(false);
      }).toPass({ timeout: 12000 });

      // Confirma que não há scroll horizontal
      const hasHorizontalScrollExp = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });
      expect(hasHorizontalScrollExp).toBe(false);

      // 2. Sidebar Recolhida (desktop w-[72px] = 72px)
      const collapseToggle = page.locator('button[aria-label="Recolher menu lateral"]').first();
      await collapseToggle.click();
      
      // Aguarda a transição CSS de largura estabilizar em ~72px de forma condicional
      await expect(async () => {
        const asideWidth = await page.locator('aside').evaluate((el) => el.getBoundingClientRect().width);
        expect(asideWidth).toBeGreaterThanOrEqual(70);
        expect(asideWidth).toBeLessThanOrEqual(75);
      }).toPass({ timeout: 3000 });

      const sidebarWidthCollapsed = 72;

      // Dispara transição para 'Cartões'
      const cardsBtn = page.getByRole('button', { name: 'Cartões' }).first();
      await cardsBtn.click();

      await expect(async () => {
        const isTrans = await html.evaluate(el => el.classList.contains('fc-transitioning'));
        expect(isTrans).toBe(true);
      }).toPass({ timeout: 2000 });

      const boxCol = await waveSweep.boundingBox();
      expect(boxCol).not.toBeNull();
      if (boxCol) {
        expect(boxCol.width).toBeGreaterThanOrEqual(res.width - sidebarWidthCollapsed - 2);
        expect(boxCol.height).toBeGreaterThanOrEqual(res.height - 2);
        expect(boxCol.x).toBeGreaterThanOrEqual(sidebarWidthCollapsed - 2);
      }

      await expect(async () => {
        const isTrans = await html.evaluate(el => el.classList.contains('fc-transitioning'));
        expect(isTrans).toBe(false);
      }).toPass({ timeout: 12000 });

      const hasHorizontalScrollCol = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });
      expect(hasHorizontalScrollCol).toBe(false);
    });
  }

  test('Captura do frame no meio da transição e screenshots de todas as abas (dark e light nas 4 resoluções)', async ({ page }) => {
    test.setTimeout(180000);

    // Captura de frame no meio da transição (1920x1080)
    await page.setViewportSize({ width: 1920, height: 1080 });
    await setupPageSession(page, 'dark');
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Desacelera animação para capturar o frame com crista visível
    await page.evaluate(() => {
      const origAnimate = Element.prototype.animate;
      Element.prototype.animate = function(keyframes, options) {
        if (typeof options === 'object' && options !== null) {
          options.duration = (options.duration || 500) * 8; // 8x mais lento para foto
        }
        return origAnimate.call(this, keyframes, options);
      };
    });

    const pessoasBtn = page.getByRole('button', { name: 'Pessoas' }).first();
    await pessoasBtn.click();
    await page.waitForTimeout(400);

    // Tira screenshot no meio da transição
    await page.screenshot({
      path: path.resolve(process.cwd(), 'screenshots/fase10-bloco-b/mid-transition.png'),
    });

    // Aguarda término da transição desacelerada
    await page.waitForTimeout(4000);

    // Captura de cada aba nas 4 resoluções em Dark e Light
    for (const res of RESOLUTIONS) {
      await page.setViewportSize({ width: res.width, height: res.height });
      for (const theme of ['dark', 'light']) {
        await page.evaluate((t) => {
          document.documentElement.setAttribute('data-theme', t);
          const layout = document.querySelector('[data-theme]');
          if (layout) layout.setAttribute('data-theme', t);
          localStorage.setItem('theme', t);
        }, theme);
        await page.waitForTimeout(200);

        for (const tab of TABS) {
          const tabBtn = page.getByRole('button', { name: tab.label }).first();
          if (await tabBtn.isVisible()) {
            await tabBtn.click();
            await page.waitForTimeout(800);
          }
          const filename = `${tab.id}-${res.name}-${theme}.png`;
          await page.screenshot({
            path: path.resolve(process.cwd(), `screenshots/fase10-bloco-b/${filename}`),
            fullPage: false,
          });
        }
      }
    }
  });
});
