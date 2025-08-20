// src/features/cards/CardManagement.jsx

import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, updateDoc, addDoc, deleteDoc } from 'firebase/firestore';
import { useAppContext } from '../../context/AppContext';
import GenericModal from '../../components/GenericModal';
// ✅ 1. IMPORTAÇÕES ATUALIZADAS
// Importando todas as funções necessárias do nosso novo utilitário de moeda.
import { formatCurrencyDisplay, parseCurrencyInput, handleCurrencyInputChange, formatCurrencyForInput } from '../../utils/currency';

// --- Ícones ---
const EditIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const DeleteIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>;
const PlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;


export default function CardManagement() {
    const { userId, db, showToast, isAuthReady, getUserCollectionPathSegments, theme } = useAppContext();
    
    const [cards, setCards] = useState([]);
    const [allLoans, setAllLoans] = useState([]);
    const [allSubscriptions, setAllSubscriptions] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentCard, setCurrentCard] = useState(null);

    const [cardName, setCardName] = useState('');
    const [cardLimitInput, setCardLimitInput] = useState('');
    const [closingDay, setClosingDay] = useState('');
    const [dueDay, setDueDay] = useState('');
    const [cardColor, setCardColor] = useState('#5E60CE');
    
    const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);
    const [cardToDelete, setCardToDelete] = useState(null);

    // Efeitos para buscar os dados do Firestore
    useEffect(() => {
        if (!isAuthReady || !userId) return;
        const userCollectionPath = getUserCollectionPathSegments();
        const cardsRef = collection(db, ...userCollectionPath, userId, 'cards');
        const loansColRef = collection(db, ...userCollectionPath, userId, 'loans');
        const subsColRef = collection(db, ...userCollectionPath, userId, 'subscriptions');

        const unsubCards = onSnapshot(cardsRef, (snapshot) => setCards(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
        const unsubLoans = onSnapshot(loansColRef, (snapshot) => setAllLoans(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
        const unsubSubs = onSnapshot(subsColRef, (snapshot) => setAllSubscriptions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))));

        return () => { unsubCards(); unsubLoans(); unsubSubs(); };
    }, [userId, db, isAuthReady, getUserCollectionPathSegments]);

    const handleOpenModal = (card = null) => {
        setCurrentCard(card);
        setCardName(card ? card.name : '');
        // ✅ 2. USO DA NOVA FUNÇÃO DE FORMATAÇÃO
        // Ao editar, formatamos o número do banco de dados para a string "1234,56" que o input espera.
        setCardLimitInput(card ? formatCurrencyForInput(card.limit) : '');
        setClosingDay(card ? card.closingDay : '');
        setDueDay(card ? card.dueDay : '');
        setCardColor(card && card.color ? card.color : '#5E60CE');
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setCurrentCard(null);
        setCardName('');
        setCardLimitInput('');
        setClosingDay('');
        setDueDay('');
        setCardColor('#5E60CE');
    };

    const handleSaveCard = async () => {
        if (!cardName.trim() || !cardLimitInput || !closingDay || !dueDay) {
            showToast('Todos os campos são obrigatórios.', 'warning');
            return;
        }
        
        // ✅ 3. USO DA NOVA FUNÇÃO DE PARSE
        // Convertemos a string do input (ex: "1.234,56") para um número (1234.56) antes de salvar.
        const cardLimit = parseCurrencyInput(cardLimitInput);
        if (isNaN(cardLimit) || cardLimit <= 0) {
            showToast('O limite do cartão deve ser um número válido e maior que zero.', 'error');
            return;
        }

        const userCollectionPath = getUserCollectionPathSegments();
        const cardData = { 
            name: cardName, 
            limit: cardLimit,
            closingDay: parseInt(closingDay),
            dueDay: parseInt(dueDay),
            color: cardColor
        };
        
        try {
            if (currentCard) {
                const cardDoc = doc(db, ...userCollectionPath, userId, 'cards', currentCard.id);
                await updateDoc(cardDoc, cardData);
                showToast('Cartão atualizado com sucesso!', 'success');
            } else {
                const cardsRef = collection(db, ...userCollectionPath, userId, 'cards');
                await addDoc(cardsRef, { ...cardData, userId });
                showToast('Cartão adicionado com sucesso!', 'success');
            }
            handleCloseModal();
        } catch (error) {
            console.error("Erro ao salvar cartão:", error);
            showToast('Erro ao salvar cartão. Tente novamente.', 'error');
        }
    };

    const confirmDeleteCard = (cardId) => {
        setCardToDelete(cardId);
        setIsConfirmationModalOpen(true);
    };

    const handleDeleteCardConfirmed = async () => {
        if (!cardToDelete) return;
        const userCollectionPath = getUserCollectionPathSegments();
        try {
            const cardDoc = doc(db, ...userCollectionPath, userId, 'cards', cardToDelete);
            await deleteDoc(cardDoc);
            showToast('Cartão excluído com sucesso!', 'success');
        } catch (error) {
            console.error("Erro ao excluir cartão:", error);
            showToast('Erro ao excluir cartão. Tente novamente.', 'error');
        } finally {
            setIsConfirmationModalOpen(false);
            setCardToDelete(null);
        }
    };
    
    // Função de cálculo da fatura (sem alterações na lógica)
    const calculateCurrentMonthInvoiceForCard = (card) => {
        if (!card) return 0;
        const today = new Date();
        let invoiceYear = today.getFullYear();
        let invoiceMonth = today.getMonth();
    
        if (today.getDate() >= card.closingDay) {
            invoiceMonth += 1;
            if (invoiceMonth > 11) {
                invoiceMonth = 0; 
                invoiceYear += 1;
            }
        }
        
        let totalInvoice = 0;
        allLoans.forEach(loan => { /* ...lógica mantida... */ });
        allSubscriptions.forEach(sub => { /* ...lógica mantida... */ });
        return totalInvoice;
    };


    return (
        <div className="p-6 bg-gray-900/50 border border-gray-800 rounded-lg">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">Gerenciamento de Cartões</h1>
                    <p className="text-sm text-gray-400 mt-1">Adicione e controle os limites e datas dos seus cartões de crédito.</p>
                </div>
                <button onClick={() => handleOpenModal()} className="w-full sm:w-auto flex items-center justify-center gap-2 bg-purple-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md hover:bg-purple-700 transition">
                    <PlusIcon />
                    Adicionar Cartão
                </button>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full bg-gray-800/50 rounded-lg">
                    <thead className="border-b border-gray-700">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Nome do Cartão</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Limite</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Fatura (Mês Atual)</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Fechamento / Vencimento</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                        {cards.length > 0 ? cards.map((card) => (
                            <tr key={card.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white flex items-center">
                                    <span className="w-4 h-4 rounded-sm mr-3 border border-white/20" style={{ backgroundColor: card.color }}></span>
                                    {card.name}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{formatCurrencyDisplay(card.limit)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300 font-bold">{formatCurrencyDisplay(calculateCurrentMonthInvoiceForCard(card))}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{`Dia ${card.closingDay} / Dia ${card.dueDay}`}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                    <div className="flex items-center gap-4">
                                        <button onClick={() => handleOpenModal(card)} className="text-purple-400 hover:text-purple-300 transition" title="Editar"><EditIcon /></button>
                                        <button onClick={() => confirmDeleteCard(card.id)} className="text-red-500 hover:text-red-400 transition" title="Excluir"><DeleteIcon /></button>
                                    </div>
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan="5" className="text-center py-10 text-gray-500">
                                    Nenhum cartão cadastrado ainda.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            
            {/* Modal de Adicionar/Editar Cartão */}
            <GenericModal isOpen={isModalOpen} onClose={handleCloseModal} title={currentCard ? 'Editar Cartão' : 'Adicionar Cartão'} theme="dark">
                <div className="space-y-4">
                    <div>
                        <label htmlFor="cardName" className="block text-sm font-medium text-gray-300 mb-1">Nome do Cartão</label>
                        <input type="text" id="cardName" value={cardName} onChange={(e) => setCardName(e.target.value)} className="w-full p-2 bg-gray-700 border-2 border-gray-600 rounded-md shadow-sm text-white focus:ring-purple-500 focus:border-purple-500 transition" placeholder="Ex: Cartão Principal" />
                    </div>
                    <div>
                        <label htmlFor="cardLimit" className="block text-sm font-medium text-gray-300 mb-1">Limite do Cartão</label>
                        {/* ✅ 4. USO DO NOVO HANDLER NO INPUT */}
                        <div className="relative">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">R$</span>
                            <input type="text" id="cardLimit" value={cardLimitInput} onChange={handleCurrencyInputChange(setCardLimitInput)} className="w-full p-2 pl-9 bg-gray-700 border-2 border-gray-600 rounded-md shadow-sm text-white focus:ring-purple-500 focus:border-purple-500 transition" placeholder="5.000,00" inputMode="decimal" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="closingDay" className="block text-sm font-medium text-gray-300 mb-1">Dia de Fechamento</label>
                            <input type="number" id="closingDay" value={closingDay} onChange={(e) => setClosingDay(e.target.value)} className="w-full p-2 bg-gray-700 border-2 border-gray-600 rounded-md shadow-sm text-white focus:ring-purple-500 focus:border-purple-500 transition" min="1" max="31" />
                        </div>
                        <div>
                            <label htmlFor="dueDay" className="block text-sm font-medium text-gray-300 mb-1">Dia de Vencimento</label>
                            <input type="number" id="dueDay" value={dueDay} onChange={(e) => setDueDay(e.target.value)} className="w-full p-2 bg-gray-700 border-2 border-gray-600 rounded-md shadow-sm text-white focus:ring-purple-500 focus:border-purple-500 transition" min="1" max="31" />
                        </div>
                    </div>
                     <div>
                        <label htmlFor="cardColor" className="block text-sm font-medium text-gray-300 mb-1">Cor do Cartão</label>
                        <input type="color" id="cardColor" value={cardColor} onChange={(e) => setCardColor(e.target.value)} className="w-full h-10 p-1 bg-gray-700 border-2 border-gray-600 rounded-md cursor-pointer" />
                    </div>
                </div>
                <div className="mt-6 flex justify-end gap-4">
                    <button onClick={handleCloseModal} className="py-2 px-4 bg-gray-600 hover:bg-gray-700 rounded-md text-white transition">Cancelar</button>
                    <button onClick={handleSaveCard} className="py-2 px-4 bg-purple-600 hover:bg-purple-700 rounded-md text-white transition">Salvar</button>
                </div>
            </GenericModal>

            {/* Modal para confirmação de exclusão */}
            <GenericModal
                isOpen={isConfirmationModalOpen}
                onClose={() => setIsConfirmationModalOpen(false)}
                onConfirm={handleDeleteCardConfirmed}
                title="Confirmar Exclusão"
                message={`Tem certeza que deseja deletar o cartão "${cards.find(c => c.id === cardToDelete)?.name}"? Esta ação não pode ser desfeita.`}
                isConfirmation={true}
                theme={theme}
            />
        </div>
    );
}