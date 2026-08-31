// tests/financialService.test.js
import { describe, it, expect } from 'vitest';
import {
    toCents,
    fromCents,
    isValidFinancialValue,
    calculateInstallments,
    calculateRemainingAmount,
    calculatePaymentStatus,
    calculateNetBalance,
    calculateClientDebt,
    calculateCardInvoiceTotal,
    aggregateByCategory,
    calculateFutureCommitments,
    calculateDebtReliefTimeline,
    calculateConsolidatedClientReceivables,
    getPreviousMonthString,
    calculateMonthOverMonthDelta,
    calculateMonthlyComparisonSummary,
    generateDeterministicFinancialInsights,
    calculateCardLimitIntelligence,
    generateFinancialAlerts,
    asArray,
    detectExpenseAnomalies,
    generateWeeklyFinancialSummary,
    generateMonthlyFinancialSummary,
    calculateCategoryBudgetsProgress
} from '../src/services/financialService';
import { generateAnnualReportCsv, generateTransactionsCsv } from '../src/services/csvExportService';
import { parseCurrencyInput, formatCurrencyDisplay } from '../src/utils/currency';
import { matchAndDeduplicate } from '../src/utils/pdfParser';

describe('Financial Service - Precisão Monetária e Centavos', () => {
    it('deve converter valores decimais para centavos inteiros com precisão exata', () => {
        expect(toCents(100.50)).toBe(10050);
        expect(toCents(0.01)).toBe(1);
        expect(toCents(0.1 + 0.2)).toBe(30); // Elimina imprecisão clássica 0.30000000000000004
        expect(toCents("1.234,56")).toBe(123456);
        expect(toCents("0,01")).toBe(1);
        expect(toCents(null)).toBe(0);
        expect(toCents(undefined)).toBe(0);
    });

    it('deve converter centavos para valor decimal com 2 casas', () => {
        expect(fromCents(10050)).toBe(100.50);
        expect(fromCents(1)).toBe(0.01);
        expect(fromCents(0)).toBe(0);
    });

    it('deve validar valores financeiros estritamente positivos', () => {
        expect(isValidFinancialValue(100)).toBe(true);
        expect(isValidFinancialValue("50.25")).toBe(true);
        expect(isValidFinancialValue(0)).toBe(false);
        expect(isValidFinancialValue(-10)).toBe(false);
        expect(isValidFinancialValue(NaN)).toBe(false);
    });
});

describe('Financial Service - Divisão Exata de Parcelas (Zero-Cent Drift)', () => {
    it('deve dividir R$ 100,00 em 3 parcelas com soma 100% exata (33.33 + 33.33 + 33.34)', () => {
        const installments = calculateInstallments({
            totalValue: 100.00,
            count: 3,
            startDate: '2026-03-10'
        });

        expect(installments).toHaveLength(3);
        expect(installments[0].value).toBe(33.33);
        expect(installments[1].value).toBe(33.33);
        expect(installments[2].value).toBe(33.34);

        const totalSum = installments.reduce((acc, inst) => acc + toCents(inst.value), 0);
        expect(fromCents(totalSum)).toBe(100.00);
    });

    it('deve dividir R$ 100,00 em 7 parcelas com soma exata', () => {
        const installments = calculateInstallments({
            totalValue: 100.00,
            count: 7,
            startDate: '2026-01-15'
        });

        expect(installments).toHaveLength(7);
        // 10000 / 7 = 1428 centavos (14.28). 14.28 * 6 = 85.68. Última: 100 - 85.68 = 14.32.
        expect(installments[0].value).toBe(14.28);
        expect(installments[6].value).toBe(14.32);

        const totalSum = installments.reduce((acc, inst) => acc + toCents(inst.value), 0);
        expect(fromCents(totalSum)).toBe(100.00);
    });

    it('deve lidar com 1 parcela única de R$ 0,01', () => {
        const installments = calculateInstallments({
            totalValue: 0.01,
            count: 1,
            startDate: '2026-05-01'
        });

        expect(installments).toHaveLength(1);
        expect(installments[0].value).toBe(0.01);
    });

    it('deve lidar com R$ 0,01 dividido em 3 parcelas mantendo a soma exata de 0.01', () => {
        const installments = calculateInstallments({
            totalValue: 0.01,
            count: 3,
            startDate: '2026-05-01'
        });

        expect(installments).toHaveLength(3);
        expect(installments[0].value).toBe(0.00);
        expect(installments[1].value).toBe(0.00);
        expect(installments[2].value).toBe(0.01);

        const totalSum = installments.reduce((acc, inst) => acc + toCents(inst.value), 0);
        expect(fromCents(totalSum)).toBe(0.01);
    });

    it('deve lidar com R$ 1,00 em 3 parcelas (0.33 + 0.33 + 0.34 = 1.00)', () => {
        const installments = calculateInstallments({
            totalValue: 1.00,
            count: 3,
            startDate: '2026-05-01'
        });

        expect(installments).toHaveLength(3);
        expect(installments[0].value).toBe(0.33);
        expect(installments[1].value).toBe(0.33);
        expect(installments[2].value).toBe(0.34);

        const totalSum = installments.reduce((acc, inst) => acc + toCents(inst.value), 0);
        expect(fromCents(totalSum)).toBe(1.00);
    });

    it('deve rejeitar e retornar array vazio para entradas inválidas', () => {
        expect(calculateInstallments({ totalValue: 0, count: 5 })).toEqual([]);
        expect(calculateInstallments({ totalValue: -50, count: 2 })).toEqual([]);
        expect(calculateInstallments({ totalValue: 100, count: 0 })).toEqual([]);
        expect(calculateInstallments({ totalValue: 100, count: -3 })).toEqual([]);
        expect(calculateInstallments({ totalValue: "abc", count: 2 })).toEqual([]);
    });

    it('deve respeitar a rolagem de meses e limites de dias no fim do mês (ex: 31 de Jan -> 28 de Fev)', () => {
        const installments = calculateInstallments({
            totalValue: 300.00,
            count: 3,
            startDate: '2026-01-31'
        });

        expect(installments).toHaveLength(3);
        expect(installments[0].dueDate).toBe('2026-01-31');
        expect(installments[1].dueDate).toBe('2026-02-28'); // 2026 não é bissexto
        expect(installments[2].dueDate).toBe('2026-03-31');
    });
});

