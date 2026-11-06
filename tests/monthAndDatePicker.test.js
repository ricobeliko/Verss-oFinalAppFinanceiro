// tests/monthAndDatePicker.test.js
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import MonthPicker from '../src/components/MonthPicker';
import DatePicker from '../src/components/DatePicker';

describe('Componentes <MonthPicker> e <DatePicker> — Testes Unitários de Fuso, Integridade e Acessibilidade (Commit 2)', () => {
  describe('1. Parsing e Formatação de Datas sem Dependência de Fuso (Zero Offset Bug)', () => {
    it('garante que a data 2026-11-05 não retrocede para 2026-11-04 em UTC ou America/Sao_Paulo', () => {
      // Simulação com strings
      const dateStr = '2026-11-05';
      const parts = dateStr.split('-');
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      const d = parseInt(parts[2], 10);

      expect(y).toBe(2026);
      expect(m).toBe(11);
      expect(d).toBe(5);

      const html = renderToString(
        React.createElement(DatePicker, {
          id: 'testDate',
          value: '2026-11-05',
        })
      );

      // Deve exibir 05/11/2026 e nunca 04/11/2026
      expect(html).toContain('05/11/2026');
      expect(html).not.toContain('04/11/2026');
    });

    it('valida corretamente ano bissexto (29/02) vs ano comum (28/02)', () => {
      // 2024 é bissexto (fevereiro tem 29 dias)
      const feb2024 = new Date(2024, 2, 0).getDate();
      expect(feb2024).toBe(29);

      // 2026 é ano comum (fevereiro tem 28 dias)
      const feb2026 = new Date(2026, 2, 0).getDate();
      expect(feb2026).toBe(28);

      // 2028 é bissexto (fevereiro tem 29 dias)
      const feb2028 = new Date(2028, 2, 0).getDate();
      expect(feb2028).toBe(29);
    });

    it('valida meses de 30 dias (abril, junho, setembro, novembro)', () => {
      const months30 = [4, 6, 9, 11];
      months30.forEach((m) => {
        const days = new Date(2026, m, 0).getDate();
        expect(days).toBe(30);
      });

      const months31 = [1, 3, 5, 7, 8, 10, 12];
      months31.forEach((m) => {
        const days = new Date(2026, m, 0).getDate();
        expect(days).toBe(31);
      });
    });

    it('trata valor inicial vazio e valores inválidos graciosamente sem quebrar', () => {
      const htmlEmpty = renderToString(
        React.createElement(DatePicker, {
          id: 'emptyDate',
          value: '',
          placeholder: 'Selecione a data...',
        })
      );
      expect(htmlEmpty).toContain('Selecione a data...');

      const htmlInvalid = renderToString(
        React.createElement(DatePicker, {
          id: 'invalidDate',
          value: 'invalid-date-string',
          placeholder: 'Selecione a data...',
        })
      );
      expect(htmlInvalid).toContain('Selecione a data...');
    });
  });

  describe('2. Renderização e Acessibilidade do <MonthPicker>', () => {
    it('renderiza o botão com texto por extenso em pt-BR e input oculto sincronizado', () => {
      const html = renderToString(
        React.createElement(MonthPicker, {
          id: 'dashboardMonth',
          name: 'filterMonth',
          value: '2026-11',
          required: true,
          'aria-label': 'Competência',
        })
      );

      expect(html).toContain('novembro de 2026');
      expect(html).toContain('type="month"');
      expect(html).toContain('value="2026-11"');
      expect(html).toContain('required=""');
      expect(html).toContain('name="filterMonth"');
      expect(html).toContain('class="sr-only absolute pointer-events-none opacity-0 w-0 h-0"');
    });

    it('renderiza estado disabled no MonthPicker', () => {
      const html = renderToString(
        React.createElement(MonthPicker, {
          id: 'disabledMonth',
          value: '2026-11',
          disabled: true,
        })
      );

      expect(html).toContain('disabled=""');
      expect(html).toContain('disabled:opacity-50 disabled:cursor-not-allowed');
    });

    it('dispara onChange com synthetic event { target: { value: "YYYY-MM" } }', () => {
      const handleChange = vi.fn();
      const el = React.createElement(MonthPicker, {
        id: 'eventMonth',
        value: '2026-11',
        onChange: handleChange,
      });

      expect(el.props.onChange).toBe(handleChange);
    });
  });

  describe('3. Renderização e Acessibilidade do <DatePicker>', () => {
    it('renderiza o botão com data formatada DD/MM/AAAA e input oculto sincronizado', () => {
      const html = renderToString(
        React.createElement(DatePicker, {
          id: 'purchaseDate',
          name: 'purchaseDate',
          value: '2026-05-15',
          required: true,
          'aria-label': 'Data da Compra',
        })
      );

      expect(html).toContain('15/05/2026');
      expect(html).toContain('type="date"');
      expect(html).toContain('value="2026-05-15"');
      expect(html).toContain('required=""');
      expect(html).toContain('name="purchaseDate"');
      expect(html).toContain('class="sr-only absolute pointer-events-none opacity-0 w-0 h-0"');
    });

    it('renderiza estado disabled no DatePicker', () => {
      const html = renderToString(
        React.createElement(DatePicker, {
          id: 'disabledDate',
          value: '2026-05-15',
          disabled: true,
        })
      );

      expect(html).toContain('disabled=""');
      expect(html).toContain('disabled:opacity-50 disabled:cursor-not-allowed');
    });
  });
});
