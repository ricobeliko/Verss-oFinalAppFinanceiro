// e2e/write-path-financial.spec.js
// LOTE 2 — E2E Write-Path: Compras (Loans), Receitas, Despesas, Assinaturas
//
// Testa fluxos de escrita financeira via UI real (Chromium).
// Usa dados sintéticos E2E — NUNCA toca produção.

import { test, expect } from '@playwright/test';

// Helper de sessão padrão com cartão pré-existente
async function setupSessionWithCard(page, uid = 'e2e-write-financial') {
    await page.addInitScript((uid) => {
        window.__FINCONTROL_E2E_USER__ = {
            uid,
            email: `${uid}@fincontrol.local`,
            name: 'Write Tester Financial',
            plan: 'pro',
            budgets: {},
            notificationSettings: {},
            aiPreferences: { optIn: false },
        };
        window.__FINCONTROL_E2E_MOCK_DATA__ = {
            cards: [
                {
                    id: 'card-e2e-financial',
                    name: 'Cartão E2E Write Test',
                    limit: 10000,
                    color: '#C5A059',
                    closingDay: 10,
                    dueDay: 17,
                    userId: uid,
                }
            ],
            loans: [],
            expenses: [],
            subscriptions: [],
            clients: [
                { id: 'client-e2e-1', name: 'Pessoa E2E Teste', phone: '11999990000', userId: uid }
            ],
            incomes: [],
        };
    }, uid);
}

// ============================================================
// GRUPO 1: Compras (Loans / Parcelamentos)
// ============================================================
test.describe('E2E Write-Path — Compras e Parcelamentos', () => {
    test.beforeEach(async ({ page }) => {
        await setupSessionWithCard(page);
        await page.goto('/dashboard');
        const navBtn = page.getByRole('button', { name: /Movimentações/i });
        await expect(navBtn).toBeVisible({ timeout: 10000 });
        await navBtn.click();
        await expect(
            page.getByRole('heading', { name: 'Adicionar Movimentações' })
        ).toBeVisible({ timeout: 10000 });
    });

    test('deve criar uma compra simples e confirmar criação', async ({ page }) => {
        const addBtn = page.getByRole('button', { name: /Adicionar Compra/i });
        await expect(addBtn).toBeVisible();
        await addBtn.click();

        await page.locator('#description').fill('Compra E2E Simples');
        await page.locator('#selectedCardId').selectOption({ label: 'Cartão E2E Write Test' });
        await page.locator('#selectedClientId').selectOption({ label: 'Pessoa E2E Teste' });

        const valueInput = page.locator('#totalValueInput');
        await valueInput.click();
        await valueInput.fill('15000'); // R$ 150,00

        await page.locator('#installmentsCount').fill('1');

        const saveBtn = page.getByRole('button', { name: /Salvar Compra/i });
        await saveBtn.click();

        await expect(page.getByText(/adicionad|salv|sucesso/i)).toBeVisible({ timeout: 5000 });
    });

    test('deve criar compra parcelada 12x e confirmar criação', async ({ page }) => {
        const addBtn = page.getByRole('button', { name: /Adicionar Compra/i });
        await addBtn.click();

        await page.locator('#description').fill('Eletrodoméstico E2E 12x');
        await page.locator('#selectedCardId').selectOption({ label: 'Cartão E2E Write Test' });
        await page.locator('#selectedClientId').selectOption({ label: 'Pessoa E2E Teste' });

        const valueInput = page.locator('#totalValueInput');
        await valueInput.click();
        await valueInput.fill('120000'); // R$ 1.200,00

        await page.locator('#installmentsCount').fill('12');

        const saveBtn = page.getByRole('button', { name: /Salvar Compra/i });
        await saveBtn.click();

        await expect(page.getByText(/adicionad|salv|sucesso/i)).toBeVisible({ timeout: 5000 });
    });

    test('não deve aceitar compra sem descrição', async ({ page }) => {
        const addBtn = page.getByRole('button', { name: /Adicionar Compra/i });
        await addBtn.click();

        const valueInput = page.locator('#totalValueInput');
        await valueInput.click();
        await valueInput.fill('10000');

        const saveBtn = page.getByRole('button', { name: /Salvar Compra/i });
        await saveBtn.click();

        const modal = page.getByRole('dialog');
        await expect(modal).toBeVisible();
    });
});