describe('Financial Service - Cálculos de Saldo e Status de Pagamento', () => {
    it('deve calcular corretamente o saldo remanescente', () => {
        expect(calculateRemainingAmount(100.00, 33.33)).toBe(66.67);
        expect(calculateRemainingAmount(100.00, 100.00)).toBe(0);
        expect(calculateRemainingAmount(100.00, 150.00)).toBe(0);
    });

    it('deve determinar o status correto de pagamento', () => {
        expect(calculatePaymentStatus(100.00, 0)).toBe('Pendente');
        expect(calculatePaymentStatus(100.00, 50.00)).toBe('Parcial');
        expect(calculatePaymentStatus(100.00, 100.00)).toBe('Pago');
        expect(calculatePaymentStatus(100.00, 110.00)).toBe('Pago');
    });

    it('deve calcular o balanço líquido global com precisão em centavos', () => {
        const incomes = [{ value: 5000.00 }, { value: 1250.50 }];
        const expenses = [{ value: 1200.00 }, { value: 350.25 }];
        const cardDebts = [{ value: 1500.00 }, { value: 200.25 }];

        const result = calculateNetBalance(incomes, expenses, cardDebts);
        expect(result.totalIncomes).toBe(6250.50);
        expect(result.totalExpenses).toBe(1550.25);
        expect(result.totalCardDebt).toBe(1700.25);
        expect(result.netBalance).toBe(3000.00); // 6250.50 - 3250.50 = 3000.00
    });
});

describe('Currency Utils - Conversão e Formatação BRL', () => {
    it('deve fazer parse correto de inputs no formato brasileiro', () => {
        expect(parseCurrencyInput("10,00")).toBe(10.00);
        expect(parseCurrencyInput("10,50")).toBe(10.50);
        expect(parseCurrencyInput("0,01")).toBe(0.01);
        expect(parseCurrencyInput("1.250,75")).toBe(1250.75);
        expect(parseCurrencyInput("")).toBe(0);
    });

    it('deve formatar valores para exibição BRL padrão', () => {
        expect(formatCurrencyDisplay(1000)).toMatch(/1\.000,00/);
        expect(formatCurrencyDisplay(0.5)).toMatch(/0,50/);
    });
});

describe('Invoice Anti-Deduplication Engine', () => {
    it('deve detectar e desmarcar compras duplicadas em relação a lançamentos já salvos', () => {
        const parsedItems = [
            { id: 'item-1', description: 'AMAZON.COM.BR', value: 159.90, isInstallment: false, totalInstallments: 1 },
            { id: 'item-2', description: 'MERCADOLIVRE', value: 89.00, isInstallment: true, totalInstallments: 3 }
        ];

        const existingLoans = [
            { cardId: 'card-1', description: 'Amazon.com.br', totalValue: 159.90, installmentsCount: 1 }
        ];

        const result = matchAndDeduplicate(parsedItems, existingLoans, 'card-1');
        expect(result[0].isDuplicate).toBe(true);
        expect(result[0].selected).toBe(false);
        expect(result[1].isDuplicate).toBe(false);
        expect(result[1].selected).toBe(true);
    });
});

describe('Financial Service - Dívida Consolidada por Pessoa', () => {
    it('deve calcular corretamente dívida quando nada foi pago (saldo integral)', () => {
        const loans = [{ totalValue: 100.00, paidValue: 0, status: 'Pendente' }];
        const debt = calculateClientDebt(loans);
        expect(debt.totalOwed).toBe(100.00);
        expect(debt.totalPaid).toBe(0.00);
        expect(debt.remainingBalance).toBe(100.00);
    });

    it('deve calcular corretamente dívida quando houve pagamento parcial', () => {
        const loans = [{ totalValue: 100.00, paidValue: 40.00, status: 'Parcial' }];
        const debt = calculateClientDebt(loans);
        expect(debt.totalOwed).toBe(100.00);
        expect(debt.totalPaid).toBe(40.00);
        expect(debt.remainingBalance).toBe(60.00);
    });

    it('deve calcular corretamente dívida quando foi totalmente quitada', () => {
        const loans = [{ totalValue: 100.00, paidValue: 100.00, status: 'Pago' }];
        const debt = calculateClientDebt(loans);
        expect(debt.totalOwed).toBe(100.00);
        expect(debt.totalPaid).toBe(100.00);
        expect(debt.remainingBalance).toBe(0.00);
    });

    it('deve consolidar corretamente compras, despesas e assinaturas vinculadas à pessoa', () => {
        const loans = [{ totalValue: 250.00, paidValue: 100.00, status: 'Parcial' }];
        const expenses = [{ value: 50.50, paidValue: 50.50, status: 'Pago' }];
        const subscriptions = [{ value: 39.90, status: 'Pendente' }];

        const debt = calculateClientDebt(loans, expenses, subscriptions);
        expect(debt.totalOwed).toBe(340.40); // 250 + 50.50 + 39.90 = 340.40
        expect(debt.totalPaid).toBe(150.50); // 100 + 50.50 = 150.50
        expect(debt.remainingBalance).toBe(189.90); // 340.40 - 150.50 = 189.90
    });
});

describe('Financial Service - Total de Fatura de Cartão', () => {
    it('deve somar parcelas do mês de competência alvo com precisão exata', () => {
        const loans = [
            {
                cardId: 'card-nubank',
                installments: [
                    { value: 120.50, dueDate: '2026-05-10' },
                    { value: 120.50, dueDate: '2026-06-10' }
                ]
            },
            {
                cardId: 'card-nubank',
                installments: [
                    { value: 80.25, dueDate: '2026-05-15' }
                ]
            },
            {
                cardId: 'card-inter',
                installments: [
                    { value: 500.00, dueDate: '2026-05-20' }
                ]
            }
        ];

        // Total da fatura de Maio de 2026 para todos os cartões: 120.50 + 80.25 + 500.00 = 700.75
        expect(calculateCardInvoiceTotal(loans, '2026-05')).toBe(700.75);

        // Total da fatura de Maio de 2026 apenas do Nubank: 120.50 + 80.25 = 200.75
        expect(calculateCardInvoiceTotal(loans, '2026-05', 'card-nubank')).toBe(200.75);

        // Total da fatura de Junho de 2026 do Nubank: 120.50
        expect(calculateCardInvoiceTotal(loans, '2026-06', 'card-nubank')).toBe(120.50);

        // Mês sem compras
        expect(calculateCardInvoiceTotal(loans, '2026-07', 'card-nubank')).toBe(0);
    });
});

