// src/components/AccountDeletionModal.jsx
import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import Modal from '../design-system/primitives/Modal';
import TextField from '../design-system/primitives/TextField';
import Button from '../design-system/primitives/Button';
import { executeAccountDeletion, mapAccountDeletionError } from '../features/auth/accountDeletionFlow';

/**
 * Modal de Exclusão Definitiva de Conta (LGPD / Privacy).
 * Fluxo em duas etapas dentro do mesmo diálogo DS2:
 * 
 * STEP 1: Confirmação de texto obrigatória ("EXCLUIR").
 * STEP 2: Reautenticação recente com senha (Recent Auth Gate)
 *         com renovação obrigatória de ID Token antes da callable.
 */
export default function AccountDeletionModal({ isOpen, onClose }) {
  const { currentUser, logout, showToast } = useAppContext();

  // Etapa atual: 1 = Confirmação destrutiva, 2 = Reautenticação
  const [step, setStep] = useState(1);

  // Estados locais (nunca persistidos em storage)
  const [confirmationText, setConfirmationText] = useState('');
  const [password, setPassword] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const isConfirmed = confirmationText.trim().toUpperCase() === 'EXCLUIR';

  // Limpa estados e fecha (sem guard de processamento, usado nos fluxos de sucesso)
  const resetAndClose = () => {
    setStep(1);
    setConfirmationText('');
    setPassword('');
    setErrorMessage('');
    onClose();
  };

  // Tentativa manual do usuário de fechar durante o uso
  const handleClose = () => {
    if (isProcessing) return;
    resetAndClose();
  };

  // Avança para a etapa 2 (Reauth)
  const handleProceedToReauth = (e) => {
    e.preventDefault();
    if (!isConfirmed) return;
    setErrorMessage('');
    setStep(2);
  };

  // Volta para a etapa 1
  const handleBackToStep1 = () => {
    if (isProcessing) return;
    setPassword('');
    setErrorMessage('');
    setStep(1);
  };

  // Executa reautenticação real e exclusão
  const handleConfirmDeletion = async (e) => {
    e.preventDefault();
    if (isProcessing) return;

    // Fail-closed se faltarem dados essenciais
    if (!currentUser || !currentUser.email) {
      setErrorMessage('Sessão inválida. Faça login novamente para prosseguir.');
      return;
    }

    if (!password || !password.trim()) {
      setErrorMessage('Por favor, informe a sua senha atual.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage('');

    try {
      // 1. Modo E2E / Testes Mock
      if (
        import.meta.env?.DEV &&
        typeof window !== 'undefined' &&
        window.__FINCONTROL_E2E_MOCK_DATA__
      ) {
        if (password === 'wrong-password' || password === 'incorreta') {
          setPassword('');
          setErrorMessage('Senha incorreta. Tente novamente.');
          setIsProcessing(false);
          return;
        }

        showToast('Sua conta e todos os dados foram excluídos com sucesso.', 'success');
        resetAndClose();
        logout();
        return;
      }

      // 2. Orquestração Real de Exclusão com Recent Auth Gate
      await executeAccountDeletion({ currentUser, password });

      showToast('Sua conta e todos os dados foram excluídos com sucesso.', 'success');
      resetAndClose();
      logout();
    } catch (error) {
      console.error('[AccountDeletion] Falha na reautenticação ou exclusão:', error);
      setPassword(''); // Limpa a senha da memória por segurança

      const message = mapAccountDeletionError(error);
      setErrorMessage(message);
      if (message === 'Não foi possível excluir sua conta. Tente novamente.') {
        showToast('Erro ao excluir conta.', 'error');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={step === 1 ? 'Zona de Perigo — Excluir Conta' : 'Confirme sua Senha'}
      maxWidth="max-w-md"
      footer={
        step === 1 ? (
          <>
            <Button
              variant="ghost"
              onClick={handleClose}
              disabled={isProcessing}
            >
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={handleProceedToReauth}
              disabled={!isConfirmed || isProcessing}
            >
              Continuar
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="ghost"
              onClick={handleBackToStep1}
              disabled={isProcessing}
            >
              Voltar
            </Button>
            <Button
              variant="danger"
              type="submit"
              form="reauth-deletion-form"
              isLoading={isProcessing}
              disabled={!password || isProcessing}
            >
              Confirmar Exclusão
            </Button>
          </>
        )
      }
    >
      {step === 1 ? (
        /* ETAPA 1: Confirmação Destrutiva */
        <form onSubmit={handleProceedToReauth} className="space-y-4">
          <div
            id="deletion-warning-desc"
            className="p-3.5 bg-[var(--fc-danger-soft)] border border-[var(--fc-danger)]/30 rounded-2xl flex items-start gap-3 text-xs"
          >
            <span className="text-base shrink-0 leading-none mt-0.5" aria-hidden="true">
              ⚠️
            </span>
            <div className="space-y-1">
              <p className="font-bold text-[var(--fc-danger)]">
                Ação permanente e irreversível!
              </p>
              <p className="text-[11px] text-[var(--fc-text-secondary)] leading-relaxed">
                Todos os seus cartões, lançamentos, pessoas, compras parceladas e históricos serão apagados definitivamente.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <TextField
              id="confirmDeletionInput"
              label={
                <span>
                  Para continuar, digite{' '}
                  <strong className="font-mono text-[var(--fc-danger)] font-bold">
                    EXCLUIR
                  </strong>{' '}
                  no campo abaixo:
                </span>
              }
              value={confirmationText}
              onChange={(e) => setConfirmationText(e.target.value)}
              placeholder="EXCLUIR"
              autoComplete="off"
              disabled={isProcessing}
              aria-describedby="deletion-warning-desc"
            />
          </div>
        </form>
      ) : (
        /* ETAPA 2: Reautenticação Recente */
        <form id="reauth-deletion-form" onSubmit={handleConfirmDeletion} className="space-y-4">
          <p className="text-xs text-[var(--fc-text-secondary)] leading-relaxed">
            Por segurança, precisamos confirmar novamente sua identidade antes de excluir a conta.
          </p>

          <TextField
            id="reauth-password-input"
            label="Senha Atual"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Digite sua senha"
            autoComplete="current-password"
            required
            disabled={isProcessing}
            error={errorMessage || undefined}
          />
        </form>
      )}
    </Modal>
  );
}
