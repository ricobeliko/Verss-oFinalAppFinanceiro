// src/features/clients/ClientManagement.jsx

import React, { useState, useEffect } from 'react';
import { collection, addDoc, onSnapshot, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { useAppContext } from '../../context/AppContext';
import GenericModal from '../../components/GenericModal';
import FinancialReportModal from './FinancialReportModal';

// --- Ícones ---
const EditIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const DeleteIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>;
const PlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;

// --- Componente Principal ---
export default function ClientManagement() {
    const { userId, db, showToast, getUserCollectionPathSegments } = useAppContext();
    const [clients, setClients] = useState([]);
    
    // --- Estados para o formulário de ADIÇÃO ---
    const [newClientName, setNewClientName] = useState('');

    // --- Estados para o modal de EDIÇÃO ---
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [clientToEdit, setClientToEdit] = useState(null);
    const [editingClientName, setEditingClientName] = useState('');

    // --- Estados para o modal de RELATÓRIO ---
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [reportClient, setReportClient] = useState(null);

    useEffect(() => {
        if (!userId) return;
        const userCollectionPath = getUserCollectionPathSegments();
        const clientsRef = collection(db, ...userCollectionPath, userId, 'clients');
        const unsubscribe = onSnapshot(clientsRef, (snapshot) => {
            setClients(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return () => unsubscribe();
    }, [userId, db, getUserCollectionPathSegments]);

    const handleAddClient = async (e) => {
        e.preventDefault();
        if (!newClientName.trim()) {
            showToast('O nome da pessoa não pode estar vazio.', 'error');
            return;
        }
        try {
            const userCollectionPath = getUserCollectionPathSegments();
            const clientsRef = collection(db, ...userCollectionPath, userId, 'clients');
            await addDoc(clientsRef, { name: newClientName, userId });
            showToast('Pessoa adicionada com sucesso!', 'success');
            setNewClientName('');
        } catch (error) {
            console.error("Erro ao adicionar pessoa:", error);
            showToast('Erro ao salvar pessoa. Tente novamente.', 'error');
        }
    };
    
    const handleOpenEditModal = (client) => {
        setClientToEdit(client);
        setEditingClientName(client.name);
        setIsEditModalOpen(true);
    };

    const handleCloseEditModal = () => {
        setIsEditModalOpen(false);
        setClientToEdit(null);
        setEditingClientName('');
    };

    const handleUpdateClient = async () => {
        if (!editingClientName.trim() || !clientToEdit) {
            showToast('O nome não pode estar vazio.', 'error');
            return;
        }
        try {
            const userCollectionPath = getUserCollectionPathSegments();
            const clientDoc = doc(db, ...userCollectionPath, userId, 'clients', clientToEdit.id);
            await updateDoc(clientDoc, { name: editingClientName });
            showToast('Pessoa atualizada com sucesso!', 'success');
            handleCloseEditModal();
        } catch (error) {
            console.error("Erro ao atualizar pessoa:", error);
            showToast('Erro ao atualizar pessoa. Tente novamente.', 'error');
        }
    };

    const handleDeleteClient = async (clientId) => {
        if (confirm('Tem certeza que deseja excluir esta pessoa?')) {
            try {
                const userCollectionPath = getUserCollectionPathSegments();
                const clientDoc = doc(db, ...userCollectionPath, userId, 'clients', clientId);
                await deleteDoc(clientDoc);
                showToast('Pessoa excluída com sucesso!', 'success');
            } catch (error) {
                console.error("Erro ao excluir pessoa:", error);
                showToast('Erro ao excluir pessoa. Tente novamente.', 'error');
            }
        }
    };
    
    const handleReport = (client) => {
        setReportClient(client);
        setIsReportModalOpen(true);
    };

    return (
        <div className="space-y-8 animate-fadeIn">
            {/* Header Carbono & Dourado */}
            <div className="bg-carbon-900 border border-carbon-800 p-6 sm:p-8 rounded-3xl shadow-2xl space-y-6">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gold-cream">Gerenciamento de Pessoas</h1>
                    <p className="text-sm text-gray-400 mt-1">Adicione e gerencie as pessoas associadas aos seus lançamentos e faturas compartilhadas.</p>
                </div>

                {/* Formulário de Adição */}
                <form onSubmit={handleAddClient} className="flex items-stretch gap-4 pt-2">
                    <input
                        type="text"
                        value={newClientName}
                        onChange={(e) => setNewClientName(e.target.value)}
                        placeholder="Nome da Pessoa"
                        className="flex-grow w-full"
                    />
                    <button 
                        type="submit" 
                        className="flex-shrink-0 flex items-center gap-2 bg-gradient-to-r from-gold-light to-gold text-carbon-900 font-bold py-3 px-6 rounded-2xl shadow-lg shadow-gold/20 hover:opacity-90 transition cursor-pointer"
                    >
                        <PlusIcon />
                        <span className="hidden sm:inline">Adicionar Pessoa</span>
                    </button>
                </form>
            </div>

            {/* Tabela de Pessoas */}
            <div className="bg-carbon-900 border border-carbon-800 rounded-3xl shadow-2xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full border-collapse">
                        <thead>
                            <tr className="border-b border-carbon-800 text-xs font-semibold text-gray-400 uppercase tracking-wider bg-carbon-800/50">
                                <th className="px-6 py-4">Nome</th>
                                <th className="px-6 py-4">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-carbon-800 text-sm">
                            {clients.length > 0 ? clients.map((client) => (
                                <tr key={client.id} className="hover:bg-carbon-800/40 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap font-semibold text-gold-cream">{client.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap font-medium">
                                        <div className="flex items-center gap-4">
                                            <button onClick={() => handleOpenEditModal(client)} className="text-gold hover:text-gold-light transition cursor-pointer" title="Editar"><EditIcon /></button>
                                            <button onClick={() => handleDeleteClient(client.id)} className="text-rose-400 hover:text-rose-300 transition cursor-pointer" title="Excluir"><DeleteIcon /></button>
                                            <button 
                                                onClick={() => handleReport(client)} 
                                                className="bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 text-xs font-semibold py-1.5 px-3.5 rounded-xl transition cursor-pointer"
                                            >
                                                Relatório
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="2" className="text-center py-12 text-gray-500">
                                        Nenhuma pessoa cadastrada ainda.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal de Edição */}
            <GenericModal isOpen={isEditModalOpen} onClose={handleCloseEditModal} title="Editar Pessoa" theme="dark" maxWidth="max-w-md">
                <div className="space-y-4">
                    <div>
                        <label htmlFor="clientName" className="block text-sm font-medium text-gray-300 mb-1">Nome da Pessoa</label>
                        <input type="text" id="clientName" value={editingClientName} onChange={(e) => setEditingClientName(e.target.value)} placeholder="Ex: João Silva" />
                    </div>
                </div>
                <div className="mt-6 flex justify-end gap-4">
                    <button onClick={handleCloseEditModal} className="py-2.5 px-5 bg-carbon-800 hover:bg-carbon-700 rounded-2xl text-gray-300 transition cursor-pointer font-medium">Cancelar</button>
                    <button onClick={handleUpdateClient} className="py-2.5 px-5 bg-gradient-to-r from-gold-light to-gold hover:opacity-90 rounded-2xl text-carbon-900 font-bold transition cursor-pointer shadow-lg shadow-gold/20">Salvar</button>
                </div>
            </GenericModal>

            {/* Modal de Relatório */}
            <FinancialReportModal 
                isOpen={isReportModalOpen}
                onClose={() => setIsReportModalOpen(false)}
                client={reportClient}
            />
        </div>
    );
}