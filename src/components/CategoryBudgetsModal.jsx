// src/components/CategoryBudgetsModal.jsx
import React, { useState } from 'react';
import GenericModal from './GenericModal';
import { formatCurrencyForInput, parseCurrencyInput } from '../utils/currency';

const DEFAULT_CATEGORIES = ['Alimentação', 'Transporte', 'Lazer', 'Moradia', 'Saúde', 'Educação', 'Outros'];

/**
 * Modal para Configurar Metas de Orçamento por Categoria.
 */
export default function CategoryBudgetsModal({
    isOpen,
    onClose,
    currentBudgets = {},
    onSaveBudgets
}) {
    const [budgetMap, setBudgetMap] = useState(() => {
        const initial = { ...currentBudgets };
        DEFAULT_CATEGORIES.forEach(cat => {
            if (initial[cat] === undefined) {
                initial[cat] = '';
            }
        });
        return initial;
    });

    const [isSaving, setIsSaving] = useState(false);

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
                if (parsed > 0) {
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
                <p className="text-xs text-gray-400">
                    Defina um teto mensal de gastos para cada categoria. Deixe em branco caso não queira estipular meta.
                </p>

                <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                    {Object.keys(budgetMap).map(cat => (
                        <div key={cat} className="flex items-center justify-between gap-4 p-2.5 rounded-2xl bg-carbon-800 border border-carbon-700">
                            <label className="text-xs font-bold text-gold-cream truncate max-w-[150px]">{cat}</label>
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-400 font-semibold">R$</span>
                                <input
                                    type="text"
                                    value={formatCurrencyForInput(budgetMap[cat])}
                                    onChange={(e) => handleChange(cat, e.target.value)}
                                    placeholder="Sem meta"
                                    className="w-28 p-2 bg-carbon-900 border border-carbon-700 rounded-xl text-gold text-xs font-bold focus:outline-none focus:border-gold text-right"
                                />
                            </div>
                        </div>
                    ))}
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-carbon-800">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-xs font-semibold text-gray-400 hover:text-white rounded-xl bg-carbon-800 transition cursor-pointer"
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
