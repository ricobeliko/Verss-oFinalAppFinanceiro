// tests/splitExactCents.test.js
import { describe, it, expect } from 'vitest';
import {
  parseCurrencyToCents,
  splitExactCents,
  calculateAppInstallments,
  splitSharedPurchaseTwoPeople,
  formatCentsDisplay,
  formatCentsForInput,
  MAX_CENTS,
} from '../src/features/landing/lib/splitExactCents';
import { calculateInstallments } from '../src/services/financialService';

describe('splitExactCents — Parser de Moeda e Divisão Fiel ao App', () => {

  describe('1. Parser de Moeda para Centavos Inteiros (parseCurrencyToCents)', () => {
    it('deve converter valor inteiro sem separador ("1000" -> 100000)', () => {
      expect(parseCurrencyToCents('1000')).toBe(100000);
    });

    it('deve converter formato padrão brasileiro com ponto e vírgula ("1.000,50" -> 100050)', () => {
      expect(parseCurrencyToCents('1.000,50')).toBe(100050);
    });

    it('deve aceitar decimal com ponto e 1 dígito ("1000.5" -> 100050)', () => {
      expect(parseCurrencyToCents('1000.5')).toBe(100050);
    });

    it('deve aceitar decimal com vírgula e 1 dígito ("1000,5" -> 100050)', () => {
      expect(parseCurrencyToCents('1000,5')).toBe(100050);
    });

    it('deve aceitar decimal com ponto e 2 dígitos ("1000.50" -> 100050)', () => {
      expect(parseCurrencyToCents('1000.50')).toBe(100050);
    });

    it('deve retornar null para string vazia ou espaços ("" -> null)', () => {
      expect(parseCurrencyToCents('')).toBeNull();
      expect(parseCurrencyToCents('   ')).toBeNull();
      expect(parseCurrencyToCents(null)).toBeNull();
      expect(parseCurrencyToCents(undefined)).toBeNull();
    });

    it('deve retornar null para texto não numérico ("abc" -> null)', () => {
      expect(parseCurrencyToCents('abc')).toBeNull();
      expect(parseCurrencyToCents('R$ abc')).toBeNull();
      expect(parseCurrencyToCents('100a')).toBeNull();
    });

    it('deve retornar null para zero ("0" -> null)', () => {
      expect(parseCurrencyToCents('0')).toBeNull();
      expect(parseCurrencyToCents('0,00')).toBeNull();
      expect(parseCurrencyToCents('0.00')).toBeNull();
    });

    it('deve limitar valores astronômicos ao teto de R$ 1.000.000,00 ("99999999999" -> 100000000)', () => {
      expect(parseCurrencyToCents('99999999999')).toBe(MAX_CENTS);
      expect(parseCurrencyToCents('1000000,01')).toBe(MAX_CENTS);
    });

    it('deve aceitar prefixo R$ opcional ("R$ 1.234,56" -> 123456)', () => {
      expect(parseCurrencyToCents('R$ 1.234,56')).toBe(123456);
      expect(parseCurrencyToCents('r$500')).toBe(50000);
    });
  });

  describe('2. Divisão Compartilhada entre Duas Pessoas (splitSharedPurchaseTwoPeople)', () => {
    it('deve dividir total par meio a meio exatamente (R$ 1.000,00 -> 500,00 e 500,00)', () => {
      const res = splitSharedPurchaseTwoPeople({ totalCents: 100000, mode: 'half', installmentsCount: 1 });
      expect(res).not.toBeNull();
      expect(res.error).toBeNull();
      expect(res.person1.cents).toBe(50000);
      expect(res.person2.cents).toBe(50000);
      expect(res.person1.display).toBe('R$ 500,00');
      expect(res.person2.display).toBe('R$ 500,00');
      expect(res.sumCents).toBe(100000);
      expect(res.driftCents).toBe(0);
    });

    it('deve dividir total ímpar em centavos com complemento exato (R$ 1.000,01 -> 500,00 e 500,01)', () => {
      const res = splitSharedPurchaseTwoPeople({ totalCents: 100001, mode: 'half', installmentsCount: 1 });
      expect(res).not.toBeNull();
      expect(res.error).toBeNull();
      expect(res.person1.cents).toBe(50000); // floor(100001/2) = 50000
      expect(res.person2.cents).toBe(50001); // 100001 - 50000 = 50001
      expect(res.person1.display).toBe('R$ 500,00');
      expect(res.person2.display).toBe('R$ 500,01');
      expect(res.sumCents).toBe(100001);
      expect(res.driftCents).toBe(0);
    });

    it('deve aceitar Pessoa 1 = 0,01 (1 centavo) com Pessoa 2 recebendo o restante', () => {
      const res = splitSharedPurchaseTwoPeople({ totalCents: 100000, mode: 'custom', person1CentsInput: 1 });
      expect(res).not.toBeNull();
      expect(res.error).toBeNull();
      expect(res.person1.cents).toBe(1);
      expect(res.person2.cents).toBe(99999);
      expect(res.sumCents).toBe(100000);
      expect(res.driftCents).toBe(0);
    });

    it('deve aceitar Pessoa 1 = total (Pessoa 2 recebe 0)', () => {
      const res = splitSharedPurchaseTwoPeople({ totalCents: 100000, mode: 'custom', person1CentsInput: 100000 });
      expect(res).not.toBeNull();
      expect(res.error).toBeNull();
      expect(res.person1.cents).toBe(100000);
      expect(res.person2.cents).toBe(0);
      expect(res.sumCents).toBe(100000);
      expect(res.driftCents).toBe(0);
    });

    it('deve retornar erro claro quando Pessoa 1 > total sem produzir números negativos', () => {
      const res = splitSharedPurchaseTwoPeople({ totalCents: 100000, mode: 'custom', person1CentsInput: 100001 });
      expect(res).not.toBeNull();
      expect(res.error).toBe('O valor da Pessoa 1 não pode ser maior que o valor total da compra.');
      expect(res.person1).toBeNull();
      expect(res.person2).toBeNull();
      expect(res.sumCents).toBeNull();
      expect(res.driftCents).toBeNull();
    });

    it('deve calcular parcelas 1, 3 e 12 com centavo residual na última parcela', () => {
      // 1 Parcela de R$ 100,00
      const p1 = calculateAppInstallments(10000, 1);
      expect(p1.installmentsCents).toEqual([10000]);
      expect(p1.summaryText).toBe('1 × R$ 100,00');

      // 3 Parcelas de R$ 100,00 (10000 centavos -> 3333, 3333, 3334)
      const p3 = calculateAppInstallments(10000, 3);
      expect(p3.installmentsCents).toEqual([3333, 3333, 3334]);
      expect(p3.summaryText).toBe('2 × R$ 33,33 + última R$ 33,34');
      expect(p3.installmentsCents.reduce((a, b) => a + b, 0)).toBe(10000);

      // 12 Parcelas de R$ 1.000,00 (100000 centavos / 12 = 8333 resto 4 -> 11 x 8333 + 8337)
      const p12 = calculateAppInstallments(100000, 12);
      expect(p12.installmentsCents).toHaveLength(12);
      expect(p12.installmentsCents.slice(0, 11).every(c => c === 8333)).toBe(true);
      expect(p12.installmentsCents[11]).toBe(8337);
      expect(p12.summaryText).toBe('11 × R$ 83,33 + última R$ 83,37');
      expect(p12.installmentsCents.reduce((a, b) => a + b, 0)).toBe(100000);
    });
  });

  describe('3. Teste de Paridade com financialService.calculateInstallments', () => {
    it('deve ter paridade absoluta com calculateInstallments para 1 a 5.000 centavos e 1 a 12 parcelas', () => {
      for (let totalCents = 1; totalCents <= 5000; totalCents++) {
        for (let count = 1; count <= 12; count++) {
          const appPlan = calculateAppInstallments(totalCents, count);

          // Chamada da função real de domínio do FinControl
          const realPlan = calculateInstallments({
            totalValue: totalCents / 100,
            count,
          });

          if (realPlan.length !== appPlan.installmentsCents.length) {
            throw new Error(`Length mismatch for total ${totalCents}, count ${count}`);
          }

          for (let i = 0; i < count; i++) {
            const expectedCents = Math.round(realPlan[i].value * 100);
            const actualCents = appPlan.installmentsCents[i];
            if (actualCents !== expectedCents) {
              throw new Error(
                `Mismatch at total ${totalCents}, count ${count}, index ${i}: expected ${expectedCents}, got ${actualCents}`
              );
            }
          }
        }
      }
      expect(true).toBe(true);
    }, 60000);
  });

  describe('4. Algoritmo Legado Auxiliar (splitExactCents)', () => {
    it('deve dividir R$ 1.000,00 entre 2 pessoas exatamente (R$ 500,00 cada)', () => {
      const res = splitExactCents(100000, 2);
      expect(res).not.toBeNull();
      expect(res.sharesCents).toEqual([50000, 50000]);
      expect(res.sumCents).toBe(100000);
      expect(res.driftCents).toBe(0);
    });

    it('deve dividir R$ 1.000,00 entre 3 pessoas com resto determinístico nos primeiros participantes', () => {
      const res = splitExactCents(100000, 3);
      expect(res).not.toBeNull();
      expect(res.sharesCents).toEqual([33334, 33333, 33333]);
      expect(res.sumCents).toBe(100000);
      expect(res.driftCents).toBe(0);
    });
  });

  describe('5. Formatação (formatCentsDisplay e formatCentsForInput)', () => {
    it('formatCentsDisplay deve formatar com R$ e separador de milhar', () => {
      expect(formatCentsDisplay(100000)).toMatch(/R\$\s*1\.000,00/);
      expect(formatCentsDisplay(50000)).toMatch(/R\$\s*500,00/);
      expect(formatCentsDisplay(33334)).toMatch(/R\$\s*333,34/);
      expect(formatCentsDisplay(null)).toMatch(/R\$\s*0,00/);
    });

    it('formatCentsForInput deve formatar sem prefixo para campo de input', () => {
      expect(formatCentsForInput(100000)).toBe('1.000,00');
      expect(formatCentsForInput(123456)).toBe('1.234,56');
      expect(formatCentsForInput(null)).toBe('');
    });
  });
});
