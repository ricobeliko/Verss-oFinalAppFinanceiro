// src/features/auth/components/PasswordResetModal.jsx
import React, { useState } from 'react';
import Modal from '../../../design-system/primitives/Modal';
import TextField from '../../../design-system/primitives/TextField';
import Button from '../../../design-system/primitives/Button';

/**
 * Modal de Recuperação de Senha com Design System 2.0.
 * Protegido contra enumeração de usuários (respostas neutras).
 */
export default function PasswordResetModal({
  isOpen,
  onClose,
  initialEmail = '',
  onSendReset,
}) {
  const [email, setEmail] = useState(initialEmail);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState({ text: '', type: '' });

  // Sincroniza initialEmail quando modal abre
  React.useEffect(() => {
    if (isOpen) {
      setEmail(initialEmail || '');
      setStatusMessage({ text: '', type: '' });
      setIsSubmitting(false);
    }
  }, [isOpen, initialEmail]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setStatusMessage({
        text: 'Por favor, informe um endereço de e-mail válido.',
        type: 'error',
      });
      return;
    }

    setIsSubmitting(true);
    setStatusMessage({ text: '', type: '' });

    try {
      await onSendReset(cleanEmail);
      setStatusMessage({
        text: 'Se este e-mail estiver cadastrado, você receberá o link de recuperação em instantes.',
        type: 'success',
      });
    } catch (err) {
      console.error('Falha na recuperação de senha:', err);
      // Resposta neutra para segurança mesmo em caso de erro específico
      setStatusMessage({
        text: 'Se este e-mail estiver cadastrado, você receberá o link de recuperação em instantes.',
        type: 'success',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Recuperar Senha"
      maxWidth="max-w-md"
      footer={
        <>
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Fechar
          </Button>
          <Button
            variant="primary"
            type="submit"
            form="password-reset-form"
            isLoading={isSubmitting}
            disabled={isSubmitting}
          >
            Enviar Link
          </Button>
        </>
      }
    >
      <form id="password-reset-form" onSubmit={handleSubmit} className="space-y-4">
        <p className="text-xs text-[var(--fc-text-secondary)] leading-relaxed">
          Informe o endereço de e-mail da sua conta. Enviaremos um link seguro para você redefinir sua senha de acesso.
        </p>

        <TextField
          id="reset-password-email"
          label="E-mail Cadastrado"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="seu@email.com"
          autoComplete="email"
          required
          disabled={isSubmitting}
          error={statusMessage.type === 'error' ? statusMessage.text : undefined}
        />

        {statusMessage.type === 'success' && (
          <div
            role="status"
            className="p-3.5 rounded-xl bg-[var(--fc-surface-2)] border border-[var(--fc-border-default)] text-xs text-[var(--fc-text-primary)] leading-relaxed"
          >
            <p className="font-semibold text-[var(--fc-accent)] mb-0.5">Solicitação processada</p>
            <p>{statusMessage.text}</p>
          </div>
        )}
      </form>
    </Modal>
  );
}
