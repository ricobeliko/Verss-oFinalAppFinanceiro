// src/features/dashboard/Dashboard.jsx

import React, { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, doc, updateDoc, writeBatch, addDoc, query, where, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { useAppContext } from '../../context/AppContext';
import { subscribeToFirestoreQuery, buildCanonicalQueryKey } from '../../services/firestoreSubscriptionRegistry';
import { formatCurrencyDisplay } from '../../utils/currency';
import { generateTransactionsCsv, generateAnnualReportCsv, downloadCsvFile } from '../../services/csvExportService';
import { calculateMonthlyComparisonSummary, generateDeterministicFinancialInsights, generateFinancialAlerts } from '../../services/financialService';
import ProAnalyticsCharts from '../../components/ProAnalyticsCharts';
import GenericModal from '../../components/GenericModal';
import FutureCommitmentsCard from '../../components/FutureCommitmentsCard';
import DeterministicInsightsWidget from '../../components/DeterministicInsightsWidget';
import FinancialAlertsBanner from '../../components/FinancialAlertsBanner';
import ExecutiveSummaryModal from '../../components/ExecutiveSummaryModal';
import FinancialSandboxSimulatorModal from '../../components/FinancialSandboxSimulatorModal';
import CategoryBudgetsWidget from '../../components/CategoryBudgetsWidget';
import CategoryBudgetsModal from '../../components/CategoryBudgetsModal';
import NotificationSettingsModal from '../../components/NotificationSettingsModal';
import ProSummary from './ProSummary';
import Spinner from '../../components/Spinner';

// Ícone para a ordenação da tabela
const SortIcon = ({ direction }) => (
    <svg className="w-4 h-4 inline-block ml-1 text-gold transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        {direction === 'ascending' ? <path strokeLinecap="round" strokeWidth="2" d="M5 15l7-7 7 7"></path> : <path strokeLinecap="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>}
    </svg>
);

const ShieldAlertIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>;
const TargetIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>;

