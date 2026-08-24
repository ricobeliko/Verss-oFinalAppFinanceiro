// tests/advancedIntelligence.test.js
import { describe, it, expect } from 'vitest';
import {
    generateFinancialAlerts,
    detectExpenseAnomalies,
    calculateCategoryBudgetsProgress,
    calculateFutureCommitments,
    calculateInstallments
} from '../src/services/financialService';

describe('Advanced Financial Intelligence - Anomalias, Preferências, Simulador e Budgets', () => {

    describe('LOTE 1: Preferências de Alertas (notificationSettings)', () => {
        const mockCards = [{ id: 'card-1', name: 'Black Card', dueDay: 15, limit: 5000 }];
        const mockLoans = [{
            id: 'loan-1',
            cardId: 'card-1',
            totalValue: 500,
            installments: [{ dueDate: '2026-08-15', value: 500, status: 'Pendente' }]
        }];

        it('deve respeitar desativação de alerta de vencimento quando cardDueEnabled = false', () => {
            const alertsEnabled = generateFinancialAlerts({
                selectedMonth: '2026-08',
                cards: mockCards,
                loans: mockLoans,
                todayStr: '2026-08-13',
                notificationSettings: { cardDueEnabled: true }
            });
            expect(alertsEnabled.some(a => a.type === 'card_due')).toBe(true);

            const alertsDisabled = generateFinancialAlerts({
                selectedMonth: '2026-08',
                cards: mockCards,
                loans: mockLoans,
                todayStr: '2026-08-13',
                notificationSettings: { cardDueEnabled: false }
            });
            expect(alertsDisabled.some(a => a.type === 'card_due')).toBe(false);
        });

        it('deve respeitar janela customizada de antecedência (ex: cardDueDays = 5 dias)', () => {
            // Hoje é dia 10, vencimento dia 15 (5 dias de diferença)
            const alertsDefault = generateFinancialAlerts({
                selectedMonth: '2026-08',
                cards: mockCards,
                loans: mockLoans,
                todayStr: '2026-08-10',
                notificationSettings: { cardDueDays: 3 } // Default 3 dias não deve disparar
            });
            expect(alertsDefault.some(a => a.type === 'card_due')).toBe(false);

            const alertsCustom = generateFinancialAlerts({
                selectedMonth: '2026-08',
                cards: mockCards,
                loans: mockLoans,
                todayStr: '2026-08-10',
                notificationSettings: { cardDueDays: 5 } // Custom 5 dias dispara
            });
            expect(alertsCustom.some(a => a.type === 'card_due')).toBe(true);
        });
    });

    describe('LOTE 2: Detecção Determinística de Anomalias de Gastos', () => {
        it('deve detectar anomalia quando gasto atual supera média em > 50% e diferença >= piso mínimo', () => {
            // Histórico M-3 (Maio: 600), M-2 (Junho: 700), M-1 (Julho: 650) -> Média = 650
            const expenses = [
                { category: 'Alimentação', value: 600.00, date: '2026-05-10' },
                { category: 'Alimentação', value: 700.00, date: '2026-06-10' },
                { category: 'Alimentação', value: 650.00, date: '2026-07-10' },
                // Mês Atual (Agosto: 1020) -> Diff = 370 (> 150), Aumento = +56.9% (> 50%)
                { category: 'Alimentação', value: 1020.00, date: '2026-08-10' }
            ];

            const anomalies = detectExpenseAnomalies({
                selectedMonth: '2026-08',
                expenses,
                loans: []
            });

            expect(anomalies).toHaveLength(1);
            expect(anomalies[0].category).toBe('Alimentação');
            expect(anomalies[0].currentTotal).toBe(1020.00);
            expect(anomalies[0].historicalAverage).toBe(650.00);
            expect(anomalies[0].difference).toBe(370.00);
            expect(anomalies[0].percentageIncrease).toBe(56.9);
        });

        it('não deve disparar anomalia quando a diferença for inferior ao piso mínimo (ex: R$ 2 para R$ 4 = +100%, mas difere apenas R$ 2)', () => {
            const expenses = [
                { category: 'Streaming', value: 2.00, date: '2026-05-10' },
                { category: 'Streaming', value: 2.00, date: '2026-06-10' },
                { category: 'Streaming', value: 2.00, date: '2026-07-10' },
                { category: 'Streaming', value: 4.00, date: '2026-08-10' }
            ];

            const anomalies = detectExpenseAnomalies({
                selectedMonth: '2026-08',
                expenses,
                loans: [],
                minimumDifferenceCents: 15000 // R$ 150,00
            });

            expect(anomalies).toHaveLength(0);
        });

        it('não deve disparar anomalia quando não houver histórico anterior suficiente', () => {
            const expenses = [
                { category: 'Nova Categoria', value: 2000.00, date: '2026-08-10' }
            ];

            const anomalies = detectExpenseAnomalies({
                selectedMonth: '2026-08',
                expenses,
                loans: []
            });

            expect(anomalies).toHaveLength(0);
        });
    });

    describe('LOTE 3: Simulador Financeiro Sandbox (Garantia de Não Mutação)', () => {
        it('deve calcular impacto de compra simulada em memória sem modificar os dados originais', () => {
            const originalLoans = [
                { id: 'loan-1', totalValue: 600, installments: [{ dueDate: '2026-08-10', value: 600 }] }
            ];
            const originalLoansCopy = JSON.parse(JSON.stringify(originalLoans));

            // Simulação de compra 12x de R$ 100
            const simInsts = calculateInstallments({ totalValue: 1200, count: 12, startDate: '2026-08-10' });
            const clonedLoans = [
                ...originalLoans,
                { id: 'sim-loan', totalValue: 1200, installments: simInsts }
            ];

            const simFuture = calculateFutureCommitments({
                loans: clonedLoans,
                subscriptions: [],
                startMonth: '2026-08',
                monthsCount: 3
            });

            expect(simFuture[0].totalCommitted).toBe(700.00); // 600 + 100
            expect(simFuture[1].totalCommitted).toBe(100.00); // 100

            // Garante que o array original de dados não foi mutado
            expect(originalLoans).toEqual(originalLoansCopy);
        });
    });

    describe('LOTE 4: Orçamentos por Categoria (Budgets)', () => {
        it('deve calcular corretamente status normal, warning (>= 80%) e exceeded (>= 100%)', () => {
            const budgets = {
                Alimentação: 1000.00,
                Transporte: 500.00,
                Lazer: 300.00
            };

            const expenses = [
                { category: 'Alimentação', value: 850.00, date: '2026-08-05' }, // 85% -> warning
                { category: 'Transporte', value: 200.00, date: '2026-08-06' },  // 40% -> normal
                { category: 'Lazer', value: 350.00, date: '2026-08-07' }        // 116.7% -> exceeded
            ];

            const progress = calculateCategoryBudgetsProgress({
                budgets,
                expenses,
                loans: [],
                selectedMonth: '2026-08'
            });

            expect(progress).toHaveLength(3);

            const lazer = progress.find(p => p.category === 'Lazer');
            expect(lazer.status).toBe('exceeded');
            expect(lazer.spent).toBe(350.00);
            expect(lazer.remaining).toBe(0.00);
            expect(lazer.percentage).toBe(116.7);

            const alimentacao = progress.find(p => p.category === 'Alimentação');
            expect(alimentacao.status).toBe('warning');
            expect(alimentacao.spent).toBe(850.00);
            expect(alimentacao.remaining).toBe(150.00);
            expect(alimentacao.percentage).toBe(85.0);

            const transporte = progress.find(p => p.category === 'Transporte');
            expect(transporte.status).toBe('normal');
            expect(transporte.spent).toBe(200.00);
            expect(transporte.remaining).toBe(300.00);
            expect(transporte.percentage).toBe(40.0);
        });

        it('deve retornar lista vazia de forma segura se o usuário não possuir budgets cadastrados', () => {
            const progress = calculateCategoryBudgetsProgress({
                budgets: {},
                expenses: [{ category: 'Alimentação', value: 500, date: '2026-08-05' }],
                selectedMonth: '2026-08'
            });
            expect(progress).toEqual([]);
        });
    });
});
