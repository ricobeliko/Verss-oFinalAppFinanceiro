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
        <div className="bg-[var(--fc-surface-1)] border border-[var(--fc-border-default)] rounded-3xl p-5 sm:p-6 shadow-[var(--fc-shadow-md)] space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    <span className="text-xl">🎯</span>
                    <div>
                        <h3 className="text-base font-bold text-[var(--fc-text-primary)]">Metas de Orçamento por Categoria</h3>
                        <p className="text-xs text-[var(--fc-text-secondary)]">Controle seus limites mensais planejados</p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={onOpenBudgetModal}
                    className="px-3 py-1.5 rounded-xl bg-[var(--fc-accent-soft)] hover:bg-[var(--fc-accent)]/20 text-[var(--fc-accent)] border border-[var(--fc-accent)]/30 text-xs font-semibold transition cursor-pointer"
                >
                    {hasBudgets ? '⚙️ Ajustar Metas' : '+ Definir Metas'}
                </button>
            </div>

            {!hasBudgets ? (
                <div className="p-4 rounded-2xl bg-[var(--fc-surface-2)] border border-dashed border-[var(--fc-border-default)] text-center space-y-2">
                    <p className="text-xs text-[var(--fc-text-secondary)]">Você ainda não definiu metas de gastos para suas categorias.</p>
                    <p className="text-[11px] text-[var(--fc-accent)]">Defina um teto mensal para Alimentação, Lazer, etc. e acompanhe seu consumo em tempo real.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    {progressList.map((item) => {
                        const isExceeded = item.status === 'exceeded';
                        const isWarning = item.status === 'warning';

                        const barColor = isExceeded
                            ? 'bg-[var(--fc-danger)]'
                            : isWarning
                            ? 'bg-[var(--fc-warning)]'
                            : 'bg-[var(--fc-success)]';

                        return (
                            <div
                                key={item.category}
                                className="p-3.5 rounded-2xl bg-[var(--fc-surface-2)] border border-[var(--fc-border-subtle)] space-y-2 transition hover:border-[var(--fc-border-default)]"
                            >
                                <div className="flex justify-between items-center text-xs">
                                    <span className="font-bold text-[var(--fc-text-primary)] truncate max-w-[120px]">{item.category}</span>
                                    <span className={`font-semibold ${isExceeded ? 'text-[var(--fc-danger)]' : isWarning ? 'text-[var(--fc-warning)]' : 'text-[var(--fc-success)]'}`}>
                                        {formatCurrencyDisplay(item.spent)} / {formatCurrencyDisplay(item.budgetLimit)}
                                    </span>
                                </div>

                                <div className="w-full h-2 rounded-full bg-[var(--fc-surface-3)] overflow-hidden">
                                    <div
                                        className={`h-full transition-all duration-500 ${barColor}`}
                                        style={{ width: `${Math.min(100, item.percentage)}%` }}
                                    />
                                </div>

                                <div className="flex justify-between items-center text-[10px] text-[var(--fc-text-muted)]">
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
