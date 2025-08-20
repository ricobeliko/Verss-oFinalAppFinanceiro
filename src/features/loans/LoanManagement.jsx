// src/features/loans/LoanManagement.jsx

import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, doc, updateDoc, addDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { useAppContext } from '../../context/AppContext';
import { formatCurrencyDisplay, parseCurrencyInput, handleCurrencyInputChange, formatCurrencyForInput } from '../../utils/currency';
import GenericModal from '../../components/GenericModal';

// --- Ícones ---
const EditIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const DeleteIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>;
const ChevronDown = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>;
const InfoIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>;

function LoanManagement() {
    const { db, userId, isAuthReady, getUserCollectionPathSegments, theme, showToast } = useAppContext();
    
    const [loans, setLoans] = useState([]);
    const [clients, setClients] = useState([]);
    const [cards, setCards] = useState([]);

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

    // Efeitos
    useEffect(() => {
        if (!isAuthReady || !db || !userId) return;
        const userCollectionPath = getUserCollectionPathSegments();
        const clientsRef = collection(db, ...userCollectionPath, userId, 'clients');
        const cardsRef = collection(db, ...userCollectionPath, userId, 'cards');
        const loansRef = collection(db, ...userCollectionPath, userId, 'loans');

        const unsubClients = onSnapshot(clientsRef, snapshot => setClients(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
        const unsubCards = onSnapshot(cardsRef, snapshot => setCards(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
        const unsubLoans = onSnapshot(loansRef, snapshot => setLoans(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
        
        return () => { unsubClients(); unsubCards(); unsubLoans(); };
    }, [db, userId, isAuthReady, getUserCollectionPathSegments]);

    useEffect(() => {
        if (loanDate && selectedCard && cards.length > 0) {
            const card = cards.find(c => c.id === selectedCard);
            if (card) {
                const purchaseDate = new Date(loanDate + "T12:00:00Z");
                let dueDate = new Date(purchaseDate);
                if (purchaseDate.getUTCDate() >= card.closingDay) {
                    dueDate.setUTCMonth(dueDate.getUTCMonth() + 2, card.dueDay);
                } else {
                    dueDate.setUTCMonth(dueDate.getUTCMonth() + 1, card.dueDay);
                }
                setFirstDueDate(dueDate.toISOString().split('T')[0]);
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

    const resetForm = () => { /* ... */ };
    const handleSubmit = async (e) => { /* ... */ };
    const handleEdit = (loan) => { /* ... */ };
    const confirmDeleteLoan = (loanId) => { /* ... */ };
    const handleDeleteLoanConfirmed = async () => { /* ... */ };
    const handleMarkInstallmentAsPaid = async (loanId, personKey, instNum) => { /* ... */ };
    const toggleInstallments = (loanId) => setShowInstallments(prev => ({ ...prev, [loanId]: !prev[loanId] }));
    const getClientName = (clientId) => clients.find(c => c.id === clientId)?.name || 'N/A';
    const getCardInfo = (cardId) => cards.find(c => c.id === cardId) || { name: 'N/A', color: '#ccc' };

    return (
        <div className="space-y-6">
            <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700">
                <h2 className="text-xl font-bold text-white mb-4">{editingLoan ? 'Editando Compra' : 'Adicionar Compra no Cartão'}</h2>
                
                <div className="flex justify-center p-1 bg-gray-700 rounded-lg max-w-sm mx-auto mb-6">
                    <button onClick={() => setPurchaseType('normal')} className={`w-1/2 px-4 py-2 text-sm font-bold rounded-md transition-colors ${purchaseType === 'normal' ? 'bg-purple-600 text-white shadow' : 'text-gray-400'}`}>Compra Normal</button>
                    <button onClick={() => setPurchaseType('shared')} className={`w-1/2 px-4 py-2 text-sm font-bold rounded-md transition-colors ${purchaseType === 'shared' ? 'bg-purple-600 text-white shadow' : 'text-gray-400'}`}>Compra Compartilhada</button>
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

                    {purchaseType === 'normal' && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-700">
                           <select value={selectedClient} onChange={(e) => setSelectedClient(e.target.value)} className="w-full p-2 bg-gray-700 border-2 border-gray-600 rounded-md text-white" required>
                                <option value="">Selecione a Pessoa</option>
                                {clients.map(client => <option key={client.id} value={client.id}>{client.name}</option>)}
                            </select>
                            <input type="text" placeholder="Valor Total da Compra" value={totalValueInput} onChange={handleCurrencyInputChange(setTotalValueInput)} className="w-full p-2 bg-gray-700 border-2 border-gray-600 rounded-md text-white" required inputMode="decimal" />
                            <input type="number" placeholder="Nº de Parcelas" value={installmentsCount} onChange={(e) => setInstallmentsCount(e.target.value)} className="w-full p-2 bg-gray-700 border-2 border-gray-600 rounded-md text-white" min="1" required />
                        </div>
                    )}

                    {purchaseType === 'shared' && (
                         <div className="pt-4 border-t border-gray-700 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <input type="text" placeholder="Valor Total da Compra" value={totalValueInput} onChange={handleCurrencyInputChange(setTotalValueInput)} className="w-full p-2 bg-gray-700 border-2 border-gray-600 rounded-md text-white" required inputMode="decimal" />
                                <input type="number" placeholder="Nº de Parcelas" value={installmentsCount} onChange={(e) => setInstallmentsCount(e.target.value)} className="w-full p-2 bg-gray-700 border-2 border-gray-600 rounded-md text-white" min="1" required />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-900/50 rounded-lg">
                                 <select value={selectedClient1} onChange={(e) => setSelectedClient1(e.target.value)} className="w-full p-2 bg-gray-700 border-2 border-gray-600 rounded-md text-white" required>
                                    <option value="">Pessoa 1</option>
                                    {clients.map(client => <option key={client.id} value={client.id}>{client.name}</option>)}
                                </select>
                                <input type="text" placeholder="Valor da Pessoa 1" value={person1ShareInput} onChange={handleCurrencyInputChange(setPerson1ShareInput)} className="w-full p-2 bg-gray-700 border-2 border-gray-600 rounded-md text-white" required inputMode="decimal" />
                                <div className="p-2 bg-gray-800 rounded-md text-center text-gray-300">{person2ShareDisplay}</div>
                            </div>
                             <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-900/50 rounded-lg">
                                <select value={selectedClient2} onChange={(e) => setSelectedClient2(e.target.value)} className="w-full p-2 bg-gray-700 border-2 border-gray-600 rounded-md text-white md:col-start-2" required>
                                    <option value="">Pessoa 2</option>
                                    {clients.map(client => <option key={client.id} value={client.id}>{client.name}</option>)}
                                </select>
                            </div>
                        </div>
                    )}
                    
                    <div className="col-span-full flex justify-end gap-4 pt-4 border-t border-gray-700">
                        {editingLoan && <button type="button" onClick={resetForm} className="py-2 px-6 bg-gray-600 hover:bg-gray-500 rounded-md text-white font-semibold transition">Cancelar</button>}
                        <button type="submit" className="py-2 px-6 bg-purple-600 hover:bg-purple-700 rounded-md text-white font-semibold transition">{editingLoan ? 'Atualizar' : 'Adicionar Compra'}</button>
                    </div>
                </form>
            </div>
            
             <div className="overflow-x-auto">
                <table className="min-w-full bg-gray-800/50 rounded-lg">
                    {/* ... Thead da Tabela ... */}
                    <tbody className="divide-y divide-gray-700">
                        {/* ... Mapeamento e renderização das linhas (tr) ... */}
                    </tbody>
                </table>
            </div>

            <GenericModal isOpen={isConfirmationModalOpen} onClose={() => setIsConfirmationModalOpen(false)} onConfirm={handleDeleteLoanConfirmed} title="Confirmar Exclusão" message="Tem certeza que deseja deletar esta compra e todas as suas parcelas?" isConfirmation={true} theme={theme} />
        </div>
    );
}

// ✅ CORREÇÃO: ADICIONANDO A EXPORTAÇÃO PADRÃO
export default LoanManagement;