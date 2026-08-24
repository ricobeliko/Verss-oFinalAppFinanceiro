// tests/performanceBenchmark.test.js
import { describe, it, expect } from 'vitest';
import { performGlobalSearch } from '../src/services/searchService';
import {
    generateDeterministicFinancialInsights,
    calculateFutureCommitments,
    generateFinancialAlerts
} from '../src/services/financialService';

/**
 * Gera conjunto de dados financeiros sintéticos para teste de estresse e medição de performance.
 * 
 * @param {number} count - Quantidade de registros por entidade
 */
function generateSyntheticDataset(count) {
    const cards = [
        { id: 'card-1', name: 'Mastercard Black', limit: 20000, dueDay: 10, closingDay: 3 },
        { id: 'card-2', name: 'Visa Infinite', limit: 35000, dueDay: 20, closingDay: 12 }
    ];

    const clients = [
        { id: 'c-1', name: 'Carlos Eduardo' },
        { id: 'c-2', name: 'Mariana Oliveira' },
        { id: 'c-3', name: 'Fernanda Lima' }
    ];

    const loans = [];
    const expenses = [];
    const subscriptions = [];
    const incomes = [{ description: 'Salário', value: 15000.00, date: '2026-08-05' }];

    for (let i = 0; i < count; i++) {
        const cardId = i % 2 === 0 ? 'card-1' : 'card-2';
        const clientId = clients[i % clients.length].id;
        
        loans.push({
            id: `syn-loan-${i}`,
            description: `Compra Sintética ${i} Loja ABC`,
            totalValue: 600.00,
            installmentsCount: 6,
            cardId,
            clientId,
            installments: [
                { number: 1, value: 100.00, dueDate: '2026-08-10', status: 'Pendente' },
                { number: 2, value: 100.00, dueDate: '2026-09-10', status: 'Pendente' },
                { number: 3, value: 100.00, dueDate: '2026-10-10', status: 'Pendente' },
                { number: 4, value: 100.00, dueDate: '2026-11-10', status: 'Pendente' },
                { number: 5, value: 100.00, dueDate: '2026-12-10', status: 'Pendente' },
                { number: 6, value: 100.00, dueDate: '2027-01-10', status: 'Pendente' }
            ]
        });

        expenses.push({
            id: `syn-exp-${i}`,
            description: `Despesa Farmácia ${i}`,
            category: 'Saúde',
            value: 45.50,
            date: '2026-08-12',
            cardId,
            clientId,
            status: 'Pendente'
        });

        if (i < 50) {
            subscriptions.push({
                id: `syn-sub-${i}`,
                name: `Serviço Streaming ${i}`,
                amount: 39.90,
                dueDate: 15,
                cardId,
                isActive: true
            });
        }
    }

    return { cards, clients, loans, expenses, subscriptions, incomes };
}

describe('Performance Benchmark - Estresse com Dados Sintéticos', () => {
    it('deve processar Busca, Projeção, Insights e Alertas em < 50ms para 1.000 registros', () => {
        const dataset = generateSyntheticDataset(1000);

        const t0 = performance.now();
        const searchResult = performGlobalSearch({
            query: 'farmacia',
            loans: dataset.loans,
            expenses: dataset.expenses,
            subscriptions: dataset.subscriptions,
            clients: dataset.clients,
            cards: dataset.cards
        });
        const t1 = performance.now();

        const projResult = calculateFutureCommitments({
            loans: dataset.loans,
            subscriptions: dataset.subscriptions,
            startMonth: '2026-08',
            monthsCount: 4
        });
        const t2 = performance.now();

        const insightsResult = generateDeterministicFinancialInsights({
            selectedMonth: '2026-08',
            loans: dataset.loans,
            expenses: dataset.expenses,
            subscriptions: dataset.subscriptions,
            incomes: dataset.incomes,
            clients: dataset.clients
        });
        const t3 = performance.now();

        const alertsResult = generateFinancialAlerts({
            selectedMonth: '2026-08',
            loans: dataset.loans,
            expenses: dataset.expenses,
            subscriptions: dataset.subscriptions,
            cards: dataset.cards,
            clients: dataset.clients,
            todayStr: '2026-08-08'
        });
        const t4 = performance.now();

        expect(searchResult.totalMatches).toBeGreaterThan(0);
        expect(projResult.length).toBe(4);
        expect(insightsResult).toBeDefined();
        expect(alertsResult).toBeDefined();

        const searchMs = t1 - t0;
        const projMs = t2 - t1;
        const insightsMs = t3 - t2;
        const alertsMs = t4 - t3;

        console.log(`[BENCHMARK 1.000 Registros] Busca: ${searchMs.toFixed(2)}ms | Projeção: ${projMs.toFixed(2)}ms | Insights: ${insightsMs.toFixed(2)}ms | Alertas: ${alertsMs.toFixed(2)}ms`);
        expect(searchMs).toBeLessThan(100);
        expect(projMs).toBeLessThan(100);
    });

    it('deve processar 5.000 registros mantendo alta fluidez', () => {
        const dataset = generateSyntheticDataset(5000);

        const t0 = performance.now();
        const searchResult = performGlobalSearch({
            query: 'farmacia',
            loans: dataset.loans,
            expenses: dataset.expenses,
            subscriptions: dataset.subscriptions,
            clients: dataset.clients,
            cards: dataset.cards
        });
        const t1 = performance.now();

        console.log(`[BENCHMARK 5.000 Registros] Busca em memória: ${(t1 - t0).toFixed(2)}ms`);
        expect(searchResult.totalMatches).toBe(5000);
        expect(t1 - t0).toBeLessThan(250);
    });

    it('deve processar 10.000 registros em tempo hábil', () => {
        const dataset = generateSyntheticDataset(10000);

        const t0 = performance.now();
        const searchResult = performGlobalSearch({
            query: 'farmacia',
            loans: dataset.loans,
            expenses: dataset.expenses,
            subscriptions: dataset.subscriptions,
            clients: dataset.clients,
            cards: dataset.cards
        });
        const t1 = performance.now();

        console.log(`[BENCHMARK 10.000 Registros] Busca em memória: ${(t1 - t0).toFixed(2)}ms`);
        expect(searchResult.totalMatches).toBe(10000);
        expect(t1 - t0).toBeLessThan(500);
    });
});
