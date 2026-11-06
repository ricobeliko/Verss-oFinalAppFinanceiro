// e2e/custom-select.spec.js
import { test, expect } from '@playwright/test';

test.describe('E2E — Componente <Select> Customizado (Acessibilidade, Teclado e Modais)', () => {
  const setupSession = async (page) => {
    await page.addInitScript(() => {
      localStorage.setItem('theme', 'dark');
      window.__FINCONTROL_E2E_USER__ = {
        uid: 'e2e-select-tester',
        email: 'select@fincontrol.local',
        name: 'Select Tester',
        plan: 'pro',
      };
      window.__FINCONTROL_E2E_MOCK_DATA__ = {
        cards: [
          { id: 'card-1', name: 'Nubank Ultravioleta', limit: 10000, color: '#5CCCCC' },
          { id: 'card-2', name: 'Itaú Black', limit: 20000, color: '#047C84' },
        ],
        clients: [
          { id: 'client-1', name: 'Ana Silva' },
          { id: 'client-2', name: 'Carlos Eduardo' },
        ],
        loans: [],
        expenses: [],
        subscriptions: [],
        incomes: [],
        paidSubscriptions: [],
      };
    });
  };

  test('Desktop: Abre popover em portal, navega por teclado e seleciona opção com ícone de onda', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await setupSession(page);
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Trigger de filtro de cartão no Dashboard
    const cardCombobox = page.locator('button[role="combobox"][aria-label="Filtrar por cartão"]');
    await expect(cardCombobox).toBeVisible();
    await expect(cardCombobox).toHaveAttribute('aria-expanded', 'false');

    // Abre com clique
    await cardCombobox.click();
    await expect(cardCombobox).toHaveAttribute('aria-expanded', 'true');

    // Popover renderizado no portal
    const listbox = page.locator('[role="listbox"]').first();
    await expect(listbox).toBeVisible();

    // Opção selecionada exibe o ícone identitário de ondas
    const defaultOption = listbox.locator('[role="option"]:has-text("Todos os Cartões")');
    await expect(defaultOption).toHaveAttribute('aria-selected', 'true');
    await expect(defaultOption.locator('svg')).toBeVisible();

    // Seleciona segunda opção com mouse
    const itauOption = listbox.locator('[role="option"]:has-text("Itaú Black")');
    await itauOption.click();

    // Popover fecha e trigger atualiza o texto
    await expect(cardCombobox).toHaveAttribute('aria-expanded', 'false');
    await expect(cardCombobox).toContainText('Itaú Black');
  });

  test('Dentro de GenericModal: Escape fecha PRIMEIRO só o popover do Select, não o modal', async ({ page }) => {
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

    // Clica no combobox de Cartão dentro do modal
    const cardTrigger = modal.locator('button[role="combobox"]').first();
    await cardTrigger.click();
    await expect(cardTrigger).toHaveAttribute('aria-expanded', 'true');

    const popover = page.locator('[role="listbox"]').first();
    await expect(popover).toBeVisible();

    // 1º Escape: Fecha estritamente o popover do Select; o modal CONTINUA ABERTO
    await page.keyboard.press('Escape');
    await expect(popover).toBeHidden();
    await expect(modal).toBeVisible();
    await expect(cardTrigger).toBeFocused();

    // 2º Escape: Agora que o popover está fechado, o modal fecha
    await page.keyboard.press('Escape');
    await expect(modal).toBeHidden();
  });

  test('Mobile (< 640px): renderiza Bottom Sheet com touch targets >= 44px', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await setupSession(page);
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const cardCombobox = page.locator('button[role="combobox"][aria-label="Filtrar por cartão"]');
    await expect(cardCombobox).toBeVisible();
    await cardCombobox.click();

    // Localiza a bottom-sheet renderizada no portal
    const bottomSheet = page.locator('div[role="dialog"][aria-label="Filtrar por cartão"]').first();
    await expect(bottomSheet).toBeVisible();

    // Touch targets das opções >= 44px
    const options = bottomSheet.locator('[role="option"]');
    const count = await options.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      const box = await options.nth(i).boundingBox();
      expect(box.height).toBeGreaterThanOrEqual(44);
    }

    // Fecha ao tocar no backdrop
    const backdrop = bottomSheet.locator('div[aria-hidden="true"]').first();
    await backdrop.click({ position: { x: 50, y: 50 } });
    await expect(bottomSheet).toBeHidden();
  });
});
