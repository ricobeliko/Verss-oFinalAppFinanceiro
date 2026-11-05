// src/features/dashboard/Dashboard.jsx

import React, { useState, useEffect, useMemo, useRef } from 'react';
import useEnterStagger from '../../hooks/useEnterStagger';
import { collection, getDocs, doc, updateDoc, writeBatch, addDoc, query, where, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { useAppContext } from '../../context/AppContext';
import { subscribeToFirestoreQuery, buildCanonicalQueryKey } from '../../services/firestoreSubscriptionRegistry';
import { formatCurrencyDisplay } from '../../utils/currency';
import {
    calculateMonthlyComparisonSummary,
    calculateMonthlySeries,
    calculateInvoiceBreakdownForMonth,
    toCents,
    fromCents,
    calculateRemainingAmount,
    calculatePaymentStatus,
    mapDomainStatusToLoanStatus
} from '../../services/financialService';
import ProAnalyticsCharts from '../../components/ProAnalyticsCharts';
import MonthlyEvolutionChart from '../../components/MonthlyEvolutionChart';
import KpiCard from '../../components/KpiCard';
import GenericModal from '../../components/GenericModal';
import FutureCommitmentsCard from '../../components/FutureCommitmentsCard';
import FinancialSandboxSimulatorModal from '../../components/FinancialSandboxSimulatorModal';
import AnimatedCurrency from '../../components/AnimatedCurrency';
import AnimatedProgressBar from '../../components/AnimatedProgressBar';
import ProFeatureLock from '../../components/ProFeatureLock';
import UpgradePrompt from '../../components/UpgradePrompt';
import Spinner from '../../components/Spinner';
import { SkeletonPage } from '../../design-system';
import Surface from '../../design-system/primitives/Surface';
import Badge from '../../design-system/primitives/Badge';


const CreditCardKpiIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect width="20" height="14" x="2" y="5" rx="2" />
        <line x1="2" x2="22" y1="10" y2="10" />
    </svg>
);

// Ícone para a ordenação da tabela
const SortIcon = ({ direction }) => (
    <svg aria-hidden="true" className="w-4 h-4 inline-block ml-1 text-fc-accent transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        {direction === 'ascending' ? <path strokeLinecap="round" strokeWidth="2" d="M5 15l7-7 7 7"></path> : <path strokeLinecap="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>}
    </svg>
);