describe('Financial Service - Agregação por Categorias', () => {
    it('deve somar valores agrupando por categoria e ordenar pelo maior total', () => {
        const expenses = [
            { category: 'Alimentação', value: 150.00 },
            { category: 'Transporte', value: 80.00 },
            { category: 'Alimentação', value: 200.50 },
            { category: 'Saúde', value: 450.00 },
            { category: '', value: 30.00 } // sem categoria -> Outros
        ];

        const aggregated = aggregateByCategory(expenses);
        expect(aggregated).toHaveLength(4);
        expect(aggregated[0]).toEqual({ category: 'Saúde', total: 450.00 });
        expect(aggregated[1]).toEqual({ category: 'Alimentação', total: 350.50 });
        expect(aggregated[2]).toEqual({ category: 'Transporte', total: 80.00 });
        expect(aggregated[3]).toEqual({ category: 'Outros', total: 30.00 });
    });
});

describe('Financial Service - Casos Extremos, Parcelamentos Longos e Calendário', () => {
    it('deve dividir R$ 999.999,99 em 36x garantindo soma 100% exata sem perda de centavos', () => {
        const installments = calculateInstallments({
            totalValue: 999999.99,
            count: 36,
            startDate: '2026-01-10'
        });

        expect(installments).toHaveLength(36);
        const totalSumCents = installments.reduce((acc, inst) => acc + toCents(inst.value), 0);
        expect(fromCents(totalSumCents)).toBe(999999.99);
    });

    it('deve dividir R$ 0,02 em 3x mantendo soma de 0.02', () => {
        const installments = calculateInstallments({
            totalValue: 0.02,
            count: 3,
            startDate: '2026-01-10'
        });

        expect(installments).toHaveLength(3);
        expect(installments[0].value).toBe(0.00);
        expect(installments[1].value).toBe(0.00);
        expect(installments[2].value).toBe(0.02);

        const totalSumCents = installments.reduce((acc, inst) => acc + toCents(inst.value), 0);
        expect(fromCents(totalSumCents)).toBe(0.02);
    });

    it('deve lidar corretamente com ano bissexto (29 de Fevereiro de 2024)', () => {
        const installments = calculateInstallments({
            totalValue: 300.00,
            count: 3,
            startDate: '2024-01-31'
        });

        expect(installments).toHaveLength(3);
        expect(installments[0].dueDate).toBe('2024-01-31');
        expect(installments[1].dueDate).toBe('2024-02-29'); // 2024 É bissexto
        expect(installments[2].dueDate).toBe('2024-03-31');
    });

    it('deve lidar com virada de ano (Novembro -> Dezembro -> Janeiro -> Fevereiro)', () => {
        const installments = calculateInstallments({
            totalValue: 400.00,
            count: 4,
            startDate: '2026-11-15'
        });

        expect(installments).toHaveLength(4);
        expect(installments[0].dueDate).toBe('2026-11-15');
        expect(installments[1].dueDate).toBe('2026-12-15');
        expect(installments[2].dueDate).toBe('2027-01-15');
        expect(installments[3].dueDate).toBe('2027-02-15');
    });
});

describe('Financial Service - Projeção de Faturas e Compromissos Futuros', () => {
    it('deve retornar array vazio se startMonth for inválido', () => {
        expect(calculateFutureCommitments({ loans: [], startMonth: '' })).toEqual([]);
        expect(calculateFutureCommitments({ loans: [], startMonth: 'invalido' })).toEqual([]);
    });

    it('deve projetar compromissos mês a mês considerando parcelas e assinaturas ativas', () => {
        const loans = [
            {
                id: 'loan-1',
                description: 'Notebook',
                installments: [
                    { number: 1, value: 500.00, dueDate: '2026-08-10' },
                    { number: 2, value: 500.00, dueDate: '2026-09-10' }
                ]
            },
            {
                id: 'loan-2',
                description: 'Tênis',
                installments: [
                    { number: 1, value: 150.00, dueDate: '2026-08-15' },
                    { number: 2, value: 150.00, dueDate: '2026-09-15' },
                    { number: 3, value: 150.00, dueDate: '2026-10-15' }
                ]
            }
        ];

        const subscriptions = [
            { id: 'sub-1', name: 'Netflix', amount: 55.90, isActive: true },
            { id: 'sub-2', name: 'Academia', amount: 100.00, isActive: false } // Inativa -> ignorar
        ];

        const projection = calculateFutureCommitments({
            loans,
            subscriptions,
            startMonth: '2026-08',
            monthsCount: 4
        });

        expect(projection).toHaveLength(4);

        // Mês 1 (2026-08): 500 + 150 + 55.90 = 705.90
        expect(projection[0].month).toBe('2026-08');
        expect(projection[0].installmentsTotal).toBe(650.00);
        expect(projection[0].subscriptionsTotal).toBe(55.90);
        expect(projection[0].totalCommitted).toBe(705.90);

        // Mês 2 (2026-09): 500 + 150 + 55.90 = 705.90 (Notebook termina aqui!)
        expect(projection[1].month).toBe('2026-09');
        expect(projection[1].installmentsTotal).toBe(650.00);
        expect(projection[1].endingLoansCount).toBe(1);
        expect(projection[1].reliefAmount).toBe(500.00);

        // Mês 3 (2026-10): 150 + 55.90 = 205.90 (Tênis termina aqui!)
        expect(projection[2].month).toBe('2026-10');
        expect(projection[2].installmentsTotal).toBe(150.00);
        expect(projection[2].endingLoansCount).toBe(1);
        expect(projection[2].reliefAmount).toBe(150.00);

        // Mês 4 (2026-11): Apenas assinaturas: 55.90
        expect(projection[3].month).toBe('2026-11');
        expect(projection[3].installmentsTotal).toBe(0.00);
        expect(projection[3].totalCommitted).toBe(55.90);
    });

    it('deve calcular a curva de descompressão financeira corretamente', () => {
        const loans = [
            {
                id: 'loan-1',
                installments: [
                    { number: 1, value: 300.00, dueDate: '2026-08-10' } // Termina em Ago
                ]
            },
            {
                id: 'loan-2',
                installments: [
                    { number: 1, value: 120.00, dueDate: '2026-08-15' },
                    { number: 2, value: 120.00, dueDate: '2026-09-15' } // Termina em Set
                ]
            }
        ];

        const relief = calculateDebtReliefTimeline({
            loans,
            startMonth: '2026-08',
            monthsCount: 3
        });

        expect(relief.totalLoansEnding).toBe(2);
        expect(relief.totalMonthlyRelief).toBe(420.00); // 300 + 120
        expect(relief.timeline).toHaveLength(2);
        expect(relief.timeline[0]).toEqual({ month: '2026-08', label: 'Ago/26', relief: 300.00, endingCount: 1 });
        expect(relief.timeline[1]).toEqual({ month: '2026-09', label: 'Set/26', relief: 120.00, endingCount: 1 });
    });
});

