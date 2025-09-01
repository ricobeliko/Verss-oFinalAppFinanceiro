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
const WarningIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="text-red-400 flex-shrink-0" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>;
const PlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;

function LoanManagement() {
    const { db: database, userId, isAuthReady: isAuthenticationReady, getUserCollectionPathSegments, theme, showToast } = useAppContext();

    // Estados para armazenar dados do Firestore
    const [allLoans, setAllLoans] = useState([]);
    const [allClients, setAllClients] = useState([]);
    const [allCards, setAllCards] = useState([]);

    // Estados para controle da interface
    const [isLoading, setIsLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingLoan, setEditingLoan] = useState(null);
    const [visibleInstallments, setVisibleInstallments] = useState({});
    const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);
    const [loanIdToDelete, setLoanIdToDelete] = useState(null);
    const [shouldShowPaidLoans, setShouldShowPaidLoans] = useState(false);

    // Estados para o formulário do modal
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

        const fieldsToUpdate = {};
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
            const loanDocumentReference = doc(database, ...userCollectionPath, userId, 'loans', loanId);
            await updateDoc(loanDocumentReference, fieldsToUpdate);
            showToast(`Parcela marcada como ${newStatus}!`, 'success');
        } catch (error) {
            showToast(`Erro ao atualizar parcela: ${error.message}`, 'error');
            console.error("Erro detalhado:", error);
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
                <div className="p-4 bg-gray-900/50 text-center text-sm text-gray-500">
                    Nenhuma parcela para exibir.
                </div>
            );
        }
        return (
            <div className="p-4 bg-gray-900/50">
                <h4 className="font-bold text-sm mb-2 text-gray-300">Parcelas:</h4>
                <ul className="space-y-2">
                    {installments.map(installment => (
                        <li key={installment.number} className="flex justify-between items-center text-sm">
                            <div>
                                <span>{installment.number}ª - {new Date(installment.dueDate + "T00:00:00").toLocaleDateString('pt-BR')} - </span>
                                <span className="font-semibold">{formatCurrencyDisplay(installment.value)} - </span>
                                <span className={installment.status === 'Paga' ? 'text-green-400' : 'text-yellow-400'}>{installment.status}</span>
                                {installment.status === 'Paga' && installment.paidDate && <span className="text-xs text-gray-500"> (pago em {new Date(installment.paidDate + "T00:00:00").toLocaleDateString('pt-BR')})</span>}
                            </div>
                            <div className="flex items-center gap-2">
                                {installment.status === 'Pendente' && (
                                    <button 
                                        onClick={() => updateInstallmentStatus(loanId, personKey, installment.number, 'Paga')} 
                                        className="bg-green-500/20 text-green-300 px-2 py-1 rounded-md hover:bg-green-500/30 text-xs font-semibold">
                                        Marcar Paga
                                    </button>
                                )}
                                {installment.status === 'Paga' && (
                                    <button 
                                        onClick={() => updateInstallmentStatus(loanId, personKey, installment.number, 'Pendente')} 
                                        className="bg-yellow-500/20 text-yellow-300 px-2 py-1 rounded-md hover:bg-yellow-500/30 text-xs font-semibold">
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
        <div className="p-6 bg-gray-900/50 border border-gray-800 rounded-lg space-y-6">
             <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">Gerenciamento de Compras</h1>
                    <p className="text-sm text-gray-400 mt-1">Adicione suas compras parceladas ou compartilhadas.</p>
                </div>
                <button onClick={() => handleOpenModal()} className="w-full sm:w-auto flex items-center justify-center gap-2 bg-purple-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md hover:bg-purple-700 transition">
                    <PlusIcon />
                    Adicionar Compra
                </button>
            </div>
            
            <div className="flex justify-end items-center">
                <label className="flex items-center text-sm text-gray-400 cursor-pointer">
                    <input type="checkbox" checked={shouldShowPaidLoans} onChange={() => setShouldShowPaidLoans(!shouldShowPaidLoans)} className="h-4 w-4 bg-gray-700 border-gray-600 text-purple-600 focus:ring-purple-500 rounded mr-2" />
                    Mostrar compras pagas
                </label>
            </div>

            <div className="hidden md:grid grid-cols-7 gap-4 p-4 items-center border-b border-gray-700 text-xs font-semibold text-gray-400 uppercase tracking-wider">
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
                            <div key={loan.id} className="bg-red-900/30 rounded-lg border-2 border-dashed border-red-500/50">
                                <div className="grid grid-cols-2 md:grid-cols-7 gap-4 p-4 items-center">
                                    <div className="col-span-2 md:col-span-5">
                                        <div className="flex items-center gap-3">
                                            <WarningIcon />
                                            <div>
                                                <div className="text-sm font-semibold text-white">{loan.description || "Compra com dados inválidos"}</div>
                                                <div className="text-xs text-red-300">Esta compra tem um formato antigo. Por favor, anote os detalhes, apague-a e crie uma nova.</div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="hidden md:flex items-center text-sm">
                                        <span className="text-red-400 font-bold">Inválido</span>
                                    </div>
                                    <div className="flex items-center justify-end gap-4">
                                        <button disabled className="text-purple-400/30 cursor-not-allowed" title="Editar desabilitado"><EditIcon /></button>
                                        <button onClick={() => confirmDeleteLoan(loan.id)} className="text-red-500 hover:text-red-400 transition" title="Deletar"><DeleteIcon /></button>
                                        <button disabled className="text-gray-400/30 cursor-not-allowed"><ChevronDown /></button>
                                    </div>
                                </div>
                            </div>
                        );
                    }

                    const card = allCards.find(card => card.id === loan.cardId);
                    return (
                        <div key={loan.id} className="bg-gray-800/50 rounded-lg border border-gray-700">
                             <div className="grid grid-cols-3 md:grid-cols-7 gap-4 p-4 items-center">
                                  <div className="col-span-2 md:col-span-1">
                                      <div className="text-sm font-semibold text-white">{loan.description}</div>
                                      <div className="text-xs text-gray-400">{loan.isShared ? `${getClientNameById(loan.sharedDetails.person1.clientId)} / ${getClientNameById(loan.sharedDetails.person2.clientId)}` : getClientNameById(loan.clientId)}</div>
                                  </div>
                                  <div className="hidden md:flex items-center text-sm text-gray-400">
                                      <span className="w-4 h-4 rounded-sm mr-3 border border-white/20" style={{ backgroundColor: card ? card.color : '#5E60CE' }}></span>
                                      <span>{card ? card.name : 'N/A'}</span>
                                  </div>
                                  <div className="hidden md:block text-sm text-gray-300">{formatCurrencyDisplay(loan.installments?.[0]?.value || 0)}</div>
                                  <div className="hidden md:block text-sm text-gray-300">{`${loan.installmentsCount}x`}</div>
                                  <div className="hidden md:block font-bold text-white">{formatCurrencyDisplay(loan.totalValue)}</div>
                                  <div className="hidden md:block text-sm">
                                      {loan.isShared ? (
                                          <>
                                              <span className={loan.sharedDetails.person1.statusPayment === 'Pago Total' ? 'text-green-400' : 'text-yellow-400'}>P1: {loan.sharedDetails.person1.statusPayment}</span><br/>
                                              <span className={loan.sharedDetails.person2.statusPayment === 'Pago Total' ? 'text-green-400' : 'text-yellow-400'}>P2: {loan.sharedDetails.person2.statusPayment}</span>
                                          </>
                                      ) : (
                                          <span className={loan.statusPaymentClient === 'Pago Total' ? 'text-green-400' : 'text-yellow-400'}>{loan.statusPaymentClient}</span>
                                      )}
                                  </div>
                                  <div className="flex items-center justify-end gap-4">
                                      <button onClick={() => handleOpenModal(loan)} className="text-purple-400 hover:text-purple-300 transition" title="Editar"><EditIcon /></button>
                                      <button onClick={() => confirmDeleteLoan(loan.id)} className="text-red-500 hover:text-red-400 transition" title="Deletar"><DeleteIcon /></button>
                                      <button onClick={() => toggleInstallmentsVisibility(loan.id)} className="text-gray-400 hover:text-white transition">
                                          {visibleInstallments[loan.id] ? <ChevronUp /> : <ChevronDown />}
                                      </button>
                                  </div>
                             </div>
                             {visibleInstallments[loan.id] && (
                                 <div className="border-t border-gray-700">
                                     {loan.isShared ? (
                                         <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-gray-700">
                                             <div className="bg-gray-800 p-2">
                                                 <h5 className="font-semibold text-center text-sm mb-2">{getClientNameById(loan.sharedDetails.person1.clientId)}</h5>
                                                 {renderInstallmentsList(loan.sharedDetails.person1.installments, loan.id, 'person1')}
                                             </div>
                                             <div className="bg-gray-800 p-2">
                                                 <h5 className="font-semibold text-center text-sm mb-2">{getClientNameById(loan.sharedDetails.person2.clientId)}</h5>
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
                    <div className="flex justify-center p-1 bg-gray-700 rounded-lg max-w-sm mx-auto">
                        <button onClick={() => setPurchaseType('normal')} disabled={!!editingLoan} className={`w-1/2 px-4 py-2 text-sm font-bold rounded-md transition-colors ${purchaseType === 'normal' ? 'bg-purple-600 text-white shadow' : 'text-gray-400'} disabled:opacity-50`}>Compra Normal</button>
                        <button onClick={() => setPurchaseType('shared')} disabled={!!editingLoan} className={`w-1/2 px-4 py-2 text-sm font-bold rounded-md transition-colors ${purchaseType === 'shared' ? 'bg-purple-600 text-white shadow' : 'text-gray-400'} disabled:opacity-50`}>Compra Compartilhada</button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label htmlFor="purchaseDate" className="block text-sm font-medium text-gray-300 mb-1">Data da Compra</label>
                            <input id="purchaseDate" type="date" value={purchaseDate} onChange={(evento) => setPurchaseDate(evento.target.value)} className="w-full p-2 bg-gray-700 border-2 border-gray-600 rounded-md text-white" required />
                        </div>
                        <div>
                            <label htmlFor="selectedCardId" className="block text-sm font-medium text-gray-300 mb-1">Cartão</label>
                            <select id="selectedCardId" value={selectedCardId} onChange={(evento) => setSelectedCardId(evento.target.value)} className="w-full p-2 bg-gray-700 border-2 border-gray-600 rounded-md text-white" required>
                                <option value="">Selecione o Cartão</option>
                                {allCards.map(card => <option key={card.id} value={card.id}>{card.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-1">Descrição</label>
                            <input id="description" type="text" placeholder="Descrição da Compra" value={description} onChange={(evento) => setDescription(evento.target.value)} className="w-full p-2 bg-gray-700 border-2 border-gray-600 rounded-md text-white" required />
                        </div>
                    </div>
                    
                    {firstDueDate && <div className="p-2 bg-gray-800 rounded-md text-sm text-gray-400 text-center">Primeira parcela em: <span className="font-semibold text-white">{new Date(firstDueDate + 'T00:00:00').toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</span></div>}

                    {purchaseType === 'normal' ? (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-700">
                           <div>
                                <label htmlFor="selectedClientId" className="block text-sm font-medium text-gray-300 mb-1">Pessoa</label>
                                <select id="selectedClientId" value={selectedClientId} onChange={(evento) => setSelectedClientId(evento.target.value)} className="w-full p-2 bg-gray-700 border-2 border-gray-600 rounded-md text-white" required>
                                    <option value="">Selecione a Pessoa</option>
                                    {allClients.map(client => <option key={client.id} value={client.id}>{client.name}</option>)}
                                </select>
                           </div>
                            <div>
                                <label htmlFor="totalValueInput" className="block text-sm font-medium text-gray-300 mb-1">Valor Total</label>
                                <input id="totalValueInput" type="text" placeholder="R$ 0,00" value={totalValueInput} onChange={handleCurrencyInputChange(setTotalValueInput)} className="w-full p-2 bg-gray-700 border-2 border-gray-600 rounded-md text-white" required inputMode="decimal" />
                            </div>
                            <div>
                                <label htmlFor="installmentsCount" className="block text-sm font-medium text-gray-300 mb-1">Número de Parcelas</label>
                                <input id="installmentsCount" type="number" placeholder="1" value={installmentsCount} onChange={(evento) => setInstallmentsCount(evento.target.value)} className="w-full p-2 bg-gray-700 border-2 border-gray-600 rounded-md text-white" min="1" required />
                            </div>
                        </div>
                    ) : (
                         <div className="pt-4 border-t border-gray-700 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label htmlFor="totalValueShared" className="block text-sm font-medium text-gray-300 mb-1">Valor Total</label>
                                    <input id="totalValueShared" type="text" placeholder="R$ 0,00" value={totalValueInput} onChange={handleCurrencyInputChange(setTotalValueInput)} className="w-full p-2 bg-gray-700 border-2 border-gray-600 rounded-md text-white" required inputMode="decimal" />
                                </div>
                                <div>
                                    <label htmlFor="installmentsCountShared" className="block text-sm font-medium text-gray-300 mb-1">Número de Parcelas</label>
                                    <input id="installmentsCountShared" type="number" placeholder="1" value={installmentsCount} onChange={(evento) => setInstallmentsCount(evento.target.value)} className="w-full p-2 bg-gray-700 border-2 border-gray-600 rounded-md text-white" min="1" required />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                                <div>
                                    <label htmlFor="selectedClient1Id" className="block text-sm font-medium text-gray-300 mb-1">Pessoa 1</label>
                                    <select id="selectedClient1Id" value={selectedClient1Id} onChange={(evento) => setSelectedClient1Id(evento.target.value)} className="w-full p-2 bg-gray-700 border-2 border-gray-600 rounded-md text-white" required>
                                        <option value="">Selecione a Pessoa 1</option>
                                        {allClients.map(client => <option key={client.id} value={client.id}>{client.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="person1ShareInput" className="block text-sm font-medium text-gray-300 mb-1">Valor da Pessoa 1</label>
                                    <input id="person1ShareInput" type="text" placeholder="R$ 0,00" value={person1ShareInput} onChange={handleCurrencyInputChange(setPerson1ShareInput)} className="w-full p-2 bg-gray-700 border-2 border-gray-600 rounded-md text-white" required inputMode="decimal" />
                                </div>
                                <div className="p-2 bg-gray-800 rounded-md text-center text-gray-300 h-10 flex items-center justify-center">
                                    <span className="text-sm font-medium text-gray-300 mr-2">Valor Pessoa 2:</span>
                                    <span className="font-bold">{person2ShareDisplay}</span>
                                </div>
                                <div>
                                     <label htmlFor="selectedClient2Id" className="block text-sm font-medium text-gray-300 mb-1">Pessoa 2</label>
                                    <select id="selectedClient2Id" value={selectedClient2Id} onChange={(evento) => setSelectedClient2Id(evento.target.value)} className="w-full p-2 bg-gray-700 border-2 border-gray-600 rounded-md text-white" required>
                                        <option value="">Selecione a Pessoa 2</option>
                                        {allClients.map(client => <option key={client.id} value={client.id}>{client.name}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                <div className="mt-6 flex justify-end gap-4">
                    <button onClick={handleCloseModal} className="py-2 px-4 bg-gray-600 hover:bg-gray-700 rounded-md text-white transition">Cancelar</button>
                    <button onClick={handleSaveLoan} disabled={isLoading} className="py-2 px-4 bg-purple-600 hover:bg-purple-700 rounded-md text-white transition disabled:opacity-50">
                        {isLoading ? 'Salvando...' : editingLoan ? 'Atualizar Compra' : 'Salvar Compra'}
                    </button>
                </div>
            </GenericModal>

            <GenericModal isOpen={isConfirmationModalOpen} onClose={() => setIsConfirmationModalOpen(false)} onConfirm={handleDeleteLoanConfirmed} title="Confirmar Exclusão" isConfirmation={true} theme={theme}>
                Tem certeza que deseja deletar esta compra e todas as suas parcelas?
            </GenericModal>
        </div>
    );
}

export default LoanManagement;