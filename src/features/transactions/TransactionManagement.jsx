import React, { useState, useMemo, lazy, Suspense } from 'react';
import LoanManagement from '../loans/LoanManagement';
import IncomeManagement from '../income/IncomeManagement';
import ExpenseManagement from '../expenses/ExpenseManagement';
import { useAppContext } from '../../context/AppContext';
import { useCards } from '../../hooks/useCards';
import { useClients } from '../../hooks/useClients';
import { useLoans } from '../../hooks/useLoans';

const PdfImportModal = lazy(() => import('../../components/PdfImportModal'));

function UnifiedTransactionManagement() {
    const [transactionType, setTransactionType] = useState('loan');
    const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
    
    const { isPro, isTrialActive, db, userId, getUserCollectionPathSegments, showToast } = useAppContext();
    const hasProAccess = isPro || isTrialActive;

    const { cards } = useCards();
    const { clients } = useClients();
    const { loans: existingLoans } = useLoans();

    const IncomeFormComponent = useMemo(() => <IncomeManagement />, []);
    const ExpenseFormComponent = useMemo(() => <ExpenseManagement />, []);

    return (
        <div className="space-y-8 animate-fadeIn">
            {/* Modal de Importação de Fatura PDF (Carregamento Sob Demanda) */}
            {isPdfModalOpen && (
                <Suspense fallback={null}>
                    <PdfImportModal 
                        isOpen={isPdfModalOpen}
                        onClose={() => setIsPdfModalOpen(false)}
                        cards={cards}
                        clients={clients}
                        existingLoans={existingLoans}
                        db={db}
                        userId={userId}
                        getUserCollectionPathSegments={getUserCollectionPathSegments}
                        showToast={showToast}
                        onSaveSuccess={() => {}}
                    />
                </Suspense>
            )}

            {/* Header Carbono & Dourado */}
            <div className="bg-carbon-900 border border-carbon-800 p-6 sm:p-8 rounded-3xl shadow-2xl space-y-6">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gold-cream">Adicionar Movimentações</h1>
                    <p className="text-sm text-gray-400 mt-1">Registre suas compras no cartão, receitas e despesas avulsas com precisão.</p>
                </div>
                
                {/* Seletor de Abas Black Card */}
                <div className="flex justify-center p-1.5 bg-carbon-800 border border-carbon-700 rounded-2xl max-w-md mx-auto">
                    <button 
                        onClick={() => setTransactionType('loan')}
                        className={`w-1/3 py-2.5 text-xs font-black tracking-wider uppercase rounded-xl transition-all cursor-pointer ${transactionType === 'loan' ? 'bg-gradient-to-r from-gold-light to-gold text-carbon-900 shadow-lg shadow-gold/20' : 'text-gray-400 hover:text-white'}`}
                    >
                        Compras
                    </button>
                    <button 
                        onClick={() => setTransactionType('income')}
                        className={`w-1/3 py-2.5 text-xs font-black tracking-wider uppercase rounded-xl transition-all cursor-pointer ${transactionType === 'income' ? 'bg-gradient-to-r from-gold-light to-gold text-carbon-900 shadow-lg shadow-gold/20' : 'text-gray-400 hover:text-white'}`}
                    >
                        Receitas
                    </button>
                    <button 
                        onClick={() => setTransactionType('expense')}
                        className={`w-1/3 py-2.5 text-xs font-black tracking-wider uppercase rounded-xl transition-all cursor-pointer ${transactionType === 'expense' ? 'bg-gradient-to-r from-gold-light to-gold text-carbon-900 shadow-lg shadow-gold/20' : 'text-gray-400 hover:text-white'}`}
                    >
                        Despesas
                    </button>
                </div>
            </div>
            
            <div>
                {/* LoanManagement recebendo a função para abrir o modal de PDF no card de compras */}
                {transactionType === 'loan' && (
                    <LoanManagement onOpenPdfModal={() => setIsPdfModalOpen(true)} />
                )}
                
                {transactionType === 'income' && (
                    hasProAccess ? IncomeFormComponent : (
                        <div className="text-center p-10 bg-carbon-900 border border-gold/30 rounded-3xl shadow-2xl space-y-3">
                            <span className="text-2xl">🔒</span>
                            <h3 className="text-lg font-bold text-gold-cream">Recurso Exclusivo Black Pro</h3>
                            <p className="text-sm text-gray-400">Gerenciar e registrar receitas é uma ferramenta exclusiva para membros PRO ou VIP.</p>
                        </div>
                    )
                )}
                
                {transactionType === 'expense' && (
                    hasProAccess ? ExpenseFormComponent : (
                        <div className="text-center p-10 bg-carbon-900 border border-gold/30 rounded-3xl shadow-2xl space-y-3">
                            <span className="text-2xl">🔒</span>
                            <h3 className="text-lg font-bold text-gold-cream">Recurso Exclusivo Black Pro</h3>
                            <p className="text-sm text-gray-400">Gerenciar e registrar despesas é uma ferramenta exclusiva para membros PRO ou VIP.</p>
                        </div>
                    )
                )}
            </div>
        </div>
    );
}

export default UnifiedTransactionManagement;