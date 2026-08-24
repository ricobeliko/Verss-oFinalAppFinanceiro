// src/features/dashboard/ProSummary.jsx

import React, { useState, useEffect } from 'react';
import { httpsCallable } from 'firebase/functions';
import { useAppContext } from '../../context/AppContext';
import { formatCurrencyDisplay } from '../../utils/currency';
import UpgradePrompt from '../../components/UpgradePrompt';
import { functions } from '../../utils/firebase';

function ProSummary({ selectedMonth, totalExpenses, incomes }) {
    const { isPro, isTrialActive, currentUser, showToast } = useAppContext();
    const [monthlyIncome, setMonthlyIncome] = useState(0);
    const [isLoading, setIsLoading] = useState(false);

    const hasProAccess = isPro || isTrialActive;

    useEffect(() => {
        if (!hasProAccess || !incomes || !selectedMonth) {
            setMonthlyIncome(0);
            return;
        }

        const [year, month] = selectedMonth.split('-').map(Number);
        const monthlyFilteredIncomes = incomes.filter(income => {
            const incomeDate = income.date;
            if (!incomeDate) return false;
            const incYear = typeof incomeDate.getUTCFullYear === 'function' ? incomeDate.getUTCFullYear() : incomeDate.getFullYear();
            const incMonth = (typeof incomeDate.getUTCMonth === 'function' ? incomeDate.getUTCMonth() : incomeDate.getMonth()) + 1;
            return incYear === year && incMonth === month;
        });
        
        const total = monthlyFilteredIncomes.reduce((acc, doc) => acc + (doc.value || 0), 0);
        setMonthlyIncome(total);

    }, [incomes, selectedMonth, hasProAccess]);
    
    const handleUpgrade = async () => {
        if (!currentUser) {
            showToast("Você precisa estar logado para fazer o upgrade.", "error");
            return;
        }
        setIsLoading(true);
        try {
            const createMercadoPagoPreference = httpsCallable(functions, 'createMercadoPagoPreference');
            const result = await createMercadoPagoPreference();
            
            const checkoutUrl = result.data.init_point; 
            if (checkoutUrl) {
                window.location.href = checkoutUrl;
            } else {
                throw new Error("Link de pagamento não recebido do servidor.");
            }
        } catch (error) {
            console.error("Erro ao obter link de pagamento:", error);
            showToast('Não foi possível iniciar o pagamento. Tente novamente mais tarde.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const finalBalance = monthlyIncome - totalExpenses;
    const balanceColorClass = finalBalance >= 0 ? 'text-emerald-400' : 'text-rose-400';

    return (
        <div className="relative bg-carbon-900 border border-carbon-800 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden">
            <div className={!hasProAccess ? 'blur-sm pointer-events-none transition-all' : 'transition-all'}>
                <div className="space-y-4">
                    
                    {/* Bloco de Receitas (Em cima) */}
                    <div className="flex items-center justify-between p-5 bg-carbon-800/40 border border-carbon-700/50 rounded-2xl">
                        <div className="space-y-1">
                            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 block">Total Receitas (Mês)</span>
                            <p className="text-2xl sm:text-3xl font-black font-mono text-gold-cream tracking-tight">
                                {formatCurrencyDisplay(monthlyIncome)}
                            </p>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center font-bold text-lg shadow-inner flex-shrink-0">
                            📈
                        </div>
                    </div>

                    {/* Bloco de Balanço Final (Embaixo) */}
                    <div className="flex items-center justify-between p-5 bg-carbon-800/40 border border-carbon-700/50 rounded-2xl">
                        <div className="space-y-1">
                            <span className="text-xs font-bold uppercase tracking-wider text-gray-400 block">Balanço Final (Receitas - Fatura)</span>
                            <p className={`text-2xl sm:text-3xl font-black font-mono tracking-tight ${balanceColorClass}`}>
                                {formatCurrencyDisplay(finalBalance)}
                            </p>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-gold/10 text-gold border border-gold/20 flex items-center justify-center font-bold text-lg shadow-inner flex-shrink-0">
                            ⚖️
                        </div>
                    </div>

                </div>
            </div>
            
            {!hasProAccess && (
                <div className="absolute inset-0 flex items-center justify-center bg-carbon-900/80 backdrop-blur-md rounded-3xl p-4 z-20">
                    <div className="max-w-sm w-full">
                        <UpgradePrompt onUpgradeClick={handleUpgrade} isLoading={isLoading} />
                    </div>
                </div>
            )}
        </div>
    );
}

export default ProSummary;