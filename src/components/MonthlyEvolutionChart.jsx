// src/components/MonthlyEvolutionChart.jsx
import React, { useState, useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import SegmentedControl from './SegmentedControl';
import ProFeatureLock from './ProFeatureLock';
import { calculateMonthlySeries } from '../services/financialService';
import { formatCurrencyDisplay } from '../utils/currency';
import usePrefersReducedMotion from '../hooks/usePrefersReducedMotion';
import { MOTION } from '../design-system/motion';

const METRIC_OPTIONS = [
  { id: 'total', label: 'Total' },
  { id: 'installments', label: 'Parcelas' },
  { id: 'subscriptions', label: 'Assinaturas' },
];

const PERIOD_OPTIONS = [
  { id: '6m', label: '6 Meses' },
  { id: '12m', label: '12 Meses' },
];

const formatYAxis = (tick) => {
  if (tick >= 1000) return `R$ ${(tick / 1000).toLocaleString('pt-BR')}k`;
  return `R$ ${tick}`;
};

/**
 * Tooltip no padrão do Design System 2.0 (Abyss Teal).
 */
const CustomEvolutionTooltip = ({ active, payload, label, metricLabel }) => {
  if (active && payload && payload.length) {
    const rawItem = payload[0].payload;
    const val = rawItem.value || 0;
    const isProjected = rawItem.isProjected;
    const isCurrent = rawItem.isCurrent;

    return (
      <div className="p-3.5 bg-[var(--fc-surface-1)] border border-[var(--fc-border-default)] rounded-2xl shadow-[var(--fc-shadow-lg)] text-xs space-y-1.5 backdrop-blur-md select-none">
        <div className="flex items-center justify-between gap-3">
          <p className="font-bold text-[var(--fc-text-primary)] tracking-tight">
            {label}
          </p>
          {isCurrent && (
            <span className="px-2 py-0.5 rounded-full bg-[var(--fc-accent-soft)] text-[var(--fc-accent)] text-[10px] font-bold border border-[var(--fc-accent)]/20">
              Mês Selecionado
            </span>
          )}
          {isProjected && !isCurrent && (
            <span className="px-2 py-0.5 rounded-full bg-[var(--fc-surface-2)] text-[var(--fc-text-secondary)] text-[10px] font-semibold border border-[var(--fc-border-subtle)]">
              Projeção Futura
            </span>
          )}
        </div>

        <div className="pt-1 border-t border-[var(--fc-border-subtle)] flex items-baseline justify-between gap-4">
          <span className="text-[var(--fc-text-secondary)] font-medium">
            {metricLabel}:
          </span>
          <span className="font-mono font-bold text-sm text-[var(--fc-accent)]">
            {formatCurrencyDisplay(val)}
          </span>
        </div>

        <p className="text-[10px] text-[var(--fc-text-muted)] pt-1 italic">
          Assinaturas refletem o valor contratual ativo.
        </p>
      </div>
    );
  }
  return null;
};

/**
 * Gráfico Interativo de Evolução Mensal de Compromissos (Fase 4B).
 *
 * Suporta:
 * - Alternância de Métrica (Total, Parcelas, Assinaturas).
 * - Alternância de Período (6 e 12 meses centrado no mês selecionado).
 * - Filtro por Pessoa (com suporte a órfãos via 'Sem atribuição').
 * - Linha contínua com distinção visual entre Histórico (sólido) e Projeção (tracejado).
 * - Tooltip factual com alerta discreto de valor contratual vigente de assinaturas.
 * - Tabela visualmente oculta (sr-only) para 100% de acessibilidade WCAG.
 * - Gate de plano Pro (`ProFeatureLock`) idêntico aos demais gráficos Pro.
 */
export default function MonthlyEvolutionChart({
  loans = [],
  subscriptions = [],
  selectedMonth,
  clients = [],
  isPro = false,
  isTrialActive = false,
  onUpgradeClick,
  theme = 'dark',
}) {
  const hasProAccess = isPro || isTrialActive;
  const prefersReducedMotion = usePrefersReducedMotion();

  const [metric, setMetric] = useState('total'); // 'total' | 'installments' | 'subscriptions'
  const [period, setPeriod] = useState('6m'); // '6m' | '12m'
  const [selectedPersonId, setSelectedPersonId] = useState('all');

  // Opções do seletor de pessoa (compatível com o padrão do FutureCommitmentsCard)
  const peopleOptions = useMemo(() => {
    const list = [{ id: 'all', label: 'Todos' }];
    if (Array.isArray(clients) && clients.length > 0) {
      clients.forEach((c) => {
        if (c && c.id) list.push({ id: c.id, label: c.name || 'Pessoa' });
      });
    }
    list.push({ id: 'unassigned', label: 'Sem atribuição' });
    return list;
  }, [clients]);

  // Horizonte centrado no mês selecionado
  const { monthsBack, monthsForward } = useMemo(() => {
    if (period === '12m') {
      return { monthsBack: 5, monthsForward: 6 }; // 12 meses (5 passados + atual + 6 futuros)
    }
    return { monthsBack: 3, monthsForward: 2 }; // 6 meses (3 passados + atual + 2 futuros)
  }, [period]);

  // Cálculo canônico e puro da série mensal de domínio
  const series = useMemo(() => {
    return calculateMonthlySeries({
      loans,
      subscriptions,
      endMonth: selectedMonth,
      monthsBack,
      monthsForward,
      personId: selectedPersonId,
      knownClientIds: clients,
    });
  }, [loans, subscriptions, selectedMonth, monthsBack, monthsForward, selectedPersonId, clients]);

  // Mapeamento dos dados para o Recharts
  const chartData = useMemo(() => {
    return series.map((pt) => {
      let val = 0;
      if (metric === 'total') val = pt.totalCommitted;
      else if (metric === 'installments') val = pt.installmentsTotal;
      else if (metric === 'subscriptions') val = pt.subscriptionsTotal;

      return {
        month: pt.month,
        label: pt.label,
        isProjected: pt.isProjected,
        isCurrent: pt.isCurrent,
        value: val,
        // Linha histórica inclui até o mês atual
        historicalValue: !pt.isProjected ? val : null,
        // Linha projetada conecta no mês atual e segue para o futuro
        projectedValue: pt.isProjected || pt.isCurrent ? val : null,
      };
    });
  }, [series, metric]);

  const metricLabel = useMemo(() => {
    if (metric === 'installments') return 'Parcelas';
    if (metric === 'subscriptions') return 'Assinaturas';
    return 'Total Comprometido';
  }, [metric]);

  const animationConfig = useMemo(() => ({
    isAnimationActive: !prefersReducedMotion,
    animationBegin: MOTION.charts.delay,
    animationDuration: MOTION.charts.duration,
    animationEasing: MOTION.charts.easing,
  }), [prefersReducedMotion]);

  const isLight = theme === 'light';
  const textColor = isLight ? '#2F5560' : '#A9C4C7';
  const gridStroke = isLight ? 'rgba(8, 60, 72, 0.08)' : 'rgba(140, 220, 225, 0.08)';
  const currentMonthPoint = series.find((p) => p.isCurrent);

  if (!hasProAccess) {
    return (
      <div data-enter="item" className="w-full">
        <ProFeatureLock
          title="Evolução Mensal de Compromissos"
          description="Visualize a linha do tempo de faturas em 6 e 12 meses, com separação de parcelas e assinaturas por pessoa."
          onAction={onUpgradeClick}
        />
      </div>
    );
  }

  return (
    <div
      data-enter="item"
      className="bg-[var(--fc-surface-1)] border border-[var(--fc-border-default)] p-6 sm:p-7 rounded-3xl shadow-[var(--fc-shadow-md)] space-y-6 animate-fadeIn"
    >
      {/* Cabeçalho e Controles */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[var(--fc-border-subtle)] pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-[var(--fc-text-primary)] tracking-tight">
              Evolução Mensal de Compromissos
            </h3>
            <span className="px-2 py-0.5 rounded-full bg-[var(--fc-accent-soft)] text-[var(--fc-accent)] text-[10px] font-bold border border-[var(--fc-accent)]/20">
              {metricLabel}
            </span>
          </div>
          <p className="text-xs text-[var(--fc-text-secondary)]">
            Acompanhe o comportamento histórico e a projeção futura de faturas no FinControl.
          </p>
          <span className="text-[11px] text-[var(--fc-text-muted)] italic block pt-0.5">
            Nota: assinaturas refletem o valor contratual ativo.
          </span>
        </div>

        {/* Controles de Métrica e Período */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5">
          <SegmentedControl
            options={METRIC_OPTIONS}
            value={metric}
            onChange={setMetric}
            ariaLabel="Filtrar por tipo de métrica"
          />
          <SegmentedControl
            options={PERIOD_OPTIONS}
            value={period}
            onChange={setPeriod}
            ariaLabel="Filtrar período do gráfico"
          />
        </div>
      </div>

      {/* Seletor Segmentado de Pessoas (Se houver clientes cadastrados) */}
      {peopleOptions.length > 2 && (
        <div
          role="group"
          aria-label="Filtrar evolução por pessoa"
          className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5"
        >
          {peopleOptions.map((person) => {
            const isSelected = selectedPersonId === person.id;
            return (
              <button
                key={person.id}
                type="button"
                aria-pressed={isSelected}
                aria-label={`Filtrar evolução para ${person.label}`}
                onClick={() => setSelectedPersonId(person.id)}
                className={`min-h-[36px] px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer whitespace-nowrap select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--fc-focus-ring)] ${
                  isSelected
                    ? 'bg-[var(--fc-accent)] text-[var(--fc-accent-contrast)] shadow-sm'
                    : 'bg-[var(--fc-surface-2)] text-[var(--fc-text-secondary)] hover:text-[var(--fc-text-primary)] hover:bg-[var(--fc-surface-3)]'
                }`}
              >
                {person.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Área do Gráfico */}
      <div className="w-full h-[280px] sm:h-[300px]">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 20, right: 16, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="fcEvolutionGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--fc-accent)" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="var(--fc-accent)" stopOpacity={0.0} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridStroke} />

              <XAxis
                dataKey="label"
                stroke={textColor}
                tick={{ fontSize: 11, fill: textColor }}
                axisLine={{ stroke: gridStroke }}
                tickLine={false}
              />

              <YAxis
                tickFormatter={formatYAxis}
                stroke={textColor}
                tick={{ fontSize: 11, fill: textColor }}
                axisLine={false}
                tickLine={false}
              />

              <Tooltip
                content={<CustomEvolutionTooltip metricLabel={metricLabel} />}
                cursor={{ stroke: 'var(--fc-border-default)', strokeWidth: 1, strokeDasharray: '2 2' }}
              />

              {currentMonthPoint && (
                <ReferenceLine
                  x={currentMonthPoint.label}
                  stroke="var(--fc-accent)"
                  strokeDasharray="3 3"
                  strokeWidth={1.5}
                />
              )}

              {/* Segmento Histórico (Linha Sólida) */}
              <Area
                type="monotone"
                dataKey="historicalValue"
                stroke="var(--fc-accent)"
                fill="url(#fcEvolutionGradient)"
                strokeWidth={2.5}
                dot={{ r: 3.5, fill: 'var(--fc-accent)', stroke: 'var(--fc-surface-1)', strokeWidth: 2 }}
                activeDot={{ r: 6, fill: 'var(--fc-accent)' }}
                connectNulls={false}
                {...animationConfig}
              />

              {/* Segmento Projetado Futuro (Linha Tracejada) */}
              <Area
                type="monotone"
                dataKey="projectedValue"
                stroke="var(--fc-accent)"
                strokeDasharray="4 4"
                fill="url(#fcEvolutionGradient)"
                strokeWidth={2.5}
                dot={{ r: 3.5, fill: 'var(--fc-accent)', stroke: 'var(--fc-surface-1)', strokeWidth: 2 }}
                activeDot={{ r: 6, fill: 'var(--fc-accent)' }}
                connectNulls={false}
                {...animationConfig}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[var(--fc-text-muted)] text-sm">
            <p>Nenhum compromisso financeiro registrado no período selecionado.</p>
          </div>
        )}
      </div>

      {/* Tabela Acessível Visualmente Oculta (WCAG / Leitores de Tela) */}
      <div className="sr-only">
        <h4>Tabela de dados de evolução mensal ({metricLabel})</h4>
        <table>
          <thead>
            <tr>
              <th scope="col">Mês</th>
              <th scope="col">Total Comprometido</th>
              <th scope="col">Parcelas</th>
              <th scope="col">Assinaturas</th>
              <th scope="col">Tipo de Dado</th>
            </tr>
          </thead>
          <tbody>
            {series.map((pt) => (
              <tr key={pt.month}>
                <td>{pt.label}</td>
                <td>{formatCurrencyDisplay(pt.totalCommitted)}</td>
                <td>{formatCurrencyDisplay(pt.installmentsTotal)}</td>
                <td>{formatCurrencyDisplay(pt.subscriptionsTotal)}</td>
                <td>{pt.isProjected ? 'Projeção Futura' : 'Histórico'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