function Dashboard({ selectedMonth, setSelectedMonth, selectedCardFilter, setSelectedCardFilter, selectedClientFilter, setSelectedClientFilter }) {
    const { db, userId, isAuthReady, theme, getUserCollectionPathSegments, showToast, isPro, isTrialActive, handleUpgradeClick, activateFreeTrial } = useAppContext();
    const hasProAccess = isPro || isTrialActive;

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
    const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
    const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
    const [isSyncStale, setIsSyncStale] = useState(false);
    const [sortConfig, setSortConfig] = useState({ key: 'dueDate', direction: 'ascending' });
    const scopeRef = useRef(null);
    useEnterStagger(scopeRef, { ready: !isLoading });

    useEffect(() => {
        if (!isAuthReady || !db || !userId) {
            setIsLoading(false);
            return;
        }

        // Suporte a dados sintéticos isolados para testes E2E sem tocar na produção
        if (import.meta.env.DEV && (typeof window !== 'undefined' && (window.__FINCONTROL_E2E_MOCK_DATA__ || sessionStorage.getItem('fincontrol_e2e_data')))) {
            const mock = window.__FINCONTROL_E2E_MOCK_DATA__ || JSON.parse(sessionStorage.getItem('fincontrol_e2e_data'));
            setDashboardData({
                cards: mock.cards || [{ id: 'card-1', name: 'Cartão E2E Master', limit: 5000, color: '#5CCCCC' }],
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
            showToast('Não foi possível atualizar o item. Tente novamente.', "error");
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
        
        const paidCents = installmentsList
            .filter(installment => installment.status === 'Paga')
            .reduce((sum, installment) => sum + toCents(installment.value || 0), 0);

        const newValuePaid = fromCents(paidCents);
        const newBalanceDue = calculateRemainingAmount(originalAmount, newValuePaid);
        const finalStatus = mapDomainStatusToLoanStatus(calculatePaymentStatus(originalAmount, newValuePaid));

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
            showToast('Não foi possível atualizar a parcela. Tente novamente.', "error");
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

    const {
        displayableItems,
        filteredLoansForChart,
        filteredExpensesForChart,
        filteredSubscriptionsForChart,
        summary
    } = useMemo(() => {
        try {
            if (isLoading || clients.length === 0) {
                return {
                    displayableItems: [],
                    filteredLoansForChart: [],
                    filteredExpensesForChart: [],
                    filteredSubscriptionsForChart: [],
                    summary: { totalFatura: 0, totalRecebido: 0, totalPendente: 0 }
                };
            }

            const breakdown = calculateInvoiceBreakdownForMonth({
                targetMonth: selectedMonth,
                loans,
                subscriptions,
                expenses,
                cards,
                personId: selectedClientFilter || 'all',
                cardId: selectedCardFilter || 'all',
                knownClientIds: clients,
                paidSubscriptions
            });

            const safeClients = Array.isArray(clients) ? clients : [];
            const safeCards = Array.isArray(cards) ? cards : [];

            const sortedItems = [...breakdown.items].sort((a, b) => {
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

            return {
                displayableItems: sortedItems,
                filteredLoansForChart: breakdown.filteredLoansForChart,
                filteredExpensesForChart: breakdown.filteredExpensesForChart,
                filteredSubscriptionsForChart: breakdown.filteredSubscriptionsForChart,
                summary: {
                    totalFatura: breakdown.totalCommitted,
                    totalRecebido: breakdown.totalRecebido,
                    totalPendente: breakdown.totalPendente,
                }
            };
        } catch (error) {
            console.error("ERRO FATAL DURANTE O CÁLCULO DO RESUMO:", error);
            return {
                displayableItems: [],
                filteredLoansForChart: [],
                filteredExpensesForChart: [],
                filteredSubscriptionsForChart: [],
                summary: { totalFatura: 0, totalRecebido: 0, totalPendente: 0 }
            };
        }
    }, [isLoading, loans, clients, cards, subscriptions, expenses, paidSubscriptions, selectedMonth, selectedCardFilter, selectedClientFilter, sortConfig]);
    
    const monthlyComparison = useMemo(() => {
        return calculateMonthlyComparisonSummary({
            selectedMonth,
            loans,
            expenses,
            subscriptions,
            incomes
        });
    }, [selectedMonth, loans, expenses, subscriptions, incomes]);

    const monthlySeries = useMemo(() => {
        return calculateMonthlySeries({
            loans,
            subscriptions,
            expenses,
            cards,
            endMonth: selectedMonth,
            monthsBack: 5,
            monthsForward: 0,
            personId: selectedClientFilter || 'all',
            cardId: selectedCardFilter || 'all',
            knownClientIds: clients
        });
    }, [loans, subscriptions, expenses, cards, selectedMonth, selectedClientFilter, selectedCardFilter, clients]);

    const currentMonthPoint = useMemo(() => {
        if (!monthlySeries || monthlySeries.length === 0) return null;
        return monthlySeries.find(p => p.isCurrent) || monthlySeries[monthlySeries.length - 1];
    }, [monthlySeries]);

    const selectedClientNameForProjection = useMemo(() => {
        if (!selectedClientFilter) return '';
        return (clients || []).find(c => c && c.id === selectedClientFilter)?.name || '';
    }, [clients, selectedClientFilter]);

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
                        const paidCents = insts.filter(i => i.status === 'Paga').reduce((sum, i) => sum + toCents(i.value || 0), 0);
                        const valPaid = fromCents(paidCents);
                        const balDue = calculateRemainingAmount(origAmount, valPaid);
                        const finalStatus = mapDomainStatusToLoanStatus(calculatePaymentStatus(origAmount, valPaid));

                        fieldsToUpdate[`sharedDetails.${pKey}.installments`] = insts;
                        fieldsToUpdate[`sharedDetails.${pKey}.valuePaid`] = valPaid;
                        fieldsToUpdate[`sharedDetails.${pKey}.balanceDue`] = balDue;
                        fieldsToUpdate[`sharedDetails.${pKey}.statusPayment`] = finalStatus;
                    }
                });
            } else if (!loanData.isShared) {
                const insts = Array.isArray(loanData.installments) ? loanData.installments : [];
                const origAmount = loanData.totalValue || 0;
                const paidCents = insts.filter(i => i.status === 'Paga').reduce((sum, i) => sum + toCents(i.value || 0), 0);
                const valPaid = fromCents(paidCents);
                const balDue = calculateRemainingAmount(origAmount, valPaid);
                const finalStatus = mapDomainStatusToLoanStatus(calculatePaymentStatus(origAmount, valPaid));

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
        return <SkeletonPage />;
    }
    
    return (
        <div ref={scopeRef} className="space-y-8 animate-fadeIn" aria-busy={isLoading}>
            {isSyncStale && (
                <div className="p-4 rounded-2xl bg-[var(--fc-warning-soft)] border border-[var(--fc-warning)]/30 flex items-center gap-3 text-[var(--fc-warning)] text-sm animate-fade-in shadow-sm" role="alert">
                    <svg className="w-5 h-5 flex-shrink-0 text-[var(--fc-warning)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span>Não foi possível atualizar os dados em tempo real. Os valores exibidos podem estar desatualizados.</span>
                </div>
            )}
            {/* Header com Filtros em Surface DS2 */}
            <Surface variant="elevated" padding="lg" className="space-y-6" data-enter="title">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--fc-text-primary)]">
                            Resumo financeiro
                        </h2>
                        <p className="text-sm text-[var(--fc-text-secondary)] mt-1">
                            Visão consolidada do período selecionado.
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
                        <button
                            type="button"
                            onClick={handleCurrentMonth}
                            className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-[var(--fc-accent-soft)] text-[var(--fc-accent)] border border-[var(--fc-accent)]/20 hover:bg-[var(--fc-accent)]/20 transition cursor-pointer"
                        >
                            Mês Atual
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                if (!hasProAccess) {
                                    showToast('Simulador Sandbox é exclusivo do plano Pro.', 'warning');
                                    setIsUpgradeModalOpen(true);
                                } else {
                                    setIsSimulatorOpen(true);
                                }
                            }}
                            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl bg-[var(--fc-surface-1)] text-[var(--fc-text-primary)] border border-[var(--fc-border-default)] hover:bg-[var(--fc-surface-2)] transition cursor-pointer"
                            title="Abrir Simulador Financeiro Sandbox (E se...?)"
                        >
                            <span>Simulador</span>
                            {!hasProAccess && <span className="text-[10px] text-[var(--fc-accent)]">🔒</span>}
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
                            className="min-w-[44px] min-h-[44px] p-3 bg-[var(--fc-surface-1)] hover:bg-[var(--fc-surface-2)] text-[var(--fc-text-primary)] border border-[var(--fc-border-default)] rounded-xl shadow-sm transition cursor-pointer flex-shrink-0 flex items-center justify-center"
                        >
                            ◀
                        </button>
                        <input 
                            type="month" 
                            value={selectedMonth} 
                            onChange={(e) => setSelectedMonth(e.target.value)} 
                            aria-label="Selecionar mês e ano de competência"
                            className="w-full min-h-[44px] px-3.5 py-2.5 bg-[var(--fc-surface-1)] border border-[var(--fc-border-default)] rounded-xl shadow-sm text-[var(--fc-text-primary)] focus:ring-2 focus:ring-[var(--fc-focus-ring)] focus:outline-none transition" 
                        />
                        <button 
                            type="button"
                            onClick={handleNextMonth}
                            aria-label="Próximo mês"
                            title="Próximo mês"
                            className="min-w-[44px] min-h-[44px] p-3 bg-[var(--fc-surface-1)] hover:bg-[var(--fc-surface-2)] text-[var(--fc-text-primary)] border border-[var(--fc-border-default)] rounded-xl shadow-sm transition cursor-pointer flex-shrink-0 flex items-center justify-center"
                        >
                            ▶
                        </button>
                    </div>
                    <select 
                        value={selectedCardFilter} 
                        onChange={(e) => setSelectedCardFilter(e.target.value)} 
                        aria-label="Filtrar por cartão"
                        className="min-h-[44px] px-3.5 py-2.5 bg-[var(--fc-surface-1)] border border-[var(--fc-border-default)] rounded-xl shadow-sm text-[var(--fc-text-primary)] focus:ring-2 focus:ring-[var(--fc-focus-ring)] focus:outline-none transition"
                    >
                        <option value="">Todos os Cartões</option>
                        {cards.map(card => (<option key={card.id} value={card.id}>{card.name}</option>))}
                    </select>
                    <select 
                        value={selectedClientFilter} 
                        onChange={(e) => setSelectedClientFilter(e.target.value)} 
                        aria-label="Filtrar por pessoa"
                        className="min-h-[44px] px-3.5 py-2.5 bg-[var(--fc-surface-1)] border border-[var(--fc-border-default)] rounded-xl shadow-sm text-[var(--fc-text-primary)] focus:ring-2 focus:ring-[var(--fc-focus-ring)] focus:outline-none transition"
                    >
                        <option value="">Todas as Pessoas</option>
                        {clients.map(client => (<option key={client.id} value={client.id}>{client.name}</option>))}
                    </select>
                </div>
            </Surface>

            {/* Grid Principal: KPIs à esquerda e Gráficos à direita */}
            <div data-enter="item" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 space-y-6">
                    {/* Card Fatura Total com KpiCard DS2 */}
                    <KpiCard
                        title="Fatura Total do Mês"
                        value={summary.totalFatura}
                        variant="accent"
                        icon={<CreditCardKpiIcon />}
                        delta={currentMonthPoint?.delta || (monthlyComparison.previousInvoiceTotal > 0 ? monthlyComparison.invoiceDelta : undefined)}
                        deltaSubtitle="vs. mês anterior"
                        sparklineData={monthlySeries.map(p => p.totalCommitted)}
                        sparklineLabel="Evolução da fatura nos últimos 6 meses"
                    />

                    {/* Card Progresso de Pagamento com KpiCard DS2 */}
                    <KpiCard
                        title="Progresso de Pagamento"
                        value={summary.totalRecebido}
                        variant="success"
                        icon={<span>✓</span>}
                        sparklineData={monthlySeries.map(p => p.installmentsTotal)}
                        sparklineLabel="Evolução de parcelas nos últimos 6 meses"
                        secondaryContent={
                            <div className="space-y-3 pt-1">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold uppercase tracking-wider text-[var(--fc-text-secondary)]">Quitado</span>
                                    <span className="text-xs font-bold text-[var(--fc-text-primary)]">{paidPercentage.toFixed(0)}%</span>
                                </div>
                                <AnimatedProgressBar
                                    containerClassName="w-full bg-[var(--fc-surface-1)] rounded-full h-2.5 overflow-hidden border border-[var(--fc-border-default)]"
                                    className="bg-[var(--fc-accent)] h-2.5 rounded-full transition-all duration-300"
                                    percentage={paidPercentage}
                                    delay={0.2}
                                    aria-label="Progresso de Pagamento da Fatura"
                                />
                                <div className="flex justify-between text-xs font-medium pt-1">
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-[var(--fc-success)]"></span>
                                        <span className="text-[var(--fc-text-secondary)]">Pago:</span>
                                        <span className="text-[var(--fc-text-primary)] font-semibold"><AnimatedCurrency value={summary.totalRecebido} /></span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-[var(--fc-warning)]"></span>
                                        <span className="text-[var(--fc-text-secondary)]">Pendente:</span>
                                        <span className="text-[var(--fc-text-primary)] font-semibold"><AnimatedCurrency value={summary.totalPendente} /></span>
                                    </div>
                                </div>
                            </div>
                        }
                    />
                </div>

                <div className="lg:col-span-2">
                    <div className="bg-[var(--fc-surface-1)] border border-[var(--fc-border-default)] p-6 sm:p-8 rounded-3xl shadow-[var(--fc-shadow-md)] h-full">
                        <ProAnalyticsCharts
                            loans={filteredLoansForChart}
                            clients={clients}
                            expenses={filteredExpensesForChart}
                            subscriptions={filteredSubscriptionsForChart}
                            theme={theme}
                        />
                    </div>
                </div>
            </div>

            {/* Gráfico Destaque: Evolução Mensal de Compromissos (Histórico + Projeção com Recharts) */}
            <MonthlyEvolutionChart
                loans={loans}
                subscriptions={subscriptions}
                expenses={expenses}
                cards={cards}
                selectedMonth={selectedMonth}
                selectedCardFilter={selectedCardFilter}
                clients={clients}
                isPro={isPro}
                isTrialActive={isTrialActive}
                onUpgradeClick={handleUpgradeClick}
                theme={theme}
            />

            {/* Projeção de Faturas e Descompressão Futura (com seletor por pessoa integrado) */}
            {hasProAccess ? (
                <FutureCommitmentsCard 
                    loans={loans} 
                    subscriptions={subscriptions} 
                    selectedMonth={selectedMonth} 
                    clients={clients}
                    selectedClientName={selectedClientNameForProjection}
                />
            ) : (
                <ProFeatureLock
                    title="Projeção de Faturas Futuras"
                    description="Visualize a descompressão das suas faturas nos próximos meses e planeje com antecedência."
                    onAction={() => setIsUpgradeModalOpen(true)}
                />
            )}

            {/* Tabela de Itens da Fatura */}
            <div data-enter="item" className="bg-[var(--fc-surface-1)] border border-[var(--fc-border-default)] rounded-3xl shadow-[var(--fc-shadow-md)] overflow-hidden">
                <div className="p-6 border-b border-[var(--fc-border-subtle)] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">

                    <h3 className="text-base font-bold text-[var(--fc-text-primary)]">Itens da Fatura</h3>
                    <button 
                        type="button"
                        onClick={() => setIsMarkAllPaidConfirmationOpen(true)}
                        className="bg-[var(--fc-accent-soft)] text-[var(--fc-accent)] border border-[var(--fc-accent)]/30 px-4 py-2 rounded-xl hover:bg-[var(--fc-accent)]/20 text-xs font-semibold transition cursor-pointer"
                    >
                        Marcar Tudo Como Pago
                    </button>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="min-w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-[var(--fc-border-subtle)] text-xs font-semibold text-[var(--fc-text-secondary)] uppercase tracking-wider bg-[var(--fc-surface-2)]">
                                <th scope="col" aria-sort={sortConfig.key === 'type' ? (sortConfig.direction === 'ascending' ? 'ascending' : 'descending') : 'none'} className="px-6 py-4 cursor-pointer" onClick={() => requestSort('type')}>
                                    Tipo {sortConfig.key === 'type' && <SortIcon direction={sortConfig.direction} />}
                                </th>
                                <th scope="col" className="px-6 py-4">Descrição</th>
                                <th scope="col" aria-sort={sortConfig.key === 'clientId' ? (sortConfig.direction === 'ascending' ? 'ascending' : 'descending') : 'none'} className="px-6 py-4 cursor-pointer" onClick={() => requestSort('clientId')}>
                                    Pessoa {sortConfig.key === 'clientId' && <SortIcon direction={sortConfig.direction} />}
                                </th>
                                <th scope="col" aria-sort={sortConfig.key === 'cardId' ? (sortConfig.direction === 'ascending' ? 'ascending' : 'descending') : 'none'} className="px-6 py-4 cursor-pointer" onClick={() => requestSort('cardId')}>
                                    Cartão {sortConfig.key === 'cardId' && <SortIcon direction={sortConfig.direction} />}
                                </th>
                                <th scope="col" className="px-6 py-4">Valor da Parcela</th>
                                <th scope="col" className="px-6 py-4">Nº Parcelas</th>
                                <th scope="col" className="px-6 py-4">Status</th>
                                <th scope="col" className="px-6 py-4">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--fc-border-subtle)] text-sm">
                            {displayableItems.length > 0 ? displayableItems.map((item) => {
                                const client = clients.find(c => c.id === item.clientId);
                                const card = cards.find(c => c.id === item.cardId);
                                return (
                                    <tr key={item.id} className="hover:bg-[var(--fc-surface-2)]/50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-[var(--fc-text-secondary)] font-medium">{item.type}</td>
                                        <td className="px-6 py-4 whitespace-nowrap font-semibold text-[var(--fc-text-primary)]">{item.description}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-[var(--fc-text-secondary)]">{client?.name || '---'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-[var(--fc-text-secondary)]">
                                            {card ? (
                                                <div className="flex items-center gap-2">
                                                    <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: card.color || '#5CCCCC' }} aria-hidden="true"></div>
                                                    <span>{card.name}</span>
                                                </div>
                                            ) : '---'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap font-bold text-[var(--fc-accent)] font-mono">{formatCurrencyDisplay(item.value)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-[var(--fc-text-secondary)]">
                                            {item.type === 'Parcela' ? `${item.number}/${item.installmentsCount}` : '1/1'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${
                                                item.currentStatus === 'Paga' ? 'bg-[var(--fc-success-soft)] text-[var(--fc-success)] border-[var(--fc-success)]/30' :
                                                item.currentStatus === 'Pendente' ? 'bg-[var(--fc-warning-soft)] text-[var(--fc-warning)] border-[var(--fc-warning)]/30' :
                                                item.currentStatus === 'Atrasado' ? 'bg-[var(--fc-danger-soft)] text-[var(--fc-danger)] border-[var(--fc-danger)]/30' :
                                                'bg-[var(--fc-surface-2)] text-[var(--fc-text-muted)] border-[var(--fc-border-default)]'
                                            }`}>
                                                {item.currentStatus}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {item.currentStatus !== 'Paga' && (
                                                <button 
                                                    type="button"
                                                    onClick={() => updateItemStatus(item, 'Paga')} 
                                                    aria-label={`Marcar ${item.description} como paga`}
                                                    className="bg-[var(--fc-success-soft)] text-[var(--fc-success)] hover:bg-[var(--fc-success)]/20 px-3 py-1.5 rounded-xl text-xs font-semibold transition border border-[var(--fc-success)]/20 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--fc-focus-ring)]"
                                                >
                                                    Marcar Paga
                                                </button>
                                            )}
                                            {item.currentStatus === 'Paga' && (
                                                 <button 
                                                    type="button"
                                                    onClick={() => updateItemStatus(item, 'Pendente')} 
                                                    aria-label={`Desmarcar ${item.description}`}
                                                    className="bg-[var(--fc-danger-soft)] text-[var(--fc-danger)] hover:bg-[var(--fc-danger)]/20 px-3 py-1.5 rounded-xl text-xs font-semibold transition border border-[var(--fc-danger)]/20 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--fc-focus-ring)]"
                                                 >
                                                     Desmarcar
                                                 </button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            }) : (
                                <tr>
                                    <td colSpan="8" className="text-center py-12 text-[var(--fc-text-muted)]">
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
            />

            <FinancialSandboxSimulatorModal
                isOpen={isSimulatorOpen}
                onClose={() => setIsSimulatorOpen(false)}
                loans={loans}
                subscriptions={subscriptions}
                selectedMonth={selectedMonth}
            />

            {/* Modal de Upgrade Pro */}
            <GenericModal
                isOpen={isUpgradeModalOpen}
                onClose={() => setIsUpgradeModalOpen(false)}
                maxWidth="max-w-lg"
            >
                <UpgradePrompt
                    onUpgradeClick={handleUpgradeClick}
                    onActivateTrial={activateFreeTrial}
                />
            </GenericModal>
        </div>
    );
}

export default Dashboard;
