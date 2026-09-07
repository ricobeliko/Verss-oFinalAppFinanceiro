// src/features/auth/components/EmailVerificationView.jsx
import React, { useEffect, useState } from 'react';
import { FiMail, FiArrowLeft } from 'react-icons/fi';
import Surface from '../../../design-system/primitives/Surface';
import Button from '../../../design-system/primitives/Button';

/**
 * Visualização de Confirmação de E-mail pós-cadastro no padrão DS2.
 * Possui ação explícita manual para retornar ao login sem depender
 * unicamente do cronômetro regressivo.
 */
export default function EmailVerificationView({
  email,
  onBackToLogin,
}) {
  const [countdown, setCountdown] = useState(10);

  useEffect(() => {
    if (countdown <= 0) {
      onBackToLogin();
      return;
    }
    const timer = setTimeout(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [countdown, onBackToLogin]);

  return (
    <div className="w-full max-w-md mx-auto">
      <Surface variant="elevated" className="text-center p-6 sm:p-8 space-y-6">
        {/* Ícone de Destaque */}
        <div className="w-14 h-14 rounded-2xl bg-[var(--fc-accent-soft)] border border-[var(--fc-accent)]/20 text-[var(--fc-accent)] flex items-center justify-center mx-auto shadow-sm">
          <FiMail className="w-7 h-7" aria-hidden="true" />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight text-[var(--fc-text-primary)]">
            Confirme seu E-mail
          </h2>
          <p className="text-sm text-[var(--fc-text-secondary)] leading-relaxed">
            {email ? (
              <>
                Enviamos um link de confirmação para:{' '}
                <strong className="text-[var(--fc-accent)] font-semibold block sm:inline break-all">
                  {email}
                </strong>
              </>
            ) : (
              'Enviamos um link de confirmação para o seu e-mail.'
            )}
          </p>
          <p className="text-xs text-[var(--fc-text-muted)] leading-relaxed pt-1">
            Abra o e-mail e clique no link de ativação para liberar seu acesso ao FinControl.
          </p>
        </div>

        {/* Informação e Ação Explícita */}
        <div className="pt-2 border-t border-[var(--fc-border-subtle)] space-y-4">
          <p className="text-xs text-[var(--fc-text-muted)]">
            Redirecionando automaticamente em{' '}
            <span className="font-mono font-bold text-[var(--fc-text-primary)] tabular-nums">
              {countdown}s
            </span>
          </p>

          <Button
            variant="primary"
            onClick={onBackToLogin}
            icon={<FiArrowLeft className="w-4 h-4" />}
            className="w-full"
          >
            Voltar para entrar
          </Button>
        </div>
      </Surface>
    </div>
  );
}
