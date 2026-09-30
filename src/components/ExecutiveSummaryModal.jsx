// src/components/ExecutiveSummaryModal.jsx
import React, { useState, useMemo } from 'react';
import GenericModal from './GenericModal';
import { formatCurrencyDisplay } from '../utils/currency';
import { generateWeeklyFinancialSummary, generateMonthlyFinancialSummary } from '../services/financialService';

/**
 * Modal de Resumo Executivo Financeiro (Semanal e Mensal).
 * Exibe fatos consolidados 100% determinísticos sem chamadas a IA.
 */
export default function ExecutiveSummaryModal({
    isOpen,
    onClose,
    selectedMonth,
    loans = [],
    expenses = [],
    subscriptions = [],
    incomes = [],
    clients = []
}) {
    const [tab, setTab] = useState('weekly'); // 'weekly' | 'monthly'

    const weeklySummary = useMemo(() => {
        return generateWeeklyFinancialSummary({
            loans,
            expenses,
            subscriptions,
            incomes
        });
    }, [loans, expenses, subscriptions, incomes]);

    const monthlySummary = useMemo(() => {
        return generateMonthlyFinancialSummary({
            selectedMonth,
            loans,
            expenses,
            subscriptions,
            incomes,
            clients
        });
    }, [selectedMonth, loans, expenses, subscriptions, incomes, clients]);

    return (
        <GenericModal
            isOpen={isOpen}
            onClose={onClose}
            title="Resumo Executivo Financeiro"
            maxWidth="max-w-2xl"
        >
            <div className="space-y-6">
                {/* Abas de Navegação */}
                <div className="flex rounded-2xl bg-[var(--fc-surface-2)] p-1.5 border border-[var(--fc-border-default)]">
                    <button
                        type="button"
                        onClick={() => setTab('weekly')}
                        className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-xl transition cursor-pointer ${
                            tab === 'weekly'
                                ? 'bg-[var(--fc-accent)] text-carbon-950 shadow-md'
                                : 'text-[var(--fc-text-muted)] hover:text-[var(--fc-text-primary)]'
                        }`}
                    >
                        🗓️ Visão Semanal (Últimos & Próximos 7 Dias)
                    </button>
                    <button
                        type="button"
                        onClick={() => setTab('monthly')}
                        className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-xl transition cursor-pointer ${
                            tab === 'monthly'
                                ? 'bg-[var(--fc-accent)] text-carbon-950 shadow-md'
                                : 'text-[var(--fc-text-muted)] hover:text-[var(--fc-text-primary)]'
                        }`}
                    >
                        📊 Visão Mensal Consolidada
                    </button>
                </div>

                {/* Conteúdo da Aba Semanal */}
                {tab === 'weekly' && (
                    <div className="space-y-4 animate-fadeIn">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Bloco Passado */}
                            <div className="p-4 rounded-2xl bg-[var(--fc-surface-2)] border border-[var(--fc-border-default)] space-y-3">
                                <div className="flex items-center justify-between border-b border-[var(--fc-border-subtle)] pb-2">
                                    <span className="text-xs font-bold text-[var(--fc-text-primary)]">Últimos 7 Dias</span>
                                    <span className="text-[10px] text-[var(--fc-text-muted)] font-mono">{weeklySummary.window.past.start} a {weeklySummary.window.past.end}</span>
                                </div>
                                <div className="space-y-1.5 text-xs">
                                    <div className="flex justify-between">
                                        <span className="text-[var(--fc-text-muted)]">Receitas Efetivadas:</span>
                                        <span className="font-bold text-emerald-600 dark:text-emerald-400">+{formatCurrencyDisplay(weeklySummary.pastWeekIncomes)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-[var(--fc-text-muted)]">Despesas Registradas:</span>
                                        <span className="font-bold text-rose-600 dark:text-rose-400">-{formatCurrencyDisplay(weeklySummary.pastWeekExpenses)}</span>
                                    </div>
                                    <div className="flex justify-between pt-1 border-t border-[var(--fc-border-subtle)] font-bold">
                                        <span className="text-[var(--fc-text-secondary)]">Saldo Líquido da Semana:</span>
                                        <span className={weeklySummary.pastWeekNet >= 0 ? 'text-[var(--fc-accent)]' : 'text-rose-600 dark:text-rose-400'}>
                                            {formatCurrencyDisplay(weeklySummary.pastWeekNet)}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Bloco Futuro Iminente */}
                            <div className="p-4 rounded-2xl bg-[var(--fc-surface-2)] border border-[var(--fc-border-default)] space-y-3">
                                <div className="flex items-center justify-between border-b border-[var(--fc-border-subtle)] pb-2">
                                    <span className="text-xs font-bold text-[var(--fc-accent)]">Próximos 7 Dias</span>
                                    <span className="text-[10px] text-[var(--fc-text-muted)] font-mono">até {weeklySummary.window.upcoming.end}</span>
                                </div>
                                <div className="space-y-1.5 text-xs">
                                    <div className="flex justify-between">
                                        <span className="text-[var(--fc-text-muted)]">Parcelas a Vencer:</span>
                                        <span className="font-bold text-[var(--fc-text-primary)]">{formatCurrencyDisplay(weeklySummary.upcomingInstallments)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-[var(--fc-text-muted)]">Assinaturas Iminentes:</span>
                                        <span className="font-bold text-[var(--fc-text-primary)]">{formatCurrencyDisplay(weeklySummary.upcomingSubscriptions)}</span>
                                    </div>
                                    <div className="flex justify-between pt-1 border-t border-[var(--fc-border-subtle)] font-bold">
                                        <span className="text-[var(--fc-accent)]">Total de Compromissos:</span>
                                        <span className="text-[var(--fc-accent)] font-mono">{formatCurrencyDisplay(weeklySummary.upcomingCommitmentsTotal)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {weeklySummary.endingLoansSoonCount > 0 && (
                            <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                                <span>🎉</span>
                                <span>Você tem <strong>{weeklySummary.endingLoansSoonCount}</strong> compra(s) encerrando parcelas no ciclo atual.</span>
                            </div>
                        )}
                    </div>
                )}

                {/* Conteúdo da Aba Mensal */}
                {tab === 'monthly' && (
                    <div className="space-y-4 animate-fadeIn">
                        <div className="p-4 rounded-2xl bg-[var(--fc-surface-2)] border border-[var(--fc-border-default)] space-y-3">
                            <div className="flex items-center justify-between border-b border-[var(--fc-border-subtle)] pb-2">
                                <span className="text-xs font-bold text-[var(--fc-text-primary)]">Consolidado da Competência {monthlySummary.competence}</span>
                                <span className="text-xs font-bold text-[var(--fc-accent)]">Saldo: {formatCurrencyDisplay(monthlySummary.summary.netBalance)}</span>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                                <div className="p-2.5 rounded-xl bg-[var(--fc-surface-1)] border border-[var(--fc-border-default)]">
                                    <p className="text-[10px] text-[var(--fc-text-muted)]">Receitas</p>
                                    <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">{formatCurrencyDisplay(monthlySummary.summary.totalIncome)}</p>
                                </div>
                                <div className="p-2.5 rounded-xl bg-[var(--fc-surface-1)] border border-[var(--fc-border-default)]">
                                    <p className="text-[10px] text-[var(--fc-text-muted)]">Faturas</p>
                                    <p className="text-xs font-bold text-[var(--fc-text-primary)] mt-0.5">{formatCurrencyDisplay(monthlySummary.summary.totalInvoice)}</p>
                                </div>
                                <div className="p-2.5 rounded-xl bg-[var(--fc-surface-1)] border border-[var(--fc-border-default)]">
                                    <p className="text-[10px] text-[var(--fc-text-muted)]">Despesas</p>
                                    <p className="text-xs font-bold text-[var(--fc-text-primary)] mt-0.5">{formatCurrencyDisplay(monthlySummary.summary.totalExpenses)}</p>
                                </div>
                                <div className="p-2.5 rounded-xl bg-[var(--fc-surface-1)] border border-[var(--fc-border-default)]">
                                    <p className="text-[10px] text-[var(--fc-text-muted)]">Repasses Devidos</p>
                                    <p className="text-xs font-bold text-[var(--fc-accent)] mt-0.5">{formatCurrencyDisplay(monthlySummary.repasses.totalPending)}</p>
                                </div>
                            </div>

                            {monthlySummary.topCategory && (
                                <div className="pt-2 border-t border-[var(--fc-border-subtle)] flex items-center justify-between text-xs">
                                    <span className="text-[var(--fc-text-muted)]">Maior Categoria de Gastos:</span>
                                    <span className="font-bold text-[var(--fc-text-primary)]">
                                        {monthlySummary.topCategory.name} ({monthlySummary.topCategory.percentage}% — {formatCurrencyDisplay(monthlySummary.topCategory.amount)})
                                    </span>
                                </div>
                            )}

                            {monthlySummary.endingPurchases.count > 0 && (
                                <div className="pt-1 flex items-center justify-between text-xs">
                                    <span className="text-[var(--fc-text-muted)]">Alívio de Quitação Próximo Mês:</span>
                                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                        +{formatCurrencyDisplay(monthlySummary.endingPurchases.reliefAmount)}/mês
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </GenericModal>
    );
}
