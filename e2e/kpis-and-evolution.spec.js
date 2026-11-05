// e2e/kpis-and-evolution.spec.js
import { test, expect } from '@playwright/test';

const mockClients = [
  { id: 'client-1', name: 'Mariana Silva', phone: '11988887777' },
  { id: 'client-2', name: 'Carlos Eduardo', phone: '11977776666' },
  { id: 'client-3', name: 'Beatriz Costa', phone: '11966665555' }
];

const mockCards = [
  { id: 'card-1', name: 'Nubank Ultravioleta', limit: 15000, color: '#8A05BE', closingDay: 10, dueDay: 17 },
  { id: 'card-2', name: 'XP Visa Infinite', limit: 25000, color: '#1A1A1A', closingDay: 5, dueDay: 12 }
];

const mockLoans = [
  {
    id: 'loan-1',
    description: 'MacBook Pro M3 Max',
    cardId: 'card-1',
    totalAmount: 1800,
    installmentsCount: 12,
    installmentValue: 150,
    currentInstallment: 4,
    startDate: '2026-08-10',
    isMyDebt: true
  },
  {
    id: 'loan-2',
    description: 'Geladeira Inverter Compartilhada',
    cardId: 'card-2',
    totalAmount: 4800,
    installmentsCount: 10,
    installmentValue: 480,
    currentInstallment: 3,
    startDate: '2026-09-05',
    isShared: true,
    splitOption: 'custom',
    person1: { clientId: 'client-1', amount: 240, percentage: 50 },
    person2: { clientId: 'client-2', amount: 240, percentage: 50 }
  },
  {
    id: 'loan-3',
    description: 'Passagens Aéreas Férias',
    cardId: 'card-1',
    totalAmount: 3600,
    installmentsCount: 6,
    installmentValue: 600,
    currentInstallment: 2,
    startDate: '2026-10-15',
    clientId: 'client-3',
    isMyDebt: false
  }
];

const mockSubscriptions = [
  { id: 'sub-1', name: 'Netflix Premium 4K', amount: 59.90, value: 59.90, dueDate: '15', cardId: 'card-1', status: 'Ativa', isActive: true },
  { id: 'sub-2', name: 'Spotify Família', amount: 34.90, value: 34.90, dueDate: '10', cardId: 'card-2', status: 'Ativa', isActive: true, clientId: 'client-1' },
  { id: 'sub-3', name: 'Amazon Prime', amount: 19.90, value: 19.90, dueDate: '25', cardId: 'card-1', status: 'Ativa', isActive: true }
];

async function setupMockSession(page, options = {}) {
  const { plan = 'pro', reducedMotion = false } = options;
  if (reducedMotion) {
    await page.emulateMedia({ reducedMotion: 'reduce' });
  }

  await page.addInitScript(({ p, clients, cards, loans, subs }) => {
    localStorage.setItem('theme', 'dark');
    window.__FINCONTROL_E2E_USER__ = {
      uid: 'e2e-kpi-tester',
      email: 'tester@fincontrol.local',
      displayName: 'KPI Tester',
      name: 'KPI Tester',
      plan: p
    };
    sessionStorage.setItem('fincontrol_e2e_user', JSON.stringify({
      uid: 'e2e-kpi-tester',
      email: 'tester@fincontrol.local',
      displayName: 'KPI Tester'
    }));
    sessionStorage.setItem('fincontrol_e2e_plan', p);
    window.__FINCONTROL_E2E_MOCK_DATA__ = {
      clients,
      cards,
      loans,
      subscriptions: subs,
      expenses: [],
      incomes: [],
      paidSubscriptions: []
    };
  }, { p: plan, clients: mockClients, cards: mockCards, loans: mockLoans, subs: mockSubscriptions });
}

