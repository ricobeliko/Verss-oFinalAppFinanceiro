// tests/executiveSummary.test.js
import { describe, it, expect } from 'vitest';
import {
    generateWeeklyFinancialSummary,
    generateMonthlyFinancialSummary
} from '../src/services/financialService';

describe('Executive Summaries - Resumos Determinísticos Semanal e Mensal', () => {
    describe('generateWeeklyFinancialSummary', () => {
        it('deve retornar zeros com segurança quando listas estiverem vazias', () => {
            const res = generateWeeklyFinancialSummary({
                loans: [],
                expenses: [],
                subscriptions: [],
                incomes: [],
                todayStr: '2026-08-24'
            });

            expect(res.pastWeekIncomes).toBe(0);
            expect(res.pastWeekExpenses).toBe(0);
            expect(res.pastWeekNet).toBe(0);
            expect(res.upcomingInstallments).toBe(0);
            expect(res.upcomingSubscriptions).toBe(0);
            expect(res.upcomingCommitmentsTotal).toBe(0);
            expect(res.hasUpcomingCommitments).toBe(false);
            expect(res.window.past.end).toBe('2026-08-24');
            expect(res.window.past.start).toBe('2026-08-18');
        });

        it('deve computar entradas dos últimos 7 dias e compromissos dos próximos 7 dias com exatidão', () => {
            const incomes = [
                { date: '2026-08-20', value: 3500.00 }, // No período passado
                { date: '2026-08-10', value: 1000.00 }  // Fora do período
            ];

            const expenses = [
                { date: '2026-08-22', value: 150.00 },  // No período passado
                { date: '2026-08-01', value: 400.00 }   // Fora do período
            ];

            const loans = [{
                id: 'l-1',
                installments: [
                    { number: 1, value: 300.00, dueDate: '2026-08-26', status: 'Pendente' }, // Próximos 7 dias (24 a 31)
                    { number: 2, value: 300.00, dueDate: '2026-09-26', status: 'Pendente' }  // Fora
                ]
            }];

            const subscriptions = [
                { id: 's-1', name: 'Spotify', amount: 34.90, dueDate: '28', isActive: true } // Dia 28 -> 2026-08-28 (próximos 7 dias)
            ];

            const res = generateWeeklyFinancialSummary({
                loans,
                expenses,
                subscriptions,
                incomes,
                todayStr: '2026-08-24'
            });

            expect(res.pastWeekIncomes).toBe(3500.00);
            expect(res.pastWeekExpenses).toBe(150.00);
            expect(res.pastWeekNet).toBe(3350.00);
            expect(res.upcomingInstallments).toBe(300.00);
            expect(res.upcomingSubscriptions).toBe(34.90);
            expect(res.upcomingCommitmentsTotal).toBe(334.90);
            expect(res.hasUpcomingCommitments).toBe(true);
        });
    });

    describe('generateMonthlyFinancialSummary', () => {
        it('deve gerar resumo mensal consolidando MoM, top categoria e repasses', () => {
            const incomes = [{ date: '2026-08-05', value: 8000.00 }];
            const expenses = [
                { category: 'Alimentação', value: 1200.00, date: '2026-08-02' },
                { category: 'Transporte', value: 300.00, date: '2026-08-03' }
            ];
            const loans = [{
                id: 'loan-1',
                category: 'Eletrônicos',
                installments: [{ number: 1, value: 500.00, dueDate: '2026-08-10', status: 'Pendente' }]
            }];
            const clients = [{ id: 'c-1', name: 'Pedro' }];

            const res = generateMonthlyFinancialSummary({
                selectedMonth: '2026-08',
                loans,
                expenses,
                subscriptions: [],
                incomes,
                clients
            });

            expect(res.competence).toBe('2026-08');
            expect(res.summary.totalIncome).toBe(8000.00);
            expect(res.summary.totalInvoice).toBe(500.00);
            expect(res.summary.totalExpenses).toBe(1500.00);
            expect(res.summary.netBalance).toBe(6000.00);
            expect(res.topCategory).toBeDefined();
            expect(res.topCategory.name).toBe('Alimentação');
        });
    });
});
