// src/features/expenses/ExpenseManagement.jsx

import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, doc, deleteDoc, query, orderBy, where, serverTimestamp } from 'firebase/firestore';
import { useAppContext } from '../../context/AppContext';
import { formatCurrencyDisplay, parseCurrencyInput, handleCurrencyInputChange, formatCurrencyForInput } from '../../utils/currency';
import GenericModal from '../../components/GenericModal';

// --- Ícones ---
const EditIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const DeleteIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>;

function ExpenseManagement() {
    const { db, userId, isAuthReady, getUserCollectionPathSegments, theme, showToast } = useAppContext();

    const [expenses, setExpenses] = useState([]);
    const [cards, setCards] = useState([]);
    const [description, setDescription] = useState('');
    const [valueInput, setValueInput] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [category, setCategory] = useState('');
    const [selectedCard, setSelectedCard] = useState('');
    const [editingExpense, setEditingExpense] = useState(null);
    const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);
    const [expenseToDelete, setExpenseToDelete] = useState(null);

    const expenseCategories = [
        "Alimentação", "Transporte", "Moradia", "Saúde", "Educação", 
        "Lazer", "Vestuário", "Cuidados Pessoais", "Dívidas", "Investimentos", "Outros"
    ];

    useEffect(() => {
        if (!isAuthReady || !db || !userId) return;
        const userCollectionPath = getUserCollectionPathSegments();
        
        const expensesColRef = collection(db, ...userCollectionPath, userId, 'expenses');
        const q = query(expensesColRef, orderBy("createdAt", "desc"));
        const unsubscribeExpenses = onSnapshot(q, (snapshot) => {
            setExpenses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        const cardsColRef = collection(db, ...userCollectionPath, userId, 'cards');
        const unsubscribeCards = onSnapshot(cardsColRef, (snapshot) => {
            setCards(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        return () => { unsubscribeExpenses(); unsubscribeCards(); };
    }, [db, userId, isAuthReady, getUserCollectionPathSegments]);

    const resetForm = () => {
        setDescription('');
        setValueInput('');
        setDate(new Date().toISOString().split('T')[0]);
        setCategory('');
        setSelectedCard('');
        setEditingExpense(null);
    };

    const handleEdit = (expense) => {
        setEditingExpense(expense);
        setDescription(expense.description);
        setValueInput(formatCurrencyForInput(expense.value));
        setDate(expense.date);
        setCategory(expense.category);
        setSelectedCard(expense.cardId || '');
        window.scrollTo(0, 0);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const value = parseCurrencyInput(valueInput);
        if (!description.trim() || !value || !date || !category) {
            showToast('Por favor, preencha todos os campos obrigatórios.', 'warning');
            return;
        }
        const userCollectionPath = getUserCollectionPathSegments();
        const expenseData = { description, value, date, category, cardId: selectedCard || null, userId };
        try {
            if (editingExpense) {
                const expenseDocRef = doc(db, ...userCollectionPath, userId, 'expenses', editingExpense.id);
                await updateDoc(expenseDocRef, { ...expenseData, updatedAt: serverTimestamp() });
                showToast("Despesa atualizada com sucesso!", "success");
            } else {
                const expensesRef = collection(db, ...userCollectionPath, userId, 'expenses');
                await addDoc(expensesRef, { ...expenseData, createdAt: serverTimestamp() });
                showToast("Despesa adicionada com sucesso!", "success");
            }
            resetForm();
        } catch (error) {
            console.error("Erro ao salvar despesa:", error);
            showToast(`Erro ao salvar despesa: ${error.message}`, "error");
        }
    };

    const confirmDelete = (id) => {
        setExpenseToDelete(id);
        setIsConfirmationModalOpen(true);
    };

    const handleDeleteConfirmed = async () => {
        if (!expenseToDelete) return;
        const userCollectionPath = getUserCollectionPathSegments();
        try {
            await deleteDoc(doc(db, ...userCollectionPath, userId, 'expenses', expenseToDelete));
            showToast("Despesa deletada com sucesso!", "success");
        } catch (error) {
            console.error("Erro ao deletar despesa:", error);
            showToast(`Erro ao deletar despesa: ${error.message}`, "error");
        } finally {
            setIsConfirmationModalOpen(false);
            setExpenseToDelete(null);
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700">
                <h2 className="text-xl font-bold text-white mb-4">{editingExpense ? 'Editando Despesa Avulsa' : 'Gerenciar Despesas Avulsas'}</h2>
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
                    <input type="text" placeholder="Descrição" value={description} onChange={(e) => setDescription(e.target.value)} className="w-full p-2 bg-gray-700 border-2 border-gray-600 rounded-md shadow-sm text-white focus:ring-purple-500 focus:border-purple-500 transition" required />
                    <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">R$</span>
                        <input type="text" placeholder="Valor" value={valueInput} onChange={handleCurrencyInputChange(setValueInput)} className="w-full p-2 pl-9 bg-gray-700 border-2 border-gray-600 rounded-md shadow-sm text-white focus:ring-purple-500 focus:border-purple-500 transition" required inputMode="decimal" />
                    </div>
                    <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full p-2 bg-gray-700 border-2 border-gray-600 rounded-md shadow-sm text-white focus:ring-purple-500 focus:border-purple-500 transition" required />
                    <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full p-2 bg-gray-700 border-2 border-gray-600 rounded-md shadow-sm text-white focus:ring-purple-500 focus:border-purple-500 transition" required>
                        <option value="">Selecione a Categoria</option>
                        {expenseCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                    <select value={selectedCard} onChange={(e) => setSelectedCard(e.target.value)} className="w-full p-2 bg-gray-700 border-2 border-gray-600 rounded-md shadow-sm text-white focus:ring-purple-500 focus:border-purple-500 transition">
                        <option value="">Pagamento Avulso (Dinheiro/PIX)</option>
                        {cards.map(card => <option key={card.id} value={card.id}>{card.name}</option>)}
                    </select>
                    <div className="lg:col-span-3 flex justify-end gap-4 mt-2">
                         {editingExpense && (<button type="button" onClick={resetForm} className="py-2 px-6 bg-gray-600 hover:bg-gray-500 rounded-md text-white transition font-semibold">Cancelar</button>)}
                        <button type="submit" className="py-2 px-6 bg-purple-600 hover:bg-purple-700 rounded-md text-white transition font-semibold">{editingExpense ? 'Atualizar Despesa' : 'Adicionar Despesa'}</button>
                    </div>
                </form>
            </div>
            
            <div className="overflow-x-auto">
                <table className="min-w-full bg-gray-800/50 rounded-lg">
                    <thead className="border-b border-gray-700">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Descrição</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Valor</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Data</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Categoria</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Pagamento</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                        {expenses.map((expense) => (
                            <tr key={expense.id} className="hover:bg-gray-800">
                                <td className="px-6 py-4 whitespace-nowrap font-medium text-white">{expense.description}</td>
                                <td className="px-6 py-4 whitespace-nowrap font-bold text-red-400">{formatCurrencyDisplay(expense.value)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{new Date(expense.date + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{expense.category}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{cards.find(c => c.id === expense.cardId)?.name || 'Avulso'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                    <div className="flex items-center gap-4">
                                        <button onClick={() => handleEdit(expense)} className="text-purple-400 hover:text-purple-300 transition" title="Editar"><EditIcon /></button>
                                        <button onClick={() => confirmDelete(expense.id)} className="text-red-500 hover:text-red-400 transition" title="Deletar"><DeleteIcon /></button>
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
                message="Tem certeza que deseja deletar esta despesa?" 
                isConfirmation={true} 
                theme={theme} 
            />
        </div>
    );
}

// ✅ CORREÇÃO: ADICIONANDO A EXPORTAÇÃO PADRÃO
export default ExpenseManagement;