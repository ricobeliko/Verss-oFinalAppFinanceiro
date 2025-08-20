import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, doc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { useAppContext } from '../../context/AppContext';
// ✅ 1. IMPORTAÇÕES CORRIGIDAS
import { formatCurrencyDisplay, parseCurrencyInput, handleCurrencyInputChange } from '../../utils/currency';
import GenericModal from '../../components/GenericModal';

function SubscriptionManagement() {
    const { db, userId, isAuthReady, getUserCollectionPathSegments, theme, showToast, isPro } = useAppContext();

    const [subscriptions, setSubscriptions] = useState([]);
    const [cards, setCards] = useState([]);
    const [clients, setClients] = useState([]);
    const [description, setDescription] = useState('');
    const [valueInput, setValueInput] = useState('');
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedCard, setSelectedCard] = useState('');
    const [selectedClient, setSelectedClient] = useState('');
    const [status, setStatus] = useState('Ativa');
    const [editingSubscription, setEditingSubscription] = useState(null);
    const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);
    const [subscriptionToDelete, setSubscriptionToDelete] = useState(null);

    useEffect(() => {
        if (!isAuthReady || !db || !userId) return;
        const userCollectionPath = getUserCollectionPathSegments();
        
        const subscriptionsColRef = collection(db, ...userCollectionPath, userId, 'subscriptions');
        const q = query(subscriptionsColRef, orderBy("startDate", "desc"));
        const unsubscribeSubscriptions = onSnapshot(q, (snapshot) => {
            setSubscriptions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        const cardsColRef = collection(db, ...userCollectionPath, userId, 'cards');
        const unsubscribeCards = onSnapshot(cardsColRef, (snapshot) => {
            setCards(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        const clientsColRef = collection(db, ...userCollectionPath, userId, 'clients');
        const unsubscribeClients = onSnapshot(clientsColRef, (snapshot) => {
            setClients(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        return () => {
            unsubscribeSubscriptions();
            unsubscribeCards();
            unsubscribeClients();
        };
    }, [db, userId, isAuthReady, getUserCollectionPathSegments]);

    const resetForm = () => {
        setDescription('');
        setValueInput('');
        setStartDate(new Date().toISOString().split('T')[0]);
        setSelectedCard('');
        setSelectedClient('');
        setStatus('Ativa');
        setEditingSubscription(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!isPro) {
            showToast('Funcionalidade Pro. Faça upgrade para continuar.', 'warning');
            return;
        }
        const value = parseCurrencyInput(valueInput);
        if (!description.trim() || !value || !startDate || !selectedCard || !selectedClient) {
            showToast('Por favor, preencha todos os campos obrigatórios.', 'warning');
            return;
        }
        const userCollectionPath = getUserCollectionPathSegments();
        const subscriptionData = { description, value, startDate, cardId: selectedCard, clientId: selectedClient, status };
        try {
            if (editingSubscription) {
                await updateDoc(doc(db, ...userCollectionPath, userId, 'subscriptions', editingSubscription.id), subscriptionData);
                showToast("Assinatura atualizada com sucesso!", "success");
            } else {
                await addDoc(collection(db, ...userCollectionPath, userId, 'subscriptions'), { ...subscriptionData, createdAt: new Date() });
                showToast("Assinatura adicionada com sucesso!", "success");
            }
            resetForm();
        } catch (error) {
            console.error("Erro ao salvar assinatura:", error);
            showToast(`Erro ao salvar assinatura: ${error.message}`, "error");
        }
    };

    const handleEdit = (subscription) => {
        setEditingSubscription(subscription);
        setDescription(subscription.description);
        // ✅ 2. USO CORRETO DA FUNÇÃO DE FORMATAÇÃO
        setValueInput(formatCurrencyDisplay(subscription.value).replace('R$ ', ''));
        setStartDate(subscription.startDate);
        setSelectedCard(subscription.cardId);
        setSelectedClient(subscription.clientId);
        setStatus(subscription.status);
    };

    const confirmDelete = (id) => {
        setSubscriptionToDelete(id);
        setIsConfirmationModalOpen(true);
    };

    const handleDeleteConfirmed = async () => {
        if (!subscriptionToDelete) return;
        const userCollectionPath = getUserCollectionPathSegments();
        try {
            await deleteDoc(doc(db, ...userCollectionPath, userId, 'subscriptions', subscriptionToDelete));
            showToast("Assinatura deletada com sucesso!", "success");
        } catch (error) {
            console.error("Erro ao deletar assinatura:", error);
            showToast(`Erro ao deletar assinatura: ${error.message}`, "error");
        } finally {
            setIsConfirmationModalOpen(false);
            setSubscriptionToDelete(null);
        }
    };

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md dark:shadow-lg relative">
            {!isPro && <div className="absolute inset-0 bg-gray-800 bg-opacity-50 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg"></div>}
            
            <h2 className="text-2xl font-semibold mb-4 text-gray-800 dark:text-gray-200">Gerenciar Assinaturas</h2>
            <form onSubmit={handleSubmit} className="mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
                <input type="text" placeholder="Descrição" value={description} onChange={(e) => setDescription(e.target.value)} className="p-3 border border-gray-300 rounded-lg bg-white text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-white" required />
                <input type="text" placeholder="Valor Mensal" value={valueInput} onChange={handleCurrencyInputChange(setValueInput)} className="p-3 border border-gray-300 rounded-lg bg-white text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-white" required />
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="p-3 border border-gray-300 rounded-lg bg-white text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-white" required />
                <select value={selectedCard} onChange={(e) => setSelectedCard(e.target.value)} className="p-3 border border-gray-300 rounded-lg bg-white text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-white" required>
                    <option value="">Selecione o Cartão</option>
                    {cards.map(card => <option key={card.id} value={card.id}>{card.name}</option>)}
                </select>
                <select value={selectedClient} onChange={(e) => setSelectedClient(e.target.value)} className="p-3 border border-gray-300 rounded-lg bg-white text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-white" required>
                    <option value="">Selecione a Pessoa</option>
                    {clients.map(client => <option key={client.id} value={client.id}>{client.name}</option>)}
                </select>
                <select value={status} onChange={(e) => setStatus(e.target.value)} className="p-3 border border-gray-300 rounded-lg bg-white text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                    <option value="Ativa">Ativa</option>
                    <option value="Pausada">Pausada</option>
                    <option value="Cancelada">Cancelada</option>
                </select>
                <div className="col-span-full flex justify-end gap-4 mt-4">
                    <button type="submit" className="bg-purple-600 text-white py-3 px-6 rounded-lg hover:bg-purple-700" disabled={!isPro}>{editingSubscription ? 'Atualizar Assinatura' : 'Adicionar Assinatura'}</button>
                    {editingSubscription && (<button type="button" onClick={resetForm} className="bg-gray-400 text-white py-3 px-6 rounded-lg hover:bg-gray-500">Cancelar</button>)}
                </div>
            </form>
            <div className="overflow-x-auto">
                <table className="min-w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                            <th className="py-3 px-4 text-left text-sm font-medium text-gray-600 dark:text-gray-300 uppercase">Descrição</th>
                            <th className="py-3 px-4 text-left text-sm font-medium text-gray-600 dark:text-gray-300 uppercase">Valor</th>
                            <th className="py-3 px-4 text-left text-sm font-medium text-gray-600 dark:text-gray-300 uppercase">Data de Início</th>
                            <th className="py-3 px-4 text-left text-sm font-medium text-gray-600 dark:text-gray-300 uppercase">Pessoa</th>
                            <th className="py-3 px-4 text-left text-sm font-medium text-gray-600 dark:text-gray-300 uppercase">Cartão</th>
                            <th className="py-3 px-4 text-left text-sm font-medium text-gray-600 dark:text-gray-300 uppercase">Status</th>
                            <th className="py-3 px-4 text-left text-sm font-medium text-gray-600 dark:text-gray-300 uppercase">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {subscriptions.map((subscription) => (
                            <tr key={subscription.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                <td className="py-3 px-4 whitespace-nowrap">{subscription.description}</td>
                                {/* ✅ 3. USO CORRETO DA FUNÇÃO DE FORMATAÇÃO */}
                                <td className="py-3 px-4 whitespace-nowrap">{formatCurrencyDisplay(subscription.value)}</td>
                                <td className="py-3 px-4 whitespace-nowrap">{new Date(subscription.startDate + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                                <td className="py-3 px-4 whitespace-nowrap">{clients.find(c => c.id === subscription.clientId)?.name || 'N/A'}</td>
                                <td className="py-3 px-4 whitespace-nowrap">{cards.find(c => c.id === subscription.cardId)?.name || 'N/A'}</td>
                                <td className="py-3 px-4 whitespace-nowrap">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                        subscription.status === 'Ativa' ? 'bg-green-100 text-green-800' :
                                        subscription.status === 'Pausada' ? 'bg-yellow-100 text-yellow-800' :
                                        'bg-red-100 text-red-800'
                                    }`}>
                                        {subscription.status}
                                    </span>
                                </td>
                                <td className="py-3 px-4 whitespace-nowrap flex items-center gap-2">
                                    <button onClick={() => handleEdit(subscription)} className="text-blue-600 hover:text-blue-900" disabled={!isPro}>Editar</button>
                                    <button onClick={() => confirmDelete(subscription.id)} className="text-red-600 hover:text-red-900" disabled={!isPro}>Deletar</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <GenericModal 
                isOpen={isConfirmationModalOpen} 
                onClose={() => setIsConfirmationModalOpen(false)} 
                onConfirm={handleDeleteConfirmed} 
                title="Confirmar Exclusão" 
                message="Tem certeza que deseja deletar esta assinatura?" 
                isConfirmation={true} 
                theme={theme} 
            />
        </div>
    );
}

export default SubscriptionManagement;
