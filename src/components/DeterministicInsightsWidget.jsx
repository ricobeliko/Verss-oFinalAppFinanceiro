// src/components/DeterministicInsightsWidget.jsx
import React from 'react';

/**
 * Widget de Apresentação de Insights Determinísticos.
 * 
 * @param {Object} props
 * @param {Array<Object>} props.insights - Lista de insights gerados pelo motor determinístico
 */
export default function DeterministicInsightsWidget({ insights = [] }) {
    if (!insights || insights.length === 0) return null;

    return (
        <div className="bg-[var(--fc-surface-1)] border border-[var(--fc-border-default)] p-6 rounded-3xl shadow-[var(--fc-shadow-md)] space-y-4 animate-fadeIn">
            <div className="flex items-center gap-2.5">
                <span className="text-xl">💡</span>
                <div>
                    <h3 className="text-base font-bold text-[var(--fc-text-primary)] tracking-tight">
                        Insights Financeiros
                    </h3>
                    <p className="text-xs text-[var(--fc-text-secondary)]">
                        Análise de fatos e variações calculados dos seus lançamentos
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                {insights.map((insight) => {
                    const badgeStyles = {
                        positive: 'bg-[var(--fc-success-soft)] border-[var(--fc-success)]/30 text-[var(--fc-success)]',
                        warning: 'bg-[var(--fc-warning-soft)] border-[var(--fc-warning)]/30 text-[var(--fc-warning)]',
                        info: 'bg-[var(--fc-info-soft)] border-[var(--fc-info)]/30 text-[var(--fc-info)]'
                    }[insight.level] || 'bg-[var(--fc-surface-3)] border-[var(--fc-border-subtle)] text-[var(--fc-text-secondary)]';

                    return (
                        <div
                            key={insight.id}
                            className="bg-[var(--fc-surface-2)] border border-[var(--fc-border-subtle)] p-4 rounded-2xl flex flex-col justify-between space-y-2 hover:border-[var(--fc-border-default)] transition"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="text-lg">{insight.icon}</span>
                                    <span className="text-xs font-bold text-[var(--fc-text-primary)] uppercase tracking-wide">
                                        {insight.title}
                                    </span>
                                </div>
                                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-md border ${badgeStyles}`}>
                                    {insight.level === 'positive' ? 'Alívio' : (insight.level === 'warning' ? 'Atenção' : 'Fato')}
                                </span>
                            </div>
                            <p className="text-xs text-[var(--fc-text-secondary)] leading-relaxed">
                                {insight.text}
                            </p>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
