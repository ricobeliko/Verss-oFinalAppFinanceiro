// src/features/income/IncomeManagement.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, addDoc, doc, updateDoc, deleteDoc, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { useAppContext } from '../../context/AppContext';
import GenericModal from '../../components/GenericModal';
import { formatCurrencyDisplay, parseCurrencyInput, handleCurrencyInputChange, formatCurrencyForInput } from '../../utils/currency';

// --- Ícones ---
const EditIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const DeleteIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>;
const PlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;

function IncomeManagement() {
    const { userId, db, showToast, isAuthReady, getUserCollectionPathSegments, theme } = useAppContext();

    const [incomes, setIncomes] = useState([]);
    const [clients, setClients] = useState([]);

    // --- State de Controle dos Modais ---
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingIncome, setEditingIncome] = useState(null);
    const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);
    const [incomeToDelete, setIncomeToDelete] = useState(null);

    // --- State do Formulário (dentro do modal) ---
    const [description, setDescription] = useState('');
    const [valueInput, setValueInput] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [clientId, setClientId] = useState('');

    useEffect(() => {
        if (!isAuthReady || !userId) return;
        const userCollectionPath = getUserCollectionPathSegments();
        const basePath = [...userCollectionPath, userId];
        
        const clientsRef = collection(db, ...basePath, 'clients');
        const unsubClients = onSnapshot(clientsRef, (snapshot) => setClients(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
        
        const incomesRef = collection(db, ...basePath, 'incomes');
        const q = query(incomesRef, orderBy("createdAt", "desc"));
        const unsubIncomes = onSnapshot(q, (snapshot) => {
            setIncomes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        return () => { unsubClients(); unsubIncomes(); };
    }, [userId, db, isAuthReady, getUserCollectionPathSegments]);

    const resetForm = () => {
        setDescription('');
        setValueInput('');
        setDate(new Date().toISOString().split('T')[0]);
        setClientId('');
    };
    
    const handleOpenModal = (income = null) => {
        setEditingIncome(income);
        if (income) {
            setDescription(income.description);
            setValueInput(formatCurrencyForInput(income.value));
            const incomeDate = income.date?.toDate ? income.date.toDate().toISOString().split('T')[0] : income.date;
            setDate(incomeDate);
            setClientId(income.clientId);
        } else {
            resetForm();
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingIncome(null);
        resetForm();
    };

    const handleSaveIncome = async () => {
        const value = parseCurrencyInput(valueInput);
        if (!description.trim() || !value || !date || !clientId) {
            showToast('Por favor, preencha todos os campos.', 'warning');
            return;
        }
        const userCollectionPath = getUserCollectionPathSegments();
        const incomeData = { description, value, date, clientId };
        try {
            if (editingIncome) {
                const incomeDocRef = doc(db, ...userCollectionPath, userId, 'incomes', editingIncome.id);
                await updateDoc(incomeDocRef, { ...incomeData, updatedAt: serverTimestamp() });
                showToast("Receita atualizada com sucesso!", "success");
            } else {
                const incomesRef = collection(db, ...userCollectionPath, userId, 'incomes');
                await addDoc(incomesRef, { ...incomeData, createdAt: serverTimestamp(), userId });
                showToast("Receita adicionada com sucesso!", "success");
            }
            handleCloseModal();
        } catch (error) {
            showToast(`Erro ao salvar receita: ${error.message}`, "error");
        }
    };

    const confirmDelete = (id) => {
        setIncomeToDelete(id);
        setIsConfirmationModalOpen(true);
    };

    const handleDeleteConfirmed = async () => {
        if (!incomeToDelete) return;
        const userCollectionPath = getUserCollectionPathSegments();
        try {
            await deleteDoc(doc(db, ...userCollectionPath, userId, 'incomes', incomeToDelete));
            showToast("Receita deletada com sucesso!", "success");
        } catch (error) {
            showToast(`Erro ao deletar receita: ${error.message}`, "error");
        } finally {
            setIsConfirmationModalOpen(false);
            setIncomeToDelete(null);
        }
    };
    
    const getClientName = (cId) => clients.find(c => c.id === cId)?.name || 'N/A';

    return (
        <div className="space-y-8 animate-fadeIn">
            {/* Header Carbono & Dourado */}
            <div className="bg-carbon-900 border border-carbon-800 p-6 sm:p-8 rounded-3xl shadow-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gold-cream">Gerenciamento de Receitas</h1>
                    <p className="text-sm text-gray-400 mt-1">Adicione e acompanhe suas fontes de renda e ganhos avulsos.</p>
                </div>
                <button onClick={() => handleOpenModal()} className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-gold-light to-gold text-carbon-900 font-bold py-3 px-5 rounded-2xl shadow-lg shadow-gold/20 hover:opacity-90 transition cursor-pointer">
                    <PlusIcon />
                    <span>Adicionar Receita</span>
                </button>
            </div>

            {/* Tabela de Receitas */}
            <div className="bg-carbon-900 border border-carbon-800 rounded-3xl shadow-2xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full border-collapse">
                        <thead>
                            <tr className="border-b border-carbon-800 text-xs font-semibold text-gray-400 uppercase tracking-wider bg-carbon-800/50">
                                <th className="px-6 py-4">Data</th>
                                <th className="px-6 py-4">Descrição</th>
                                <th className="px-6 py-4">Pessoa</th>
                                <th className="px-6 py-4">Valor</th>
                                <th className="px-6 py-4">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-carbon-800 text-sm">
                            {incomes.length > 0 ? incomes.map((income) => (
                                <tr key={income.id} className="hover:bg-carbon-800/40 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{new Date(income.date + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                                    <td className="px-6 py-4 whitespace-nowrap font-semibold text-gold-cream">{income.description}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{getClientName(income.clientId)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-extrabold text-emerald-400">{formatCurrencyDisplay(income.value)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap font-medium">
                                        <div className="flex items-center gap-4">
                                            <button onClick={() => handleOpenModal(income)} className="text-gold hover:text-gold-light transition cursor-pointer" title="Editar"><EditIcon /></button>
                                            <button onClick={() => confirmDelete(income.id)} className="text-rose-400 hover:text-rose-300 transition cursor-pointer" title="Deletar"><DeleteIcon /></button>
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                               <tr>
                                    <td colSpan="5" className="text-center py-12 text-gray-500">
                                        Nenhuma receita cadastrada.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal de Cadastro/Edição */}
            <GenericModal isOpen={isModalOpen} onClose={handleCloseModal} title={editingIncome ? 'Editar Receita' : 'Adicionar Receita'} theme="dark" maxWidth="max-w-lg">
                <div className="space-y-4">
                    <div>
                        <label htmlFor="incomeDescription" className="block text-sm font-medium text-gray-300 mb-1">Descrição</label>
                        <input id="incomeDescription" type="text" placeholder="Ex: Salário, Venda" value={description} onChange={(e) => setDescription(e.target.value)} required />
                    </div>
                    <div>
                        <label htmlFor="incomeValue" className="block text-sm font-medium text-gray-300 mb-1">Valor</label>
                        <div className="relative">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-gold font-bold">R$</span>
                            <input id="incomeValue" type="text" value={valueInput} onChange={handleCurrencyInputChange(setValueInput)} className="w-full pl-12" required inputMode="decimal" placeholder="0,00" />
                        </div>
                    </div>
                    <div>
                        <label htmlFor="incomeDate" className="block text-sm font-medium text-gray-300 mb-1">Data</label>
                        <input id="incomeDate" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
                    </div>
                    <div>
                        <label htmlFor="incomeClient" className="block text-sm font-medium text-gray-300 mb-1">Pessoa</label>
                        <select id="incomeClient" value={clientId} onChange={(e) => setClientId(e.target.value)} required>
                            <option value="">Selecione a Pessoa</option>
                            {clients.map(client => <option key={client.id} value={client.id}>{client.name}</option>)}
                        </select>
                    </div>
                </div>
                <div className="mt-6 flex justify-end gap-4">
                    <button onClick={handleCloseModal} className="py-2.5 px-5 bg-carbon-800 hover:bg-carbon-700 rounded-2xl text-gray-300 transition cursor-pointer font-medium">Cancelar</button>
                    <button onClick={handleSaveIncome} className="py-2.5 px-5 bg-gradient-to-r from-gold-light to-gold hover:opacity-90 rounded-2xl text-carbon-900 font-bold transition cursor-pointer shadow-lg shadow-gold/20">Salvar</button>
                </div>
            </GenericModal>

            {/* Modal de Confirmação de Exclusão */}
            <GenericModal 
                isOpen={isConfirmationModalOpen} 
                onClose={() => setIsConfirmationModalOpen(false)} 
                onConfirm={handleDeleteConfirmed} 
                title="Confirmar Exclusão" 
                isConfirmation={true} 
                theme={theme}
            >
                Tem certeza que deseja deletar a receita "{incomes.find(i => i.id === incomeToDelete)?.description}"?
            </GenericModal>
        </div>
    );
}

export default IncomeManagement;