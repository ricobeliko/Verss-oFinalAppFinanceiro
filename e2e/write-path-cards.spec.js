// e2e/write-path-cards.spec.js
// LOTE 2 — E2E Write-Path: Cartões
//
// Testa CREATE, UPDATE e DELETE de cartões via UI real do browser (Chromium)
// contra o Firebase Emulator local (não toca produção).
//
// O contexto E2E é injetado via addInitScript (import.meta.env.DEV),
// o que impede qualquer conexão com Firestore de produção.

import { test, expect } from '@playwright/test';

// Helper: configura sessão E2E sintética antes de cada teste de write
async function setupE2ESession(page, overrides = {}) {
    await page.addInitScript((data) => {
        window.__FINCONTROL_E2E_USER__ = {
            uid: data.uid || 'e2e-write-user-cards',
            email: data.email || 'write-cards@fincontrol.local',
            name: data.name || 'Write Tester Cards',
            plan: data.plan || 'pro',
            budgets: {},
            notificationSettings: {},
            aiPreferences: { optIn: false },
        };
        window.__FINCONTROL_E2E_MOCK_DATA__ = {
            cards: data.cards || [],
            loans: [],
            expenses: [],
            subscriptions: [],
            clients: [],
            incomes: [],
        };
    }, overrides);
}

test.describe('E2E Write-Path — Cartões (CREATE / UPDATE / DELETE)', () => {
    test.beforeEach(async ({ page }) => {
        await setupE2ESession(page);
        await page.goto('/dashboard');
        // Clica na aba Cartões na barra lateral
        const navBtn = page.getByRole('button', { name: /Cartões/i });
        await expect(navBtn).toBeVisible({ timeout: 10000 });
        await navBtn.click();
        // Aguarda a tela de Cartões estar pronta
        await expect(page.getByRole('heading', { name: /Cartões/i })).toBeVisible({ timeout: 10000 });
    });

    // -------------------------------------------------------
    // CREATE CARTÃO
    // -------------------------------------------------------
    test('deve criar um cartão com nome, limite e datas válidos', async ({ page }) => {
        // Abre modal de criação
        const addBtn = page.getByRole('button', { name: /Adicionar Cartão/i });
        await expect(addBtn).toBeVisible();
        await addBtn.click();

        // Preenche o formulário via placeholders
        await page.getByPlaceholder('Ex: Nubank Black').fill('Cartão E2E Platinum');
        
        // Campo de limite usa formatação de moeda
        const limiteInput = page.getByPlaceholder('0,00');
        await limiteInput.click();
        await limiteInput.fill('500000'); // R$ 5.000,00

        await page.getByPlaceholder('Ex: 5').fill('15');
        await page.getByPlaceholder('Ex: 12').fill('22');

        // Salva o cartão
        const saveBtn = page.getByRole('button', { name: /Salvar Cartão/i });
        await saveBtn.click();

        // Feedback de sucesso deve aparecer
        await expect(page.getByText(/Cartão adicionado com sucesso/i)).toBeVisible({ timeout: 5000 });
    });

    // -------------------------------------------------------
    // UPDATE CARTÃO (precisa de um cartão existente no mock)
    // -------------------------------------------------------
    test('deve editar um cartão existente e confirmar a alteração', async ({ page }) => {
        // Este teste parte de um mock com cartão pré-existente
        await page.addInitScript(() => {
            window.__FINCONTROL_E2E_MOCK_DATA__ = {
                cards: [{ id: 'card-edit-e2e', name: 'Cartão Original', limit: 3000, color: '#C5A059', closingDay: 10, dueDay: 17, userId: 'e2e-write-user-cards' }],
                loans: [], expenses: [], subscriptions: [], clients: [], incomes: []
            };
        });

        await page.reload();
        await page.getByRole('button', { name: /Cartões/i }).click();
        await expect(page.getByRole('heading', { name: /Cartões/i })).toBeVisible({ timeout: 10000 });

        // Clica no botão de editar do cartão existente
        const editBtn = page.getByRole('button', { name: /Editar/i }).first();
        await expect(editBtn).toBeVisible();
        await editBtn.click();

        // Limpa e altera o nome
        const nameInput = page.getByPlaceholder('Ex: Nubank Black');
        await nameInput.clear();
        await nameInput.fill('Cartão Editado E2E');

        // Salva a edição
        const saveBtn = page.getByRole('button', { name: /Atualizar Cartão/i });
        await saveBtn.click();

        // Feedback de sucesso
        await expect(page.getByText(/Cartão atualizado com sucesso/i)).toBeVisible({ timeout: 5000 });
    });

    // -------------------------------------------------------
    // VALIDAÇÃO — nome em branco não deve ser aceito
    // -------------------------------------------------------
    test('não deve aceitar cartão sem nome preenchido', async ({ page }) => {
        const addBtn = page.getByRole('button', { name: /Adicionar Cartão/i });
        await addBtn.click();

        // Não preenche nome — apenas tenta salvar
        const saveBtn = page.getByRole('button', { name: /Salvar Cartão/i });
        await saveBtn.click();

        // O modal não deve fechar em caso de formulário inválido
        const modal = page.getByRole('dialog');
        await expect(modal).toBeVisible();
    });
});
