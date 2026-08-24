// src/components/FinancialAlertsBanner.jsx
import React from 'react';

/**
 * Banner de Alertas Financeiros Internos do FinControl.
 * 
 * @param {Object} props
 * @param {Array<Object>} props.alerts - Lista de alertas gerados pelo motor determinístico
 */
export default function FinancialAlertsBanner({ alerts = [] }) {
    if (!alerts || alerts.length === 0) return null;

    const iconMap = {
        card_due: '⏰',
        receivables_pending: '👥',
        high_limit: '⚠️',
        subscription_due: '🔁',
        final_installment: '🎉'
    };

    const levelStyles = {
        important: 'bg-amber-500/10 border-amber-500/30 text-amber-200',
        attention: 'bg-gold/10 border-gold/30 text-gold-cream',
        info: 'bg-blue-500/10 border-blue-500/30 text-blue-200',
        positive: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
    };

    return (
        <div className="space-y-2 animate-fadeIn" role="region" aria-label="Alertas financeiros">
            {alerts.map((alert) => (
                <div
                    key={alert.id}
                    className={`px-4 py-3 rounded-2xl border flex items-start sm:items-center justify-between gap-3 text-xs sm:text-sm font-medium ${
                        levelStyles[alert.level] || 'bg-carbon-800 border-carbon-700 text-gray-300'
                    }`}
                >
                    <div className="flex items-start sm:items-center gap-3">
                        <span className="text-base flex-shrink-0 mt-0.5 sm:mt-0">
                            {iconMap[alert.type] || '🔔'}
                        </span>
                        <div>
                            <strong className="font-bold mr-1.5">{alert.title}:</strong>
                            <span className="opacity-90">{alert.message}</span>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
