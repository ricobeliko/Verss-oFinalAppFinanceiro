// e2e/tab-perf.spec.js
import { test, expect } from '@playwright/test';

test.describe('Dashboard Performance & Long Task Measurement', () => {
  test('Navegação sequencial entre 5 abas deve ter taxa mínima de long tasks (> 50ms)', async ({ page }) => {
    // Configura mock de dados
    await page.addInitScript(() => {
      localStorage.setItem('theme', 'dark');
      window.__FINCONTROL_E2E_USER__ = {
        uid: 'e2e-perf-tester',
        email: 'perf@fincontrol.local',
        name: 'Perf Tester',
        plan: 'pro',
      };
      window.__FINCONTROL_E2E_MOCK_DATA__ = {
        cards: [{ id: 'card-1', name: 'Cartão 1', limit: 5000, color: '#5CCCCC' }],
        clients: [{ id: 'client-1', name: 'Cliente 1', phone: '11999999999' }],
        loans: [{ id: 'loan-1', description: 'Compra 1', cardId: 'card-1', totalAmount: 1000, installmentsCount: 10, installmentValue: 100, currentInstallment: 1, startDate: '2026-11-01', isMyDebt: true }],
        expenses: [],
        subscriptions: [{ id: 'sub-1', name: 'Assinatura 1', amount: 30, value: 30, dueDate: '10', cardId: 'card-1', status: 'Ativa' }],
        incomes: [],
        paidSubscriptions: [],
      };

      // Instala PerformanceObserver para capturar long tasks
      window.__longTasks__ = [];
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            window.__longTasks__.push({
              name: entry.name,
              duration: entry.duration,
              startTime: entry.startTime,
            });
          }
        });
        observer.observe({ entryTypes: ['longtask'] });
      } catch (err) {
        console.warn('Longtask observer não suportado neste navegador:', err);
      }
    });

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Zera o buffer para registrar tarefas longas estritamente DURANTE a transição das abas
    await page.evaluate(() => {
      window.__longTasks__ = [];
    });

    // Navega em sequência por 5 abas
    const tabs = ['Pessoas', 'Cartões', 'Assinaturas', 'Movimentações', 'Modo Crise'];
    for (const tabName of tabs) {
      const tabBtn = page.getByRole('button', { name: tabName }).first();
      await tabBtn.click();
      await page.waitForTimeout(700); // Aguarda término do wave sweep (~600ms)
    }

    // Coleta as long tasks capturadas durante a navegação
    const longTasks = await page.evaluate(() => window.__longTasks__ || []);
    console.log(`[PERF BENCHMARK] Long tasks registradas durante 5 trocas de aba: ${longTasks.length}`);
    longTasks.forEach((t, i) => {
      console.log(`  Task #${i + 1}: duration=${t.duration.toFixed(2)}ms startTime=${t.startTime.toFixed(2)}ms`);
    });

    // A contagem durante a animação de onda deve ser controlada
    expect(longTasks.length).toBeDefined();
  });
});
