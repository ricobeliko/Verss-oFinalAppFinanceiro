// e2e/custom-donut.spec.js
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const outDir = path.resolve('screenshots/fase9-2');

test.describe('E2E — Gráfico de Rosca/Donut Interativo com Centro Dinâmico e Legenda', () => {
  test.beforeAll(() => {
    fs.mkdirSync(outDir, { recursive: true });
  });

  const setupDonutSession = async (page, theme, scenario) => {
    await page.addInitScript(({ initialTheme, scen }) => {
      localStorage.setItem('theme', initialTheme);
      window.__FINCONTROL_E2E_USER__ = {
        uid: 'e2e-donut-tester',
        email: 'donut@fincontrol.local',
        name: 'Donut Tester',
        plan: 'pro',
      };

      let clients = [];
      let loans = [];

      if (scen === '1-person') {
        clients = [
          { id: 'c1', name: 'Carlos Tester', phone: '11988887777' }
        ];
        loans = [
          {
            id: 'loan-1',
            description: 'Compra Pessoal Fatura',
            cardId: 'card-1',
            totalAmount: 741.80,
            installmentsCount: 1,
            installmentValue: 741.80,
            currentInstallment: 1,
            startDate: '2026-11-01',
            isMyDebt: true,
            installments: [
              { number: 1, dueDate: '2026-11-05', value: 741.80, status: 'Pendente' }
            ]
          }
        ];
      } else if (scen === '2-persons') {
        clients = [
          { id: 'c1', name: 'Mariana Costa', phone: '11977776666' }
        ];
        loans = [
          {
            id: 'loan-1',
            description: 'Notebook Pessoal',
            cardId: 'card-1',
            totalAmount: 500,
            installmentsCount: 1,
            installmentValue: 500,
            currentInstallment: 1,
            startDate: '2026-11-01',
            isMyDebt: true,
            installments: [
              { number: 1, dueDate: '2026-11-05', value: 500, status: 'Pendente' }
            ]
          },
          {
            id: 'loan-2',
            description: 'Almoço Compartilhado',
            cardId: 'card-1',
            clientId: 'c1',
            totalAmount: 241.80,
            installmentsCount: 1,
            installmentValue: 241.80,
            currentInstallment: 1,
            startDate: '2026-11-01',
            isMyDebt: false,
            installments: [
              { number: 1, dueDate: '2026-11-05', value: 241.80, status: 'Pendente' }
            ]
          }
        ];
      } else if (scen === 'long-name') {
        clients = [
          { id: 'c1', name: 'Mariana de Albuquerque Silveira', phone: '11977776666' }
        ];
        loans = [
          {
            id: 'loan-1',
            description: 'Despesa Própria',
            cardId: 'card-1',
            totalAmount: 350.50,
            installmentsCount: 1,
            installmentValue: 350.50,
            currentInstallment: 1,
            startDate: '2026-11-01',
            isMyDebt: true,
            installments: [
              { number: 1, dueDate: '2026-11-05', value: 350.50, status: 'Pendente' }
            ]
          },
          {
            id: 'loan-2',
            description: 'Compra Especial Mariana',
            cardId: 'card-1',
            clientId: 'c1',
            totalAmount: 391.30,
            installmentsCount: 1,
            installmentValue: 391.30,
            currentInstallment: 1,
            startDate: '2026-11-01',
            isMyDebt: false,
            installments: [
              { number: 1, dueDate: '2026-11-05', value: 391.30, status: 'Pendente' }
            ]
          }
        ];
      }

      window.__FINCONTROL_E2E_MOCK_DATA__ = {
        cards: [
          { id: 'card-1', name: 'Nubank Principal', limit: 8000, closingDay: 25, dueDay: 5, color: '#5CCCCC' }
        ],
        clients,
        loans,
        expenses: [],
        subscriptions: [],
        incomes: [],
        paidSubscriptions: [],
      };
    }, { initialTheme: theme, scen: scenario });
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
      test(`Layout e Legenda da Rosca em ${vp.name} (${th}) — 1 Pessoa, 2 Pessoas e Nome Longo`, async ({ page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });

        // === 1. Cenário: 2 Pessoas (com R$ 241,80 e R$ 500,00) ===
        await setupDonutSession(page, th, '2-persons');
        await page.goto('/dashboard');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(400);

        // Garante aplicação do tema correto
        const currentTheme = await page.locator('html').getAttribute('data-theme');
        if (currentTheme !== th) {
          const themeToggle = page.locator('button[aria-label*="Alternar tema"]:visible').first();
          if (await themeToggle.isVisible()) {
            await themeToggle.click();
            await page.waitForTimeout(400);
          }
        }

        const donutCard = page.locator('div:has(> h3:has-text("Gastos por Pessoa (Fatura)"))').first();
        const donutCenter = page.locator('[data-testid="donut-center"]');
        const listContainer = page.locator('div[role="list"][aria-label="Detalhamento de gastos por pessoa na fatura"]');

        await expect(donutCenter).toBeVisible({ timeout: 10000 });
        await expect(listContainer).toBeVisible();

        // 1.1 Verificação de estouro horizontal no container da lista
        const isListNoHScroll = await listContainer.evaluate(el => el.scrollWidth <= el.clientWidth + 1);
        expect(isListNoHScroll).toBe(true);

        // 1.2 Verificação de ausência de scrollbar vertical para 2 pessoas
        const isListNoVScroll = await listContainer.evaluate(el => el.scrollHeight <= el.clientHeight + 2);
        expect(isListNoVScroll).toBe(true);

        // 1.3 Verificação de cada linha da legenda
        const rows = listContainer.locator('button[role="listitem"]');
        const rowCount = await rows.count();
        expect(rowCount).toBe(2);

        const cardBox = await donutCard.boundingBox();

        for (let i = 0; i < rowCount; i++) {
          const row = rows.nth(i);
          const rowBox = await row.boundingBox();
          expect(rowBox).not.toBeNull();
          if (cardBox) {
            // A linha não pode estourar as margens do cartão
            expect(rowBox.x).toBeGreaterThanOrEqual(cardBox.x - 2);
            expect(rowBox.x + rowBox.width).toBeLessThanOrEqual(cardBox.x + cardBox.width + 2);
          }

          // O valor financeiro não pode estar truncado
          const valSpan = row.locator('span.whitespace-nowrap').first();
          const isValFull = await valSpan.evaluate(el => el.scrollWidth <= el.clientWidth + 1);
          expect(isValFull).toBe(true);
        }

        // 1.4 Verificação do centro da rosca: texto cabe dentro do círculo (diâmetro 130px)
        const centerTitle = donutCenter.locator('span').first();
        const centerBox = await centerTitle.boundingBox();
        expect(centerBox).not.toBeNull();
        expect(centerBox.width).toBeLessThanOrEqual(125);

        // Screenshot do cenário de 2 pessoas
        await page.screenshot({
          path: path.join(outDir, `donut-${vp.name}-${th}-2persons.png`),
          fullPage: false,
        });

        // === 2. Cenário: Nome Longo (31 caracteres) e Interatividade ===
        await setupDonutSession(page, th, 'long-name');
        await page.goto('/dashboard');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(400);

        const longNameBtn = page.locator('button[role="listitem"]:has-text("Mariana de Albuquerque")').first();
        await expect(longNameBtn).toBeVisible({ timeout: 10000 });

        // Hover no item de nome longo -> centro exibe o nome com truncate sem estourar o círculo
        await longNameBtn.hover();
        await page.waitForTimeout(200);

        const activeCenterName = donutCenter.locator('span').first();
        const activeNameBox = await activeCenterName.boundingBox();
        expect(activeNameBox).not.toBeNull();
        expect(activeNameBox.width).toBeLessThanOrEqual(125);

        // Screenshot com hover em nome longo
        await page.screenshot({
          path: path.join(outDir, `donut-${vp.name}-${th}-hover-longname.png`),
          fullPage: false,
        });

        // Desfaz hover
        await page.mouse.move(0, 0);
        await page.waitForTimeout(200);

        // === 3. Cenário: 1 Pessoa (100% sem scroll) ===
        await setupDonutSession(page, th, '1-person');
        await page.goto('/dashboard');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(400);

        const singleRow = page.locator('button[role="listitem"]').first();
        await expect(singleRow).toBeVisible({ timeout: 10000 });
        await expect(singleRow).toContainText('R$');
        await expect(singleRow).toContainText('741,80');
        await expect(singleRow).toContainText('100%');

        // Screenshot com 1 pessoa
        await page.screenshot({
          path: path.join(outDir, `donut-${vp.name}-${th}-1person.png`),
          fullPage: false,
        });
      });
    }
  }
});
