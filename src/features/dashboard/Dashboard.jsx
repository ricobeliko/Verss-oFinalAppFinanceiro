// src/features/dashboard/Dashboard.jsx

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { collection, getDocs, doc, updateDoc, writeBatch, addDoc, query, where, deleteDoc, onSnapshot } from 'firebase/firestore';
import { useAppContext } from '../../context/AppContext';
import { formatCurrencyDisplay } from '../../utils/currency';
import ProAnalyticsCharts from '../../components/ProAnalyticsCharts';
import GenericModal from '../../components/GenericModal';
import ProSummary from './ProSummary';
import Spinner from '../../components/Spinner';

// Ícone para a ordenação da tabela
const SortIcon = ({ direction }) => (
    <svg className="w-4 h-4 inline-block ml-1 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        {direction === 'ascending' ? <path strokeLinecap="round" strokeWidth="2" d="M5 15l7-7 7 7"></path> : <path strokeLinecap="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>}
    </svg>
);

function Dashboard({ selectedMonth, setSelectedMonth, selectedCardFilter, setSelectedCardFilter, selectedClientFilter, setSelectedClientFilter }) {
    const { db, userId, isAuthReady, theme, getUserCollectionPathSegments, showToast } = useAppContext();

    const [dashboardData, setDashboardData] = useState({
        loans: [],
        clients: [],
        cards: [],
        subscriptions: [],
        expenses: [],
        incomes: [],
        paidSubscriptions: [],
    });
    const { loans, clients, cards, subscriptions, expenses, incomes, paidSubscriptions } = dashboardData;

    const [isLoading, setIsLoading] = useState(true);
    const [isMarkAllPaidConfirmationOpen, setIsMarkAllPaidConfirmationOpen] = useState(false);
    const [sortConfig, setSortConfig] = useState({ key: 'dueDate', direction: 'ascending' });

    useEffect(() => {
        if (!isAuthReady || !db || !userId) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);

        const userCollectionPath = getUserCollectionPathSegments();

        const safeDataMapper = (doc) => {
            const data = doc.data();
            const dateValue = data.date?.toDate ? data.date.toDate().toISOString() : data.date;
            const convertedDate = dateValue ? new Date(String(dateValue).substring(0, 10) + 'T00:00:00Z') : null;
            const value = data.value !== undefined ? data.value : (data.amount !== undefined ? data.amount : 0);
            return { id: doc.id, ...data, date: convertedDate, value };
        };

        const collections = {
            loans: collection(db, ...userCollectionPath, userId, 'loans'),
            clients: collection(db, ...userCollectionPath, userId, 'clients'),
            cards: collection(db, ...userCollectionPath, userId, 'cards'),
            subscriptions: collection(db, ...userCollectionPath, userId, 'subscriptions'),
            expenses: collection(db, ...userCollectionPath, userId, 'expenses'),
            incomes: collection(db, ...userCollectionPath, userId, 'incomes'),
        };

        const unsubs = [
            onSnapshot(collections.loans, snapshot => setDashboardData(prev => ({ ...prev, loans: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) }))),
            onSnapshot(collections.clients, snapshot => setDashboardData(prev => ({ ...prev, clients: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) }))),
            onSnapshot(collections.cards, snapshot => setDashboardData(prev => ({ ...prev, cards: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) }))),
            onSnapshot(collections.subscriptions, snapshot => setDashboardData(prev => ({ ...prev, subscriptions: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) }))),
            onSnapshot(collections.expenses, snapshot => setDashboardData(prev => ({ ...prev, expenses: snapshot.docs.map(safeDataMapper) }))),
            onSnapshot(collections.incomes, snapshot => setDashboardData(prev => ({ ...prev, incomes: snapshot.docs.map(safeDataMapper) }))),
        ];

        const paidSubscriptionsQuery = query(collection(db, ...userCollectionPath, userId, 'paidSubscriptions'), where("month", "==", selectedMonth));
        const unsubPaid = onSnapshot(paidSubscriptionsQuery, snapshot => {
            setDashboardData(prev => ({ ...prev, paidSubscriptions: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) }));
            // CORREÇÃO: Removida a condição 'if (isLoading)' para garantir que o loading sempre termine.
            setIsLoading(false);
        }, error => {
            console.error("Erro ao buscar assinaturas pagas:", error);
            setIsLoading(false);
        });
        
        unsubs.push(unsubPaid);

        return () => unsubs.forEach(unsub => unsub());

    }, [db, userId, isAuthReady, getUserCollectionPathSegments, selectedMonth]);

    const updateItemStatus = async (item, newStatus) => {
        const userCollectionPath = getUserCollectionPathSegments();
        try {
            switch (item.type) {
                case 'Parcela':
                    await updateInstallmentStatus(item.loanId, item.personKey, item.number, newStatus);
                    break;
                case 'Despesa':
                    const expenseDocRef = doc(db, ...userCollectionPath, userId, 'expenses', item.id);
                    await updateDoc(expenseDocRef, { status: newStatus });
                    break;
                case 'Assinatura':
                    const paidSubscriptionsRef = collection(db, ...userCollectionPath, userId, 'paidSubscriptions');
                    if (newStatus === 'Paga') {
                        await addDoc(paidSubscriptionsRef, {
                            subscriptionId: item.originalId,
                            month: selectedMonth,
                            paidDate: new Date().toISOString().split('T')[0],
                        });
                    } else {
                        const q = query(paidSubscriptionsRef, where("subscriptionId", "==", item.originalId), where("month", "==", selectedMonth));
                        const querySnapshot = await getDocs(q);
                        querySnapshot.forEach(async (docSnapshot) => {
                            await deleteDoc(doc(paidSubscriptionsRef, docSnapshot.id));
                        });
                    }
                    break;
                default:
                    throw new Error("Tipo de item desconhecido.");
            }
            showToast(`${item.type} atualizada para ${newStatus}!`, "success");
        } catch (error) {
            console.error(`Erro ao atualizar ${item.type}:`, error);
            showToast(`Erro ao atualizar: ${error.message}`, "error");
        }
    };
    
    const updateInstallmentStatus = async (loanId, personKey, installmentNumber, newStatus) => {
        const loanToUpdate = loans.find(loan => loan.id === loanId);
        if (!loanToUpdate) {
            showToast("Erro: Compra não encontrada.", "error");
            return;
        }
        const userCollectionPath = getUserCollectionPathSegments();
        const loanDocRef = doc(db, ...userCollectionPath, userId, 'loans', loanId);
        let updatedFields = {};

        try {
            if (loanToUpdate.isShared && personKey) {
                const installments = [...loanToUpdate.sharedDetails[personKey].installments];
                const installmentIndex = installments.findIndex(inst => inst.number === installmentNumber);
                if (installmentIndex === -1) throw new Error("Parcela compartilhada não encontrada.");
                
                installments[installmentIndex].status = newStatus;
                installments[installmentIndex].paidDate = newStatus === 'Paga' ? new Date().toISOString().split('T')[0] : null;
                
                updatedFields[`sharedDetails.${personKey}.installments`] = installments;

            } else if (!loanToUpdate.isShared) {
                const installments = [...loanToUpdate.installments];
                const installmentIndex = installments.findIndex(inst => inst.number === installmentNumber);
                if (installmentIndex === -1) throw new Error("Parcela não encontrada.");

                installments[installmentIndex].status = newStatus;
                installments[installmentIndex].paidDate = newStatus === 'Paga' ? new Date().toISOString().split('T')[0] : null;

                updatedFields.installments = installments;
            }

            await updateDoc(loanDocRef, updatedFields);
        } catch (error) {
            console.error("Erro ao atualizar parcela:", error);
            showToast(`Erro: ${error.message}`, "error");
        }
    };

    const {
        displayableItems,
        filteredLoansForChart,
        filteredExpensesForChart,
        filteredSubscriptionsForChart,
        summary
    } = useMemo(() => {
        try {
            if (isLoading || clients.length === 0) {
                return { displayableItems: [], filteredLoansForChart: [], filteredExpensesForChart: [], filteredSubscriptionsForChart: [], summary: { totalFatura: 0, totalRecebido: 0, totalPendente: 0 } };
            }

            const [filterYear, filterMonth] = selectedMonth.split('-').map(Number);
            const todayAtMidnight = new Date();
            todayAtMidnight.setHours(0, 0, 0, 0);
            let allItems = [];

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

            loans.forEach(loan => {
                if (!loan || typeof loan.totalValue !== 'number') return;
                const processInstallments = (installments, personDetails) => {
                    if (Array.isArray(installments)) {
                        installments.forEach(inst => {
                            const instDate = new Date(inst.dueDate + "T00:00:00Z");
                            if (instDate.getUTCFullYear() === filterYear && instDate.getUTCMonth() + 1 === filterMonth &&
                                (!selectedCardFilter || loan.cardId === selectedCardFilter) &&
                                (!selectedClientFilter || personDetails.clientId === selectedClientFilter)) {
                                let status = inst.status === 'Pendente' && instDate < todayAtMidnight ? 'Atrasado' : inst.status;
                                
                                const itemData = {
                                    ...loan,
                                    ...inst,
                                    value: inst.value,
                                    id: `${loan.id}-${personDetails.key || 'main'}-${inst.number}`,
                                    type: 'Parcela',
                                    loanId: loan.id,
                                    personKey: personDetails.key,
                                    clientId: personDetails.clientId,
                                    description: personDetails.label ? `${loan.description || 'Compra'} (${personDetails.label})` : (loan.description || 'Compra'),
                                    currentStatus: status
                                };
                                delete itemData.installments;
                                allItems.push(itemData);
                            }
                        });
                    }
                };
                if (loan.isShared && loan.sharedDetails) {
                    if (loan.sharedDetails.person1) processInstallments(loan.sharedDetails.person1.installments, { key: 'person1', clientId: loan.sharedDetails.person1.clientId, label: 'P1' });
                    if (loan.sharedDetails.person2 && loan.sharedDetails.person2?.shareAmount > 0) processInstallments(loan.sharedDetails.person2.installments, { key: 'person2', clientId: loan.sharedDetails.person2.clientId, label: 'P2' });
                } else {
                    processInstallments(loan.installments, { key: null, clientId: loan.clientId });
                }
            });

            const addedSubKeys = new Set();
            subscriptions.forEach(sub => {
                if (sub.isActive && (!selectedCardFilter || sub.cardId === selectedCardFilter) && (!selectedClientFilter || sub.clientId === selectedClientFilter)) {
                    const card = cards.find(c => c.id === sub.cardId);
                    if (!card) return;

                    [-1, 0].forEach(monthOffset => {
                        const chargeDate = new Date(Date.UTC(filterYear, filterMonth - 1 + monthOffset, sub.dueDate));
                        const invoiceDueDate = getInvoiceDueDate(chargeDate, card);
                        
                        if (invoiceDueDate.getUTCFullYear() === filterYear && invoiceDueDate.getUTCMonth() + 1 === filterMonth) {
                            const uniqueKey = `${sub.id}-${chargeDate.toISOString().slice(0, 10)}`;
                            if (!addedSubKeys.has(uniqueKey)) {
                                const isPaid = paidSubscriptions.some(ps => ps.subscriptionId === sub.id && ps.month === selectedMonth);
                                allItems.push({ 
                                    ...sub, 
                                    type: 'Assinatura', 
                                    id: uniqueKey,
                                    originalId: sub.id,
                                    description: sub.name, 
                                    dueDate: chargeDate.toISOString().split('T')[0], 
                                    currentStatus: isPaid ? 'Paga' : 'Pendente',
                                    value: sub.amount 
                                });
                                addedSubKeys.add(uniqueKey);
                            }
                        }
                    });
                }
            });
            
            // ✅ INÍCIO DA CORREÇÃO
            // A lógica para adicionar despesas avulsas à fatura foi ajustada.
            expenses.forEach(expense => {
                // Garante que a data da despesa é um objeto Date válido.
                const expenseDate = expense.date;
                if (!(expenseDate instanceof Date) || isNaN(expenseDate)) return;

                // Aplica os filtros de cartão e cliente.
                // Uma despesa sem `clientId` é considerada para 'Todas as Pessoas'.
                if (
                    (!selectedCardFilter || expense.cardId === selectedCardFilter) &&
                    (!selectedClientFilter || !expense.clientId || expense.clientId === selectedClientFilter)
                ) {
                    const card = expense.cardId ? cards.find(c => c.id === expense.cardId) : null;
                    
                    // Se a despesa não tem cartão (é avulsa como Pix/dinheiro),
                    // consideramos a data da própria despesa para o mês.
                    // Se tem cartão, calculamos a data de vencimento da fatura.
                    const relevantDate = card ? getInvoiceDueDate(expenseDate, card) : expenseDate;
                    
                    if (relevantDate.getUTCFullYear() === filterYear && relevantDate.getUTCMonth() + 1 === filterMonth) {
                        allItems.push({ 
                            ...expense, 
                            type: 'Despesa', 
                            dueDate: expense.date.toISOString().split('T')[0], 
                            currentStatus: expense.status || 'Pendente',
                            value: expense.value 
                        });
                    }
                }
            });
            // ✅ FIM DA CORREÇÃO

            allItems.sort((a, b) => {
                let aValue = a[sortConfig.key] || '';
                let bValue = b[sortConfig.key] || '';

                if (sortConfig.key === 'clientId') {
                    aValue = clients.find(c => c.id === a.clientId)?.name || '';
                    bValue = clients.find(c => c.id === b.clientId)?.name || '';
                }
                if (sortConfig.key === 'cardId') {
                    aValue = cards.find(c => c.id === a.cardId)?.name || '';
                    bValue = cards.find(c => c.id === b.cardId)?.name || '';
                }

                if (sortConfig.key === 'dueDate') {
                    return sortConfig.direction === 'ascending' ? new Date(aValue) - new Date(bValue) : new Date(bValue) - new Date(aValue);
                }

                return sortConfig.direction === 'ascending' 
                    ? String(aValue).localeCompare(String(bValue))
                    : String(bValue).localeCompare(String(aValue));
            });

            const newTotalFatura = allItems.reduce((sum, item) => sum + (item.value || 0), 0);
            const newTotalRecebido = allItems.filter(item => item.currentStatus === 'Paga').reduce((sum, item) => sum + (item.value || 0), 0);

            return {
                displayableItems: allItems,
                filteredLoansForChart: allItems.filter(item => item.type === 'Parcela'),
                filteredExpensesForChart: allItems.filter(item => item.type === 'Despesa'),
                filteredSubscriptionsForChart: allItems.filter(item => item.type === 'Assinatura'),
                summary: {
                    totalFatura: newTotalFatura,
                    totalRecebido: newTotalRecebido,
                    totalPendente: newTotalFatura - newTotalRecebido,
                }
            };
        } catch (error) {
            console.error("ERRO FATAL DURANTE O CÁLCULO DO RESUMO:", error);
            return { displayableItems: [], filteredLoansForChart: [], filteredExpensesForChart: [], filteredSubscriptionsForChart: [], summary: { totalFatura: 0, totalRecebido: 0, totalPendente: 0 } };
        }
    }, [isLoading, dashboardData, selectedMonth, selectedCardFilter, selectedClientFilter, sortConfig]);
    
    const requestSort = (key) => {
        let direction = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const handleMarkAllAsPaid = async () => {
        setIsMarkAllPaidConfirmationOpen(false);
        const batch = writeBatch(db);
        const userCollectionPath = getUserCollectionPathSegments();
        let updatesMade = 0;

        const itemsToUpdate = displayableItems.filter(item => item.currentStatus !== 'Paga');

        if (itemsToUpdate.length === 0) {
            showToast('Nenhum item pendente para marcar como pago.', 'info');
            return;
        }

        itemsToUpdate.forEach(item => {
            if (item.type === 'Parcela') {
                 const loanToUpdate = loans.find(l => l.id === item.loanId);
                 if (!loanToUpdate) return;
                 const loanDocRef = doc(db, ...userCollectionPath, userId, 'loans', item.loanId);
                 if (loanToUpdate.isShared && item.personKey) {
                    const installments = [...loanToUpdate.sharedDetails[item.personKey].installments];
                    const installmentIndex = installments.findIndex(inst => inst.number === item.number);
                    if (installmentIndex > -1) {
                        installments[installmentIndex].status = 'Paga';
                        installments[installmentIndex].paidDate = new Date().toISOString().split('T')[0];
                        batch.update(loanDocRef, { [`sharedDetails.${item.personKey}.installments`]: installments });
                        updatesMade++;
                    }
                } else if (!loanToUpdate.isShared) {
                    const installments = [...loanToUpdate.installments];
                    const installmentIndex = installments.findIndex(inst => inst.number === item.number);
                    if (installmentIndex > -1) {
                        installments[installmentIndex].status = 'Paga';
                        installments[installmentIndex].paidDate = new Date().toISOString().split('T')[0];
                        batch.update(loanDocRef, { installments: installments });
                        updatesMade++;
                    }
                }
            } else if (item.type === 'Despesa') {
                const expenseDocRef = doc(db, ...userCollectionPath, userId, 'expenses', item.id);
                batch.update(expenseDocRef, { status: 'Paga' });
                updatesMade++;
            } else if (item.type === 'Assinatura') {
                const isPaid = paidSubscriptions.some(ps => ps.subscriptionId === item.originalId && ps.month === selectedMonth);
                if (!isPaid) {
                    const paidSubscriptionsRef = collection(db, ...userCollectionPath, userId, 'paidSubscriptions');
                    const newPaidSub = {
                        subscriptionId: item.originalId,
                        month: selectedMonth,
                        paidDate: new Date().toISOString().split('T')[0],
                    };
                    batch.set(doc(paidSubscriptionsRef), newPaidSub);
                    updatesMade++;
                }
            }
        });

        try {
            await batch.commit();
            showToast(`${updatesMade} iten(s) marcados como pagos com sucesso!`, 'success');
        } catch (error) {
            console.error("Erro ao marcar todos como pagos:", error);
            showToast('Falha ao atualizar os itens.', 'error');
        }
    };

    const paidPercentage = summary.totalFatura > 0 ? (summary.totalRecebido / summary.totalFatura) * 100 : 0;

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-full min-h-[500px] p-6 bg-gray-900/50 border border-gray-800 rounded-lg">
                <Spinner />
            </div>
        );
    }
    
    return (
        <div className="p-6 bg-gray-900/50 border border-gray-800 rounded-lg space-y-6">
            <div className="space-y-8">
                <h2 className="text-2xl font-bold text-white">Resumo Financeiro</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="p-2 bg-gray-700 border-2 border-gray-600 rounded-md shadow-sm text-white focus:ring-purple-500 focus:border-purple-500 transition" />
                    <select value={selectedCardFilter} onChange={(e) => setSelectedCardFilter(e.target.value)} className="p-2 bg-gray-700 border-2 border-gray-600 rounded-md shadow-sm text-white focus:ring-purple-500 focus:border-purple-500 transition">
                        <option value="">Todos os Cartões</option>
                        {cards.map(card => (<option key={card.id} value={card.id}>{card.name}</option>))}
                    </select>
                    <select value={selectedClientFilter} onChange={(e) => setSelectedClientFilter(e.target.value)} className="p-2 bg-gray-700 border-2 border-gray-600 rounded-md shadow-sm text-white focus:ring-purple-500 focus:border-purple-500 transition">
                        <option value="">Todas as Pessoas</option>
                        {clients.map(client => (<option key={client.id} value={client.id}>{client.name}</option>))}
                    </select>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6">
                            <h3 className="text-sm font-medium text-gray-400">Fatura Total do Mês</h3>
                            <p className="text-3xl font-bold text-white mt-2">{formatCurrencyDisplay(summary.totalFatura)}</p>
                        </div>
                        <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6">
                            <h3 className="text-sm font-medium text-gray-400">Progresso de Pagamento</h3>
                            <div className="w-full bg-gray-700 rounded-full h-2.5 my-3">
                                <div className="bg-green-500 h-2.5 rounded-full" style={{ width: `${paidPercentage}%` }}></div>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-green-400">{formatCurrencyDisplay(summary.totalRecebido)} <span className="text-gray-500">Pago</span></span>
                                <span className="text-yellow-400">{formatCurrencyDisplay(summary.totalPendente)} <span className="text-gray-500">Pendente</span></span>
                            </div>
                        </div>
                        <ProSummary selectedMonth={selectedMonth} totalExpenses={summary.totalFatura} incomes={incomes} />
                    </div>
                    <div className="lg:col-span-2">
                        <ProAnalyticsCharts
                            loans={filteredLoansForChart}
                            clients={clients}
                            expenses={filteredExpensesForChart}
                            subscriptions={filteredSubscriptionsForChart}
                            theme={theme}
                        />
                    </div>
                </div>

                <div className="bg-gray-900/50 border border-gray-800 rounded-lg">
                    <div className="p-4 border-b border-gray-800 flex justify-between items-center">
                        <h3 className="text-lg font-semibold text-white">Itens da Fatura</h3>
                        <button 
                            onClick={() => setIsMarkAllPaidConfirmationOpen(true)}
                            className="bg-green-500/20 text-green-300 px-3 py-1 rounded-md hover:bg-green-500/30 text-xs font-semibold transition"
                        >
                            Marcar Tudo Como Pago
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead>
                                <tr className="border-b border-gray-800">
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider cursor-pointer" onClick={() => requestSort('type')}>
                                        Tipo {sortConfig.key === 'type' && <SortIcon direction={sortConfig.direction} />}
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Descrição</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider cursor-pointer" onClick={() => requestSort('clientId')}>
                                        Pessoa {sortConfig.key === 'clientId' && <SortIcon direction={sortConfig.direction} />}
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider cursor-pointer" onClick={() => requestSort('cardId')}>
                                        Cartão {sortConfig.key === 'cardId' && <SortIcon direction={sortConfig.direction} />}
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Valor da Parcela</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Nº Parcelas</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800">
                                {displayableItems.length > 0 ? displayableItems.map((item) => {
                                    const client = clients.find(c => c.id === item.clientId);
                                    const card = cards.find(c => c.id === item.cardId);
                                    return (
                                        <tr key={item.id} className="hover:bg-gray-800/60">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{item.type}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">{item.description}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{client?.name || '---'}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400 flex items-center gap-2">
                                                {card ? (
                                                    <>
                                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: card.color || '#888' }}></div>
                                                        {card.name}
                                                    </>
                                                ) : '---'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-300">{formatCurrencyDisplay(item.value)}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                                                {item.type === 'Parcela' ? `${item.number}/${item.installmentsCount}` : '1/1'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                                                    item.currentStatus === 'Paga' ? 'bg-green-500/20 text-green-400' :
                                                    item.currentStatus === 'Pendente' ? 'bg-yellow-500/20 text-yellow-400' :
                                                    item.currentStatus === 'Atrasado' ? 'bg-red-500/20 text-red-400' :
                                                    'bg-gray-500/20 text-gray-400'
                                                }`}>
                                                    {item.currentStatus}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {item.currentStatus !== 'Paga' && (
                                                    <button onClick={() => updateItemStatus(item, 'Paga')} className="bg-green-500/20 text-green-300 px-3 py-1 rounded-md hover:bg-green-500/30 text-xs font-semibold">
                                                        Marcar Paga
                                                    </button>
                                                )}
                                                {item.currentStatus === 'Paga' && (
                                                     <button onClick={() => updateItemStatus(item, 'Pendente')} className="bg-red-500/20 text-red-400 px-3 py-1 rounded-md hover:bg-red-500/30 text-xs font-semibold">
                                                        Desmarcar
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                }) : (
                                    <tr>
                                        <td colSpan="8" className="text-center py-10 text-gray-500">
                                            Nenhum item na fatura para os filtros selecionados.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
                <GenericModal 
                    isOpen={isMarkAllPaidConfirmationOpen} 
                    onClose={() => setIsMarkAllPaidConfirmationOpen(false)} 
                    onConfirm={handleMarkAllAsPaid}
                    title="Confirmar Ação" 
                    message="Tem certeza de que deseja marcar TODOS os itens pendentes ou atrasados deste mês como PAGOS? Esta ação não pode ser desfeita."
                    isConfirmation={true} 
                    theme={theme} 
                />
            </div>
        </div>
    );
}

export default Dashboard;