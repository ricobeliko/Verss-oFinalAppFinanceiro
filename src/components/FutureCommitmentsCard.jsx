// src/components/FutureCommitmentsCard.jsx
import React, { useMemo } from 'react';
import { formatCurrencyDisplay } from '../utils/currency';
import { calculateFutureCommitments, calculateDebtReliefTimeline } from '../services/financialService';

/**
 * Card de Projeção de Compromissos Futuros e Curva de Descompressão.
 * 
 * @param {Object} props
 * @param {Array<Object>} props.loans - Compras parceladas
 * @param {Array<Object>} props.subscriptions - Assinaturas ativas
 * @param {string} props.selectedMonth - Mês de competência selecionado 'YYYY-MM'
 */
export default function FutureCommitmentsCard({ loans = [], subscriptions = [], selectedMonth }) {
    const projection = useMemo(() => {
        return calculateFutureCommitments({
            loans,
            subscriptions,
            startMonth: selectedMonth,
            monthsCount: 4
        });
    }, [loans, subscriptions, selectedMonth]);

    const relief = useMemo(() => {
        return calculateDebtReliefTimeline({
            loans,
            startMonth: selectedMonth,
            monthsCount: 4
        });
    }, [loans, selectedMonth]);

    if (!selectedMonth || projection.length === 0) return null;

    return (
        <div className="bg-gradient-to-br from-carbon-900 via-carbon-900 to-carbon-800 border border-carbon-700 p-6 rounded-3xl shadow-2xl space-y-5 animate-fadeIn">
            {/* Cabeçalho */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-carbon-800 pb-4">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gold/10 text-gold flex items-center justify-center font-bold text-lg border border-gold/20 flex-shrink-0">
                        🔮
                    </div>
                    <div>
                        <h3 className="text-base font-bold text-gold-cream tracking-tight">
                            Projeção dos Próximos Meses
                        </h3>
                        <p className="text-xs text-gray-400">
                            Compromissos contratuais já registrados (Parcelas + Assinaturas)
                        </p>
                    </div>
                </div>

                {relief.totalLoansEnding > 0 && (
                    <div className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold rounded-xl">
                        <span>↓</span>
                        <span>{relief.totalLoansEnding} {relief.totalLoansEnding === 1 ? 'compra encerra' : 'compras encerram'} (-{formatCurrencyDisplay(relief.totalMonthlyRelief)}/mês)</span>
                    </div>
                )}
            </div>

            {/* Grid dos Meses Projetados */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {projection.map((item, index) => {
                    const isCurrent = index === 0;
                    return (
                        <div
                            key={item.month}
                            className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                                isCurrent
                                    ? 'bg-gold/5 border-gold/40 shadow-lg shadow-gold/10'
                                    : 'bg-carbon-800/60 border-carbon-700/80 hover:border-carbon-600'
                            }`}
                        >
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <span className={`text-xs font-bold uppercase tracking-wider ${isCurrent ? 'text-gold' : 'text-gray-400'}`}>
                                        {item.label}
                                    </span>
                                    {isCurrent && (
                                        <span className="text-[10px] uppercase font-extrabold bg-gold/20 text-gold px-1.5 py-0.5 rounded-md">
                                            Atual
                                        </span>
                                    )}
                                </div>
                                <p className="text-lg font-black tracking-tight text-gold-cream mt-1">
                                    {formatCurrencyDisplay(item.totalCommitted)}
                                </p>
                            </div>

                            <div className="mt-3 pt-2 border-t border-carbon-700/50 text-[11px] space-y-1">
                                <div className="flex justify-between text-gray-400">
                                    <span>Parcelas:</span>
                                    <span className="text-gray-200 font-mono">{formatCurrencyDisplay(item.installmentsTotal)}</span>
                                </div>
                                {item.subscriptionsTotal > 0 && (
                                    <div className="flex justify-between text-gray-400">
                                        <span>Fixos:</span>
                                        <span className="text-gray-200 font-mono">{formatCurrencyDisplay(item.subscriptionsTotal)}</span>
                                    </div>
                                )}
                                {item.endingLoansCount > 0 && (
                                    <div className="text-[10px] text-emerald-400 font-medium pt-1">
                                        🎉 {item.endingLoansCount} {item.endingLoansCount === 1 ? 'finaliza' : 'finalizam'}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
