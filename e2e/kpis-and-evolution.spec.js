// e2e/kpis-and-evolution.spec.js
import { test, expect } from '@playwright/test';
import { getDemoData, generateConsoleSnippet } from './fixtures/demoData.js';

async function setupMockSession(page, options = {}) {
  const { plan = 'pro', reducedMotion = false, baseMonth } = options;
  if (reducedMotion) {
    await page.emulateMedia({ reducedMotion: 'reduce' });
  }

  const currentMonth = baseMonth || new Date().toISOString().slice(0, 7);
  const data = getDemoData(currentMonth);

  await page.addInitScript(({ p, d }) => {
    localStorage.setItem('theme', 'dark');
    const user = {
      uid: 'e2e-kpi-tester',
      email: 'tester@fincontrol.local',
      displayName: 'Mariana Silva',
      name: 'Mariana Silva',
      plan: p,
    };
    window.__FINCONTROL_E2E_USER__ = user;
    window.__FINCONTROL_E2E_MOCK_DATA__ = d;
    sessionStorage.setItem('fincontrol_e2e_user', JSON.stringify(user));
    sessionStorage.setItem('fincontrol_e2e_plan', p);
    sessionStorage.setItem('fincontrol_e2e_data', JSON.stringify(d));
  }, { p: plan, d: data });

  return { currentMonth, data };
}