describe('Financial Service - Central Consolidada de Repasses de Terceiros', () => {
    it('deve retornar zeros se targetMonth não for informado', () => {
        const res = calculateConsolidatedClientReceivables({ targetMonth: '' });
        expect(res.totalReceivableThisMonth).toBe(0);
        expect(res.totalPendingThisMonth).toBe(0);
        expect(res.byClient).toHaveLength(0);
    });

    it('deve consolidar repasses do mês e futuros sem contagem dupla em compras compartilhadas', () => {
        const clients = [
            { id: 'c-joao', name: 'João Silva' },
            { id: 'c-maria', name: 'Maria Souza' }
        ];

        const loans = [
            // Compra compartilhada entre João e Maria: R$ 200 total (100 para João, 100 para Maria em 2x de 50)
            {
                id: 'loan-shared',
                isShared: true,
                sharedDetails: {
                    person1: {
                        clientId: 'c-joao',
                        installments: [
                            { number: 1, value: 50.00, dueDate: '2026-08-10', status: 'Pago' },
                            { number: 2, value: 50.00, dueDate: '2026-09-10', status: 'Pendente' }
                        ]
                    },
                    person2: {
                        clientId: 'c-maria',
                        installments: [
                            { number: 1, value: 50.00, dueDate: '2026-08-10', status: 'Pendente' },
                            { number: 2, value: 50.00, dueDate: '2026-09-10', status: 'Pendente' }
                        ]
                    }
                }
            },
            // Compra 100% do João: R$ 80 em 2026-08
            {
                id: 'loan-joao-only',
                clientId: 'c-joao',
                isShared: false,
                installments: [
                    { number: 1, value: 80.00, dueDate: '2026-08-15', status: 'Pendente' }
                ]
            }
        ];

        const res = calculateConsolidatedClientReceivables({
            loans,
            expenses: [],
            subscriptions: [],
            clients,
            targetMonth: '2026-08'
        });

        // Totais do mês 2026-08:
        // João: 50 (pago) + 80 (pendente) = 130 total, 50 pago, 80 pendente. Futuro: 50 (Setembro).
        // Maria: 50 (pendente) = 50 total, 0 pago, 50 pendente. Futuro: 50 (Setembro).
        // Total Geral 2026-08: 180 total a receber, 50 pago, 130 pendente. Total Futuro: 100.
        expect(res.totalReceivableThisMonth).toBe(180.00);
        expect(res.totalPaidThisMonth).toBe(50.00);
        expect(res.totalPendingThisMonth).toBe(130.00);
        expect(res.totalFutureReceivables).toBe(100.00);

        const joao = res.byClient.find(c => c.clientId === 'c-joao');
        expect(joao.receivableThisMonth).toBe(130.00);
        expect(joao.paidThisMonth).toBe(50.00);
        expect(joao.pendingThisMonth).toBe(80.00);
        expect(joao.totalFutureRemaining).toBe(50.00);
        expect(joao.hasPending).toBe(true);

        const maria = res.byClient.find(c => c.clientId === 'c-maria');
        expect(maria.receivableThisMonth).toBe(50.00);
        expect(maria.paidThisMonth).toBe(0.00);
        expect(maria.pendingThisMonth).toBe(50.00);
        expect(maria.totalFutureRemaining).toBe(50.00);
        expect(maria.hasPending).toBe(true);
    });
});

describe('Financial Service - Comparativo Mensal (MoM Delta)', () => {
    it('deve obter o mês anterior tratando virada de ano corretamente', () => {
        expect(getPreviousMonthString('2026-08')).toBe('2026-07');
        expect(getPreviousMonthString('2027-01')).toBe('2026-12');
        expect(getPreviousMonthString('')).toBe('');
    });

    it('deve calcular deltas percentuais e absolutos sem gerar NaN ou Infinity', () => {
        // Aumento de 10%: 100 -> 110
        const up10 = calculateMonthOverMonthDelta(110, 100);
        expect(up10.delta).toBe(10);
        expect(up10.percentage).toBe(10);
        expect(up10.direction).toBe('up');
        expect(up10.label).toBe('+10,0%');

        // Queda de 25%: 200 -> 150
        const down25 = calculateMonthOverMonthDelta(150, 200);
        expect(down25.delta).toBe(-50);
        expect(down25.percentage).toBe(-25);
        expect(down25.direction).toBe('down');
        expect(down25.label).toBe('-25,0%');

        // Ambos zero: 0 -> 0
        const zeros = calculateMonthOverMonthDelta(0, 0);
        expect(zeros.delta).toBe(0);
        expect(zeros.percentage).toBe(0);
        expect(zeros.direction).toBe('neutral');
        expect(zeros.label).toBe('0,0%');

        // Anterior zero e atual positivo: 0 -> 150
        const prevZero = calculateMonthOverMonthDelta(150, 0);
        expect(prevZero.delta).toBe(150);
        expect(prevZero.percentage).toBe(100);
        expect(prevZero.direction).toBe('up');

        // Anterior positivo e atual zero: 150 -> 0
        const curZero = calculateMonthOverMonthDelta(0, 150);
        expect(curZero.delta).toBe(-150);
        expect(curZero.percentage).toBe(-100);
        expect(curZero.direction).toBe('down');
    });

    it('deve calcular o resumo comparativo mensal completo usando dados em memória', () => {
        const loans = [
            {
                installments: [
                    { value: 1000.00, dueDate: '2026-07-10' },
                    { value: 1200.00, dueDate: '2026-08-10' }
                ]
            }
        ];

        const incomes = [
            { value: 5000.00, date: '2026-07-05' },
            { value: 5000.00, date: '2026-08-05' }
        ];

        const summary = calculateMonthlyComparisonSummary({
            selectedMonth: '2026-08',
            loans,
            incomes
        });

        expect(summary.previousMonth).toBe('2026-07');
        expect(summary.currentInvoiceTotal).toBe(1200.00);
        expect(summary.previousInvoiceTotal).toBe(1000.00);
        expect(summary.invoiceDelta.percentage).toBe(20);
        expect(summary.invoiceDelta.direction).toBe('up');
        expect(summary.incomesDelta.percentage).toBe(0);
        expect(summary.incomesDelta.direction).toBe('neutral');
    });
});

