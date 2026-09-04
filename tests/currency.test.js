// tests/currency.test.js
import { describe, it, expect, vi } from 'vitest';
import {
    parseCurrencyInput,
    formatCurrencyDisplay,
    formatCurrencyForInput,
    handleCurrencyInputChange
} from '../src/utils/currency';
import {
    toCents,
    fromCents,
    isValidFinancialValue
} from '../src/services/financialService';

describe('FinControl — Canonical Money Parser (Fase 8.3 Change Set 2)', () => {

    describe('1. Formatos Válidos Obrigatórios (Contrato Canônico)', () => {
        it('deve parsear números e strings monetárias válidas', () => {
            expect(parseCurrencyInput(10)).toBe(10);
            expect(parseCurrencyInput("10")).toBe(10);
            expect(parseCurrencyInput("10,5")).toBe(10.5);
            expect(parseCurrencyInput("10,50")).toBe(10.5);
            expect(parseCurrencyInput("10.5")).toBe(10.5);
            expect(parseCurrencyInput("10.50")).toBe(10.5);
            expect(parseCurrencyInput("1.000")).toBe(1000);
            expect(parseCurrencyInput("10.000")).toBe(10000);
            expect(parseCurrencyInput("100.000")).toBe(100000);
            expect(parseCurrencyInput("1.000,50")).toBe(1000.5);
            expect(parseCurrencyInput("1000,50")).toBe(1000.5);
            expect(parseCurrencyInput("1000.50")).toBe(1000.5);
            expect(parseCurrencyInput("1,000.50")).toBe(1000.5);
            expect(parseCurrencyInput("R$ 1.000,50")).toBe(1000.5);
            expect(parseCurrencyInput("   100   ")).toBe(100);
            expect(parseCurrencyInput("")).toBe(0);
            expect(parseCurrencyInput("   ")).toBe(0);
            expect(parseCurrencyInput(null)).toBe(0);
            expect(parseCurrencyInput(undefined)).toBe(0);
        });

        it('deve parsear centavos mínimos e valores fracionários', () => {
            expect(parseCurrencyInput("0,01")).toBe(0.01);
            expect(parseCurrencyInput("0,10")).toBe(0.10);
            expect(parseCurrencyInput("1,00")).toBe(1.00);
            expect(parseCurrencyInput("0.01")).toBe(0.01);
            expect(parseCurrencyInput(",50")).toBe(0.5);
            expect(parseCurrencyInput("R$ 0,00")).toBe(0);
            expect(parseCurrencyInput(0)).toBe(0);
        });
    });

    describe('2. Defesa Contra Parsing Permissivo e Coerção Acidental', () => {
        it('deve retornar 0 para strings alfabéticas e mistas (não limpar caracteres silenciosamente)', () => {
            expect(parseCurrencyInput("abc")).toBe(0);
            expect(parseCurrencyInput("R$ abc")).toBe(0);
            expect(parseCurrencyInput("abc100")).toBe(0);
            expect(parseCurrencyInput("100abc")).toBe(0);
            expect(parseCurrencyInput("1a0")).toBe(0);
            expect(parseCurrencyInput("1e25")).toBe(0);
            expect(parseCurrencyInput("1E10")).toBe(0);
            expect(parseCurrencyInput("Infinity")).toBe(0);
            expect(parseCurrencyInput("-Infinity")).toBe(0);
            expect(parseCurrencyInput("NaN")).toBe(0);
        });

        it('deve retornar 0 para valores numéricos não finitos', () => {
            expect(parseCurrencyInput(Infinity)).toBe(0);
            expect(parseCurrencyInput(-Infinity)).toBe(0);
            expect(parseCurrencyInput(NaN)).toBe(0);
        });

        it('deve retornar 0 para tipos não suportados', () => {
            expect(parseCurrencyInput({})).toBe(0);
            expect(parseCurrencyInput([])).toBe(0);
            expect(parseCurrencyInput(true)).toBe(0);
            expect(parseCurrencyInput(false)).toBe(0);
        });
    });

    describe('3. Regra de Ambiguidade de Separadores (PT-BR vs Internacional)', () => {
        it('deve interpretar ponto único com 1 ou 2 dígitos como decimal internacional', () => {
            expect(parseCurrencyInput("10.5")).toBe(10.5);
            expect(parseCurrencyInput("10.50")).toBe(10.5);
            expect(parseCurrencyInput("1000.5")).toBe(1000.5);
            expect(parseCurrencyInput("1000.50")).toBe(1000.5);
        });

        it('deve interpretar ponto único com 3 dígitos e agrupamento compatível como milhar PT-BR', () => {
            expect(parseCurrencyInput("1.000")).toBe(1000);
            expect(parseCurrencyInput("10.000")).toBe(10000);
            expect(parseCurrencyInput("100.000")).toBe(100000);
            expect(parseCurrencyInput("1.234")).toBe(1234);
        });

        it('deve aceitar múltiplos pontos somente com agrupamento de milhares coerente', () => {
            expect(parseCurrencyInput("1.000.000")).toBe(1000000);
            expect(parseCurrencyInput("10.000.000")).toBe(10000000);
            expect(parseCurrencyInput("1.000.000,50")).toBe(1000000.5);
            expect(parseCurrencyInput("1,000,000.50")).toBe(1000000.5);
        });

        it('deve rejeitar agrupamentos de pontos estruturalmente inválidos', () => {
            expect(parseCurrencyInput("1000.000")).toBe(0); // 4 dígitos antes do ponto
            expect(parseCurrencyInput("1.00.000")).toBe(0);  // 2 dígitos entre pontos
            expect(parseCurrencyInput("1..000")).toBe(0);    // ponto duplo
            expect(parseCurrencyInput(".1.000")).toBe(0);    // ponto no início
            expect(parseCurrencyInput("1.000.")).toBe(0);    // ponto no fim
            expect(parseCurrencyInput("1.0000")).toBe(0);    // 4 dígitos após ponto único
        });
    });

    describe('4. Valores Negativos Sintaticamente Válidos', () => {
        it('deve preservar sinal negativo quando sintaticamente válido', () => {
            expect(parseCurrencyInput("-50,00")).toBe(-50);
            expect(parseCurrencyInput("-10.50")).toBe(-10.5);
            expect(parseCurrencyInput("-1.000")).toBe(-1000);
            expect(parseCurrencyInput("-1.000,50")).toBe(-1000.5);
            expect(parseCurrencyInput("-R$ 1.000,50")).toBe(-1000.5);
            expect(parseCurrencyInput("R$ -1.000,50")).toBe(-1000.5);
        });

        it('deve rejeitar sinais negativos malformados', () => {
            expect(parseCurrencyInput("1-50")).toBe(0);
            expect(parseCurrencyInput("--50")).toBe(0);
            expect(parseCurrencyInput("50-")).toBe(0);
            expect(parseCurrencyInput("-R$ -50")).toBe(0);
        });
    });

    describe('5. Alinhamento de toCents com Parser Canônico', () => {
        it('deve converter strings monetárias usando as mesmas regras determinísticas', () => {
            expect(toCents("1.000")).toBe(100000);
            expect(toCents("1.000,50")).toBe(100050);
            expect(toCents("10.50")).toBe(1050);
            expect(toCents("abc100")).toBe(0);
            expect(toCents("1e25")).toBe(0);
            expect(toCents("Infinity")).toBe(0);
            expect(toCents("-Infinity")).toBe(0);
            expect(toCents("NaN")).toBe(0);
            expect(toCents(null)).toBe(0);
            expect(toCents(undefined)).toBe(0);
        });

        it('deve preservar comportamento numérico e eliminação de float drift', () => {
            expect(toCents(100.50)).toBe(10050);
            expect(toCents(0.01)).toBe(1);
            expect(toCents(0.1 + 0.2)).toBe(30);
            expect(toCents(Infinity)).toBe(0);
            expect(toCents(-Infinity)).toBe(0);
            expect(toCents(NaN)).toBe(0);
        });

        it('deve converter centavos para decimal com fromCents', () => {
            expect(fromCents(100050)).toBe(1000.50);
            expect(fromCents(1)).toBe(0.01);
            expect(fromCents(0)).toBe(0);
            expect(fromCents(null)).toBe(0);
            expect(fromCents(undefined)).toBe(0);
        });
    });

    describe('6. Gate de Validação — isValidFinancialValue', () => {
        it('deve aprovar valores financeiros estritamente positivos e seguros', () => {
            expect(isValidFinancialValue(100)).toBe(true);
            expect(isValidFinancialValue("50.25")).toBe(true);
            expect(isValidFinancialValue("1.000,50")).toBe(true);
            expect(isValidFinancialValue("0,01")).toBe(true);
        });

        it('deve rejeitar zero, negativos, valores inválidos e unsafe integers', () => {
            expect(isValidFinancialValue(0)).toBe(false);
            expect(isValidFinancialValue("0,00")).toBe(false);
            expect(isValidFinancialValue(-10)).toBe(false);
            expect(isValidFinancialValue("-50,00")).toBe(false);
            expect(isValidFinancialValue("abc100")).toBe(false);
            expect(isValidFinancialValue("1e25")).toBe(false);
            expect(isValidFinancialValue(1e25)).toBe(false);
            expect(isValidFinancialValue(NaN)).toBe(false);
            expect(isValidFinancialValue(Infinity)).toBe(false);
            expect(isValidFinancialValue(null)).toBe(false);
            expect(isValidFinancialValue(undefined)).toBe(false);
        });
    });

    describe('7. formatCurrencyForInput — Regressão', () => {
        it('deve formatar valores numéricos e strings para preenchimento de inputs', () => {
            expect(formatCurrencyForInput(1000)).toBe("1.000,00");
            expect(formatCurrencyForInput(10.5)).toBe("10,50");
            expect(formatCurrencyForInput(0.01)).toBe("0,01");
            expect(formatCurrencyForInput("1000")).toBe("1.000,00");
            expect(formatCurrencyForInput("1.000")).toBe("1.000,00");
            expect(formatCurrencyForInput(0)).toBe("0,00");
        });

        it('deve retornar string vazia para valores nulos, vazios ou não finitos', () => {
            expect(formatCurrencyForInput(null)).toBe("");
            expect(formatCurrencyForInput(undefined)).toBe("");
            expect(formatCurrencyForInput("")).toBe("");
            expect(formatCurrencyForInput(Infinity)).toBe("");
            expect(formatCurrencyForInput(-Infinity)).toBe("");
            expect(formatCurrencyForInput(NaN)).toBe("");
        });
    });

    describe('8. handleCurrencyInputChange — Contrato de Digitação Progressiva', () => {
        it('deve atualizar o estado com base na digitação progressiva de centavos', () => {
            const mockSetter = vi.fn();
            const handler = handleCurrencyInputChange(mockSetter);

            // Digita "1" -> "0,01"
            handler({ target: { value: "1" } });
            expect(mockSetter).toHaveBeenCalledWith("0,01");

            // Digita "10" -> "0,10"
            handler({ target: { value: "10" } });
            expect(mockSetter).toHaveBeenCalledWith("0,10");

            // Digita "100" -> "1,00"
            handler({ target: { value: "100" } });
            expect(mockSetter).toHaveBeenCalledWith("1,00");

            // Digita "1000" -> "10,00"
            handler({ target: { value: "1000" } });
            expect(mockSetter).toHaveBeenCalledWith("10,00");

            // Campo limpo -> ""
            handler({ target: { value: "" } });
            expect(mockSetter).toHaveBeenCalledWith("");

            // Nulo -> ""
            handler({ target: { value: null } });
            expect(mockSetter).toHaveBeenCalledWith("");
        });
    });

    describe('9. formatCurrencyDisplay — Exibição BRL', () => {
        it('deve formatar valores para exibição com símbolo R$', () => {
            expect(formatCurrencyDisplay(1000.5)).toBe("R$\u00A01.000,50");
            expect(formatCurrencyDisplay(0)).toBe("R$\u00A00,00");
            expect(formatCurrencyDisplay(null)).toBe("R$\u00A00,00");
            expect(formatCurrencyDisplay(undefined)).toBe("R$ 0,00");
            expect(formatCurrencyDisplay(NaN)).toBe("R$ 0,00");
        });
    });

    describe('10. CategoryBudgets — Digitação Progressiva e Sanitização de Metas', () => {
        it('deve simular digitação progressiva para orçamento por categoria', () => {
            let budgetState = '';
            const setBudgetState = (val) => { budgetState = val; };
            const handler = handleCurrencyInputChange(setBudgetState);

            handler({ target: { value: "1" } });
            expect(budgetState).toBe("0,01");

            handler({ target: { value: "10" } });
            expect(budgetState).toBe("0,10");

            handler({ target: { value: "100" } });
            expect(budgetState).toBe("1,00");

            handler({ target: { value: "1000" } });
            expect(budgetState).toBe("10,00");

            handler({ target: { value: "123456" } });
            expect(budgetState).toBe("1.234,56");

            handler({ target: { value: "" } });
            expect(budgetState).toBe("");
        });

        it('deve sanitizar orçamentos salvando apenas valores estritamente positivos e descartando vazios/zeros', () => {
            const budgetMap = {
                'Alimentação': '500,00',
                'Transporte': '150,50',
                'Lazer': '',             // Vazio -> Sem meta
                'Saúde': '0,00',         // Zero -> Sem meta (não persistir R$ 0,00)
                'Educação': 'abc',       // Inválido -> Sem meta
            };

            const sanitized = {};
            Object.entries(budgetMap).forEach(([cat, val]) => {
                const parsed = parseCurrencyInput(val);
                if (isValidFinancialValue(parsed)) {
                    sanitized[cat] = parsed;
                }
            });

            expect(sanitized).toEqual({
                'Alimentação': 500,
                'Transporte': 150.5
            });
            expect(sanitized['Lazer']).toBeUndefined();
            expect(sanitized['Saúde']).toBeUndefined();
            expect(sanitized['Educação']).toBeUndefined();
        });
    });

    describe('11. Income & Subscription — Gate de Validação Positiva (isValidFinancialValue)', () => {
        it('deve permitir receitas com valores estritamente positivos', () => {
            const validValues = ['0,01', '1,00', '1000,00', '2.500,50'];
            validValues.forEach(str => {
                const val = parseCurrencyInput(str);
                expect(isValidFinancialValue(val)).toBe(true);
            });
        });

        it('deve bloquear receitas com zero, negativos, NaN ou valores malformados', () => {
            const blockedValues = ['', '   ', '0', '0,00', '-50,00', 'abc', 'abc100', '1e25'];
            blockedValues.forEach(str => {
                const val = parseCurrencyInput(str);
                expect(isValidFinancialValue(val)).toBe(false);
            });
        });

        it('deve permitir assinaturas com valores estritamente positivos', () => {
            const validValues = ['9,90', '29,90', '149,90'];
            validValues.forEach(str => {
                const val = parseCurrencyInput(str);
                expect(isValidFinancialValue(val)).toBe(true);
            });
        });

        it('deve bloquear assinaturas com zero, negativos ou strings inválidas', () => {
            const blockedValues = ['', '0,00', '-29,90', 'Infinity', 'NaN', 'xyz'];
            blockedValues.forEach(str => {
                const val = parseCurrencyInput(str);
                expect(isValidFinancialValue(val)).toBe(false);
            });
        });
    });

    describe('12. FinancialSandboxSimulator — Input Harmony', () => {
        it('deve manter sincronia entre estado formatado e parseCurrencyInput no simulador', () => {
            let simPurchaseValue = '1.200,00';
            const setSimPurchase = (val) => { simPurchaseValue = val; };
            const purchaseHandler = handleCurrencyInputChange(setSimPurchase);

            expect(parseCurrencyInput(simPurchaseValue)).toBe(1200);

            // Altera valor via digitação progressiva
            purchaseHandler({ target: { value: "250000" } });
            expect(simPurchaseValue).toBe("2.500,00");
            expect(parseCurrencyInput(simPurchaseValue)).toBe(2500);

            // Limpa valor
            purchaseHandler({ target: { value: "" } });
            expect(simPurchaseValue).toBe("");
            expect(parseCurrencyInput(simPurchaseValue)).toBe(0);
        });
    });
});
