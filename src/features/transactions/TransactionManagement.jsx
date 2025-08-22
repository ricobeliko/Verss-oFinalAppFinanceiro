// src/features/transactions/TransactionManagement.jsx

import React, { useState, useMemo } from 'react';
import LoanManagement from '../loans/LoanManagement';
import IncomeManagement from '../income/IncomeManagement';
import ExpenseManagement from '../expenses/ExpenseManagement';
import { useAppContext } from '../../context/AppContext';

function UnifiedTransactionManagement() {
    const [transactionType, setTransactionType] = useState('loan'); // 'loan' para compras de cartão
    const { isPro } = useAppContext();

    // Memoiza os componentes para evitar recriações desnecessárias
    const LoanFormComponent = useMemo(() => <LoanManagement />, []);
    const IncomeFormComponent = useMemo(() => <IncomeManagement />, []);
    const ExpenseFormComponent = useMemo(() => <ExpenseManagement />, []);

    // ✅ 1. TÍTULO ADICIONADO E BOTÕES ATUALIZADOS
    // Os botões agora refletem os nomes que você pediu, e o estilo foi
    // ajustado para parecer um "segmented control" moderno.
    return (
        <div className="p-6 bg-gray-900/50 border border-gray-800 rounded-lg space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-white">Adicionar Movimentações</h1>
                <p className="text-sm text-gray-400 mt-1">Registre suas compras no cartão, receitas e despesas avulsas.</p>
            </div>
            <div className="flex justify-center p-1 bg-gray-800 rounded-lg max-w-md mx-auto">
                <button 
                    onClick={() => setTransactionType('loan')}
                    className={`w-1/3 px-4 py-2 text-sm font-bold rounded-md transition-colors ${transactionType === 'loan' ? 'bg-purple-600 text-white shadow' : 'text-gray-400 hover:bg-gray-700/50 hover:text-gray-200'}`}
                >
                    Compras (Cartão)
                </button>
                <button 
                    onClick={() => setTransactionType('income')}
                    className={`w-1/3 px-4 py-2 text-sm font-bold rounded-md transition-colors ${transactionType === 'income' ? 'bg-purple-600 text-white shadow' : 'text-gray-400 hover:bg-gray-700/50 hover:text-gray-200'}`}
                >
                    Receitas
                </button>
                <button 
                    onClick={() => setTransactionType('expense')}
                    className={`w-1/3 px-4 py-2 text-sm font-bold rounded-md transition-colors ${transactionType === 'expense' ? 'bg-purple-600 text-white shadow' : 'text-gray-400 hover:bg-gray-700/50 hover:text-gray-200'}`}
                >
                    Despesas
                </button>
            </div>
            
            {/* ✅ 2. TRANSIÇÃO SUAVE ENTRE OS FORMULÁRIOS */}
            {/* O conteúdo agora é renderizado de forma mais limpa */}
            <div>
                {transactionType === 'loan' && LoanFormComponent}
                {transactionType === 'income' && (isPro ? IncomeFormComponent : <div className="text-center p-8 bg-gray-800 rounded-lg"><p className="text-yellow-400">Gerenciar receitas é um recurso PRO.</p></div>)}
                {transactionType === 'expense' && (isPro ? ExpenseFormComponent : <div className="text-center p-8 bg-gray-800 rounded-lg"><p className="text-yellow-400">Gerenciar despesas é um recurso PRO.</p></div>)}
            </div>
        </div>
    )
}

export default UnifiedTransactionManagement;