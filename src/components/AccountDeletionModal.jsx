// src/components/AccountDeletionModal.jsx

import React, { useState } from 'react';
import GenericModal from './GenericModal';
import { useAppContext } from '../context/AppContext';

/**
 * Modal de Exclusão Definitiva de Conta (LGPD / Privacy).
 * Exige confirmação explícita digitando "EXCLUIR" e dispara
 * a Cloud Function autenticada `deleteUserAccount`.
 */
export default function AccountDeletionModal({ isOpen, onClose }) {
    const { logout, showToast } = useAppContext();
    const [confirmationText, setConfirmationText] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const isConfirmed = confirmationText.trim().toUpperCase() === 'EXCLUIR';

    const handleDeleteAccount = async (e) => {
        e.preventDefault();
        if (!isConfirmed || isDeleting) return;

        setIsDeleting(true);
        setErrorMessage('');

        try {
            if (import.meta.env?.DEV && typeof window !== 'undefined' && window.__FINCONTROL_E2E_MOCK_DATA__) {
                // Modo E2E / Testes Mock
                showToast('Conta excluída com sucesso.', 'success');
                onClose();
                logout();
                return;
            }

            const { getFunctions, httpsCallable } = await import('firebase/functions');
            const { app } = await import('../utils/firebase');
            const functions = getFunctions(app, 'southamerica-east1');
            const deleteAccountCallable = httpsCallable(functions, 'deleteUserAccount');

            await deleteAccountCallable();
            showToast('Sua conta e todos os dados foram excluídos com sucesso.', 'success');
            onClose();
            logout();
        } catch (error) {
            console.error('Falha ao excluir conta:', error);
            setErrorMessage(error.message || 'Falha ao processar exclusão. Tente novamente.');
            showToast('Erro ao excluir conta.', 'error');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleClose = () => {
        if (isDeleting) return;
        setConfirmationText('');
        setErrorMessage('');
        onClose();
    };

    return (
        <GenericModal
            isOpen={isOpen}
            onClose={handleClose}
            title="Zona de Perigo — Excluir Conta"
            maxWidth="max-w-md"
        >
            <form onSubmit={handleDeleteAccount} className="space-y-4">
                <div id="deletion-warning-desc" className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-start gap-3 text-rose-300 text-xs">
                    <span className="text-base leading-none" aria-hidden="true">⚠️</span>
                    <div className="space-y-1">
                        <p className="font-bold text-rose-200">Ação permanente e irreversível!</p>
                        <p className="text-[11px] text-rose-300/80">
                            Todos os seus cartões, lançamentos, pessoas, compras parceladas e histórico serão apagados definitivamente.
                        </p>
                    </div>
                </div>

                <div className="space-y-2">
                    <label htmlFor="confirmDeletionInput" className="block text-xs font-semibold text-gray-300">
                        Para confirmar, digite <span className="font-mono font-bold text-rose-400">EXCLUIR</span> no campo abaixo:
                    </label>
                    <input
                        id="confirmDeletionInput"
                        type="text"
                        value={confirmationText}
                        onChange={(e) => setConfirmationText(e.target.value)}
                        placeholder="EXCLUIR"
                        disabled={isDeleting}
                        aria-describedby="deletion-warning-desc"
                        className="w-full p-2.5 bg-carbon-800 border border-carbon-700 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 rounded-xl text-sm font-mono text-white placeholder-gray-600 outline-none transition"
                        autoComplete="off"
                    />
                </div>

                {errorMessage && (
                    <div className="text-xs text-rose-400 bg-rose-950/40 p-2 rounded-xl border border-rose-800">
                        {errorMessage}
                    </div>
                )}

                <div className="flex justify-end gap-3 pt-3 border-t border-carbon-800">
                    <button
                        type="button"
                        onClick={handleClose}
                        disabled={isDeleting}
                        className="px-4 py-2 text-xs font-semibold text-gray-400 hover:text-white rounded-xl bg-carbon-800 transition cursor-pointer"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        disabled={!isConfirmed || isDeleting}
                        className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition shadow-lg cursor-pointer flex items-center gap-2"
                    >
                        {isDeleting ? 'Excluindo...' : 'Excluir Minha Conta'}
                    </button>
                </div>
            </form>
        </GenericModal>
    );
}
