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
        <div className="p-6 bg-gray-900/50 border border-gray-800 rounded-lg">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">Gerenciamento de Receitas</h1>
                    <p className="text-sm text-gray-400 mt-1">Adicione suas fontes de renda e ganhos avulsos.</p>
                </div>
                <button onClick={() => handleOpenModal()} className="w-full sm:w-auto flex items-center justify-center gap-2 bg-purple-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md hover:bg-purple-700 transition">
                    <PlusIcon />
                    Adicionar Receita
                </button>
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full bg-gray-800/50 rounded-lg">
                    <thead className="border-b border-gray-700">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Data</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Descrição</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Pessoa</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Valor</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                        {incomes.length > 0 ? incomes.map((income) => (
                            <tr key={income.id} className="hover:bg-gray-800">
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{new Date(income.date + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                                <td className="px-6 py-4 whitespace-nowrap font-medium text-white">{income.description}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{getClientName(income.clientId)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-400">{formatCurrencyDisplay(income.value)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                    <div className="flex items-center gap-4">
                                        <button onClick={() => handleOpenModal(income)} className="text-purple-400 hover:text-purple-300 transition" title="Editar"><EditIcon /></button>
                                        <button onClick={() => confirmDelete(income.id)} className="text-red-500 hover:text-red-400 transition" title="Deletar"><DeleteIcon /></button>
                                    </div>
                                </td>
                            </tr>
                        )) : (
                           <tr>
                                <td colSpan="5" className="text-center py-10 text-gray-500">
                                    Nenhuma receita cadastrada.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <GenericModal isOpen={isModalOpen} onClose={handleCloseModal} title={editingIncome ? 'Editar Receita' : 'Adicionar Receita'} theme="dark">
                <div className="space-y-4">
                    <div>
                        <label htmlFor="incomeDescription" className="block text-sm font-medium text-gray-300 mb-1">Descrição</label>
                        <input id="incomeDescription" type="text" placeholder="Ex: Salário, Venda" value={description} onChange={(e) => setDescription(e.target.value)} className="w-full p-2 bg-gray-700 border-2 border-gray-600 rounded-md shadow-sm text-white focus:ring-purple-500 focus:border-purple-500 transition" required />
                    </div>
                    <div>
                        <label htmlFor="incomeValue" className="block text-sm font-medium text-gray-300 mb-1">Valor</label>
                        <div className="relative">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">R$</span>
                            <input id="incomeValue" type="text" value={valueInput} onChange={handleCurrencyInputChange(setValueInput)} className="w-full p-2 pl-9 bg-gray-700 border-2 border-gray-600 rounded-md shadow-sm text-white focus:ring-purple-500 focus:border-purple-500 transition" required inputMode="decimal" />
                        </div>
                    </div>
                    <div>
                        <label htmlFor="incomeDate" className="block text-sm font-medium text-gray-300 mb-1">Data</label>
                        <input id="incomeDate" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full p-2 bg-gray-700 border-2 border-gray-600 rounded-md shadow-sm text-white focus:ring-purple-500 focus:border-purple-500 transition" required />
                    </div>
                    <div>
                        <label htmlFor="incomeClient" className="block text-sm font-medium text-gray-300 mb-1">Pessoa</label>
                        <select id="incomeClient" value={clientId} onChange={(e) => setClientId(e.target.value)} className="w-full p-2 bg-gray-700 border-2 border-gray-600 rounded-md shadow-sm text-white focus:ring-purple-500 focus:border-purple-500 transition" required>
                            <option value="">Selecione a Pessoa</option>
                            {clients.map(client => <option key={client.id} value={client.id}>{client.name}</option>)}
                        </select>
                    </div>
                </div>
                <div className="mt-6 flex justify-end gap-4">
                    <button onClick={handleCloseModal} className="py-2 px-4 bg-gray-600 hover:bg-gray-700 rounded-md text-white transition">Cancelar</button>
                    <button onClick={handleSaveIncome} className="py-2 px-4 bg-purple-600 hover:bg-purple-700 rounded-md text-white transition">Salvar</button>
                </div>
            </GenericModal>

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