test.describe('Fase 4B.1 — KPIs Vivos, Coerência Fatura x Série e Demonstração Real', () => {

  test('1. KPI Fatura Total do Mês bate com os dados reais ao centavo (R$ 2.060,20)', async ({ page }) => {
    await setupMockSession(page);
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1400);

    // KpiCard: Fatura Total do Mês
    const faturaHeading = page.getByRole('heading', { name: 'Fatura Total do Mês' });
    await expect(faturaHeading).toBeVisible();

    const faturaCard = faturaHeading.locator('xpath=ancestor::div[contains(@class, "fc-kpi-card")][1]');
    await expect(faturaCard).toBeVisible();

    // Valor monetário formatado bate exatamente com a soma matemática: R$ 2.060,20
    const faturaValue = faturaCard.locator('p').first();
    await expect(faturaValue).toContainText('2.060,20');

    // Sparkline SVG integrada e interativa
    const faturaSparkline = faturaCard.locator('svg[role="img"]');
    await expect(faturaSparkline).toBeVisible();
    await expect(faturaSparkline).toHaveAttribute('aria-label', /Evolução/i);

    // Spotlight cursor tracking ativo
    const spotlightOverlay = faturaCard.locator('.fc-kpi-spotlight');
    await expect(spotlightOverlay).toBeAttached();

    // Delta do KPI Fatura Total
    const deltaBadge = faturaCard.locator('xpath=.//span[contains(@class, "fc-badge") or contains(@class, "inline-flex")]').first();
    await expect(deltaBadge).toBeVisible();
  });

  test('2. MonthlyEvolutionChart renderiza Recharts, nota de honestidade e tabela sr-only idêntica ao KPI', async ({ page }) => {
    const { currentMonth } = await setupMockSession(page);
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1400);

    const chartCard = page.locator('.fc-monthly-evolution-chart');
    await expect(chartCard).toBeVisible();
    await expect(chartCard.getByRole('heading', { name: 'Evolução Mensal de Compromissos' })).toBeVisible();

    // Nota de honestidade de assinaturas contratuais
    const honestyNote = chartCard.locator('text=Nota: assinaturas refletem o valor contratual ativo');
    await expect(honestyNote).toBeVisible();

    // Container SVG Recharts
    const rechartsContainer = chartCard.locator('.recharts-responsive-container');
    await expect(rechartsContainer).toBeVisible();

    // Tabela acessível sr-only com 6 colunas (Mês, Total, Parcelas, Assinaturas, Despesas Avulsas, Tipo de Dado)
    const srTable = chartCard.locator('table.sr-only');
    await expect(srTable).toBeAttached();
    await expect(srTable.locator('th')).toHaveCount(6);

    // Linha do mês atual na tabela sr-only deve bater rigorosamente com o KPI ao centavo
    const currentMonthRow = srTable.locator(`tr[data-month="${currentMonth}"]`);
    await expect(currentMonthRow).toBeAttached();
    await expect(currentMonthRow).toContainText('2.060,20'); // Total Comprometido
    await expect(currentMonthRow).toContainText('1.300,00'); // Parcelas
    await expect(currentMonthRow).toContainText('114,70');   // Assinaturas
    await expect(currentMonthRow).toContainText('645,50');   // Despesas Avulsas
  });

  test('3. SegmentedControl alterna métricas incluindo a nova métrica Despesas avulsas', async ({ page }) => {
    await setupMockSession(page);
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    const chartCard = page.locator('.fc-monthly-evolution-chart');
    const metricGroup = chartCard.locator('[role="radiogroup"]').first();
    await expect(metricGroup).toBeVisible();

    // Alterna para "Parcelas"
    const parcelasBtn = metricGroup.locator('[role="radio"]:has-text("Parcelas")');
    await parcelasBtn.click();
    await expect(parcelasBtn).toHaveAttribute('aria-checked', 'true');

    // Alterna para "Assinaturas"
    const assinaturasBtn = metricGroup.locator('[role="radio"]:has-text("Assinaturas")');
    await assinaturasBtn.click();
    await expect(assinaturasBtn).toHaveAttribute('aria-checked', 'true');

    // Alterna para "Despesas avulsas" (Nova métrica Fase 4B.1)
    const despesasBtn = metricGroup.locator('[role="radio"]:has-text("Despesas avulsas")');
    await despesasBtn.click();
    await expect(despesasBtn).toHaveAttribute('aria-checked', 'true');

    // Retorna para "Total"
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

    // 6 meses (padrão)
    const tableRows6m = chartCard.locator('table.sr-only tbody tr');
    await expect(tableRows6m).toHaveCount(6);

    // Alterna para 12 meses
    const btn12m = periodGroup.locator('[role="radio"]:has-text("12 meses")');
    await btn12m.click();
    await expect(btn12m).toHaveAttribute('aria-checked', 'true');

    // 12 meses no corpo da tabela sr-only
    const tableRows12m = chartCard.locator('table.sr-only tbody tr');
    await expect(tableRows12m).toHaveCount(12);
  });

  test('5. Seletor de pessoa filtra a evolução mensal e bate valores por pessoa', async ({ page }) => {
    const { currentMonth } = await setupMockSession(page);
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    const chartCard = page.locator('.fc-monthly-evolution-chart');
    const personGroup = chartCard.locator('[role="group"][aria-label="Filtrar evolução por pessoa"]');
    await expect(personGroup).toBeVisible();

    // Filtra Mariana Silva (Total: R$ 1.010,40)
    const marianaBtn = personGroup.locator('button:has-text("Mariana Silva")');
    await marianaBtn.click();
    await expect(marianaBtn).toHaveAttribute('aria-pressed', 'true');
    await page.waitForTimeout(300);

    const srTable = chartCard.locator('table.sr-only');
    const marianaRow = srTable.locator(`tr[data-month="${currentMonth}"]`);
    await expect(marianaRow).toContainText('1.010,40');
    await expect(marianaRow).toContainText('600,00');
    await expect(marianaRow).toContainText('59,90');
    await expect(marianaRow).toContainText('350,50');

    // Filtra Carlos Eduardo (Total: R$ 444,90)
    const carlosBtn = personGroup.locator('button:has-text("Carlos Eduardo")');
    await carlosBtn.click();
    await expect(carlosBtn).toHaveAttribute('aria-pressed', 'true');
    await page.waitForTimeout(300);

    const carlosRow = srTable.locator(`tr[data-month="${currentMonth}"]`);
    await expect(carlosRow).toContainText('444,90');

    // Filtra Sem atribuição (Total: R$ 219,90)
    const unassignedBtn = personGroup.locator('button:has-text("Sem atribuição")');
    await unassignedBtn.click();
    await expect(unassignedBtn).toHaveAttribute('aria-pressed', 'true');
    await page.waitForTimeout(300);

    const unassignedRow = srTable.locator(`tr[data-month="${currentMonth}"]`);
    await expect(unassignedRow).toContainText('219,90');

    // Retorna para Todos (Total: R$ 2.060,20)
    const todosBtn = personGroup.locator('button:has-text("Todos")');
    await todosBtn.click();
    await expect(todosBtn).toHaveAttribute('aria-pressed', 'true');
    await page.waitForTimeout(300);

    const todosRow = srTable.locator(`tr[data-month="${currentMonth}"]`);
    await expect(todosRow).toContainText('2.060,20');
  });

  test('6. Snippet de console real: executado via page.evaluate popula a aplicação fielmente', async ({ page }) => {
    // Começa sem dados prévios (visita direta à dashboard)
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Obtém o snippet canônico exato gerado por demoData.js
    const currentMonth = new Date().toISOString().slice(0, 7);
    const snippetCode = generateConsoleSnippet(currentMonth);

    // Executa o snippet na página como o usuário faria no Console F12
    const snippetResult = await page.evaluate(snippetCode);
    expect(snippetResult.status).toBe('success');
    expect(snippetResult.loansCount).toBe(4);
    expect(snippetResult.clientsCount).toBe(3);

    // Aguarda o recarregamento assíncrono disparado pelo snippet
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1400);

    // Confirma que os valores foram devidamente hidratados na UI
    const faturaHeading = page.getByRole('heading', { name: 'Fatura Total do Mês' });
    await expect(faturaHeading).toBeVisible();

    const faturaCard = faturaHeading.locator('xpath=ancestor::div[contains(@class, "fc-kpi-card")][1]');
    const faturaValue = faturaCard.locator('p').first();
    await expect(faturaValue).toContainText('2.060,20');

    // Gráfico de evolução presente com dados reais
    const chartCard = page.locator('.fc-monthly-evolution-chart');
    await expect(chartCard).toBeVisible();
    const currentMonthRow = chartCard.locator('table.sr-only').locator(`tr[data-month="${currentMonth}"]`);
    await expect(currentMonthRow).toContainText('2.060,20');
  });

  test('7. Sob prefers-reduced-motion, renderização do gráfico e KPIs ocorre sem delays', async ({ page }) => {
    await setupMockSession(page, { reducedMotion: true });
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const faturaHeading = page.getByRole('heading', { name: 'Fatura Total do Mês' });
    await expect(faturaHeading).toBeVisible();
    const faturaCard = faturaHeading.locator('xpath=ancestor::div[contains(@class, "fc-kpi-card")][1]');
    const faturaValue = faturaCard.locator('p').first();
    await expect(faturaValue).toContainText('2.060,20');

    const chartCard = page.locator('.fc-monthly-evolution-chart');
    await expect(chartCard).toBeVisible();
  });

  test('8. Usuário sem plano Pro visualiza o ProFeatureLock sobre o gráfico de evolução mensal', async ({ page }) => {
    await setupMockSession(page, { plan: 'free' });
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    const chartCard = page.locator('.fc-monthly-evolution-chart');
    await expect(chartCard).toBeVisible();

    const proLock = chartCard.locator('.fc-pro-feature-lock, [data-pro-feature-lock="true"]');
    await expect(proLock).toBeVisible();
    await expect(proLock).toContainText(/Pro/i);
  });
});
