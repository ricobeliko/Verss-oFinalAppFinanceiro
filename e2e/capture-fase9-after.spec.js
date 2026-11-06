// e2e/capture-fase9-after.spec.js
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const outDir = path.resolve('screenshots');

test.describe('Fase 9 — Captura de Provas Visuais (DEPOIS)', () => {
  test.beforeAll(() => {
    fs.mkdirSync(outDir, { recursive: true });
  });

  const setupSession = async (page, theme) => {
    await page.addInitScript(({ initialTheme }) => {
      localStorage.setItem('theme', initialTheme);
      window.__FINCONTROL_E2E_USER__ = {
        uid: 'e2e-fase9-after',
        email: 'after@fincontrol.local',
        name: 'Carlos After',
        plan: 'pro',
      };
      window.__FINCONTROL_E2E_MOCK_DATA__ = {
        cards: [
          { id: 'card-1', name: 'Nubank Ultravioleta', limit: 12000, color: '#5CCCCC', closingDay: 10, dueDay: 17 },
          { id: 'card-2', name: 'Itaú Personalité', limit: 25000, color: '#047C84', closingDay: 5, dueDay: 12 },
        ],
        clients: [
          { id: 'client-1', name: 'Ana Silva', phone: '11988887777' },
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
            isMyDebt: false,
            category: 'Tecnologia',
            installments: [
              { number: 3, dueDate: '2026-11-05', value: 600, status: 'Pendente' }
            ]
          },
          {
            id: 'loan-2',
            description: 'Smartphone Pro',
            cardId: 'card-1',
            clientId: 'client-2',
            totalAmount: 3000,
            installmentsCount: 10,
            installmentValue: 300,
            currentInstallment: 2,
            startDate: '2026-10-05',
            isMyDebt: false,
            category: 'Tecnologia',
            installments: [
              { number: 2, dueDate: '2026-11-05', value: 300, status: 'Pendente' }
            ]
          },
          {
            id: 'loan-3',
            description: 'Fone Bluetooth',
            cardId: 'card-1',
            totalAmount: 300,
            installmentsCount: 3,
            installmentValue: 100,
            currentInstallment: 1,
            startDate: '2026-11-01',
            isMyDebt: true,
            category: 'Acessórios',
            installments: [
              { number: 1, dueDate: '2026-11-05', value: 100, status: 'Pendente' }
            ]
          }
        ],
        expenses: [],
        subscriptions: [],
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
      test(`DEPOIS Controles Abertos: ${vp.name} - ${th}`, async ({ page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await setupSession(page, th);

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

        // 1. Select de Cartão Aberto no Dashboard
        const cardSelectTrigger = page.locator('button[aria-haspopup="listbox"]').first();
        if (await cardSelectTrigger.isVisible()) {
          await cardSelectTrigger.click();
          await page.waitForTimeout(400);
          await page.screenshot({
            path: path.join(outDir, `fase9-after-${vp.name}-${th}-dashboard-select-open.png`),
          });
          // Fecha select com Escape
          await page.keyboard.press('Escape');
          await page.waitForTimeout(300);
        }

        // 2. MonthPicker Aberto no Dashboard
        const monthTrigger = page.locator('button[aria-label*="mês"]').first();
        if (await monthTrigger.isVisible()) {
          await monthTrigger.click();
          await page.waitForTimeout(400);
          await page.screenshot({
            path: path.join(outDir, `fase9-after-${vp.name}-${th}-monthpicker-open.png`),
          });
          await page.keyboard.press('Escape');
          await page.waitForTimeout(300);
        }

        // Navegação para Movimentações
        if (vp.name === 'mobile') {
          const menuBtn = page.locator('button[aria-label="Abrir menu de navegação"]:visible').first();
          await menuBtn.click();
          await page.waitForTimeout(400);
          const drawerBtn = page.locator('div[role="dialog"] button:has-text("Movimentações"):visible').first();
          await drawerBtn.click();
          await page.waitForTimeout(700);
        } else {
          const navBtn = page.locator('button[aria-label="Movimentações"]:visible').first();
          await navBtn.click();
          await page.waitForTimeout(700);
        }

        // 3. Modal de Compra com Select Aberto
        const addPurchaseBtn = page.getByRole('button', { name: 'Adicionar Compra' }).first();
        await expect(addPurchaseBtn).toBeVisible({ timeout: 10000 });
        await addPurchaseBtn.click();
        await page.waitForTimeout(500);

        const modal = page.locator('div[role="dialog"]').first();
        await expect(modal).toBeVisible();

        // Abre o Select de Cartão dentro do Modal
        const modalSelect = modal.locator('button[aria-haspopup="listbox"]').first();
        if (await modalSelect.isVisible()) {
          await modalSelect.click();
          await page.waitForTimeout(400);
          await page.screenshot({
            path: path.join(outDir, `fase9-after-${vp.name}-${th}-modal-select-open.png`),
          });
          await page.keyboard.press('Escape');
          await page.waitForTimeout(300);
        }

        // 4. DatePicker Aberto no Modal de Compra
        const dateTrigger = modal.locator('button[aria-label*="data"], button[aria-label*="Data"]').first();
        if (await dateTrigger.isVisible()) {
          await dateTrigger.click();
          await page.waitForTimeout(400);
          await page.screenshot({
            path: path.join(outDir, `fase9-after-${vp.name}-${th}-datepicker-open.png`),
          });
          await page.keyboard.press('Escape');
          await page.waitForTimeout(300);
        }

        // Fecha modal
        await page.keyboard.press('Escape');
      });
    }
  }

  // 5. Rosca de Pessoas em Repouso e com Destaque (Desktop 1280)
  for (const th of themes) {
    test(`DEPOIS Rosca de Pessoas Interativa: desktop - ${th}`, async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await setupSession(page, th);

      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(600);

      const donutCenter = page.locator('[data-testid="donut-center"]');
      await expect(donutCenter).toBeVisible();

      // Rola até o gráfico
      const chartContainer = page.locator('div:has([data-testid="donut-center"])').first();
      await chartContainer.scrollIntoViewIfNeeded();
      await page.waitForTimeout(400);

      // Screenshot da Rosca em repouso
      await chartContainer.screenshot({
        path: path.join(outDir, `fase9-after-desktop-${th}-donut-idle.png`),
      });

      // Hover na Ana Silva
      const anaBtn = page.locator('button[role="listitem"]:has-text("Ana Silva")');
      if (await anaBtn.isVisible()) {
        await anaBtn.hover();
        await page.waitForTimeout(300);
        await chartContainer.screenshot({
          path: path.join(outDir, `fase9-after-desktop-${th}-donut-hover.png`),
        });
      }
    });
  }

  // 6. Sidebar Expandida e Recolhida com Logo Animado
  test('DEPOIS Sidebar Expandida e Recolhida: desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await setupSession(page, 'dark');

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    const sidebar = page.locator('aside[aria-label="Navegação principal"]');
    await expect(sidebar).toBeVisible();

    // Sidebar expandida
    await sidebar.screenshot({
      path: path.join(outDir, 'fase9-after-desktop-sidebar-expanded.png'),
    });

    // Recolhe sidebar
    const toggleCollapse = page.locator('button[aria-label*="Recolher menu lateral"]').first();
    await toggleCollapse.click();
    await page.waitForTimeout(400);

    // Sidebar recolhida
    await sidebar.screenshot({
      path: path.join(outDir, 'fase9-after-desktop-sidebar-collapsed.png'),
    });
  });
});
