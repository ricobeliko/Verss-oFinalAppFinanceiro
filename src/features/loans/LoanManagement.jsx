// src/features/loans/LoanManagement.jsx

import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, doc, updateDoc, addDoc, deleteDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { useAppContext } from '../../context/AppContext';
import { formatCurrencyDisplay, parseCurrencyInput, handleCurrencyInputChange, formatCurrencyForInput } from '../../utils/currency';
import GenericModal from '../../components/GenericModal';

// --- Ícones ---
const EditIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const DeleteIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>;
const ChevronDown = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>;
const ChevronUp = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>;
const WarningIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="text-red-400 flex-shrink-0" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>;


function LoanManagement() {
    const { db, userId, isAuthReady, getUserCollectionPathSegments, theme, showToast } = useAppContext();
    
    const [loans, setLoans] = useState([]);
    const [clients, setClients] = useState([]);
    const [cards, setCards] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    const [editingLoan, setEditingLoan] = useState(null);
    const [purchaseType, setPurchaseType] = useState('normal');
    const [description, setDescription] = useState('');
    const [totalValueInput, setTotalValueInput] = useState('');
    const [installmentsCount, setInstallmentsCount] = useState('1');
    const [loanDate, setLoanDate] = useState(new Date().toISOString().split('T')[0]);
    const [firstDueDate, setFirstDueDate] = useState('');
    const [selectedCard, setSelectedCard] = useState('');
    const [selectedClient, setSelectedClient] = useState('');
    
    const [selectedClient1, setSelectedClient1] = useState('');
    const [selectedClient2, setSelectedClient2] = useState('');
    const [person1ShareInput, setPerson1ShareInput] = useState('');
    const [person2ShareDisplay, setPerson2ShareDisplay] = useState('R$ 0,00');

    const [showInstallments, setShowInstallments] = useState({});
    const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);
    const [loanToDelete, setLoanToDelete] = useState(null);
    const [showPaidLoans, setShowPaidLoans] = useState(false);

    useEffect(() => {
        if (!isAuthReady || !db || !userId) return;
        const userCollectionPath = getUserCollectionPathSegments();
        const clientsRef = collection(db, ...userCollectionPath, userId, 'clients');
        const cardsRef = collection(db, ...userCollectionPath, userId, 'cards');
        const loansRef = query(collection(db, ...userCollectionPath, userId, 'loans'), orderBy('createdAt', 'desc'));

        const unsubClients = onSnapshot(clientsRef, snapshot => setClients(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
        const unsubCards = onSnapshot(cardsRef, snapshot => setCards(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
        const unsubLoans = onSnapshot(loansRef, snapshot => setLoans(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
        
        return () => { unsubClients(); unsubCards(); unsubLoans(); };
    }, [db, userId, isAuthReady, getUserCollectionPathSegments]);
    
    // ✅ CORREÇÃO: Lógica de vencimento da fatura totalmente refeita.
    useEffect(() => {
        if (loanDate && selectedCard && cards.length > 0) {
            const card = cards.find(c => c.id === selectedCard);
            if (card && card.closingDay && card.dueDay) {
                // Usar T12:00:00Z para evitar problemas de fuso horário
                const purchaseDate = new Date(loanDate + "T12:00:00Z");
                let dueMonth = purchaseDate.getUTCMonth();
                let dueYear = purchaseDate.getUTCFullYear();

                // Cenário 1: Fechamento e vencimento no mesmo mês (Ex: fecha 20, vence 28)
                if (card.closingDay < card.dueDay) {
                     if (purchaseDate.getUTCDate() >= card.closingDay) {
                        // Compra após o fechamento, joga para o próximo mês.
                        dueMonth += 1;
                    }
                } 
                // Cenário 2: Fechamento em um mês, vencimento no seguinte (Ex: fecha 28, vence 06)
                else {
                    // Define a data de fechamento da fatura do mês da compra
                    const closingDate = new Date(Date.UTC(purchaseDate.getUTCFullYear(), purchaseDate.getUTCMonth(), card.closingDay));

                    if (purchaseDate >= closingDate) {
                        // Se a compra foi no dia do fechamento ou depois, a fatura é a do mês seguinte.
                        dueMonth += 2;
                    } else {
                        // Se foi antes, a fatura é a do mês atual.
                        dueMonth += 1;
                    }
                }

                // Ajusta o ano caso o mês passe de Dezembro
                if (dueMonth > 11) {
                    dueYear += Math.floor(dueMonth / 12);
                    dueMonth %= 12;
                }
                
                const finalDueDate = new Date(Date.UTC(dueYear, dueMonth, card.dueDay));
                setFirstDueDate(finalDueDate.toISOString().split('T')[0]);
            }
        }
    }, [loanDate, selectedCard, cards]);


    useEffect(() => {
        if (purchaseType === 'shared') {
            const totalVal = parseCurrencyInput(totalValueInput);
            const person1Val = parseCurrencyInput(person1ShareInput);
            if (totalVal > 0 && person1Val >= 0 && person1Val <= totalVal) {
                setPerson2ShareDisplay(formatCurrencyDisplay(totalVal - person1Val));
            } else if (totalVal > 0 && person1Val > totalVal) {
                setPerson1ShareInput(formatCurrencyForInput(totalVal));
                setPerson2ShareDisplay(formatCurrencyDisplay(0));
            } else {
                setPerson2ShareDisplay('R$ 0,00');
            }
        }
    }, [totalValueInput, person1ShareInput, purchaseType]);

    const isLoanDataInvalid = (loan) => {
        if (typeof loan.totalValue !== 'number' || isNaN(loan.totalValue)) {
            return true;
        }
        if (loan.isShared) {
            if (!loan.sharedDetails || !loan.sharedDetails.person1 || !Array.isArray(loan.sharedDetails.person1.installments)) {
                return true;
            }
            if (loan.sharedDetails.person2 && loan.sharedDetails.person2.shareAmount > 0 && !Array.isArray(loan.sharedDetails.person2.installments)) {
                return true;
            }
        } else {
            if (!Array.isArray(loan.installments)) {
                return true;
            }
        }
        return false;
    };
    
    const resetForm = () => {
        setEditingLoan(null);
        setPurchaseType('normal');
        setDescription('');
        setTotalValueInput('');
        setInstallmentsCount('1');
        setLoanDate(new Date().toISOString().split('T')[0]);
        setFirstDueDate('');
        setSelectedCard('');
        setSelectedClient('');
        setSelectedClient1('');
        setSelectedClient2('');
        setPerson1ShareInput('');
        setPerson2ShareDisplay('R$ 0,00');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        const totalValue = parseCurrencyInput(totalValueInput);
        const installmentsNum = parseInt(installmentsCount, 10);

        if (!description.trim() || !totalValue || installmentsNum < 1 || !loanDate || !selectedCard || !firstDueDate) {
            showToast('Preencha todos os campos obrigatórios da compra.', 'warning');
            setIsLoading(false);
            return;
        }
        
        const calculateInstallments = (value, count, startDate) => {
            const numericValue = Number(value) || 0;
            if (numericValue <= 0 || count < 1) return [];

            const installmentValue = parseFloat((numericValue / count).toFixed(2));
            const firstInstallmentDate = new Date(startDate + "T12:00:00Z");
            const installments = [];
            for (let i = 0; i < count; i++) {
                const dueDate = new Date(firstInstallmentDate);
                dueDate.setUTCMonth(dueDate.getUTCMonth() + i);
                installments.push({
                    number: i + 1,
                    value: installmentValue,
                    dueDate: dueDate.toISOString().split('T')[0],
                    status: 'Pendente',
                    paidDate: null
                });
            }
            const totalCalculated = installments.reduce((acc, inst) => acc + inst.value, 0);
            const remaining = numericValue - totalCalculated;
            if (Math.abs(remaining) > 0.001) {
                installments[count - 1].value = parseFloat((installments[count - 1].value + remaining).toFixed(2));
            }
            return installments;
        };

        let loanData = { description, totalValue, installmentsCount: installmentsNum, purchaseDate: loanDate, cardId: selectedCard, userId, valuePaidClient: 0, balanceDueClient: totalValue, statusPaymentClient: 'Pendente' };

        if (purchaseType === 'normal') {
            if (!selectedClient) {
                showToast('Selecione uma pessoa para a compra.', 'warning');
                setIsLoading(false);
                return;
            }
            loanData.clientId = selectedClient;
            loanData.isShared = false;
            loanData.installments = calculateInstallments(totalValue, installmentsNum, firstDueDate);
        } else {
            const person1Share = parseCurrencyInput(person1ShareInput);
            const person2Share = totalValue - person1Share;

            if (!selectedClient1 || !selectedClient2 || person1Share <= 0 || person2Share < 0) {
                showToast('Preencha todos os campos da compra compartilhada.', 'warning');
                setIsLoading(false);
                return;
            }
            if (selectedClient1 === selectedClient2) {
                showToast('As pessoas 1 e 2 devem ser diferentes.', 'warning');
                setIsLoading(false);
                return;
            }
            
            loanData.isShared = true;
            loanData.installments = calculateInstallments(totalValue, installmentsNum, firstDueDate);
            loanData.sharedDetails = {
                person1: { clientId: selectedClient1, shareAmount: person1Share, installments: calculateInstallments(person1Share, installmentsNum, firstDueDate), valuePaid: 0, balanceDue: person1Share, statusPayment: 'Pendente' },
                person2: { clientId: selectedClient2, shareAmount: person2Share, installments: person2Share > 0 ? calculateInstallments(person2Share, installmentsNum, firstDueDate) : [], valuePaid: 0, balanceDue: person2Share, statusPayment: person2Share > 0 ? 'Pendente' : 'Pago Total' }
            };
        }

        try {
            const userCollectionPath = getUserCollectionPathSegments();
            if (editingLoan) {
                const loanDocRef = doc(db, ...userCollectionPath, userId, 'loans', editingLoan.id);
                await updateDoc(loanDocRef, { ...loanData, updatedAt: serverTimestamp() });
                showToast('Compra atualizada com sucesso!', 'success');
            } else {
                const loansRef = collection(db, ...userCollectionPath, userId, 'loans');
                await addDoc(loansRef, { ...loanData, createdAt: serverTimestamp() });
                showToast('Compra adicionada com sucesso!', 'success');
            }
            resetForm();
        } catch (error) {
            console.error("Erro ao salvar compra:", error);
            showToast(`Erro ao salvar: ${error.message}`, 'error');
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleEdit = (loan) => {
        window.scrollTo(0, 0);
        setEditingLoan(loan);
        setDescription(loan.description);
        setTotalValueInput(formatCurrencyForInput(loan.totalValue));
        setInstallmentsCount(loan.installmentsCount.toString());
        setLoanDate(loan.purchaseDate);
        setSelectedCard(loan.cardId);
        
        if (loan.isShared) {
            setPurchaseType('shared');
            setSelectedClient1(loan.sharedDetails.person1.clientId);
            setPerson1ShareInput(formatCurrencyForInput(loan.sharedDetails.person1.shareAmount));
            setSelectedClient2(loan.sharedDetails.person2.clientId);
        } else {
            setPurchaseType('normal');
            setSelectedClient(loan.clientId);
        }
    };

    const confirmDeleteLoan = (loanId) => {
        setLoanToDelete(loanId);
        setIsConfirmationModalOpen(true);
    };

    const handleDeleteLoanConfirmed = async () => {
        if (!loanToDelete) return;
        try {
            const userCollectionPath = getUserCollectionPathSegments();
            await deleteDoc(doc(db, ...userCollectionPath, userId, 'loans', loanToDelete));
            showToast("Compra deletada com sucesso!", "success");
        } catch (error) {
            showToast(`Erro ao deletar: ${error.message}`, "error");
        } finally {
            setIsConfirmationModalOpen(false);
            setLoanToDelete(null);
        }
    };

    const handleMarkInstallmentAsPaid = async (loanId, personKey, instNum) => {
        const loanToUpdate = loans.find(l => l.id === loanId);
        if (!loanToUpdate) return;

        const updatedLoan = JSON.parse(JSON.stringify(loanToUpdate));
        let installmentsList, shareAmount, detailsToUpdate;

        if (personKey) {
            detailsToUpdate = updatedLoan.sharedDetails[personKey];
            installmentsList = detailsToUpdate.installments;
            shareAmount = detailsToUpdate.shareAmount;
        } else {
            installmentsList = updatedLoan.installments;
        }
        
        const instIndex = Array.isArray(installmentsList) ? installmentsList.findIndex(i => i.number === instNum) : -1;
        if (instIndex === -1) {
            showToast('Erro: Parcela não encontrada para atualização.', 'error');
            return;
        };

        installmentsList[instIndex].status = 'Paga';
        installmentsList[instIndex].paidDate = new Date().toISOString().split('T')[0];
        
        const newValuePaid = installmentsList.filter(i => i.status === 'Paga').reduce((sum, i) => sum + i.value, 0);
        const newBalanceDue = parseFloat(((personKey ? shareAmount : updatedLoan.totalValue) - newValuePaid).toFixed(2));
        const newStatus = newBalanceDue <= 0.005 ? 'Pago Total' : (newValuePaid > 0 ? 'Pago Parcial' : 'Pendente');

        if (personKey) {
            detailsToUpdate.valuePaid = newValuePaid;
            detailsToUpdate.balanceDue = newBalanceDue;
            detailsToUpdate.statusPayment = newStatus;
        } else {
            updatedLoan.valuePaidClient = newValuePaid;
            updatedLoan.balanceDueClient = newBalanceDue;
            updatedLoan.statusPaymentClient = newStatus;
        }

        try {
            const userCollectionPath = getUserCollectionPathSegments();
            const loanDocRef = doc(db, ...userCollectionPath, userId, 'loans', loanId);
            await updateDoc(loanDocRef, updatedLoan);
            showToast('Parcela marcada como paga!', 'success');
        } catch (error) {
            showToast(`Erro ao atualizar parcela: ${error.message}`, 'error');
        }
    };

    const toggleInstallments = (loanId) => setShowInstallments(prev => ({ ...prev, [loanId]: !prev[loanId] }));
    const getClientName = (clientId) => clients.find(c => c.id === clientId)?.name || 'N/A';
    
    const filteredLoans = useMemo(() => 
        loans.filter(loan => showPaidLoans || (loan.isShared ? (loan.sharedDetails?.person1?.statusPayment !== 'Pago Total' || loan.sharedDetails?.person2?.statusPayment !== 'Pago Total') : loan.statusPaymentClient !== 'Pago Total')),
    [loans, showPaidLoans]);

    const renderInstallments = (installments, loanId, personKey = null) => {
        if (!Array.isArray(installments)) {
             return (
                <div className="p-4 bg-gray-900/50 text-center text-sm text-yellow-400">
                    Não foi possível carregar as parcelas. Recadastre esta compra.
                </div>
            );
        }
        return (
            <div className="p-4 bg-gray-900/50">
                <h4 className="font-bold text-sm mb-2 text-gray-300">Parcelas:</h4>
                <ul className="space-y-2">
                    {installments.map(inst => (
                        <li key={inst.number} className="flex justify-between items-center text-sm">
                            <div>
                                <span>{inst.number}ª - {new Date(inst.dueDate + "T00:00:00").toLocaleDateString('pt-BR')} - </span>
                                <span className="font-semibold">{formatCurrencyDisplay(inst.value)} - </span>
                                <span className={inst.status === 'Paga' ? 'text-green-400' : inst.status === 'Atrasado' ? 'text-red-400' : 'text-yellow-400'}>{inst.status}</span>
                                {inst.status === 'Paga' && inst.paidDate && <span className="text-xs text-gray-500"> (pago em {new Date(inst.paidDate + "T00:00:00").toLocaleDateString('pt-BR')})</span>}
                            </div>
                            {inst.status === 'Pendente' && (
                                <button onClick={() => handleMarkInstallmentAsPaid(loanId, personKey, inst.number)} className="bg-green-500/20 text-green-300 px-2 py-1 rounded-md hover:bg-green-500/30 text-xs font-semibold">
                                    Marcar Paga
                                </button>
                            )}
                        </li>
                    ))}
                </ul>
            </div>
        );
    };
    
    return (
        <div className="space-y-6">
            <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700">
                <h2 className="text-xl font-bold text-white mb-4">{editingLoan ? 'Editando Compra' : 'Adicionar Compra no Cartão'}</h2>
                
                <div className="flex justify-center p-1 bg-gray-700 rounded-lg max-w-sm mx-auto mb-6">
                    <button onClick={() => setPurchaseType('normal')} disabled={!!editingLoan} className={`w-1/2 px-4 py-2 text-sm font-bold rounded-md transition-colors ${purchaseType === 'normal' ? 'bg-purple-600 text-white shadow' : 'text-gray-400'} disabled:opacity-50`}>Compra Normal</button>
                    <button onClick={() => setPurchaseType('shared')} disabled={!!editingLoan} className={`w-1/2 px-4 py-2 text-sm font-bold rounded-md transition-colors ${purchaseType === 'shared' ? 'bg-purple-600 text-white shadow' : 'text-gray-400'} disabled:opacity-50`}>Compra Compartilhada</button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <input type="date" value={loanDate} onChange={(e) => setLoanDate(e.target.value)} className="w-full p-2 bg-gray-700 border-2 border-gray-600 rounded-md text-white" required />
                        <select value={selectedCard} onChange={(e) => setSelectedCard(e.target.value)} className="w-full p-2 bg-gray-700 border-2 border-gray-600 rounded-md text-white" required>
                            <option value="">Selecione o Cartão</option>
                            {cards.map(card => <option key={card.id} value={card.id}>{card.name}</option>)}
                        </select>
                        <input type="text" placeholder="Descrição da Compra" value={description} onChange={(e) => setDescription(e.target.value)} className="w-full p-2 bg-gray-700 border-2 border-gray-600 rounded-md text-white" required />
                    </div>
                    
                    {firstDueDate && (
                        <div className="p-2 bg-gray-800 rounded-md text-sm text-gray-400 text-center">
                            Primeira parcela na fatura com vencimento em: <span className="font-semibold text-white">{new Date(firstDueDate + 'T00:00:00').toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</span>
                        </div>
                    )}

                    {purchaseType === 'normal' && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                           <select value={selectedClient} onChange={(e) => setSelectedClient(e.target.value)} className="w-full p-2 bg-gray-700 border-2 border-gray-600 rounded-md text-white" required>
                                <option value="">Selecione a Pessoa</option>
                                {clients.map(client => <option key={client.id} value={client.id}>{client.name}</option>)}
                            </select>
                            <input type="text" placeholder="Valor Total da Compra" value={totalValueInput} onChange={handleCurrencyInputChange(setTotalValueInput)} className="w-full p-2 bg-gray-700 border-2 border-gray-600 rounded-md text-white" required inputMode="decimal" />
                            <input type="number" placeholder="Nº de Parcelas" value={installmentsCount} onChange={(e) => setInstallmentsCount(e.target.value)} className="w-full p-2 bg-gray-700 border-2 border-gray-600 rounded-md text-white" min="1" required />
                        </div>
                    )}
                    {purchaseType === 'shared' && (
                         <div className="pt-4 border-t border-gray-700 grid grid-cols-1 md:grid-cols-3 gap-4">
                            <input type="text" placeholder="Valor Total da Compra" value={totalValueInput} onChange={handleCurrencyInputChange(setTotalValueInput)} className="w-full p-2 bg-gray-700 border-2 border-gray-600 rounded-md text-white" required inputMode="decimal" />
                            <input type="number" placeholder="Nº de Parcelas" value={installmentsCount} onChange={(e) => setInstallmentsCount(e.target.value)} className="w-full p-2 bg-gray-700 border-2 border-gray-600 rounded-md text-white" min="1" required />
                            <div/>
                             <select value={selectedClient1} onChange={(e) => setSelectedClient1(e.target.value)} className="w-full p-2 bg-gray-700 border-2 border-gray-600 rounded-md text-white" required>
                                <option value="">Pessoa 1</option>
                                {clients.map(client => <option key={client.id} value={client.id}>{client.name}</option>)}
                            </select>
                            <input type="text" placeholder="Valor da Pessoa 1" value={person1ShareInput} onChange={handleCurrencyInputChange(setPerson1ShareInput)} className="w-full p-2 bg-gray-700 border-2 border-gray-600 rounded-md text-white" required inputMode="decimal" />
                            <div className="p-2 bg-gray-800 rounded-md text-center text-gray-300 h-full flex items-center justify-center font-bold">{person2ShareDisplay}</div>

                            <select value={selectedClient2} onChange={(e) => setSelectedClient2(e.target.value)} className="w-full p-2 bg-gray-700 border-2 border-gray-600 rounded-md text-white" required>
                                <option value="">Pessoa 2</option>
                                {clients.map(client => <option key={client.id} value={client.id}>{client.name}</option>)}
                            </select>
                        </div>
                    )}
                    
                    <div className="flex justify-end gap-4 pt-4 border-t border-gray-700">
                        {editingLoan && <button type="button" onClick={resetForm} className="py-2 px-6 bg-gray-600 hover:bg-gray-500 rounded-md text-white font-semibold transition">Cancelar Edição</button>}
                        <button type="submit" disabled={isLoading} className="py-2 px-6 bg-purple-600 hover:bg-purple-700 rounded-md text-white font-semibold transition disabled:bg-purple-800 disabled:cursor-not-allowed">
                            {isLoading ? 'Salvando...' : editingLoan ? 'Atualizar Compra' : 'Adicionar Compra'}
                        </button>
                    </div>
                </form>
            </div>
            
            <div className="flex justify-end items-center mb-4">
                <label className="flex items-center text-sm text-gray-400 cursor-pointer">
                    <input type="checkbox" checked={showPaidLoans} onChange={() => setShowPaidLoans(!showPaidLoans)} className="h-4 w-4 bg-gray-700 border-gray-600 text-purple-600 focus:ring-purple-500 rounded mr-2" />
                    Mostrar compras pagas
                </label>
            </div>

            <div className="hidden md:grid grid-cols-7 gap-4 p-4 items-center border-b border-gray-700 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                <span>Pessoa</span>
                <span>Cartão</span>
                <span>Valor da Parcela</span>
                <span>Nº de Parcelas</span>
                <span>Valor (Parte/Total)</span>
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
                                                <div className="text-xs text-red-300">Esta compra tem um formato antigo e precisa ser recadastrada. Por favor, anote os detalhes, apague-a e crie uma nova.</div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="hidden md:flex items-center text-sm">
                                        <span className="text-red-400 font-bold">Inválido</span>
                                    </div>
                                    <div className="flex items-center justify-end gap-4">
                                        <button disabled className="text-purple-400/30 cursor-not-allowed" title="Editar desabilitado"><EditIcon /></button>
                                        <button onClick={() => confirmDeleteLoan(loan.id)} className="text-red-500 hover:text-red-400 transition" title="Deletar"><DeleteIcon /></button>
                                        <button disabled className="text-gray-400/30 cursor-not-allowed">
                                           <ChevronDown />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    }

                    const card = cards.find(c => c.id === loan.cardId);
                    return (
                        <div key={loan.id} className="bg-gray-800/50 rounded-lg border border-gray-700">
                             <div className="grid grid-cols-3 md:grid-cols-7 gap-4 p-4 items-center">
                                 <div className="col-span-1">
                                     <div className="text-sm font-semibold text-white">{loan.description}</div>
                                     <div className="text-xs text-gray-400">{loan.isShared ? `${getClientName(loan.sharedDetails.person1.clientId)} / ${getClientName(loan.sharedDetails.person2.clientId)}` : getClientName(loan.clientId)}</div>
                                 </div>
                                 <div className="flex items-center text-sm text-gray-400">
                                     <span className="w-4 h-4 rounded-sm mr-3 border border-white/20" style={{ backgroundColor: card ? card.color : '#5E60CE' }}></span>
                                     <span>{card ? card.name : 'N/A'}</span>
                                 </div>
                                 <div className="hidden md:block text-sm text-gray-300">
                                     {formatCurrencyDisplay(loan.isShared 
                                         ? (loan.sharedDetails.person1.installments?.[0]?.value || 0) + (loan.sharedDetails.person2.installments?.[0]?.value || 0) 
                                         : loan.installments?.[0]?.value
                                     )}
                                 </div>
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
                                     <button onClick={() => handleEdit(loan)} className="text-purple-400 hover:text-purple-300 transition" title="Editar"><EditIcon /></button>
                                     <button onClick={() => confirmDeleteLoan(loan.id)} className="text-red-500 hover:text-red-400 transition" title="Deletar"><DeleteIcon /></button>
                                     <button onClick={() => toggleInstallments(loan.id)} className="text-gray-400 hover:text-white transition">
                                         {showInstallments[loan.id] ? <ChevronUp /> : <ChevronDown />}
                                     </button>
                                 </div>
                             </div>
                             {showInstallments[loan.id] && (
                                <div className="border-t border-gray-700">
                                    {loan.isShared ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-gray-700">
                                            <div className="bg-gray-800 p-2">
                                                <h5 className="font-semibold text-center text-sm mb-2">{getClientName(loan.sharedDetails.person1.clientId)}</h5>
                                                {renderInstallments(loan.sharedDetails.person1.installments, loan.id, 'person1')}
                                            </div>
                                            <div className="bg-gray-800 p-2">
                                                <h5 className="font-semibold text-center text-sm mb-2">{getClientName(loan.sharedDetails.person2.clientId)}</h5>
                                                {renderInstallments(loan.sharedDetails.person2.installments, loan.id, 'person2')}
                                            </div>
                                        </div>
                                    ) : (
                                        renderInstallments(loan.installments, loan.id)
                                    )}
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>

            <GenericModal isOpen={isConfirmationModalOpen} onClose={() => setIsConfirmationModalOpen(false)} onConfirm={handleDeleteLoanConfirmed} title="Confirmar Exclusão" message="Tem certeza que deseja deletar esta compra e todas as suas parcelas?" isConfirmation={true} theme={theme} />
        </div>
    );
}

export default LoanManagement;