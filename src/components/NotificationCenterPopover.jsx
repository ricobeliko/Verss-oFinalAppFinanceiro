// src/components/NotificationCenterPopover.jsx
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { useLoans } from '../hooks/useLoans';
import { useExpenses } from '../hooks/useExpenses';
import { useSubscriptions } from '../hooks/useSubscriptions';
import { useCards } from '../hooks/useCards';
import { useClients } from '../hooks/useClients';
import { generateFinancialAlerts } from '../services/financialService';

/**
 * Central Interna de Notificações e Alertas Financeiros.
 * Renderizada na barra superior global do FinControl.
 * Opera 100% em memória, reutilizando o motor determinístico generateFinancialAlerts.
 * Gerencia dispensas (dismiss) de forma isolada por usuário em localStorage.
 */
export default function NotificationCenterPopover() {
    const { currentUser } = useAppContext();
    const { loans } = useLoans();
    const { expenses } = useExpenses();
    const { subscriptions } = useSubscriptions();
    const { cards } = useCards();
    const { clients } = useClients();

    const [isOpen, setIsOpen] = useState(false);
    const popoverRef = useRef(null);

    const storageKey = useMemo(() => {
        const uid = currentUser?.uid || 'anonymous';
        return `fincontrol:dismissed-alerts:${uid}`;
    }, [currentUser?.uid]);

    const [dismissedIds, setDismissedIds] = useState(() => {
        try {
            const raw = localStorage.getItem(storageKey);
            if (!raw) return [];
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed.map(item => item.id) : [];
        } catch {
            return [];
        }
    });

    // Atualiza dismissedIds ao trocar de usuário
    useEffect(() => {
        try {
            const raw = localStorage.getItem(storageKey);
            if (!raw) {
                setDismissedIds([]);
            } else {
                const parsed = JSON.parse(raw);
                setDismissedIds(Array.isArray(parsed) ? parsed.map(item => item.id) : []);
            }
        } catch {
            setDismissedIds([]);
        }
    }, [storageKey]);

    // Data de hoje e mês selecionado
    const todayStr = useMemo(() => {
        const now = new Date();
        const y = now.getUTCFullYear();
        const m = String(now.getUTCMonth() + 1).padStart(2, '0');
        const d = String(now.getUTCDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }, []);

    const currentMonth = todayStr.slice(0, 7);

    // Alertas derivados em memória
    const rawAlerts = useMemo(() => {
        return generateFinancialAlerts({
            selectedMonth: currentMonth,
            loans: loans || [],
            expenses: expenses || [],
            subscriptions: subscriptions || [],
            cards: cards || [],
            clients: clients || [],
            todayStr,
            maxAlerts: 6
        });
    }, [currentMonth, loans, expenses, subscriptions, cards, clients, todayStr]);

    // Filtra alertas que já foram dispensados
    const activeAlerts = useMemo(() => {
        return rawAlerts.filter(alert => !dismissedIds.includes(alert.id));
    }, [rawAlerts, dismissedIds]);

    const handleDismiss = (alertId) => {
        const updated = [...dismissedIds, alertId];
        setDismissedIds(updated);
        try {
            const payload = updated.map(id => ({ id, dismissedAt: new Date().toISOString() }));
            localStorage.setItem(storageKey, JSON.stringify(payload));
        } catch {
            // Silencioso em caso de restrição do navegador
        }
    };

    const handleDismissAll = () => {
        const allIds = Array.from(new Set([...dismissedIds, ...rawAlerts.map(a => a.id)]));
        setDismissedIds(allIds);
        try {
            const payload = allIds.map(id => ({ id, dismissedAt: new Date().toISOString() }));
            localStorage.setItem(storageKey, JSON.stringify(payload));
        } catch {
            // Silencioso
        }
    };

    // Fechar ao clicar fora ou pressionar Escape
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (popoverRef.current && !popoverRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') setIsOpen(false);
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('keydown', handleKeyDown);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen]);

    const getSeverityStyles = (severity) => {
        switch (severity) {
            case 'danger':
                return 'border-rose-500/30 bg-rose-500/10 text-rose-300';
            case 'warning':
                return 'border-amber-500/30 bg-amber-500/10 text-amber-300';
            case 'success':
                return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
            default:
                return 'border-blue-500/30 bg-blue-500/10 text-blue-300';
        }
    };

    return (
        <div className="relative" ref={popoverRef}>
            <button
                type="button"
                onClick={() => setIsOpen(prev => !prev)}
                aria-label={`Central de Alertas: ${activeAlerts.length} pendentes`}
                aria-expanded={isOpen}
                aria-haspopup="dialog"
                className="relative p-2 rounded-xl bg-carbon-800 text-gray-300 hover:text-gold border border-carbon-700 hover:border-gold/40 transition cursor-pointer"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                </svg>

                {activeAlerts.length > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-gold text-[10px] font-bold text-carbon-900 shadow-md">
                        {activeAlerts.length}
                    </span>
                )}
            </button>

            {isOpen && (
                <div
                    role="dialog"
                    aria-label="Notificações e Alertas Financeiros"
                    className="absolute right-0 mt-2 w-80 sm:w-96 rounded-3xl bg-carbon-900 border border-carbon-800 shadow-2xl p-4 z-50 animate-fadeIn space-y-3"
                >
                    <div className="flex items-center justify-between border-b border-carbon-800 pb-2">
                        <div className="flex items-center gap-2">
                            <span className="text-gold font-bold text-sm">Central de Alertas</span>
                            <span className="px-2 py-0.5 rounded-full bg-carbon-800 text-[10px] font-semibold text-gray-400">
                                {activeAlerts.length} ativos
                            </span>
                        </div>
                        {activeAlerts.length > 0 && (
                            <button
                                type="button"
                                onClick={handleDismissAll}
                                className="text-[11px] text-gray-400 hover:text-gold transition cursor-pointer"
                            >
                                Limpar todos
                            </button>
                        )}
                    </div>

                    <div className="max-h-72 overflow-y-auto space-y-2.5 pr-1">
                        {activeAlerts.length === 0 ? (
                            <div className="py-6 text-center text-gray-400 text-xs">
                                <span className="text-xl block mb-1">✨</span>
                                Tudo em dia! Nenhum alerta pendente no momento.
                            </div>
                        ) : (
                            activeAlerts.map(alert => (
                                <div
                                    key={alert.id}
                                    className={`p-3 rounded-2xl border flex items-start justify-between gap-3 text-xs ${getSeverityStyles(alert.severity)}`}
                                >
                                    <div className="flex items-start gap-2.5">
                                        <span className="text-base flex-shrink-0 mt-0.5">{alert.icon}</span>
                                        <div>
                                            <p className="font-bold text-gray-200">{alert.title}</p>
                                            <p className="text-gray-400 text-[11px] mt-0.5">{alert.message}</p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => handleDismiss(alert.id)}
                                        aria-label={`Dispensar alerta ${alert.title}`}
                                        className="text-gray-500 hover:text-gray-200 p-1 rounded-lg hover:bg-carbon-800 transition cursor-pointer"
                                    >
                                        ✕
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
