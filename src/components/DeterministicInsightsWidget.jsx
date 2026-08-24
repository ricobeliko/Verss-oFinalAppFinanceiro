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
        <div className="bg-gradient-to-br from-carbon-900 via-carbon-900 to-carbon-800 border border-carbon-700 p-6 rounded-3xl shadow-2xl space-y-4 animate-fadeIn">
            <div className="flex items-center gap-2.5">
                <span className="text-xl">💡</span>
                <div>
                    <h3 className="text-base font-bold text-gold-cream tracking-tight">
                        Insights Financeiros
                    </h3>
                    <p className="text-xs text-gray-400">
                        Análise de fatos e variações calculados dos seus lançamentos
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                {insights.map((insight) => {
                    const badgeStyles = {
                        positive: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
                        warning: 'bg-amber-500/10 border-amber-500/20 text-amber-300',
                        info: 'bg-gold/10 border-gold/20 text-gold-cream'
                    }[insight.level] || 'bg-carbon-800 border-carbon-700 text-gray-300';

                    return (
                        <div
                            key={insight.id}
                            className="bg-carbon-800/60 border border-carbon-700/80 p-4 rounded-2xl flex flex-col justify-between space-y-2 hover:border-carbon-600 transition"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="text-lg">{insight.icon}</span>
                                    <span className="text-xs font-bold text-gold-cream uppercase tracking-wide">
                                        {insight.title}
                                    </span>
                                </div>
                                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-md border ${badgeStyles}`}>
                                    {insight.level === 'positive' ? 'Alívio' : (insight.level === 'warning' ? 'Atenção' : 'Fato')}
                                </span>
                            </div>
                            <p className="text-xs text-gray-300 leading-relaxed">
                                {insight.text}
                            </p>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
