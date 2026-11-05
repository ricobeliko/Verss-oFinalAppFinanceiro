// tests/splitExactCents.test.js
import { describe, it, expect } from 'vitest';
import {
  parseCurrencyToCents,
  splitExactCents,
  formatCentsDisplay,
  formatCentsForInput,
  MIN_CENTS,
  MAX_CENTS,
} from '../src/features/landing/lib/splitExactCents';

describe('splitExactCents — Parser de Moeda e Divisão Matemática Exata em Centavos', () => {

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

  describe('2. Algoritmo de Divisão Exata (splitExactCents)', () => {
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
      // 100000 / 3 = 33333 resto 1 -> Person 0 gets 33334, others get 33333
      expect(res.sharesCents).toEqual([33334, 33333, 33333]);
      expect(res.sumCents).toBe(100000);
      expect(res.driftCents).toBe(0);
    });

    it('deve dividir R$ 1.234,56 entre 5 pessoas com zero drift', () => {
      const res = splitExactCents(123456, 5);
      expect(res).not.toBeNull();
      // 123456 / 5 = 24691 resto 1 -> [24692, 24691, 24691, 24691, 24691]
      expect(res.sharesCents).toEqual([24692, 24691, 24691, 24691, 24691]);
      expect(res.sumCents).toBe(123456);
      expect(res.driftCents).toBe(0);
    });

    it('deve validar invariantes matemáticos para totais de 1 a 5.000 centavos e 2 a 5 pessoas', () => {
      for (let total = 1; total <= 5000; total++) {
        for (let n = 2; n <= 5; n++) {
          const res = splitExactCents(total, n);
          if (!res) throw new Error(`Null result for total ${total}, n ${n}`);

          // 1. Soma exata
          const sum = res.sharesCents.reduce((acc, c) => acc + c, 0);
          if (sum !== total || res.driftCents !== 0) {
            throw new Error(`Sum mismatch for total ${total}, n ${n}: sum=${sum}, drift=${res.driftCents}`);
          }

          // 2. Maior e menor parte diferem no máximo em 1 centavo
          const max = Math.max(...res.sharesCents);
          const min = Math.min(...res.sharesCents);
          if (max - min > 1) {
            throw new Error(`Drift > 1 cent for total ${total}, n ${n}: max=${max}, min=${min}`);
          }

          // 3. Ordem do resto determinística: os primeiros 'resto' recebem max, os demais min
          const remainder = total % n;
          for (let i = 0; i < n; i++) {
            const expected = i < remainder ? min + 1 : min;
            if (res.sharesCents[i] !== expected) {
              throw new Error(`Remainder order failed for total ${total}, n ${n}, idx ${i}`);
            }
          }
        }
      }
      expect(true).toBe(true);
    });

    it('deve retornar null para entrada inválida ou pessoas fora da faixa', () => {
      expect(splitExactCents(null, 3)).toBeNull();
      expect(splitExactCents(0, 3)).toBeNull();
      expect(splitExactCents(100, 1)).toBeNull();
      expect(splitExactCents(100, 6)).toBeNull();
    });
  });

  describe('3. Formatação (formatCentsDisplay e formatCentsForInput)', () => {
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
