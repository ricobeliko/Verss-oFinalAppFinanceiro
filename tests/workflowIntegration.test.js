// tests/workflowIntegration.test.js
import { describe, it, expect, beforeEach } from 'vitest';
import {
    calculateInstallments,
    calculateConsolidatedClientReceivables,
    calculateFutureCommitments,
    calculateCardLimitIntelligence
} from '../src/services/financialService';
import { performGlobalSearch } from '../src/services/searchService';
import { generateTransactionsCsv, generateAnnualReportCsv } from '../src/services/csvExportService';

/**
 * Testes de Integração de Workflows de Negócio do FinControl.
 * Valida a cadeia completa de interação, estado e sincronização de dados
 * com dados sintéticos e isolamento 100% estrito de produção.
 */
describe('Workflow Integration - Fluxos de Negócio e Cálculos Integrados', () => {
    let mockAppState;

    beforeEach(() => {
        mockAppState = {
            currentUser: { uid: 'integration-user-sintetico', email: 'integration-tester@fincontrol.local', plan: 'free' },
            cards: [],
            clients: [],
            loans: [],
            expenses: [],
            subscriptions: [],
            incomes: []
        };
    });

    it('Fluxo Integrado 1: Autenticação -> Criação de Cartão -> Cadastro de Compra Parcelada', () => {
        expect(mockAppState.currentUser.uid).toBe('integration-user-sintetico');

        const newCard = {
            id: 'card-int-black',
            name: 'Mastercard Black',
            limit: 10000.00,
            closingDay: 5,
            dueDay: 15,
            color: '#F2B705'
        };
        mockAppState.cards.push(newCard);
        expect(mockAppState.cards).toHaveLength(1);

        const installments = calculateInstallments({ totalValue: 6000.00, count: 10, startDate: '2026-08-15' });
        expect(installments).toHaveLength(10);
        expect(installments[0].value).toBe(600.00);

        const newLoan = {
            id: 'loan-int-iphone',
            description: 'iPhone 15 Pro Max',
            totalValue: 6000.00,
            installmentsCount: 10,
            cardId: newCard.id,
            installments: installments,
            status: 'Pendente'
        };
        mockAppState.loans.push(newLoan);

        const limitInfo = calculateCardLimitIntelligence({
            card: newCard,
            loans: mockAppState.loans,
            expenses: mockAppState.expenses
        });

        expect(limitInfo.registeredLimit).toBe(10000.00);
        expect(limitInfo.committedAmount).toBe(6000.00);
        expect(limitInfo.estimatedAvailable).toBe(4000.00);
        expect(limitInfo.utilizationPercentage).toBe(60);
    });

    it('Fluxo Integrado 2: Pessoa Vinculada -> Compra Compartilhada -> Central de Repasses', () => {
        const newClient = { id: 'client-int-maria', name: 'Maria Souza' };
        mockAppState.clients.push(newClient);

        const p1Insts = calculateInstallments({ totalValue: 1000.00, count: 4, startDate: '2026-08-15' });
        const p2Insts = calculateInstallments({ totalValue: 1000.00, count: 4, startDate: '2026-08-15' });

        const sharedLoan = {
            id: 'loan-int-sofa',
            description: 'Sofá Retrátil',
            totalValue: 2000.00,
            isShared: true,
            sharedDetails: {
                person1: { clientId: 'titular', shareAmount: 1000.00, installments: p1Insts },
                person2: { clientId: newClient.id, shareAmount: 1000.00, installments: p2Insts }
            }
        };
        mockAppState.loans.push(sharedLoan);

        const receivables = calculateConsolidatedClientReceivables({
            loans: mockAppState.loans,
            expenses: mockAppState.expenses,
            subscriptions: mockAppState.subscriptions,
            clients: mockAppState.clients,
            targetMonth: '2026-08'
        });

        expect(receivables.totalPendingThisMonth).toBe(250.00);
        const mariaReceivable = receivables.byClient.find(c => c.clientId === newClient.id);
        expect(mariaReceivable).toBeDefined();
        expect(mariaReceivable.pendingThisMonth).toBe(250.00);
        expect(mariaReceivable.totalFutureRemaining).toBe(750.00);
    });

    it('Fluxo Integrado 3: Quitação de Parcela -> Atualização de Fatura e Alívio de Fluxo', () => {
        const insts = [
            { number: 1, value: 500.00, dueDate: '2026-08-10', status: 'Pendente' },
            { number: 2, value: 500.00, dueDate: '2026-09-10', status: 'Pendente' }
        ];
        const loan = { id: 'loan-1', installments: insts, totalValue: 1000.00 };
        mockAppState.loans.push(loan);

        insts[0].status = 'Paga';

        const future = calculateFutureCommitments({
            loans: mockAppState.loans,
            subscriptions: [],
            startMonth: '2026-08',
            monthsCount: 3
        });

        expect(future[0].totalCommitted).toBe(500.00);
        expect(future[1].totalCommitted).toBe(500.00);
        expect(future[2].totalCommitted).toBe(0.00);
    });

    it('Fluxo Integrado 4: Busca Global -> Encontrar Lançamentos por Nome e Cartão', () => {
        mockAppState.cards.push({ id: 'card-1', name: 'Nubank Ultravioleta' });
        mockAppState.loans.push({
            id: 'l-1',
            description: 'Passagem Aérea Salvador',
            cardId: 'card-1',
            totalValue: 1500.00
        });

        const searchRes = performGlobalSearch({
            query: 'salvador',
            loans: mockAppState.loans,
            cards: mockAppState.cards
        });

        expect(searchRes.totalMatches).toBe(1);
        expect(searchRes.results.loans[0].title).toBe('Passagem Aérea Salvador');
    });

    it('Fluxo Integrado 5: Exportação Completa de Extrato Mensal e Anual', () => {
        mockAppState.incomes.push({ description: 'Salário', value: 8000.00, date: '2026-08-01' });
        mockAppState.expenses.push({ description: 'Mercado', value: 650.00, date: '2026-08-05' });

        const monthlyCsv = generateTransactionsCsv([
            { type: 'Receita', date: '2026-08-01', description: 'Salário', value: 8000.00 },
            { type: 'Despesa', date: '2026-08-05', description: 'Mercado', value: 650.00 }
        ]);
        expect(monthlyCsv).toContain('"Salário"');
        expect(monthlyCsv).toContain('"Mercado"');

        const annualCsv = generateAnnualReportCsv({
            targetYear: '2026',
            incomes: mockAppState.incomes,
            expenses: mockAppState.expenses,
            loans: mockAppState.loans
        });
        expect(annualCsv).toContain('EXERCÍCIO 2026');
        expect(annualCsv).toContain('"Total de Receitas no Ano";"8000,00"');
    });
});
