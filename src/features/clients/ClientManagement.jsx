import React, { useState, useMemo } from 'react';
import { collection, addDoc, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { useAppContext } from '../../context/AppContext';
import GenericModal from '../../components/GenericModal';
import FinancialReportModal from './FinancialReportModal';
import UpgradePrompt from '../../components/UpgradePrompt';
import Spinner from '../../components/Spinner';
import { formatCurrencyDisplay } from '../../utils/currency';
import { calculateConsolidatedClientReceivables } from '../../services/financialService';
import { canAddPerson } from '../../config/planEntitlements';
import { useClients } from '../../hooks/useClients';
import { useLoans } from '../../hooks/useLoans';
import { useExpenses } from '../../hooks/useExpenses';
import { useSubscriptions } from '../../hooks/useSubscriptions';

// --- Ícones ---
const EditIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const DeleteIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>;
const PlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;

// --- Componente Principal ---
export default function ClientManagement() {
    const { userId, db, isPro, isTrialActive, showToast, getUserCollectionPathSegments, handleUpgradeClick, activateFreeTrial } = useAppContext();
    const { clients } = useClients();
    const { loans: allLoans } = useLoans();
    const { expenses: allExpenses } = useExpenses();
    const { subscriptions: allSubscriptions } = useSubscriptions();

    const currentMonth = useMemo(() => new Date().toISOString().slice(0, 7), []);

    // Consolidação de repasses sem contagem dupla
    const receivablesData = useMemo(() => {
        return calculateConsolidatedClientReceivables({
            loans: allLoans,
            expenses: allExpenses,
            subscriptions: allSubscriptions,
            clients,
            targetMonth: currentMonth
        });
    }, [allLoans, allExpenses, allSubscriptions, clients, currentMonth]);

    // --- Estados para o formulário de ADIÇÃO ---
    const [newClientName, setNewClientName] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

    // --- Estados para o modal de EDIÇÃO ---
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [clientToEdit, setClientToEdit] = useState(null);
    const [editingClientName, setEditingClientName] = useState('');

    // --- Estados para o modal de CONFIRMAÇÃO DE EXCLUSÃO ---
    const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);
    const [clientToDelete, setClientToDelete] = useState(null);

    // --- Estados para o modal de RELATÓRIO ---
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [reportClient, setReportClient] = useState(null);

    const handleAddClient = async (e) => {
        e.preventDefault();
        if (isSubmitting) return;

        // Validação canônica do limite do plano Free
        const check = canAddPerson({ isPro, isTrialActive, peopleCount: clients.length });
        if (!check.allowed) {
            showToast(check.message, 'warning');
            setIsUpgradeModalOpen(true);
            return;
        }

        if (!newClientName.trim()) {
            showToast('O nome da pessoa não pode estar vazio.', 'error');
            return;
        }

        setIsSubmitting(true);
        try {
            if (import.meta.env.DEV && typeof window !== 'undefined' && window.__FINCONTROL_E2E_MOCK_DATA__) {
                const currentMockCount = (window.__FINCONTROL_E2E_MOCK_DATA__.clients || []).length;
                const mockCheck = canAddPerson({ isPro, isTrialActive, peopleCount: currentMockCount });
                if (!mockCheck.allowed) {
                    showToast(mockCheck.message, 'warning');
                    setIsUpgradeModalOpen(true);
                    setIsSubmitting(false);
                    return;
                }

                const newClient = { id: `client-e2e-${Date.now()}`, name: newClientName.trim(), userId };
                window.__FINCONTROL_E2E_MOCK_DATA__.clients = [...(window.__FINCONTROL_E2E_MOCK_DATA__.clients || []), newClient];
                showToast('Pessoa adicionada com sucesso!', 'success');
                setNewClientName('');
                setIsSubmitting(false);
                return;
            }

            const userCollectionPath = getUserCollectionPathSegments();
            const clientsRef = collection(db, ...userCollectionPath, userId, 'clients');
            await addDoc(clientsRef, { name: newClientName.trim(), userId });
            showToast('Pessoa adicionada com sucesso!', 'success');
            setNewClientName('');
        } catch (error) {
            console.error("Erro ao adicionar pessoa:", error);
            showToast('Não foi possível salvar a pessoa. Tente novamente.', 'error');
        } finally {
            setIsSubmitting(false);
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
        if (isSubmitting || !editingClientName.trim() || !clientToEdit) {
            if (!editingClientName.trim()) showToast('O nome não pode estar vazio.', 'error');
            return;
        }

        setIsSubmitting(true);
        try {
            const userCollectionPath = getUserCollectionPathSegments();
            const clientDoc = doc(db, ...userCollectionPath, userId, 'clients', clientToEdit.id);
            await updateDoc(clientDoc, { name: editingClientName.trim() });
            showToast('Pessoa atualizada com sucesso!', 'success');
            handleCloseEditModal();
        } catch (error) {
            console.error("Erro ao atualizar pessoa:", error);
            showToast('Não foi possível atualizar a pessoa. Tente novamente.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const confirmDeleteClient = (client) => {
        setClientToDelete(client);
        setIsConfirmationModalOpen(true);
    };

    const handleDeleteClientConfirmed = async () => {
        if (!clientToDelete || isSubmitting) return;

        setIsSubmitting(true);
        try {
            const userCollectionPath = getUserCollectionPathSegments();
            const clientDoc = doc(db, ...userCollectionPath, userId, 'clients', clientToDelete.id);
            await deleteDoc(clientDoc);
            showToast('Pessoa excluída com sucesso!', 'success');
            setIsConfirmationModalOpen(false);
            setClientToDelete(null);
        } catch (error) {
            console.error("Erro ao excluir pessoa:", error);
            showToast('Não foi possível excluir a pessoa. Tente novamente.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleReport = (client) => {
        setReportClient(client);
        setIsReportModalOpen(true);
    };

    return (
        <div className="space-y-8 animate-fadeIn">
            {/* Header DS2 */}
            <div className="bg-[var(--fc-surface-1)] border border-[var(--fc-border-default)] p-6 sm:p-8 rounded-3xl shadow-2xl space-y-6">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--fc-text-primary)]">Gerenciamento de Pessoas</h1>
                    <p className="text-sm text-[var(--fc-text-muted)] mt-1">Adicione e gerencie as pessoas associadas aos seus lançamentos e faturas compartilhadas.</p>
                </div>

                {/* Formulário de Adição */}
                <form onSubmit={handleAddClient} className="flex items-stretch gap-4 pt-2">
                    <input
                        id="clientName"
                        type="text"
                        value={newClientName}
                        onChange={(e) => setNewClientName(e.target.value)}
                        placeholder="Nome da Pessoa"
                        aria-label="Nome da pessoa"
                        className="flex-grow w-full"
                        disabled={isSubmitting}
                    />
                    <button 
                        type="submit" 
                        disabled={isSubmitting}
                        aria-label="Adicionar pessoa"
                        className="flex-shrink-0 flex items-center gap-2 bg-gradient-to-r from-gold-light to-gold text-carbon-900 font-bold py-3 px-6 rounded-2xl shadow-lg hover:opacity-90 transition cursor-pointer disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[var(--fc-accent)]/50"
                    >
                        {isSubmitting ? <Spinner /> : <PlusIcon />}
                        <span className="hidden sm:inline">{isSubmitting ? 'Salvando...' : 'Adicionar Pessoa'}</span>
                    </button>
                </form>
            </div>

            {/* Central Consolidada de Repasses de Terceiros */}
            <div className="bg-[var(--fc-surface-1)] border border-[var(--fc-border-default)] p-6 rounded-3xl shadow-2xl space-y-4">
                <div className="flex items-center gap-2.5">
                    <span className="text-xl" aria-hidden="true">👥</span>
                    <h2 className="text-base font-bold text-[var(--fc-text-primary)] tracking-tight">
                        Central de Repasses de Terceiros ({new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })})
                    </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-[var(--fc-surface-2)] border border-[var(--fc-border-default)] p-4 rounded-2xl">
                        <span className="text-xs font-semibold uppercase tracking-wider text-[var(--fc-text-muted)] block mb-1">A Receber Este Mês</span>
                        <span className="text-xl font-black text-[var(--fc-accent)] font-mono">{formatCurrencyDisplay(receivablesData.totalReceivableThisMonth)}</span>
                    </div>
                    <div className="bg-[var(--fc-surface-2)] border border-[var(--fc-border-default)] p-4 rounded-2xl">
                        <span className="text-xs font-semibold uppercase tracking-wider text-[var(--fc-text-muted)] block mb-1">Já Recebido</span>
                        <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono">{formatCurrencyDisplay(receivablesData.totalPaidThisMonth)}</span>
                    </div>
                    <div className="bg-[var(--fc-surface-2)] border border-[var(--fc-border-default)] p-4 rounded-2xl">
                        <span className="text-xs font-semibold uppercase tracking-wider text-[var(--fc-text-muted)] block mb-1">Pendente de Repasse</span>
                        <span className="text-xl font-black text-amber-600 dark:text-amber-300 font-mono">{formatCurrencyDisplay(receivablesData.totalPendingThisMonth)}</span>
                    </div>
                    <div className="bg-[var(--fc-surface-2)] border border-[var(--fc-border-default)] p-4 rounded-2xl">
                        <span className="text-xs font-semibold uppercase tracking-wider text-[var(--fc-text-muted)] block mb-1">Saldo Futuro Total</span>
                        <span className="text-xl font-black text-[var(--fc-text-primary)] font-mono">{formatCurrencyDisplay(receivablesData.totalFutureReceivables)}</span>
                    </div>
                </div>
            </div>

            {/* Tabela de Pessoas com Detalhamento de Repasses */}
            <div className="bg-[var(--fc-surface-1)] border border-[var(--fc-border-default)] rounded-3xl shadow-2xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full border-collapse">
                        <thead>
                            <tr className="border-b border-[var(--fc-border-subtle)] text-xs font-semibold text-[var(--fc-text-secondary)] uppercase tracking-wider bg-[var(--fc-surface-2)]">
                                <th scope="col" className="px-6 py-4 text-left">Nome</th>
                                <th scope="col" className="px-6 py-4 text-left">A Receber no Mês</th>
                                <th scope="col" className="px-6 py-4 text-left">Status do Repasse</th>
                                <th scope="col" className="px-6 py-4 text-left">Saldo Futuro Restante</th>
                                <th scope="col" className="px-6 py-4 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--fc-border-subtle)] text-sm">
                            {clients.length > 0 ? clients.map((client) => {
                                const clientRec = receivablesData.byClient.find(c => c.clientId === client.id) || {
                                    receivableThisMonth: 0,
                                    paidThisMonth: 0,
                                    pendingThisMonth: 0,
                                    totalFutureRemaining: 0,
                                    hasPending: false
                                };

                                return (
                                    <tr key={client.id} className="hover:bg-[var(--fc-surface-2)]/50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap font-semibold text-[var(--fc-text-primary)]">
                                            {client.name}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap font-mono text-[var(--fc-text-primary)]">
                                            {formatCurrencyDisplay(clientRec.receivableThisMonth)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {clientRec.receivableThisMonth === 0 ? (
                                                <span className="text-xs text-[var(--fc-text-muted)] font-medium">Sem faturas neste mês</span>
                                            ) : clientRec.hasPending ? (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-300 border border-amber-500/20">
                                                    <span>⏳</span> Pendente: {formatCurrencyDisplay(clientRec.pendingThisMonth)}
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                                    <span>✓</span> Quitado no Mês
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap font-mono text-[var(--fc-text-muted)] text-xs">
                                            {formatCurrencyDisplay(clientRec.totalFutureRemaining)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap font-medium text-right">
                                            <div className="flex items-center justify-end gap-3">
                                                <button 
                                                    type="button"
                                                    onClick={() => handleOpenEditModal(client)} 
                                                    aria-label={`Editar pessoa ${client.name || ''}`.trim()}
                                                    className="text-[var(--fc-accent)] hover:opacity-80 transition cursor-pointer" 
                                                    title="Editar"
                                                >
                                                    <EditIcon />
                                                </button>
                                                <button 
                                                    type="button"
                                                    onClick={() => confirmDeleteClient(client)} 
                                                    aria-label={`Excluir pessoa ${client.name || ''}`.trim()}
                                                    className="text-rose-500 hover:text-rose-400 transition cursor-pointer" 
                                                    title="Excluir"
                                                >
                                                    <DeleteIcon />
                                                </button>
                                                <button 
                                                    onClick={() => handleReport(client)} 
                                                    aria-label={`Ver extrato e PDF de ${client.name || ''}`.trim()}
                                                    className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 text-xs font-semibold py-1.5 px-3.5 rounded-xl transition cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                                                >
                                                    Extrato / PDF
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            }) : (
                                <tr>
                                    <td colSpan="5" className="text-center py-12 text-[var(--fc-text-muted)]">
                                        Nenhuma pessoa cadastrada ainda.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal de Edição */}
            <GenericModal isOpen={isEditModalOpen} onClose={handleCloseEditModal} title="Editar Pessoa" maxWidth="max-w-md">
                <div className="space-y-4">
                    <div>
                        <label htmlFor="clientName" className="block text-sm font-bold text-[var(--fc-text-secondary)] mb-1">Nome da Pessoa</label>
                        <input type="text" id="clientName" value={editingClientName} onChange={(e) => setEditingClientName(e.target.value)} placeholder="Ex: João Silva" />
                    </div>
                </div>
                <div className="mt-6 flex justify-end gap-4">
                    <button onClick={handleCloseEditModal} className="py-2.5 px-5 bg-[var(--fc-surface-2)] hover:bg-[var(--fc-surface-3)] border border-[var(--fc-border-default)] rounded-2xl text-[var(--fc-text-secondary)] hover:text-[var(--fc-text-primary)] transition cursor-pointer font-medium">Cancelar</button>
                    <button onClick={handleUpdateClient} disabled={isSubmitting} className="py-2.5 px-5 bg-gradient-to-r from-gold-light to-gold hover:opacity-90 rounded-2xl text-carbon-900 font-bold transition cursor-pointer shadow-lg disabled:opacity-50">
                        {isSubmitting ? 'Salvando...' : 'Salvar'}
                    </button>
                </div>
            </GenericModal>

            {/* Modal de Confirmação de Exclusão com Detecção de Vínculos */}
            <GenericModal
                isOpen={isConfirmationModalOpen}
                onClose={() => setIsConfirmationModalOpen(false)}
                onConfirm={handleDeleteClientConfirmed}
                title="Confirmar Exclusão de Pessoa"
                isConfirmation={true}
            >
                <div className="space-y-3">
                    <p className="text-sm text-[var(--fc-text-primary)]">
                        Tem certeza que deseja deletar a pessoa <strong className="text-[var(--fc-accent)]">{clientToDelete?.name}</strong>?
                    </p>
                    {(() => {
                        if (!clientToDelete) return null;
                        const linkedLoans = allLoans.filter(l => 
                            l.clientId === clientToDelete.id || 
                            l.sharedDetails?.person1?.clientId === clientToDelete.id || 
                            l.sharedDetails?.person2?.clientId === clientToDelete.id
                        ).length;
                        const linkedExpenses = allExpenses.filter(e => e.clientId === clientToDelete.id).length;
                        const linkedSubs = allSubscriptions.filter(s => s.clientId === clientToDelete.id).length;

                        if (linkedLoans > 0 || linkedExpenses > 0 || linkedSubs > 0) {
                            return (
                                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-xs text-amber-600 dark:text-amber-300 space-y-1">
                                    <p className="font-bold flex items-center gap-1.5">⚠️ Registros Financeiros Vinculados:</p>
                                    <p className="text-[var(--fc-text-secondary)]">
                                        Esta pessoa possui {linkedLoans > 0 ? `${linkedLoans} compra(s)` : ''}{linkedLoans > 0 && linkedExpenses > 0 ? ', ' : ''}{linkedExpenses > 0 ? `${linkedExpenses} despesa(s)` : ''}{linkedSubs > 0 ? ` e ${linkedSubs} assinatura(s)` : ''} associadas.
                                    </p>
                                </div>
                            );
                        }
                        return null;
                    })()}
                </div>
            </GenericModal>

            {/* Modal de Relatório */}
            <FinancialReportModal 
                isOpen={isReportModalOpen}
                onClose={() => setIsReportModalOpen(false)}
                client={reportClient}
            />

            {/* Modal de Upgrade Pro (Disparado ao atingir o limite de 3 pessoas do Free) */}
            <GenericModal
                isOpen={isUpgradeModalOpen}
                onClose={() => setIsUpgradeModalOpen(false)}
                maxWidth="max-w-lg"
            >
                <UpgradePrompt 
                    onUpgradeClick={handleUpgradeClick}
                    onActivateTrial={activateFreeTrial}
                />
            </GenericModal>
        </div>
    );
}