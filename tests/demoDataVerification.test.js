import { describe, it, expect } from 'vitest';
import { getDemoData } from '../e2e/fixtures/demoData.js';
import { calculateInvoiceBreakdownForMonth, calculateMonthlySeries } from '../src/services/financialService.js';

describe('Demo Data Numerical Verification', () => {
  it('computes exact expected numbers for base month 2026-11', () => {
    const baseMonth = '2026-11';
    const data = getDemoData(baseMonth);

    const breakdownAll = calculateInvoiceBreakdownForMonth({
      targetMonth: baseMonth,
      loans: data.loans,
      subscriptions: data.subscriptions,
      expenses: data.expenses,
      cards: data.cards,
      personId: 'all',
      cardId: 'all',
    });

    expect(breakdownAll.totalCommitted).toBe(2060.2);
    expect(breakdownAll.installmentsTotal).toBe(1300.0);
    expect(breakdownAll.subscriptionsTotal).toBe(114.7);
    expect(breakdownAll.expensesTotal).toBe(645.5);

    const series6m = calculateMonthlySeries({
      loans: data.loans,
      subscriptions: data.subscriptions,
      expenses: data.expenses,
      cards: data.cards,
      endMonth: baseMonth,
      monthsBack: 3,
      monthsForward: 2,
      personId: 'all',
      cardId: 'all',
    });

    expect(series6m).toHaveLength(6);
    const cur = series6m.find((p) => p.isCurrent);
    expect(cur.totalCommitted).toBe(2060.2);
    expect(cur.installmentsTotal).toBe(1300.0);
    expect(cur.subscriptionsTotal).toBe(114.7);
    expect(cur.expensesTotal).toBe(645.5);

    // Verificação de Mariana
    const breakdownMariana = calculateInvoiceBreakdownForMonth({
      targetMonth: baseMonth,
      loans: data.loans,
      subscriptions: data.subscriptions,
      expenses: data.expenses,
      cards: data.cards,
      personId: 'client-1',
      cardId: 'all',
    });
    expect(breakdownMariana.totalCommitted).toBe(1010.4);
    expect(breakdownMariana.installmentsTotal).toBe(600.0);
    expect(breakdownMariana.subscriptionsTotal).toBe(59.9);
    expect(breakdownMariana.expensesTotal).toBe(350.5);

    // Verificação de Nubank (card-1)
    const breakdownCard1 = calculateInvoiceBreakdownForMonth({
      targetMonth: baseMonth,
      loans: data.loans,
      subscriptions: data.subscriptions,
      expenses: data.expenses,
      cards: data.cards,
      personId: 'all',
      cardId: 'card-1',
    });
    expect(breakdownCard1.totalCommitted).toBe(1115.3);
  });
});
