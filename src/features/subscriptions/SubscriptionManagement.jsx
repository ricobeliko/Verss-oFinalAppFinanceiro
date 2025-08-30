// src/features/subscriptions/SubscriptionManagement.jsx

import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, updateDoc, addDoc, deleteDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { useAppContext } from '../../context/AppContext';
import GenericModal from '../../components/GenericModal';
import { formatCurrencyDisplay, parseCurrencyInput, handleCurrencyInputChange, formatCurrencyForInput } from '../../utils/currency';

// --- Ícones ---
const EditIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const DeleteIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>;
const PlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;

export default function SubscriptionManagement() {
    const { userId, db, showToast, isAuthReady, getUserCollectionPathSegments, theme } = useAppContext();

    const [subscriptions, setSubscriptions] = useState([]);
    const [cards, setCards] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSubscription, setEditingSubscription] = useState(null);
    const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);
    const [subscriptionToDelete, setSubscriptionToDelete] = useState(null);

    // --- State do Formulário (Modal) ---
    const [name, setName] = useState('');
    const [valueInput, setValueInput] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [cardId, setCardId] = useState('');
    const [status, setStatus] = useState('Ativa'); // Agora o status é 'Ativa' ou 'Inativa'

    useEffect(() => {
        if (!isAuthReady || !userId) return;
        const userCollectionPath = getUserCollectionPathSegments();
        const basePath = [...userCollectionPath, userId];
        
        const cardsRef = collection(db, ...basePath, 'cards');
        const unsubCards = onSnapshot(cardsRef, (snapshot) => setCards(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
        
        const subscriptionsRef = collection(db, ...basePath, 'subscriptions');
        const q = query(subscriptionsRef, orderBy("createdAt", "desc"));
        const unsubSubscriptions = onSnapshot(q, (snapshot) => setSubscriptions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))));

        return () => { unsubCards(); unsubSubscriptions(); };
    }, [userId, db, isAuthReady, getUserCollectionPathSegments]);

    const getCardName = (cId) => cards.find(card => card.id === cId)?.name || 'N/A';

    const resetForm = () => {
        setName('');
        setValueInput('');
        setDueDate('');
        setCardId('');
        setStatus('Ativa');
    };
    
    const handleOpenModal = (sub = null) => {
        setEditingSubscription(sub);
        if (sub) {
            setName(sub.name || '');
            // ✅ CORREÇÃO: Usando 'amount' ou 'value' para compatibilidade com dados antigos
            const amount = sub.amount !== undefined ? sub.amount : sub.value;
            setValueInput(formatCurrencyForInput(amount));
            setDueDate(sub.dueDate ? sub.dueDate.toString() : '');
            setCardId(sub.cardId || '');
            // ✅ CORREÇÃO: Garante que o status seja sempre um valor válido
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
        const value = parseCurrencyInput(valueInput);
        const day = parseInt(dueDate, 10);

        if (!name.trim() || !value || !cardId) {
            showToast('Por favor, preencha nome, valor e cartão.', 'warning');
            return;
        }

        if (isNaN(day) || day < 1 || day > 31) {
            showToast('O dia da cobrança deve ser um número entre 1 e 31.', 'warning');
            return;
        }
        
        const userCollectionPath = getUserCollectionPathSegments();
        const subscriptionData = {
            name,
            amount: value, // Padronizando para 'amount'
            value: value, // Mantendo 'value' por compatibilidade, se necessário
            dueDate: day,
            cardId: cardId,
            status: status, // 'Ativa' ou 'Inativa'
            isActive: status === 'Ativa', // Campo booleano para facilitar filtros
        };

        try {
            if (editingSubscription) {
                const subDoc = doc(db, ...userCollectionPath, userId, 'subscriptions', editingSubscription.id);
                await updateDoc(subDoc, { ...subscriptionData, updatedAt: serverTimestamp() });
                showToast('Assinatura atualizada com sucesso!', 'success');
            } else {
                const subsRef = collection(db, ...userCollectionPath, userId, 'subscriptions');
                await addDoc(subsRef, { ...subscriptionData, createdAt: serverTimestamp(), userId });
                showToast('Assinatura adicionada com sucesso!', 'success');
            }
            handleCloseModal();
        } catch (error) {
            console.error("Erro ao salvar assinatura:", error);
            showToast('Erro ao salvar assinatura. Tente novamente.', 'error');
        }
    };

    const confirmDeleteSubscription = (subId) => {
        setSubscriptionToDelete(subId);
        setIsConfirmationModalOpen(true);
    };

    const handleDeleteSubscriptionConfirmed = async () => {
        if (!subscriptionToDelete) return;
        const userCollectionPath = getUserCollectionPathSegments();
        try {
            const subDoc = doc(db, ...userCollectionPath, userId, 'subscriptions', subscriptionToDelete);
            await deleteDoc(subDoc);
            showToast('Assinatura excluída com sucesso!', 'success');
        } catch (error) {
            console.error("Erro ao excluir assinatura:", error);
            showToast('Erro ao excluir assinatura. Tente novamente.', 'error');
        } finally {
            setIsConfirmationModalOpen(false);
            setSubscriptionToDelete(null);
        }
    };
    
    return (
        <div className="p-6 bg-gray-900/50 border border-gray-800 rounded-lg">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">Gerenciamento de Assinaturas</h1>
                    <p className="text-sm text-gray-400 mt-1">Controle suas assinaturas e serviços recorrentes.</p>
                </div>
                <button onClick={() => handleOpenModal()} className="w-full sm:w-auto flex items-center justify-center gap-2 bg-purple-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md hover:bg-purple-700 transition">
                    <PlusIcon />
                    Adicionar Assinatura
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {subscriptions.length > 0 ? subscriptions.map((sub) => {
                    const currentStatus = sub.status || (sub.isActive ? 'Ativa' : 'Inativa');
                    const amount = sub.amount !== undefined ? sub.amount : sub.value;
                    return (
                        <div key={sub.id} className={`p-5 rounded-lg shadow-lg flex flex-col justify-between border ${currentStatus === 'Ativa' ? 'bg-gray-800/60 border-gray-700' : 'bg-gray-800/30 border-gray-800'}`}>
                            <div>
                                <div className="flex justify-between items-start mb-3">
                                    <h3 className={`text-xl font-bold ${currentStatus === 'Ativa' ? 'text-white' : 'text-gray-500'}`}>{sub.name}</h3>
                                    <span className={`px-3 py-1 text-xs font-semibold rounded-full ${currentStatus === 'Ativa' ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-400'}`}>
                                        {currentStatus}
                                    </span>
                                </div>
                                <p className={`text-2xl font-extrabold mb-1 ${currentStatus === 'Ativa' ? 'text-purple-400' : 'text-purple-400/50'}`}>
                                    {formatCurrencyDisplay(amount)}
                                </p>
                                <p className={`text-sm mb-4 ${currentStatus === 'Ativa' ? 'text-gray-400' : 'text-gray-600'}`}>
                                    Vence dia: <span className="font-semibold">{sub.dueDate}</span>
                                </p>
                                <div className={`flex items-center text-sm pt-4 border-t ${currentStatus === 'Ativa' ? 'text-gray-300 border-gray-700' : 'text-gray-600 border-gray-700/50'}`}>
                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H7a3 3 0 00-3 3v8a3 3 0 003 3z"></path></svg>
                                    {getCardName(sub.cardId)}
                                </div>
                            </div>
                            <div className="flex items-center justify-end gap-3 mt-5">
                                <button onClick={() => handleOpenModal(sub)} className="text-purple-400 hover:text-purple-300 transition" title="Editar"><EditIcon /></button>
                                <button onClick={() => confirmDeleteSubscription(sub.id)} className="text-red-500 hover:text-red-400 transition" title="Excluir"><DeleteIcon /></button>
                            </div>
                        </div>
                    )
                }) : (
                    <div className="col-span-full text-center py-10 text-gray-500">
                        Nenhuma assinatura cadastrada.
                    </div>
                )}
            </div>
            
            <GenericModal isOpen={isModalOpen} onClose={handleCloseModal} title={editingSubscription ? 'Editar Assinatura' : 'Adicionar Assinatura'} theme="dark">
                <div className="space-y-4">
                    <div>
                        <label htmlFor="subscriptionName" className="block text-sm font-medium text-gray-300 mb-1">Nome</label>
                        <input id="subscriptionName" type="text" placeholder="Ex: Netflix, Spotify" value={name} onChange={(e) => setName(e.target.value)} className="w-full p-2 bg-gray-700 border-2 border-gray-600 rounded-md text-white" required />
                    </div>
                    <div>
                        <label htmlFor="subscriptionValue" className="block text-sm font-medium text-gray-300 mb-1">Valor</label>
                        <input id="subscriptionValue" type="text" placeholder="R$ 0,00" value={valueInput} onChange={handleCurrencyInputChange(setValueInput)} className="w-full p-2 bg-gray-700 border-2 border-gray-600 rounded-md text-white" required inputMode="decimal" />
                    </div>
                    <div>
                        <label htmlFor="subscriptionDueDate" className="block text-sm font-medium text-gray-300 mb-1">Dia da Cobrança</label>
                        <input id="subscriptionDueDate" type="number" placeholder="Dia do mês" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full p-2 bg-gray-700 border-2 border-gray-600 rounded-md text-white" min="1" max="31" required />
                    </div>
                    <div>
                        <label htmlFor="subscriptionCard" className="block text-sm font-medium text-gray-300 mb-1">Cartão</label>
                        <select id="subscriptionCard" value={cardId} onChange={(e) => setCardId(e.target.value)} className="w-full p-2 bg-gray-700 border-2 border-gray-600 rounded-md text-white" required>
                            <option value="">Selecione o Cartão</option>
                            {cards.map(card => <option key={card.id} value={card.id}>{card.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="subscriptionStatus" className="block text-sm font-medium text-gray-300 mb-1">Status</label>
                        <select id="subscriptionStatus" value={status} onChange={(e) => setStatus(e.target.value)} className="w-full p-2 bg-gray-700 border-2 border-gray-600 rounded-md text-white">
                            <option value="Ativa">Ativa</option>
                            <option value="Inativa">Inativa</option>
                        </select>
                    </div>
                </div>
                <div className="mt-6 flex justify-end gap-4">
                    <button onClick={handleCloseModal} className="py-2 px-4 bg-gray-600 hover:bg-gray-700 rounded-md text-white transition">Cancelar</button>
                    <button onClick={handleSaveSubscription} className="py-2 px-4 bg-purple-600 hover:bg-purple-700 rounded-md text-white transition">
                        {editingSubscription ? 'Atualizar' : 'Salvar'}
                    </button>
                </div>
            </GenericModal>

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