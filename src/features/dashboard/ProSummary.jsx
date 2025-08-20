// src/features/dashboard/ProSummary.jsx

import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { formatCurrencyDisplay } from '../../utils/currency';
import UpgradePrompt from '../../components/UpgradePrompt';

function ProSummary({ selectedMonth, totalExpenses, incomes }) {
    const { isPro, isTrialActive } = useAppContext();
    const [monthlyIncome, setMonthlyIncome] = useState(0);

    const hasProAccess = isPro || isTrialActive;

    useEffect(() => {
        if (!hasProAccess || !incomes || !selectedMonth) {
            setMonthlyIncome(0);
            return;
        }

        const [year, month] = selectedMonth.split('-').map(Number);

        const monthlyFilteredIncomes = incomes.filter(income => {
            const incomeDate = income.date;
            return incomeDate && incomeDate.getFullYear() === year && incomeDate.getMonth() === month - 1;
        });
        
        // ✅ CORREÇÃO: Adicionado (doc.value || 0) para evitar erros de cálculo com valores indefinidos.
        const total = monthlyFilteredIncomes.reduce((acc, doc) => acc + (doc.value || 0), 0);
        setMonthlyIncome(total);

    }, [incomes, selectedMonth, hasProAccess]);

    const finalBalance = monthlyIncome - totalExpenses;
    const balanceColorClass = finalBalance >= 0 ? 'text-green-500 dark:text-green-400' : 'text-red-500 dark:text-red-400';

    return (
        <div className="relative bg-gray-900/50 border border-gray-800 rounded-lg p-6">
            <div className={!hasProAccess ? 'blur-sm pointer-events-none' : ''}>
                <div className="grid grid-cols-2 gap-4">
                    <div >
                        <h3 className="text-sm font-medium text-green-400">Total Receitas (Mês)</h3>
                        <p className="text-2xl font-bold text-white mt-1">{formatCurrencyDisplay(monthlyIncome)}</p>
                    </div>
                    <div>
                        <h3 className="text-sm font-medium text-gray-400">Balanço Final (Receitas - Fatura)</h3>
                        <p className={`text-2xl font-bold mt-1 ${balanceColorClass}`}>{formatCurrencyDisplay(finalBalance)}</p>
                    </div>
                </div>
            </div>
            
            {!hasProAccess && (
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="scale-75">
                         <UpgradePrompt />
                    </div>
                </div>
            )}
        </div>
    );
}

export default ProSummary;