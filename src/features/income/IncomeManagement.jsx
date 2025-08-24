// src/features/income/IncomeManagement.jsx

import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, doc, deleteDoc, serverTimestamp } from 'firebase/firestore'; // Removido 'query' e 'where' que não são mais necessários aqui
import { useAppContext } from '../../context/AppContext';
import GenericModal from '../../components/GenericModal';
import { formatCurrencyDisplay, parseCurrencyInput, handleCurrencyInputChange, formatCurrencyForInput } from '../../utils/currency';

// --- Ícones ---
const EditIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const DeleteIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>;

function IncomeManagement() {
    const { userId, db, showToast, isAuthReady, getUserCollectionPathSegments, theme } = useAppContext();
    
    const [incomes, setIncomes] = useState([]);
    const [clients, setClients] = useState([]);
    const [editingIncome, setEditingIncome] = useState(null);

    // Estados do formulário
    const [description, setDescription] = useState('');
    const [valueInput, setValueInput] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [clientId, setClientId] = useState('');

    const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);
    const [incomeToDelete, setIncomeToDelete] = useState(null);

    useEffect(() => {
        if (!isAuthReady || !userId) return;
        const userCollectionPath = getUserCollectionPathSegments();
        
        const clientsRef = collection(db, ...userCollectionPath, userId, 'clients');
        const unsubClients = onSnapshot(clientsRef, (snapshot) => setClients(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
        
        // ✅ CORREÇÃO APLICADA AQUI
        // A busca agora é feita diretamente na referência da coleção de receitas do usuário,
        // sem a cláusula 'where' desnecessária.
        const incomesRef = collection(db, ...userCollectionPath, userId, 'incomes');
        const unsubIncomes = onSnapshot(incomesRef, (snapshot) => {
            setIncomes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        return () => { unsubClients(); unsubIncomes(); };
    }, [userId, db, isAuthReady, getUserCollectionPathSegments]);

    const resetForm = () => {
        setDescription('');
        setValueInput('');
        setDate(new Date().toISOString().split('T')[0]);
        setClientId('');
        setEditingIncome(null);
    };

    const handleEdit = (income) => {
        setEditingIncome(income);
        setDescription(income.description);
        setValueInput(formatCurrencyForInput(income.value));
        // Garante que a data está no formato YYYY-MM-DD
        const incomeDate = income.date?.toDate ? income.date.toDate().toISOString().split('T')[0] : income.date;
        setDate(incomeDate);
        setClientId(income.clientId);
        window.scrollTo(0, 0);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const value = parseCurrencyInput(valueInput);
        if (!description.trim() || !value || !date || !clientId) {
            showToast('Por favor, preencha todos os campos.', 'warning');
            return;
        }

        const userCollectionPath = getUserCollectionPathSegments();
        // O campo 'userId' não é necessário nos documentos da subcoleção
        const incomeData = { description, value, date, clientId };

        try {
            if (editingIncome) {
                const incomeDocRef = doc(db, ...userCollectionPath, userId, 'incomes', editingIncome.id);
                await updateDoc(incomeDocRef, { ...incomeData, updatedAt: serverTimestamp() });
                showToast("Receita atualizada com sucesso!", "success");
            } else {
                const incomesRef = collection(db, ...userCollectionPath, userId, 'incomes');
                await addDoc(incomesRef, { ...incomeData, createdAt: serverTimestamp() });
                showToast("Receita adicionada com sucesso!", "success");
            }
            resetForm();
        } catch (error) {
            console.error("Erro ao salvar receita:", error);
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
            console.error("Erro ao deletar receita:", error);
            showToast(`Erro ao deletar receita: ${error.message}`, "error");
        } finally {
            setIsConfirmationModalOpen(false);
            setIncomeToDelete(null);
        }
    };
    
    const getClientName = (cId) => clients.find(c => c.id === cId)?.name || 'N/A';

    return (
        <div className="space-y-6">
            <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700">
                <h2 className="text-xl font-bold text-white mb-4">{editingIncome ? 'Editando Receita' : 'Gerenciar Receitas'}</h2>
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                    <input type="text" placeholder="Descrição (Ex: Salário)" value={description} onChange={(e) => setDescription(e.target.value)} className="w-full p-2 bg-gray-700 border-2 border-gray-600 rounded-md shadow-sm text-white focus:ring-purple-500 focus:border-purple-500 transition md:col-span-2" required />
                    <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">R$</span>
                        <input type="text" placeholder="Valor" value={valueInput} onChange={handleCurrencyInputChange(setValueInput)} className="w-full p-2 pl-9 bg-gray-700 border-2 border-gray-600 rounded-md shadow-sm text-white focus:ring-purple-500 focus:border-purple-500 transition" required inputMode="decimal" />
                    </div>
                    <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full p-2 bg-gray-700 border-2 border-gray-600 rounded-md shadow-sm text-white focus:ring-purple-500 focus:border-purple-500 transition" required />
                    <select value={clientId} onChange={(e) => setClientId(e.target.value)} className="w-full p-2 bg-gray-700 border-2 border-gray-600 rounded-md shadow-sm text-white focus:ring-purple-500 focus:border-purple-500 transition" required>
                        <option value="">Selecione a Pessoa</option>
                        {clients.map(client => <option key={client.id} value={client.id}>{client.name}</option>)}
                    </select>
                    <div className="col-span-full flex justify-end gap-4 mt-2">
                        {editingIncome && <button type="button" onClick={resetForm} className="py-2 px-6 bg-gray-600 hover:bg-gray-500 rounded-md text-white transition font-semibold">Cancelar Edição</button>}
                        <button type="submit" className="py-2 px-6 bg-purple-600 hover:bg-purple-700 rounded-md text-white transition font-semibold">{editingIncome ? 'Atualizar' : 'Adicionar'}</button>
                    </div>
                </form>
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
                        {incomes.map((income) => (
                            <tr key={income.id} className="hover:bg-gray-800">
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{new Date(income.date + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                                <td className="px-6 py-4 whitespace-nowrap font-medium text-white">{income.description}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{getClientName(income.clientId)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-400">{formatCurrencyDisplay(income.value)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                    <div className="flex items-center gap-4">
                                        <button onClick={() => handleEdit(income)} className="text-purple-400 hover:text-purple-300 transition" title="Editar"><EditIcon /></button>
                                        <button onClick={() => confirmDelete(income.id)} className="text-red-500 hover:text-red-400 transition" title="Deletar"><DeleteIcon /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <GenericModal 
                isOpen={isConfirmationModalOpen} 
                onClose={() => setIsConfirmationModalOpen(false)} 
                onConfirm={handleDeleteConfirmed} 
                title="Confirmar Exclusão" 
                message="Tem certeza que deseja deletar esta receita?" 
                isConfirmation={true} 
                theme={theme} 
            />
        </div>
    );
}

export default IncomeManagement;