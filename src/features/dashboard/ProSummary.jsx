// src/features/dashboard/ProSummary.jsx

import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { formatCurrencyDisplay } from '../../utils/currency';
import UpgradePrompt from '../../components/UpgradePrompt';

function ProSummary({ selectedMonth, totalExpenses, incomes }) {
    const { isPro, isTrialActive, currentUser, showToast, activateFreeTrial } = useAppContext();
    const [monthlyIncome, setMonthlyIncome] = useState(0);
    const [isLoading, setIsLoading] = useState(false);

    const hasProAccess = isPro || isTrialActive;

    const handleActivateTrial = async () => {
        if (typeof window !== 'undefined' && (window.__FINCONTROL_E2E_USER__ || sessionStorage.getItem('fincontrol_e2e_user'))) {
            showToast('Teste Pro ativado com sucesso! Aproveite 30 dias de acesso aos recursos Pro.', 'success');
            return;
        }
        if (typeof activateFreeTrial === 'function') {
            await activateFreeTrial();
        }
    };

    useEffect(() => {
        if (!hasProAccess || !incomes || !selectedMonth) {
            setMonthlyIncome(0);
            return;
        }

        const [year, month] = selectedMonth.split('-').map(Number);
        const monthlyFilteredIncomes = incomes.filter(income => {
            if (!income || !income.date) return false;
            const incomeDate = income.date instanceof Date 
                ? income.date 
                : (typeof income.date?.toDate === 'function' ? income.date.toDate() : new Date(income.date));
            if (isNaN(incomeDate.getTime())) return false;
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
            const { httpsCallable } = await import('firebase/functions');
            const { getAppFunctions } = await import('../../utils/firebase');
            const functions = await getAppFunctions();
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
    const balanceColorClass = finalBalance >= 0 ? 'text-[var(--fc-success)]' : 'text-[var(--fc-danger)]';

    return (
        <div className="relative bg-[var(--fc-surface-1)] border border-[var(--fc-border-default)] rounded-3xl p-6 sm:p-8 shadow-[var(--fc-shadow-md)] overflow-hidden">
            <div className={!hasProAccess ? 'blur-sm pointer-events-none transition-all' : 'transition-all'}>
                <div className="space-y-4">
                    
                    {/* Bloco de Receitas (Em cima) */}
                    <div className="flex items-center justify-between p-5 bg-[var(--fc-surface-2)] border border-[var(--fc-border-subtle)] rounded-2xl">
                        <div className="space-y-1">
                            <span className="text-xs font-bold uppercase tracking-wider text-[var(--fc-success)] block">Total Receitas (Mês)</span>
                            <p className="text-2xl sm:text-3xl font-black font-mono text-[var(--fc-text-primary)] tracking-tight">
                                {formatCurrencyDisplay(monthlyIncome)}
                            </p>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-[var(--fc-success-soft)] text-[var(--fc-success)] border border-[var(--fc-success)]/20 flex items-center justify-center font-bold text-lg shadow-inner flex-shrink-0">
                            📈
                        </div>
                    </div>

                    {/* Bloco de Balanço Final (Embaixo) */}
                    <div className="flex items-center justify-between p-5 bg-[var(--fc-surface-2)] border border-[var(--fc-border-subtle)] rounded-2xl">
                        <div className="space-y-1">
                            <span className="text-xs font-bold uppercase tracking-wider text-[var(--fc-text-secondary)] block">Balanço Final (Receitas - Fatura)</span>
                            <p className={`text-2xl sm:text-3xl font-black font-mono tracking-tight ${balanceColorClass}`}>
                                {formatCurrencyDisplay(finalBalance)}
                            </p>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-[var(--fc-accent-soft)] text-[var(--fc-accent)] border border-[var(--fc-accent)]/20 flex items-center justify-center font-bold text-lg shadow-inner flex-shrink-0">
                            ⚖️
                        </div>
                    </div>

                </div>
            </div>
            
            {!hasProAccess && (
                <div className="absolute inset-0 flex items-center justify-center bg-[var(--fc-bg)]/80 backdrop-blur-md rounded-3xl p-4 z-20 overflow-y-auto">
                    <div className="max-w-md w-full my-auto">
                        <UpgradePrompt 
                            onUpgradeClick={handleUpgrade} 
                            onActivateTrial={handleActivateTrial}
                            isLoading={isLoading} 
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

export default ProSummary;