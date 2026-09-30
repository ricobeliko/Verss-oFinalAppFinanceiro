// src/components/CategoryBudgetsModal.jsx
import React, { useState, useEffect } from 'react';
import GenericModal from './GenericModal';
import { formatCurrencyForInput, parseCurrencyInput, handleCurrencyInputChange } from '../utils/currency';
import { isValidFinancialValue } from '../services/financialService';

const DEFAULT_CATEGORIES = ['Alimentação', 'Transporte', 'Lazer', 'Moradia', 'Saúde', 'Educação', 'Outros'];

const buildInitialBudgetMap = (budgets = {}) => {
    const map = {};
    DEFAULT_CATEGORIES.forEach(cat => {
        const val = budgets[cat];
        map[cat] = (val !== undefined && val !== null && val !== '') ? formatCurrencyForInput(val) : '';
    });
    Object.keys(budgets).forEach(cat => {
        if (map[cat] === undefined) {
            const val = budgets[cat];
            map[cat] = (val !== undefined && val !== null && val !== '') ? formatCurrencyForInput(val) : '';
        }
    });
    return map;
};

/**
 * Modal para Configurar Metas de Orçamento por Categoria.
 */
export default function CategoryBudgetsModal({
    isOpen,
    onClose,
    currentBudgets = {},
    onSaveBudgets
}) {
    const [budgetMap, setBudgetMap] = useState(() => buildInitialBudgetMap(currentBudgets));
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setBudgetMap(buildInitialBudgetMap(currentBudgets));
        }
    }, [isOpen, currentBudgets]);

    const handleChange = (category, value) => {
        setBudgetMap(prev => ({
            ...prev,
            [category]: value
        }));
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const sanitized = {};
            Object.entries(budgetMap).forEach(([cat, val]) => {
                const parsed = parseCurrencyInput(val);
                if (isValidFinancialValue(parsed)) {
                    sanitized[cat] = parsed;
                }
            });
            await onSaveBudgets(sanitized);
            onClose();
        } catch (err) {
            console.error('Erro ao salvar orçamentos:', err);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <GenericModal
            isOpen={isOpen}
            onClose={onClose}
            title="Metas de Orçamento por Categoria"
            maxWidth="max-w-lg"
        >
            <form onSubmit={handleSave} className="space-y-5">
                <p className="text-xs text-[var(--fc-text-muted)]">
                    Defina um teto mensal de gastos para cada categoria. Deixe em branco caso não queira estipular meta.
                </p>

                <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                    {Object.keys(budgetMap).map(cat => {
                        const normalizedCat = cat.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '-');
                        const inputId = `budget-${normalizedCat}`;
                        return (
                            <div key={cat} className="flex items-center justify-between gap-4 p-2.5 rounded-2xl bg-[var(--fc-surface-2)] border border-[var(--fc-border-default)]">
                                <label htmlFor={inputId} className="text-xs font-bold text-[var(--fc-text-primary)] truncate max-w-[150px] cursor-pointer">{cat}</label>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-[var(--fc-text-muted)] font-semibold" aria-hidden="true">R$</span>
                                    <input
                                        id={inputId}
                                        type="text"
                                        value={budgetMap[cat] || ''}
                                        onChange={handleCurrencyInputChange((val) => handleChange(cat, val))}
                                        placeholder="Sem meta"
                                        aria-label={`Meta de orçamento para ${cat}`}
                                        inputMode="decimal"
                                        className="w-28 p-2 bg-[var(--fc-surface-1)] border border-[var(--fc-border-default)] rounded-xl text-[var(--fc-text-primary)] text-xs font-bold focus:outline-none focus:border-[var(--fc-accent)] text-right"
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-[var(--fc-border-subtle)]">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-xs font-semibold text-[var(--fc-text-secondary)] hover:text-[var(--fc-text-primary)] rounded-xl bg-[var(--fc-surface-2)] border border-[var(--fc-border-default)] transition cursor-pointer"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        disabled={isSaving}
                        className="px-5 py-2 text-xs font-bold text-carbon-900 bg-gradient-to-r from-gold-light to-gold rounded-xl shadow-lg hover:opacity-90 transition cursor-pointer disabled:opacity-50"
                    >
                        {isSaving ? 'Salvando...' : 'Salvar Metas'}
                    </button>
                </div>
            </form>
        </GenericModal>
    );
}
