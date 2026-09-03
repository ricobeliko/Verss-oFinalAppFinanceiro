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
// GRUPO 1.1: Integridade na Edição de Compras (Fase 8.1)
// ============================================================
async function setupSessionWithPartiallyPaidLoan(page, uid = 'e2e-write-financial-edit') {
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
            loans: [
                {
                    id: 'loan-partially-paid',
                    description: 'Smartphone Parcelado',
                    totalValue: 300,
                    installmentsCount: 3,
                    purchaseDate: '2026-08-01',
                    cardId: 'card-e2e-financial',
                    clientId: 'client-e2e-1',
                    userId: uid,
                    isShared: false,
                    valuePaidClient: 100,
                    balanceDueClient: 200,
                    statusPaymentClient: 'Pago Parcial',
                    installments: [
                        { number: 1, value: 100, dueDate: '2026-08-17', status: 'Paga', paidDate: '2026-08-15' },
                        { number: 2, value: 100, dueDate: '2026-09-17', status: 'Pendente', paidDate: null },
                        { number: 3, value: 100, dueDate: '2026-10-17', status: 'Pendente', paidDate: null }
                    ]
                }
            ],
            expenses: [],
            subscriptions: [],
            clients: [
                { id: 'client-e2e-1', name: 'Pessoa E2E Teste', phone: '11999990000', userId: uid }
            ],
            incomes: [],
        };
    }, uid);
}

test.describe('E2E Write-Path — Edição e Integridade de Compras (Fase 8.1)', () => {
    test.beforeEach(async ({ page }) => {
        await setupSessionWithPartiallyPaidLoan(page);
        await page.goto('/dashboard');
        const navBtn = page.getByRole('button', { name: /Movimentações/i });
        await expect(navBtn).toBeVisible({ timeout: 10000 });
        await navBtn.click();
        await expect(
            page.getByRole('heading', { name: 'Adicionar Movimentações' })
        ).toBeVisible({ timeout: 10000 });
    });

    test('deve editar compra parcialmente paga preservando o status Pago Parcial e histórico', async ({ page }) => {
        await expect(page.getByText('Smartphone Parcelado')).toBeVisible({ timeout: 10000 });
        await expect(page.getByText('Pago Parcial')).toBeVisible();

        const editBtn = page.getByRole('button', { name: /Editar compra Smartphone Parcelado/i });
        await editBtn.click();

        const descInput = page.locator('#description');
        await descInput.fill('Smartphone Galaxy Atualizado');

        const saveBtn = page.getByRole('button', { name: /Salvar Compra|Atualizar Compra/i });
        await saveBtn.click();

        await expect(page.getByText(/atualizada com sucesso/i)).toBeVisible({ timeout: 5000 });

        // Validação forense de persistência: confirma que os campos financeiros NÃO foram apagados
        const savedLoan = await page.evaluate(() => {
            return window.__FINCONTROL_E2E_MOCK_DATA__.loans.find(l => l.id === 'loan-partially-paid');
        });

        expect(savedLoan.description).toBe('Smartphone Galaxy Atualizado');
        expect(savedLoan.valuePaidClient).toBe(100);
        expect(savedLoan.balanceDueClient).toBe(200);
        expect(savedLoan.statusPaymentClient).toBe('Pago Parcial');
        expect(savedLoan.installments[0].status).toBe('Paga');
        expect(savedLoan.installments[0].paidDate).toBe('2026-08-15');
    });

    test('deve bloquear alteração estrutural financeira em compra com pagamentos registrados', async ({ page }) => {
        await expect(page.getByText('Smartphone Parcelado')).toBeVisible({ timeout: 10000 });

        const editBtn = page.getByRole('button', { name: /Editar compra Smartphone Parcelado/i });
        await editBtn.click();

        await page.locator('#installmentsCount').fill('8');

        const saveBtn = page.getByRole('button', { name: /Salvar Compra|Atualizar Compra/i });
        await saveBtn.click();

        await expect(page.getByText(/Esta compra possui pagamentos registrados/i)).toBeVisible({ timeout: 5000 });
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
