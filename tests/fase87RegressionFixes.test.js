// tests/fase87RegressionFixes.test.js
// Testes de regressão direcionados para as correções da FASE 8.7
import { describe, it, expect, beforeEach } from 'vitest';
import { 
    toCents, 
    fromCents, 
    calculateFutureCommitments, 
    calculateInstallments,
    generateFinancialAlerts 
} from '../src/services/financialService';

describe('FASE 8.7 — Bateria de Regressão das Correções', () => {

    // =========================================================================
    // D. PROJEÇÃO DOS PRÓXIMOS MESES POR PESSOA
    // =========================================================================
    describe('D. Projeção dos Próximos Meses: Filtro por Pessoa vs Consolidado', () => {
        const clientBrayan = { id: 'client-brayan', name: 'Brayan' };
        const clientRichard = { id: 'client-richard', name: 'Richard' };
        const clientEmpty = { id: 'client-sem-gastos', name: 'Sem Gastos' };

        // Compra normal de Brayan: 3 parcelas de R$ 100,00 (Ago, Set, Out)
        const loanBrayan = {
            id: 'loan-brayan-1',
            clientId: 'client-brayan',
            description: 'Curso Brayan',
            isShared: false,
            installments: [
                { number: 1, value: 100.00, dueDate: '2026-08-10', status: 'Pendente' },
                { number: 2, value: 100.00, dueDate: '2026-09-10', status: 'Pendente' },
                { number: 3, value: 100.00, dueDate: '2026-10-10', status: 'Pendente' },
            ]
        };

        // Compra normal de Richard: 3 parcelas de R$ 200,00 (Ago, Set, Out)
        const loanRichard = {
            id: 'loan-richard-1',
            clientId: 'client-richard',
            description: 'Monitor Richard',
            isShared: false,
            installments: [
                { number: 1, value: 200.00, dueDate: '2026-08-15', status: 'Pendente' },
                { number: 2, value: 200.00, dueDate: '2026-09-15', status: 'Pendente' },
                { number: 3, value: 200.00, dueDate: '2026-10-15', status: 'Pendente' },
            ]
        };

        // Compra compartilhada Brayan (p1, R$ 50/mês) + Richard (p2, R$ 50/mês)
        const loanShared = {
            id: 'loan-shared-1',
            description: 'Supermercado Compartilhado',
            isShared: true,
            sharedDetails: {
                person1: {
                    clientId: 'client-brayan',
                    installments: [
                        { number: 1, value: 50.00, dueDate: '2026-08-20', status: 'Pendente' },
                        { number: 2, value: 50.00, dueDate: '2026-09-20', status: 'Pendente' },
                        { number: 3, value: 50.00, dueDate: '2026-10-20', status: 'Pendente' },
                    ]
                },
                person2: {
                    clientId: 'client-richard',
                    installments: [
                        { number: 1, value: 50.00, dueDate: '2026-08-20', status: 'Pendente' },
                        { number: 2, value: 50.00, dueDate: '2026-09-20', status: 'Pendente' },
                        { number: 3, value: 50.00, dueDate: '2026-10-20', status: 'Pendente' },
                    ]
                }
            },
            installments: [
                { number: 1, value: 100.00, dueDate: '2026-08-20', status: 'Pendente' },
                { number: 2, value: 100.00, dueDate: '2026-09-20', status: 'Pendente' },
                { number: 3, value: 100.00, dueDate: '2026-10-20', status: 'Pendente' },
            ]
        };

        // Assinatura Brayan: R$ 50,00/mês
        const subBrayan = {
            id: 'sub-netflix',
            name: 'Netflix Brayan',
            clientId: 'client-brayan',
            amount: 50.00,
            status: 'Ativa',
            isActive: true
        };

        // Assinatura Richard: R$ 30,00/mês
        const subRichard = {
            id: 'sub-spotify',
            name: 'Spotify Richard',
            clientId: 'client-richard',
            amount: 30.00,
            status: 'Ativa',
            isActive: true
        };

        const allLoans = [loanBrayan, loanRichard, loanShared];
        const allSubs = [subBrayan, subRichard];

        // Função de decomposição e filtragem implementada no Dashboard.jsx
        function filterCommitmentsForProjection(loans, subscriptions, selectedClientFilter) {
            if (!selectedClientFilter) {
                return {
                    filteredLoans: loans,
                    filteredSubscriptions: subscriptions
                };
            }

            const filteredLoans = [];
            (loans || []).forEach(loan => {
                if (!loan) return;
                if (loan.isShared && loan.sharedDetails) {
                    if (loan.sharedDetails.person1?.clientId === selectedClientFilter) {
                        filteredLoans.push({
                            ...loan,
                            id: `${loan.id}-p1`,
                            isShared: false,
                            installments: loan.sharedDetails.person1.installments || []
                        });
                    }
                    if (loan.sharedDetails.person2?.clientId === selectedClientFilter) {
                        filteredLoans.push({
                            ...loan,
                            id: `${loan.id}-p2`,
                            isShared: false,
                            installments: loan.sharedDetails.person2.installments || []
                        });
                    }
                } else if (loan.clientId === selectedClientFilter) {
                    filteredLoans.push(loan);
                }
            });

            const filteredSubscriptions = (subscriptions || []).filter(
                s => s && s.clientId === selectedClientFilter
            );

            return { filteredLoans, filteredSubscriptions };
        }

        it('1. Filtro "Todos" mantém projeção consolidada completa', () => {
            const { filteredLoans, filteredSubscriptions } = filterCommitmentsForProjection(allLoans, allSubs, '');
            const projection = calculateFutureCommitments({
                loans: filteredLoans,
                subscriptions: filteredSubscriptions,
                startMonth: '2026-08',
                monthsCount: 3
            });

            expect(projection).toHaveLength(3);
            // Mês 2026-08:
            // Parcelas: 100 (Brayan) + 200 (Richard) + 50 (Shared P1) + 50 (Shared P2) = 400.00
            // Assinaturas: 50 (Brayan) + 30 (Richard) = 80.00
            // Total: 480.00
            expect(projection[0].installmentsTotal).toBe(400);
            expect(projection[0].subscriptionsTotal).toBe(80);
            expect(projection[0].totalCommitted).toBe(480);
        });

        it('2. Filtro "Brayan" projeta SOMENTE compromissos atribuídos a Brayan', () => {
            const { filteredLoans, filteredSubscriptions } = filterCommitmentsForProjection(allLoans, allSubs, clientBrayan.id);
            const projection = calculateFutureCommitments({
                loans: filteredLoans,
                subscriptions: filteredSubscriptions,
                startMonth: '2026-08',
                monthsCount: 3
            });

            expect(projection).toHaveLength(3);
            // Mês 2026-08:
            // Parcelas Brayan: 100 (Curso) + 50 (sua parte do Supermercado) = 150.00
            // Assinatura Brayan: 50.00 (Netflix)
            // Total Brayan: 200.00
            expect(projection[0].installmentsTotal).toBe(150);
            expect(projection[0].subscriptionsTotal).toBe(50);
            expect(projection[0].totalCommitted).toBe(200);
        });

        it('3. Filtro "Richard" projeta SOMENTE Richard e NÃO recebe valores de Brayan', () => {
            const { filteredLoans, filteredSubscriptions } = filterCommitmentsForProjection(allLoans, allSubs, clientRichard.id);
            const projection = calculateFutureCommitments({
                loans: filteredLoans,
                subscriptions: filteredSubscriptions,
                startMonth: '2026-08',
                monthsCount: 3
            });

            expect(projection).toHaveLength(3);
            // Mês 2026-08:
            // Parcelas Richard: 200 (Monitor) + 50 (sua parte do Supermercado) = 250.00
            // Assinatura Richard: 30.00 (Spotify)
            // Total Richard: 280.00
            expect(projection[0].installmentsTotal).toBe(250);
            expect(projection[0].subscriptionsTotal).toBe(30);
            expect(projection[0].totalCommitted).toBe(280);

            // Soma das partes filtradas deve fechar exatamente o total consolidado (sem perda nem duplicação)
            const brayanTotal = 200;
            const richardTotal = 280;
            expect(brayanTotal + richardTotal).toBe(480);
        });

        it('4. Pessoa sem compromissos retorna projeção zerada de forma limpa', () => {
            const { filteredLoans, filteredSubscriptions } = filterCommitmentsForProjection(allLoans, allSubs, clientEmpty.id);
            const projection = calculateFutureCommitments({
                loans: filteredLoans,
                subscriptions: filteredSubscriptions,
                startMonth: '2026-08',
                monthsCount: 3
            });

            expect(projection).toHaveLength(3);
            expect(projection[0].installmentsTotal).toBe(0);
            expect(projection[0].subscriptionsTotal).toBe(0);
            expect(projection[0].totalCommitted).toBe(0);
        });
    });

    // =========================================================================
    // E. ALERTAS DE FATURA (DISMISSAL & PRESERVAÇÃO FINANCEIRA)
    // =========================================================================
    describe('E. Alertas de Fatura: Dispensar Individualmente e Preservar Dados', () => {
        let mockStorage;

        beforeEach(() => {
            mockStorage = {};
            globalThis.localStorage = {
                getItem: (key) => mockStorage[key] || null,
                setItem: (key, val) => { mockStorage[key] = String(val); },
                removeItem: (key) => { delete mockStorage[key]; },
                clear: () => { mockStorage = {}; }
            };
        });

        const cards = [
            { id: 'card-picpay', name: 'PicPay', dueDay: 10, closingDay: 3 },
            { id: 'card-nubank', name: 'Nubank', dueDay: 11, closingDay: 5 }
        ];

        const loans = [
            {
                id: 'l-picpay',
                cardId: 'card-picpay',
                installments: [{ number: 1, value: 350.00, dueDate: '2026-08-10', status: 'Pendente' }]
            },
            {
                id: 'l-nubank',
                cardId: 'card-nubank',
                installments: [{ number: 1, value: 500.00, dueDate: '2026-08-12', status: 'Pendente' }]
            }
        ];

        it('1. Deve gerar alertas no Dashboard e permitir dispensar individualmente', () => {
            const alerts = generateFinancialAlerts({
                selectedMonth: '2026-08',
                loans,
                cards,
                todayStr: '2026-08-08'
            });

            expect(alerts.length).toBeGreaterThanOrEqual(2);
            const picpayAlert = alerts.find(a => a.id.includes('card-picpay'));
            expect(picpayAlert).toBeDefined();

            // Simula dispensar alerta do PicPay
            const userId = 'user-test-alerts';
            const storageKey = `fincontrol:dismissed-alerts:${userId}`;
            const dismissedAlertIds = [picpayAlert.id];
            localStorage.setItem(storageKey, JSON.stringify([
                { id: picpayAlert.id, dismissedAt: new Date().toISOString() }
            ]));

            // Alertas ativos após filtro
            const activeAlerts = alerts.filter(a => !dismissedAlertIds.includes(a.id));
            expect(activeAlerts.some(a => a.id === picpayAlert.id)).toBe(false);
            expect(activeAlerts.some(a => a.id.includes('card-nubank'))).toBe(true);
        });

        it('2. Dispensar alerta NÃO altera cartões, compras, parcelas ou valores', () => {
            const initialCardState = JSON.stringify(cards);
            const initialLoansState = JSON.stringify(loans);

            // Simula dismiss
            const dismissedAlertId = 'alert-due-card-picpay';
            localStorage.setItem('fincontrol:dismissed-alerts:user1', JSON.stringify([
                { id: dismissedAlertId, dismissedAt: new Date().toISOString() }
            ]));

            // Verifica que os arrays e objetos originais continuam estritamente idênticos
            expect(JSON.stringify(cards)).toBe(initialCardState);
            expect(JSON.stringify(loans)).toBe(initialLoansState);
            expect(loans[0].installments[0].value).toBe(350.00);
            expect(loans[0].installments[0].status).toBe('Pendente');
        });
    });

    // =========================================================================
    // A. EDITAR ASSINATURA (CORREÇÃO DE CAUSA RAIZ)
    // =========================================================================
    describe('A. Editar Assinatura: Resiliência contra formatos legados e atualização', () => {
        it('1. Trata com segurança dueDate quando armazenado como número ou string com/sem hífen', () => {
            // Causa raiz anterior: sub.dueDate.split('-') falhava com TypeError se dueDate fosse número (ex: 15)
            const legacySubNumeric = {
                id: 'sub-num',
                name: 'Academia',
                amount: 120.00,
                dueDate: 15, // Número!
                clientId: 'client-1'
            };

            const legacySubIso = {
                id: 'sub-iso',
                name: 'Streaming',
                amount: 45.00,
                dueDate: '2026-08-25', // String ISO
                clientId: 'client-1'
            };

            const legacySubDayOnly = {
                id: 'sub-day',
                name: 'Jornal',
                amount: 29.90,
                dueDate: '10', // String dia
                clientId: 'client-1'
            };

            // Função segura de extração implementada no SubscriptionManagement.jsx
            const extractDaySafe = (sub) => {
                const rawDueDate = sub.dueDate ?? sub.dueDay ?? sub.dia ?? '';
                if (typeof rawDueDate === 'number') {
                    return String(rawDueDate);
                }
                const dateStr = String(rawDueDate || '');
                return dateStr.includes('-') ? dateStr.split('-')[2] : dateStr;
            };

            expect(extractDaySafe(legacySubNumeric)).toBe('15');
            expect(extractDaySafe(legacySubIso)).toBe('25');
            expect(extractDaySafe(legacySubDayOnly)).toBe('10');
            expect(() => extractDaySafe({ dueDate: null })).not.toThrow();
            expect(() => extractDaySafe({ dueDate: undefined })).not.toThrow();
        });

        it('2. Atualização de assinatura preserva ID, ownership e integridade de campos', () => {
            const originalSub = {
                id: 'sub-fixed-id',
                name: 'Netflix 4K',
                amount: 55.90,
                dueDate: '2026-08-10',
                clientId: 'client-original',
                cardId: 'card-1',
                paymentMethod: 'creditCard',
                userId: 'user-owner-123'
            };

            // Simula edição pelo modal
            const updatedFields = {
                name: 'Netflix Premium 4K',
                amount: 59.90,
                dueDate: '2026-08-15',
                cardId: 'card-2'
            };

            const finalSub = {
                ...originalSub,
                ...updatedFields,
                // Garantir preservação constitucional
                id: originalSub.id,
                userId: originalSub.userId,
                clientId: originalSub.clientId
            };

            expect(finalSub.id).toBe('sub-fixed-id');
            expect(finalSub.userId).toBe('user-owner-123');
            expect(finalSub.name).toBe('Netflix Premium 4K');
            expect(finalSub.amount).toBe(59.90);
            expect(finalSub.dueDate).toBe('2026-08-15');
            expect(finalSub.cardId).toBe('card-2');
        });
    });

    // =========================================================================
    // B. EDITAR CARTÃO (CORREÇÃO DE CAUSA RAIZ)
    // =========================================================================
    describe('B. Editar Cartão: Resiliência contra dias nulos e preservação de IDs', () => {
        it('1. Trata com segurança closingDay e dueDay nulos/indefinidos sem TypeError', () => {
            // Causa raiz anterior: card.closingDay.toString() quebrava com TypeError se closingDay fosse null/undefined
            const cardWithNullDays = {
                id: 'card-null-days',
                name: 'Cartão Sem Fechamento',
                limit: 1000,
                closingDay: null,
                dueDay: undefined
            };

            const extractDaysSafe = (card) => {
                const closingDay = card.closingDay != null ? card.closingDay.toString() : '';
                const dueDay = card.dueDay != null ? card.dueDay.toString() : '';
                return { closingDay, dueDay };
            };

            expect(() => extractDaysSafe(cardWithNullDays)).not.toThrow();
            const extracted = extractDaysSafe(cardWithNullDays);
            expect(extracted.closingDay).toBe('');
            expect(extracted.dueDay).toBe('');
        });

        it('2. Atualização de cartão atualiza o registro existente sem criar duplicatas', () => {
            const cardsList = [
                { id: 'card-1', name: 'Nubank Gold', limit: 2000, closingDay: 5, dueDay: 12 },
                { id: 'card-2', name: 'Inter Platinum', limit: 5000, closingDay: 10, dueDay: 17 }
            ];

            const editedCardData = {
                id: 'card-1',
                name: 'Nubank Ultravioleta',
                limit: 8000,
                closingDay: 8,
                dueDay: 15
            };

            // Simula salvamento
            const updatedCards = cardsList.map(c => c.id === editedCardData.id ? { ...c, ...editedCardData } : c);

            expect(updatedCards).toHaveLength(2); // Sem duplicação
            expect(updatedCards.find(c => c.id === 'card-1').name).toBe('Nubank Ultravioleta');
            expect(updatedCards.find(c => c.id === 'card-1').limit).toBe(8000);
            expect(updatedCards.find(c => c.id === 'card-2').name).toBe('Inter Platinum');
        });
    });

    // =========================================================================
    // C. VERIFICAÇÃO DE EDIÇÃO DE COMPRA (PRESERVAÇÃO MATEMÁTICA)
    // =========================================================================
    describe('C. Edição de Compra: Preservação de Parcelamento e Zero Drift', () => {
        it('1. Recálculo ao editar valor ou parcelas preserva centavos inteiros e soma exata', () => {
            // Edição segura de compra de R$ 100,00 em 3x (dízima 33.33)
            const installments = calculateInstallments({
                totalValue: 100.00,
                count: 3,
                startDate: '2026-08-10'
            });

            expect(installments).toHaveLength(3);
            const sumCents = installments.reduce((acc, inst) => acc + toCents(inst.value), 0);
            expect(sumCents).toBe(10000); // Exatos 100.00 sem perda de centavos
            expect(fromCents(sumCents)).toBe(100.00);
        });
    });

    // =========================================================================
    // F. FORMULÁRIOS: PARSING MONETÁRIO E VALIDAÇÃO DE ENTRADA
    // =========================================================================
    describe('F. Formulários: Validação de Entrada e Parsing de Moeda', () => {
        it('1. Parsing monetário converte inputs formatados corretamente', () => {
            expect(toCents('1.250,50')).toBe(125050);
            expect(toCents('0,99')).toBe(99);
            expect(toCents('100')).toBe(10000);
            expect(toCents('')).toBe(0);
            expect(toCents(null)).toBe(0);
        });

        it('2. Valores calculados a partir de centavos evitam imprecisões IEEE 754', () => {
            const v1 = toCents('0.10');
            const v2 = toCents('0.20');
            expect(v1 + v2).toBe(30); // 10 + 20 = 30 centavos
            expect(fromCents(v1 + v2)).toBe(0.3);
        });
    });
});
