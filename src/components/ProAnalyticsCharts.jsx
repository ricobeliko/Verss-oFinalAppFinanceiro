// src/components/ProAnalyticsCharts.jsx

import React, { useState, useMemo } from 'react';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList,
    PieChart, Pie, Cell
} from 'recharts';
import { useAppContext } from '../context/AppContext';
import UpgradePrompt from './UpgradePrompt';
import { formatCurrencyDisplay } from '../utils/currency';
import usePrefersReducedMotion from '../hooks/usePrefersReducedMotion';
import { MOTION } from '../design-system/motion';
import { calculatePersonSpendingBreakdown } from '../services/financialService';

const formatYAxis = (tick) => {
    if (tick >= 1000) return `R$ ${(tick / 1000).toLocaleString('pt-BR')}k`;
    return `R$ ${tick}`;
};

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="p-3 bg-[var(--fc-surface-1)] border border-[var(--fc-border-default)] rounded-xl shadow-[var(--fc-shadow-md)] text-xs space-y-1">
                <p className="font-bold text-[var(--fc-text-primary)]">{label}</p>
                <p className="text-[var(--fc-accent)] font-mono font-bold">{`Total Gasto: ${formatCurrencyDisplay(payload[0].value)}`}</p>
            </div>
        );
    }
    return null;
};

const PERSON_COLORS_LIGHT = [
    '#047C84', // Teal principal
    '#2563EB', // Azul vibrante
    '#B7791F', // Âmbar quente
    '#7C3AED', // Púrpura suave
    '#0D9488', // Teal médio
    '#D97706', // Laranja suave
    '#059669', // Esmeralda
    '#475569', // Ardósia
];

const PERSON_COLORS_DARK = [
    '#5CCCCC', // Teal brilhante
    '#6EA8FF', // Azul suave
    '#E3A857', // Âmbar
    '#A596F2', // Púrpura
    '#2DD4BF', // Verde-água
    '#F59E0B', // Laranja quente
    '#34D399', // Esmeralda
    '#94A3B8', // Ardósia
];

