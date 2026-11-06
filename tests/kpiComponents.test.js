// tests/kpiComponents.test.js
import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import Sparkline from '../src/components/Sparkline';
import SegmentedControl from '../src/components/SegmentedControl';
import KpiCard from '../src/components/KpiCard';

describe('Componentes Visuais de KPIs (Fase 4B - Commit B)', () => {
  describe('Sparkline', () => {
    it('renderiza SVG com dimensões corretas e aria-hidden quando decorativo', () => {
      const html = renderToString(
        React.createElement(Sparkline, { data: [10, 20, 30, 25], width: 100, height: 30 })
      );
      expect(html).toContain('<svg');
      expect(html).toContain('width="100"');
      expect(html).toContain('height="30"');
      expect(html).toContain('aria-hidden="true"');
      expect(html).toContain('role="presentation"');
    });

    it('renderiza texto acessível e role="img" quando informativo (isDecorative=false)', () => {
      const html = renderToString(
        React.createElement(Sparkline, {
          data: [100, 200, 150],
          isDecorative: false,
          accessibleLabel: 'Evolução: de R$ 100 a R$ 150',
        })
      );
      expect(html).toContain('Evolução: de R$ 100 a R$ 150');
      expect(html).toContain('role="img"');
      expect(html).not.toContain('aria-hidden="true"');
    });

    it('trata lista vazia ou nula sem lançar erro (linha fallback)', () => {
      const html = renderToString(React.createElement(Sparkline, { data: [] }));
      expect(html).toContain('<path');
      expect(html).toContain('M 4');
    });

    it('trata ponto único renderizando ponto central destacado', () => {
      const html = renderToString(
        React.createElement(Sparkline, { data: [50], width: 80, height: 30 })
      );
      expect(html).toContain('<circle');
      expect(html).toContain('cx="40"');
      expect(html).toContain('cy="15"');
    });

    it('trata valores constantes (todos iguais) sem divisão por zero', () => {
      const html = renderToString(
        React.createElement(Sparkline, { data: [100, 100, 100], height: 30 })
      );
      expect(html).toContain('<path');
      expect(html).toContain('15');
    });
  });

  describe('SegmentedControl', () => {
    const options = [
      { id: 'opt-1', label: 'Opção 1' },
      { id: 'opt-2', label: 'Opção 2' },
      { id: 'opt-3', label: 'Opção 3' },
    ];

    it('renderiza como radiogroup e marca a opção ativa com aria-checked="true"', () => {
      const html = renderToString(
        React.createElement(SegmentedControl, {
          options,
          value: 'opt-2',
          ariaLabel: 'Filtro de teste',
        })
      );

      expect(html).toContain('role="radiogroup"');
      expect(html).toContain('aria-label="Filtro de teste"');
      expect(html).toContain('role="radio"');
      expect(html).toContain('aria-checked="true"');
      expect(html).toContain('aria-checked="false"');
      expect(html).toContain('min-h-[44px]');
      expect(html).toContain('Opção 2');
    });
  });

  describe('KpiCard', () => {
    it('renderiza título, AnimatedCurrency e tom semântico', () => {
      const html = renderToString(
        React.createElement(KpiCard, {
          title: 'Fatura Total',
          value: 1250.75,
          variant: 'accent',
          icon: React.createElement('span', null, '💳'),
        })
      );

      expect(html).toContain('Fatura Total');
      expect(html).toContain('data-enter="item"');
      expect(html).toContain('1.250,75');
    });

    it('computa semântica correta de delta para despesas (aumento = warning, queda = success)', () => {
      const deltaAumento = {
        value: 150,
        percentage: 12.5,
        direction: 'up',
        label: '+12,5%',
      };

      const htmlAumento = renderToString(
        React.createElement(KpiCard, {
          title: 'Fatura',
          value: 1000,
          delta: deltaAumento,
          invertDeltaSemantics: false,
        })
      );

      expect(htmlAumento).toContain('▲');
      expect(htmlAumento).toContain('+12,5%');
      expect(htmlAumento).toContain('border-[var(--fc-warning)]');

      const deltaQueda = {
        value: -200,
        percentage: -15.0,
        direction: 'down',
        label: '-15,0%',
      };

      const htmlQueda = renderToString(
        React.createElement(KpiCard, {
          title: 'Fatura',
          value: 800,
          delta: deltaQueda,
          invertDeltaSemantics: false,
        })
      );

      expect(htmlQueda).toContain('▼');
      expect(htmlQueda).toContain('-15,0%');
      expect(htmlQueda).toContain('border-[var(--fc-success)]');
    });

    it('trata variação indefinida (base 0) exibindo traço — e valor absoluto sem seta enganosa', () => {
      const deltaIndefinido = {
        value: 250,
        percentage: null,
        direction: 'neutral',
        label: '—',
        absoluteText: '+ R$ 250,00 vs. mês anterior',
      };

      const html = renderToString(
        React.createElement(KpiCard, {
          title: 'Fatura',
          value: 250,
          delta: deltaIndefinido,
          deltaSubtitle: 'vs. mês anterior',
        })
      );

      expect(html).toContain('•');
      expect(html).toContain('—');
      expect(html).not.toContain('▲');
      expect(html).not.toContain('+100');
      expect(html).toContain('+ R$ 250,00 vs. mês anterior');
    });

    it('trata ausência de variação (ambos 0) exibindo Sem variação e ícone neutro', () => {
      const deltaZero = {
        value: 0,
        percentage: null,
        direction: 'neutral',
        label: 'Sem variação',
        absoluteText: 'Sem variação',
      };

      const html = renderToString(
        React.createElement(KpiCard, {
          title: 'Fatura',
          value: 0,
          delta: deltaZero,
          deltaSubtitle: 'vs. mês anterior',
        })
      );

      expect(html).toContain('•');
      expect(html).toContain('Sem variação');
      expect(html).not.toContain('▲');
      expect(html).not.toContain('▼');
    });

    it('renderiza Sparkline integrado quando sparklineData é fornecido', () => {
      const html = renderToString(
        React.createElement(KpiCard, {
          title: 'Total Comprometido',
          value: 3000,
          sparklineData: [2500, 2700, 2900, 3000],
          sparklineLabel: 'Histórico dos últimos 4 meses',
        })
      );

      expect(html).toContain('<svg');
      expect(html).toContain('Histórico dos últimos 4 meses');
    });
  });
});
