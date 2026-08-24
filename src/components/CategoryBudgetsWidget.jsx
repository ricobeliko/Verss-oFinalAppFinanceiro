// src/components/CategoryBudgetsWidget.jsx
import React from 'react';
import { formatCurrencyDisplay } from '../utils/currency';
import { calculateCategoryBudgetsProgress } from '../services/financialService';

/**
 * Widget de Orçamentos por Categoria (Metas de Gastos).
 * Exibe termômetro de consumo de cada categoria e permite definir metas pessoais.
 */
export default function CategoryBudgetsWidget({
    budgets = {},
    expenses = [],
    loans = [],
    selectedMonth,
    onOpenBudgetModal
}) {
    const progressList = calculateCategoryBudgetsProgress({
        budgets,
        expenses,
        loans,
        selectedMonth
    });

    const hasBudgets = Object.keys(budgets).length > 0;

    return (
        <div className="bg-carbon-900 border border-carbon-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    <span className="text-xl">🎯</span>
                    <div>
                        <h3 className="text-base font-bold text-gold-cream">Metas de Orçamento por Categoria</h3>
                        <p className="text-xs text-gray-400">Controle seus limites mensais planejados</p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={onOpenBudgetModal}
                    className="px-3 py-1.5 rounded-xl bg-gold/10 hover:bg-gold/20 text-gold border border-gold/30 text-xs font-bold transition cursor-pointer"
                >
                    {hasBudgets ? '⚙️ Ajustar Metas' : '+ Definir Metas'}
                </button>
            </div>

            {!hasBudgets ? (
                <div className="p-4 rounded-2xl bg-carbon-800/50 border border-dashed border-carbon-700 text-center space-y-2">
                    <p className="text-xs text-gray-400">Você ainda não definiu metas de gastos para suas categorias.</p>
                    <p className="text-[11px] text-gold">Defina um teto mensal para Alimentação, Lazer, etc. e acompanhe seu consumo em tempo real.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    {progressList.map((item) => {
                        const isExceeded = item.status === 'exceeded';
                        const isWarning = item.status === 'warning';

                        const barColor = isExceeded
                            ? 'bg-rose-500'
                            : isWarning
                            ? 'bg-amber-500'
                            : 'bg-emerald-500';

                        return (
                            <div
                                key={item.category}
                                className="p-3.5 rounded-2xl bg-carbon-800/60 border border-carbon-700 space-y-2 transition hover:border-carbon-600"
                            >
                                <div className="flex justify-between items-center text-xs">
                                    <span className="font-bold text-gold-cream truncate max-w-[120px]">{item.category}</span>
                                    <span className={`font-semibold ${isExceeded ? 'text-rose-400' : isWarning ? 'text-amber-400' : 'text-emerald-400'}`}>
                                        {formatCurrencyDisplay(item.spent)} / {formatCurrencyDisplay(item.budgetLimit)}
                                    </span>
                                </div>

                                <div className="w-full h-2 rounded-full bg-carbon-900 overflow-hidden">
                                    <div
                                        className={`h-full transition-all duration-500 ${barColor}`}
                                        style={{ width: `${Math.min(100, item.percentage)}%` }}
                                    />
                                </div>

                                <div className="flex justify-between items-center text-[10px] text-gray-400">
                                    <span>{item.percentage}% consumido</span>
                                    <span>
                                        {isExceeded
                                            ? '⚠️ Limite Excedido'
                                            : `Resta ${formatCurrencyDisplay(item.remaining)}`}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
