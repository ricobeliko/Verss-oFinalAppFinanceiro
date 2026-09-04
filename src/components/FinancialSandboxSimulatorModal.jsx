// src/components/FinancialSandboxSimulatorModal.jsx
import React, { useState, useMemo } from 'react';
import GenericModal from './GenericModal';
import { formatCurrencyDisplay, parseCurrencyInput, handleCurrencyInputChange } from '../utils/currency';
import { calculateInstallments, calculateFutureCommitments } from '../services/financialService';

/**
 * Modal de Simulação Financeira Sandbox ("E se...?").
 * Executa cenários hipotéticos 100% no cliente sem persistir ou mutar dados no Firestore.
 */
export default function FinancialSandboxSimulatorModal({
    isOpen,
    onClose,
    loans = [],
    subscriptions = [],
    selectedMonth
}) {
    const [scenario, setScenario] = useState('new_purchase'); // 'new_purchase' | 'cancel_sub' | 'simulated_income'

    // Cenário 1: Nova Compra Parcelada
    const [simPurchaseValue, setSimPurchaseValue] = useState('1.200,00');
    const [simInstallmentsCount, setSimInstallmentsCount] = useState('12');
    const simPurchaseDesc = 'Nova Compra Hipotética';

    // Cenário 2: Cancelar Assinatura
    const [selectedSubToCancel, setSelectedSubToCancel] = useState('');

    // Cenário 3: Renda Simulada
    const [simIncomeValue, setSimIncomeValue] = useState('8.000,00');

    const startMonth = selectedMonth || new Date().toISOString().slice(0, 7);

    // 1. Projeção Base Real (Sem simulação)
    const baseProjection = useMemo(() => {
        return calculateFutureCommitments({
            loans,
            subscriptions,
            startMonth,
            monthsCount: 6
        });
    }, [loans, subscriptions, startMonth]);

    // 2. Projeção Simulada (Com clone em memória)
    const simulatedProjection = useMemo(() => {
        if (scenario === 'new_purchase') {
            const val = parseCurrencyInput(simPurchaseValue);
            const count = parseInt(simInstallmentsCount, 10) || 1;
            if (val <= 0 || count < 1) return baseProjection;

            const insts = calculateInstallments({
                totalValue: val,
                count,
                startDate: `${startMonth}-10`
            });

            const clonedLoans = [
                ...loans,
                {
                    id: 'simulated-loan',
                    description: simPurchaseDesc || 'Compra Simulada',
                    totalValue: val,
                    installments: insts
                }
            ];

            return calculateFutureCommitments({
                loans: clonedLoans,
                subscriptions,
                startMonth,
                monthsCount: 6
            });
        }

        if (scenario === 'cancel_sub') {
            if (!selectedSubToCancel) return baseProjection;

            const filteredSubs = subscriptions.filter(s => s.id !== selectedSubToCancel);
            return calculateFutureCommitments({
                loans,
                subscriptions: filteredSubs,
                startMonth,
                monthsCount: 6
            });
        }

        return baseProjection;
    }, [scenario, simPurchaseValue, simInstallmentsCount, simPurchaseDesc, selectedSubToCancel, loans, subscriptions, startMonth, baseProjection]);

    // Cálculo de Economia Anual para Cancelamento de Assinatura
    const subCancelationSavings = useMemo(() => {
        if (scenario !== 'cancel_sub' || !selectedSubToCancel) return 0;
        const sub = subscriptions.find(s => s.id === selectedSubToCancel);
        if (!sub) return 0;
        const monthlyVal = Number(sub.amount !== undefined ? sub.amount : (sub.value || 0));
        return monthlyVal * 12;
    }, [scenario, selectedSubToCancel, subscriptions]);

    return (
        <GenericModal
            isOpen={isOpen}
            onClose={onClose}
            title="Simulador Financeiro — Cenários 'E se...?'"
            maxWidth="max-w-2xl"
        >
            <div className="space-y-6">
                {/* Aviso de Segurança de Dados */}
                <div className="p-3 rounded-2xl bg-gold/10 border border-gold/30 text-xs text-gold flex items-center justify-between">
                    <span className="flex items-center gap-2">
                        <span>🧪</span>
                        <strong>Simulação Temporária:</strong> Nenhum dado real é alterado ou gravado no seu banco.
                    </span>
                    <span className="text-[10px] uppercase font-bold tracking-wider bg-gold text-carbon-900 px-2 py-0.5 rounded-full">
                        Sandbox
                    </span>
                </div>

                {/* Seleção de Cenários */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-1 bg-carbon-800 rounded-2xl border border-carbon-700">
                    <button
                        type="button"
                        onClick={() => setScenario('new_purchase')}
                        className={`py-2 px-3 text-xs font-bold rounded-xl transition cursor-pointer ${
                            scenario === 'new_purchase'
                                ? 'bg-gold text-carbon-900 shadow-md'
                                : 'text-gray-400 hover:text-gold-cream'
                        }`}
                    >
                        🛍️ Nova Compra
                    </button>
                    <button
                        type="button"
                        onClick={() => setScenario('cancel_sub')}
                        className={`py-2 px-3 text-xs font-bold rounded-xl transition cursor-pointer ${
                            scenario === 'cancel_sub'
                                ? 'bg-gold text-carbon-900 shadow-md'
                                : 'text-gray-400 hover:text-gold-cream'
                        }`}
                    >
                        ✂️ Cancelar Assinatura
                    </button>
                    <button
                        type="button"
                        onClick={() => setScenario('simulated_income')}
                        className={`py-2 px-3 text-xs font-bold rounded-xl transition cursor-pointer ${
                            scenario === 'simulated_income'
                                ? 'bg-gold text-carbon-900 shadow-md'
                                : 'text-gray-400 hover:text-gold-cream'
                        }`}
                    >
                        💼 Renda Simulada
                    </button>
                </div>

                {/* Formulário do Cenário 1 */}
                {scenario === 'new_purchase' && (
                    <div className="p-4 rounded-2xl bg-carbon-800/60 border border-carbon-700 space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-300 mb-1" htmlFor="simPurchaseVal">
                                    Valor Total da Compra (R$)
                                </label>
                                <input
                                    id="simPurchaseVal"
                                    type="text"
                                    value={simPurchaseValue}
                                    onChange={handleCurrencyInputChange(setSimPurchaseValue)}
                                    className="w-full p-2.5 bg-carbon-900 border border-carbon-700 rounded-xl text-gold text-sm font-bold focus:outline-none focus:border-gold"
                                    placeholder="1.200,00"
                                    inputMode="decimal"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-300 mb-1" htmlFor="simCount">
                                    Quantidade de Parcelas
                                </label>
                                <select
                                    id="simCount"
                                    value={simInstallmentsCount}
                                    onChange={(e) => setSimInstallmentsCount(e.target.value)}
                                    className="w-full p-2.5 bg-carbon-900 border border-carbon-700 rounded-xl text-gold-cream text-sm focus:outline-none focus:border-gold"
                                >
                                    {[1, 2, 3, 4, 5, 6, 8, 10, 12, 18, 24].map(n => (
                                        <option key={n} value={n}>{n}x de {formatCurrencyDisplay(parseCurrencyInput(simPurchaseValue) / n)}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Comparativo de Impacto Mês a Mês */}
                        <div className="space-y-2 pt-2 border-t border-carbon-700">
                            <p className="text-xs font-bold text-gray-300">Impacto Projetado nos Próximos Meses:</p>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {simulatedProjection.slice(0, 3).map((item, idx) => {
                                    const baseVal = baseProjection[idx]?.totalCommitted || 0;
                                    const simVal = item.totalCommitted;
                                    const diff = simVal - baseVal;

                                    return (
                                        <div key={item.month} className="p-2.5 rounded-xl bg-carbon-900/80 border border-carbon-700 text-center">
                                            <p className="text-[10px] text-gray-400 font-bold">{item.label}</p>
                                            <p className="text-xs font-bold text-gold-cream mt-0.5">{formatCurrencyDisplay(simVal)}</p>
                                            {diff > 0 && (
                                                <p className="text-[10px] text-rose-400 mt-0.5 font-semibold">+{formatCurrencyDisplay(diff)}/mês</p>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {/* Formulário do Cenário 2 */}
                {scenario === 'cancel_sub' && (
                    <div className="p-4 rounded-2xl bg-carbon-800/60 border border-carbon-700 space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-300 mb-1" htmlFor="subSelect">
                                Selecione a Assinatura a Cancelar:
                            </label>
                            <select
                                id="subSelect"
                                value={selectedSubToCancel}
                                onChange={(e) => setSelectedSubToCancel(e.target.value)}
                                className="w-full p-2.5 bg-carbon-900 border border-carbon-700 rounded-xl text-gold-cream text-sm focus:outline-none focus:border-gold"
                            >
                                <option value="">Selecione uma assinatura cadastrada...</option>
                                {subscriptions.map(s => (
                                    <option key={s.id} value={s.id}>
                                        {s.name} — {formatCurrencyDisplay(s.amount !== undefined ? s.amount : s.value)}/mês
                                    </option>
                                ))}
                            </select>
                        </div>

                        {subCancelationSavings > 0 && (
                            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-1">
                                <p className="text-xs text-emerald-300 font-semibold">Economia Projetada em 12 Meses:</p>
                                <p className="text-xl font-extrabold text-emerald-400">{formatCurrencyDisplay(subCancelationSavings)}</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Formulário do Cenário 3 */}
                {scenario === 'simulated_income' && (
                    <div className="p-4 rounded-2xl bg-carbon-800/60 border border-carbon-700 space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-300 mb-1" htmlFor="simIncome">
                                Renda Mensal Líquida Hipotética (R$)
                            </label>
                            <input
                                id="simIncome"
                                type="text"
                                value={simIncomeValue}
                                onChange={handleCurrencyInputChange(setSimIncomeValue)}
                                className="w-full p-2.5 bg-carbon-900 border border-carbon-700 rounded-xl text-gold text-sm font-bold focus:outline-none focus:border-gold"
                                placeholder="8.000,00"
                                inputMode="decimal"
                            />
                        </div>

                        {(() => {
                            const incomeVal = parseCurrencyInput(simIncomeValue);
                            const currentOutflow = baseProjection[0]?.totalCommitted || 0;
                            const commitmentPercent = incomeVal > 0 ? Math.round((currentOutflow / incomeVal) * 100) : 0;

                            return (
                                <div className="p-4 rounded-2xl bg-carbon-900/80 border border-carbon-700 space-y-3">
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-gray-400">Comprometimento com Faturas ({startMonth}):</span>
                                        <span className="font-bold text-gold-cream">{commitmentPercent}% da Renda</span>
                                    </div>
                                    <div className="w-full h-3 rounded-full bg-carbon-800 overflow-hidden border border-carbon-700">
                                        <div
                                            className={`h-full transition-all duration-300 ${
                                                commitmentPercent > 70 ? 'bg-rose-500' : commitmentPercent > 40 ? 'bg-amber-500' : 'bg-emerald-500'
                                            }`}
                                            style={{ width: `${Math.min(100, commitmentPercent)}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                )}
            </div>
        </GenericModal>
    );
}
