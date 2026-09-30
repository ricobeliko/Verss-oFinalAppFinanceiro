import React, { useState, useCallback } from 'react';
import { collection, doc, updateDoc, addDoc, deleteDoc } from 'firebase/firestore';
import { useAppContext } from '../../context/AppContext';
import GenericModal from '../../components/GenericModal';
import Button from '../../components/Button';
import UpgradePrompt from '../../components/UpgradePrompt';
import CarbonCard from '../../components/CarbonCard';
import { formatCurrencyDisplay, parseCurrencyInput, handleCurrencyInputChange, formatCurrencyForInput } from '../../utils/currency';
import { calculateCardLimitIntelligence, calculateCardInvoiceDetails } from '../../services/financialService';
import { canAddCard } from '../../config/planEntitlements';
import { useCards } from '../../hooks/useCards';
import { useLoans } from '../../hooks/useLoans';
import { useSubscriptions } from '../../hooks/useSubscriptions';
import { useExpenses } from '../../hooks/useExpenses';
import { usePaidSubscriptions } from '../../hooks/usePaidSubscriptions';

// --- Ícones ---
const EditIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const DeleteIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>;
const PlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;
const CheckCircleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>;

export default function CardManagement() {
    const { userId, db, isPro, isTrialActive, showToast, getUserCollectionPathSegments, handleUpgradeClick, activateFreeTrial } = useAppContext();
    
    const { cards } = useCards();
    const { loans: allLoans } = useLoans();
    const { subscriptions: allSubscriptions } = useSubscriptions();
    const { expenses: allExpenses } = useExpenses();
    const { paidSubscriptions } = usePaidSubscriptions();
    const [filterMonth, setFilterMonth] = useState(new Date().toISOString().slice(0, 7));
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCard, setEditingCard] = useState(null);
    const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);
    const [cardToDelete, setCardToDelete] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
    const [formValues, setFormValues] = useState({
        name: '', limitInput: '', closingDay: '', dueDay: '', color: '#F2B705'
    });
    
    const calculateInvoiceDetails = useCallback((card, selectedMonth) => {
        return calculateCardInvoiceDetails({
            card,
            selectedMonth,
            loans: allLoans,
            expenses: allExpenses,
            subscriptions: allSubscriptions,
            paidSubscriptions
        });
    }, [allLoans, allExpenses, allSubscriptions, paidSubscriptions]);
    
    const handleOpenModal = (card = null) => {
        if (card) {
            setEditingCard(card);
            setFormValues({
                name: card.name || '',
                limitInput: card.limit !== undefined && card.limit !== null ? formatCurrencyForInput(card.limit) : '',
                closingDay: card.closingDay !== undefined && card.closingDay !== null ? card.closingDay.toString() : '',
                dueDay: card.dueDay !== undefined && card.dueDay !== null ? card.dueDay.toString() : '',
                color: card.color || '#F2B705'
            });
        } else {
            // Guard canônico para criação de novos cartões no Free
            const check = canAddCard({ isPro, isTrialActive, cardCount: cards.length });
            if (!check.allowed) {
                showToast(check.message, 'warning');
                setIsUpgradeModalOpen(true);
                return;
            }
            setEditingCard(null);
            setFormValues({ name: '', limitInput: '', closingDay: '', dueDay: '', color: '#F2B705' });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => { setIsModalOpen(false); setEditingCard(null); };

    const handleSaveCard = async () => {
        if (isSubmitting) return;

        // Validação canônica do limite do plano Free ao adicionar
        if (!editingCard) {
            const check = canAddCard({ isPro, isTrialActive, cardCount: cards.length });
            if (!check.allowed) {
                showToast(check.message, 'warning');
                setIsUpgradeModalOpen(true);
                return;
            }
        }

        if (!formValues.name.trim() || !formValues.limitInput || !formValues.closingDay || !formValues.dueDay) {
            showToast('Todos os campos são obrigatórios.', 'warning');
            return;
        }
        const cardLimit = parseCurrencyInput(formValues.limitInput);
        if (isNaN(cardLimit) || cardLimit <= 0) {
            showToast('O limite do cartão é inválido.', 'error');
            return;
        }

        const closingDay = parseInt(formValues.closingDay, 10);
        const dueDay = parseInt(formValues.dueDay, 10);

        if (isNaN(closingDay) || closingDay < 1 || closingDay > 31) {
            showToast('O dia de fechamento deve ser um número entre 1 e 31.', 'error');
            return;
        }

        if (isNaN(dueDay) || dueDay < 1 || dueDay > 31) {
            showToast('O dia de vencimento deve ser um número entre 1 e 31.', 'error');
            return;
        }

        setIsSubmitting(true);
        const userCollectionPath = getUserCollectionPathSegments();
        const cardData = { 
            name: formValues.name.trim(), 
            limit: cardLimit,
            closingDay: closingDay,
            dueDay: dueDay,
            color: formValues.color || '#F2B705',
        };

        try {
            // Suporte a dados sintéticos isolados para testes E2E sem tocar na produção
            if (import.meta.env.DEV && typeof window !== 'undefined' && window.__FINCONTROL_E2E_MOCK_DATA__) {
                if (editingCard) {
                    const idx = (window.__FINCONTROL_E2E_MOCK_DATA__.cards || []).findIndex(c => c.id === editingCard.id);
                    if (idx >= 0) {
                        window.__FINCONTROL_E2E_MOCK_DATA__.cards[idx] = { ...window.__FINCONTROL_E2E_MOCK_DATA__.cards[idx], ...cardData };
                    }
                    showToast('Cartão atualizado com sucesso!', 'success');
                } else {
                    const currentMockCount = (window.__FINCONTROL_E2E_MOCK_DATA__.cards || []).length;
                    const mockCheck = canAddCard({ isPro, isTrialActive, cardCount: currentMockCount });
                    if (!mockCheck.allowed) {
                        showToast(mockCheck.message, 'warning');
                        setIsUpgradeModalOpen(true);
                        setIsSubmitting(false);
                        return;
                    }

                    const newCard = { id: `card-e2e-${Date.now()}`, ...cardData, userId };
                    window.__FINCONTROL_E2E_MOCK_DATA__.cards = [...(window.__FINCONTROL_E2E_MOCK_DATA__.cards || []), newCard];
                    showToast('Cartão adicionado com sucesso!', 'success');
                }
                handleCloseModal();
                setIsSubmitting(false);
                return;
            }

            if (editingCard) {
                const cardDocRef = doc(db, ...userCollectionPath, userId, 'cards', editingCard.id);
                await updateDoc(cardDocRef, cardData);
                showToast('Cartão atualizado com sucesso!', 'success');
            } else {
                const cardsRef = collection(db, ...userCollectionPath, userId, 'cards');
                await addDoc(cardsRef, { ...cardData, userId });
                showToast('Cartão adicionado com sucesso!', 'success');
            }
            handleCloseModal();
        } catch (error) {
            console.error("Erro ao salvar cartão:", error);
            showToast('Não foi possível salvar o cartão. Tente novamente.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const confirmDeleteCard = (cardId) => { setCardToDelete(cardId); setIsConfirmationModalOpen(true); };

    const handleDeleteCardConfirmed = async () => {
        if (!cardToDelete || isSubmitting) return;
        setIsSubmitting(true);
        const userCollectionPath = getUserCollectionPathSegments();
        try {
            await deleteDoc(doc(db, ...userCollectionPath, userId, 'cards', cardToDelete));
            showToast('Cartão excluído com sucesso!', 'success');
        } catch (error) {
            console.error("Erro ao excluir cartão:", error);
            showToast('Não foi possível excluir o cartão. Tente novamente.', 'error');
        } finally {
            setIsSubmitting(false);
            setIsConfirmationModalOpen(false);
            setCardToDelete(null);
        }
    };

    return (
        <div className="space-y-8 animate-fadeIn">
            {/* Header DS2 */}
            <div className="bg-[var(--fc-surface-1)] border border-[var(--fc-border-default)] p-6 sm:p-8 rounded-3xl shadow-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--fc-text-primary)]">Gerenciamento de Cartões</h1>
                    <p className="text-sm text-[var(--fc-text-muted)] mt-1">Adicione, edite e acompanhe o limite e as faturas dos seus cartões.</p>
                </div>
                 <div className="flex items-center gap-4 w-full sm:w-auto">
                    <input 
                        type="month" 
                        value={filterMonth} 
                        onChange={(e) => setFilterMonth(e.target.value)}
                        className="p-3 bg-[var(--fc-surface-2)] border border-[var(--fc-border-default)] rounded-2xl text-[var(--fc-text-primary)] w-full focus:border-[var(--fc-accent)] focus:outline-none"
                    />
                    <button onClick={() => handleOpenModal()} className="flex-shrink-0 flex items-center justify-center gap-2 bg-gradient-to-r from-gold-light to-gold text-carbon-900 font-bold py-3 px-5 rounded-2xl shadow-lg hover:opacity-90 transition cursor-pointer">
                        <PlusIcon />
                        <span className="hidden sm:inline">Adicionar Cartão</span>
                    </button>
                 </div>
            </div>

            {/* Tabela de Cartões */}
            <div className="bg-[var(--fc-surface-1)] border border-[var(--fc-border-default)] rounded-3xl shadow-2xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full border-collapse">
                        <thead>
                            <tr className="border-b border-[var(--fc-border-subtle)] text-xs font-semibold text-[var(--fc-text-secondary)] uppercase tracking-wider bg-[var(--fc-surface-2)]">
                                <th scope="col" className="px-6 py-4">Nome do Cartão</th>
                                <th scope="col" className="px-6 py-4">Limite Utilizado & Disponível</th>
                                <th scope="col" className="px-6 py-4">Fatura ({new Date(filterMonth + '-02').toLocaleString('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' })})</th>
                                <th scope="col" className="px-6 py-4">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--fc-border-subtle)] text-sm">
                            {cards.length > 0 ? cards.map((card) => {
                                const limitInfo = calculateCardLimitIntelligence({
                                    card,
                                    loans: allLoans,
                                    expenses: allExpenses
                                });
                                const { total: invoiceValue, isPending: isInvoicePending } = calculateInvoiceDetails(card, filterMonth);
                                
                                return (
                                    <tr key={card.id} className="hover:bg-[var(--fc-surface-2)]/50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap font-semibold text-[var(--fc-text-primary)] flex items-center">
                                            <span className="w-4 h-4 rounded-md mr-3 border border-white/20 shadow-sm" style={{ backgroundColor: card.color }}></span>
                                            {card.name}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-[var(--fc-text-secondary)]">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="font-bold text-[var(--fc-text-primary)]">{formatCurrencyDisplay(limitInfo.registeredLimit)}</span>
                                                <span className={`text-[11px] font-semibold ${limitInfo.isHighUtilization ? 'text-amber-600 dark:text-amber-300' : 'text-[var(--fc-text-muted)]'}`}>
                                                    {limitInfo.utilizationLabel} utilizado
                                                </span>
                                            </div>
                                            <div className="w-full bg-[var(--fc-surface-2)] rounded-full h-2.5 my-1.5 overflow-hidden border border-[var(--fc-border-default)]">
                                                <div 
                                                    className={`h-2.5 rounded-full transition-all duration-500 ${
                                                        limitInfo.isHighUtilization
                                                            ? 'bg-gradient-to-r from-amber-500 to-rose-500'
                                                            : 'bg-gradient-to-r from-gold-light to-gold'
                                                    }`} 
                                                    style={{ width: `${limitInfo.utilizationPercentage > 100 ? 100 : limitInfo.utilizationPercentage}%` }}
                                                ></div>
                                            </div>
                                            <div className="text-xs text-[var(--fc-text-muted)] flex flex-wrap items-center gap-2">
                                                <span>Comprometido no app: <strong className="text-[var(--fc-text-primary)] font-mono">{formatCurrencyDisplay(limitInfo.committedAmount)}</strong></span> 
                                                <span>•</span> 
                                                <span>Disp. estimado: <strong className="text-emerald-600 dark:text-emerald-400 font-mono">{formatCurrencyDisplay(limitInfo.estimatedAvailable)}</strong></span>
                                                {limitInfo.isHighUtilization && (
                                                    <span className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-300 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                                                        85%+ no app
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-[var(--fc-text-secondary)]">
                                            <div className="flex items-center gap-3">
                                                <span className="font-extrabold text-lg text-[var(--fc-accent)]">{formatCurrencyDisplay(invoiceValue)}</span>
                                                {invoiceValue > 0 && (
                                                     isInvoicePending ? (
                                                         <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[var(--fc-accent-soft)] text-[var(--fc-accent)] border border-[var(--fc-border-default)]">Pendente</span>
                                                     ) : (
                                                         <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                                             <CheckCircleIcon/> Paga
                                                         </span>
                                                     )
                                                 )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap font-medium">
                                            <div className="flex items-center gap-4">
                                                <button 
                                                    type="button"
                                                    onClick={() => handleOpenModal(card)} 
                                                    aria-label={`Editar cartão ${card.name || ''}`.trim()}
                                                    className="text-[var(--fc-accent)] hover:opacity-80 transition cursor-pointer" 
                                                    title="Editar"
                                                >
                                                    <EditIcon />
                                                </button>
                                                <button 
                                                    type="button"
                                                    onClick={() => confirmDeleteCard(card.id)} 
                                                    aria-label={`Excluir cartão ${card.name || ''}`.trim()}
                                                    className="text-rose-500 hover:text-rose-400 transition cursor-pointer" 
                                                    title="Excluir"
                                                >
                                                    <DeleteIcon />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )
                            }) : (
                                <tr><td colSpan="4" className="text-center py-12 text-[var(--fc-text-muted)]">Nenhum cartão cadastrado ainda.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            
            {/* Modal de Cadastro/Edição com Grid Estruturada e Consistente DS2 */}
            <GenericModal isOpen={isModalOpen} onClose={handleCloseModal} title={editingCard ? 'Editar Cartão' : 'Adicionar Cartão'} maxWidth="max-w-lg">
                <div className="space-y-4">
                    <div className="w-full">
                        <label htmlFor="cardNameInput" className="block text-xs font-semibold uppercase tracking-wider text-[var(--fc-text-secondary)] mb-1.5">Nome do Cartão</label>
                        <input 
                            id="cardNameInput" 
                            type="text" 
                            value={formValues.name} 
                            onChange={(e) => setFormValues({...formValues, name: e.target.value})} 
                            placeholder="Ex: Nubank" 
                            className="w-full min-h-[48px] h-12 px-3.5 py-2.5 rounded-xl border border-[var(--fc-border-default)] bg-[var(--fc-surface-1)] text-[var(--fc-text-primary)] text-sm focus:ring-2 focus:ring-[var(--fc-focus-ring)] focus:outline-none transition shadow-sm"
                            required 
                        />
                    </div>
                    <div className="w-full">
                        <label htmlFor="cardLimitInput" className="block text-xs font-semibold uppercase tracking-wider text-[var(--fc-text-secondary)] mb-1.5">Limite do Cartão</label>
                        <div className="relative w-full">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-[var(--fc-accent)] font-bold pointer-events-none z-10 text-sm" aria-hidden="true">R$</span>
                            <input 
                                id="cardLimitInput" 
                                type="text" 
                                value={formValues.limitInput} 
                                onChange={handleCurrencyInputChange(val => setFormValues({...formValues, limitInput: val}))} 
                                className="w-full min-h-[48px] h-12 currency-input !pl-14 px-3.5 py-2.5 rounded-xl border border-[var(--fc-border-default)] bg-[var(--fc-surface-1)] text-[var(--fc-text-primary)] text-sm focus:ring-2 focus:ring-[var(--fc-focus-ring)] focus:outline-none transition shadow-sm font-mono font-medium" 
                                inputMode="decimal" 
                                placeholder="0,00" 
                                required 
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="w-full">
                            <label htmlFor="cardClosingDayInput" className="block text-xs font-semibold uppercase tracking-wider text-[var(--fc-text-secondary)] mb-1.5">Dia de Fechamento</label>
                            <input 
                                id="cardClosingDayInput" 
                                type="number" 
                                value={formValues.closingDay} 
                                onChange={(e) => setFormValues({...formValues, closingDay: e.target.value})} 
                                min="1" 
                                max="31" 
                                placeholder="Ex: 5" 
                                className="w-full min-h-[48px] h-12 px-3.5 py-2.5 rounded-xl border border-[var(--fc-border-default)] bg-[var(--fc-surface-1)] text-[var(--fc-text-primary)] text-sm focus:ring-2 focus:ring-[var(--fc-focus-ring)] focus:outline-none transition shadow-sm font-mono"
                                required 
                            />
                        </div>
                        <div className="w-full">
                            <label htmlFor="cardDueDayInput" className="block text-xs font-semibold uppercase tracking-wider text-[var(--fc-text-secondary)] mb-1.5">Dia de Vencimento</label>
                            <input 
                                id="cardDueDayInput" 
                                type="number" 
                                value={formValues.dueDay} 
                                onChange={(e) => setFormValues({...formValues, dueDay: e.target.value})} 
                                min="1" 
                                max="31" 
                                placeholder="Ex: 12" 
                                className="w-full min-h-[48px] h-12 px-3.5 py-2.5 rounded-xl border border-[var(--fc-border-default)] bg-[var(--fc-surface-1)] text-[var(--fc-text-primary)] text-sm focus:ring-2 focus:ring-[var(--fc-focus-ring)] focus:outline-none transition shadow-sm font-mono"
                                required 
                            />
                        </div>
                    </div>
                    <div className="w-full">
                        <label htmlFor="cardColorInput" className="block text-xs font-semibold uppercase tracking-wider text-[var(--fc-text-secondary)] mb-1.5">Cor do Identificador</label>
                        <div className="flex items-center gap-3">
                            <input 
                                id="cardColorInput" 
                                type="color" 
                                value={formValues.color} 
                                onChange={(e) => setFormValues({...formValues, color: e.target.value})} 
                                className="w-16 min-h-[48px] h-12 p-1 bg-[var(--fc-surface-2)] border border-[var(--fc-border-default)] rounded-xl cursor-pointer" 
                            />
                            <span className="text-xs font-mono text-[var(--fc-text-secondary)] uppercase">{formValues.color}</span>
                        </div>
                    </div>
                </div>
                <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-[var(--fc-border-subtle)]">
                    <Button variant="secondary" onClick={handleCloseModal}>Cancelar</Button>
                    <Button variant="primary" onClick={handleSaveCard} isLoading={isSubmitting}>
                        {editingCard ? 'Atualizar Cartão' : 'Salvar Cartão'}
                    </Button>
                </div>
            </GenericModal>

            {/* Modal de Confirmação de Exclusão com Detecção de Vínculos */}
            <GenericModal
                isOpen={isConfirmationModalOpen}
                onClose={() => setIsConfirmationModalOpen(false)}
                onConfirm={handleDeleteCardConfirmed}
                title="Confirmar Exclusão do Cartão"
                isConfirmation={true}
            >
                <div className="space-y-3">
                    <p className="text-sm text-[var(--fc-text-primary)]">
                        Tem certeza que deseja deletar o cartão <strong className="text-[var(--fc-accent)]">{cards.find(c => c.id === cardToDelete)?.name}</strong>?
                    </p>
                    {(() => {
                        const linkedLoans = allLoans.filter(l => l.cardId === cardToDelete).length;
                        const linkedSubs = allSubscriptions.filter(s => s.cardId === cardToDelete).length;
                        if (linkedLoans > 0 || linkedSubs > 0) {
                            return (
                                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-xs text-amber-600 dark:text-amber-300 space-y-1">
                                    <p className="font-bold flex items-center gap-1.5">⚠️ Registros Financeiros Vinculados:</p>
                                    <p className="text-[var(--fc-text-secondary)]">
                                        Este cartão possui {linkedLoans > 0 ? `${linkedLoans} compra(s)` : ''}{linkedLoans > 0 && linkedSubs > 0 ? ' e ' : ''}{linkedSubs > 0 ? `${linkedSubs} assinatura(s)` : ''} associadas.
                                    </p>
                                </div>
                            );
                        }
                        return null;
                    })()}
                </div>
            </GenericModal>

            {/* Modal de Upgrade Pro (Disparado ao atingir o limite de 2 cartões do Free) */}
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