function Dashboard({ selectedMonth, setSelectedMonth, selectedCardFilter, setSelectedCardFilter, selectedClientFilter, setSelectedClientFilter }) {
    const { db, userId, isAuthReady, theme, userProfile, getUserCollectionPathSegments, showToast } = useAppContext();

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
    const [isExecutiveSummaryOpen, setIsExecutiveSummaryOpen] = useState(false);
    const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
    const [isBudgetsModalOpen, setIsBudgetsModalOpen] = useState(false);
    const [isNotificationSettingsOpen, setIsNotificationSettingsOpen] = useState(false);
    const [isSyncStale, setIsSyncStale] = useState(false);
    const [sortConfig, setSortConfig] = useState({ key: 'dueDate', direction: 'ascending' });

    const handleSaveBudgets = async (newBudgets) => {
        try {
            const userCollectionPath = getUserCollectionPathSegments();
            const userDocRef = doc(db, ...userCollectionPath, userId);
            await updateDoc(userDocRef, {
                budgets: newBudgets,
                updatedAt: serverTimestamp()
            });
            showToast('Metas de orçamento salvas com sucesso!', 'success');
        } catch (err) {
            console.error("Erro ao salvar metas:", err);
            showToast('Falha ao salvar metas de orçamento.', 'error');
        }
    };

    const handleSaveNotificationSettings = async (newSettings) => {
        try {
            const userCollectionPath = getUserCollectionPathSegments();
            const userDocRef = doc(db, ...userCollectionPath, userId);
            await updateDoc(userDocRef, {
                notificationSettings: newSettings,
                updatedAt: serverTimestamp()
            });
            showToast('Preferências de alertas salvas com sucesso!', 'success');
        } catch (err) {
            console.error("Erro ao salvar alertas:", err);
            showToast('Falha ao salvar preferências.', 'error');
        }
    };

    useEffect(() => {
        if (!isAuthReady || !db || !userId) {
            setIsLoading(false);
            return;
        }

        // Suporte a dados sintéticos isolados para testes E2E sem tocar na produção
        if (import.meta.env.DEV && (typeof window !== 'undefined' && (window.__FINCONTROL_E2E_MOCK_DATA__ || sessionStorage.getItem('fincontrol_e2e_data')))) {
            const mock = window.__FINCONTROL_E2E_MOCK_DATA__ || JSON.parse(sessionStorage.getItem('fincontrol_e2e_data'));
            setDashboardData({
                cards: mock.cards || [{ id: 'card-1', name: 'Cartão E2E Master', limit: 5000, color: '#C5A059' }],
                loans: mock.loans || [{ id: 'loan-1', description: 'Compra E2E 12x', cardId: 'card-1', totalAmount: 1200, installmentsCount: 12, installmentValue: 100, currentInstallment: 1, startDate: `${selectedMonth}-05`, isMyDebt: true, category: 'Alimentação' }],
                expenses: mock.expenses || [{ id: 'exp-1', description: 'Mercado E2E', cardId: 'card-1', value: 250, date: new Date(), category: 'Alimentação' }],
                subscriptions: mock.subscriptions || [{ id: 'sub-1', name: 'Streaming E2E', value: 49.90, cardId: 'card-1', category: 'Lazer' }],
                clients: mock.clients || [{ id: 'client-1', name: 'Pessoa E2E', phone: '11999999999' }],
                incomes: mock.incomes || [],
                paidSubscriptions: []
            });
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
            subscribeToFirestoreQuery({
                queryRef: collections.loans,
                canonicalKey: buildCanonicalQueryKey({ collectionPath: `users_fallback/${userId}/loans`, uid: userId }),
                uid: userId,
                onNext: (snapshot) => setDashboardData((prev) => ({ ...prev, loans: snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) })),
                onError: (err) => {
                    console.error('Erro no listener loans:', err);
                    setIsSyncStale(true);
                },
            }),
            subscribeToFirestoreQuery({
                queryRef: collections.clients,
                canonicalKey: buildCanonicalQueryKey({ collectionPath: `users_fallback/${userId}/clients`, uid: userId }),
                uid: userId,
                onNext: (snapshot) => setDashboardData((prev) => ({ ...prev, clients: snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) })),
                onError: (err) => {
                    console.error('Erro no listener clients:', err);
                    setIsSyncStale(true);
                },
            }),
            subscribeToFirestoreQuery({
                queryRef: collections.cards,
                canonicalKey: buildCanonicalQueryKey({ collectionPath: `users_fallback/${userId}/cards`, uid: userId }),
                uid: userId,
                onNext: (snapshot) => setDashboardData((prev) => ({ ...prev, cards: snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) })),
                onError: (err) => {
                    console.error('Erro no listener cards:', err);
                    setIsSyncStale(true);
                },
            }),
            subscribeToFirestoreQuery({
                queryRef: collections.subscriptions,
                canonicalKey: buildCanonicalQueryKey({ collectionPath: `users_fallback/${userId}/subscriptions`, uid: userId }),
                uid: userId,
                onNext: (snapshot) => setDashboardData((prev) => ({ ...prev, subscriptions: snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) })),
                onError: (err) => {
                    console.error('Erro no listener subscriptions:', err);
                    setIsSyncStale(true);
                },
            }),
            subscribeToFirestoreQuery({
                queryRef: collections.expenses,
                canonicalKey: buildCanonicalQueryKey({ collectionPath: `users_fallback/${userId}/expenses`, uid: userId }),
                uid: userId,
                onNext: (snapshot) => setDashboardData((prev) => ({ ...prev, expenses: snapshot.docs.map(safeDataMapper) })),
                onError: (err) => {
                    console.error('Erro no listener expenses:', err);
                    setIsSyncStale(true);
                },
            }),
            subscribeToFirestoreQuery({
                queryRef: collections.incomes,
                canonicalKey: buildCanonicalQueryKey({ collectionPath: `users_fallback/${userId}/incomes`, uid: userId }),
                uid: userId,
                onNext: (snapshot) => setDashboardData((prev) => ({ ...prev, incomes: snapshot.docs.map(safeDataMapper) })),
                onError: (err) => {
                    console.error('Erro no listener incomes:', err);
                    setIsSyncStale(true);
                },
            }),
        ];

        const paidSubscriptionsQuery = query(collection(db, ...userCollectionPath, userId, 'paidSubscriptions'), where('month', '==', selectedMonth));
        const unsubPaid = subscribeToFirestoreQuery({
            queryRef: paidSubscriptionsQuery,
            canonicalKey: buildCanonicalQueryKey({
                collectionPath: `users_fallback/${userId}/paidSubscriptions`,
                uid: userId,
                queryClauses: [`month:==:${selectedMonth}`],
            }),
            uid: userId,
            onNext: (snapshot) => {
                setDashboardData((prev) => ({ ...prev, paidSubscriptions: snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) }));
                setIsLoading(false);
            },
            onError: (error) => {
                console.error('Erro ao buscar assinaturas pagas:', error);
                setIsSyncStale(true);
                setIsLoading(false);
            },
        });

        unsubs.push(unsubPaid);

        return () => unsubs.forEach((unsub) => unsub());

    }, [db, userId, isAuthReady, getUserCollectionPathSegments, selectedMonth]);

    const updateItemStatus = async (item, newStatus) => {
        const userCollectionPath = getUserCollectionPathSegments();
        try {
            switch (item.type) {
                case 'Parcela': {
                    await updateInstallmentStatus(item.loanId, item.personKey, item.number, newStatus);
                    break;
                }
                case 'Despesa': {
                    const expenseDocRef = doc(db, ...userCollectionPath, userId, 'expenses', item.id);
                    await updateDoc(expenseDocRef, { status: newStatus, userId: userId, updatedAt: serverTimestamp() });
                    break;
                }
                case 'Assinatura': {
                    const paidSubscriptionsRef = collection(db, ...userCollectionPath, userId, 'paidSubscriptions');
                    if (newStatus === 'Paga') {
                        await addDoc(paidSubscriptionsRef, {
                            subscriptionId: item.originalId,
                            month: selectedMonth,
                            paidDate: new Date().toISOString().split('T')[0],
                            userId: userId,
                            createdAt: serverTimestamp()
                        });
                    } else {
                        const q = query(paidSubscriptionsRef, where("subscriptionId", "==", item.originalId), where("month", "==", selectedMonth));
                        const querySnapshot = await getDocs(q);
                        querySnapshot.forEach(async (docSnapshot) => {
                            await deleteDoc(doc(paidSubscriptionsRef, docSnapshot.id));
                        });
                    }
                    break;
                }
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

        const updatedLoanData = JSON.parse(JSON.stringify(loanToUpdate));
        let installmentsList;
        let originalAmount;

        if (personKey) {
            installmentsList = updatedLoanData.sharedDetails[personKey].installments;
            originalAmount = updatedLoanData.sharedDetails[personKey].shareAmount;
        } else {
            installmentsList = updatedLoanData.installments;
            originalAmount = updatedLoanData.totalValue;
        }
        
        const installmentIndex = Array.isArray(installmentsList) 
            ? installmentsList.findIndex(installment => installment.number === installmentNumber) 
            : -1;

        if (installmentIndex === -1) {
            showToast('Erro: Parcela não encontrada.', 'error');
            return;
        }

        installmentsList[installmentIndex].status = newStatus;
        installmentsList[installmentIndex].paidDate = newStatus === 'Paga' ? new Date().toISOString().split('T')[0] : null;
        
        const newValuePaid = installmentsList
            .filter(installment => installment.status === 'Paga')
            .reduce((sum, installment) => sum + installment.value, 0);

        const newBalanceDue = parseFloat((originalAmount - newValuePaid).toFixed(2));
        const finalStatus = newBalanceDue <= 0.01 ? 'Pago Total' : (newValuePaid > 0 ? 'Pago Parcial' : 'Pendente');

        const fieldsToUpdate = {
            userId: userId,
            updatedAt: serverTimestamp()
        };

        if (personKey) {
            fieldsToUpdate[`sharedDetails.${personKey}.installments`] = installmentsList;
            fieldsToUpdate[`sharedDetails.${personKey}.valuePaid`] = newValuePaid;
            fieldsToUpdate[`sharedDetails.${personKey}.balanceDue`] = newBalanceDue;
            fieldsToUpdate[`sharedDetails.${personKey}.statusPayment`] = finalStatus;
        } else {
            fieldsToUpdate.installments = installmentsList;
            fieldsToUpdate.valuePaidClient = newValuePaid;
            fieldsToUpdate.balanceDueClient = newBalanceDue;
            fieldsToUpdate.statusPaymentClient = finalStatus;
        }

        try {
            const userCollectionPath = getUserCollectionPathSegments();
            const loanDocRef = doc(db, ...userCollectionPath, userId, 'loans', loanId);
            await updateDoc(loanDocRef, fieldsToUpdate);
            showToast(`Parcela marcada como ${newStatus}!`, "success");
        } catch (error) {
            console.error("Erro ao atualizar parcela:", error);
            showToast(`Erro ao atualizar parcela: ${error.message}`, "error");
        }
    };

    const handlePrevMonth = () => {
        if (!selectedMonth) return;
        const [year, month] = selectedMonth.split('-').map(Number);
        const prevDate = new Date(Date.UTC(year, month - 2, 1));
        const prevYear = prevDate.getUTCFullYear();
        const prevMonthStr = String(prevDate.getUTCMonth() + 1).padStart(2, '0');
        setSelectedMonth(`${prevYear}-${prevMonthStr}`);
    };

    const handleNextMonth = () => {
        if (!selectedMonth) return;
        const [year, month] = selectedMonth.split('-').map(Number);
        const nextDate = new Date(Date.UTC(year, month, 1));
        const nextYear = nextDate.getUTCFullYear();
        const nextMonthStr = String(nextDate.getUTCMonth() + 1).padStart(2, '0');
        setSelectedMonth(`${nextYear}-${nextMonthStr}`);
    };

    const handleCurrentMonth = () => {
        const now = new Date();
        const curYear = now.getUTCFullYear();
        const curMonthStr = String(now.getUTCMonth() + 1).padStart(2, '0');
        setSelectedMonth(`${curYear}-${curMonthStr}`);
    };

    const handleExportMonthCsv = () => {
        if (!displayableItems || displayableItems.length === 0) {
            showToast('Nenhuma transação disponível para exportar no mês selecionado.', 'warning');
            return;
        }

        const transactionsToExport = displayableItems.map(item => {
            const clientObj = clients.find(c => c.id === item.clientId);
            const cardObj = cards.find(c => c.id === item.cardId);
            return {
                type: item.type,
                date: item.dueDate,
                description: item.description,
                category: item.category || (item.type === 'Assinatura' ? 'Assinaturas' : 'Outros'),
                clientName: clientObj?.name || 'Titular',
                cardName: cardObj?.name || 'Dinheiro/Pix',
                installment: item.number ? `${item.number}/${item.totalInstallments || item.number}` : '-',
                value: item.value || 0,
                status: item.currentStatus || 'Pendente'
            };
        });

        const csvContent = generateTransactionsCsv(transactionsToExport);
        downloadCsvFile(csvContent, `fincontrol-extrato-${selectedMonth}.csv`);
        showToast('Extrato CSV exportado com sucesso!', 'success');
    };

    const handleExportAnnualCsv = () => {
        try {
            const currentYear = selectedMonth.slice(0, 4);
            const csv = generateAnnualReportCsv({
                targetYear: currentYear,
                loans,
                expenses,
                subscriptions,
                incomes,
                cards,
                clients
            });
            downloadCsvFile(csv, `fincontrol-relatorio-anual-${currentYear}.csv`);
            showToast(`Relatório Anual ${currentYear} CSV exportado com sucesso!`, 'success');
        } catch (error) {
            showToast('Erro ao exportar relatório anual CSV.', 'error');
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

            const safeLoans = Array.isArray(loans) ? loans : [];
            const safeSubscriptions = Array.isArray(subscriptions) ? subscriptions : [];
            const safeExpenses = Array.isArray(expenses) ? expenses : [];
            const safeCards = Array.isArray(cards) ? cards : [];
            const safeClients = Array.isArray(clients) ? clients : [];
            const safePaidSubscriptions = Array.isArray(paidSubscriptions) ? paidSubscriptions : [];

            safeLoans.forEach(loan => {
                if (!loan || typeof loan.totalValue !== 'number') return;
                const processInstallments = (installments, personDetails) => {
                    if (Array.isArray(installments)) {
                        installments.forEach(inst => {
                            if (!inst) return;
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
            safeSubscriptions.forEach(sub => {
                if (!sub) return;
                if (sub.isActive && (!selectedCardFilter || sub.cardId === selectedCardFilter) && (!selectedClientFilter || sub.clientId === selectedClientFilter)) {
                    const card = safeCards.find(c => c && c.id === sub.cardId);
                    if (!card) return;

                    [-1, 0].forEach(monthOffset => {
                        const chargeDate = new Date(Date.UTC(filterYear, filterMonth - 1 + monthOffset, sub.dueDate));
                        const invoiceDueDate = getInvoiceDueDate(chargeDate, card);
                        
                        if (invoiceDueDate.getUTCFullYear() === filterYear && invoiceDueDate.getUTCMonth() + 1 === filterMonth) {
                            const uniqueKey = `${sub.id}-${chargeDate.toISOString().slice(0, 10)}`;
                            if (!addedSubKeys.has(uniqueKey)) {
                                const isPaid = safePaidSubscriptions.some(ps => ps && ps.subscriptionId === sub.id && ps.month === selectedMonth);
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
            
            safeExpenses.forEach(expense => {
                if (!expense) return;
                const expenseDate = expense.date;
                if (!(expenseDate instanceof Date) || isNaN(expenseDate)) return;

                if (
                    (!selectedCardFilter || expense.cardId === selectedCardFilter) &&
                    (!selectedClientFilter || !expense.clientId || expense.clientId === selectedClientFilter)
                ) {
                    const card = expense.cardId ? safeCards.find(c => c && c.id === expense.cardId) : null;
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

            allItems.sort((a, b) => {
                let aValue = a[sortConfig.key] || '';
                let bValue = b[sortConfig.key] || '';

                if (sortConfig.key === 'clientId') {
                    aValue = safeClients.find(c => c && c.id === a.clientId)?.name || '';
                    bValue = safeClients.find(c => c && c.id === b.clientId)?.name || '';
                }
                if (sortConfig.key === 'cardId') {
                    aValue = safeCards.find(c => c && c.id === a.cardId)?.name || '';
                    bValue = safeCards.find(c => c && c.id === b.cardId)?.name || '';
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
    }, [isLoading, loans, clients, cards, subscriptions, expenses, paidSubscriptions, selectedMonth, selectedCardFilter, selectedClientFilter, sortConfig]);
    
    // Análise de Inteligência (Auditoria Relâmpago & Metas de Quitação)
    const intelligenceData = useMemo(() => {
        let upcomingFinishes = [];
        const safeLoans = Array.isArray(loans) ? loans : [];
        const safeSubs = Array.isArray(subscriptions) ? subscriptions : [];

        safeLoans.forEach(loan => {
            if (!loan) return;
            const isFullyPaid = loan.isShared 
                ? (loan.sharedDetails?.person1?.statusPayment === 'Pago Total' && loan.sharedDetails?.person2?.statusPayment === 'Pago Total')
                : (loan.statusPaymentClient === 'Pago Total');

            if (!isFullyPaid) {
                let allInsts = [];
                if (loan.isShared) {
                    if (Array.isArray(loan.sharedDetails?.person1?.installments)) allInsts.push(...loan.sharedDetails.person1.installments);
                    if (Array.isArray(loan.sharedDetails?.person2?.installments)) allInsts.push(...loan.sharedDetails.person2.installments);
                } else if (Array.isArray(loan.installments)) {
                    allInsts.push(...loan.installments);
                }

                const pendingInsts = allInsts.filter(i => i && i.status !== 'Paga');
                if (pendingInsts.length > 0) {
                    pendingInsts.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
                    const lastInst = pendingInsts[pendingInsts.length - 1];
                    if (lastInst) {
                        upcomingFinishes.push({
                            description: loan.description || 'Compra',
                            remaining: pendingInsts.length,
                            finalDate: lastInst.dueDate
                        });
                    }
                }
            }
        });

        const activeSubscriptionsTotal = safeSubs
            .filter(s => s && s.isActive)
            .reduce((acc, s) => acc + (s.amount !== undefined ? s.amount : (s.value || 0)), 0);

        return {
            activeSubscriptionsTotal,
            upcomingFinishes: upcomingFinishes.slice(0, 3)
        };
    }, [loans, subscriptions]);

    const monthlyComparison = useMemo(() => {
        return calculateMonthlyComparisonSummary({
            selectedMonth,
            loans,
            expenses,
            subscriptions,
            incomes
        });
    }, [selectedMonth, loans, expenses, subscriptions, incomes]);

    const deterministicInsights = useMemo(() => {
        return generateDeterministicFinancialInsights({
            selectedMonth,
            loans,
            expenses,
            subscriptions,
            incomes,
            clients,
            maxInsights: 3
        });
    }, [selectedMonth, loans, expenses, subscriptions, incomes, clients]);

    const financialAlerts = useMemo(() => {
        return generateFinancialAlerts({
            selectedMonth,
            loans,
            expenses,
            subscriptions,
            cards,
            clients,
            notificationSettings: userProfile?.notificationSettings || {},
            maxAlerts: 3
        });
    }, [selectedMonth, loans, expenses, subscriptions, cards, clients, userProfile?.notificationSettings]);

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

        const updatedLoansMap = new Map();

        itemsToUpdate.forEach(item => {
            if (item.type === 'Parcela') {
                const loanId = item.loanId;
                let loanData = updatedLoansMap.get(loanId);
                if (!loanData) {
                    const originalLoan = loans.find(l => l.id === loanId);
                    if (!originalLoan) return;
                    loanData = JSON.parse(JSON.stringify(originalLoan));
                    updatedLoansMap.set(loanId, loanData);
                }

                if (loanData.isShared && item.personKey && loanData.sharedDetails?.[item.personKey]) {
                    const personDetails = loanData.sharedDetails[item.personKey];
                    const instList = personDetails.installments;
                    if (Array.isArray(instList)) {
                        const inst = instList.find(i => i.number === item.number);
                        if (inst) {
                            inst.status = 'Paga';
                            inst.paidDate = new Date().toISOString().split('T')[0];
                        }
                    }
                } else if (!loanData.isShared && Array.isArray(loanData.installments)) {
                    const inst = loanData.installments.find(i => i.number === item.number);
                    if (inst) {
                        inst.status = 'Paga';
                        inst.paidDate = new Date().toISOString().split('T')[0];
                    }
                }
            } else if (item.type === 'Despesa') {
                const expenseDocRef = doc(db, ...userCollectionPath, userId, 'expenses', item.id);
                batch.update(expenseDocRef, { 
                    status: 'Paga',
                    userId: userId,
                    updatedAt: serverTimestamp()
                });
                updatesMade++;
            } else if (item.type === 'Assinatura') {
                const isPaid = paidSubscriptions.some(ps => ps.subscriptionId === item.originalId && ps.month === selectedMonth);
                if (!isPaid) {
                    const paidSubscriptionsRef = collection(db, ...userCollectionPath, userId, 'paidSubscriptions');
                    const newPaidSub = {
                        subscriptionId: item.originalId,
                        month: selectedMonth,
                        paidDate: new Date().toISOString().split('T')[0],
                        userId: userId,
                        createdAt: serverTimestamp()
                    };
                    batch.set(doc(paidSubscriptionsRef), newPaidSub);
                    updatesMade++;
                }
            }
        });

        // Atualiza os empréstimos recalculando saldos e status para manter sincronização total
        updatedLoansMap.forEach((loanData, loanId) => {
            const loanDocRef = doc(db, ...userCollectionPath, userId, 'loans', loanId);
            const fieldsToUpdate = {
                userId: userId,
                updatedAt: serverTimestamp()
            };

            if (loanData.isShared && loanData.sharedDetails) {
                ['person1', 'person2'].forEach(pKey => {
                    if (loanData.sharedDetails[pKey]) {
                        const insts = Array.isArray(loanData.sharedDetails[pKey].installments) ? loanData.sharedDetails[pKey].installments : [];
                        const origAmount = loanData.sharedDetails[pKey].shareAmount || 0;
                        const valPaid = insts.filter(i => i.status === 'Paga').reduce((sum, i) => sum + (i.value || 0), 0);
                        const balDue = parseFloat(Math.max(0, origAmount - valPaid).toFixed(2));
                        const finalStatus = balDue <= 0.01 ? 'Pago Total' : (valPaid > 0 ? 'Pago Parcial' : 'Pendente');

                        fieldsToUpdate[`sharedDetails.${pKey}.installments`] = insts;
                        fieldsToUpdate[`sharedDetails.${pKey}.valuePaid`] = valPaid;
                        fieldsToUpdate[`sharedDetails.${pKey}.balanceDue`] = balDue;
                        fieldsToUpdate[`sharedDetails.${pKey}.statusPayment`] = finalStatus;
                    }
                });
            } else if (!loanData.isShared) {
                const insts = Array.isArray(loanData.installments) ? loanData.installments : [];
                const origAmount = loanData.totalValue || 0;
                const valPaid = insts.filter(i => i.status === 'Paga').reduce((sum, i) => sum + (i.value || 0), 0);
                const balDue = parseFloat(Math.max(0, origAmount - valPaid).toFixed(2));
                const finalStatus = balDue <= 0.01 ? 'Pago Total' : (valPaid > 0 ? 'Pago Parcial' : 'Pendente');

                fieldsToUpdate.installments = insts;
                fieldsToUpdate.valuePaidClient = valPaid;
                fieldsToUpdate.balanceDueClient = balDue;
                fieldsToUpdate.statusPaymentClient = finalStatus;
            }

            batch.update(loanDocRef, fieldsToUpdate);
            updatesMade++;
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
            <div className="flex justify-center items-center h-full min-h-[500px] p-6 bg-carbon-900 border border-carbon-800 rounded-3xl shadow-2xl">
                <Spinner />
            </div>
        );
    }
    
    return (
        <div className="space-y-8 animate-fadeIn">
            {isSyncStale && (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-3 text-amber-300 text-sm animate-fade-in shadow-lg" role="alert">
                    <svg className="w-5 h-5 flex-shrink-0 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span>Não foi possível atualizar os dados em tempo real. Os valores exibidos podem estar desatualizados.</span>
                </div>
            )}
            {/* Header com Filtros em Cards Carbono/Dourado */}
            <div className="bg-carbon-900 border border-carbon-800 p-6 sm:p-8 rounded-3xl shadow-2xl space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-gold-cream">
                            Resumo Financeiro 💳
                        </h2>
                        <p className="text-sm text-gray-400 mt-1">
                            Acompanhe suas faturas e o controle do seu cartão Black.
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
                        <button
                            type="button"
                            onClick={handleCurrentMonth}
                            className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-gold/10 text-gold border border-gold/20 hover:bg-gold/20 transition cursor-pointer"
                        >
                            Mês Atual
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsExecutiveSummaryOpen(true)}
                            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-gold/15 text-gold border border-gold/40 hover:bg-gold/25 transition cursor-pointer"
                            title="Abrir Resumo Executivo Semanal e Mensal"
                        >
                            <span>📋</span>
                            <span>Resumo Executivo</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsSimulatorOpen(true)}
                            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-purple-500/15 text-purple-300 border border-purple-500/30 hover:bg-purple-500/25 transition cursor-pointer"
                            title="Abrir Simulador Financeiro Sandbox (E se...?)"
                        >
                            <span>🧪</span>
                            <span>Simulador</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsNotificationSettingsOpen(true)}
                            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-carbon-800 text-gray-300 border border-carbon-700 hover:text-gold hover:bg-carbon-700 transition cursor-pointer"
                            title="Configurar Preferências de Alertas"
                        >
                            <span>⚙️</span>
                            <span>Alertas</span>
                        </button>
                        <button
                            type="button"
                            onClick={handleExportMonthCsv}
                            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-carbon-800 text-gold-cream border border-carbon-700 hover:bg-carbon-700 transition cursor-pointer"
                            title="Exportar lançamentos do mês em CSV"
                        >
                            <span>📥</span>
                            <span>CSV Mês</span>
                        </button>
                        <button
                            type="button"
                            onClick={handleExportAnnualCsv}
                            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-gold/10 text-gold border border-gold/30 hover:bg-gold/20 transition cursor-pointer"
                            title={`Exportar Relatório Anual Consolidado (${selectedMonth.slice(0, 4)})`}
                        >
                            <span>📊</span>
                            <span>Relatório Anual {selectedMonth.slice(0, 4)}</span>
                        </button>
                    </div>
                </div>

                {/* Filtros */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                    <div className="flex items-center gap-2">
                        <button 
                            type="button"
                            onClick={handlePrevMonth}
                            aria-label="Mês anterior"
                            title="Mês anterior"
                            className="p-3 bg-carbon-800 hover:bg-carbon-700 text-gold-cream border border-carbon-700 rounded-2xl shadow-sm transition cursor-pointer flex-shrink-0"
                        >
                            ◀
                        </button>
                        <input 
                            type="month" 
                            value={selectedMonth} 
                            onChange={(e) => setSelectedMonth(e.target.value)} 
                            aria-label="Selecionar mês e ano de competência"
                            className="w-full p-3 bg-carbon-800 border border-carbon-700 rounded-2xl shadow-sm text-gold-cream focus:ring-2 focus:ring-gold focus:outline-none transition" 
                        />
                        <button 
                            type="button"
                            onClick={handleNextMonth}
                            aria-label="Próximo mês"
                            title="Próximo mês"
                            className="p-3 bg-carbon-800 hover:bg-carbon-700 text-gold-cream border border-carbon-700 rounded-2xl shadow-sm transition cursor-pointer flex-shrink-0"
                        >
                            ▶
                        </button>
                    </div>
                    <select 
                        value={selectedCardFilter} 
                        onChange={(e) => setSelectedCardFilter(e.target.value)} 
                        aria-label="Filtrar por cartão"
                        className="p-3 bg-carbon-800 border border-carbon-700 rounded-2xl shadow-sm text-gold-cream focus:ring-2 focus:ring-gold focus:outline-none transition"
                    >
                        <option value="">Todos os Cartões</option>
                        {cards.map(card => (<option key={card.id} value={card.id}>{card.name}</option>))}
                    </select>
                    <select 
                        value={selectedClientFilter} 
                        onChange={(e) => setSelectedClientFilter(e.target.value)} 
                        aria-label="Filtrar por pessoa"
                        className="p-3 bg-carbon-800 border border-carbon-700 rounded-2xl shadow-sm text-gold-cream focus:ring-2 focus:ring-gold focus:outline-none transition"
                    >
                        <option value="">Todas as Pessoas</option>
                        {clients.map(client => (<option key={client.id} value={client.id}>{client.name}</option>))}
                    </select>
                </div>
            </div>

            {/* Banner de Alertas Financeiros Internos */}
            <FinancialAlertsBanner alerts={financialAlerts} />

            {/* Grid Principal: Cards e Resumo à esquerda, Gráficos e Inteligência à direita */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 space-y-6">
                    {/* Card Fatura Total com Gradiente Dourado Sutil */}
                    <div className="bg-gradient-to-br from-carbon-900 via-carbon-900 to-carbon-800 border border-carbon-700 p-6 rounded-3xl shadow-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-gold-glow">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-medium text-gray-400">Fatura Total do Mês</h3>
                            <div className="w-10 h-10 rounded-2xl bg-gold/10 text-gold flex items-center justify-center font-bold border border-gold/20">
                                💳
                            </div>
                        </div>
                        <p className="text-3xl font-extrabold tracking-tight text-gold-cream mt-4">
                            {formatCurrencyDisplay(summary.totalFatura)}
                        </p>
                        <div className="mt-3 flex items-center gap-2">
                            {monthlyComparison.previousInvoiceTotal > 0 ? (
                                <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-lg border ${
                                    monthlyComparison.invoiceDelta.direction === 'up'
                                        ? 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                                        : (monthlyComparison.invoiceDelta.direction === 'down'
                                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                            : 'bg-carbon-800 text-gray-400 border-carbon-700')
                                }`}>
                                    <span>{monthlyComparison.invoiceDelta.direction === 'up' ? '▲' : (monthlyComparison.invoiceDelta.direction === 'down' ? '▼' : '•')}</span>
                                    <span>{monthlyComparison.invoiceDelta.label} vs mês anterior</span>
                                </span>
                            ) : (
                                <span className="text-[11px] text-gray-500 font-medium">Mês base de referência</span>
                            )}
                        </div>
                    </div>

                    {/* Card Progresso de Pagamento */}
                    <div className="bg-carbon-900 border border-carbon-800 p-6 rounded-3xl shadow-2xl transition-all duration-300 hover:-translate-y-1">
                        <h3 className="text-sm font-medium text-gray-400">Progresso de Pagamento</h3>
                        <div className="w-full bg-carbon-800 rounded-full h-3 my-4 overflow-hidden border border-carbon-700">
                            <div className="bg-gradient-to-r from-gold-light to-gold h-3 rounded-full transition-all duration-500" style={{ width: `${paidPercentage}%` }}></div>
                        </div>
                        <div className="flex justify-between text-xs sm:text-sm font-medium">
                            <span className="text-gold font-semibold">{formatCurrencyDisplay(summary.totalRecebido)} <span className="text-gray-400 font-normal">Pago</span></span>
                            <span className="text-amber-300">{formatCurrencyDisplay(summary.totalPendente)} <span className="text-gray-400 font-normal">Pendente</span></span>
                        </div>
                    </div>

                    {/* ProSummary em Card Carbono */}
                    <div className="bg-carbon-900 border border-carbon-800 p-6 rounded-3xl shadow-2xl">
                        <ProSummary selectedMonth={selectedMonth} totalExpenses={summary.totalFatura} incomes={incomes} />
                    </div>
                </div>

                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-carbon-900 border border-carbon-800 p-6 sm:p-8 rounded-3xl shadow-2xl">
                        <ProAnalyticsCharts
                            loans={filteredLoansForChart}
                            clients={clients}
                            expenses={filteredExpensesForChart}
                            subscriptions={filteredSubscriptionsForChart}
                            theme={theme}
                        />
                    </div>

                    {/* Novos Widgets de Inteligência (Auditoria Relâmpago & Metas de Quitação) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        
                        {/* Widget 1: Auditoria Relâmpago (Mini Modo Crise) */}
                        <div className="bg-carbon-900 border border-carbon-800 p-6 rounded-3xl shadow-2xl space-y-4">
                            <div className="flex items-center gap-2.5 text-amber-400">
                                <ShieldAlertIcon />
                                <h3 className="text-sm font-bold uppercase tracking-wider">Auditoria Relâmpago</h3>
                            </div>
                            <div className="space-y-2.5 text-xs text-gray-300">
                                <div className="p-3 bg-carbon-800/60 border border-carbon-700/60 rounded-2xl flex justify-between items-center">
                                    <span>Compromissos Recorrentes (Assinaturas)</span>
                                    <span className="font-mono font-bold text-gold">{formatCurrencyDisplay(intelligenceData.activeSubscriptionsTotal)}/mês</span>
                                </div>
                                <p className="text-[11px] text-gray-400 leading-relaxed px-1">
                                    💡 <strong className="text-gold-cream">Dica de Ouro:</strong> Suas assinaturas ativas representam um custo contínuo. Revise serviços pouco utilizados para aliviar a fatura.
                                </p>
                            </div>
                        </div>

                        {/* Widget 2: Metas & Timeline de Quitação */}
                        <div className="bg-carbon-900 border border-carbon-800 p-6 rounded-3xl shadow-2xl space-y-4">
                            <div className="flex items-center gap-2.5 text-gold">
                                <TargetIcon />
                                <h3 className="text-sm font-bold uppercase tracking-wider">Metas & Quitação de Dívidas</h3>
                            </div>
                            {intelligenceData.upcomingFinishes.length > 0 ? (
                                <div className="space-y-2.5">
                                    {intelligenceData.upcomingFinishes.map((item, idx) => (
                                        <div key={idx} className="p-3 bg-carbon-800/60 border border-carbon-700/60 rounded-2xl flex justify-between items-center">
                                            <div className="truncate pr-2">
                                                <span className="text-xs font-bold text-gold-cream block truncate">{item.description}</span>
                                                <span className="text-[10px] text-gray-400">Faltam {item.remaining} parcelas</span>
                                            </div>
                                            <span className="text-[11px] font-semibold text-emerald-400 whitespace-nowrap bg-emerald-500/10 px-2.5 py-1 rounded-xl border border-emerald-500/20">
                                                Até {new Date(item.finalDate + 'T00:00:00Z').toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-6 text-xs text-gray-500">
                                    Nenhuma compra parcelada ativa para projetar quitação no momento.
                                </div>
                            )}
                        </div>

                    </div>
                </div>
            </div>

            {/* Insights Financeiros Automáticos */}
            <DeterministicInsightsWidget insights={deterministicInsights} />

            {/* Projeção de Faturas e Descompressão Futura */}
            <FutureCommitmentsCard 
                loans={loans} 
                subscriptions={subscriptions} 
                selectedMonth={selectedMonth} 
            />

            {/* Metas de Orçamento por Categoria (Budgets) */}
            <CategoryBudgetsWidget
                budgets={userProfile?.budgets || {}}
                expenses={expenses}
                loans={loans}
                selectedMonth={selectedMonth}
                onOpenBudgetModal={() => setIsBudgetsModalOpen(true)}
            />

            {/* Tabela de Itens da Fatura */}
            <div className="bg-carbon-900 border border-carbon-800 rounded-3xl shadow-2xl overflow-hidden">
                <div className="p-6 border-b border-carbon-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <h3 className="text-lg font-bold text-gold-cream">Itens da Fatura</h3>
                    <button 
                        onClick={() => setIsMarkAllPaidConfirmationOpen(true)}
                        className="bg-gold/10 text-gold border border-gold/30 px-4 py-2 rounded-2xl hover:bg-gold/20 text-xs font-semibold transition cursor-pointer"
                    >
                        Marcar Tudo Como Pago
                    </button>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="min-w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-carbon-800 text-xs font-semibold text-gray-400 uppercase tracking-wider bg-carbon-800/50">
                                <th className="px-6 py-4 cursor-pointer" onClick={() => requestSort('type')}>
                                    Tipo {sortConfig.key === 'type' && <SortIcon direction={sortConfig.direction} />}
                                </th>
                                <th className="px-6 py-4">Descrição</th>
                                <th className="px-6 py-4 cursor-pointer" onClick={() => requestSort('clientId')}>
                                    Pessoa {sortConfig.key === 'clientId' && <SortIcon direction={sortConfig.direction} />}
                                </th>
                                <th className="px-6 py-4 cursor-pointer" onClick={() => requestSort('cardId')}>
                                    Cartão {sortConfig.key === 'cardId' && <SortIcon direction={sortConfig.direction} />}
                                </th>
                                <th className="px-6 py-4">Valor da Parcela</th>
                                <th className="px-6 py-4">Nº Parcelas</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-carbon-800 text-sm">
                            {displayableItems.length > 0 ? displayableItems.map((item) => {
                                const client = clients.find(c => c.id === item.clientId);
                                const card = cards.find(c => c.id === item.cardId);
                                return (
                                    <tr key={item.id} className="hover:bg-carbon-800/40 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-gray-400 font-medium">{item.type}</td>
                                        <td className="px-6 py-4 whitespace-nowrap font-semibold text-gold-cream">{item.description}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-gray-400">{client?.name || '---'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-gray-400">
                                            {card ? (
                                                <div className="flex items-center gap-2">
                                                    <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: card.color || '#F2B705' }}></div>
                                                    <span>{card.name}</span>
                                                </div>
                                            ) : '---'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap font-bold text-gold">{formatCurrencyDisplay(item.value)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-gray-400">
                                            {item.type === 'Parcela' ? `${item.number}/${item.installmentsCount}` : '1/1'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${
                                                item.currentStatus === 'Paga' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                                item.currentStatus === 'Pendente' ? 'bg-gold/10 text-gold border-gold/20' :
                                                item.currentStatus === 'Atrasado' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                                                'bg-gray-800 text-gray-400 border-gray-700'
                                            }`}>
                                                {item.currentStatus}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {item.currentStatus !== 'Paga' && (
                                                <button onClick={() => updateItemStatus(item, 'Paga')} className="bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 px-3 py-1.5 rounded-xl text-xs font-semibold transition border border-emerald-500/20 cursor-pointer">
                                                    Marcar Paga
                                                </button>
                                            )}
                                            {item.currentStatus === 'Paga' && (
                                                 <button onClick={() => updateItemStatus(item, 'Pendente')} className="bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 px-3 py-1.5 rounded-xl text-xs font-semibold transition border border-rose-500/20 cursor-pointer">
                                                     Desmarcar
                                                 </button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            }) : (
                                <tr>
                                    <td colSpan="8" className="text-center py-12 text-gray-500">
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

            <ExecutiveSummaryModal
                isOpen={isExecutiveSummaryOpen}
                onClose={() => setIsExecutiveSummaryOpen(false)}
                selectedMonth={selectedMonth}
                loans={loans}
                expenses={expenses}
                subscriptions={subscriptions}
                incomes={incomes}
                clients={clients}
            />

            <FinancialSandboxSimulatorModal
                isOpen={isSimulatorOpen}
                onClose={() => setIsSimulatorOpen(false)}
                loans={loans}
                subscriptions={subscriptions}
                selectedMonth={selectedMonth}
            />

            <CategoryBudgetsModal
                isOpen={isBudgetsModalOpen}
                onClose={() => setIsBudgetsModalOpen(false)}
                currentBudgets={userProfile?.budgets || {}}
                onSaveBudgets={handleSaveBudgets}
            />

            <NotificationSettingsModal
                isOpen={isNotificationSettingsOpen}
                onClose={() => setIsNotificationSettingsOpen(false)}
                currentSettings={userProfile?.notificationSettings || {}}
                onSaveSettings={handleSaveNotificationSettings}
            />
        </div>
    );
}

export default Dashboard;