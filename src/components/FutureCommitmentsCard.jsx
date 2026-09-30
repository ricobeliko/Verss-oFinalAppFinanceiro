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
export default function FutureCommitmentsCard({ loans = [], subscriptions = [], selectedMonth, selectedClientName = '' }) {
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
        <div className="bg-[var(--fc-surface-1)] border border-[var(--fc-border-default)] p-6 rounded-3xl shadow-[var(--fc-shadow-md)] space-y-5 animate-fadeIn">
            {/* Cabeçalho */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--fc-border-subtle)] pb-4">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[var(--fc-accent-soft)] text-[var(--fc-accent)] flex items-center justify-center font-bold text-lg border border-[var(--fc-accent)]/20 flex-shrink-0">
                        🔮
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-base font-bold text-[var(--fc-text-primary)] tracking-tight">
                                Projeção dos Próximos Meses
                            </h3>
                            {selectedClientName && (
                                <span className="px-2 py-0.5 rounded-full bg-[var(--fc-accent-soft)] text-[var(--fc-accent)] text-[11px] font-semibold border border-[var(--fc-accent)]/20">
                                    {selectedClientName}
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-[var(--fc-text-secondary)]">
                            {selectedClientName 
                                ? `Compromissos atribuídos a ${selectedClientName} (Parcelas + Assinaturas)`
                                : 'Compromissos contratuais já registrados (Parcelas + Assinaturas)'}
                        </p>
                    </div>
                </div>

                {relief.totalLoansEnding > 0 && (
                    <div className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1 bg-[var(--fc-success-soft)] border border-[var(--fc-success)]/20 text-[var(--fc-success)] text-xs font-semibold rounded-xl">
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
                                    ? 'bg-[var(--fc-accent-soft)] border-[var(--fc-accent)]/40 shadow-[var(--fc-shadow-sm)]'
                                    : 'bg-[var(--fc-surface-2)] border-[var(--fc-border-subtle)] hover:border-[var(--fc-border-default)]'
                            }`}
                        >
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <span className={`text-xs font-bold uppercase tracking-wider ${isCurrent ? 'text-[var(--fc-accent)]' : 'text-[var(--fc-text-secondary)]'}`}>
                                        {item.label}
                                    </span>
                                    {isCurrent && (
                                        <span className="text-[10px] uppercase font-extrabold bg-[var(--fc-accent)]/20 text-[var(--fc-accent)] px-1.5 py-0.5 rounded-md">
                                            Atual
                                        </span>
                                    )}
                                </div>
                                <p className="text-lg font-black tracking-tight text-[var(--fc-text-primary)] mt-1">
                                    {formatCurrencyDisplay(item.totalCommitted)}
                                </p>
                            </div>

                            <div className="mt-3 pt-2 border-t border-[var(--fc-border-subtle)] text-[11px] space-y-1">
                                <div className="flex justify-between text-[var(--fc-text-secondary)]">
                                    <span>Parcelas:</span>
                                    <span className="text-[var(--fc-text-primary)] font-mono">{formatCurrencyDisplay(item.installmentsTotal)}</span>
                                </div>
                                {item.subscriptionsTotal > 0 && (
                                    <div className="flex justify-between text-[var(--fc-text-secondary)]">
                                        <span>Fixos:</span>
                                        <span className="text-[var(--fc-text-primary)] font-mono">{formatCurrencyDisplay(item.subscriptionsTotal)}</span>
                                    </div>
                                )}
                                {item.endingLoansCount > 0 && (
                                    <div className="text-[10px] text-[var(--fc-success)] font-medium pt-1">
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
