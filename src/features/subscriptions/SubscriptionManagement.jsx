// src/features/subscriptions/SubscriptionManagement.jsx (CORREÇÃO FINAL)

import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, updateDoc, addDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
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
    const [clients, setClients] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentSubscription, setCurrentSubscription] = useState(null);

    const [name, setName] = useState('');
    const [amountInput, setAmountInput] = useState('');
    const [firstChargeDate, setFirstChargeDate] = useState(new Date().toISOString().split('T')[0]);
    const [cardId, setCardId] = useState('');
    const [clientId, setClientId] = useState('');
    const [isActive, setIsActive] = useState(true);
    const [invoiceDueDate, setInvoiceDueDate] = useState('');
    const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);
    const [subscriptionToDelete, setSubscriptionToDelete] = useState(null);

    useEffect(() => {
        if (!isAuthReady || !userId) return;
        const userCollectionPath = getUserCollectionPathSegments();
        const subsRef = collection(db, ...userCollectionPath, userId, 'subscriptions');
        const cardsRef = collection(db, ...userCollectionPath, userId, 'cards');
        const clientsRef = collection(db, ...userCollectionPath, userId, 'clients');

        const unsubSubs = onSnapshot(subsRef, (snapshot) => setSubscriptions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
        const unsubCards = onSnapshot(cardsRef, (snapshot) => setCards(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
        const unsubClients = onSnapshot(clientsRef, (snapshot) => setClients(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))));

        return () => { unsubSubs(); unsubCards(); unsubClients(); };
    }, [userId, db, isAuthReady, getUserCollectionPathSegments]);
    
    useEffect(() => {
        if (firstChargeDate && cardId && cards.length > 0) {
            const card = cards.find(c => c.id === cardId);
            if (card && card.closingDay && card.dueDay) {
                const chargeDate = new Date(firstChargeDate + "T12:00:00Z");
                let dueMonth = chargeDate.getUTCMonth();
                let dueYear = chargeDate.getUTCFullYear();

                if (card.closingDay < card.dueDay) {
                    if (chargeDate.getUTCDate() >= card.closingDay) {
                        dueMonth += 1;
                    }
                } else {
                    const closingDate = new Date(Date.UTC(chargeDate.getUTCFullYear(), chargeDate.getUTCMonth(), card.closingDay));
                    if (chargeDate >= closingDate) {
                        dueMonth += 2;
                    } else {
                        dueMonth += 1;
                    }
                }

                if (dueMonth > 11) {
                    dueYear += Math.floor(dueMonth / 12);
                    dueMonth %= 12;
                }
                
                const finalDueDate = new Date(Date.UTC(dueYear, dueMonth, card.dueDay));
                setInvoiceDueDate(finalDueDate.toISOString().split('T')[0]);
            }
        }
    }, [firstChargeDate, cardId, cards]);
    
    const handleOpenModal = (sub = null) => {
        const today = new Date().toISOString().split('T')[0];
        setCurrentSubscription(sub);

        // ✅ CORREÇÃO APLICADA AQUI:
        // Usamos `|| ''` e outros valores padrão para garantir que nenhum estado comece como `undefined`.
        setName(sub?.name || '');
        setAmountInput(sub ? formatCurrencyForInput(sub.amount) : '');
        setFirstChargeDate(sub?.firstChargeDate || today);
        setCardId(sub?.cardId || '');
        setClientId(sub?.clientId || '');
        setIsActive(sub?.isActive ?? true); // `?? true` lida com `false`, `undefined` e `null`
        
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setCurrentSubscription(null);
        setName('');
        setAmountInput('');
        setFirstChargeDate(new Date().toISOString().split('T')[0]);
        setCardId('');
        setClientId('');
        setIsActive(true);
        setInvoiceDueDate('');
    };

    const handleSaveSubscription = async () => {
        if (!name.trim() || !amountInput || !firstChargeDate || !cardId || !clientId) {
            showToast('Todos os campos são obrigatórios.', 'warning');
            return;
        }
        
        const amount = parseCurrencyInput(amountInput);
        if (isNaN(amount) || amount <= 0) {
            showToast('O valor da assinatura é inválido.', 'error');
            return;
        }

        const chargeDay = new Date(firstChargeDate + "T12:00:00Z").getUTCDate();
        if (isNaN(chargeDay)) {
            showToast('A data da primeira cobrança é inválida. Verifique o campo.', 'error');
            return;
        }

        const userCollectionPath = getUserCollectionPathSegments();
        const subscriptionData = {
            name,
            amount,
            firstChargeDate,
            dueDate: chargeDay,
            cardId,
            clientId,
            isActive,
            updatedAt: serverTimestamp()
        };

        try {
            if (currentSubscription) {
                const subDoc = doc(db, ...userCollectionPath, userId, 'subscriptions', currentSubscription.id);
                await updateDoc(subDoc, subscriptionData);
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

    const getCardName = (cId) => cards.find(card => card.id === cId)?.name || 'N/A';
    const getClientName = (cId) => clients.find(client => client.id === cId)?.name || 'N/A';

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
            <div className="overflow-x-auto">
                <table className="min-w-full bg-gray-800/50 rounded-lg">
                    <thead className="border-b border-gray-700">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Nome do Serviço</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Valor Mensal</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Pessoa</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Dia da Cobrança</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Cartão Vinculado</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                        {subscriptions.length > 0 ? subscriptions.map(sub => (
                             <tr key={sub.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">{sub.name}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-300">{formatCurrencyDisplay(sub.amount)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{getClientName(sub.clientId)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{sub.dueDate ? `Todo dia ${sub.dueDate}` : 'Data Inválida'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{getCardName(sub.cardId)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${sub.isActive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                        {sub.isActive ? 'Ativa' : 'Inativa'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                    <div className="flex items-center gap-4">
                                        <button onClick={() => handleOpenModal(sub)} className="text-purple-400 hover:text-purple-300 transition" title="Editar"><EditIcon /></button>
                                        <button onClick={() => confirmDeleteSubscription(sub.id)} className="text-red-500 hover:text-red-400 transition" title="Excluir"><DeleteIcon /></button>
                                    </div>
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan="7" className="text-center py-10 text-gray-500">
                                    Nenhuma assinatura cadastrada.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            
            <GenericModal isOpen={isModalOpen} onClose={handleCloseModal} title={currentSubscription ? 'Editar Assinatura' : 'Adicionar Assinatura'} theme="dark">
                <div className="space-y-4">
                     <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome (Ex: Netflix, Spotify)" className="w-full p-2 bg-gray-700 border-2 border-gray-600 rounded-md shadow-sm text-white focus:ring-purple-500 focus:border-purple-500 transition" />
                    <div className="relative">
                        <label className="block text-sm font-medium text-gray-300 mb-1">Valor Mensal</label>
                        <span className="absolute inset-y-0 left-0 top-6 flex items-center pl-3 text-gray-400">R$</span>
                        <input type="text" value={amountInput} onChange={handleCurrencyInputChange(setAmountInput)} placeholder="Valor Mensal" className="w-full p-2 pl-9 bg-gray-700 border-2 border-gray-600 rounded-md shadow-sm text-white focus:ring-purple-500 focus:border-purple-500 transition" inputMode="decimal" />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Data da Primeira Cobrança</label>
                        <input type="date" value={firstChargeDate} onChange={(e) => setFirstChargeDate(e.target.value)} className="w-full p-2 bg-gray-700 border-2 border-gray-600 rounded-md shadow-sm text-white focus:ring-purple-500 focus:border-purple-500 transition" />
                    </div>
                    <select value={clientId} onChange={(e) => setClientId(e.target.value)} className="w-full p-2 bg-gray-700 border-2 border-gray-600 rounded-md shadow-sm text-white focus:ring-purple-500 focus:border-purple-500 transition">
                        <option value="">Selecione uma Pessoa</option>
                        {clients.map(client => <option key={client.id} value={client.id}>{client.name}</option>)}
                    </select>
                    <select value={cardId} onChange={(e) => setCardId(e.target.value)} className="w-full p-2 bg-gray-700 border-2 border-gray-600 rounded-md shadow-sm text-white focus:ring-purple-500 focus:border-purple-500 transition">
                        <option value="">Selecione um Cartão para cobrança</option>
                        {cards.map(card => <option key={card.id} value={card.id}>{card.name}</option>)}
                    </select>
                    {invoiceDueDate && (
                        <div className="p-2 bg-gray-800 rounded-md text-sm text-gray-400 text-center">
                            Fatura com vencimento em: <span className="font-semibold text-white">{new Date(invoiceDueDate + 'T00:00:00').toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</span>
                        </div>
                    )}
                     <div className="flex items-center">
                        <input type="checkbox" id="isActiveSub" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="h-4 w-4 bg-gray-700 border-gray-600 text-purple-600 focus:ring-purple-500 rounded" />
                        <label htmlFor="isActiveSub" className="ml-2 text-sm text-gray-300">Assinatura Ativa</label>
                    </div>
                </div>
                <div className="mt-6 flex justify-end gap-4">
                    <button onClick={handleCloseModal} className="py-2 px-4 bg-gray-600 hover:bg-gray-700 rounded-md text-white transition">Cancelar</button>
                    <button onClick={handleSaveSubscription} className="py-2 px-4 bg-purple-600 hover:bg-purple-700 rounded-md text-white transition">Salvar</button>
                </div>
            </GenericModal>

            <GenericModal
                isOpen={isConfirmationModalOpen}
                onClose={() => setIsConfirmationModalOpen(false)}
                onConfirm={handleDeleteSubscriptionConfirmed}
                title="Confirmar Exclusão"
                message={`Tem certeza de que deseja excluir a assinatura "${subscriptions.find(s => s.id === subscriptionToDelete)?.name}"?`}
                isConfirmation={true}
                theme={theme}
            />
        </div>
    );
}