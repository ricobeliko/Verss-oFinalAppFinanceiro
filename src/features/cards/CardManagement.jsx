// src/features/cards/CardManagement.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { collection, onSnapshot, doc, updateDoc, addDoc, deleteDoc } from 'firebase/firestore';
import { useAppContext } from '../../context/AppContext';
import GenericModal from '../../components/GenericModal';
import CarbonCard from '../../components/CarbonCard';
import { formatCurrencyDisplay, parseCurrencyInput, handleCurrencyInputChange, formatCurrencyForInput } from '../../utils/currency';

// --- Ícones ---
const EditIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const DeleteIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>;
const PlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;
const CheckCircleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>;

// Função de cálculo de data da fatura, 100% alinhada com o Dashboard
const getInvoiceDueDate = (transactionDate, card) => {
    if (!card || !card.closingDay || !card.dueDay) return transactionDate;
    let dueMonth = transactionDate.getUTCMonth();
    let dueYear = transactionDate.getUTCFullYear();
    if (card.closingDay < card.dueDay) {
         if (transactionDate.getUTCDate() >= card.closingDay) dueMonth += 1;
    } else {
        const closingDate = new Date(Date.UTC(transactionDate.getUTCFullYear(), transactionDate.getUTCMonth(), card.closingDay));
        if (transactionDate >= closingDate) dueMonth += 2;
        else dueMonth += 1;
    }
    if (dueMonth > 11) {
        dueYear += Math.floor(dueMonth / 12);
        dueMonth %= 12;
    }
    return new Date(Date.UTC(dueYear, dueMonth, card.dueDay));
};