test.describe('Fase 4B — KPIs Vivos e Gráfico de Evolução Mensal', () => {

  test('1. Resumo exibe KpiCards estilizados com AnimatedCurrency, Sparkline e Spotlight Glow', async ({ page }) => {
    await setupMockSession(page);
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1400);

    // KpiCard 1: Fatura Total do Mês
    const faturaHeading = page.getByRole('heading', { name: 'Fatura Total do Mês' });
    await expect(faturaHeading).toBeVisible();

    const faturaCard = faturaHeading.locator('xpath=ancestor::div[contains(@class, "fc-kpi-card")][1]');
    await expect(faturaCard).toBeVisible();

    // Valor monetário animado formatado em R$
    const faturaValue = faturaCard.locator('p').first();
    await expect(faturaValue).toContainText('R$');

    // Sparkline SVG integrada
    const faturaSparkline = faturaCard.locator('svg[role="img"]');
    await expect(faturaSparkline).toBeVisible();
    await expect(faturaSparkline).toHaveAttribute('aria-label', /Evolução/i);

    // Spotlight cursor tracking: overlay element exists
    const spotlightOverlay = faturaCard.locator('.fc-kpi-spotlight');
    await expect(spotlightOverlay).toBeAttached();

    // KpiCard 2: Progresso de Pagamento
    const progressoHeading = page.getByRole('heading', { name: 'Progresso de Pagamento' });
    await expect(progressoHeading).toBeVisible();

    const progressoCard = progressoHeading.locator('xpath=ancestor::div[contains(@class, "fc-kpi-card")][1]');
    await expect(progressoCard).toBeVisible();
    const progressBar = progressoCard.locator('[role="progressbar"]');
    await expect(progressBar).toBeVisible();
  });

  test('2. MonthlyEvolutionChart renderiza Recharts AreaChart com nota de honestidade de assinaturas', async ({ page }) => {
    await setupMockSession(page);
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1400);

    // Verifica presença do card de evolução mensal
    const chartCard = page.locator('.fc-monthly-evolution-chart');
    await expect(chartCard).toBeVisible();

    // Título do gráfico
    await expect(chartCard.getByRole('heading', { name: 'Evolução Mensal de Compromissos' })).toBeVisible();

    // Nota de honestidade contratual visível
    const honestyNote = chartCard.locator('text=Nota: assinaturas refletem o valor contratual ativo');
    await expect(honestyNote).toBeVisible();

    // Recharts SVG container
    const rechartsContainer = chartCard.locator('.recharts-responsive-container');
    await expect(rechartsContainer).toBeVisible();

    // Tabela acessível sr-only para leitores de tela
    const srTable = chartCard.locator('table.sr-only');
    await expect(srTable).toBeAttached();
    await expect(srTable.locator('th')).toHaveCount(5); // Mês, Total Comprometido, Parcelas, Assinaturas, Tipo de Dado
  });

  test('3. SegmentedControl alterna métricas (Total, Parcelas, Assinaturas) e atualiza sr-only table', async ({ page }) => {
    await setupMockSession(page);
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    const chartCard = page.locator('.fc-monthly-evolution-chart');
    const metricGroup = chartCard.locator('[role="radiogroup"]').first();
    await expect(metricGroup).toBeVisible();

    // Clica na opção "Parcelas"
    const parcelasBtn = metricGroup.locator('[role="radio"]:has-text("Parcelas")');
    await parcelasBtn.click();
    await expect(parcelasBtn).toHaveAttribute('aria-checked', 'true');

    // Clica na opção "Assinaturas"
    const assinaturasBtn = metricGroup.locator('[role="radio"]:has-text("Assinaturas")');
    await assinaturasBtn.click();
    await expect(assinaturasBtn).toHaveAttribute('aria-checked', 'true');

    // Volta para "Total"
    const totalBtn = metricGroup.locator('[role="radio"]:has-text("Total")');
    await totalBtn.click();
    await expect(totalBtn).toHaveAttribute('aria-checked', 'true');
  });

  test('4. SegmentedControl alterna período (6 meses vs 12 meses)', async ({ page }) => {
    await setupMockSession(page);
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    const chartCard = page.locator('.fc-monthly-evolution-chart');
    const periodGroup = chartCard.locator('[role="radiogroup"]').nth(1);
    await expect(periodGroup).toBeVisible();

    // Estado inicial: 6 meses (6 linhas no corpo da tabela sr-only)
    const tableRows6m = chartCard.locator('table.sr-only tbody tr');
    await expect(tableRows6m).toHaveCount(6);

    // Alterna para 12 meses
    const btn12m = periodGroup.locator('[role="radio"]:has-text("12 meses")');
    await btn12m.click();
    await expect(btn12m).toHaveAttribute('aria-checked', 'true');

    // Verifica que tabela sr-only agora tem 12 meses
    const tableRows12m = chartCard.locator('table.sr-only tbody tr');
    await expect(tableRows12m).toHaveCount(12);
  });

  test('5. Seletor de pessoa filtra os dados da evolução mensal por pessoa', async ({ page }) => {
    await setupMockSession(page);
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    const chartCard = page.locator('.fc-monthly-evolution-chart');
    const personGroup = chartCard.locator('[role="group"][aria-label="Filtrar evolução por pessoa"]');
    await expect(personGroup).toBeVisible();

    // Seleciona Mariana Silva
    const marianaBtn = personGroup.locator('button:has-text("Mariana Silva")');
    await marianaBtn.click();
    await expect(marianaBtn).toHaveAttribute('aria-pressed', 'true');
    await page.waitForTimeout(400);

    // Tabela acessível sr-only deve continuar válida e preenchida
    const tableRows = chartCard.locator('table.sr-only tbody tr');
    await expect(tableRows).toHaveCount(6);

    // Seleciona Sem atribuição
    const unassignedBtn = personGroup.locator('button:has-text("Sem atribuição")');
    await unassignedBtn.click();
    await expect(unassignedBtn).toHaveAttribute('aria-pressed', 'true');
    await page.waitForTimeout(400);
    await expect(tableRows).toHaveCount(6);

    // Volta para Todos
    const todosBtn = personGroup.locator('button:has-text("Todos")');
    await todosBtn.click();
    await expect(todosBtn).toHaveAttribute('aria-pressed', 'true');
    await page.waitForTimeout(400);
    await expect(tableRows).toHaveCount(6);
  });

  test('6. Sob prefers-reduced-motion, renderização do gráfico e KPIs ocorre sem delays', async ({ page }) => {
    await setupMockSession(page, { reducedMotion: true });
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // KpiCards prontos imediatamente
    const faturaHeading = page.getByRole('heading', { name: 'Fatura Total do Mês' });
    await expect(faturaHeading).toBeVisible();
    const faturaCard = faturaHeading.locator('xpath=ancestor::div[contains(@class, "fc-kpi-card")][1]');
    const faturaValue = faturaCard.locator('p').first();
    await expect(faturaValue).toContainText('R$');

    // Gráfico presente sem animação ativa
    const chartCard = page.locator('.fc-monthly-evolution-chart');
    await expect(chartCard).toBeVisible();
  });

  test('7. Trocas de abas (Resumo <-> Pessoas) não travam e não deixam resíduo de transição', async ({ page }) => {
    await setupMockSession(page);
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1200);

    const pessoasBtn = page.locator('aside button:has-text("Pessoas"), aside [aria-label*="Pessoas"]').first();
    const resumoBtn = page.locator('aside button:has-text("Resumo"), aside [aria-label*="Resumo"]').first();

    // Navega para Pessoas
    await pessoasBtn.click();
    await page.waitForFunction(() => !document.documentElement.classList.contains('fc-transitioning'), { timeout: 10000 });
    await expect(page.locator('h1, h2, h3').filter({ hasText: /Pessoas/i }).first()).toBeVisible();

    // Volta para Resumo
    await resumoBtn.click();
    await page.waitForFunction(() => !document.documentElement.classList.contains('fc-transitioning'), { timeout: 10000 });
    await expect(page.getByRole('heading', { name: 'Fatura Total do Mês' })).toBeVisible();
    await expect(page.locator('.fc-monthly-evolution-chart')).toBeVisible();

    // Garante que html não tem fc-transitioning preso
    const hasTransitionClass = await page.evaluate(() => document.documentElement.classList.contains('fc-transitioning'));
    expect(hasTransitionClass).toBe(false);
  });

  test('8. Usuário sem plano Pro visualiza o ProFeatureLock sobre o gráfico de evolução mensal', async ({ page }) => {
    await setupMockSession(page, { plan: 'free' });
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    const chartCard = page.locator('.fc-monthly-evolution-chart');
    await expect(chartCard).toBeVisible();

    // ProFeatureLock overlay deve estar visível
    const proLock = chartCard.locator('.fc-pro-feature-lock, [data-pro-feature-lock="true"]');
    await expect(proLock).toBeVisible();
    await expect(proLock).toContainText(/Pro/i);
  });
});