describe('Financial Service - Motor de Insights Determinísticos', () => {
    it('deve retornar array vazio se selectedMonth não for informado ou sem dados', () => {
        expect(generateDeterministicFinancialInsights({ selectedMonth: '' })).toEqual([]);
        expect(generateDeterministicFinancialInsights({ selectedMonth: '2026-08' })).toEqual([]);
    });

    it('deve disparar insight de alívio quando há compras finalizando no horizonte de 3 meses', () => {
        const loans = [
            {
                id: 'loan-1',
                installments: [
                    { number: 1, value: 250.00, dueDate: '2026-08-10' } // Última parcela
                ]
            }
        ];

        const insights = generateDeterministicFinancialInsights({
            selectedMonth: '2026-08',
            loans
        });

        expect(insights.length).toBeGreaterThanOrEqual(1);
        const reliefInsight = insights.find(i => i.type === 'relief');
        expect(reliefInsight).toBeDefined();
        expect(reliefInsight.title).toBe('Alívio de Parcelas');
        expect(reliefInsight.text).toContain(formatCurrencyDisplay(250));
    });

    it('deve disparar insight de repasses de terceiros quando houver valores a receber de terceiros no mês', () => {
        const clients = [{ id: 'c-joao', name: 'João' }];
        const loans = [
            {
                id: 'loan-1',
                clientId: 'c-joao',
                installments: [{ number: 1, value: 180.00, dueDate: '2026-08-15', status: 'Pendente' }]
            }
        ];

        const insights = generateDeterministicFinancialInsights({
            selectedMonth: '2026-08',
            loans,
            clients
        });

        const recInsight = insights.find(i => i.type === 'receivables');
        expect(recInsight).toBeDefined();
        expect(recInsight.text).toContain(formatCurrencyDisplay(180));
    });

    it('deve respeitar a quantidade máxima de insights (máximo 3)', () => {
        const clients = [{ id: 'c-1', name: 'Amigo' }];
        const loans = [
            {
                id: 'loan-1',
                clientId: 'c-1',
                installments: [
                    { number: 1, value: 500.00, dueDate: '2026-07-10' },
                    { number: 2, value: 1000.00, dueDate: '2026-08-10' } // Finaliza aqui, gera alívio, variação +100%, repasse
                ]
            }
        ];
        const incomes = [{ value: 1200.00, date: '2026-08-01' }]; // Comprometimento alto (1000/1200 = 83%)
        const expenses = [
            { value: 200.00, date: '2026-08-02', category: 'Alimentação' },
            { value: 150.00, date: '2026-08-03', category: 'Alimentação' },
            { value: 50.00, date: '2026-08-04', category: 'Transporte' }
        ];

        const insights = generateDeterministicFinancialInsights({
            selectedMonth: '2026-08',
            loans,
            incomes,
            expenses,
            clients,
            maxInsights: 3
        });

        expect(insights.length).toBeLessThanOrEqual(3);
    });
});

describe('Financial Service - Inteligência de Limite e Comprometimento de Cartões', () => {
    it('deve retornar zeros se card for nulo ou indefinido', () => {
        const res = calculateCardLimitIntelligence({ card: null });
        expect(res.registeredLimit).toBe(0);
        expect(res.committedAmount).toBe(0);
        expect(res.estimatedAvailable).toBe(0);
        expect(res.utilizationPercentage).toBe(0);
        expect(res.isHighUtilization).toBe(false);
    });

    it('deve calcular comprometido, disponível e percentual de utilização corretamente', () => {
        const card = { id: 'card-black', name: 'Black Card', limit: 5000.00 };
        const loans = [
            {
                id: 'l-1',
                cardId: 'card-black',
                installments: [
                    { number: 1, value: 500.00, status: 'Pago' }, // Quitado -> não compromete mais limite
                    { number: 2, value: 500.00, status: 'Pendente' },
                    { number: 3, value: 500.00, status: 'Pendente' }
                ]
            },
            {
                id: 'l-2',
                cardId: 'card-black',
                isShared: true,
                sharedDetails: {
                    person1: {
                        installments: [{ number: 1, value: 300.00, status: 'Pendente' }]
                    },
                    person2: {
                        installments: [{ number: 1, value: 200.00, status: 'Pendente' }]
                    }
                }
            }
        ];
        const expenses = [
            { cardId: 'card-black', value: 100.00, status: 'Pendente' },
            { cardId: 'card-outro', value: 800.00, status: 'Pendente' } // Outro cartão -> ignorar
        ];

        // Comprometido total no card-black:
        // l-1: 500 + 500 = 1000
        // l-2: 300 + 200 = 500
        // expenses: 100
        // Total = 1600.00
        // Disponível estimado: 5000 - 1600 = 3400.00
        // Utilização: 1600 / 5000 * 100 = 32%
        const res = calculateCardLimitIntelligence({ card, loans, expenses });
        expect(res.registeredLimit).toBe(5000.00);
        expect(res.committedAmount).toBe(1600.00);
        expect(res.estimatedAvailable).toBe(3400.00);
        expect(res.utilizationPercentage).toBe(32);
        expect(res.isHighUtilization).toBe(false);
    });

    it('deve disparar isHighUtilization quando utilização for >= 85%', () => {
        const card = { id: 'card-1', limit: 1000.00 };
        const loans = [
            {
                cardId: 'card-1',
                installments: [{ number: 1, value: 850.00, status: 'Pendente' }]
            }
        ];

        const res = calculateCardLimitIntelligence({ card, loans });
        expect(res.utilizationPercentage).toBe(85);
        expect(res.isHighUtilization).toBe(true);
    });

    it('deve tratar limite zero ou ausente sem gerar NaN ou Infinity', () => {
        const cardZero = { id: 'card-zero', limit: 0 };
        const loans = [
            { cardId: 'card-zero', installments: [{ number: 1, value: 200.00, status: 'Pendente' }] }
        ];

        const res = calculateCardLimitIntelligence({ card: cardZero, loans });
        expect(res.registeredLimit).toBe(0);
        expect(res.committedAmount).toBe(200.00);
        expect(res.estimatedAvailable).toBe(0);
        expect(res.utilizationPercentage).toBe(0);
        expect(res.isHighUtilization).toBe(false);
    });
});

