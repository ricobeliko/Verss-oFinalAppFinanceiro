// src/components/FinancialAlertsBanner.jsx
import React from 'react';

/**
 * Banner de Alertas Financeiros Internos do FinControl.
 * 
 * @param {Object} props
 * @param {Array<Object>} props.alerts - Lista de alertas gerados pelo motor determinístico
 */
export default function FinancialAlertsBanner({ alerts = [], onDismiss }) {
    if (!alerts || alerts.length === 0) return null;

    const iconMap = {
        card_due: '⏰',
        receivables_pending: '👥',
        high_limit: '⚠️',
        subscription_due: '🔁',
        final_installment: '🎉'
    };

    const levelStyles = {
        important: 'bg-[var(--fc-warning-soft)] border-[var(--fc-warning)]/30 text-[var(--fc-warning)]',
        attention: 'bg-[var(--fc-accent-soft)] border-[var(--fc-accent)]/30 text-[var(--fc-accent)]',
        info: 'bg-[var(--fc-info-soft)] border-[var(--fc-info)]/30 text-[var(--fc-info)]',
        positive: 'bg-[var(--fc-success-soft)] border-[var(--fc-success)]/30 text-[var(--fc-success)]'
    };

    return (
        <div className="space-y-2 animate-fadeIn" role="region" aria-label="Alertas financeiros">
            {alerts.map((alert) => (
                <div
                    key={alert.id}
                    className={`px-4 py-3 rounded-2xl border flex items-start sm:items-center justify-between gap-3 text-xs sm:text-sm font-medium ${
                        levelStyles[alert.level] || 'bg-[var(--fc-surface-2)] border-[var(--fc-border-subtle)] text-[var(--fc-text-secondary)]'
                    }`}
                >
                    <div className="flex items-start sm:items-center gap-3 flex-1 min-w-0">
                        <span className="text-base flex-shrink-0 mt-0.5 sm:mt-0" aria-hidden="true">
                            {iconMap[alert.type] || '🔔'}
                        </span>
                        <div className="min-w-0">
                            <strong className="font-bold mr-1.5 text-[var(--fc-text-primary)]">{alert.title}:</strong>
                            <span className="opacity-90 text-[var(--fc-text-secondary)]">{alert.message}</span>
                        </div>
                    </div>
                    {onDismiss && (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                onDismiss(alert.id);
                            }}
                            aria-label={`Dispensar alerta ${alert.title}`}
                            title="Dispensar alerta"
                            className="p-1 rounded-lg text-[var(--fc-text-muted)] hover:text-[var(--fc-text-primary)] hover:bg-[var(--fc-surface-1)] transition cursor-pointer flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-[var(--fc-focus-ring)]"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    )}
                </div>
            ))}
        </div>
    );
}
