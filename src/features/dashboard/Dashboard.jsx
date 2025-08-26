// src/features/dashboard/Dashboard.jsx

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { useAppContext } from '../../context/AppContext';
import { formatCurrencyDisplay } from '../../utils/currency';
import ProAnalyticsCharts from '../../components/ProAnalyticsCharts';
import GenericModal from '../../components/GenericModal';
import ProSummary from './ProSummary';
import Spinner from '../../components/Spinner';

function Dashboard({ selectedMonth, setSelectedMonth, selectedCardFilter, setSelectedCardFilter, selectedClientFilter, setSelectedClientFilter }) {
    const { db, userId, isAuthReady, theme, getUserCollectionPathSegments, showToast } = useAppContext();

    const [dashboardData, setDashboardData] = useState({
        loans: [],
        clients: [],
        cards: [],
        subscriptions: [],
        expenses: [],
        incomes: [],
    });
    const { loans, clients, cards, subscriptions, expenses, incomes } = dashboardData;

    const [isLoading, setIsLoading] = useState(true);
    const [isMarkAllPaidConfirmationOpen, setIsMarkAllPaidConfirmationOpen] = useState(false);

    const fetchData = useCallback(async () => {
        if (!isAuthReady || !db || !userId) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        try {
            const userCollectionPath = getUserCollectionPathSegments();
            const collections = {
                loans: collection(db, ...userCollectionPath, userId, 'loans'),
                clients: collection(db, ...userCollectionPath, userId, 'clients'),
                cards: collection(db, ...userCollectionPath, userId, 'cards'),
                subscriptions: collection(db, ...userCollectionPath, userId, 'subscriptions'),
                expenses: collection(db, ...userCollectionPath, userId, 'expenses'),
                incomes: collection(db, ...userCollectionPath, userId, 'incomes'),
            };

            const [
                loansSnapshot, clientsSnapshot, cardsSnapshot,
                subscriptionsSnapshot, expensesSnapshot, incomesSnapshot
            ] = await Promise.all([
                getDocs(collections.loans),
                getDocs(collections.clients),
                getDocs(collections.cards),
                getDocs(collections.subscriptions),
                getDocs(collections.expenses),
                getDocs(collections.incomes)
            ]);

            const safeDataMapper = (doc) => {
                const data = doc.data();
                const dateValue = data.date?.toDate ? data.date.toDate().toISOString() : data.date;
                const convertedDate = dateValue ? new Date(String(dateValue).substring(0, 10) + 'T00:00:00Z') : null;
                const value = data.value !== undefined ? data.value : (data.amount !== undefined ? data.amount : 0);
                return { id: doc.id, ...data, date: convertedDate, value };
            };

            const allData = {
                loans: loansSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })),
                clients: clientsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })),
                cards: cardsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })),
                subscriptions: subscriptionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })),
                expenses: expensesSnapshot.docs.map(safeDataMapper),
                incomes: incomesSnapshot.docs.map(safeDataMapper),
            };

            setDashboardData(allData);

        } catch (error) {
            console.error("Erro ao buscar dados do painel:", error);
            showToast('Falha ao carregar os dados do painel.', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [db, userId, isAuthReady, getUserCollectionPathSegments, showToast]);

    useEffect(() => {
        fetchData();
        const handleReload = () => fetchData();
        window.addEventListener('reloadData', handleReload);
        return () => window.removeEventListener('reloadData', handleReload);
    }, [fetchData]);

    const handleMarkInstallmentAsPaidDashboard = async (originalLoanId, personKeyOrNull, installmentNumber) => {
        const loanToUpdate = loans.find(loan => loan.id === originalLoanId);
        if (!loanToUpdate) {
            showToast("Erro: Compra não encontrada.", "error");
            return;
        }
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
            fetchData();
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
        if (isLoading || clients.length === 0) {
            return { displayableItems: [], filteredLoansForChart: [], filteredExpensesForChart: [], filteredSubscriptionsForChart: [], summary: { totalFatura: 0, totalRecebido: 0, totalPendente: 0 } };
        }

        const [filterYear, filterMonth] = selectedMonth.split('-').map(Number);
        const todayAtMidnight = new Date();
        todayAtMidnight.setHours(0, 0, 0, 0);
        const allItems = [];

        // ✅ CORREÇÃO: Função centralizada para calcular a data de vencimento da fatura
        const getInvoiceDueDate = (transactionDate, card) => {
            if (!card || !card.closingDay || !card.dueDay) {
                // Se não houver cartão ou datas, retorna a data da transação como fallback
                return transactionDate;
            }
            
            let dueMonth = transactionDate.getUTCMonth();
            let dueYear = transactionDate.getUTCFullYear();

            if (card.closingDay < card.dueDay) { // Fechamento e vencimento no mesmo mês
                if (transactionDate.getUTCDate() >= card.closingDay) {
                    dueMonth += 1;
                }
            } else { // Fechamento num mês, vencimento no seguinte
                const closingDate = new Date(Date.UTC(transactionDate.getUTCFullYear(), transactionDate.getUTCMonth(), card.closingDay));
                if (transactionDate >= closingDate) {
                    dueMonth += 2;
                } else {
                    dueMonth += 1;
                }
            }
            if (dueMonth > 11) {
                dueYear += Math.floor(dueMonth / 12);
                dueMonth %= 12;
            }
            return new Date(Date.UTC(dueYear, dueMonth, card.dueDay));
        };

        // --- Processamento de Compras (Loans) ---
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
                            allItems.push({ ...loan, ...inst, id: `${loan.id}-${personDetails.key || 'main'}-${inst.number}`, type: 'Parcela', loanId: loan.id, personKey: personDetails.key, clientId: personDetails.clientId, description: personDetails.label ? `${loan.description || 'Compra'} (${personDetails.label})` : (loan.description || 'Compra'), currentStatus: status, dueDate: inst.dueDate, value: inst.value });
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

        // --- Processamento de Assinaturas ---
        const addedSubKeys = new Set();
        subscriptions.forEach(sub => {
            if (!sub.isActive || (!selectedCardFilter || sub.cardId === selectedCardFilter) || (!selectedClientFilter || sub.clientId === selectedClientFilter)) return;
            const card = cards.find(c => c.id === sub.cardId);
            if (!card) return;

            // Testa a data de cobrança no mês anterior e no mês atual para pegar faturas que "viram" o mês
            [-1, 0].forEach(monthOffset => {
                const chargeDate = new Date(Date.UTC(filterYear, filterMonth - 1 + monthOffset, sub.dueDate));
                const invoiceDueDate = getInvoiceDueDate(chargeDate, card);
                
                if (invoiceDueDate.getUTCFullYear() === filterYear && invoiceDueDate.getUTCMonth() + 1 === filterMonth) {
                    const uniqueKey = `${sub.id}-${chargeDate.toISOString().slice(0, 10)}`;
                    if (!addedSubKeys.has(uniqueKey)) {
                         allItems.push({ ...sub, type: 'Assinatura', id: uniqueKey, description: sub.name, dueDate: chargeDate.toISOString().split('T')[0], currentStatus: 'Recorrente', value: sub.amount });
                         addedSubKeys.add(uniqueKey);
                    }
                }
            });
        });
        
        // --- Processamento de Despesas Avulsas ---
        expenses.forEach(expense => {
            const expenseDate = expense.date;
            if (expenseDate instanceof Date && !isNaN(expenseDate) && (!selectedCardFilter || expense.cardId === selectedCardFilter) && (!selectedClientFilter || !expense.clientId)) {
                 const card = expense.cardId ? cards.find(c => c.id === expense.cardId) : null;
                 const invoiceDueDate = getInvoiceDueDate(expenseDate, card);

                if (invoiceDueDate.getUTCFullYear() === filterYear && invoiceDueDate.getUTCMonth() + 1 === filterMonth) {
                    allItems.push({ ...expense, type: 'Despesa', dueDate: expense.date.toISOString().split('T')[0], currentStatus: 'Avulsa', value: expense.value });
                }
            }
        });

        // --- Finalização ---
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
    }, [isLoading, dashboardData, selectedMonth, selectedCardFilter, selectedClientFilter, clients, cards]);

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
                                    const clientName = clients.find(c => c.id === item.clientId)?.name || '---';
                                    return (
                                        <tr key={item.id} className="hover:bg-gray-800/60">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{new Date(item.dueDate + "T00:00:00Z").toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</td>
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
        </div>
    );
}

export default Dashboard;