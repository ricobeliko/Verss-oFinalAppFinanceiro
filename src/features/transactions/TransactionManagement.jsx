import React, { useState, useMemo, lazy, Suspense } from 'react';
import LoanManagement from '../loans/LoanManagement';
import IncomeManagement from '../income/IncomeManagement';
import ExpenseManagement from '../expenses/ExpenseManagement';
import { useAppContext } from '../../context/AppContext';
import { useCards } from '../../hooks/useCards';
import { useClients } from '../../hooks/useClients';
import { useLoans } from '../../hooks/useLoans';
import ProFeatureLock from '../../components/ProFeatureLock';
import GenericModal from '../../components/GenericModal';
import UpgradePrompt from '../../components/UpgradePrompt';

const PdfImportModal = lazy(() => import('../../components/PdfImportModal'));

function UnifiedTransactionManagement() {
    const [transactionType, setTransactionType] = useState('loan');
    const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
    const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
    
    const { isPro, isTrialActive, db, userId, getUserCollectionPathSegments, showToast, handleUpgradeClick, activateFreeTrial } = useAppContext();
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

            {/* Header Harmonizado */}
            <div className="bg-[var(--fc-surface-1)] border border-[var(--fc-border-default)] p-6 sm:p-8 rounded-3xl shadow-xl backdrop-blur-md space-y-6">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--fc-text-primary)]">Adicionar Movimentações</h1>
                    <p className="text-sm text-[var(--fc-text-secondary)] mt-1">Registre suas compras no cartão, receitas e despesas avulsas com precisão.</p>
                </div>
                
                {/* Seletor de Abas Harmonizado */}
                <div role="group" aria-label="Tipos de movimentação" className="flex justify-center p-1.5 bg-[var(--fc-surface-2)] border border-[var(--fc-border-subtle)] rounded-2xl max-w-md mx-auto">
                    <button 
                        type="button"
                        aria-pressed={transactionType === 'loan'}
                        onClick={() => setTransactionType('loan')}
                        className={`w-1/3 py-2.5 text-xs font-black tracking-wider uppercase rounded-xl transition-all cursor-pointer ${transactionType === 'loan' ? 'bg-[var(--fc-accent)] text-[var(--fc-accent-contrast)] shadow-md' : 'text-[var(--fc-text-secondary)] hover:text-[var(--fc-text-primary)]'} focus:outline-none focus:ring-2 focus:ring-[var(--fc-accent)]/50`}
                    >
                        Compras
                    </button>
                    <button 
                        type="button"
                        aria-pressed={transactionType === 'income'}
                        onClick={() => setTransactionType('income')}
                        className={`w-1/3 py-2.5 text-xs font-black tracking-wider uppercase rounded-xl transition-all cursor-pointer ${transactionType === 'income' ? 'bg-[var(--fc-accent)] text-[var(--fc-accent-contrast)] shadow-md' : 'text-[var(--fc-text-secondary)] hover:text-[var(--fc-text-primary)]'} focus:outline-none focus:ring-2 focus:ring-[var(--fc-accent)]/50`}
                    >
                        Receitas
                    </button>
                    <button 
                        type="button"
                        aria-pressed={transactionType === 'expense'}
                        onClick={() => setTransactionType('expense')}
                        className={`w-1/3 py-2.5 text-xs font-black tracking-wider uppercase rounded-xl transition-all cursor-pointer ${transactionType === 'expense' ? 'bg-[var(--fc-accent)] text-[var(--fc-accent-contrast)] shadow-md' : 'text-[var(--fc-text-secondary)] hover:text-[var(--fc-text-primary)]'} focus:outline-none focus:ring-2 focus:ring-[var(--fc-accent)]/50`}
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
                        <ProFeatureLock 
                            title="Gerenciamento de Receitas"
                            description="O gerenciamento e registro de receitas faz parte dos recursos do plano Pro."
                            onAction={() => setIsUpgradeModalOpen(true)}
                        />
                    )
                )}
                
                {transactionType === 'expense' && (
                    hasProAccess ? ExpenseFormComponent : (
                        <ProFeatureLock 
                            title="Despesas Avulsas"
                            description="O gerenciamento e registro de despesas avulsas faz parte dos recursos do plano Pro."
                            onAction={() => setIsUpgradeModalOpen(true)}
                        />
                    )
                )}
            </div>

            {/* Modal de Upgrade Pro */}
            <GenericModal
                isOpen={isUpgradeModalOpen}
                onClose={() => setIsUpgradeModalOpen(false)}
                maxWidth="max-w-lg"
            >
                <UpgradePrompt 
                    onUpgradeClick={handleUpgradeClick}
                    onActivateTrial={activateFreeTrial}
                />
            </GenericModal>
        </div>
    );
}

export default UnifiedTransactionManagement;