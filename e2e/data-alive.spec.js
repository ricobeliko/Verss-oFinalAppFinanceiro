// e2e/data-alive.spec.js
import { test, expect } from '@playwright/test';

test.describe('Dashboard Dados Vivos — Contadores e Gráficos Animados (Fase 4)', () => {
  const setupMockSession = async (page) => {
    await page.addInitScript(() => {
      localStorage.setItem('theme', 'dark');
      window.__FINCONTROL_E2E_USER__ = {
        uid: 'e2e-data-alive-tester',
        email: 'alive@fincontrol.local',
        name: 'Alive Tester',
        plan: 'pro',
        trialExpiresAt: null,
        budgets: {},
        notificationSettings: { cardDueEnabled: true, cardDueDays: 3 },
        aiPreferences: { optIn: false },
      };
      window.__FINCONTROL_E2E_MOCK_DATA__ = {
        cards: [
          { id: 'card-1', name: 'Nubank Ultravioleta', limit: 12000, color: '#820AD1', closingDay: 10, dueDay: 17 },
        ],
        clients: [
          { id: 'client-1', name: 'Ana Silva', phone: '11988887777' },
        ],
        loans: [
          {
            id: 'loan-1',
            description: 'Notebook Trabalho',
            cardId: 'card-1',
            clientId: 'client-1',
            totalAmount: 4000,
            installmentsCount: 10,
            installmentValue: 400,
            value: 400,
            currentInstallment: 2,
            startDate: '2026-07-10',
            isMyDebt: false,
            category: 'Tecnologia',
          },
        ],
        expenses: [
          {
            id: 'exp-1',
            description: 'Mercado Central',
            cardId: 'card-1',
            value: 250,
            date: '2026-11-02',
            category: 'Alimentação',
          },
        ],
        subscriptions: [
          {
            id: 'sub-1',
            name: 'Spotify Family',
            amount: 34.90,
            value: 34.90,
            dueDate: '10',
            cardId: 'card-1',
            status: 'Ativa',
            isActive: true,
          },
        ],
        incomes: [
          {
            id: 'inc-1',
            description: 'Salário',
            value: 5000,
            date: '2026-11-05',
          },
        ],
        paidSubscriptions: [],
      };
    });
  };

  test('Contadores numéricos convergem com precisão para os valores em reais (R$ ...)', async ({ page }) => {
    await setupMockSession(page);
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Aguarda o término da animação do contador (~1.2s)
    await page.waitForTimeout(1400);

    // 1. KPI Fatura Total deve convergir para formato R$ ...
    const heading = page.getByRole('heading', { name: 'Fatura Total do Mês' });
    await expect(heading).toBeVisible();
    const surfaceCard = heading.locator('xpath=ancestor::div[contains(@class, "rounded")][1]');
    const totalFaturaEl = surfaceCard.locator('p').first();
    await expect(totalFaturaEl).toBeVisible();
    await expect(totalFaturaEl).toHaveText(/R\$\s*[\d.,]+/);

    // 2. Progresso de pagamento: barra de progresso renderizada via GPU com role="progressbar"
    const progressBar = page.locator('[role="progressbar"]').first();
    await expect(progressBar).toBeVisible();
    const valueNow = await progressBar.getAttribute('aria-valuenow');
    expect(Number(valueNow)).toBeGreaterThanOrEqual(0);
    expect(Number(valueNow)).toBeLessThanOrEqual(100);

    // 3. Mini auditoria de compromissos recorrentes
    const miniAuditPago = page.getByText('Pago:', { exact: true });
    await expect(miniAuditPago).toBeVisible();
    const subTotalBadge = miniAuditPago.locator('..').locator('span').last();
    await expect(subTotalBadge).toHaveText(/R\$\s*[\d.,]+/);
  });

  test('Gráficos Recharts SVG são renderizados e contêm barras/setores com dimensões > 0', async ({ page }) => {
    await setupMockSession(page);
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Aguarda animação dos gráficos (begin 300ms + duration 900ms = 1200ms)
    await page.waitForTimeout(1400);

    // Verifica que SVGs de gráficos estão presentes
    const chartContainers = page.locator('.recharts-responsive-container');
    const chartCount = await chartContainers.count();
    expect(chartCount).toBeGreaterThan(0);

    // Verifica SVGs principais dos gráficos no wrapper do Recharts
    const chartSvgs = page.locator('.recharts-responsive-container .recharts-wrapper > svg');
    const svgCount = await chartSvgs.count();
    expect(svgCount).toBeGreaterThan(0);

    for (let i = 0; i < svgCount; i++) {
      const box = await chartSvgs.nth(i).boundingBox();
      expect(box).not.toBeNull();
      expect(box.width).toBeGreaterThan(50);
      expect(box.height).toBeGreaterThan(50);
    }
  });

  test('Sob prefers-reduced-motion, contadores e gráficos iniciam estáticos sem delay', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await setupMockSession(page);
    await page.goto('/dashboard');

    // Não há espera longa de animação: o valor final deve estar renderizado prontamente
    const heading = page.getByRole('heading', { name: 'Fatura Total do Mês' });
    await expect(heading).toBeVisible();
    const surfaceCard = heading.locator('xpath=ancestor::div[contains(@class, "rounded")][1]');
    const totalFaturaEl = surfaceCard.locator('p').first();
    await expect(totalFaturaEl).toBeVisible();
    await expect(totalFaturaEl).toHaveText(/R\$\s*[\d.,]+/);

    // As barras de progresso não devem ter transform transitório inline
    const progressBarInner = page.locator('[role="progressbar"] > div').first();
    await expect(progressBarInner).toBeAttached();
    const transform = await progressBarInner.evaluate((el) => el.style.transform);
    expect(transform).toBe('');
  });
});
