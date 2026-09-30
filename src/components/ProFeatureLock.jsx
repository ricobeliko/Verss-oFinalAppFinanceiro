// src/components/ProFeatureLock.jsx
import React from 'react';
import Badge from '../design-system/primitives/Badge';
import { useAppContext } from '../context/AppContext';

/**
 * Componente consistente e discreto de bloqueio de recurso Pro.
 * Exibe surface semântica suave, badge Pro, texto curto e ação contextual.
 */
export default function ProFeatureLock({
    title = 'Recurso Pro',
    description = 'Disponível no plano Pro ou durante o período de teste de 30 dias.',
    onAction,
    compact = false,
    className = '',
}) {
    const { userProfile, isTrialActive } = useAppContext();
    const hasUsedTrial = Boolean(userProfile?.trialExpiresAt);
    const isEligibleForTrial = !hasUsedTrial && !isTrialActive;

    const actionText = isEligibleForTrial ? 'Testar Pro por 30 dias' : 'Conhecer Pro';

    return (
        <div
            className={`${compact ? 'p-3.5' : 'p-5'} rounded-3xl bg-[var(--fc-surface-1)] border border-[var(--fc-border-default)] shadow-[var(--fc-shadow-sm)] flex flex-col justify-between space-y-3 text-center sm:text-left sm:flex-row sm:items-center sm:space-y-0 gap-4 ${className}`}
        >
            <div className="flex items-start sm:items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[var(--fc-accent-soft)] text-[var(--fc-accent)] flex items-center justify-center font-bold text-base border border-[var(--fc-accent)]/20 flex-shrink-0">
                    🔒
                </div>
                <div>
                    <div className="flex items-center gap-2 justify-center sm:justify-start">
                        <h4 className="text-sm font-bold text-[var(--fc-text-primary)] tracking-tight">
                            {title}
                        </h4>
                        <Badge variant="accent">Pro</Badge>
                    </div>
                    <p className="text-xs text-[var(--fc-text-secondary)] mt-0.5">
                        {description}
                    </p>
                </div>
            </div>

            {onAction && (
                <button
                    type="button"
                    onClick={onAction}
                    className="flex-shrink-0 px-4 py-2 rounded-xl text-xs font-bold bg-[var(--fc-accent)] hover:bg-[var(--fc-accent-hover)] text-[var(--fc-accent-contrast)] shadow-md transition cursor-pointer self-center sm:self-auto"
                >
                    {actionText}
                </button>
            )}
        </div>
    );
}
