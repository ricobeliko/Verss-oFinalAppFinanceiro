// src/features/dashboard/Dashboard.jsx

import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { useAppContext } from '../../context/AppContext';
import { formatCurrencyDisplay } from '../../utils/currency';
import ProAnalyticsCharts from '../../components/ProAnalyticsCharts';
import GenericModal from '../../components/GenericModal';
import ProSummary from './ProSummary'; 

function Dashboard({ selectedMonth, setSelectedMonth, selectedCardFilter, setSelectedCardFilter, selectedClientFilter, setSelectedClientFilter }) {
    const { db, userId, isAuthReady, theme, getUserCollectionPathSegments, showToast } = useAppContext(); 
    
    const [loans, setLoans] = useState([]);
    const [clients, setClients] = useState([]);
    const [cards, setCards] = useState([]);
    const [subscriptions, setSubscriptions] = useState([]);
    const [expenses, setExpenses] = useState([]);
    const [incomes, setIncomes] = useState([]);

    const [isMarkAllPaidConfirmationOpen, setIsMarkAllPaidConfirmationOpen] = useState(false);

    useEffect(() => {
        if (!isAuthReady || !db || !userId) return;
        const userCollectionPath = getUserCollectionPathSegments();
        const unsubLoans = onSnapshot(collection(db, ...userCollectionPath, userId, 'loans'), snapshot => setLoans(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
        const unsubClients = onSnapshot(collection(db, ...userCollectionPath, userId, 'clients'), snapshot => setClients(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
        const unsubCards = onSnapshot(collection(db, ...userCollectionPath, userId, 'cards'), snapshot => setCards(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
        const unsubSubscriptions = onSnapshot(collection(db, ...userCollectionPath, userId, 'subscriptions'), snapshot => setSubscriptions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
        
        // ✅ CORREÇÃO: Função de mapeamento robusta para ler os dados corretamente
        const safeDataMapper = (doc) => {
            const data = doc.data();
            const convertedDate = data.date?.toDate ? data.date.toDate() : (data.date ? new Date(data.date + 'T00:00:00') : null);
            // Garante compatibilidade com registros antigos ('amount') e novos ('value').
            const value = data.value !== undefined ? data.value : (data.amount !== undefined ? data.amount : 0);
            return { id: doc.id, ...data, date: convertedDate, value };
        };

        const unsubExpenses = onSnapshot(collection(db, ...userCollectionPath, userId, 'expenses'), snapshot => {
            setExpenses(snapshot.docs.map(safeDataMapper));
        });
        const unsubIncomes = onSnapshot(collection(db, ...userCollectionPath, userId, 'incomes'), snapshot => {
            setIncomes(snapshot.docs.map(safeDataMapper));
        });

        return () => { unsubLoans(); unsubClients(); unsubCards(); unsubSubscriptions(); unsubExpenses(); unsubIncomes(); };
    }, [db, userId, isAuthReady, getUserCollectionPathSegments]);

    const handleMarkInstallmentAsPaidDashboard = async (originalLoanId, personKeyOrNull, installmentNumber) => {
        const loanToUpdate = loans.find(loan => loan.id === originalLoanId);
        if (!loanToUpdate) { showToast("Erro: Compra não encontrada.", "error"); return; }
        const userCollectionPath = getUserCollectionPathSegments();
        const loanDocRef = doc(db, ...userCollectionPath, userId, 'loans', originalLoanId);
        let updatedFields = {};
        try {
            if (loanToUpdate.isShared && personKeyOrNull) {
                const currentSharedDetails = JSON.parse(JSON.stringify(loanToUpdate.sharedDetails));
                const personData = currentSharedDetails[personKeyOrNull];
                const personInstallments = Array.isArray(personData.installments) ? [...personData.installments] : [];
                const installmentIndex = personInstallments.findIndex(inst => inst.number === installmentNumber);
                if (installmentIndex === -1) throw new Error("Parcela compartilhada não encontrada.");
                personInstallments[installmentIndex].status = 'Paga';
                personInstallments[installmentIndex].paidDate = new Date().toISOString().split('T')[0];
                const newValuePaidPerson = personInstallments.filter(inst => inst.status === 'Paga').reduce((sum, inst) => sum + inst.value, 0);
                const newBalanceDuePerson = parseFloat((personData.shareAmount - newValuePaidPerson).toFixed(2));
                let newPersonStatus = newBalanceDuePerson <= 0.005 ? 'Pago Total' : (newValuePaidPerson > 0 ? 'Pago Parcial' : 'Pendente');
                currentSharedDetails[personKeyOrNull] = { ...personData, installments: personInstallments, valuePaid: newValuePaidPerson, balanceDue: newBalanceDuePerson, statusPayment: newPersonStatus };
                updatedFields.sharedDetails = currentSharedDetails;
            } else if (!loanToUpdate.isShared) {
                const normalInstallmentsParsed = Array.isArray(loanToUpdate.installments) ? [...loanToUpdate.installments] : [];
                const installmentIndex = normalInstallmentsParsed.findIndex(inst => inst.number === installmentNumber);
                if (installmentIndex === -1) throw new Error("Parcela não encontrada.");
                normalInstallmentsParsed[installmentIndex].status = 'Paga';
                normalInstallmentsParsed[installmentIndex].paidDate = new Date().toISOString().split('T')[0];
                const newValuePaid = normalInstallmentsParsed.filter(i => i.status === 'Paga').reduce((sum, i) => sum + i.value, 0);
                const newBalanceDue = parseFloat((loanToUpdate.totalValue - newValuePaid).toFixed(2));
                let newOverallStatus = newBalanceDue <= 0.005 ? 'Pago Total' : (newValuePaid > 0 ? 'Pago Parcial' : 'Pendente');
                updatedFields = { installments: normalInstallmentsParsed, valuePaidClient: newValuePaid, balanceDueClient: newBalanceDue, statusPaymentClient: newOverallStatus };
            }
            await updateDoc(loanDocRef, updatedFields);
            showToast("Parcela marcada como paga com sucesso!", "success");
        } catch (error) {
            console.error("Erro ao marcar parcela:", error);
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
        if (!isAuthReady || !clients.length) {
            return { displayableItems: [], filteredLoansForChart: [], filteredExpensesForChart: [], filteredSubscriptionsForChart: [], summary: { totalFatura: 0, totalRecebido: 0, totalPendente: 0 } };
        }

        const [filterYear, filterMonth] = selectedMonth.split('-').map(Number);
        const todayAtMidnight = new Date();
        todayAtMidnight.setHours(0, 0, 0, 0);

        const allItems = [];

        loans.forEach(loan => {
            const processInstallments = (installments, personDetails) => {
                if (Array.isArray(installments)) {
                    installments.forEach(inst => {
                        const instDate = new Date(inst.dueDate + "T00:00:00");
                        if (instDate.getUTCFullYear() === filterYear && instDate.getUTCMonth() + 1 === filterMonth &&
                            (!selectedCardFilter || loan.cardId === selectedCardFilter) &&
                            (!selectedClientFilter || personDetails.clientId === selectedClientFilter)) {
                            let status = inst.status === 'Pendente' && instDate < todayAtMidnight ? 'Atrasado' : inst.status;
                            allItems.push({ ...loan, ...inst, id: `${loan.id}-${personDetails.key || 'main'}-${inst.number}`, type: 'Parcela', loanId: loan.id, personKey: personDetails.key, clientId: personDetails.clientId, description: personDetails.label ? `${loan.description || 'Compra'} (${personDetails.label})` : (loan.description || 'Compra'), currentStatus: status, dueDate: inst.dueDate, value: inst.value });
                        }
                    });
                }
            };
            if (loan.isShared) {
                if (loan.sharedDetails?.person1) processInstallments(loan.sharedDetails.person1.installments, { key: 'person1', clientId: loan.sharedDetails.person1.clientId, label: 'P1' });
                if (loan.sharedDetails?.person2?.shareAmount > 0) processInstallments(loan.sharedDetails.person2.installments, { key: 'person2', clientId: loan.sharedDetails.person2.clientId, label: 'P2' });
            } else {
                processInstallments(loan.installments, { key: null, clientId: loan.clientId });
            }
        });

        subscriptions.forEach(sub => {
            if (sub.isActive && (!selectedCardFilter || sub.cardId === selectedCardFilter) && (!selectedClientFilter || sub.clientId === selectedClientFilter)) {
                const day = String(sub.dueDate).padStart(2, '0');
                allItems.push({ ...sub, type: 'Assinatura', description: sub.name, dueDate: `${selectedMonth}-${day}`, currentStatus: 'Recorrente', value: sub.amount });
            }
        });

        // ✅ CORREÇÃO: Lógica de data padronizada para UTC.
        expenses.forEach(expense => {
            const expenseDate = expense.date; 
            if (expenseDate instanceof Date && !isNaN(expenseDate)) {
                let faturaMonth = expenseDate.getUTCMonth() + 1;
                let faturaYear = expenseDate.getUTCFullYear();
                if (expense.cardId) {
                    const card = cards.find(c => c.id === expense.cardId);
                    if (card && typeof card.closingDay === 'number' && expenseDate.getUTCDate() >= card.closingDay) {
                        faturaMonth += 1;
                        if (faturaMonth > 12) { faturaMonth = 1; faturaYear += 1; }
                    }
                }
                if (faturaYear === filterYear && faturaMonth === filterMonth && (!selectedCardFilter || expense.cardId === selectedCardFilter) && !selectedClientFilter) {
                    allItems.push({ ...expense, type: 'Despesa', dueDate: expense.date.toISOString().split('T')[0], currentStatus: 'Avulsa', value: expense.value });
                }
            }
        });

        allItems.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

        const newTotalFatura = allItems.reduce((sum, item) => sum + (item.value || 0), 0);
        const newTotalRecebido = allItems.filter(item => item.type === 'Parcela' && item.currentStatus === 'Paga').reduce((sum, item) => sum + (item.value || 0), 0);
        
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
    }, [loans, clients, cards, subscriptions, expenses, selectedMonth, selectedCardFilter, selectedClientFilter, isAuthReady]);

    const getCardDisplayInfo = (cardId) => {
        const card = cards.find(c => c.id === cardId);
        return card ? { name: card.name, color: card.color || '#374151' } : { name: 'N/A', color: '#374151' };
    };

    const paidPercentage = summary.totalFatura > 0 ? (summary.totalRecebido / summary.totalFatura) * 100 : 0;

    return (
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
                 <div className="p-4 border-b border-gray-800">
                    <h3 className="text-lg font-semibold text-white">Itens da Fatura (Mês Selecionado)</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead>
                            <tr className="border-b border-gray-800">
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Data</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Descrição</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Pessoa</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Valor</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                            {displayableItems.length > 0 ? displayableItems.map((item) => {
                                const cardInfo = getCardDisplayInfo(item.cardId);
                                const clientName = clients.find(c => c.id === item.clientId)?.name || '---';
                                return (
                                    <tr key={item.id} className="hover:bg-gray-800/60">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{new Date(item.dueDate + "T00:00:00").toLocaleDateString('pt-BR')}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">{item.description}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{clientName}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-300">{formatCurrencyDisplay(item.value)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {item.type === 'Parcela' && item.currentStatus !== 'Paga' ? (
                                                <button onClick={() => handleMarkInstallmentAsPaidDashboard(item.loanId, item.personKey, item.number)} className="bg-green-500/20 text-green-300 px-3 py-1 rounded-md hover:bg-green-500/30 text-xs font-semibold">Marcar Paga</button>
                                            ) : (
                                                <span className={`text-xs font-semibold ${item.currentStatus === 'Paga' ? 'text-green-400' : 'text-gray-500'}`}>{item.currentStatus || '---'}</span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            }) : (
                                <tr>
                                    <td colSpan="5" className="text-center py-10 text-gray-500">
                                        Nenhum item na fatura para os filtros selecionados.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            <GenericModal isOpen={isMarkAllPaidConfirmationOpen} onClose={() => setIsMarkAllPaidConfirmationOpen(false)} onConfirm={() => {}} title="Confirmar Ação" message="Tem a certeza de que deseja marcar TODAS as parcelas pendentes ou atrasadas como PAGAS?" isConfirmation={true} theme={theme} />
        </div>
    );
}

export default Dashboard;