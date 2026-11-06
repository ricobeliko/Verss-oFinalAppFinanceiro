// e2e/custom-donut.spec.js
import { test, expect } from '@playwright/test';

test.describe('E2E — Gráfico de Rosca/Donut Interativo com Centro Dinâmico e Legenda', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('theme', 'dark');
      window.__FINCONTROL_E2E_USER__ = {
        uid: 'e2e-donut-tester',
        email: 'donut@fincontrol.local',
        name: 'Donut Tester',
        plan: 'pro',
      };
      window.__FINCONTROL_E2E_MOCK_DATA__ = {
        cards: [
          { id: 'card-1', name: 'Nubank Principal', limit: 8000, closingDay: 25, dueDay: 5, color: '#5CCCCC' }
        ],
        clients: [
          { id: 'c1', name: 'Ana Silva', phone: '11988887777' },
          { id: 'c2', name: 'Carlos Souza', phone: '11977776666' }
        ],
        loans: [
          {
            id: 'loan-1',
            description: 'Notebook Pro',
            cardId: 'card-1',
            clientId: 'c1',
            totalAmount: 1200,
            installmentsCount: 12,
            installmentValue: 100,
            currentInstallment: 1,
            startDate: '2026-11-01',
            isMyDebt: false,
            installments: [
              { number: 1, dueDate: '2026-11-05', value: 100, status: 'Pendente' }
            ]
          },
          {
            id: 'loan-2',
            description: 'Celular',
            cardId: 'card-1',
            clientId: 'c2',
            totalAmount: 600,
            installmentsCount: 6,
            installmentValue: 100,
            currentInstallment: 1,
            startDate: '2026-11-01',
            isMyDebt: false,
            installments: [
              { number: 1, dueDate: '2026-11-05', value: 100, status: 'Pendente' }
            ]
          },
          {
            id: 'loan-3',
            description: 'Fone de Ouvido',
            cardId: 'card-1',
            totalAmount: 200,
            installmentsCount: 2,
            installmentValue: 100,
            currentInstallment: 1,
            startDate: '2026-11-01',
            isMyDebt: true,
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
    });

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
  });

  test('Centro da rosca exibe Total da Fatura inicialmente e atualiza com valor e percentual ao interagir com a legenda', async ({ page }) => {
    // Localiza o centro da rosca
    const donutCenter = page.locator('[data-testid="donut-center"]');
    await expect(donutCenter).toBeVisible();

    // Estado inicial: Total da Fatura
    await expect(donutCenter).toContainText('Total da Fatura');
    await expect(donutCenter).toContainText('R$ 300,00');

    // Localiza a legenda acessível
    const legend = page.locator('div[role="list"][aria-label="Detalhamento de gastos por pessoa na fatura"]');
    await expect(legend).toBeVisible();

    // Localiza o botão da Ana Silva na legenda
    const anaButton = legend.locator('button:has-text("Ana Silva")');
    await expect(anaButton).toBeVisible();
    await expect(anaButton).toHaveAttribute('aria-label', /Ana Silva:.*34%/);

    // Hover na legenda da Ana Silva -> centro deve atualizar com o nome dela, R$ 100,00 e 34% da fatura
    await anaButton.hover();
    await expect(donutCenter).toContainText('Ana Silva');
    await expect(donutCenter).toContainText('R$ 100,00');
    await expect(donutCenter).toContainText('34% da fatura');

    // Remove mouse -> volta ao total da fatura
    await page.mouse.move(0, 0);
    await expect(donutCenter).toContainText('Total da Fatura');
    await expect(donutCenter).toContainText('R$ 300,00');

    // Foco via teclado na legenda da Ana Silva
    await anaButton.focus();
    await expect(donutCenter).toContainText('Ana Silva');
  });
});
