// tests/proAnalyticsCharts.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { MOTION } from '../src/design-system/motion';

let capturedBarProps = null;
let capturedPieProps = null;

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }) => React.createElement('div', { 'data-testid': 'responsive-container' }, children),
  BarChart: ({ children }) => React.createElement('div', { 'data-testid': 'barchart' }, children),
  Bar: (props) => {
    capturedBarProps = props;
    return React.createElement('div', { 'data-testid': 'bar' }, props.children);
  },
  PieChart: ({ children }) => React.createElement('div', { 'data-testid': 'piechart' }, children),
  Pie: (props) => {
    capturedPieProps = props;
    return React.createElement('div', { 'data-testid': 'pie' }, props.children);
  },
  Cell: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
  LabelList: () => null,
}));

let mockReducedMotion = false;
vi.mock('../src/hooks/usePrefersReducedMotion', () => ({
  default: () => mockReducedMotion,
}));

let mockIsPro = true;
let mockIsTrialActive = false;

vi.mock('../src/context/AppContext', () => ({
  useAppContext: () => ({
    isPro: mockIsPro,
    isTrialActive: mockIsTrialActive,
    currentUser: { uid: 'test-user-123' },
    showToast: vi.fn(),
    activateFreeTrial: vi.fn(),
  }),
}));

import ProAnalyticsCharts from '../src/components/ProAnalyticsCharts';

