// src/features/transactions/TransactionManagement.jsx

import React, { useState, useMemo, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import LoanManagement from '../loans/LoanManagement';
import IncomeManagement from '../income/IncomeManagement';
import ExpenseManagement from '../expenses/ExpenseManagement';
import PdfImportModal from '../../components/PdfImportModal';
import { useAppContext } from '../../context/AppContext';

function UnifiedTransactionManagement() {
    const [transactionType, setTransactionType] = useState('loan');
    const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
    
    const { isPro, isTrialActive, db, userId, isAuthReady, getUserCollectionPathSegments, showToast } = useAppContext();
    const hasProAccess = isPro || isTrialActive;

    const [cards, setCards] = useState([]);
    const [clients, setClients] = useState([]);
    const [existingLoans, setExistingLoans] = useState([]);

    useEffect(() => {
        if (!isAuthReady || !userId || !db) return;
        const userCollectionPath = getUserCollectionPathSegments();
        const basePath = [...userCollectionPath, userId];

        const unsubCards = onSnapshot(collection(db, ...basePath, 'cards'), (snap) => {
            setCards(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        const unsubClients = onSnapshot(collection(db, ...basePath, 'clients'), (snap) => {
            setClients(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        const unsubLoans = onSnapshot(collection(db, ...basePath, 'loans'), (snap) => {
            setExistingLoans(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        return () => {
            unsubCards();
            unsubClients();
            unsubLoans();
        };
    }, [db, userId, isAuthReady, getUserCollectionPathSegments]);

    const IncomeFormComponent = useMemo(() => <IncomeManagement />, []);
    const ExpenseFormComponent = useMemo(() => <ExpenseManagement />, []);

    return (
        <div className="space-y-8 animate-fadeIn">
            {/* Modal de Importação de Fatura PDF */}
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