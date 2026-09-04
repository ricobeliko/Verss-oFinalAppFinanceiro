// src/features/subscriptions/SubscriptionManagement.jsx

import React, { useState } from 'react';
import { collection, doc, updateDoc, addDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { useAppContext } from '../../context/AppContext';
import GenericModal from '../../components/GenericModal';
import Button from '../../components/Button';
import { formatCurrencyDisplay, parseCurrencyInput, handleCurrencyInputChange, formatCurrencyForInput } from '../../utils/currency';
import { isValidFinancialValue } from '../../services/financialService';
import { useSubscriptions } from '../../hooks/useSubscriptions';
import { useCards } from '../../hooks/useCards';
import { useClients } from '../../hooks/useClients';

// --- Ícones ---
const EditIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const DeleteIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>;
const PlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;
const UserIcon = () => <svg className="w-4 h-4 mr-2 text-gold flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>;
const CardIcon = () => <svg className="w-4 h-4 mr-2 text-gold flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H7a3 3 0 00-3 3v8a3 3 0 003 3z"></path></svg>;

export default function SubscriptionManagement() {
    const { userId, db, showToast, getUserCollectionPathSegments, theme } = useAppContext();

    const { subscriptions } = useSubscriptions();
    const { cards } = useCards();
    const { clients } = useClients();
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSubscription, setEditingSubscription] = useState(null);
    const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);
    const [subscriptionToDelete, setSubscriptionToDelete] = useState(null);

    // --- State do Formulário (Modal) ---
    const [name, setName] = useState('');
    const [valueInput, setValueInput] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [cardId, setCardId] = useState('');
    const [clientId, setClientId] = useState('');
    const [status, setStatus] = useState('Ativa');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const getCardName = (cId) => cards.find(card => card.id === cId)?.name || 'N/A';
    const getClientName = (cId) => clients.find(client => client.id === cId)?.name || 'Não atribuído';

    const resetForm = () => {
        setName('');
        setValueInput('');
        setDueDate('');
        setCardId('');
        setClientId('');
        setStatus('Ativa');
    };
    
    const handleOpenModal = (sub = null) => {
        setEditingSubscription(sub);
        if (sub) {
            setName(sub.name);
            setValueInput(formatCurrencyForInput(sub.amount !== undefined ? sub.amount : sub.value));
            setDueDate(sub.dueDate ? sub.dueDate.split('-')[2] || sub.dueDate : '');
            setCardId(sub.cardId || '');
            setClientId(sub.clientId || '');
            setStatus(sub.status || (sub.isActive ? 'Ativa' : 'Inativa'));
        } else {
            resetForm();
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingSubscription(null);
        resetForm();
    };

    const handleSaveSubscription = async () => {
        if (isSubmitting) return;
        const val = parseCurrencyInput(valueInput);
        if (!name.trim() || !isValidFinancialValue(val) || !dueDate || !cardId) {
            showToast('Por favor, preencha todos os campos obrigatórios (Nome, Valor, Dia de Cobrança e Cartão).', 'warning');
            return;
        }

        const parsedDueDay = parseInt(dueDate, 10);
        if (isNaN(parsedDueDay) || parsedDueDay < 1 || parsedDueDay > 31) {
            showToast('O dia de cobrança deve ser um número entre 1 e 31.', 'error');
            return;
        }

        setIsSubmitting(true);
        const userCollectionPath = getUserCollectionPathSegments();
        const subData = {
            name: name.trim(),
            amount: val,
            value: val,
            dueDate: dueDate.padStart(2, '0'),
            cardId,
            clientId: clientId || null,
            status,
            isActive: status === 'Ativa'
        };

        try {
            if (import.meta.env.DEV && typeof window !== 'undefined' && window.__FINCONTROL_E2E_MOCK_DATA__) {
                const newSub = { id: `sub-e2e-${Date.now()}`, ...subData, userId };
                window.__FINCONTROL_E2E_MOCK_DATA__.subscriptions = [...(window.__FINCONTROL_E2E_MOCK_DATA__.subscriptions || []), newSub];
                showToast("Assinatura adicionada com sucesso!", "success");
                handleCloseModal();
                setIsSubmitting(false);
                return;
            }

            if (editingSubscription) {
                const subDocRef = doc(db, ...userCollectionPath, userId, 'subscriptions', editingSubscription.id);
                await updateDoc(subDocRef, { ...subData, updatedAt: serverTimestamp() });
                showToast("Assinatura atualizada com sucesso!", "success");
            } else {
                const subsRef = collection(db, ...userCollectionPath, userId, 'subscriptions');
                await addDoc(subsRef, { ...subData, createdAt: serverTimestamp(), userId });
                showToast("Assinatura adicionada com sucesso!", "success");
            }
            handleCloseModal();
        } catch (error) {
            showToast(`Erro ao salvar assinatura: ${error.message}`, "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    const confirmDeleteSubscription = (id) => {
        setSubscriptionToDelete(id);
        setIsConfirmationModalOpen(true);
    };

    const handleDeleteSubscriptionConfirmed = async () => {
        if (!subscriptionToDelete || isSubmitting) return;

        setIsSubmitting(true);
        const userCollectionPath = getUserCollectionPathSegments();
        try {
            await deleteDoc(doc(db, ...userCollectionPath, userId, 'subscriptions', subscriptionToDelete));
            showToast("Assinatura deletada com sucesso!", "success");
        } catch (error) {
            showToast(`Erro ao deletar assinatura: ${error.message}`, "error");
        } finally {
            setIsSubmitting(false);
            setIsConfirmationModalOpen(false);
            setSubscriptionToDelete(null);
        }
    };
    
    return (
        <div className="space-y-8 animate-fadeIn">
            {/* Header Carbono & Dourado */}
            <div className="bg-carbon-900 border border-carbon-800 p-6 sm:p-8 rounded-3xl shadow-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gold-cream">Gerenciamento de Assinaturas</h1>
                    <p className="text-sm text-gray-400 mt-1">Controle suas assinaturas e serviços recorrentes com facilidade.</p>
                </div>
                <Button 
                    variant="primary" 
                    icon={<PlusIcon />}
                    onClick={() => handleOpenModal()} 
                    className="w-full sm:w-auto"
                >
                    Adicionar Assinatura
                </Button>
            </div>

            {/* Grid de Cards de Assinaturas */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {subscriptions.length > 0 ? subscriptions.map((sub) => {
                    const currentStatus = sub.status || (sub.isActive ? 'Ativa' : 'Inativa');
                    const amount = sub.amount !== undefined ? sub.amount : sub.value;
                    return (
                        <div key={sub.id} className={`p-6 rounded-3xl shadow-2xl flex flex-col justify-between border transition-all duration-300 hover:border-gold/30 ${currentStatus === 'Ativa' ? 'bg-carbon-900 border-carbon-800' : 'bg-carbon-900/40 border-carbon-800/50'}`}>
                            <div>
                                <div className="flex justify-between items-start mb-4">
                                    <h3 className={`text-lg font-bold tracking-tight ${currentStatus === 'Ativa' ? 'text-gold-cream' : 'text-gray-500'}`}>{sub.name}</h3>
                                    <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${currentStatus === 'Ativa' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
                                        {currentStatus}
                                    </span>
                                </div>
                                <p className={`text-2xl font-black mb-2 font-mono ${currentStatus === 'Ativa' ? 'text-gold' : 'text-gray-500'}`}>
                                    {formatCurrencyDisplay(amount)}
                                </p>
                                <p className={`text-xs mb-5 font-medium ${currentStatus === 'Ativa' ? 'text-gray-400' : 'text-gray-600'}`}>
                                    Vence dia: <span className="font-bold text-gold-cream">{sub.dueDate}</span>
                                </p>
                                
                                <div className={`pt-4 border-t space-y-2.5 ${currentStatus === 'Ativa' ? 'text-gray-300 border-carbon-800' : 'text-gray-600 border-carbon-800/50'}`}>
                                    <div className="flex items-center text-xs font-medium">
                                        <UserIcon />
                                        <span className="truncate">{getClientName(sub.clientId)}</span>
                                    </div>
                                    <div className="flex items-center text-xs font-medium">
                                        <CardIcon />
                                        <span className="truncate">{getCardName(sub.cardId)}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-carbon-800">
                                <button 
                                    type="button"
                                    onClick={() => handleOpenModal(sub)} 
                                    aria-label={`Editar assinatura ${sub.name || ''}`.trim()}
                                    className="text-gold hover:text-gold-light transition cursor-pointer" 
                                    title="Editar"
                                >
                                    <EditIcon />
                                </button>
                                <button 
                                    type="button"
                                    onClick={() => confirmDeleteSubscription(sub.id)} 
                                    aria-label={`Excluir assinatura ${sub.name || ''}`.trim()}
                                    className="text-rose-400 hover:text-rose-300 transition cursor-pointer" 
                                    title="Excluir"
                                >
                                    <DeleteIcon />
                                </button>
                            </div>
                        </div>
                    )
                }) : (
                    <div className="col-span-full text-center py-16 text-gray-500 bg-carbon-900 border border-carbon-800 rounded-3xl shadow-2xl">
                        Nenhuma assinatura cadastrada.
                    </div>
                )}
            </div>
            
            {/* Modal de Cadastro/Edição */}
            <GenericModal isOpen={isModalOpen} onClose={handleCloseModal} title={editingSubscription ? 'Editar Assinatura' : 'Adicionar Assinatura'} theme="dark" maxWidth="max-w-lg">
                <div className="space-y-4">
                    <div>
                        <label htmlFor="subscriptionName" className="block text-sm font-medium text-gray-300 mb-1">Nome</label>
                        <input id="subscriptionName" type="text" placeholder="Ex: Netflix, Spotify" value={name} onChange={(e) => setName(e.target.value)} required />
                    </div>
                    <div>
                        <label htmlFor="subscriptionValue" className="block text-sm font-medium text-gray-300 mb-1">Valor</label>
                        <div className="relative w-full">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-gold font-bold pointer-events-none z-10">R$</span>
                            <input id="subscriptionValue" type="text" placeholder="0,00" value={valueInput} onChange={handleCurrencyInputChange(setValueInput)} className="w-full currency-input !pl-14" required inputMode="decimal" />
                        </div>
                    </div>
                    <div>
                        <label htmlFor="subscriptionDueDate" className="block text-sm font-medium text-gray-300 mb-1">Dia da Cobrança</label>
                        <input id="subscriptionDueDate" type="number" placeholder="Ex: 10" value={dueDate} onChange={(e) => setDueDate(e.target.value)} min="1" max="31" required />
                    </div>
                    <div>
                        <label htmlFor="subscriptionCard" className="block text-sm font-medium text-gray-300 mb-1">Cartão</label>
                        <select id="subscriptionCard" value={cardId} onChange={(e) => setCardId(e.target.value)} required>
                            <option value="">Selecione o Cartão</option>
                            {cards.map(card => <option key={card.id} value={card.id}>{card.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="subscriptionClient" className="block text-sm font-medium text-gray-300 mb-1">Pessoa</label>
                        <select id="subscriptionClient" value={clientId} onChange={(e) => setClientId(e.target.value)} required>
                            <option value="">Selecione a Pessoa</option>
                            {clients.map(client => <option key={client.id} value={client.id}>{client.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="subscriptionStatus" className="block text-sm font-medium text-gray-300 mb-1">Status</label>
                        <select id="subscriptionStatus" value={status} onChange={(e) => setStatus(e.target.value)}>
                            <option value="Ativa">Ativa</option>
                            <option value="Inativa">Inativa</option>
                        </select>
                    </div>
                </div>
                <div className="mt-6 flex justify-end gap-3">
                    <Button 
                        variant="secondary" 
                        onClick={handleCloseModal}
                    >
                        Cancelar
                    </Button>
                    <Button 
                        variant="primary" 
                        type="submit"
                        isLoading={isSubmitting}
                        onClick={handleSaveSubscription}
                    >
                        {editingSubscription ? 'Atualizar Assinatura' : 'Salvar Assinatura'}
                    </Button>
                </div>
            </GenericModal>

            {/* Modal de Confirmação de Exclusão */}
            <GenericModal 
                isOpen={isConfirmationModalOpen} 
                onClose={() => setIsConfirmationModalOpen(false)} 
                onConfirm={handleDeleteSubscriptionConfirmed} 
                title="Confirmar Exclusão" 
                isConfirmation={true} 
                theme={theme}
            >
                Tem certeza que deseja deletar a assinatura "{subscriptions.find(s => s.id === subscriptionToDelete)?.name}"?
            </GenericModal>
        </div>
    );
}