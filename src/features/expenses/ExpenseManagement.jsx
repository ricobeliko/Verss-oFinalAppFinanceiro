import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, doc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { useAppContext } from '../../context/AppContext';
// ✅ 1. IMPORTAÇÕES CORRIGIDAS
import { formatCurrencyDisplay, parseCurrencyInput, handleCurrencyInputChange } from '../../utils/currency';
import GenericModal from '../../components/GenericModal';

function ExpenseManagement() {
    const { db, userId, isAuthReady, getUserCollectionPathSegments, theme, showToast, isPro } = useAppContext();

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

    // Categorias de despesas pré-definidas
    const expenseCategories = [
        "Alimentação", "Transporte", "Moradia", "Saúde", "Educação", 
        "Lazer", "Vestuário", "Cuidados Pessoais", "Dívidas", "Investimentos", "Outros"
    ];

    useEffect(() => {
        if (!isAuthReady || !db || !userId) return;
        const userCollectionPath = getUserCollectionPathSegments();
        
        const expensesColRef = collection(db, ...userCollectionPath, userId, 'expenses');
        const q = query(expensesColRef, orderBy("date", "desc"));
        const unsubscribeExpenses = onSnapshot(q, (snapshot) => {
            setExpenses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        const cardsColRef = collection(db, ...userCollectionPath, userId, 'cards');
        const unsubscribeCards = onSnapshot(cardsColRef, (snapshot) => {
            setCards(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        return () => {
            unsubscribeExpenses();
            unsubscribeCards();
        };
    }, [db, userId, isAuthReady, getUserCollectionPathSegments]);

    const resetForm = () => {
        setDescription('');
        setValueInput('');
        setDate(new Date().toISOString().split('T')[0]);
        setCategory('');
        setSelectedCard('');
        setEditingExpense(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!isPro) {
            showToast('Funcionalidade Pro. Faça upgrade para continuar.', 'warning');
            return;
        }
        const value = parseCurrencyInput(valueInput);
        if (!description.trim() || !value || !date || !category) {
            showToast('Por favor, preencha todos os campos obrigatórios.', 'warning');
            return;
        }
        const userCollectionPath = getUserCollectionPathSegments();
        const expenseData = { description, value, date, category, cardId: selectedCard || null };
        try {
            if (editingExpense) {
                await updateDoc(doc(db, ...userCollectionPath, userId, 'expenses', editingExpense.id), expenseData);
                showToast("Despesa atualizada com sucesso!", "success");
            } else {
                await addDoc(collection(db, ...userCollectionPath, userId, 'expenses'), { ...expenseData, createdAt: new Date() });
                showToast("Despesa adicionada com sucesso!", "success");
            }
            resetForm();
        } catch (error) {
            console.error("Erro ao salvar despesa:", error);
            showToast(`Erro ao salvar despesa: ${error.message}`, "error");
        }
    };

    const handleEdit = (expense) => {
        setEditingExpense(expense);
        setDescription(expense.description);
        // ✅ 2. USO CORRETO DA FUNÇÃO DE FORMATAÇÃO
        setValueInput(formatCurrencyDisplay(expense.value).replace('R$ ', ''));
        setDate(expense.date);
        setCategory(expense.category);
        setSelectedCard(expense.cardId || '');
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
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md dark:shadow-lg relative">
            {!isPro && <div className="absolute inset-0 bg-gray-800 bg-opacity-50 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg"></div>}
            
            <h2 className="text-2xl font-semibold mb-4 text-gray-800 dark:text-gray-200">Gerenciar Despesas Avulsas</h2>
            <form onSubmit={handleSubmit} className="mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
                <input type="text" placeholder="Descrição" value={description} onChange={(e) => setDescription(e.target.value)} className="p-3 border border-gray-300 rounded-lg bg-white text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-white" required />
                <input type="text" placeholder="Valor" value={valueInput} onChange={handleCurrencyInputChange(setValueInput)} className="p-3 border border-gray-300 rounded-lg bg-white text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-white" required />
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="p-3 border border-gray-300 rounded-lg bg-white text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-white" required />
                <select value={category} onChange={(e) => setCategory(e.target.value)} className="p-3 border border-gray-300 rounded-lg bg-white text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-white" required>
                    <option value="">Selecione a Categoria</option>
                    {expenseCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
                <select value={selectedCard} onChange={(e) => setSelectedCard(e.target.value)} className="p-3 border border-gray-300 rounded-lg bg-white text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                    <option value="">Pagamento Avulso</option>
                    {cards.map(card => <option key={card.id} value={card.id}>{card.name}</option>)}
                </select>
                <div className="col-span-full flex justify-end gap-4 mt-4">
                    <button type="submit" className="bg-red-600 text-white py-3 px-6 rounded-lg hover:bg-red-700" disabled={!isPro}>{editingExpense ? 'Atualizar Despesa' : 'Adicionar Despesa'}</button>
                    {editingExpense && (<button type="button" onClick={resetForm} className="bg-gray-400 text-white py-3 px-6 rounded-lg hover:bg-gray-500">Cancelar</button>)}
                </div>
            </form>
            <div className="overflow-x-auto">
                <table className="min-w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                            <th className="py-3 px-4 text-left text-sm font-medium text-gray-600 dark:text-gray-300 uppercase">Descrição</th>
                            <th className="py-3 px-4 text-left text-sm font-medium text-gray-600 dark:text-gray-300 uppercase">Valor</th>
                            <th className="py-3 px-4 text-left text-sm font-medium text-gray-600 dark:text-gray-300 uppercase">Data</th>
                            <th className="py-3 px-4 text-left text-sm font-medium text-gray-600 dark:text-gray-300 uppercase">Categoria</th>
                            <th className="py-3 px-4 text-left text-sm font-medium text-gray-600 dark:text-gray-300 uppercase">Pagamento</th>
                            <th className="py-3 px-4 text-left text-sm font-medium text-gray-600 dark:text-gray-300 uppercase">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {expenses.map((expense) => (
                            <tr key={expense.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                <td className="py-3 px-4 whitespace-nowrap">{expense.description}</td>
                                {/* ✅ 3. USO CORRETO DA FUNÇÃO DE FORMATAÇÃO */}
                                <td className="py-3 px-4 whitespace-nowrap">{formatCurrencyDisplay(expense.value)}</td>
                                <td className="py-3 px-4 whitespace-nowrap">{new Date(expense.date + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                                <td className="py-3 px-4 whitespace-nowrap">{expense.category}</td>
                                <td className="py-3 px-4 whitespace-nowrap">{cards.find(c => c.id === expense.cardId)?.name || 'Avulso'}</td>
                                <td className="py-3 px-4 whitespace-nowrap flex items-center gap-2">
                                    <button onClick={() => handleEdit(expense)} className="text-blue-600 hover:text-blue-900" disabled={!isPro}>Editar</button>
                                    <button onClick={() => confirmDelete(expense.id)} className="text-red-600 hover:text-red-900" disabled={!isPro}>Deletar</button>
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

export default ExpenseManagement;
