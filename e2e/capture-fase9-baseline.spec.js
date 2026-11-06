// e2e/capture-fase9-baseline.spec.js
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const outDir = path.resolve('screenshots');

test.describe('Fase 9 — Diagnóstico / Baseline Screenshots (Antes das Alterações)', () => {
  test.beforeAll(() => {
    fs.mkdirSync(outDir, { recursive: true });
  });

  const setupSession = async (page, theme) => {
    await page.addInitScript(({ initialTheme }) => {
      localStorage.setItem('theme', initialTheme);
      window.__FINCONTROL_E2E_USER__ = {
        uid: 'e2e-fase9-tester',
        email: 'fase9@fincontrol.local',
        name: 'Carlos Tester',
        plan: 'pro',
      };
      window.__FINCONTROL_E2E_MOCK_DATA__ = {
        cards: [
          { id: 'card-1', name: 'Nubank Ultravioleta', limit: 12000, color: '#5CCCCC', closingDay: 10, dueDay: 17 },
          { id: 'card-2', name: 'Itaú Personalité', limit: 25000, color: '#047C84', closingDay: 5, dueDay: 12 },
        ],
        clients: [
          { id: 'client-1', name: 'Carlos Tester', phone: '11988887777' },
          { id: 'client-2', name: 'Mariana Costa', phone: '11977776666' },
        ],
        loans: [
          {
            id: 'loan-1',
            description: 'Notebook Trabalho',
            cardId: 'card-1',
            clientId: 'client-1',
            totalAmount: 6000,
            installmentsCount: 10,
            installmentValue: 600,
            currentInstallment: 3,
            startDate: '2026-07-10',
            isMyDebt: true,
            category: 'Tecnologia',
          },
        ],
        expenses: [
          {
            id: 'exp-1',
            description: 'Supermercado',
            cardId: 'card-1',
            clientId: 'client-1',
            value: 450,
            date: new Date(),
            category: 'Alimentação',
          },
        ],
        subscriptions: [
          {
            id: 'sub-1',
            name: 'Streaming 4K',
            amount: 55.9,
            value: 55.9,
            dueDate: '15',
            cardId: 'card-1',
            status: 'Ativa',
            category: 'Lazer',
          },
        ],
        incomes: [],
        paidSubscriptions: [],
      };
    }, { initialTheme: theme });
  };

  const viewports = [
    { name: 'desktop', width: 1280, height: 800 },
    { name: 'mobile', width: 390, height: 844 },
  ];

  const themes = ['dark', 'light'];

  for (const vp of viewports) {
    for (const th of themes) {
      test(`Baseline Dashboard, Modal e Cartões: ${vp.name} - ${th}`, async ({ page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await setupSession(page, th);

        const navigateTo = async (pageName) => {
          if (vp.name === 'mobile') {
            const menuBtn = page.locator('button[aria-label="Abrir menu de navegação"]:visible').first();
            await menuBtn.click();
            await page.waitForTimeout(400);
            const drawerBtn = page.locator(`div[role="dialog"] button:has-text("${pageName}"):visible`).first();
            await drawerBtn.click();
            await page.waitForTimeout(700);
          } else {
            const navBtn = page.locator(`button[aria-label="${pageName}"]:visible`).first();
            await navBtn.click();
            await page.waitForTimeout(700);
          }
        };

        // 1. Dashboard com filtros (cartão, pessoa, mês)
        await page.goto('/dashboard');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(600);

        // Garante aplicação do tema correto
        const currentTheme = await page.locator('html').getAttribute('data-theme');
        if (currentTheme !== th) {
          const themeToggle = page.locator('button[aria-label*="Alternar tema"]:visible').first();
          if (await themeToggle.isVisible()) {
            await themeToggle.click();
            await page.waitForTimeout(400);
          }
        }

        // Captura da barra de filtros do Dashboard
        const filtersContainer = page.locator('div:has(input[type="month"])').first();
        if (await filtersContainer.isVisible()) {
          await filtersContainer.screenshot({
            path: path.join(outDir, `fase9-before-${vp.name}-${th}-dashboard-filters.png`),
          });
        }

        // 2. Modal com select e date (Nova Compra em Movimentações)
        await navigateTo('Movimentações');

        const addPurchaseBtn = page.getByRole('button', { name: 'Adicionar Compra' }).first();
        await expect(addPurchaseBtn).toBeVisible({ timeout: 10000 });
        await addPurchaseBtn.click();
        await page.waitForTimeout(500);

        const modal = page.locator('div[role="dialog"]').first();
        await expect(modal).toBeVisible();
        await modal.screenshot({
          path: path.join(outDir, `fase9-before-${vp.name}-${th}-modal-select.png`),
        });

        // Fecha modal com Escape
        await page.keyboard.press('Escape');
        await page.waitForTimeout(400);

        // 3. Cartões com mês (input type="month")
        await navigateTo('Cartões');

        const cardMonthSection = page.locator('div:has(input[type="month"])').last();
        if (await cardMonthSection.isVisible()) {
          await cardMonthSection.screenshot({
            path: path.join(outDir, `fase9-before-${vp.name}-${th}-cards-month.png`),
          });
        }
      });
    }
  }
});
