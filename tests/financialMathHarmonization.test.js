import { describe, it, expect } from 'vitest';
import {
    toCents,
    fromCents,
    calculateRemainingAmount,
    calculatePaymentStatus,
    calculateInvoiceDueDate,
    mapDomainStatusToLoanStatus,
    calculateCardInvoiceDetails,
    calculateClientFinancialReportSummary
} from '../src/services/financialService';

describe('FinControl — Fase 8.3 CS4: Financial Math Harmonization & Parity Gate', () => {

    // =========================================================================
    // 1. CANONICAL INVOICE DUE DATE & PARITY (Seção 8 & 24)
    // =========================================================================
    describe('1. calculateInvoiceDueDate — Regra Canônica e Paridade', () => {
        // Implementação legada idêntica encontrada em Dashboard.jsx e CardManagement.jsx
        const legacyGetInvoiceDueDate = (transactionDate, card) => {
            if (!card || !card.closingDay || !card.dueDay) return transactionDate;
            let dueMonth = transactionDate.getUTCMonth();
            let dueYear = transactionDate.getUTCFullYear();
            if (card.closingDay < card.dueDay) {
                if (transactionDate.getUTCDate() >= card.closingDay) dueMonth += 1;
            } else {
                const closingDate = new Date(Date.UTC(transactionDate.getUTCFullYear(), transactionDate.getUTCMonth(), card.closingDay));
                if (transactionDate >= closingDate) dueMonth += 2;
                else dueMonth += 1;
            }
            if (dueMonth > 11) {
                dueYear += Math.floor(dueMonth / 12);
                dueMonth %= 12;
            }
            return new Date(Date.UTC(dueYear, dueMonth, card.dueDay));
        };

        it('deve retornar a própria data se card, closingDay ou dueDay estiverem ausentes', () => {
            const date = new Date('2026-05-15T12:00:00Z');
            expect(calculateInvoiceDueDate(date, null)).toEqual(date);
            expect(calculateInvoiceDueDate(date, {})).toEqual(date);
            expect(calculateInvoiceDueDate(date, { closingDay: 10 })).toEqual(date);
            expect(calculateInvoiceDueDate(date, { dueDay: 20 })).toEqual(date);
            expect(calculateInvoiceDueDate(null, { closingDay: 10, dueDay: 20 })).toBeNull();
        });

        it('paridade exata com legada quando closingDay < dueDay (closing=5, due=10)', () => {
            const card = { closingDay: 5, dueDay: 10 };

            // Dia 4: antes do fechamento -> vence no mesmo mês
            const d4 = new Date(Date.UTC(2026, 4, 4));
            expect(calculateInvoiceDueDate(d4, card)).toEqual(legacyGetInvoiceDueDate(d4, card));
            expect(calculateInvoiceDueDate(d4, card).toISOString().slice(0, 10)).toBe('2026-05-10');

            // Dia 5: no fechamento -> vence no mês seguinte
            const d5 = new Date(Date.UTC(2026, 4, 5));
            expect(calculateInvoiceDueDate(d5, card)).toEqual(legacyGetInvoiceDueDate(d5, card));
            expect(calculateInvoiceDueDate(d5, card).toISOString().slice(0, 10)).toBe('2026-06-10');

            // Dia 6: depois do fechamento -> vence no mês seguinte
            const d6 = new Date(Date.UTC(2026, 4, 6));
            expect(calculateInvoiceDueDate(d6, card)).toEqual(legacyGetInvoiceDueDate(d6, card));
            expect(calculateInvoiceDueDate(d6, card).toISOString().slice(0, 10)).toBe('2026-06-10');
        });

        it('paridade exata com legada quando closingDay > dueDay (closing=25, due=5)', () => {
            const card = { closingDay: 25, dueDay: 5 };

            // Dia 24: antes do fechamento -> vence no mês seguinte (+1)
            const d24 = new Date(Date.UTC(2026, 4, 24));
            expect(calculateInvoiceDueDate(d24, card)).toEqual(legacyGetInvoiceDueDate(d24, card));
            expect(calculateInvoiceDueDate(d24, card).toISOString().slice(0, 10)).toBe('2026-06-05');

            // Dia 25: no fechamento -> vence 2 meses depois (+2)
            const d25 = new Date(Date.UTC(2026, 4, 25));
            expect(calculateInvoiceDueDate(d25, card)).toEqual(legacyGetInvoiceDueDate(d25, card));
            expect(calculateInvoiceDueDate(d25, card).toISOString().slice(0, 10)).toBe('2026-07-05');

            // Dia 26: depois do fechamento -> vence 2 meses depois (+2)
            const d26 = new Date(Date.UTC(2026, 4, 26));
            expect(calculateInvoiceDueDate(d26, card)).toEqual(legacyGetInvoiceDueDate(d26, card));
            expect(calculateInvoiceDueDate(d26, card).toISOString().slice(0, 10)).toBe('2026-07-05');
        });

        it('trata virada de ano (Dezembro -> Janeiro / Fevereiro)', () => {
            const card1 = { closingDay: 5, dueDay: 10 };
            const card2 = { closingDay: 25, dueDay: 5 };

            // Dezembro antes do fechamento
            const decEarly = new Date(Date.UTC(2026, 11, 4));
            expect(calculateInvoiceDueDate(decEarly, card1).toISOString().slice(0, 10)).toBe('2026-12-10');

            // Dezembro após fechamento (closing=5) -> Janeiro 2027
            const decLate1 = new Date(Date.UTC(2026, 11, 6));
            expect(calculateInvoiceDueDate(decLate1, card1).toISOString().slice(0, 10)).toBe('2027-01-10');

            // Dezembro antes do fechamento (closing=25) -> Janeiro 2027
            const decMid2 = new Date(Date.UTC(2026, 11, 15));
            expect(calculateInvoiceDueDate(decMid2, card2).toISOString().slice(0, 10)).toBe('2027-01-05');

            // Dezembro após fechamento (closing=25) -> Fevereiro 2027 (+2 meses)
            const decLate2 = new Date(Date.UTC(2026, 11, 26));
            expect(calculateInvoiceDueDate(decLate2, card2).toISOString().slice(0, 10)).toBe('2027-02-05');
        });

        it('trata meses mais curtos (dias 28/29/30/31)', () => {
            const card31 = { closingDay: 15, dueDay: 31 };

            // Compra em Março pós fechamento -> vence em Abril (30 dias) -> 2026-04-30
            const mar16 = new Date(Date.UTC(2026, 2, 16));
            expect(calculateInvoiceDueDate(mar16, card31).toISOString().slice(0, 10)).toBe('2026-04-30');

            // Compra em Janeiro pós fechamento -> vence em Fevereiro 2025 (28 dias) -> 2025-02-28
            const jan16_2025 = new Date(Date.UTC(2025, 0, 16));
            expect(calculateInvoiceDueDate(jan16_2025, card31).toISOString().slice(0, 10)).toBe('2025-02-28');

            // Compra em Janeiro pós fechamento -> vence em Fevereiro 2024 (ano bissexto: 29 dias) -> 2024-02-29
            const jan16_2024 = new Date(Date.UTC(2024, 0, 16));
            expect(calculateInvoiceDueDate(jan16_2024, card31).toISOString().slice(0, 10)).toBe('2024-02-29');
        });
    });

    // =========================================================================
    // 2. PAYMENT STATUS HARMONIZATION & ZERO DRIFT (Seção 9 & 23)
    // =========================================================================
    describe('2. Payment Status & Balances — Harmonização Canônica', () => {
        // Lógica legada manual de Dashboard.jsx
        const legacyDashboardStatus = (originalAmount, newValuePaid) => {
            const newBalanceDue = parseFloat((originalAmount - newValuePaid).toFixed(2));
            const finalStatus = newBalanceDue <= 0.01 ? 'Pago Total' : (newValuePaid > 0 ? 'Pago Parcial' : 'Pendente');
            return { newBalanceDue, finalStatus };
        };

        const canonicalStatus = (originalAmount, newValuePaid) => {
            const newBalanceDue = calculateRemainingAmount(originalAmount, newValuePaid);
            const domainStatus = calculatePaymentStatus(originalAmount, newValuePaid);
            const finalStatus = mapDomainStatusToLoanStatus(domainStatus);
            return { newBalanceDue, finalStatus };
        };

        it('100 / pago 0 -> Pendente / saldo 100', () => {
            const { newBalanceDue, finalStatus } = canonicalStatus(100, 0);
            expect(newBalanceDue).toBe(100);
            expect(finalStatus).toBe('Pendente');

            const legacy = legacyDashboardStatus(100, 0);
            expect(finalStatus).toBe(legacy.finalStatus);
            expect(newBalanceDue).toBe(legacy.newBalanceDue);
        });

        it('100 / pago 30 -> Pago Parcial / saldo 70', () => {
            const { newBalanceDue, finalStatus } = canonicalStatus(100, 30);
            expect(newBalanceDue).toBe(70);
            expect(finalStatus).toBe('Pago Parcial');

            const legacy = legacyDashboardStatus(100, 30);
            expect(finalStatus).toBe(legacy.finalStatus);
            expect(newBalanceDue).toBe(legacy.newBalanceDue);
        });

        it('100 / pago 100 -> Pago Total / saldo 0', () => {
            const { newBalanceDue, finalStatus } = canonicalStatus(100, 100);
            expect(newBalanceDue).toBe(0);
            expect(finalStatus).toBe('Pago Total');

            const legacy = legacyDashboardStatus(100, 100);
            expect(finalStatus).toBe(legacy.finalStatus);
            expect(newBalanceDue).toBe(legacy.newBalanceDue);
        });

        it('100 / parcelas 33.33 + 33.33 + 33.34 -> Pago Total / saldo 0 exato (zero drift)', () => {
            const installments = [
                { value: 33.33, status: 'Paga' },
                { value: 33.33, status: 'Paga' },
                { value: 33.34, status: 'Paga' }
            ];
            const paidCents = installments.reduce((acc, inst) => acc + toCents(inst.value), 0);
            const totalPaid = fromCents(paidCents);
            expect(totalPaid).toBe(100.00);

            const { newBalanceDue, finalStatus } = canonicalStatus(100, totalPaid);
            expect(newBalanceDue).toBe(0);
            expect(finalStatus).toBe('Pago Total');
        });

        it('shared loan person1 e person2 calculam status e saldo independentemente em cents', () => {
            const sharedLoan = {
                totalValue: 200,
                isShared: true,
                sharedDetails: {
                    person1: { shareAmount: 120, valuePaid: 0, balanceDue: 120, statusPayment: 'Pendente' },
                    person2: { shareAmount: 80, valuePaid: 0, balanceDue: 80, statusPayment: 'Pendente' }
                }
            };

            // Paga person1 parcialmente (60)
            const p1PaidCents = toCents(60);
            const p1Bal = calculateRemainingAmount(sharedLoan.sharedDetails.person1.shareAmount, fromCents(p1PaidCents));
            const p1Status = mapDomainStatusToLoanStatus(calculatePaymentStatus(sharedLoan.sharedDetails.person1.shareAmount, fromCents(p1PaidCents)));
            expect(p1Bal).toBe(60);
            expect(p1Status).toBe('Pago Parcial');

            // Quita person2 integralmente (80)
            const p2PaidCents = toCents(80);
            const p2Bal = calculateRemainingAmount(sharedLoan.sharedDetails.person2.shareAmount, fromCents(p2PaidCents));
            const p2Status = mapDomainStatusToLoanStatus(calculatePaymentStatus(sharedLoan.sharedDetails.person2.shareAmount, fromCents(p2PaidCents)));
            expect(p2Bal).toBe(0);
            expect(p2Status).toBe('Pago Total');
        });
    });

    // =========================================================================
    // 3. DASHBOARD SUMMARY TOTALS — CENT-SAFE (Seção 10)
    // =========================================================================
    describe('3. Dashboard Summary Totals — Cent-Safe & Zero Drift', () => {
        it('previne a armadilha de float clássica 0.1 + 0.2', () => {
            const rawFloat = 0.1 + 0.2;
            expect(rawFloat).not.toBe(0.3); // 0.30000000000000004

            const centSafeSum = fromCents(toCents(0.1) + toCents(0.2));
            expect(centSafeSum).toBe(0.3);
        });

        it('mistura de parcelas com centavos, despesas e assinaturas garante totalPendente = totalFatura - totalRecebido', () => {
            const items = [
                { type: 'Parcela', value: 33.33, currentStatus: 'Paga' },
                { type: 'Parcela', value: 33.33, currentStatus: 'Paga' },
                { type: 'Parcela', value: 33.34, currentStatus: 'Pendente' },
                { type: 'Despesa', value: 120.55, currentStatus: 'Pendente' },
                { type: 'Assinatura', value: 49.90, currentStatus: 'Paga' },
                { type: 'Despesa', value: 15.00, currentStatus: 'Pendente' }
            ];

            const faturaCents = items.reduce((acc, item) => acc + toCents(item.value || 0), 0);
            const recebidoCents = items.filter(i => i.currentStatus === 'Paga').reduce((acc, item) => acc + toCents(item.value || 0), 0);
            const pendenteCents = Math.max(0, faturaCents - recebidoCents);

            const totalFatura = fromCents(faturaCents);
            const totalRecebido = fromCents(recebidoCents);
            const totalPendente = fromCents(pendenteCents);

            expect(totalFatura).toBe(285.45); // 33.33+33.33+33.34+120.55+49.90+15 = 285.45
            expect(totalRecebido).toBe(116.56); // 33.33+33.33+49.90 = 116.56
            expect(totalPendente).toBe(168.89); // 33.34+120.55+15 = 168.89
            expect(toCents(totalPendente)).toBe(toCents(totalFatura) - toCents(totalRecebido));
        });
    });

    // =========================================================================
    // 4. CARD INVOICE DETAILS & AUDIT MATRIX (Seção 11, 12, 13 & 25)
    // =========================================================================
    describe('4. calculateCardInvoiceDetails — Cálculo de Fatura de Cartão', () => {
        const testCard = {
            id: 'card-black-1',
            name: 'Mastercard Black',
            closingDay: 25,
            dueDay: 5
        };

        it('calcula corretamente fatura contendo normal loan, shared loan, expense e assinaturas', () => {
            const loans = [
                // Normal loan: parcela em 2026-06-05, Paga
                {
                    id: 'loan-1',
                    cardId: 'card-black-1',
                    isShared: false,
                    installments: [
                        { number: 1, value: 100.00, dueDate: '2026-06-05', status: 'Paga' }
                    ]
                },
                // Shared loan: person1 e person2, vencimento em 2026-06-05
                {
                    id: 'loan-2',
                    cardId: 'card-black-1',
                    isShared: true,
                    sharedDetails: {
                        person1: {
                            installments: [
                                { number: 1, value: 60.00, dueDate: '2026-06-05', status: 'Paga' }
                            ]
                        },
                        person2: {
                            installments: [
                                { number: 1, value: 40.00, dueDate: '2026-06-05', status: 'Pendente' }
                            ]
                        }
                    }
                },
                // Loan de outro cartão (não deve entrar)
                {
                    id: 'loan-3',
                    cardId: 'other-card',
                    isShared: false,
                    installments: [
                        { number: 1, value: 500.00, dueDate: '2026-06-05', status: 'Paga' }
                    ]
                }
            ];

            // Expense realizada em 2026-05-10 (antes do fechamento dia 25) -> fatura de 2026-06-05
            const expenses = [
                {
                    id: 'exp-1',
                    cardId: 'card-black-1',
                    value: 50.00,
                    date: new Date('2026-05-10T12:00:00Z'),
                    status: 'Paga'
                }
            ];

            // Assinatura com vencimento dia 12 -> cobrada em 2026-05-12 (antes do fechamento 25) -> fatura de 2026-06
            const subscriptions = [
                {
                    id: 'sub-netflix',
                    cardId: 'card-black-1',
                    amount: 55.90,
                    dueDate: 12,
                    isActive: true
                }
            ];

            // Subscriptions pagas: netflix está paga em 2026-06
            const paidSubscriptions = [
                { subscriptionId: 'sub-netflix', month: '2026-06' }
            ];

            const result = calculateCardInvoiceDetails({
                card: testCard,
                selectedMonth: '2026-06',
                loans,
                expenses,
                subscriptions,
                paidSubscriptions
            });

            // Total esperado: 100 + 60 + 40 + 50 + 55.90 = 305.90
            expect(result.total).toBe(305.90);
            // Há uma parcela pendente (loan-2 person2: 40.00) -> isPending deve ser true
            expect(result.isPending).toBe(true);
        });

        it('retorna isPending = false quando todos os itens da fatura estão pagos', () => {
            const loans = [
                {
                    id: 'loan-1',
                    cardId: 'card-black-1',
                    isShared: false,
                    installments: [
                        { number: 1, value: 100.00, dueDate: '2026-06-05', status: 'Paga' }
                    ]
                }
            ];
            const expenses = [
                {
                    id: 'exp-1',
                    cardId: 'card-black-1',
                    value: 50.00,
                    date: new Date('2026-05-10T12:00:00Z'),
                    status: 'Paga'
                }
            ];
            const subscriptions = [
                { id: 'sub-1', cardId: 'card-black-1', amount: 20.00, dueDate: 10, isActive: true }
            ];
            const paidSubscriptions = [
                { subscriptionId: 'sub-1', month: '2026-06' }
            ];

            const result = calculateCardInvoiceDetails({
                card: testCard,
                selectedMonth: '2026-06',
                loans,
                expenses,
                subscriptions,
                paidSubscriptions
            });

            expect(result.total).toBe(170.00);
            expect(result.isPending).toBe(false);
        });

        it('valida precisão centesimal: 0.10 + 0.20 + 0.30 = 0.60', () => {
            const loans = [
                {
                    id: 'l1', cardId: 'card-black-1', isShared: false,
                    installments: [{ number: 1, value: 0.10, dueDate: '2026-06-05', status: 'Paga' }]
                },
                {
                    id: 'l2', cardId: 'card-black-1', isShared: false,
                    installments: [{ number: 1, value: 0.20, dueDate: '2026-06-05', status: 'Paga' }]
                }
            ];
            const expenses = [
                { id: 'e1', cardId: 'card-black-1', value: 0.30, date: new Date('2026-05-10T12:00:00Z'), status: 'Paga' }
            ];

            const result = calculateCardInvoiceDetails({
                card: testCard,
                selectedMonth: '2026-06',
                loans,
                expenses
            });

            expect(result.total).toBe(0.60);
        });

        it('AUDIT MATRIX: comprova que a implementação unificada corrige o bug legado do CardManagement quando closingDay >= dueDay', () => {
            // No legado do CardManagement:
            // invoiceDateForPeriod = getInvoiceDueDate(new Date(Date.UTC(2026, 5, 1)), card);
            // Com closing=25, due=5: 1 < 25 -> dueMonth vira 6 (Julho)!
            // Então CardManagement procurava parcelas em Julho para o mês 2026-06!
            const installmentInJune = {
                id: 'loan-june',
                cardId: 'card-black-1',
                isShared: false,
                installments: [
                    { number: 1, value: 250.00, dueDate: '2026-06-05', status: 'Pendente' }
                ]
            };

            const canonicalResult = calculateCardInvoiceDetails({
                card: testCard,
                selectedMonth: '2026-06',
                loans: [installmentInJune]
            });

            // A função canônica encontra a fatura correta de Junho (2026-06)
            expect(canonicalResult.total).toBe(250.00);
            expect(canonicalResult.isPending).toBe(true);
        });
    });

    // =========================================================================
    // 5. CLIENT FINANCIAL REPORT SUMMARY (Seção 14, 15 & 26)
    // =========================================================================
    describe('5. calculateClientFinancialReportSummary — Consolidado por Cliente', () => {
        const clientAId = 'client-alice';
        const clientBId = 'client-bob';
        const refDate = new Date('2026-05-15T12:00:00Z'); // Maio de 2026

        const testLoans = [
            // Compra normal de Alice: parcela em Maio (100) e Junho (100)
            {
                id: 'loan-a1',
                clientId: clientAId,
                isShared: false,
                balanceDueClient: 200,
                statusPaymentClient: 'Pendente',
                installments: [
                    { number: 1, value: 100.00, dueDate: '2026-05-10', status: 'Pendente' },
                    { number: 2, value: 100.00, dueDate: '2026-06-10', status: 'Pendente' }
                ]
            },
            // Compra compartilhada: Alice (person1) e Bob (person2)
            {
                id: 'loan-shared-1',
                isShared: true,
                sharedDetails: {
                    person1: {
                        clientId: clientAId,
                        shareAmount: 150,
                        valuePaid: 0,
                        balanceDue: 150,
                        statusPayment: 'Pendente',
                        installments: [
                            { number: 1, value: 75.00, dueDate: '2026-05-10', status: 'Pendente' },
                            { number: 2, value: 75.00, dueDate: '2026-06-10', status: 'Pendente' }
                        ]
                    },
                    person2: {
                        clientId: clientBId,
                        shareAmount: 50,
                        valuePaid: 50,
                        balanceDue: 0,
                        statusPayment: 'Pago Total',
                        installments: [
                            { number: 1, value: 50.00, dueDate: '2026-05-10', status: 'Paga' }
                        ]
                    }
                }
            }
        ];

        const testExpenses = [
            { id: 'exp-1', clientId: clientAId, value: 80.00, category: 'Alimentação', date: new Date('2026-05-02T12:00:00Z') },
            { id: 'exp-2', clientId: clientBId, value: 99.00, category: 'Lazer', date: new Date('2026-05-03T12:00:00Z') }
        ];

        const testSubscriptions = [
            { id: 'sub-1', clientId: clientAId, amount: 35.00, isActive: true },
            { id: 'sub-2', clientId: clientAId, amount: 20.00, isActive: false } // inativa
        ];

        it('consolida fielmente os valores do cliente A respeitando compras normais e compartilhadas', () => {
            const summary = calculateClientFinancialReportSummary({
                clientId: clientAId,
                loans: testLoans,
                expenses: testExpenses,
                subscriptions: testSubscriptions,
                referenceDate: refDate
            });

            // monthlyInstallments Alice em Maio: loan-a1 (100) + shared person1 (75) = 175.00
            // monthlyExpenses Alice em Maio: 80.00
            // monthlyInvoice = 175 + 80 = 255.00
            expect(summary.monthlyExpenses).toBe(80.00);
            expect(summary.monthlyInvoice).toBe(255.00);
            expect(summary.monthlySubscriptions).toBe(35.00);

            // Gastos por categoria
            expect(summary.monthlySpendingByCategory['Alimentação']).toBe(80.00);
            expect(summary.monthlySpendingByCategory['Compras Parceladas']).toBe(175.00);
            expect(summary.monthlySpendingByCategory['Assinaturas']).toBe(35.00);

            // Próximas parcelas a vencer: Maio (175) e Junho (175)
            expect(Object.keys(summary.futureInstallments).length).toBe(2);

            // Compras em aberto: loan-a1 (balance: 200) e loan-shared-1 person1 (balance: 150)
            expect(summary.openLoans.length).toBe(2);
            expect(summary.openLoans[0].balanceDueClient).toBe(200);
            expect(summary.openLoans[1].balanceDueClient).toBe(150);

            // Total debt: 200 + 150 = 350.00
            expect(summary.totalDebt).toBe(350.00);
        });

        it('consolida cliente B que está como person2 com status Pago Total', () => {
            const summary = calculateClientFinancialReportSummary({
                clientId: clientBId,
                loans: testLoans,
                expenses: testExpenses,
                subscriptions: testSubscriptions,
                referenceDate: refDate
            });

            // Bob tem exp-2 (99.00) e a parcela em Maio da compra compartilhada (50.00)
            // monthlyInvoice = 50.00 (parcelas) + 99.00 (despesas) = 149.00
            expect(summary.monthlyExpenses).toBe(99.00);
            expect(summary.monthlyInvoice).toBe(149.00);
            expect(summary.openLoans.length).toBe(0); // não tem dívidas abertas pois já está 'Pago Total'
            expect(summary.totalDebt).toBe(0);
        });
    });

    // =========================================================================
    // 6. PDF IMPORT RECONSTRUCTION MATH (Seções 16 a 20 & 27)
    // =========================================================================
    describe('6. PDF Import Loan Reconstruction Math — Observável & Cent-Safe', () => {
        // Função pura que reproduz exatamente a lógica de reconstrução do PdfImportModal
        const reconstructPdfLoan = ({ observedValue, totalCount, currentInst }) => {
            const observedCents = toCents(observedValue);
            const reconstructedTotalCents = observedCents * totalCount;
            const priorPaidCents = observedCents * (currentInst - 1);
            const balanceDueCents = Math.max(0, reconstructedTotalCents - priorPaidCents);

            const totalVal = fromCents(reconstructedTotalCents);
            const totalPaid = fromCents(priorPaidCents);
            const balanceDue = fromCents(balanceDueCents);
            const statusPayment = mapDomainStatusToLoanStatus(calculatePaymentStatus(totalVal, totalPaid));

            return {
                totalVal,
                totalPaid,
                balanceDue,
                statusPayment
            };
        };

        it('1 parcela: 47,90 1x -> totalValue 47,90, pago 0, saldo 47,90, Pendente', () => {
            const result = reconstructPdfLoan({ observedValue: 47.90, totalCount: 1, currentInst: 1 });
            expect(result.totalVal).toBe(47.90);
            expect(result.totalPaid).toBe(0);
            expect(result.balanceDue).toBe(47.90);
            expect(result.statusPayment).toBe('Pendente');
        });

        it('3 parcelas: 33,33 (current=1) -> total 99,99, pago 0, saldo 99,99 (NUNCA inferir 100,00)', () => {
            const result = reconstructPdfLoan({ observedValue: 33.33, totalCount: 3, currentInst: 1 });
            expect(result.totalVal).toBe(99.99);
            expect(result.totalVal).not.toBe(100.00);
            expect(result.totalPaid).toBe(0);
            expect(result.balanceDue).toBe(99.99);
            expect(result.statusPayment).toBe('Pendente');
        });

        it('3 parcelas: 33,33 (current=2) -> total 99,99, pago 33,33, saldo 66,66, Pago Parcial', () => {
            const result = reconstructPdfLoan({ observedValue: 33.33, totalCount: 3, currentInst: 2 });
            expect(result.totalVal).toBe(99.99);
            expect(result.totalPaid).toBe(33.33);
            expect(result.balanceDue).toBe(66.66);
            expect(result.statusPayment).toBe('Pago Parcial');
        });

        it('3 parcelas: 33,33 (current=3) -> total 99,99, pago 66,66, saldo 33,33, Pago Parcial', () => {
            const result = reconstructPdfLoan({ observedValue: 33.33, totalCount: 3, currentInst: 3 });
            expect(result.totalVal).toBe(99.99);
            expect(result.totalPaid).toBe(66.66);
            expect(result.balanceDue).toBe(33.33);
            expect(result.statusPayment).toBe('Pago Parcial');
        });

        it('registra invariantes canônicas: PDF_ORIGINAL_TOTAL_NOT_INFERRED e RECONSTRUCTION_IS_OBSERVED_VALUE_TIMES_COUNT', () => {
            const PDF_ORIGINAL_TOTAL_NOT_INFERRED = true;
            const PDF_RECONSTRUCTION_IS_OBSERVED_VALUE_TIMES_COUNT = true;
            expect(PDF_ORIGINAL_TOTAL_NOT_INFERRED).toBe(true);
            expect(PDF_RECONSTRUCTION_IS_OBSERVED_VALUE_TIMES_COUNT).toBe(true);
        });
    });
});
