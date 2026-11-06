// e2e/month-picker-layout.spec.js
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const outDir = path.resolve('screenshots/fase9-1-fixed');

test.describe('Fase 9.1 — Regressão de Layout do MonthPicker no Dashboard', () => {
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
            date: '2026-11-05',
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
    { name: '1280x800', width: 1280, height: 800 },
    { name: '1024x768', width: 1024, height: 768 },
    { name: '768x1024', width: 768, height: 1024 },
    { name: '390x844', width: 390, height: 844 },
  ];

  const themes = ['dark', 'light'];

  for (const vp of viewports) {
    for (const th of themes) {
      test(`Layout e dimensões do MonthPicker em ${vp.name} (${th})`, async ({ page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await setupSession(page, th);

        await page.goto('/dashboard');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(500);

        // Garante aplicação do tema correto
        const currentTheme = await page.locator('html').getAttribute('data-theme');
        if (currentTheme !== th) {
          const themeToggle = page.locator('button[aria-label*="Alternar tema"]:visible').first();
          if (await themeToggle.isVisible()) {
            await themeToggle.click();
            await page.waitForTimeout(400);
          }
        }

        const monthTrigger = page.locator('button[aria-label="Selecionar mês e ano de competência"]');
        await expect(monthTrigger).toBeVisible({ timeout: 10000 });

        const calendarSvg = monthTrigger.locator('svg').first();
        const textSpan = monthTrigger.locator('span.truncate');

        // Teste 1: Mês Atual ("2026-11" -> "novembro de 2026")
        await expect(textSpan).toContainText('novembro de 2026');

        // Medir bounding box do ícone SVG
        const boxNov = await calendarSvg.boundingBox();
        expect(boxNov).not.toBeNull();
        expect(boxNov.width).toBeLessThanOrEqual(24);
        expect(boxNov.height).toBeLessThanOrEqual(24);
        expect(boxNov.width).toBeGreaterThanOrEqual(14);
        expect(boxNov.height).toBeGreaterThanOrEqual(14);

        // Verificar que o texto não está cortado com reticências
        const isNovNotTruncated = await textSpan.evaluate((el) => el.scrollWidth <= el.clientWidth + 1);
        expect(isNovNotTruncated).toBe(true);

        // Screenshot do mês atual
        await page.screenshot({
          path: path.join(outDir, `dashboard-${vp.name}-${th}-2026-11.png`),
          fullPage: false,
        });

        // Teste 2: Mês longo ("2026-09" -> "setembro de 2026")
        // Navega para setembro através dos botões de paginação anterior
        const prevBtn = page.locator('button[aria-label="Mês anterior"]');
        await prevBtn.click();
        await page.waitForTimeout(200);
        await prevBtn.click();
        await page.waitForTimeout(200);

        await expect(textSpan).toContainText('setembro de 2026');

        // Medir bounding box do ícone SVG em setembro
        const boxSet = await calendarSvg.boundingBox();
        expect(boxSet).not.toBeNull();
        expect(boxSet.width).toBeLessThanOrEqual(24);
        expect(boxSet.height).toBeLessThanOrEqual(24);
        expect(boxSet.width).toBeGreaterThanOrEqual(14);
        expect(boxSet.height).toBeGreaterThanOrEqual(14);

        // Verificar que o texto "setembro de 2026" não está cortado
        const isSetNotTruncated = await textSpan.evaluate((el) => el.scrollWidth <= el.clientWidth + 1);
        expect(isSetNotTruncated).toBe(true);

        // Screenshot do mês longo
        await page.screenshot({
          path: path.join(outDir, `dashboard-${vp.name}-${th}-2026-09.png`),
          fullPage: false,
        });
      });
    }
  }
});
