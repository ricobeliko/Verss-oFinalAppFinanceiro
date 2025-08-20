// src/features/clients/ClientManagement.jsx

import React, { useState, useEffect } from 'react';
import { collection, addDoc, onSnapshot, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { useAppContext } from '../../context/AppContext';
import GenericModal from '../../components/GenericModal';

// --- Ícones ---
const EditIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const DeleteIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>;

// --- Componente Principal ---
export default function ClientManagement() {
    const { userId, db, showToast } = useAppContext();
    const [clients, setClients] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentClient, setCurrentClient] = useState(null);
    const [clientName, setClientName] = useState('');

    useEffect(() => {
        if (!userId) return;
        const clientsRef = collection(db, 'users_fallback', userId, 'clients');
        const unsubscribe = onSnapshot(clientsRef, (snapshot) => {
            setClients(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return () => unsubscribe();
    }, [userId, db]);

    const handleOpenModal = (client = null) => {
        setCurrentClient(client);
        setClientName(client ? client.name : '');
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setCurrentClient(null);
        setClientName('');
    };

    const handleSaveClient = async () => {
        if (!clientName.trim()) {
            showToast('O nome da pessoa não pode estar vazio.', 'error');
            return;
        }
        const clientsRef = collection(db, 'users_fallback', userId, 'clients');
        try {
            if (currentClient) {
                const clientDoc = doc(db, 'users_fallback', userId, 'clients', currentClient.id);
                await updateDoc(clientDoc, { name: clientName });
                showToast('Pessoa atualizada com sucesso!', 'success');
            } else {
                await addDoc(clientsRef, { name: clientName, userId });
                showToast('Pessoa adicionada com sucesso!', 'success');
            }
            handleCloseModal();
        } catch (error) {
            console.error("Erro ao salvar pessoa:", error);
            showToast('Erro ao salvar pessoa. Tente novamente.', 'error');
        }
    };

    const handleDeleteClient = async (clientId) => {
        if (confirm('Tem certeza que deseja excluir esta pessoa?')) {
            try {
                const clientDoc = doc(db, 'users_fallback', userId, 'clients', clientId);
                await deleteDoc(clientDoc);
                showToast('Pessoa excluída com sucesso!', 'success');
            } catch (error) {
                console.error("Erro ao excluir pessoa:", error);
                showToast('Erro ao excluir pessoa. Tente novamente.', 'error');
            }
        }
    };
    
    // RESTAURADO: Função para o botão de relatório
    const handleReport = (clientName) => {
        alert(`Gerando relatório para: ${clientName}`);
        // Aqui você pode adicionar a lógica para gerar ou navegar para a página de relatório
    };

    return (
        <div className="p-6 bg-gray-900/50 border border-gray-800 rounded-lg">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-white">Gerenciamento de Pessoas</h1>
                <button onClick={() => handleOpenModal()} className="bg-purple-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md hover:bg-purple-700 transition">Adicionar Pessoa</button>
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full bg-gray-800/50 rounded-lg">
                    <thead>
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Nome</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                        {clients.map((client) => (
                            <tr key={client.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">{client.name}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                    <div className="flex items-center gap-4">
                                        <button onClick={() => handleOpenModal(client)} className="text-purple-400 hover:text-purple-300 transition" title="Editar"><EditIcon /></button>
                                        <button onClick={() => handleDeleteClient(client.id)} className="text-red-500 hover:text-red-400 transition" title="Excluir"><DeleteIcon /></button>
                                        {/* RESTAURADO: Botão de Relatório */}
                                        <button 
                                            onClick={() => handleReport(client.name)} 
                                            className="bg-green-500/20 text-green-400 hover:bg-green-500/30 text-xs font-semibold py-1 px-3 rounded-full transition"
                                        >
                                            Relatório
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <GenericModal isOpen={isModalOpen} onClose={handleCloseModal} title={currentClient ? 'Editar Pessoa' : 'Adicionar Pessoa'}>
                <div>
                    <label htmlFor="clientName" className="block text-sm font-medium text-gray-300">Nome da Pessoa</label>
                    <input type="text" id="clientName" value={clientName} onChange={(e) => setClientName(e.target.value)} className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm p-2 text-white focus:ring-purple-500 focus:border-purple-500" placeholder="Ex: João Silva" />
                </div>
                <div className="mt-6 flex justify-end gap-4">
                    <button onClick={handleCloseModal} className="py-2 px-4 bg-gray-600 hover:bg-gray-700 rounded-md text-white transition">Cancelar</button>
                    <button onClick={handleSaveClient} className="py-2 px-4 bg-purple-600 hover:bg-purple-700 rounded-md text-white transition">Salvar</button>
                </div>
            </GenericModal>
        </div>
    );
}
