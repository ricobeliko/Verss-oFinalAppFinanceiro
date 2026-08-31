// tests/csvExportService.test.js
import { describe, it, expect } from 'vitest';
import { escapeCsvField, formatCsvCurrency, generateTransactionsCsv, generateAnnualReportCsv } from '../src/services/csvExportService';

describe('csvExportService', () => {
    describe('escapeCsvField', () => {
        it('deve escapar campos normais com aspas', () => {
            expect(escapeCsvField('Supermercado')).toBe('"Supermercado"');
            expect(escapeCsvField(150)).toBe('"150"');
        });

        it('deve tratar campos nulos ou indefinidos', () => {
            expect(escapeCsvField(null)).toBe('""');
            expect(escapeCsvField(undefined)).toBe('""');
        });

        it('deve duplicar aspas internas e escapar ponto-e-vírgula', () => {
            expect(escapeCsvField('Compra "especial"; teste')).toBe('"Compra ""especial""; teste"');
        });
    });

    describe('formatCsvCurrency', () => {
        it('deve formatar número com vírgula decimal brasileira', () => {
            expect(formatCsvCurrency(1250.50)).toBe('1250,50');
            expect(formatCsvCurrency(0.99)).toBe('0,99');
            expect(formatCsvCurrency(0)).toBe('0,00');
        });

        it('deve tratar valores inválidos retornando 0,00', () => {
            expect(formatCsvCurrency(NaN)).toBe('0,00');
            expect(formatCsvCurrency(null)).toBe('0,00');
        });
    });

    describe('generateTransactionsCsv', () => {
        it('deve gerar CSV com BOM UTF-8 e cabeçalhos corretos', () => {
            const transactions = [
                {
                    type: 'Despesa',
                    date: '2026-08-15',
                    description: 'Almoço Restaurante',
                    category: 'Alimentação',
                    clientName: 'João Silva',
                    cardName: 'Black Card',
                    installment: '-',
                    value: 85.50,
                    status: 'Pago'
                }
            ];

            const csv = generateTransactionsCsv(transactions);

            expect(csv.startsWith('\uFEFF')).toBe(true);
            expect(csv).toContain('"Tipo";"Data";"Descrição";"Categoria";"Pessoa/Cliente";"Forma de Pagamento";"Parcela";"Valor (R$)";"Status"');
            expect(csv).toContain('"Despesa";"2026-08-15";"Almoço Restaurante";"Alimentação";"João Silva";"Black Card";"-";"85,50";"Pago"');
        });

        it('deve lidar com lista vazia sem quebrar', () => {
            const csv = generateTransactionsCsv([]);
            expect(csv.startsWith('\uFEFF')).toBe(true);
            expect(csv.split('\r\n').length).toBe(1);
        });
    });

    describe('generateAnnualReportCsv', () => {
        it('deve gerar relatório anual consolidado com resumo e lançamentos do ano', () => {
            const cards = [{ id: 'card-1', name: 'Mastercard Black' }];
            const clients = [{ id: 'client-1', name: 'Maria Souza' }];
            const incomes = [{ description: 'Salário', value: 10000.00, date: '2026-05-05' }];
            const expenses = [{ description: 'Farmácia', value: 200.00, date: '2026-05-10', cardId: 'card-1', clientId: 'client-1' }];
            const loans = [
                {
                    description: 'Notebook',
                    cardId: 'card-1',
                    installmentsCount: 2,
                    installments: [
                        { number: 1, value: 1500.00, dueDate: '2026-05-15', status: 'Pago' },
                        { number: 2, value: 1500.00, dueDate: '2026-06-15', status: 'Pendente' }
                    ]
                },
                {
                    description: 'Compra de 2025 (Ignorar)',
                    cardId: 'card-1',
                    installments: [
                        { number: 1, value: 999.00, dueDate: '2025-12-15', status: 'Pago' }
                    ]
                }
            ];

            const csv = generateAnnualReportCsv({
                targetYear: '2026',
                incomes,
                expenses,
                loans,
                cards,
                clients
            });

            expect(csv.startsWith('\uFEFF')).toBe(true);
            expect(csv).toContain('RELATÓRIO FINANCEIRO ANUAL CONSOLIDADO - EXERCÍCIO 2026');
            expect(csv).toContain('"Total de Receitas no Ano";"10000,00"');
            expect(csv).toContain('"Total Comprometido em Faturas de Cartão";"3000,00"');
            expect(csv).toContain('"Total em Despesas Avulsas";"200,00"');
            expect(csv).toContain('"Total Geral de Saídas";"3200,00"');
            expect(csv).toContain('"Saldo Líquido Anual";"6800,00"');

            // Verifica detalhamento
            expect(csv).toContain('"Notebook"');
            expect(csv).toContain('"Farmácia"');
            expect(csv).not.toContain('"Compra de 2025 (Ignorar)"');
        });

        it('A. paymentMethod continua sendo exportado quando cardName não existe', () => {
            const csv = generateTransactionsCsv([{ paymentMethod: 'Boleto' }]);
            expect(csv).toContain('"Boleto"');
        });

        it('B. t.installment continua sendo respeitado', () => {
            const csv = generateTransactionsCsv([{ installment: '3/12' }]);
            expect(csv).toContain('"3/12"');
        });

        it('C. installmentNumber/totalInstallments continua funcionando', () => {
            const csv = generateTransactionsCsv([{ installmentNumber: 2, totalInstallments: 5 }]);
            expect(csv).toContain('"2/5"');
        });

        it('D. t.date continua tendo prioridade sobre dueDate', () => {
            const csv = generateTransactionsCsv([{ date: '2026-08-01', dueDate: '2026-08-10' }]);
            expect(csv).toContain('"2026-08-01"');
            expect(csv).not.toContain('"2026-08-10"');
        });

        it('E. t.person continua sendo fallback válido quando clientName não existe', () => {
            const csv = generateTransactionsCsv([{ person: 'Carlos Silva' }]);
            expect(csv).toContain('"Carlos Silva"');
        });

        it('F. t.status continua sendo a fonte primária do status', () => {
            const csv = generateTransactionsCsv([{ status: 'Liquidado' }]);
            expect(csv).toContain('"Liquidado"');
        });

        it('G. defaults continuam exatamente: Movimentação, "", -, Dinheiro/Pix, -, 0,00, Pendente', () => {
            const csv = generateTransactionsCsv([{}]);
            expect(csv).toContain('"Movimentação";"";"";"-";"-";"Dinheiro/Pix";"-";"0,00";"Pendente"');
        });

        it('H. input válido conhecido gera exatamente a mesma string CSV do baseline 9b237a3', () => {
            const fixture = [
                {
                    type: 'Despesa',
                    date: '2026-08-15',
                    description: 'Almoço Restaurante',
                    category: 'Alimentação',
                    clientName: 'João Silva',
                    cardName: 'Black Card',
                    installment: '-',
                    value: 85.50,
                    status: 'Pago'
                }
            ];
            const expectedCsv = '\uFEFF"Tipo";"Data";"Descrição";"Categoria";"Pessoa/Cliente";"Forma de Pagamento";"Parcela";"Valor (R$)";"Status"\r\n"Despesa";"2026-08-15";"Almoço Restaurante";"Alimentação";"João Silva";"Black Card";"-";"85,50";"Pago"';
            expect(generateTransactionsCsv(fixture)).toBe(expectedCsv);
        });

        it('I. input não-array não lança e produz apenas header seguro', () => {
            const expectedHeaderOnly = '\uFEFF"Tipo";"Data";"Descrição";"Categoria";"Pessoa/Cliente";"Forma de Pagamento";"Parcela";"Valor (R$)";"Status"';
            expect(generateTransactionsCsv(null)).toBe(expectedHeaderOnly);
            expect(generateTransactionsCsv({})).toBe(expectedHeaderOnly);
            expect(generateTransactionsCsv("invalid")).toBe(expectedHeaderOnly);
            expect(generateTransactionsCsv(123)).toBe(expectedHeaderOnly);
        });

        it('deve tolerar shapes legados corrompidos em loans e installments sem lançar TypeError', () => {
            const malformedLoans = [
                { description: 'Legado 1', installments: {} },
                { description: 'Legado 2', installments: 'string-invalida' },
                { description: 'Legado 3', isShared: true, sharedDetails: { person1: { installments: {} }, person2: { installments: null } } },
                null
            ];

            expect(() => generateAnnualReportCsv({
                targetYear: 2026,
                loans: malformedLoans,
                expenses: null,
                subscriptions: {},
                incomes: 123
            })).not.toThrow();

            expect(() => generateTransactionsCsv(malformedLoans)).not.toThrow();
        });
    });
});


