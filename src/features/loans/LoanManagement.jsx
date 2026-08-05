// src/features/loans/LoanManagement.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, doc, updateDoc, addDoc, deleteDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { useAppContext } from '../../context/AppContext';
import { formatCurrencyDisplay, parseCurrencyInput, handleCurrencyInputChange, formatCurrencyForInput } from '../../utils/currency';
import GenericModal from '../../components/GenericModal';

// --- Componentes de Ícone ---
const EditIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const DeleteIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>;
const ChevronDown = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>;
const ChevronUp = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>;
const WarningIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="text-rose-400 flex-shrink-0" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>;
const PlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;

function LoanManagement({ onOpenPdfModal }) {
    const { db: database, userId, isAuthReady: isAuthenticationReady, getUserCollectionPathSegments, theme, showToast } = useAppContext();

    const [allLoans, setAllLoans] = useState([]);
    const [allClients, setAllClients] = useState([]);
    const [allCards, setAllCards] = useState([]);

    const [isLoading, setIsLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingLoan, setEditingLoan] = useState(null);
    const [visibleInstallments, setVisibleInstallments] = useState({});
    const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);
    const [loanIdToDelete, setLoanIdToDelete] = useState(null);
    const [shouldShowPaidLoans, setShouldShowPaidLoans] = useState(false);

    const [purchaseType, setPurchaseType] = useState('normal');
    const [description, setDescription] = useState('');
    const [totalValueInput, setTotalValueInput] = useState('');
    const [installmentsCount, setInstallmentsCount] = useState('1');
    const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
    const [firstDueDate, setFirstDueDate] = useState('');
    const [selectedCardId, setSelectedCardId] = useState('');
    const [selectedClientId, setSelectedClientId] = useState('');
    const [selectedClient1Id, setSelectedClient1Id] = useState('');
    const [selectedClient2Id, setSelectedClient2Id] = useState('');
    const [person1ShareInput, setPerson1ShareInput] = useState('');
    const [person2ShareDisplay, setPerson2ShareDisplay] = useState('R$ 0,00');

    useEffect(() => {
        if (!isAuthenticationReady || !database || !userId) return;

        const userCollectionPath = getUserCollectionPathSegments();
        const clientsReference = collection(database, ...userCollectionPath, userId, 'clients');
        const cardsReference = collection(database, ...userCollectionPath, userId, 'cards');
        const loansReference = query(collection(database, ...userCollectionPath, userId, 'loans'), orderBy('createdAt', 'desc'));

        const unsubscribeClients = onSnapshot(clientsReference, snapshot => setAllClients(snapshot.docs.map(document => ({ id: document.id, ...document.data() }))));
        const unsubscribeCards = onSnapshot(cardsReference, snapshot => setAllCards(snapshot.docs.map(document => ({ id: document.id, ...document.data() }))));
        const unsubscribeLoans = onSnapshot(loansReference, snapshot => setAllLoans(snapshot.docs.map(document => ({ id: document.id, ...document.data() }))));
        
        return () => {
            unsubscribeClients();
            unsubscribeCards();
            unsubscribeLoans();
        };
    }, [database, userId, isAuthenticationReady, getUserCollectionPathSegments]);
    
    useEffect(() => {
        if (purchaseDate && selectedCardId && allCards.length > 0) {
            const selectedCard = allCards.find(card => card.id === selectedCardId);
            if (selectedCard && selectedCard.closingDay && selectedCard.dueDay) {
                const dateOfPurchase = new Date(purchaseDate + "T12:00:00Z");
                let dueMonth = dateOfPurchase.getUTCMonth();
                let dueYear = dateOfPurchase.getUTCFullYear();

                if (selectedCard.closingDay < selectedCard.dueDay) {
                     if (dateOfPurchase.getUTCDate() >= selectedCard.closingDay) {
                        dueMonth += 1;
                    }
                } else {
                    const closingDate = new Date(Date.UTC(dateOfPurchase.getUTCFullYear(), dateOfPurchase.getUTCMonth(), selectedCard.closingDay));
                    if (dateOfPurchase >= closingDate) {
                        dueMonth += 2;
                    } else {
                        dueMonth += 1;
                    }
                }

                if (dueMonth > 11) {
                    dueYear += Math.floor(dueMonth / 12);
                    dueMonth %= 12;
                }
                
                const finalDueDate = new Date(Date.UTC(dueYear, dueMonth, selectedCard.dueDay));
                setFirstDueDate(finalDueDate.toISOString().split('T')[0]);
            }
        }
    }, [purchaseDate, selectedCardId, allCards]);

    useEffect(() => {
        if (purchaseType === 'shared') {
            const totalValue = parseCurrencyInput(totalValueInput);
            const person1Value = parseCurrencyInput(person1ShareInput);
            if (totalValue > 0 && person1Value >= 0 && person1Value <= totalValue) {
                setPerson2ShareDisplay(formatCurrencyDisplay(totalValue - person1Value));
            } else if (totalValue > 0 && person1Value > totalValue) {
                setPerson1ShareInput(formatCurrencyForInput(totalValue));
                setPerson2ShareDisplay(formatCurrencyDisplay(0));
            } else {
                setPerson2ShareDisplay('R$ 0,00');
            }
        }
    }, [totalValueInput, person1ShareInput, purchaseType]);

    const isLoanDataInvalid = (loan) => {
        if (typeof loan.totalValue !== 'number' || isNaN(loan.totalValue)) return true;
        if (loan.isShared) {
            if (!loan.sharedDetails || !loan.sharedDetails.person1 || !Array.isArray(loan.sharedDetails.person1.installments)) return true;
            if (loan.sharedDetails.person2 && loan.sharedDetails.person2.shareAmount > 0 && !Array.isArray(loan.sharedDetails.person2.installments)) return true;
        } else {
            if (!Array.isArray(loan.installments)) return true;
        }
        return false;
    };

    const resetFormFields = () => {
        setPurchaseType('normal');
        setDescription('');
        setTotalValueInput('');
        setInstallmentsCount('1');
        setPurchaseDate(new Date().toISOString().split('T')[0]);
        setFirstDueDate('');
        setSelectedCardId('');
        setSelectedClientId('');
        setSelectedClient1Id('');
        setSelectedClient2Id('');
        setPerson1ShareInput('');
        setPerson2ShareDisplay('R$ 0,00');
    };

    const handleOpenModal = (loan = null) => {
        setEditingLoan(loan);
        if (loan) {
            setDescription(loan.description);
            setTotalValueInput(formatCurrencyForInput(loan.totalValue));
            setInstallmentsCount(loan.installmentsCount.toString());
            setPurchaseDate(loan.purchaseDate);
            setSelectedCardId(loan.cardId);
            if (loan.isShared) {
                setPurchaseType('shared');
                setSelectedClient1Id(loan.sharedDetails.person1.clientId);
                setPerson1ShareInput(formatCurrencyForInput(loan.sharedDetails.person1.shareAmount));
                setSelectedClient2Id(loan.sharedDetails.person2.clientId);
            } else {
                setPurchaseType('normal');
                setSelectedClientId(loan.clientId);
            }
        } else {
            resetFormFields();
        }
        setIsModalOpen(true);
    };
    
    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingLoan(null);
        resetFormFields();
    };

    const handleSaveLoan = async () => {
        setIsLoading(true);
        const totalValue = parseCurrencyInput(totalValueInput);
        const installmentsNumber = parseInt(installmentsCount, 10);

        if (!description.trim() || !totalValue || installmentsNumber < 1 || !purchaseDate || !selectedCardId || !firstDueDate) {
            showToast('Preencha todos os campos obrigatórios da compra.', 'warning');
            setIsLoading(false);
            return;
        }
        
        const calculateInstallments = (value, count, startDate) => {
            const numericValue = Number(value) || 0;
            if (numericValue <= 0 || count < 1) return [];

            const installmentValue = parseFloat((numericValue / count).toFixed(2));
            let totalCalculated = 0;
            const installments = [];
            
            for (let index = 0; index < count; index++) {
                const dueDate = new Date(startDate + "T12:00:00Z");
                dueDate.setUTCMonth(dueDate.getUTCMonth() + index);
                
                let currentInstallmentValue = installmentValue;
                if (index === count - 1) {
                    currentInstallmentValue = parseFloat((numericValue - totalCalculated).toFixed(2));
                }

                installments.push({
                    number: index + 1,
                    value: currentInstallmentValue,
                    dueDate: dueDate.toISOString().split('T')[0],
                    status: 'Pendente',
                    paidDate: null
                });
                totalCalculated += installmentValue;
            }
            return installments;
        };

        const loanData = { 
            description, 
            totalValue, 
            installmentsCount: installmentsNumber, 
            purchaseDate, 
            cardId: selectedCardId, 
            userId, 
            valuePaidClient: 0, 
            balanceDueClient: totalValue, 
            statusPaymentClient: 'Pendente' 
        };

        if (purchaseType === 'normal') {
            if (!selectedClientId) {
                showToast('Selecione uma pessoa para a compra.', 'warning');
                setIsLoading(false);
                return;
            }
            loanData.clientId = selectedClientId;
            loanData.isShared = false;
            loanData.installments = calculateInstallments(totalValue, installmentsNumber, firstDueDate);
        } else {
            const person1Share = parseCurrencyInput(person1ShareInput);
            const person2Share = totalValue - person1Share;

            if (!selectedClient1Id || !selectedClient2Id || person1Share <= 0 || person2Share < 0) {
                showToast('Preencha todos os campos da compra compartilhada.', 'warning');
                setIsLoading(false);
                return;
            }
            if (selectedClient1Id === selectedClient2Id) {
                showToast('As pessoas 1 e 2 devem ser diferentes.', 'warning');
                setIsLoading(false);
                return;
            }
            
            loanData.isShared = true;
            loanData.installments = calculateInstallments(totalValue, installmentsNumber, firstDueDate);
            loanData.sharedDetails = {
                person1: { clientId: selectedClient1Id, shareAmount: person1Share, installments: calculateInstallments(person1Share, installmentsNumber, firstDueDate), valuePaid: 0, balanceDue: person1Share, statusPayment: 'Pendente' },
                person2: { clientId: selectedClient2Id, shareAmount: person2Share, installments: person2Share > 0 ? calculateInstallments(person2Share, installmentsNumber, firstDueDate) : [], valuePaid: 0, balanceDue: person2Share, statusPayment: person2Share > 0 ? 'Pendente' : 'Pago Total' }
            };
        }

        try {
            const userCollectionPath = getUserCollectionPathSegments();
            if (editingLoan) {
                const loanDocumentReference = doc(database, ...userCollectionPath, userId, 'loans', editingLoan.id);
                await updateDoc(loanDocumentReference, { ...loanData, updatedAt: serverTimestamp() });
                showToast('Compra atualizada com sucesso!', 'success');
            } else {
                const loansReference = collection(database, ...userCollectionPath, userId, 'loans');
                await addDoc(loansReference, { ...loanData, createdAt: serverTimestamp() });
                showToast('Compra adicionada com sucesso!', 'success');
            }
            handleCloseModal();
        } catch (error) {
            showToast(`Erro ao salvar: ${error.message}`, 'error');
        } finally {
            setIsLoading(false);
        }
    };
    
    const confirmDeleteLoan = (loanId) => {
        setLoanIdToDelete(loanId);
        setIsConfirmationModalOpen(true);
    };

    const handleDeleteLoanConfirmed = async () => {
        if (!loanIdToDelete) return;
        try {
            const userCollectionPath = getUserCollectionPathSegments();
            await deleteDoc(doc(database, ...userCollectionPath, userId, 'loans', loanIdToDelete));
            showToast("Compra deletada com sucesso!", "success");
        } catch (error) {
            showToast(`Erro ao deletar: ${error.message}`, "error");
        } finally {
            setIsConfirmationModalOpen(false);
            setLoanIdToDelete(null);
        }
    };

    const updateInstallmentStatus = async (loanId, personKey, installmentNumber, newStatus) => {
        console.log("Debug - userId atual:", userId);
        console.log("Debug - loanId:", loanId);

        const loanToUpdate = allLoans.find(loan => loan.id === loanId);
        if (!loanToUpdate) {
            showToast('Erro: Compra não encontrada.', 'error');
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
        };

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
        
        console.log("Debug - Payload fieldsToUpdate:", fieldsToUpdate);

        try {
            const userCollectionPath = getUserCollectionPathSegments();
            const loanDocumentReference = doc(database, ...userCollectionPath, userId, 'loans', loanId);
            await updateDoc(loanDocumentReference, fieldsToUpdate);
            showToast(`Parcela marcada como ${newStatus}!`, 'success');
        } catch (error) {
            showToast(`Erro ao atualizar parcela: ${error.message}`, 'error');
            console.error("Erro detalhado do Firestore:", error);
        }
    };

    const toggleInstallmentsVisibility = (loanId) => setVisibleInstallments(previousState => ({ ...previousState, [loanId]: !previousState[loanId] }));
    const getClientNameById = (clientId) => allClients.find(client => client.id === clientId)?.name || 'N/A';
    
    const filteredLoans = useMemo(() => 
        allLoans.filter(loan => {
            if (shouldShowPaidLoans) return true;
            if (loan.isShared) {
                const isPerson1Paid = loan.sharedDetails?.person1?.statusPayment === 'Pago Total';
                const isPerson2Paid = loan.sharedDetails?.person2?.statusPayment === 'Pago Total';
                return !isPerson1Paid || !isPerson2Paid;
            }
            return loan.statusPaymentClient !== 'Pago Total';
        }),
    [allLoans, shouldShowPaidLoans]);

    const renderInstallmentsList = (installments, loanId, personKey = null) => {
        if (!Array.isArray(installments) || installments.length === 0) {
             return (
                <div className="p-4 bg-carbon-900/50 text-center text-sm text-gray-500">
                    Nenhuma parcela para exibir.
                </div>
            );
        }
        return (
            <div className="p-4 bg-carbon-900/50 space-y-3">
                <h4 className="font-bold text-xs uppercase tracking-wider text-gold">Parcelas Detalhadas:</h4>
                <ul className="space-y-2">
                    {installments.map(installment => (
                        <li key={installment.number} className="flex justify-between items-center text-sm p-2 bg-carbon-800/40 rounded-xl border border-carbon-800">
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-gold-cream">{installment.number}ª</span>
                                <span className="text-gray-400">•</span>
                                <span className="text-gray-300">{new Date(installment.dueDate + "T00:00:00").toLocaleDateString('pt-BR')}</span>
                                <span className="text-gray-400">•</span>
                                <span className="font-mono font-bold text-gold">{formatCurrencyDisplay(installment.value)}</span>
                                <span className="text-gray-400">•</span>
                                <span className={installment.status === 'Paga' ? 'text-emerald-400 font-semibold text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20' : 'text-gold font-semibold text-xs px-2 py-0.5 rounded-full bg-gold/10 border border-gold/20'}>{installment.status}</span>
                                {installment.status === 'Paga' && installment.paidDate && <span className="text-[11px] text-gray-500 hidden sm:inline"> (pago em {new Date(installment.paidDate + "T00:00:00").toLocaleDateString('pt-BR')})</span>}
                            </div>
                            <div className="flex items-center gap-2">
                                {installment.status === 'Pendente' && (
                                    <button 
                                        onClick={() => updateInstallmentStatus(loanId, personKey, installment.number, 'Paga')} 
                                        className="bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 px-3 py-1 rounded-xl text-xs font-semibold transition cursor-pointer">
                                        Marcar Paga
                                    </button>
                                )}
                                {installment.status === 'Paga' && (
                                    <button 
                                        onClick={() => updateInstallmentStatus(loanId, personKey, installment.number, 'Pendente')} 
                                        className="bg-gold/10 text-gold hover:bg-gold/20 border border-gold/20 px-3 py-1 rounded-xl text-xs font-semibold transition cursor-pointer">
                                        Desmarcar
                                    </button>
                                )}
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
        );
    };
    
    return (
        <div className="space-y-8 animate-fadeIn">
             <div className="bg-carbon-900 border border-carbon-800 p-6 sm:p-8 rounded-3xl shadow-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gold-cream">Gerenciamento de Compras</h1>
                    <p className="text-sm text-gray-400 mt-1">Adicione e acompanhe suas compras parceladas ou compartilhadas.</p>
                </div>
                
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    {/* Botão PRO Bloqueado com efeito visual "Em breve" */}
                    <div className="relative inline-flex flex-1 sm:flex-none">
                        <button 
                            disabled
                            className="w-full flex items-center justify-center gap-2 bg-carbon-800/40 text-gold/30 border border-gold/10 font-bold py-3 px-4 rounded-2xl cursor-not-allowed opacity-40 select-none text-xs uppercase tracking-wider"
                        >
                            <span>📄</span> Importar Fatura PDF
                        </button>
                        <div className="absolute inset-0 flex items-center justify-center bg-carbon-900/75 backdrop-blur-[1px] rounded-2xl border border-gold/30 shadow-lg">
                            <span className="text-[10px] font-extrabold text-gold uppercase tracking-wider bg-carbon-900 px-2.5 py-1 rounded-full border border-gold/30 shadow-inner">
                                Em breve 🚀
                            </span>
                        </div>
                    </div>

                    <button 
                        onClick={() => handleOpenModal()} 
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-gradient-to-r from-gold-light to-gold text-carbon-900 font-bold py-3 px-5 rounded-2xl shadow-lg shadow-gold/20 hover:opacity-90 transition cursor-pointer"
                    >
                        <PlusIcon />
                        <span>Adicionar Compra</span>
                    </button>
                </div>
            </div>
            
            <div className="flex justify-end items-center px-2">
                <label className="flex items-center text-sm text-gray-400 cursor-pointer font-medium hover:text-gold transition">
                    <input type="checkbox" checked={shouldShowPaidLoans} onChange={() => setShouldShowPaidLoans(!shouldShowPaidLoans)} className="h-4 w-4 bg-carbon-800 border-carbon-700 text-gold focus:ring-gold rounded mr-2.5 accent-gold cursor-pointer" />
                    Mostrar compras pagas
                </label>
            </div>

            <div className="hidden md:grid grid-cols-7 gap-4 px-6 py-4 items-center border-b border-carbon-800 text-xs font-semibold text-gray-400 uppercase tracking-wider bg-carbon-800/40 rounded-t-3xl">
                <span>Descrição</span>
                <span>Cartão</span>
                <span>Valor da Parcela</span>
                <span>Número de Parcelas</span>
                <span>Valor Total</span>
                <span>Status</span>
                <span className="text-right">Ações</span>
            </div>

            <div className="space-y-4">
                {filteredLoans.map(loan => {
                    const isInvalid = isLoanDataInvalid(loan);
                    if (isInvalid) {
                        return (
                            <div key={loan.id} className="bg-rose-950/20 rounded-3xl border border-rose-500/30 p-6 shadow-xl">
                                <div className="grid grid-cols-2 md:grid-cols-7 gap-4 items-center">
                                    <div className="col-span-2 md:col-span-5">
                                        <div className="flex items-center gap-3">
                                            <WarningIcon />
                                            <div>
                                                <div className="text-sm font-semibold text-gold-cream">{loan.description || "Compra com dados inválidos"}</div>
                                                <div className="text-xs text-rose-300">Esta compra tem um formato antigo. Por favor, anote os detalhes, apague-a e crie uma nova.</div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="hidden md:flex items-center text-sm">
                                        <span className="text-rose-400 font-bold">Inválido</span>
                                    </div>
                                    <div className="flex items-center justify-end gap-4">
                                        <button disabled className="text-gold/20 cursor-not-allowed" title="Editar desabilitado"><EditIcon /></button>
                                        <button onClick={() => confirmDeleteLoan(loan.id)} className="text-rose-400 hover:text-rose-300 transition cursor-pointer" title="Deletar"><DeleteIcon /></button>
                                        <button disabled className="text-gray-600 cursor-not-allowed"><ChevronDown /></button>
                                    </div>
                                </div>
                            </div>
                        );
                    }

                    const card = allCards.find(card => card.id === loan.cardId);
                    return (
                        <div key={loan.id} className="bg-carbon-900 border border-carbon-800 rounded-3xl shadow-2xl overflow-hidden transition-all duration-300 hover:border-gold/30">
                             <div className="grid grid-cols-3 md:grid-cols-7 gap-4 p-6 items-center">
                               <div className="col-span-2 md:col-span-1">
                                   <div className="text-sm font-bold text-gold-cream truncate">{loan.description}</div>
                                   <div className="text-xs text-gray-400 mt-0.5 truncate">{loan.isShared ? `${getClientNameById(loan.sharedDetails.person1.clientId)} / ${getClientNameById(loan.sharedDetails.person2.clientId)}` : getClientNameById(loan.clientId)}</div>
                               </div>
                               <div className="hidden md:flex items-center text-sm text-gray-300">
                                   <span className="w-3.5 h-3.5 rounded-md mr-2.5 border border-white/20 shadow-sm" style={{ backgroundColor: card ? card.color : '#F2B705' }}></span>
                                   <span className="truncate">{card ? card.name : 'N/A'}</span>
                               </div>
                               <div className="hidden md:block text-sm font-mono text-gray-300">{formatCurrencyDisplay(loan.installments?.[0]?.value || 0)}</div>
                               <div className="hidden md:block text-sm text-gray-300 font-medium">{`${loan.installmentsCount}x`}</div>
                               <div className="hidden md:block font-extrabold text-gold font-mono">{formatCurrencyDisplay(loan.totalValue)}</div>
                               <div className="hidden md:block text-xs font-semibold">
                                   {loan.isShared ? (
                                       <div className="space-y-1">
                                           <span className={`inline-block px-2.5 py-0.5 rounded-full border ${loan.sharedDetails.person1.statusPayment === 'Pago Total' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-gold/10 text-gold border-gold/20'}`}>P1: {loan.sharedDetails.person1.statusPayment}</span>
                                           <span className={`inline-block px-2.5 py-0.5 rounded-full border ${loan.sharedDetails.person2.statusPayment === 'Pago Total' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-gold/10 text-gold border-gold/20'}`}>P2: {loan.sharedDetails.person2.statusPayment}</span>
                                       </div>
                                   ) : (
                                       <span className={`inline-block px-2.5 py-1 rounded-full border ${loan.statusPaymentClient === 'Pago Total' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-gold/10 text-gold border-gold/20'}`}>{loan.statusPaymentClient}</span>
                                   )}
                               </div>
                               <div className="flex items-center justify-end gap-4">
                                   <button onClick={() => handleOpenModal(loan)} className="text-gold hover:text-gold-light transition cursor-pointer" title="Editar"><EditIcon /></button>
                                   <button onClick={() => confirmDeleteLoan(loan.id)} className="text-rose-400 hover:text-rose-300 transition cursor-pointer" title="Deletar"><DeleteIcon /></button>
                                   <button onClick={() => toggleInstallmentsVisibility(loan.id)} className="text-gray-400 hover:text-white transition p-1.5 rounded-xl bg-carbon-800 hover:bg-carbon-700 cursor-pointer">
                                       {visibleInstallments[loan.id] ? <ChevronUp /> : <ChevronDown />}
                                   </button>
                               </div>
                            </div>
                            {visibleInstallments[loan.id] && (
                                <div className="border-t border-carbon-800">
                                    {loan.isShared ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-carbon-800">
                                            <div className="bg-carbon-900 p-4">
                                                <h5 className="font-bold text-center text-xs uppercase tracking-wider text-gold mb-3">{getClientNameById(loan.sharedDetails.person1.clientId)}</h5>
                                                {renderInstallmentsList(loan.sharedDetails.person1.installments, loan.id, 'person1')}
                                            </div>
                                            <div className="bg-carbon-900 p-4">
                                                <h5 className="font-bold text-center text-xs uppercase tracking-wider text-gold mb-3">{getClientNameById(loan.sharedDetails.person2.clientId)}</h5>
                                                {renderInstallmentsList(loan.sharedDetails.person2.installments, loan.id, 'person2')}
                                            </div>
                                        </div>
                                    ) : (
                                        renderInstallmentsList(loan.installments, loan.id)
                                    )}
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
            
            <GenericModal isOpen={isModalOpen} onClose={handleCloseModal} title={editingLoan ? 'Editar Compra' : 'Adicionar Nova Compra'} theme="dark" maxWidth="max-w-4xl">
                <div className="space-y-6">
                    <div className="flex justify-center p-1.5 bg-carbon-800 border border-carbon-700 rounded-2xl max-w-sm mx-auto">
                        <button onClick={() => setPurchaseType('normal')} disabled={!!editingLoan} className={`w-1/2 py-2.5 text-xs font-black tracking-wider uppercase rounded-xl transition-all cursor-pointer ${purchaseType === 'normal' ? 'bg-gradient-to-r from-gold-light to-gold text-carbon-900 shadow-lg shadow-gold/20' : 'text-gray-400 hover:text-white'} disabled:opacity-50`}>Compra Normal</button>
                        <button onClick={() => setPurchaseType('shared')} disabled={!!editingLoan} className={`w-1/2 py-2.5 text-xs font-black tracking-wider uppercase rounded-xl transition-all cursor-pointer ${purchaseType === 'shared' ? 'bg-gradient-to-r from-gold-light to-gold text-carbon-900 shadow-lg shadow-gold/20' : 'text-gray-400 hover:text-white'} disabled:opacity-50`}>Compartilhada</button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="w-full">
                            <label htmlFor="purchaseDate" className="block text-sm font-medium text-gray-300 mb-1">Data da Compra</label>
                            <input id="purchaseDate" type="date" value={purchaseDate} className="w-full" onChange={(evento) => setPurchaseDate(evento.target.value)} required />
                        </div>
                        <div className="w-full">
                            <label htmlFor="selectedCardId" className="block text-sm font-medium text-gray-300 mb-1">Cartão</label>
                            <select id="selectedCardId" value={selectedCardId} className="w-full" onChange={(evento) => setSelectedCardId(evento.target.value)} required>
                                <option value="">Selecione o Cartão</option>
                                {allCards.map(card => <option key={card.id} value={card.id}>{card.name}</option>)}
                            </select>
                        </div>
                        <div className="w-full">
                            <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-1">Descrição</label>
                            <input id="description" type="text" placeholder="Descrição da Compra" value={description} className="w-full" onChange={(evento) => setDescription(evento.target.value)} required />
                        </div>
                    </div>
                    
                    {firstDueDate && <div className="p-3 bg-carbon-800 border border-carbon-700 rounded-2xl text-xs text-gray-400 text-center font-medium">Primeira parcela em: <span className="font-bold text-gold">{new Date(firstDueDate + 'T00:00:00').toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</span></div>}

                    {purchaseType === 'normal' ? (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-carbon-800">
                           <div className="w-full">
                                <label htmlFor="selectedClientId" className="block text-sm font-medium text-gray-300 mb-1">Pessoa</label>
                                <select id="selectedClientId" value={selectedClientId} className="w-full" onChange={(evento) => setSelectedClientId(evento.target.value)} required>
                                    <option value="">Selecione a Pessoa</option>
                                    {allClients.map(client => <option key={client.id} value={client.id}>{client.name}</option>)}
                                </select>
                           </div>
                            <div className="w-full">
                                <label htmlFor="totalValueInput" className="block text-sm font-medium text-gray-300 mb-1">Valor Total</label>
                                <div className="relative w-full">
                                    <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-gold font-bold">R$</span>
                                    <input id="totalValueInput" type="text" placeholder="0,00" value={totalValueInput} onChange={handleCurrencyInputChange(setTotalValueInput)} className="w-full pl-12" required inputMode="decimal" />
                                </div>
                            </div>
                            <div className="w-full">
                                <label htmlFor="installmentsCount" className="block text-sm font-medium text-gray-300 mb-1">Número de Parcelas</label>
                                <input id="installmentsCount" type="number" placeholder="1" value={installmentsCount} className="w-full" onChange={(evento) => setInstallmentsCount(evento.target.value)} min="1" required />
                            </div>
                        </div>
                    ) : (
                         <div className="pt-4 border-t border-carbon-800 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="w-full">
                                    <label htmlFor="totalValueShared" className="block text-sm font-medium text-gray-300 mb-1">Valor Total</label>
                                    <div className="relative w-full">
                                        <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-gold font-bold">R$</span>
                                        <input id="totalValueShared" type="text" placeholder="0,00" value={totalValueInput} onChange={handleCurrencyInputChange(setTotalValueInput)} className="w-full pl-12" required inputMode="decimal" />
                                    </div>
                                </div>
                                <div className="w-full">
                                    <label htmlFor="installmentsCountShared" className="block text-sm font-medium text-gray-300 mb-1">Número de Parcelas</label>
                                    <input id="installmentsCountShared" type="number" placeholder="1" value={installmentsCount} className="w-full" onChange={(evento) => setInstallmentsCount(evento.target.value)} min="1" required />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                                <div className="w-full">
                                    <label htmlFor="selectedClient1Id" className="block text-sm font-medium text-gray-300 mb-1">Pessoa 1</label>
                                    <select id="selectedClient1Id" value={selectedClient1Id} className="w-full" onChange={(evento) => setSelectedClient1Id(evento.target.value)} required>
                                        <option value="">Selecione a Pessoa 1</option>
                                        {allClients.map(client => <option key={client.id} value={client.id}>{client.name}</option>)}
                                    </select>
                                </div>
                                <div className="w-full">
                                    <label htmlFor="person1ShareInput" className="block text-sm font-medium text-gray-300 mb-1">Valor da Pessoa 1</label>
                                    <div className="relative w-full">
                                        <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-gold font-bold">R$</span>
                                        <input id="person1ShareInput" type="text" placeholder="0,00" value={person1ShareInput} onChange={handleCurrencyInputChange(setPerson1ShareInput)} className="w-full pl-12" required inputMode="decimal" />
                                    </div>
                                </div>
                                <div className="p-3 bg-carbon-800 border border-carbon-700 rounded-2xl text-center text-gray-300 h-[50px] flex items-center justify-between px-4 w-full">
                                    <span className="text-xs font-semibold uppercase text-gray-400">Valor Pessoa 2:</span>
                                    <span className="font-bold font-mono text-gold">{person2ShareDisplay}</span>
                                </div>
                                <div className="w-full">
                                     <label htmlFor="selectedClient2Id" className="block text-sm font-medium text-gray-300 mb-1">Pessoa 2</label>
                                    <select id="selectedClient2Id" value={selectedClient2Id} className="w-full" onChange={(evento) => setSelectedClient2Id(evento.target.value)} required>
                                        <option value="">Selecione a Pessoa 2</option>
                                        {allClients.map(client => <option key={client.id} value={client.id}>{client.name}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                <div className="mt-6 flex justify-end gap-4">
                    <button onClick={handleCloseModal} className="py-2.5 px-5 bg-carbon-800 hover:bg-carbon-700 rounded-2xl text-gray-300 transition cursor-pointer font-medium">Cancelar</button>
                    <button onClick={handleSaveLoan} disabled={isLoading} className="py-2.5 px-5 bg-gradient-to-r from-gold-light to-gold hover:opacity-90 rounded-2xl text-carbon-900 font-bold transition cursor-pointer shadow-lg shadow-gold/20 disabled:opacity-50">
                        {isLoading ? 'Salvando...' : editingLoan ? 'Atualizar Compra' : 'Salvar Compra'}
                    </button>
                </div>
            </GenericModal>

            <GenericModal isOpen={isConfirmationModalOpen} onClose={() => setIsConfirmationModalOpen(false)} onConfirm={handleDeleteLoanConfirmed} title="Confirmar Exclusão" isConfirmation={true} theme="dark">
                Tem certeza que deseja deletar esta compra e todas as suas parcelas?
            </GenericModal>
        </div>
    );
}

export default LoanManagement;