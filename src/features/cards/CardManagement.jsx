// src/features/cards/CardManagement.jsx

import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, updateDoc, addDoc, deleteDoc } from 'firebase/firestore';
import { useAppContext } from '../../context/AppContext';
import GenericModal from '../../components/GenericModal';
import { formatCurrencyDisplay, parseCurrencyInput, handleCurrencyInputChange, formatCurrencyForInput } from '../../utils/currency';

// --- Ícones ---
const EditIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const DeleteIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>;

export default function CardManagement() {
    const { userId, db, showToast, isAuthReady, getUserCollectionPathSegments, theme } = useAppContext();
    
    const [cards, setCards] = useState([]);
    const [allLoans, setAllLoans] = useState([]);
    const [allSubscriptions, setAllSubscriptions] = useState([]);
    const [allExpenses, setAllExpenses] = useState([]);
    
    const [cardName, setCardName] = useState('');
    const [cardLimitInput, setCardLimitInput] = useState('');
    const [closingDay, setClosingDay] = useState('');
    const [dueDay, setDueDay] = useState('');
    const [cardColor, setCardColor] = useState('#5E60CE');

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingCard, setEditingCard] = useState(null);
    const [editingValues, setEditingValues] = useState({ name: '', limitInput: '', closingDay: '', dueDay: '', color: '' });
    
    const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);
    const [cardToDelete, setCardToDelete] = useState(null);

    useEffect(() => {
        if (!isAuthReady || !userId) return;
        const userCollectionPath = getUserCollectionPathSegments();
        const cardsRef = collection(db, ...userCollectionPath, userId, 'cards');
        const loansColRef = collection(db, ...userCollectionPath, userId, 'loans');
        const subsColRef = collection(db, ...userCollectionPath, userId, 'subscriptions');
        const expensesColRef = collection(db, ...userCollectionPath, userId, 'expenses');

        const unsubCards = onSnapshot(cardsRef, (snapshot) => {
            // ✅ NOVO LOG DE DEBUG AQUI
            console.log("DATABASE SYNC: 'onSnapshot' para cartões foi acionado!");
            const updatedCards = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            console.log("DATABASE SYNC: Novos dados dos cartões recebidos:", updatedCards);
            setCards(updatedCards);
        });

        const unsubLoans = onSnapshot(loansColRef, (snapshot) => setAllLoans(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
        const unsubSubs = onSnapshot(subsColRef, (snapshot) => setAllSubscriptions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
        const unsubExpenses = onSnapshot(expensesColRef, (snapshot) => setAllExpenses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))));

        return () => { unsubCards(); unsubLoans(); unsubSubs(); unsubExpenses(); };
    }, [userId, db, isAuthReady, getUserCollectionPathSegments]);

    const calculateCurrentMonthInvoiceForCard = (card) => {
        if (!card || !card.closingDay) return 0;
        const today = new Date();
        let targetInvoiceMonth = today.getMonth();
        let targetInvoiceYear = today.getFullYear();
        if (today.getDate() >= card.closingDay) {
            targetInvoiceMonth += 1;
            if (targetInvoiceMonth > 11) {
                targetInvoiceMonth = 0;
                targetInvoiceYear += 1;
            }
        }
        let totalInvoice = 0;
        allLoans.forEach(loan => {
            if (loan.cardId === card.id && Array.isArray(loan.installments)) {
                loan.installments.forEach(inst => {
                    const dueDate = new Date(inst.dueDate + "T00:00:00");
                    if (dueDate.getMonth() === targetInvoiceMonth && dueDate.getFullYear() === targetInvoiceYear) {
                        totalInvoice += inst.value;
                    }
                });
            }
        });
        allExpenses.forEach(expense => {
            if (expense.cardId === card.id) {
                const expenseDate = new Date(expense.date + "T00:00:00");
                let expenseInvoiceMonth = expenseDate.getMonth();
                let expenseInvoiceYear = expenseDate.getFullYear();
                if (expenseDate.getDate() >= card.closingDay) {
                    expenseInvoiceMonth += 1;
                    if (expenseInvoiceMonth > 11) {
                        expenseInvoiceMonth = 0;
                        expenseInvoiceYear += 1;
                    }
                }
                if (expenseInvoiceMonth === targetInvoiceMonth && expenseInvoiceYear === targetInvoiceYear) {
                    totalInvoice += expense.value;
                }
            }
        });
        const closingDate = new Date(Date.UTC(targetInvoiceYear, targetInvoiceMonth - 1, card.closingDay));
        const periodStartDate = new Date(Date.UTC(targetInvoiceYear, targetInvoiceMonth - 2, card.closingDay));
        allSubscriptions.forEach(sub => {
            if (sub.cardId === card.id && sub.isActive) {
                const chargeDateInClosingMonth = new Date(Date.UTC(closingDate.getUTCFullYear(), closingDate.getUTCMonth(), sub.dueDate));
                if (chargeDateInClosingMonth > periodStartDate && chargeDateInClosingMonth <= closingDate) {
                    totalInvoice += sub.amount;
                    return;
                }
                const chargeDateInStartMonth = new Date(Date.UTC(periodStartDate.getUTCFullYear(), periodStartDate.getUTCMonth(), sub.dueDate));
                if (chargeDateInStartMonth > periodStartDate && chargeDateInStartMonth <= closingDate) {
                     totalInvoice += sub.amount;
                }
            }
        });
        return totalInvoice;
    };

    const calculateTotalDebtForCard = (cardId) => {
        return allLoans
            .filter(loan => loan.cardId === cardId)
            .reduce((sum, loan) => sum + (loan.balanceDueClient || 0), 0);
    };

    const handleOpenEditModal = (card) => {
        setEditingCard(card);
        setEditingValues({
            name: card.name,
            limitInput: formatCurrencyForInput(card.limit),
            closingDay: card.closingDay,
            dueDay: card.dueDay,
            color: card.color || '#5E60CE'
        });
        setIsEditModalOpen(true);
    };

    const handleCloseEditModal = () => {
        setIsEditModalOpen(false);
        setEditingCard(null);
    };
    
    const handleAddCard = async (e) => {
        e.preventDefault();
        if (!cardName.trim() || !cardLimitInput || !closingDay || !dueDay) {
            showToast('Todos os campos são obrigatórios.', 'warning');
            return;
        }
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
            color: cardColor,
            userId
        };
        try {
            const cardsRef = collection(db, ...userCollectionPath, userId, 'cards');
            await addDoc(cardsRef, cardData);
            showToast('Cartão adicionado com sucesso!', 'success');
            setCardName('');
            setCardLimitInput('');
            setClosingDay('');
            setDueDay('');
            setCardColor('#5E60CE');
        } catch (error) {
            console.error("Erro ao adicionar cartão:", error);
            showToast('Erro ao adicionar cartão. Tente novamente.', 'error');
        }
    };
    
    const handleUpdateCard = async () => {
        console.log("1. 'handleUpdateCard' foi chamada.");
        console.log("2. Cartão sendo editado:", editingCard);
        console.log("3. Valores do formulário para salvar:", editingValues);

        if (!editingCard || !editingValues.name.trim() || !editingValues.limitInput || !editingValues.closingDay || !editingValues.dueDay) {
            showToast('Todos os campos são obrigatórios.', 'warning');
            console.error("Falha na validação: um campo obrigatório está vazio.");
            return;
        }

        const cardLimit = parseCurrencyInput(editingValues.limitInput);
        if (isNaN(cardLimit) || cardLimit <= 0) {
            showToast('O limite do cartão deve ser um número válido e maior que zero.', 'error');
            console.error("Falha na validação: limite do cartão é inválido.", editingValues.limitInput);
            return;
        }
        
        const userCollectionPath = getUserCollectionPathSegments();
        const cardData = {
            name: editingValues.name,
            limit: cardLimit,
            closingDay: parseInt(editingValues.closingDay),
            dueDay: parseInt(editingValues.dueDay),
            color: editingValues.color
        };
        
        console.log("4. Objeto de dados que será enviado para o Firestore:", cardData);

        try {
            const cardDocRef = doc(db, ...userCollectionPath, userId, 'cards', editingCard.id);
            console.log("5. Caminho do documento no Firestore:", cardDocRef.path);

            await updateDoc(cardDocRef, cardData);
            
            console.log("6. Atualização no Firestore bem-sucedida!");
            showToast('Cartão atualizado com sucesso!', 'success');
            handleCloseEditModal();
        } catch (error) {
            console.error("7. OCORREU UM ERRO na atualização do Firestore:", error);
            showToast('Erro ao atualizar o cartão. Tente novamente.', 'error');
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
    
    return (
        <div className="p-6 bg-gray-900/50 border border-gray-800 rounded-lg">
            <h1 className="text-2xl font-bold text-white mb-6">Gerenciar Cartões de Crédito</h1>

            <form onSubmit={handleAddCard} className="space-y-4 mb-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    <input type="text" placeholder="Nome do Cartão" value={cardName} onChange={(e) => setCardName(e.target.value)} className="w-full p-3 bg-gray-700 border-2 border-gray-600 rounded-lg" />
                    <input type="text" placeholder="Limite Total" value={cardLimitInput} onChange={handleCurrencyInputChange(setCardLimitInput)} className="w-full p-3 bg-gray-700 border-2 border-gray-600 rounded-lg" inputMode="decimal" />
                    <input type="number" placeholder="Dia Fechamento" value={closingDay} onChange={(e) => setClosingDay(e.target.value)} className="w-full p-3 bg-gray-700 border-2 border-gray-600 rounded-lg" min="1" max="31" />
                    <input type="number" placeholder="Dia Vencimento" value={dueDay} onChange={(e) => setDueDay(e.target.value)} className="w-full p-3 bg-gray-700 border-2 border-gray-600 rounded-lg" min="1" max="31" />
                    <input type="color" value={cardColor} onChange={(e) => setCardColor(e.target.value)} className="w-full h-full p-1 bg-gray-700 border-2 border-gray-600 rounded-lg cursor-pointer" title="Escolha uma cor para o cartão" />
                </div>
                <div className="flex justify-end">
                    <button type="submit" className="bg-purple-600 text-white font-semibold py-2 px-6 rounded-lg shadow-md hover:bg-purple-700 transition">
                        Adicionar Cartão
                    </button>
                </div>
            </form>

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
                        {cards.length > 0 ? cards.map((card) => {
                            const totalDebt = calculateTotalDebtForCard(card.id);
                            const limit = card.limit || 0;
                            const usedPercentage = limit > 0 ? (totalDebt / limit) * 100 : 0;
                            
                            return (
                                <tr key={card.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white flex items-center">
                                        <span className="w-4 h-4 rounded-sm mr-3 border border-white/20" style={{ backgroundColor: card.color }}></span>
                                        {card.name}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                                        <div>{formatCurrencyDisplay(limit)}</div>
                                        <div className="w-full bg-gray-700 rounded-full h-2 my-1">
                                            <div 
                                                className="bg-purple-600 h-2 rounded-full" 
                                                style={{ width: `${usedPercentage > 100 ? 100 : usedPercentage}%` }}
                                            ></div>
                                        </div>
                                        <div className="text-xs text-gray-400">
                                            Usado: {formatCurrencyDisplay(totalDebt)}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300 font-bold">{formatCurrencyDisplay(calculateCurrentMonthInvoiceForCard(card))}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{`Dia ${card.closingDay} / Dia ${card.dueDay}`}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <div className="flex items-center gap-4">
                                            <button onClick={() => handleOpenEditModal(card)} className="text-purple-400 hover:text-purple-300 transition" title="Editar"><EditIcon /></button>
                                            <button onClick={() => confirmDeleteCard(card.id)} className="text-red-500 hover:text-red-400 transition" title="Excluir"><DeleteIcon /></button>
                                        </div>
                                    </td>
                                </tr>
                            )
                        }) : (
                            <tr>
                                <td colSpan="5" className="text-center py-10 text-gray-500">
                                    Nenhum cartão cadastrado ainda.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            
            <GenericModal isOpen={isEditModalOpen} onClose={handleCloseEditModal} title={'Editar Cartão'} theme="dark">
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Nome do Cartão</label>
                        <input type="text" value={editingValues.name} onChange={(e) => setEditingValues({...editingValues, name: e.target.value})} className="w-full p-2 bg-gray-700 border-2 border-gray-600 rounded-md" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Limite do Cartão</label>
                        <div className="relative">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">R$</span>
                            <input type="text" value={editingValues.limitInput} onChange={handleCurrencyInputChange(val => setEditingValues({...editingValues, limitInput: val}))} className="w-full p-2 pl-9 bg-gray-700 border-2 border-gray-600 rounded-md" inputMode="decimal" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Dia de Fechamento</label>
                            <input type="number" value={editingValues.closingDay} onChange={(e) => setEditingValues({...editingValues, closingDay: e.target.value})} className="w-full p-2 bg-gray-700 border-2 border-gray-600 rounded-md" min="1" max="31" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Dia de Vencimento</label>
                            <input type="number" value={editingValues.dueDay} onChange={(e) => setEditingValues({...editingValues, dueDay: e.target.value})} className="w-full p-2 bg-gray-700 border-2 border-gray-600 rounded-md" min="1" max="31" />
                        </div>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Cor do Cartão</label>
                        <input type="color" value={editingValues.color} onChange={(e) => setEditingValues({...editingValues, color: e.target.value})} className="w-full h-10 p-1 bg-gray-700 border-2 border-gray-600 rounded-md" />
                    </div>
                </div>
                <div className="mt-6 flex justify-end gap-4">
                    <button onClick={handleCloseEditModal} className="py-2 px-4 bg-gray-600 hover:bg-gray-700 rounded-md text-white transition">Cancelar</button>
                    <button onClick={handleUpdateCard} className="py-2 px-4 bg-purple-600 hover:bg-purple-700 rounded-md text-white transition">Salvar</button>
                </div>
            </GenericModal>

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