describe('Financial Service - Motor de Alertas Financeiros Internos', () => {
    it('deve disparar alerta de fatura próxima do vencimento (<= 3 dias) quando há fatura pendente', () => {
        const cards = [{ id: 'card-1', name: 'Nubank', dueDay: 15 }];
        const loans = [
            {
                cardId: 'card-1',
                installments: [{ number: 1, value: 500.00, dueDate: '2026-08-15', status: 'Pendente' }]
            }
        ];

        // Hoje é dia 13 (faltam 2 dias)
        const alerts = generateFinancialAlerts({
            selectedMonth: '2026-08',
            loans,
            cards,
            todayStr: '2026-08-13'
        });

        const dueAlert = alerts.find(a => a.type === 'card_due');
        expect(dueAlert).toBeDefined();
        expect(dueAlert.title).toContain('Nubank');
        expect(dueAlert.message).toContain('vence em 2 dias');
    });

    it('NÃO deve disparar alerta de fatura se ela já foi totalmente paga', () => {
        const cards = [{ id: 'card-1', name: 'Nubank', dueDay: 15 }];
        const loans = [
            {
                cardId: 'card-1',
                installments: [{ number: 1, value: 500.00, dueDate: '2026-08-15', status: 'Pago' }]
            }
        ];

        const alerts = generateFinancialAlerts({
            selectedMonth: '2026-08',
            loans,
            cards,
            todayStr: '2026-08-13'
        });

        const dueAlert = alerts.find(a => a.type === 'card_due');
        expect(dueAlert).toBeUndefined();
    });

    it('deve disparar alerta de repasse pendente quando houver terceiros com valores devidos no mês', () => {
        const clients = [{ id: 'c-joao', name: 'João' }];
        const loans = [
            {
                id: 'l-1',
                clientId: 'c-joao',
                installments: [{ number: 1, value: 120.00, dueDate: '2026-08-10', status: 'Pendente' }]
            }
        ];

        const alerts = generateFinancialAlerts({
            selectedMonth: '2026-08',
            loans,
            clients
        });

        const repAlert = alerts.find(a => a.type === 'receivables_pending');
        expect(repAlert).toBeDefined();
        expect(repAlert.message).toContain(formatCurrencyDisplay(120));
    });

    it('deve disparar alerta de limite alto quando utilização do cartão for >= 85%', () => {
        const cards = [{ id: 'card-black', name: 'Black', limit: 1000.00 }];
        const loans = [
            {
                cardId: 'card-black',
                installments: [{ number: 1, value: 900.00, status: 'Pendente' }]
            }
        ];

        const alerts = generateFinancialAlerts({
            selectedMonth: '2026-08',
            loans,
            cards
        });

        const limitAlert = alerts.find(a => a.type === 'high_limit');
        expect(limitAlert).toBeDefined();
        expect(limitAlert.message).toContain('90,0%');
    });

    it('deve respeitar a quantidade máxima de alertas retornados (máximo 3)', () => {
        const cards = [{ id: 'c-1', name: 'Card 1', dueDay: 10, limit: 1000 }];
        const clients = [{ id: 'cl-1', name: 'Pessoa 1' }];
        const subscriptions = [{ id: 's-1', name: 'Netflix', dueDate: 11, amount: 55.90, isActive: true }];
        const loans = [
            {
                id: 'l-1',
                cardId: 'c-1',
                clientId: 'cl-1',
                installments: [{ number: 1, value: 950.00, dueDate: '2026-08-10', status: 'Pendente' }]
            }
        ];

        const alerts = generateFinancialAlerts({
            selectedMonth: '2026-08',
            loans,
            cards,
            clients,
            subscriptions,
            todayStr: '2026-08-09',
            maxAlerts: 3
        });

        expect(alerts.length).toBeLessThanOrEqual(3);
    });
});