const ProAnalyticsCharts = ({ loans, clients, expenses, subscriptions, theme }) => {
    const { isPro, isTrialActive, currentUser, showToast, activateFreeTrial } = useAppContext();
    const [isLoading, setIsLoading] = useState(false);
    const [activePersonId, setActivePersonId] = useState(null);

    const hasProAccess = isPro || isTrialActive;
    const prefersReducedMotion = usePrefersReducedMotion();

    const animationConfig = useMemo(() => ({
        isAnimationActive: !prefersReducedMotion,
        animationBegin: MOTION.charts.delay,
        animationDuration: MOTION.charts.duration,
        animationEasing: MOTION.charts.easing,
    }), [prefersReducedMotion]);

    const handleActivateTrial = async () => {
        if (import.meta.env.DEV) {
            if (typeof window !== 'undefined' && (window.__FINCONTROL_E2E_USER__ || sessionStorage.getItem('fincontrol_e2e_user'))) {
                showToast('[DEV] Teste Pro ativado localmente', 'success');
                return;
            }
        }
        if (typeof activateFreeTrial === 'function') {
            await activateFreeTrial();
        }
    };

    const isLight = theme === 'light';
    const textColor = isLight ? '#2F5560' : '#A9C4C7';
    const gridStroke = isLight ? 'rgba(8, 60, 72, 0.08)' : 'rgba(140, 220, 225, 0.08)';
    const axisLineStroke = isLight ? 'rgba(8, 60, 72, 0.14)' : 'rgba(140, 220, 225, 0.14)';
    const barFill = isLight ? '#047C84' : '#5CCCCC';
    const cellStroke = isLight ? '#F8FDFE' : '#0A222B';

    const handleUpgrade = async () => {
        if (!currentUser) {
            showToast("Você precisa estar logado para fazer o upgrade.", "error");
            return;
        }
        setIsLoading(true);
        try {
            const { httpsCallable } = await import('firebase/functions');
            const { getAppFunctions } = await import('../utils/firebase');
            const functions = await getAppFunctions();
            const createMercadoPagoPreference = httpsCallable(functions, 'createMercadoPagoPreference');
            const result = await createMercadoPagoPreference();
            
            const checkoutUrl = result.data.init_point; 
            if (checkoutUrl) {
                window.location.href = checkoutUrl;
            } else {
                throw new Error("Link de pagamento não recebido do servidor.");
            }
        } catch (error) {
            console.error("Erro ao obter link de pagamento:", error);
            showToast('Não foi possível iniciar o pagamento. Tente novamente mais tarde.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    // Dados para o Gráfico de Barras: Gastos Totais por Categoria
    const dataForCategories = useMemo(() => {
        const categories = {};
        (expenses || []).forEach(expense => {
            const category = expense.category || 'Outros';
            categories[category] = (categories[category] || 0) + (expense.value || 0);
        });
        const totalLoans = (loans || []).reduce((acc, loan) => acc + (loan.value || 0), 0);
        if (totalLoans > 0) {
            categories['Compras Parceladas'] = (categories['Compras Parceladas'] || 0) + totalLoans;
        }
        const totalSubscriptions = (subscriptions || []).reduce((acc, sub) => acc + (sub.value || 0), 0);
        if (totalSubscriptions > 0) {
            categories['Assinaturas'] = (categories['Assinaturas'] || 0) + totalSubscriptions;
        }
        return Object.entries(categories)
            .map(([name, value]) => ({ name, 'Total Gasto': value }))
            .sort((a, b) => b['Total Gasto'] - a['Total Gasto']);
    }, [expenses, loans, subscriptions]);

    // Dados para o Gráfico de Rosca: Gastos por Pessoa (Fatura)
    const personBreakdown = useMemo(() => {
        const colors = isLight ? PERSON_COLORS_LIGHT : PERSON_COLORS_DARK;
        const breakdown = calculatePersonSpendingBreakdown({
            loans,
            expenses,
            subscriptions,
            clients
        });

        const coloredPersons = breakdown.persons.map((person, idx) => ({
            ...person,
            color: colors[idx % colors.length]
        }));

        return {
            ...breakdown,
            persons: coloredPersons
        };
    }, [loans, expenses, subscriptions, clients, isLight]);

    const activePerson = useMemo(() => {
        if (!activePersonId) return null;
        return personBreakdown.persons.find(p => p.id === activePersonId) || null;
    }, [activePersonId, personBreakdown]);

    return (
        <div className="relative min-h-[380px]">
            {!hasProAccess ? (
                <div className="absolute inset-0 flex items-center justify-center bg-[var(--fc-bg)]/80 backdrop-blur-md rounded-2xl z-20 p-4 overflow-y-auto">
                    <div className="max-w-md w-full my-auto">
                        <UpgradePrompt 
                            onUpgradeClick={handleUpgrade} 
                            onActivateTrial={handleActivateTrial}
                            isLoading={isLoading} 
                        />
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    
                    {/* Gráfico de Barras: Gastos Totais por Categoria */}
                    <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--fc-text-primary)] mb-6">
                            Gastos Totais por Categoria
                        </h3>
                        {dataForCategories.length > 0 ? (
                            <ResponsiveContainer width="100%" height={280}>
                                <BarChart data={dataForCategories}>
                                    <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                                    <XAxis dataKey="name" tick={{ fill: textColor, fontSize: 11 }} axisLine={{ stroke: axisLineStroke }} />
                                    <YAxis tick={{ fill: textColor, fontSize: 11 }} tickFormatter={formatYAxis} axisLine={{ stroke: axisLineStroke }} />
                                    <Tooltip content={<CustomTooltip />} cursor={{ fill: isLight ? 'rgba(4, 124, 132, 0.08)' : 'rgba(92, 204, 204, 0.08)' }} />
                                    <Bar
                                        dataKey="Total Gasto"
                                        fill={barFill}
                                        radius={[8, 8, 0, 0]}
                                        isAnimationActive={animationConfig.isAnimationActive}
                                        animationBegin={animationConfig.animationBegin}
                                        animationDuration={animationConfig.animationDuration}
                                        animationEasing={animationConfig.animationEasing}
                                    >
                                        <LabelList dataKey="Total Gasto" position="top" formatter={(value) => formatCurrencyDisplay(value)} fill={barFill} fontSize={10} fontWeight="bold" />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex items-center justify-center h-[280px] text-[var(--fc-text-muted)] text-sm">
                                Nenhum gasto para os filtros.
                            </div>
                        )}
                    </div>

                    {/* Gráfico de Rosca Interativa: Gastos por Pessoa (Fatura) */}
                    <div>
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--fc-text-primary)]">
                                Gastos por Pessoa (Fatura)
                            </h3>
                            {personBreakdown.persons.length > 0 && (
                                <span className="text-[11px] font-mono text-[var(--fc-text-muted)]">
                                    {personBreakdown.persons.length} {personBreakdown.persons.length === 1 ? 'pessoa' : 'pessoas'}
                                </span>
                            )}
                        </div>

                        {personBreakdown.persons.length > 0 ? (
                            <div className="flex flex-col items-center gap-6 w-full">
                                {/* Rosca Central com Total em Destaque */}
                                <div className="relative w-[210px] h-[210px] shrink-0 mx-auto" aria-hidden="true">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={personBreakdown.persons}
                                                dataKey="value"
                                                nameKey="name"
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={65}
                                                outerRadius={92}
                                                paddingAngle={personBreakdown.persons.length > 1 ? 3 : 0}
                                                isAnimationActive={animationConfig.isAnimationActive}
                                                animationBegin={animationConfig.animationBegin}
                                                animationDuration={animationConfig.animationDuration}
                                                animationEasing={animationConfig.animationEasing}
                                            >
                                                {personBreakdown.persons.map((entry) => {
                                                    const isCurrent = activePersonId === entry.id;
                                                    const isDimmed = activePersonId !== null && !isCurrent;
                                                    return (
                                                        <Cell
                                                            key={`cell-${entry.id}`}
                                                            fill={entry.color}
                                                            stroke={cellStroke}
                                                            strokeWidth={isCurrent ? 3 : 1.5}
                                                            opacity={isDimmed ? 0.35 : 1}
                                                            style={{
                                                                cursor: 'pointer',
                                                                transition: 'opacity 200ms ease, stroke-width 200ms ease',
                                                            }}
                                                            onMouseEnter={() => setActivePersonId(entry.id)}
                                                            onMouseLeave={() => setActivePersonId(null)}
                                                        />
                                                    );
                                                })}
                                            </Pie>
                                        </PieChart>
                                    </ResponsiveContainer>

                                    {/* Centro Dinâmico da Rosca */}
                                    <div
                                        data-testid="donut-center"
                                        className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4 transition-all duration-200"
                                    >
                                        {activePerson ? (
                                            <>
                                                <span
                                                    title={activePerson.name}
                                                    className="text-[11px] font-semibold text-[var(--fc-accent)] truncate max-w-[115px] leading-tight px-1"
                                                >
                                                    {activePerson.name}
                                                </span>
                                                <span className="text-base sm:text-lg font-bold font-mono text-[var(--fc-text-primary)] leading-tight my-0.5 whitespace-nowrap">
                                                    {formatCurrencyDisplay(activePerson.value)}
                                                </span>
                                                <span className="text-[11px] font-medium text-[var(--fc-text-muted)] leading-tight whitespace-nowrap">
                                                    {activePerson.percent}% da fatura
                                                </span>
                                            </>
                                        ) : (
                                            <>
                                                <span
                                                    title="Total da Fatura"
                                                    className="text-[10px] font-semibold uppercase tracking-wider text-[var(--fc-text-muted)] leading-tight truncate max-w-[115px] px-1"
                                                >
                                                    Total da Fatura
                                                </span>
                                                <span className="text-base sm:text-lg font-bold font-mono text-[var(--fc-text-primary)] leading-tight my-0.5 whitespace-nowrap">
                                                    {formatCurrencyDisplay(personBreakdown.total)}
                                                </span>
                                                <span className="text-[11px] font-medium text-[var(--fc-text-secondary)] leading-tight whitespace-nowrap">
                                                    {personBreakdown.persons.length === 1 ? '100%' : '100% total'}
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Legenda Interativa e Acessível */}
                                <div
                                    role="list"
                                    aria-label="Detalhamento de gastos por pessoa na fatura"
                                    className="w-full min-w-0 max-h-[240px] overflow-y-auto overflow-x-hidden p-1 space-y-1 focus-visible:outline-none"
                                >
                                    {personBreakdown.persons.map((person) => {
                                        const isCurrent = activePersonId === person.id;
                                        const isDimmed = activePersonId !== null && !isCurrent;
                                        return (
                                            <button
                                                type="button"
                                                role="listitem"
                                                key={person.id}
                                                tabIndex={0}
                                                aria-label={`${person.name}: ${formatCurrencyDisplay(person.value)}, ${person.percent}% do total`}
                                                aria-pressed={isCurrent}
                                                title={person.name}
                                                onMouseEnter={() => setActivePersonId(person.id)}
                                                onMouseLeave={() => setActivePersonId(null)}
                                                onFocus={() => setActivePersonId(person.id)}
                                                onBlur={() => setActivePersonId(null)}
                                                onClick={() => setActivePersonId(prev => prev === person.id ? null : person.id)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' || e.key === ' ') {
                                                        e.preventDefault();
                                                        setActivePersonId(prev => prev === person.id ? null : person.id);
                                                    }
                                                }}
                                                className={`w-full min-w-0 flex items-center justify-between gap-3 px-3 py-2 rounded-xl text-xs transition-all cursor-pointer border ${
                                                    isCurrent
                                                        ? 'bg-[var(--fc-surface-2)] border-[var(--fc-border-hover)] text-[var(--fc-text-primary)] shadow-sm'
                                                        : isDimmed
                                                        ? 'opacity-40 border-transparent text-[var(--fc-text-muted)] hover:opacity-80'
                                                        : 'bg-transparent border-transparent text-[var(--fc-text-secondary)] hover:bg-[var(--fc-surface-1)] hover:text-[var(--fc-text-primary)]'
                                                }`}
                                            >
                                                <div className="flex items-center gap-2.5 truncate min-w-0 flex-1">
                                                    <span
                                                        className="w-3 h-3 rounded-full shrink-0 transition-transform duration-200"
                                                        style={{
                                                            backgroundColor: person.color,
                                                            transform: isCurrent ? 'scale(1.25)' : 'scale(1)',
                                                        }}
                                                        aria-hidden="true"
                                                    />
                                                    <span className="truncate font-medium min-w-0" title={person.name}>
                                                        {person.name}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2 font-mono shrink-0 whitespace-nowrap">
                                                    <span className="text-[var(--fc-text-primary)] font-semibold whitespace-nowrap">
                                                        {formatCurrencyDisplay(person.value)}
                                                    </span>
                                                    <span className="text-[var(--fc-text-muted)] text-[11px] min-w-[38px] text-right font-medium whitespace-nowrap">
                                                        {person.percent}%
                                                    </span>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center justify-center h-[280px] text-[var(--fc-text-muted)] text-sm">
                                Nenhuma compra para os filtros.
                            </div>
                        )}
                    </div>

                </div>
            )}
        </div>
    );
};

export default ProAnalyticsCharts;
