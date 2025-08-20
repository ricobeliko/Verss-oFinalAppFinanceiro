// src/features/cards/CardManagement.jsx

import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, updateDoc, addDoc, deleteDoc } from 'firebase/firestore';
import { useAppContext } from '../../context/AppContext';
import GenericModal from '../../components/GenericModal';
// ✅ 1. IMPORTAÇÕES CORRIGIDAS E ADICIONADAS
import { formatCurrencyDisplay, parseCurrencyInput, handleCurrencyInputChange } from '../../utils/currency';

const EditIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const DeleteIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>;

export default function CardManagement() {
    // ✅ 2. OBTENDO MAIS DADOS DO CONTEXTO
    const { userId, db, showToast, isAuthReady, getUserCollectionPathSegments, theme } = useAppContext();
    
    // Estados do formulário e dados
    const [cards, setCards] = useState([]);
    const [allLoans, setAllLoans] = useState([]);
    const [allSubscriptions, setAllSubscriptions] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentCard, setCurrentCard] = useState(null);

    // Campos do formulário (com os campos que faltavam)
    const [cardName, setCardName] = useState('');
    const [cardLimitInput, setCardLimitInput] = useState('');
    const [closingDay, setClosingDay] = useState('');
    const [dueDay, setDueDay] = useState('');
    const [cardColor, setCardColor] = useState('#5E60CE');
    
    // Estados para o modal de exclusão
    const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);
    const [cardToDelete, setCardToDelete] = useState(null);

    // Efeito para buscar os cartões
    useEffect(() => {
        if (!isAuthReady || !userId) return;
        const userCollectionPath = getUserCollectionPathSegments();
        const cardsRef = collection(db, ...userCollectionPath, userId, 'cards');
        const unsubscribe = onSnapshot(cardsRef, (snapshot) => {
            setCards(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return () => unsubscribe();
    }, [userId, db, isAuthReady, getUserCollectionPathSegments]);

    // Efeito para buscar todas as compras e assinaturas (necessário para o cálculo da fatura)
    useEffect(() => {
        if (!isAuthReady || !db || !userId) return;
        const userCollectionPath = getUserCollectionPathSegments();
        
        const loansColRef = collection(db, ...userCollectionPath, userId, 'loans');
        const unsubscribeLoans = onSnapshot(loansColRef, (snapshot) => {
            setAllLoans(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        const subsColRef = collection(db, ...userCollectionPath, userId, 'subscriptions');
        const unsubscribeSubs = onSnapshot(subsColRef, (snapshot) => {
            setAllSubscriptions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        return () => {
            unsubscribeLoans();
            unsubscribeSubs();
        };
    }, [db, userId, isAuthReady, getUserCollectionPathSegments]);

    const handleOpenModal = (card = null) => {
        setCurrentCard(card);
        setCardName(card ? card.name : '');
        setCardLimitInput(card ? formatCurrencyDisplay(card.limit).replace('R$ ', '') : '');
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
            showToast('Todos os campos são obrigatórios.', 'error');
            return;
        }
        
        const cardLimit = parseCurrencyInput(cardLimitInput);
        if (isNaN(cardLimit)) {
            showToast('O limite do cartão deve ser um número.', 'error');
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

    // ✅ 3. LÓGICA DE EXCLUSÃO USANDO O MODAL
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
    
    // ✅ 4. FUNÇÃO DE CÁLCULO DA FATURA RESTAURADA
    const calculateCurrentMonthInvoiceForCard = (card) => {
        if (!card) return 0;
    
        const today = new Date();
        const currentYear = today.getFullYear();
        let invoiceMonth = today.getMonth();
    
        if (today.getDate() >= card.closingDay) {
            invoiceMonth += 1;
            if (invoiceMonth > 11) {
                invoiceMonth = 0; 
            }
        }
        
        let totalInvoice = 0;
    
        allLoans.forEach(loan => {
            if (loan.cardId === card.id) {
                const installments = loan.isShared 
                    ? [...(loan.sharedDetails.person1?.installments || []), ...(loan.sharedDetails.person2?.installments || [])]
                    : (loan.installments || []);
                
                installments.forEach(inst => {
                    const dueDate = new Date(inst.dueDate + 'T00:00:00');
                    if (dueDate.getFullYear() === currentYear && dueDate.getMonth() === invoiceMonth) {
                        totalInvoice += inst.value;
                    }
                });
            }
        });
    
        allSubscriptions.forEach(sub => {
            if (sub.cardId === card.id && sub.status === 'Ativa') {
                const startDate = new Date(sub.startDate + 'T00:00:00');
                if (startDate.getFullYear() < currentYear || (startDate.getFullYear() === currentYear && startDate.getMonth() <= invoiceMonth)) {
                    totalInvoice += sub.value;
                }
            }
        });
    
        return totalInvoice;
    };


    return (
        <div className="p-6 bg-gray-900/50 border border-gray-800 rounded-lg">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-white">Gerenciamento de Cartões</h1>
                <button onClick={() => handleOpenModal()} className="bg-purple-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md hover:bg-purple-700 transition">Adicionar Cartão</button>
            </div>
            <div className="overflow-x-auto">
                {/* ✅ 5. TABELA ATUALIZADA COM NOVAS COLUNAS */}
                <table className="min-w-full bg-gray-800/50 rounded-lg">
                    <thead>
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Nome do Cartão</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Limite</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Fatura (Mês Atual)</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Fechamento / Vencimento</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                        {cards.map((card) => (
                            <tr key={card.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white flex items-center">
                                    <span className="w-4 h-4 rounded-sm mr-3" style={{ backgroundColor: card.color }}></span>
                                    {card.name}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{formatCurrencyDisplay(card.limit)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300 font-bold">{formatCurrencyDisplay(calculateCurrentMonthInvoiceForCard(card))}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{`Dia ${card.closingDay} / Dia ${card.dueDay}`}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                    <div className="flex items-center gap-4">
                                        <button onClick={() => handleOpenModal(card)} className="text-purple-400 hover:text-purple-300 transition"><EditIcon /></button>
                                        <button onClick={() => confirmDeleteCard(card.id)} className="text-red-500 hover:text-red-400 transition"><DeleteIcon /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            
            {/* ✅ 6. MODAL ATUALIZADO COM NOVOS CAMPOS */}
            <GenericModal isOpen={isModalOpen} onClose={handleCloseModal} title={currentCard ? 'Editar Cartão' : 'Adicionar Cartão'} theme="dark">
                <div className="space-y-4">
                    <div>
                        <label htmlFor="cardName" className="block text-sm font-medium text-gray-300 mb-1">Nome do Cartão</label>
                        <input type="text" id="cardName" value={cardName} onChange={(e) => setCardName(e.target.value)} className="w-full p-2 bg-gray-700 border-gray-600 rounded-md shadow-sm text-white focus:ring-purple-500 focus:border-purple-500" placeholder="Ex: Cartão Principal" />
                    </div>
                    <div>
                        <label htmlFor="cardLimit" className="block text-sm font-medium text-gray-300 mb-1">Limite do Cartão</label>
                        <input type="text" id="cardLimit" value={cardLimitInput} onChange={handleCurrencyInputChange(setCardLimitInput)} className="w-full p-2 bg-gray-700 border-gray-600 rounded-md shadow-sm text-white focus:ring-purple-500 focus:border-purple-500" placeholder="Ex: 5000,00" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="closingDay" className="block text-sm font-medium text-gray-300 mb-1">Dia de Fechamento</label>
                            <input type="number" id="closingDay" value={closingDay} onChange={(e) => setClosingDay(e.target.value)} className="w-full p-2 bg-gray-700 border-gray-600 rounded-md shadow-sm text-white focus:ring-purple-500 focus:border-purple-500" min="1" max="31" />
                        </div>
                        <div>
                            <label htmlFor="dueDay" className="block text-sm font-medium text-gray-300 mb-1">Dia de Vencimento</label>
                            <input type="number" id="dueDay" value={dueDay} onChange={(e) => setDueDay(e.target.value)} className="w-full p-2 bg-gray-700 border-gray-600 rounded-md shadow-sm text-white focus:ring-purple-500 focus:border-purple-500" min="1" max="31" />
                        </div>
                    </div>
                     <div>
                        <label htmlFor="cardColor" className="block text-sm font-medium text-gray-300 mb-1">Cor do Cartão</label>
                        <input type="color" id="cardColor" value={cardColor} onChange={(e) => setCardColor(e.target.value)} className="w-full h-10 p-1 bg-gray-700 border-gray-600 rounded-md cursor-pointer" />
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
                message={`Tem certeza que deseja deletar o cartão "${cards.find(c => c.id === cardToDelete)?.name}"?`}
                isConfirmation={true}
                theme={theme}
            />
        </div>
    );
}