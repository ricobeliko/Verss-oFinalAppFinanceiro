// e2e/modal-focus-stability.spec.js
import { test, expect } from '@playwright/test';

test.describe('Modal Focus Stability — Regressão FASE 8.7 (Digitando sem Perder Foco)', () => {
  const setupSession = async (page) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('theme', 'dark');
      window.__FINCONTROL_E2E_USER__ = {
        uid: 'e2e-tester',
        email: 'tester@fincontrol.local',
        name: 'Tester FinControl',
        plan: 'pro',
        budgets: {},
        notificationSettings: {},
        aiPreferences: { optIn: false },
      };
      window.__FINCONTROL_E2E_MOCK_DATA__ = {
        cards: [{ id: 'card-1', name: 'Nubank', limit: 5000, color: '#C5A059' }],
        loans: [],
        expenses: [],
        subscriptions: [],
        clients: [{ id: 'client-1', name: 'Brayan' }],
        incomes: [],
      };
    });
  };

  test('1. Assinatura: digitação contínua mantém foco e todos os caracteres', async ({ page }) => {
    await setupSession(page);
    await page.goto('/dashboard');

    const navSubs = page.getByRole('button', { name: /Assinaturas/i });
    await expect(navSubs).toBeVisible({ timeout: 10000 });
    await navSubs.click();

    const addSubBtn = page.getByRole('button', { name: /Adicionar Assinatura/i });
    await expect(addSubBtn).toBeVisible({ timeout: 10000 });
    await addSubBtn.click();

    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 10000 });

    const nameInput = page.locator('#subscriptionName');
    await expect(nameInput).toBeVisible();
    await nameInput.click();
    await expect(nameInput).toBeFocused();

    await nameInput.pressSequentially('Netflix Premium 4K', { delay: 30 });

    expect(await nameInput.inputValue()).toBe('Netflix Premium 4K');
    await expect(nameInput).toBeFocused();

    // Fecha com Escape
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });

  test('2. Compra: digitação contínua em descrição mantém foco e integridade', async ({ page }) => {
    await setupSession(page);
    await page.goto('/dashboard');

    const navMov = page.getByRole('button', { name: /Movimentações/i });
    await expect(navMov).toBeVisible({ timeout: 10000 });
    await navMov.click();

    const addCompraBtn = page.getByRole('button', { name: /Adicionar Compra/i });
    await expect(addCompraBtn).toBeVisible({ timeout: 10000 });
    await addCompraBtn.click();

    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 10000 });

    const descInput = page.locator('#description');
    await expect(descInput).toBeVisible();
    await descInput.click();
    await expect(descInput).toBeFocused();

    await descInput.pressSequentially('Supermercado Semanal', { delay: 30 });

    expect(await descInput.inputValue()).toBe('Supermercado Semanal');
    await expect(descInput).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });

  test('3. Cartão: digitação contínua em nome do cartão mantém foco', async ({ page }) => {
    await setupSession(page);
    await page.goto('/dashboard');

    const navCards = page.getByRole('button', { name: /Cartões/i });
    await expect(navCards).toBeVisible({ timeout: 10000 });
    await navCards.click();

    const addCardBtn = page.getByRole('button', { name: /Adicionar Cartão/i });
    await expect(addCardBtn).toBeVisible({ timeout: 10000 });
    await addCardBtn.click();

    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 10000 });

    const cardNameInput = page.locator('#cardNameInput');
    await expect(cardNameInput).toBeVisible();
    await cardNameInput.click();
    await expect(cardNameInput).toBeFocused();

    await cardNameInput.pressSequentially('Nubank Ultravioleta', { delay: 30 });

    expect(await cardNameInput.inputValue()).toBe('Nubank Ultravioleta');
    await expect(cardNameInput).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });

  test('4. Pessoa: digitação contínua na edição de pessoa mantém foco', async ({ page }) => {
    await setupSession(page);
    await page.goto('/dashboard');

    const navClients = page.getByRole('button', { name: /Pessoas/i });
    await expect(navClients).toBeVisible({ timeout: 10000 });
    await navClients.click();

    const editBtn = page.locator('button[title="Editar"]').first();
    await expect(editBtn).toBeVisible({ timeout: 10000 });
    await editBtn.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 10000 });

    const clientNameInput = dialog.locator('#clientName');
    await expect(clientNameInput).toBeVisible();
    await clientNameInput.click();
    await clientNameInput.fill(''); // Limpa para digitar do zero
    await expect(clientNameInput).toBeFocused();

    await clientNameInput.pressSequentially('Richard Wagner Silva', { delay: 30 });

    expect(await clientNameInput.inputValue()).toBe('Richard Wagner Silva');
    await expect(clientNameInput).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
  });

  test('5. Receita: digitação contínua na descrição de receita mantém foco', async ({ page }) => {
    await setupSession(page);
    await page.goto('/dashboard');

    const navMov = page.getByRole('button', { name: /Movimentações/i });
    await expect(navMov).toBeVisible({ timeout: 10000 });
    await navMov.click();

    const tabReceitas = page.getByRole('button', { name: 'Receitas' });
    await expect(tabReceitas).toBeVisible({ timeout: 10000 });
    await tabReceitas.click();

    const addIncomeBtn = page.getByRole('button', { name: /Adicionar Receita/i });
    await expect(addIncomeBtn).toBeVisible({ timeout: 10000 });
    await addIncomeBtn.click();

    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 10000 });

    const incomeDesc = page.locator('#incomeDescription');
    await expect(incomeDesc).toBeVisible();
    await incomeDesc.click();
    await expect(incomeDesc).toBeFocused();

    await incomeDesc.pressSequentially('Consultoria Especial Pro', { delay: 30 });

    expect(await incomeDesc.inputValue()).toBe('Consultoria Especial Pro');
    await expect(incomeDesc).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });

  test('6. Despesa: digitação contínua na descrição de despesa mantém foco', async ({ page }) => {
    await setupSession(page);
    await page.goto('/dashboard');

    const navMov = page.getByRole('button', { name: /Movimentações/i });
    await expect(navMov).toBeVisible({ timeout: 10000 });
    await navMov.click();

    const tabDespesas = page.getByRole('button', { name: 'Despesas' });
    await expect(tabDespesas).toBeVisible({ timeout: 10000 });
    await tabDespesas.click();

    const addExpenseBtn = page.getByRole('button', { name: /Adicionar Despesa/i });
    await expect(addExpenseBtn).toBeVisible({ timeout: 10000 });
    await addExpenseBtn.click();

    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 10000 });

    const expenseDesc = page.locator('#expenseDescription');
    await expect(expenseDesc).toBeVisible();
    await expenseDesc.click();
    await expect(expenseDesc).toBeFocused();

    await expenseDesc.pressSequentially('Energia Elétrica Copel', { delay: 30 });

    expect(await expenseDesc.inputValue()).toBe('Energia Elétrica Copel');
    await expect(expenseDesc).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });

  test('7. Busca Global: digitação sequencial pesquisa sem perda de foco', async ({ page }) => {
    await setupSession(page);
    await page.goto('/dashboard');

    const searchBtn = page.getByRole('button', { name: /Abrir busca global/i });
    await expect(searchBtn).toBeVisible({ timeout: 10000 });
    await searchBtn.click();

    const searchInput = page.getByLabel('Termo de busca');
    await expect(searchInput).toBeVisible({ timeout: 10000 });
    await expect(searchInput).toBeFocused();

    await searchInput.pressSequentially('Nubank', { delay: 30 });

    expect(await searchInput.inputValue()).toBe('Nubank');
    await expect(searchInput).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(searchInput).not.toBeVisible();
  });
});
