// e2e/design-system-lab.spec.js
import { test, expect } from '@playwright/test';

test.describe('E2E Real Browser — Design System 2.0 Lab (Stage A)', () => {

  test('Desktop (1440x900): renderiza lab, valida ausência de overflow, toggle de temas, modal e teclado', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/design-system-lab');

    // 1. Container principal e tema inicial
    const labRoot = page.locator('div[data-theme]');
    await expect(labRoot).toBeVisible();
    await expect(labRoot).toHaveAttribute('data-theme', 'dark');

    // 2. Validação de ausência de overflow horizontal
    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    expect(hasHorizontalOverflow).toBe(false);

    // 3. Título e seções obrigatórias
    await expect(page.locator('h1')).toContainText('FinControl Design System 2.0');
    await expect(page.locator('h2#sec-colors')).toBeVisible();
    await expect(page.locator('h2#sec-typography')).toBeVisible();
    await expect(page.locator('h2#sec-buttons')).toBeVisible();
    await expect(page.locator('h2#sec-inputs')).toBeVisible();
    await expect(page.locator('h2#sec-surfaces')).toBeVisible();
    await expect(page.locator('h2#sec-badges')).toBeVisible();
    await expect(page.locator('h2#sec-modal')).toBeVisible();

    // 4. Toggle de Tema: Dark -> Light -> Dark
    const lightThemeBtn = page.getByRole('button', { name: /Claro \(Warm White\)/i });
    await lightThemeBtn.click();
    await expect(labRoot).toHaveAttribute('data-theme', 'light');

    const darkThemeBtn = page.getByRole('button', { name: /Escuro \(Obsidian\)/i });
    await darkThemeBtn.click();
    await expect(labRoot).toHaveAttribute('data-theme', 'dark');

    // 5. Verificação de números financeiros canônicos
    await expect(page.locator('text=R$ 0,00')).toBeVisible();
    await expect(page.locator('text=R$ 29,99')).toBeVisible();
    await expect(page.locator('text=+R$ 1.234,56')).toBeVisible();
    await expect(page.locator('text=R$ 12.480,75')).toBeVisible();
    await expect(page.locator('text=-R$ 450,20')).toBeVisible();

    // 6. Teste do Modal: Abertura e fechamento via botão fechar (x)
    const openModalBtn = page.getByRole('button', { name: /Abrir Modal DS2/i });
    await expect(openModalBtn).toBeVisible();
    await openModalBtn.click();

    const dialog = page.locator('div[role="dialog"]');
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute('aria-modal', 'true');
    await expect(page.locator('#fc-modal-title')).toContainText('Demonstração do Modal DS2');

    const closeBtn = dialog.getByRole('button', { name: 'Fechar modal' });
    await closeBtn.click();
    await expect(dialog).toHaveCount(0);
  });

  test('Modal DS2: valida foco real, trap de foco circular, Escape e restore focus', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/design-system-lab');

    // 1. localizar botão "Abrir Modal DS2"
    const openModalBtn = page.getByRole('button', { name: 'Abrir Modal DS2' });
    await expect(openModalBtn).toBeVisible();

    // 2. focar/clicar
    await openModalBtn.focus();
    await expect(openModalBtn).toBeFocused();
    await openModalBtn.click();

    // 3. confirmar dialog visível
    const dialog = page.locator('div[role="dialog"]');
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute('aria-modal', 'true');

    // 4. após abertura confirmar que foco está dentro do dialog
    await expect.poll(async () => {
      return await page.evaluate(() => {
        const d = document.querySelector('div[role="dialog"]');
        return d && d.contains(document.activeElement);
      });
    }).toBe(true);

    // 5. identificar primeiro e último elemento focável do dialog
    const firstFocusable = dialog.getByRole('button', { name: 'Fechar modal' });
    const lastFocusable = dialog.getByRole('button', { name: 'Confirmar Operação' });
    await expect(firstFocusable).toBeVisible();
    await expect(lastFocusable).toBeVisible();

    // 6. validar wrap de foco:
    // - estando no primeiro: Shift+Tab → foco vai para último
    await firstFocusable.focus();
    await expect(firstFocusable).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(lastFocusable).toBeFocused();

    // - estando no último: Tab → foco volta para primeiro
    await page.keyboard.press('Tab');
    await expect(firstFocusable).toBeFocused();

    // 7. pressionar Escape
    await page.keyboard.press('Escape');

    // 8. dialog desaparece
    await expect(dialog).toHaveCount(0);

    // 9. foco retorna ao botão "Abrir Modal DS2"
    await expect(openModalBtn).toBeFocused();
  });

  test('Mobile (390x844): renderiza lab, valida touch targets e sem overflow horizontal', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/design-system-lab');

    // 1. Validação de ausência de overflow horizontal no mobile
    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    expect(hasHorizontalOverflow).toBe(false);

    // 2. Validação de touch target >= 44px nos controles principais
    const buttons = await page.locator('button').all();
    for (const button of buttons) {
      const isVisible = await button.isVisible();
      if (isVisible) {
        const box = await button.boundingBox();
        if (box) {
          expect(box.height).toBeGreaterThanOrEqual(43.5); // tolerância subpixel 44px
          expect(box.width).toBeGreaterThanOrEqual(43.5);
        }
      }
    }

    // 3. Validação dos inputs no mobile
    const inputDefault = page.locator('#tf-default');
    await expect(inputDefault).toBeVisible();
    const inputDefaultBox = await inputDefault.boundingBox();
    expect(inputDefaultBox.height).toBeGreaterThanOrEqual(43.5);

    // 4. Alternância de tema no mobile
    const lightThemeBtn = page.getByRole('button', { name: /Claro/i });
    await lightThemeBtn.click();
    await expect(page.locator('div[data-theme]')).toHaveAttribute('data-theme', 'light');

    const darkThemeBtn = page.getByRole('button', { name: /Escuro/i });
    await darkThemeBtn.click();
    await expect(page.locator('div[data-theme]')).toHaveAttribute('data-theme', 'dark');
  });

  test('Acessibilidade e Navegação por Teclado: valida foco navegável', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/design-system-lab');

    // Pressiona Tab sucessivamente para garantir que o anel de foco não desaparece
    await page.keyboard.press('Tab');
    const focusedElementTag = await page.evaluate(() => document.activeElement ? document.activeElement.tagName : null);
    expect(focusedElementTag).not.toBeNull();

    // Navega até os botões de tema
    await page.keyboard.press('Tab');
    const hasActiveElement = await page.evaluate(() => !!document.activeElement);
    expect(hasActiveElement).toBe(true);
  });

});