export default function CardManagement() {
    const { userId, db, showToast, isAuthReady, getUserCollectionPathSegments, theme } = useAppContext();
    
    const [cards, setCards] = useState([]);
    const [allLoans, setAllLoans] = useState([]);
    const [allSubscriptions, setAllSubscriptions] = useState([]);
    const [allExpenses, setAllExpenses] = useState([]);
    const [paidSubscriptions, setPaidSubscriptions] = useState([]);
    const [filterMonth, setFilterMonth] = useState(new Date().toISOString().slice(0, 7));
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCard, setEditingCard] = useState(null);
    const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);
    const [cardToDelete, setCardToDelete] = useState(null);
    const [formValues, setFormValues] = useState({
        name: '', limitInput: '', closingDay: '', dueDay: '', color: '#F2B705'
    });

    useEffect(() => {
        if (!isAuthReady || !userId) return;
        const userCollectionPath = getUserCollectionPathSegments();
        const basePath = [...userCollectionPath, userId];
        
        const unsubCards = onSnapshot(collection(db, ...basePath, 'cards'), (snapshot) => setCards(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
        const unsubLoans = onSnapshot(collection(db, ...basePath, 'loans'), (snapshot) => setAllLoans(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
        const unsubSubs = onSnapshot(collection(db, ...basePath, 'subscriptions'), (snapshot) => setAllSubscriptions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
        const unsubExpenses = onSnapshot(collection(db, ...basePath, 'expenses'), (snapshot) => setAllExpenses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
        const unsubPaidSubs = onSnapshot(collection(db, ...basePath, 'paidSubscriptions'), (snapshot) => setPaidSubscriptions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))));

        return () => { unsubCards(); unsubLoans(); unsubSubs(); unsubExpenses(); unsubPaidSubs(); };
    }, [userId, db, isAuthReady, getUserCollectionPathSegments]);
    
    const calculateInvoiceDetails = useCallback((card, selectedMonth) => {
        if (!card || !card.closingDay || !selectedMonth) return { total: 0, isPending: false };
        const [year, month] = selectedMonth.split('-').map(Number);
        let totalInvoice = 0;
        let isInvoicePending = false;
        
        const invoiceDateForPeriod = getInvoiceDueDate(new Date(Date.UTC(year, month - 1, 1)), card);

        allLoans.forEach(loan => {
            if (loan.cardId !== card.id) return;
            const processInstallments = (installments) => {
                if (Array.isArray(installments)) {
                    installments.forEach(inst => {
                        const instDate = new Date(inst.dueDate + "T00:00:00Z");
                        const invoiceDate = getInvoiceDueDate(instDate, card);
                        if (invoiceDate.getUTCFullYear() === invoiceDateForPeriod.getUTCFullYear() && invoiceDate.getUTCMonth() === invoiceDateForPeriod.getUTCMonth()) {
                            totalInvoice += (inst.value || 0);
                            if (inst.status !== 'Paga') isInvoicePending = true;
                        }
                    });
                }
            };
            if (loan.isShared && loan.sharedDetails) {
                if (loan.sharedDetails.person1) processInstallments(loan.sharedDetails.person1.installments);
                if (loan.sharedDetails.person2) processInstallments(loan.sharedDetails.person2.installments);
            } else {
                processInstallments(loan.installments);
            }
        });

        allExpenses.forEach(expense => {
            if (expense.cardId === card.id) {
                const expenseDate = expense.date?.toDate ? expense.date.toDate() : new Date(expense.date + "T00:00:00Z");
                const invoiceDate = getInvoiceDueDate(expenseDate, card);
                if (invoiceDate.getUTCFullYear() === invoiceDateForPeriod.getUTCFullYear() && invoiceDate.getUTCMonth() === invoiceDateForPeriod.getUTCMonth()) {
                    totalInvoice += expense.value;
                    if (expense.status !== 'Paga') isInvoicePending = true;
                }
            }
        });
        
        const addedSubKeys = new Set();
        allSubscriptions.forEach(sub => {
            if (sub.cardId === card.id && sub.isActive) {
                 [-1, 0].forEach(monthOffset => {
                    const chargeDate = new Date(Date.UTC(year, month - 1 + monthOffset, sub.dueDate));
                    const invoiceDueDate = getInvoiceDueDate(chargeDate, card);
                    if (invoiceDueDate.getUTCFullYear() === invoiceDateForPeriod.getUTCFullYear() && invoiceDueDate.getUTCMonth() === invoiceDateForPeriod.getUTCMonth()) {
                        const uniqueKey = `${sub.id}-${chargeDate.toISOString().slice(0, 10)}`;
                        if (!addedSubKeys.has(uniqueKey)) {
                            totalInvoice += sub.amount;
                            const isPaid = paidSubscriptions.some(ps => ps.subscriptionId === sub.id && ps.month === selectedMonth);
                            if (!isPaid) isInvoicePending = true;
                            addedSubKeys.add(uniqueKey);
                        }
                    }
                });
            }
        });

        return { total: totalInvoice, isPending: totalInvoice > 0 && isInvoicePending };
    }, [allLoans, allExpenses, allSubscriptions, paidSubscriptions]);
    
    const calculateTotalDebtForCard = (cardId) => {
        const debtFromLoans = allLoans
            .filter(loan => loan.cardId === cardId)
            .reduce((sum, loan) => {
                if (loan.isShared && loan.sharedDetails) {
                    const person1Debt = loan.sharedDetails.person1?.balanceDue || 0;
                    const person2Debt = loan.sharedDetails.person2?.balanceDue || 0;
                    return sum + person1Debt + person2Debt;
                }
                return sum + (loan.balanceDueClient || 0);
            }, 0);

        const debtFromExpenses = allExpenses
            .filter(expense => expense.cardId === cardId && expense.status !== 'Paga')
            .reduce((sum, expense) => sum + (expense.value || 0), 0);

        return debtFromLoans + debtFromExpenses;
    };

    const handleOpenModal = (card = null) => {
        setEditingCard(card);
        if (card) {
            setFormValues({ name: card.name, limitInput: formatCurrencyForInput(card.limit), closingDay: card.closingDay, dueDay: card.dueDay, color: card.color || '#F2B705' });
        } else {
            setFormValues({ name: '', limitInput: '', closingDay: '', dueDay: '', color: '#F2B705' });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => { setIsModalOpen(false); setEditingCard(null); };

    const handleSaveCard = async () => {
        if (!formValues.name.trim() || !formValues.limitInput || !formValues.closingDay || !formValues.dueDay) {
            showToast('Todos os campos são obrigatórios.', 'warning');
            return;
        }
        const cardLimit = parseCurrencyInput(formValues.limitInput);
        if (isNaN(cardLimit) || cardLimit <= 0) {
            showToast('O limite do cartão é inválido.', 'error');
            return;
        }
        const userCollectionPath = getUserCollectionPathSegments();
        const cardData = { 
            name: formValues.name, 
            limit: cardLimit,
            closingDay: parseInt(formValues.closingDay),
            dueDay: parseInt(formValues.dueDay),
            color: formValues.color,
        };

        try {
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
            showToast(`Erro ao salvar cartão: ${error.message}`, 'error');
        }
    };

    const confirmDeleteCard = (cardId) => { setCardToDelete(cardId); setIsConfirmationModalOpen(true); };

    const handleDeleteCardConfirmed = async () => {
        if (!cardToDelete) return;
        const userCollectionPath = getUserCollectionPathSegments();
        try {
            await deleteDoc(doc(db, ...userCollectionPath, userId, 'cards', cardToDelete));
            showToast('Cartão excluído com sucesso!', 'success');
        } catch (error) {
            showToast(`Erro ao excluir cartão: ${error.message}`, 'error');
        } finally {
            setIsConfirmationModalOpen(false);
            setCardToDelete(null);
        }
    };
    
    return (
        <div className="space-y-8 animate-fadeIn">
            {/* Header Carbono & Dourado */}
            <div className="bg-carbon-900 border border-carbon-800 p-6 sm:p-8 rounded-3xl shadow-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gold-cream">Gerenciamento de Cartões</h1>
                    <p className="text-sm text-gray-400 mt-1">Adicione, edite e acompanhe o limite e as faturas dos seus cartões Black.</p>
                </div>
                 <div className="flex items-center gap-4 w-full sm:w-auto">
                    <input 
                        type="month" 
                        value={filterMonth} 
                        onChange={(e) => setFilterMonth(e.target.value)}
                        className="p-3 bg-carbon-800 border border-carbon-700 rounded-2xl text-gold-cream w-full focus:ring-2 focus:ring-gold focus:outline-none"
                    />
                    <button onClick={() => handleOpenModal()} className="flex-shrink-0 flex items-center justify-center gap-2 bg-gradient-to-r from-gold-light to-gold text-carbon-900 font-bold py-3 px-5 rounded-2xl shadow-lg shadow-gold/20 hover:opacity-90 transition cursor-pointer">
                        <PlusIcon />
                        <span className="hidden sm:inline">Adicionar Cartão</span>
                    </button>
                 </div>
            </div>

            {/* Tabela de Cartões */}
            <div className="bg-carbon-900 border border-carbon-800 rounded-3xl shadow-2xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full border-collapse">
                        <thead>
                            <tr className="border-b border-carbon-800 text-xs font-semibold text-gray-400 uppercase tracking-wider bg-carbon-800/50">
                                <th className="px-6 py-4">Nome do Cartão</th>
                                <th className="px-6 py-4">Limite Utilizado & Disponível</th>
                                <th className="px-6 py-4">Fatura ({new Date(filterMonth + '-02').toLocaleString('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' })})</th>
                                <th className="px-6 py-4">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-carbon-800 text-sm">
                            {cards.length > 0 ? cards.map((card) => {
                                const totalDebt = calculateTotalDebtForCard(card.id);
                                const limit = card.limit || 0;
                                const availableLimit = limit - totalDebt;
                                const usedPercentage = limit > 0 ? (totalDebt / limit) * 100 : 0;
                                const { total: invoiceValue, isPending: isInvoicePending } = calculateInvoiceDetails(card, filterMonth);
                                
                                return (
                                    <tr key={card.id} className="hover:bg-carbon-800/40 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap font-semibold text-gold-cream flex items-center">
                                            <span className="w-4 h-4 rounded-md mr-3 border border-white/20 shadow-sm" style={{ backgroundColor: card.color }}></span>
                                            {card.name}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-gray-300">
                                            <div className="font-bold text-gold-cream mb-1">{formatCurrencyDisplay(limit)}</div>
                                            <div className="w-full bg-carbon-800 rounded-full h-2.5 my-1.5 overflow-hidden border border-carbon-700">
                                                <div className="bg-gradient-to-r from-gold-light to-gold h-2.5 rounded-full transition-all duration-500" style={{ width: `${usedPercentage > 100 ? 100 : usedPercentage}%` }}></div>
                                            </div>
                                            <div className="text-xs text-gray-400 flex gap-2">
                                                <span>Usado: <strong className="text-gray-300">{formatCurrencyDisplay(totalDebt)}</strong></span> 
                                                <span>•</span> 
                                                <span>Disp: <strong className="text-emerald-400">{formatCurrencyDisplay(availableLimit)}</strong></span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-gray-300">
                                            <div className="flex items-center gap-3">
                                                <span className="font-extrabold text-lg text-gold">{formatCurrencyDisplay(invoiceValue)}</span>
                                                {invoiceValue > 0 && (
                                                     isInvoicePending ? (
                                                         <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-gold/10 text-gold border border-gold/20">Pendente</span>
                                                     ) : (
                                                         <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                                             <CheckCircleIcon/> Paga
                                                         </span>
                                                     )
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap font-medium">
                                            <div className="flex items-center gap-4">
                                                <button onClick={() => handleOpenModal(card)} className="text-gold hover:text-gold-light transition cursor-pointer" title="Editar"><EditIcon /></button>
                                                <button onClick={() => confirmDeleteCard(card.id)} className="text-rose-400 hover:text-rose-300 transition cursor-pointer" title="Excluir"><DeleteIcon /></button>
                                            </div>
                                        </td>
                                    </tr>
                                )
                            }) : (
                                <tr><td colSpan="4" className="text-center py-12 text-gray-500">Nenhum cartão cadastrado ainda.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            
            {/* Modal de Cadastro/Edição */}
            <GenericModal isOpen={isModalOpen} onClose={handleCloseModal} title={editingCard ? 'Editar Cartão' : 'Adicionar Cartão'} theme="dark" maxWidth="max-w-lg">
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Nome do Cartão</label>
                        <input type="text" value={formValues.name} onChange={(e) => setFormValues({...formValues, name: e.target.value})} placeholder="Ex: Nubank Black" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Limite do Cartão</label>
                        <div className="relative">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-gray-400">R$</span>
                            <input type="text" value={formValues.limitInput} onChange={handleCurrencyInputChange(val => setFormValues({...formValues, limitInput: val}))} className="pl-10" inputMode="decimal" placeholder="0,00" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Dia de Fechamento</label>
                            <input type="number" value={formValues.closingDay} onChange={(e) => setFormValues({...formValues, closingDay: e.target.value})} min="1" max="31" placeholder="Ex: 5" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Dia de Vencimento</label>
                            <input type="number" value={formValues.dueDay} onChange={(e) => setFormValues({...formValues, dueDay: e.target.value})} min="1" max="31" placeholder="Ex: 12" />
                        </div>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Cor do Identificador</label>
                        <input type="color" value={formValues.color} onChange={(e) => setFormValues({...formValues, color: e.target.value})} className="w-full h-12 p-1.5 bg-carbon-800 border border-carbon-700 rounded-2xl cursor-pointer" />
                    </div>
                </div>
                <div className="mt-6 flex justify-end gap-4">
                    <button onClick={handleCloseModal} className="py-2.5 px-5 bg-carbon-800 hover:bg-carbon-700 rounded-2xl text-gray-300 transition cursor-pointer font-medium">Cancelar</button>
                    <button onClick={handleSaveCard} className="py-2.5 px-5 bg-gradient-to-r from-gold-light to-gold hover:opacity-90 rounded-2xl text-carbon-900 font-bold transition cursor-pointer shadow-lg shadow-gold/20">Salvar Cartão</button>
                </div>
            </GenericModal>

            {/* Modal de Confirmação de Exclusão */}
            <GenericModal
                isOpen={isConfirmationModalOpen}
                onClose={() => setIsConfirmationModalOpen(false)}
                onConfirm={handleDeleteCardConfirmed}
                title="Confirmar Exclusão"
                isConfirmation={true}
                theme="dark"
            >
                {`Tem certeza que deseja deletar o cartão "${cards.find(c => c.id === cardToDelete)?.name}"? Esta ação não pode ser desfeita.`}
            </GenericModal>
        </div>
    );
}