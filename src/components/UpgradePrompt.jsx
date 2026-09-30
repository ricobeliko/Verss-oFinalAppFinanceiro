// src/components/UpgradePrompt.jsx

import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { Badge } from '../design-system';

export default function UpgradePrompt({
  onUpgradeClick,
  onActivateTrial,
  isLoading = false,
  className = '',
}) {
  const { userProfile, isPro, isTrialActive, activateFreeTrial } = useAppContext();
  const [isTrialLoading, setIsTrialLoading] = useState(false);

  // Regra canônica de elegibilidade: se já possui trialExpiresAt, não pode ativar novo trial
  const isTrialUsed = Boolean(userProfile?.trialExpiresAt);
  const isEligibleForTrial = !isTrialUsed && !isPro && !isTrialActive;

  const handleTrialClick = async () => {
    setIsTrialLoading(true);
    try {
      if (typeof onActivateTrial === 'function') {
        await onActivateTrial();
      } else if (typeof activateFreeTrial === 'function') {
        await activateFreeTrial();
      }
    } finally {
      setIsTrialLoading(false);
    }
  };

  return (
    <div
      className={`p-6 sm:p-7 bg-[var(--fc-surface-1)] border border-[var(--fc-border-default)] rounded-3xl shadow-[var(--fc-shadow-lg)] space-y-5 text-left ${className}`}
    >
      {/* Cabeçalho */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Badge variant="accent">FinControl Pro</Badge>
          {isTrialActive && (
            <Badge variant="neutral">Teste Pro ativo</Badge>
          )}
        </div>
        <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--fc-text-primary)]">
          Conheça o FinControl Pro
        </h3>
        <p className="text-xs sm:text-sm text-[var(--fc-text-secondary)] leading-relaxed">
          Recursos avançados para análise completa e gestão cirúrgica do seu orçamento.
        </p>
      </div>

      {/* Matriz Canônica de Benefícios Pro */}
      <div className="p-3.5 rounded-2xl bg-[var(--fc-surface-2)] border border-[var(--fc-border-subtle)] space-y-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--fc-text-secondary)] block">
          Recursos inclusos no Pro:
        </span>
        <ul className="space-y-1.5 text-xs text-[var(--fc-text-primary)]">
          <li className="flex items-center gap-2">
            <span className="text-[var(--fc-accent)] font-bold">✓</span>
            <span>Receitas e balanço mensal</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="text-[var(--fc-accent)] font-bold">✓</span>
            <span>Despesas avulsas por categoria</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="text-[var(--fc-accent)] font-bold">✓</span>
            <span>Gráficos por pessoa e categoria</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="text-[var(--fc-accent)] font-bold">✓</span>
            <span>Modo Crise para auditoria de gastos</span>
          </li>
        </ul>
      </div>

      {/* Opções de Upgrade conforme Elegibilidade */}
      {isEligibleForTrial ? (
        <div className="space-y-3 pt-1">
          {/* Opção 1: Degustação Pro de 30 dias (CTA Primário) */}
          <div className="p-4 rounded-2xl bg-[var(--fc-surface-2)] border border-[var(--fc-accent)]/30 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--fc-accent)]">
                Teste gratuito
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-[var(--fc-accent-soft)] text-[var(--fc-accent)] border border-[var(--fc-accent)]/20">
                30 dias grátis
              </span>
            </div>
            <p className="text-xs text-[var(--fc-text-secondary)] leading-snug">
              Teste o FinControl Pro por 30 dias grátis. Sem cartão de crédito. Sem cobrança automática. Depois dos 30 dias, você continua usando o plano Free.
            </p>
            <button
              type="button"
              onClick={handleTrialClick}
              disabled={isTrialLoading || isLoading}
              className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-[var(--fc-accent)] hover:bg-[var(--fc-accent-hover)] text-[var(--fc-accent-contrast)] font-bold text-xs tracking-wide transition shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-wait flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--fc-focus-ring)]"
            >
              {isTrialLoading ? 'Ativando teste...' : 'Testar Pro por 30 dias'}
            </button>
          </div>

          {/* Opção 2: Compra Direta (CTA Secundário) */}
          <div className="p-4 rounded-2xl bg-[var(--fc-surface-2)] border border-[var(--fc-border-subtle)] space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--fc-text-primary)]">
                Acesso vitalício
              </span>
              <span className="text-sm font-black font-mono text-[var(--fc-text-primary)]">
                R$ 29,99
              </span>
            </div>
            <p className="text-[11px] text-[var(--fc-text-secondary)]">
              Pagamento único. Acesso vitalício.
            </p>
            <button
              type="button"
              onClick={onUpgradeClick}
              disabled={isLoading || isTrialLoading}
              className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-[var(--fc-surface-1)] hover:bg-[var(--fc-surface-3)] text-[var(--fc-text-primary)] border border-[var(--fc-border-default)] font-bold text-xs tracking-wide transition cursor-pointer disabled:opacity-50 disabled:cursor-wait flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--fc-focus-ring)]"
            >
              {isLoading ? 'Redirecionando...' : 'Comprar Pro por R$ 29,99'}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3 pt-1">
          {/* Mensagem discreta quando trial já foi usado */}
          {isTrialUsed && !isTrialActive && !isPro && (
            <div className="p-3 rounded-xl bg-[var(--fc-surface-2)] border border-[var(--fc-border-subtle)] text-[11px] text-[var(--fc-text-muted)]">
              Seu período de teste já foi utilizado.
            </div>
          )}

          {/* Opção de Compra Direta (CTA Primário quando não elegível a novo trial) */}
          <div className="p-4 rounded-2xl bg-[var(--fc-surface-2)] border border-[var(--fc-accent)]/30 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[var(--fc-text-primary)]">
                Acesso vitalício
              </span>
              <span className="text-sm font-black font-mono text-[var(--fc-text-primary)]">
                R$ 29,99
              </span>
            </div>
            <p className="text-[11px] text-[var(--fc-text-secondary)]">
              Pagamento único. Acesso vitalício.
            </p>
            <button
              type="button"
              onClick={onUpgradeClick}
              disabled={isLoading}
              className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-[var(--fc-accent)] hover:bg-[var(--fc-accent-hover)] text-[var(--fc-accent-contrast)] font-bold text-xs tracking-wide transition shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-wait flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--fc-focus-ring)]"
            >
              {isLoading ? 'Redirecionando...' : 'Comprar Pro por R$ 29,99'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}