describe('Financial Service - Compatibilidade com Shapes Legados e Arrays Inválidos (Fase 7.2.4 Hotfix)', () => {
    it('asArray helper: deve retornar o array quando válido e [] para qualquer valor não-array', () => {
        expect(asArray([1, 2, 3])).toEqual([1, 2, 3]);
        expect(asArray([])).toEqual([]);
        expect(asArray({})).toEqual([]);
        expect(asArray("string")).toEqual([]);
        expect(asArray(100)).toEqual([]);
        expect(asArray(null)).toEqual([]);
        expect(asArray(undefined)).toEqual([]);
        expect(asArray(true)).toEqual([]);
    });

    it('A. deve tolerar loan.installments = {} sem lançar TypeError', () => {
        const loans = [
            { id: 'l1', totalValue: 300, cardId: 'c1', clientId: 'cli1', dueDate: '2026-08-10', installments: {} }
        ];

        expect(() => calculateCardInvoiceTotal(loans, '2026-08', 'c1')).not.toThrow();
        expect(calculateCardInvoiceTotal(loans, '2026-08', 'c1')).toBe(300);

        expect(() => calculateFutureCommitments({ loans, startMonth: '2026-08', monthsCount: 3 })).not.toThrow();
        expect(() => calculateConsolidatedClientReceivables({ loans, clients: [{ id: 'cli1', name: 'Ana' }], targetMonth: '2026-08' })).not.toThrow();
        expect(() => calculateCardLimitIntelligence({ card: { id: 'c1', limit: 1000 }, loans })).not.toThrow();
        expect(() => generateFinancialAlerts({ selectedMonth: '2026-08', loans, cards: [{ id: 'c1', name: 'Black', dueDay: 10 }] })).not.toThrow();
    });

    it('B. deve tolerar loan.installments = "invalid" sem lançar TypeError', () => {
        const loans = [
            { id: 'l2', totalValue: 200, cardId: 'c1', clientId: 'cli1', dueDate: '2026-08-15', installments: "invalid" }
        ];

        expect(() => calculateCardInvoiceTotal(loans, '2026-08')).not.toThrow();
        expect(() => calculateFutureCommitments({ loans, startMonth: '2026-08' })).not.toThrow();
        expect(() => calculateConsolidatedClientReceivables({ loans, clients: [{ id: 'cli1', name: 'Ana' }], targetMonth: '2026-08' })).not.toThrow();
        expect(() => detectExpenseAnomalies({ selectedMonth: '2026-08', loans })).not.toThrow();
    });

    it('C. deve tolerar loan.installments = 10 sem lançar TypeError', () => {
        const loans = [
            { id: 'l3', totalValue: 500, cardId: 'c1', clientId: 'cli1', dueDate: '2026-08-20', installments: 10 }
        ];

        expect(() => calculateCardInvoiceTotal(loans, '2026-08')).not.toThrow();
        expect(() => calculateFutureCommitments({ loans, startMonth: '2026-08' })).not.toThrow();
        expect(() => generateWeeklyFinancialSummary({ loans, todayStr: '2026-08-15' })).not.toThrow();
        expect(() => generateMonthlyFinancialSummary({ selectedMonth: '2026-08', loans })).not.toThrow();
        expect(() => calculateCategoryBudgetsProgress({ loans, selectedMonth: '2026-08', budgets: { 'Geral': 1000 } })).not.toThrow();
    });

    it('D. deve tolerar loan.installments = null sem lançar TypeError', () => {
        const loans = [
            { id: 'l4', totalValue: 150, cardId: 'c1', clientId: 'cli1', dueDate: '2026-08-05', installments: null }
        ];

        expect(() => calculateCardInvoiceTotal(loans, '2026-08')).not.toThrow();
        expect(calculateCardInvoiceTotal(loans, '2026-08')).toBe(150);
        expect(() => calculateFutureCommitments({ loans, startMonth: '2026-08' })).not.toThrow();
    });

    it('E. deve tolerar loan.sharedDetails.person1.installments = {} sem lançar TypeError', () => {
        const loans = [
            {
                id: 'l-shared-1',
                totalValue: 600,
                isShared: true,
                cardId: 'c1',
                sharedDetails: {
                    person1: { clientId: 'p1', shareAmount: 300, installments: {} },
                    person2: { clientId: 'p2', shareAmount: 300, installments: [{ number: 1, value: 100, dueDate: '2026-08-10', status: 'Pendente' }] }
                }
            }
        ];

        expect(() => calculateFutureCommitments({ loans, startMonth: '2026-08' })).not.toThrow();
        expect(() => calculateConsolidatedClientReceivables({ loans, clients: [{ id: 'p1', name: 'P1' }, { id: 'p2', name: 'P2' }], targetMonth: '2026-08' })).not.toThrow();
        expect(() => calculateCardLimitIntelligence({ card: { id: 'c1', limit: 1000 }, loans })).not.toThrow();
        expect(() => generateWeeklyFinancialSummary({ loans, todayStr: '2026-08-09' })).not.toThrow();
        expect(() => generateAnnualReportCsv({ targetYear: 2026, loans })).not.toThrow();
    });

    it('F. deve tolerar loan.sharedDetails.person2.installments = "invalid" sem lançar TypeError', () => {
        const loans = [
            {
                id: 'l-shared-2',
                totalValue: 400,
                isShared: true,
                cardId: 'c1',
                sharedDetails: {
                    person1: { clientId: 'p1', shareAmount: 200, installments: [{ number: 1, value: 100, dueDate: '2026-08-10', status: 'Pendente' }] },
                    person2: { clientId: 'p2', shareAmount: 200, installments: "invalid" }
                }
            }
        ];

        expect(() => calculateFutureCommitments({ loans, startMonth: '2026-08' })).not.toThrow();
        expect(() => calculateConsolidatedClientReceivables({ loans, clients: [{ id: 'p1', name: 'P1' }], targetMonth: '2026-08' })).not.toThrow();
        expect(() => calculateCardLimitIntelligence({ card: { id: 'c1', limit: 1000 }, loans })).not.toThrow();
        expect(() => generateWeeklyFinancialSummary({ loans, todayStr: '2026-08-09' })).not.toThrow();
    });

    it('G. arrays válidos continuam calculando exatamente os mesmos resultados matemáticos anteriores', () => {
        const validLoans = [
            {
                id: 'l-val-1',
                cardId: 'c1',
                clientId: 'cli1',
                category: 'Eletrônicos',
                totalValue: 300,
                installments: [
                    { number: 1, value: 100.00, dueDate: '2026-08-10', status: 'Pendente' },
                    { number: 2, value: 100.00, dueDate: '2026-09-10', status: 'Pendente' },
                    { number: 3, value: 100.00, dueDate: '2026-10-10', status: 'Pendente' }
                ]
            }
        ];

        expect(calculateCardInvoiceTotal(validLoans, '2026-08')).toBe(100.00);
        expect(calculateCardInvoiceTotal(validLoans, '2026-09')).toBe(100.00);
        expect(calculateCardInvoiceTotal(validLoans, '2026-10')).toBe(100.00);

        const commitments = calculateFutureCommitments({ loans: validLoans, startMonth: '2026-08', monthsCount: 3 });
        expect(commitments[0].installmentsTotal).toBe(100.00);
        expect(commitments[1].installmentsTotal).toBe(100.00);
        expect(commitments[2].installmentsTotal).toBe(100.00);
        expect(commitments[2].endingLoansCount).toBe(1);
        expect(commitments[2].reliefAmount).toBe(100.00);
    });

    it('H. nenhuma função chamada pelo Dashboard lança TypeError quando recebe shape legado inválido em todos os parâmetros', () => {
        const malformedLoans = [
            { id: 'm1', totalValue: 100, installments: {} },
            { id: 'm2', totalValue: 200, installments: 'bad' },
            { id: 'm3', totalValue: 300, isShared: true, sharedDetails: { person1: { installments: {} }, person2: { installments: 123 } } },
            null,
            undefined
        ];
        const malformedExpenses = [
            { id: 'e1', value: 50, date: '2026-08-01' },
            null,
            { id: 'e2', value: 'invalid' }
        ];
        const malformedSubs = [
            { id: 's1', amount: 30, dueDate: 10, isActive: true },
            null
        ];
        const malformedClients = [{ id: 'c1', name: 'Test' }, null];
        const malformedCards = [{ id: 'card1', name: 'Card', limit: 500, dueDay: 10 }, null];

        expect(() => calculateNetBalance({}, {}, {})).not.toThrow();
        expect(() => calculateClientDebt({}, {}, {})).not.toThrow();
        expect(() => calculateCardInvoiceTotal(malformedLoans, '2026-08')).not.toThrow();
        expect(() => aggregateByCategory({})).not.toThrow();
        expect(() => calculateFutureCommitments({ loans: malformedLoans, subscriptions: malformedSubs, startMonth: '2026-08' })).not.toThrow();
        expect(() => calculateDebtReliefTimeline({ loans: malformedLoans, startMonth: '2026-08' })).not.toThrow();
        expect(() => calculateConsolidatedClientReceivables({ loans: malformedLoans, expenses: malformedExpenses, subscriptions: malformedSubs, clients: malformedClients, targetMonth: '2026-08' })).not.toThrow();
        expect(() => calculateMonthlyComparisonSummary({ selectedMonth: '2026-08', loans: malformedLoans, expenses: malformedExpenses, incomes: {} })).not.toThrow();
        expect(() => generateDeterministicFinancialInsights({ selectedMonth: '2026-08', loans: malformedLoans, expenses: malformedExpenses, subscriptions: malformedSubs, clients: malformedClients })).not.toThrow();
        expect(() => calculateCardLimitIntelligence({ card: malformedCards[0], loans: malformedLoans, expenses: malformedExpenses })).not.toThrow();
        expect(() => generateFinancialAlerts({ selectedMonth: '2026-08', loans: malformedLoans, expenses: malformedExpenses, subscriptions: malformedSubs, cards: malformedCards, clients: malformedClients })).not.toThrow();
        expect(() => detectExpenseAnomalies({ selectedMonth: '2026-08', expenses: malformedExpenses, loans: malformedLoans })).not.toThrow();
        expect(() => generateWeeklyFinancialSummary({ loans: malformedLoans, expenses: malformedExpenses, subscriptions: malformedSubs, incomes: {} })).not.toThrow();
        expect(() => generateMonthlyFinancialSummary({ selectedMonth: '2026-08', loans: malformedLoans, expenses: malformedExpenses, subscriptions: malformedSubs, clients: malformedClients })).not.toThrow();
        expect(() => calculateCategoryBudgetsProgress({ budgets: { 'Geral': 500 }, expenses: malformedExpenses, loans: malformedLoans, selectedMonth: '2026-08' })).not.toThrow();
        expect(() => generateAnnualReportCsv({ targetYear: 2026, loans: malformedLoans, expenses: malformedExpenses, subscriptions: malformedSubs, cards: malformedCards, clients: malformedClients })).not.toThrow();
        expect(() => generateTransactionsCsv(malformedLoans)).not.toThrow();
    });

    it('I. reproduzir o padrão vulnerável anterior vs novo comportamento seguro', () => {
        const legacyDoc = {
            id: 'legacy-doc',
            description: 'Compra Legada',
            totalValue: 500,
            installments: {} // Objeto map ao invés de Array
        };

        // Comportamento anterior (vulnerável):
        expect(() => {
            const vulnerableInstallments = legacyDoc.installments || [];
            vulnerableInstallments.forEach(() => {});
        }).toThrow(TypeError);

        // Novo comportamento blindado com asArray:
        expect(() => {
            const safeInstallments = asArray(legacyDoc.installments);
            safeInstallments.forEach(() => {});
        }).not.toThrow();
    });

    it('Integração: Simulação do pipeline de cálculo do Dashboard com dados legados reais misturados', () => {
        const fixtureLoans = [
            {
                id: 'loan-valid-array',
                description: 'Celular',
                totalValue: 1200,
                cardId: 'card-1',
                clientId: 'client-1',
                installments: [
                    { number: 1, value: 400, dueDate: '2026-08-10', status: 'Paga' },
                    { number: 2, value: 400, dueDate: '2026-09-10', status: 'Pendente' },
                    { number: 3, value: 400, dueDate: '2026-10-10', status: 'Pendente' }
                ]
            },
            {
                id: 'loan-legacy-object',
                description: 'Notebook Antigo',
                totalValue: 2000,
                cardId: 'card-1',
                clientId: 'client-2',
                dueDate: '2026-08-10',
                installments: {} // Shape legado Firestore map
            },
            {
                id: 'loan-legacy-null',
                description: 'Cadeira',
                totalValue: 350,
                cardId: 'card-2',
                dueDate: '2026-08-15',
                installments: null
            },
            {
                id: 'loan-shared-corrupted',
                description: 'Jantar',
                totalValue: 300,
                isShared: true,
                cardId: 'card-1',
                sharedDetails: {
                    person1: { clientId: 'client-1', shareAmount: 150, installments: {} },
                    person2: { clientId: 'client-2', shareAmount: 150, installments: "string-malformada" }
                }
            }
        ];

        const fixtureCards = [
            { id: 'card-1', name: 'Nubank Black', limit: 10000, dueDay: 10 },
            { id: 'card-2', name: 'Itaú Platinum', limit: 5000, dueDay: 15 }
        ];

        const fixtureClients = [
            { id: 'client-1', name: 'Carlos' },
            { id: 'client-2', name: 'Mariana' }
        ];

        // 1. Fatura
        const invoiceTotal = calculateCardInvoiceTotal(fixtureLoans, '2026-08', 'card-1');
        expect(invoiceTotal).toBeGreaterThan(0);

        // 2. Repasses
        const receivables = calculateConsolidatedClientReceivables({
            loans: fixtureLoans,
            clients: fixtureClients,
            targetMonth: '2026-08'
        });
        expect(receivables).toBeDefined();

        // 3. Projeção Futura
        const commitments = calculateFutureCommitments({
            loans: fixtureLoans,
            startMonth: '2026-08',
            monthsCount: 4
        });
        expect(commitments.length).toBe(4);

        // 4. Insights & Alertas
        const insights = generateDeterministicFinancialInsights({
            selectedMonth: '2026-08',
            loans: fixtureLoans,
            clients: fixtureClients
        });
        expect(Array.isArray(insights)).toBe(true);

        const alerts = generateFinancialAlerts({
            selectedMonth: '2026-08',
            loans: fixtureLoans,
            cards: fixtureCards,
            clients: fixtureClients
        });
        expect(Array.isArray(alerts)).toBe(true);
    });
});