// ============================================================
// GRUPO 2: Receitas
// ============================================================
test.describe('E2E Write-Path — Receitas', () => {
    test.beforeEach(async ({ page }) => {
        await setupSessionWithCard(page);
        await page.goto('/dashboard');
        const navBtn = page.getByRole('button', { name: /Movimentações/i });
        await expect(navBtn).toBeVisible({ timeout: 10000 });
        await navBtn.click();
        // Clica na aba Receitas
        const tabBtn = page.getByRole('button', { name: /Receitas/i });
        await expect(tabBtn).toBeVisible({ timeout: 10000 });
        await tabBtn.click();
        await expect(
            page.getByRole('heading', { name: /Receitas/i })
        ).toBeVisible({ timeout: 10000 });
    });

    test('deve criar uma receita e confirmar criação', async ({ page }) => {
        const addBtn = page.getByRole('button', { name: /Adicionar Receita/i });
        await expect(addBtn).toBeVisible();
        await addBtn.click();

        await page.locator('#incomeDescription').fill('Salário E2E');

        const valueInput = page.locator('#incomeValue');
        await valueInput.click();
        await valueInput.fill('500000'); // R$ 5.000,00

        await page.locator('#incomeClient').selectOption({ label: 'Pessoa E2E Teste' });

        const saveBtn = page.getByRole('button', { name: /Salvar Receita/i });
        await saveBtn.click();

        await expect(page.getByText(/adicionad|salv|sucesso/i)).toBeVisible({ timeout: 5000 });
    });
});

// ============================================================
// GRUPO 3: Despesas
// ============================================================
test.describe('E2E Write-Path — Despesas', () => {
    test.beforeEach(async ({ page }) => {
        await setupSessionWithCard(page);
        await page.goto('/dashboard');
        const navBtn = page.getByRole('button', { name: /Movimentações/i });
        await expect(navBtn).toBeVisible({ timeout: 10000 });
        await navBtn.click();
        // Clica na aba Despesas
        const tabBtn = page.getByRole('button', { name: /Despesas/i });
        await expect(tabBtn).toBeVisible({ timeout: 10000 });
        await tabBtn.click();
        await expect(
            page.getByRole('heading', { name: /Despesas/i })
        ).toBeVisible({ timeout: 10000 });
    });

    test('deve criar uma despesa e confirmar criação', async ({ page }) => {
        const addBtn = page.getByRole('button', { name: /Adicionar Despesa/i });
        await expect(addBtn).toBeVisible();
        await addBtn.click();

        await page.getByPlaceholder('Ex: Supermercado').fill('Gasolina E2E');

        const valueInput = page.getByPlaceholder('0,00');
        await valueInput.click();
        await valueInput.fill('20000'); // R$ 200,00

        const saveBtn = page.getByRole('button', { name: /Salvar Despesa/i });
        await saveBtn.click();

        await expect(page.getByText(/adicionad|salv|sucesso/i)).toBeVisible({ timeout: 5000 });
    });
});

// ============================================================
// GRUPO 4: Assinaturas
// ============================================================
test.describe('E2E Write-Path — Assinaturas', () => {
    test.beforeEach(async ({ page }) => {
        await setupSessionWithCard(page);
        await page.goto('/dashboard');
        const navBtn = page.getByRole('button', { name: /Assinaturas/i });
        await expect(navBtn).toBeVisible({ timeout: 10000 });
        await navBtn.click();
        await expect(
            page.getByRole('heading', { name: /Assinaturas/i })
        ).toBeVisible({ timeout: 10000 });
    });

    test('deve criar uma assinatura e confirmar criação', async ({ page }) => {
        const addBtn = page.getByRole('button', { name: /Adicionar Assinatura/i });
        await expect(addBtn).toBeVisible();
        await addBtn.click();

        await page.locator('#subscriptionName').fill('Streaming E2E');

        const valueInput = page.locator('#subscriptionValue');
        await valueInput.click();
        await valueInput.fill('4990'); // R$ 49,90

        const cardSelect = page.locator('#subscriptionCard');
        if (await cardSelect.count() > 0) {
            await cardSelect.selectOption({ label: 'Cartão E2E Write Test' });
        }

        const saveBtn = page.getByRole('button', { name: /Salvar Assinatura/i });
        await saveBtn.click();

        await expect(page.getByText(/adicionad|salv|sucesso/i)).toBeVisible({ timeout: 5000 });
    });
});

// ============================================================
// GRUPO 5: Pessoa / Repasse
// ============================================================
test.describe('E2E Write-Path — Pessoas', () => {
    test.beforeEach(async ({ page }) => {
        await setupSessionWithCard(page);
        await page.goto('/dashboard');
        const navBtn = page.getByRole('button', { name: /Pessoas/i });
        await expect(navBtn).toBeVisible({ timeout: 10000 });
        await navBtn.click();
        await expect(
            page.getByRole('heading', { name: /Pessoas/i })
        ).toBeVisible({ timeout: 10000 });
    });

    test('deve criar uma pessoa e confirmar criação', async ({ page }) => {
        const nameInput = page.getByPlaceholder('Nome da Pessoa');
        await nameInput.fill('João E2E Teste');

        const saveBtn = page.getByRole('button', { name: /Adicionar Pessoa/i });
        await saveBtn.click();

        await expect(page.getByText(/adicionad|salv|sucesso/i)).toBeVisible({ timeout: 5000 });
    });
});
