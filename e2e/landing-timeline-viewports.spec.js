// e2e/landing-timeline-viewports.spec.js
import { test, expect } from '@playwright/test';

test.describe('Landing — Timeline em Viewports Ultracompactos (320px, 360px, 390px)', () => {
  const viewports = [
    { width: 320, height: 600, label: '320px' },
    { width: 360, height: 640, label: '360px' },
    { width: 390, height: 844, label: '390px' },
  ];

  for (const vp of viewports) {
    test(`Timeline exibe nome do mês completo e sem scroll horizontal em ${vp.label}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Localiza a seção da Timeline
      const timelineSection = page.locator('#invoices-timeline');
      await expect(timelineSection).toBeVisible();

      // Rola até a seção
      await timelineSection.scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);

      // Verifica ausência de scroll horizontal no viewport
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });
      expect(hasHorizontalScroll).toBe(false);

      // Verifica que os nomes dos meses estão presentes e completos (sem '...' de truncate)
      const monthCards = timelineSection.locator('.grid > div');
      const count = await monthCards.count();
      expect(count).toBeGreaterThanOrEqual(5);

      for (let i = 0; i < 5; i++) {
        const card = monthCards.nth(i);
        const text = await card.innerText();
        expect(text).not.toContain('...');
      }

      // Tira screenshot da seção da Timeline
      const screenshotPath = `screenshots/fase9-after-timeline-${vp.label}.png`;
      await timelineSection.screenshot({ path: screenshotPath });
    });
  }
});
