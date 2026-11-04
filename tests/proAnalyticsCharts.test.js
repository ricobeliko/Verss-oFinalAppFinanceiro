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

vi.mock('../src/context/AppContext', () => ({
  useAppContext: () => ({
    isPro: true,
    isTrialActive: false,
    currentUser: { uid: 'test-user-123' },
    showToast: vi.fn(),
    activateFreeTrial: vi.fn(),
  }),
}));

import ProAnalyticsCharts from '../src/components/ProAnalyticsCharts';

describe('ProAnalyticsCharts — Recharts Animation & Reduced Motion (Commit C)', () => {
  const sampleLoans = [{ id: '1', clientId: 'c1', value: 300 }];
  const sampleClients = [{ id: 'c1', name: 'João' }];
  const sampleExpenses = [{ id: 'e1', category: 'Alimentação', value: 150 }];
  const sampleSubscriptions = [{ id: 's1', value: 50 }];

  beforeEach(() => {
    capturedBarProps = null;
    capturedPieProps = null;
    mockReducedMotion = false;
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
});
