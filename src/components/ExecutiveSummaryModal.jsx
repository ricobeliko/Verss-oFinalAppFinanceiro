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
                <div className="flex rounded-2xl bg-carbon-800 p-1 border border-carbon-700">
                    <button
                        type="button"
                        onClick={() => setTab('weekly')}
                        className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-xl transition cursor-pointer ${
                            tab === 'weekly'
                                ? 'bg-gold text-carbon-900 shadow-md'
                                : 'text-gray-400 hover:text-gold-cream'
                        }`}
                    >
                        🗓️ Visão Semanal (Últimos & Próximos 7 Dias)
                    </button>
                    <button
                        type="button"
                        onClick={() => setTab('monthly')}
                        className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-xl transition cursor-pointer ${
                            tab === 'monthly'
                                ? 'bg-gold text-carbon-900 shadow-md'
                                : 'text-gray-400 hover:text-gold-cream'
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
                            <div className="p-4 rounded-2xl bg-carbon-800/60 border border-carbon-700 space-y-3">
                                <div className="flex items-center justify-between border-b border-carbon-700 pb-2">
                                    <span className="text-xs font-bold text-gray-300">Últimos 7 Dias</span>
                                    <span className="text-[10px] text-gray-500 font-mono">{weeklySummary.window.past.start} a {weeklySummary.window.past.end}</span>
                                </div>
                                <div className="space-y-1.5 text-xs">
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">Receitas Efetivadas:</span>
                                        <span className="font-bold text-emerald-400">+{formatCurrencyDisplay(weeklySummary.pastWeekIncomes)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">Despesas Registradas:</span>
                                        <span className="font-bold text-rose-400">-{formatCurrencyDisplay(weeklySummary.pastWeekExpenses)}</span>
                                    </div>
                                    <div className="flex justify-between pt-1 border-t border-carbon-700/60 font-bold">
                                        <span className="text-gray-300">Saldo Líquido da Semana:</span>
                                        <span className={weeklySummary.pastWeekNet >= 0 ? 'text-gold' : 'text-rose-400'}>
                                            {formatCurrencyDisplay(weeklySummary.pastWeekNet)}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Bloco Futuro Iminente */}
                            <div className="p-4 rounded-2xl bg-carbon-800/60 border border-carbon-700 space-y-3">
                                <div className="flex items-center justify-between border-b border-carbon-700 pb-2">
                                    <span className="text-xs font-bold text-gold">Próximos 7 Dias</span>
                                    <span className="text-[10px] text-gray-500 font-mono">até {weeklySummary.window.upcoming.end}</span>
                                </div>
                                <div className="space-y-1.5 text-xs">
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">Parcelas a Vencer:</span>
                                        <span className="font-bold text-gray-200">{formatCurrencyDisplay(weeklySummary.upcomingInstallments)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">Assinaturas Iminentes:</span>
                                        <span className="font-bold text-gray-200">{formatCurrencyDisplay(weeklySummary.upcomingSubscriptions)}</span>
                                    </div>
                                    <div className="flex justify-between pt-1 border-t border-carbon-700/60 font-bold">
                                        <span className="text-gold">Total de Compromissos:</span>
                                        <span className="text-gold font-mono">{formatCurrencyDisplay(weeklySummary.upcomingCommitmentsTotal)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {weeklySummary.endingLoansSoonCount > 0 && (
                            <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 flex items-center gap-2">
                                <span>🎉</span>
                                <span>Você tem <strong>{weeklySummary.endingLoansSoonCount}</strong> compra(s) encerrando parcelas no ciclo atual.</span>
                            </div>
                        )}
                    </div>
                )}

                {/* Conteúdo da Aba Mensal */}
                {tab === 'monthly' && (
                    <div className="space-y-4 animate-fadeIn">
                        <div className="p-4 rounded-2xl bg-carbon-800/60 border border-carbon-700 space-y-3">
                            <div className="flex items-center justify-between border-b border-carbon-700 pb-2">
                                <span className="text-xs font-bold text-gray-200">Consolidado da Competência {monthlySummary.competence}</span>
                                <span className="text-xs font-bold text-gold">Saldo: {formatCurrencyDisplay(monthlySummary.summary.netBalance)}</span>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                                <div className="p-2.5 rounded-xl bg-carbon-900/60 border border-carbon-800">
                                    <p className="text-[10px] text-gray-400">Receitas</p>
                                    <p className="text-xs font-bold text-emerald-400 mt-0.5">{formatCurrencyDisplay(monthlySummary.summary.totalIncome)}</p>
                                </div>
                                <div className="p-2.5 rounded-xl bg-carbon-900/60 border border-carbon-800">
                                    <p className="text-[10px] text-gray-400">Faturas</p>
                                    <p className="text-xs font-bold text-gray-200 mt-0.5">{formatCurrencyDisplay(monthlySummary.summary.totalInvoice)}</p>
                                </div>
                                <div className="p-2.5 rounded-xl bg-carbon-900/60 border border-carbon-800">
                                    <p className="text-[10px] text-gray-400">Despesas</p>
                                    <p className="text-xs font-bold text-gray-200 mt-0.5">{formatCurrencyDisplay(monthlySummary.summary.totalExpenses)}</p>
                                </div>
                                <div className="p-2.5 rounded-xl bg-carbon-900/60 border border-carbon-800">
                                    <p className="text-[10px] text-gray-400">Repasses Devidos</p>
                                    <p className="text-xs font-bold text-gold mt-0.5">{formatCurrencyDisplay(monthlySummary.repasses.totalPending)}</p>
                                </div>
                            </div>

                            {monthlySummary.topCategory && (
                                <div className="pt-2 border-t border-carbon-700/60 flex items-center justify-between text-xs">
                                    <span className="text-gray-400">Maior Categoria de Gastos:</span>
                                    <span className="font-bold text-gold-cream">
                                        {monthlySummary.topCategory.name} ({monthlySummary.topCategory.percentage}% — {formatCurrencyDisplay(monthlySummary.topCategory.amount)})
                                    </span>
                                </div>
                            )}

                            {monthlySummary.endingPurchases.count > 0 && (
                                <div className="pt-1 flex items-center justify-between text-xs">
                                    <span className="text-gray-400">Alívio de Quitação Próximo Mês:</span>
                                    <span className="font-bold text-emerald-400">
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