describe('ProAnalyticsCharts — Rosca Interativa, Invariantes e Acessibilidade (Commit 4)', () => {
  const sampleLoans = [{ id: '1', clientId: 'c1', value: 300 }];
  const sampleClients = [{ id: 'c1', name: 'João Silva' }];
  const sampleExpenses = [{ id: 'e1', category: 'Alimentação', value: 150 }];
  const sampleSubscriptions = [{ id: 's1', value: 50 }];

  beforeEach(() => {
    capturedBarProps = null;
    capturedPieProps = null;
    mockReducedMotion = false;
    mockIsPro = true;
    mockIsTrialActive = false;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('passa props de animação viva (isAnimationActive: true, begin: 300, duration: 900, ease-out) para Bar e Pie', () => {
    renderToString(
      React.createElement(ProAnalyticsCharts, {
        loans: sampleLoans,
        clients: sampleClients,
        expenses: sampleExpenses,
        subscriptions: sampleSubscriptions,
        theme: 'dark',
      })
    );

    expect(capturedBarProps).not.toBeNull();
    expect(capturedBarProps.isAnimationActive).toBe(true);
    expect(capturedBarProps.animationBegin).toBe(MOTION.charts.delay);
    expect(capturedBarProps.animationDuration).toBe(MOTION.charts.duration);
    expect(capturedBarProps.animationEasing).toBe(MOTION.charts.easing);

    expect(capturedPieProps).not.toBeNull();
    expect(capturedPieProps.isAnimationActive).toBe(true);
    expect(capturedPieProps.animationBegin).toBe(MOTION.charts.delay);
    expect(capturedPieProps.animationDuration).toBe(MOTION.charts.duration);
    expect(capturedPieProps.animationEasing).toBe(MOTION.charts.easing);
  });

  it('sob prefers-reduced-motion: reduce, desativa animação com isAnimationActive={false}', () => {
    mockReducedMotion = true;

    renderToString(
      React.createElement(ProAnalyticsCharts, {
        loans: sampleLoans,
        clients: sampleClients,
        expenses: sampleExpenses,
        subscriptions: sampleSubscriptions,
        theme: 'dark',
      })
    );

    expect(capturedBarProps).not.toBeNull();
    expect(capturedBarProps.isAnimationActive).toBe(false);

    expect(capturedPieProps).not.toBeNull();
    expect(capturedPieProps.isAnimationActive).toBe(false);
  });

  it('renderiza Rosca/Donut moderna com raio interno (innerRadius=65) e raio externo (outerRadius=92)', () => {
    renderToString(
      React.createElement(ProAnalyticsCharts, {
        loans: sampleLoans,
        clients: sampleClients,
        expenses: sampleExpenses,
        subscriptions: sampleSubscriptions,
        theme: 'dark',
      })
    );

    expect(capturedPieProps).not.toBeNull();
    expect(capturedPieProps.innerRadius).toBe(65);
    expect(capturedPieProps.outerRadius).toBe(92);
  });

  it('renderiza centro da rosca com Total da Fatura e legenda acessível com tabIndex=0 e aria-label', () => {
    const html = renderToString(
      React.createElement(ProAnalyticsCharts, {
        loans: sampleLoans,
        clients: sampleClients,
        expenses: sampleExpenses,
        subscriptions: sampleSubscriptions,
        theme: 'dark',
      })
    );

    // Centro da rosca
    expect(html).toContain('Total da Fatura');
    expect(html).toContain('data-testid="donut-center"');

    // Legenda acessível
    expect(html).toContain('role="list"');
    expect(html).toContain('aria-label="Detalhamento de gastos por pessoa na fatura"');
    expect(html).toContain('tabindex="0"');
    expect(html).toContain('aria-label="João Silva:');
  });

  it('respeita o gate Pro: exibe UpgradePrompt quando usuário não é Pro nem tem teste ativo', () => {
    mockIsPro = false;
    mockIsTrialActive = false;

    const html = renderToString(
      React.createElement(ProAnalyticsCharts, {
        loans: sampleLoans,
        clients: sampleClients,
        expenses: sampleExpenses,
        subscriptions: sampleSubscriptions,
        theme: 'dark',
      })
    );

    // Gráficos não devem ser renderizados
    expect(capturedBarProps).toBeNull();
    expect(capturedPieProps).toBeNull();
    // Prompt de upgrade Pro deve ser renderizado
    expect(html).toContain('Conheça o FinControl Pro');
  });

  describe('Detalhamento de Gastos por Pessoa na Legenda e Centro (Fase 9.2)', () => {
    it('renderiza corretamente a legenda com 1 pessoa exibindo nome, valor completo e percentual', () => {
      const html = renderToString(
        React.createElement(ProAnalyticsCharts, {
          loans: [{ id: 'l1', isMyDebt: true, value: 741.80 }],
          clients: [],
          expenses: [],
          subscriptions: [],
          theme: 'dark',
        })
      );

      expect(html).toContain('Minhas despesas');
      expect(html).toContain('741,80');
      expect(html).toContain('100%');
      expect(html).toMatch(/aria-label="Minhas despesas: R\$\s*741,80, 100% do total"/);
      // Garante empilhamento vertical total
      expect(html).toContain('flex flex-col items-center gap-6 w-full');
    });

    it('renderiza corretamente a legenda com 2 pessoas exibindo nome, valores completos e percentuais', () => {
      const html = renderToString(
        React.createElement(ProAnalyticsCharts, {
          loans: [
            { id: 'l1', isMyDebt: true, value: 500.00 },
            { id: 'l2', clientId: 'c1', isMyDebt: false, value: 241.80 }
          ],
          clients: [{ id: 'c1', name: 'Mariana Costa' }],
          expenses: [],
          subscriptions: [],
          theme: 'dark',
        })
      );

      expect(html).toContain('Minhas despesas');
      expect(html).toContain('Mariana Costa');
      expect(html).toContain('500,00');
      expect(html).toContain('241,80');
      expect(html).toContain('67%');
      expect(html).toContain('33%');
      expect(html).toMatch(/aria-label="Mariana Costa: R\$\s*241,80, 33% do total"/);
    });

    it('renderiza corretamente a legenda com 6 pessoas exibindo todos os nomes, valores completos e percentuais', () => {
      const clients = [
        { id: 'c1', name: 'Ana Silva' },
        { id: 'c2', name: 'Bruno Lima' },
        { id: 'c3', name: 'Carla Dias' },
        { id: 'c4', name: 'Daniel Alves' },
        { id: 'c5', name: 'Eduarda Santos' }
      ];
      const loans = [
        { id: 'l0', isMyDebt: true, value: 200.00 },
        { id: 'l1', clientId: 'c1', isMyDebt: false, value: 150.00 },
        { id: 'l2', clientId: 'c2', isMyDebt: false, value: 100.00 },
        { id: 'l3', clientId: 'c3', isMyDebt: false, value: 100.00 },
        { id: 'l4', clientId: 'c4', isMyDebt: false, value: 100.00 },
        { id: 'l5', clientId: 'c5', isMyDebt: false, value: 91.80 }
      ];

      const html = renderToString(
        React.createElement(ProAnalyticsCharts, {
          loans,
          clients,
          expenses: [],
          subscriptions: [],
          theme: 'dark',
        })
      );

      expect(html).toContain('Minhas despesas');
      expect(html).toContain('Ana Silva');
      expect(html).toContain('Bruno Lima');
      expect(html).toContain('Carla Dias');
      expect(html).toContain('Daniel Alves');
      expect(html).toContain('Eduarda Santos');

      expect(html).toContain('200,00');
      expect(html).toContain('150,00');
      expect(html).toContain('100,00');
      expect(html).toContain('91,80');

      // Classes de controle de overflow e largura
      expect(html).toContain('overflow-y-auto overflow-x-hidden');
      expect(html).toContain('whitespace-nowrap');
    });
  });
});
