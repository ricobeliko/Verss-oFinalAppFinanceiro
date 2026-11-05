// e2e/brand-mark.spec.js
import { test, expect } from '@playwright/test';
import { getDemoData } from './fixtures/demoData.js';

test.describe('Fase Ícone — Marca FinControl no Login e Sidebar (E2E Real)', () => {

  test('1. Tela de login exibe a marca FinControl animada acima do título', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Localiza o card de formulário do login
    const mark = page.locator('.fc-mark').first();
    await expect(mark).toBeVisible();

    // Dimensão esperada 56x56
    await expect(mark).toHaveAttribute('width', '56');
    await expect(mark).toHaveAttribute('height', '56');

    // Ondas animadas presentes no SVG
    const waves = mark.locator('.fc-mark-wave');
    await expect(waves).toHaveCount(3);
    await expect(waves.nth(0)).toHaveClass(/fc-mark-wave-anim-1/);
    await expect(waves.nth(1)).toHaveClass(/fc-mark-wave-anim-2/);
    await expect(waves.nth(2)).toHaveClass(/fc-mark-wave-anim-3/);

    // Título FinControl visível logo abaixo da marca
    await expect(page.getByRole('heading', { name: /FinControl/i })).toBeVisible();
  });

  test('2. Sidebar exibe a marca nos estados expandido e recolhido, com acessibilidade correta', async ({ page }) => {
    const demoData = getDemoData('2026-11');
    await page.addInitScript(({ d }) => {
      localStorage.setItem('theme', 'dark');
      const user = {
        uid: 'e2e-brand-user',
        email: 'brand@fincontrol.app',
        displayName: 'Mariana Silva',
        plan: 'pro'
      };
      window.__FINCONTROL_E2E_USER__ = user;
      window.__FINCONTROL_E2E_MOCK_DATA__ = d;
      sessionStorage.setItem('fincontrol_e2e_user', JSON.stringify(user));
      sessionStorage.setItem('fincontrol_e2e_plan', 'pro');
      sessionStorage.setItem('fincontrol_e2e_data', JSON.stringify(d));
    }, { d: demoData });

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    const sidebar = page.locator('aside');
    await expect(sidebar).toBeVisible();

    const sidebarMark = sidebar.locator('.fc-mark').first();
    await expect(sidebarMark).toBeVisible();
    await expect(sidebarMark).toHaveAttribute('width', '36');
    await expect(sidebarMark).toHaveAttribute('height', '36');

    // Estado EXPANDIDO: texto "FinControl" presente ao lado; ícone é aria-hidden="true"
    const brandText = sidebar.locator('text=FinControl').first();
    await expect(brandText).toBeVisible();
    await expect(sidebarMark).toHaveAttribute('aria-hidden', 'true');

    // Alterna para estado RECOLHIDO
    const collapseBtn = sidebar.locator('button[aria-label*="Recolher menu lateral"]');
    await collapseBtn.click();
    await page.waitForTimeout(400);

    // Estado RECOLHIDO: texto não deve estar visível; marca deve possuir aria-label="FinControl"
    await expect(brandText).not.toBeVisible();
    await expect(sidebarMark).toHaveAttribute('aria-label', 'FinControl');
    await expect(sidebarMark).toBeVisible();

    // Verifica que nenhum elemento fica com estilo inline residual de 'undefined' ou 'NaN'
    const hasInvalidInlineStyles = await page.evaluate(() => {
      const all = document.querySelectorAll('*[style]');
      for (const el of all) {
        const s = el.getAttribute('style') || '';
        if (s.includes('undefined') || s.includes('NaN')) return true;
      }
      return false;
    });
    expect(hasInvalidInlineStyles).toBe(false);
  });
});
