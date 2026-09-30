// src/components/GlobalSearchModal.jsx
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { performGlobalSearch } from '../services/searchService';
import { formatCurrencyDisplay } from '../utils/currency';
import { useLoans } from '../hooks/useLoans';
import { useExpenses } from '../hooks/useExpenses';
import { useSubscriptions } from '../hooks/useSubscriptions';
import { useClients } from '../hooks/useClients';
import { useCards } from '../hooks/useCards';
import { useIncomes } from '../hooks/useIncomes';

export default function GlobalSearchModal({ isOpen, onClose }) {
    const [searchTerm, setSearchTerm] = useState('');
    const inputRef = useRef(null);

    const { loans } = useLoans();
    const { expenses } = useExpenses();
    const { subscriptions } = useSubscriptions();
    const { clients } = useClients();
    const { cards } = useCards();
    const { incomes } = useIncomes();

    useEffect(() => {
        if (isOpen) {
            setSearchTerm('');
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [isOpen]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    const searchResults = useMemo(() => {
        return performGlobalSearch({
            query: searchTerm,
            loans,
            expenses,
            subscriptions,
            clients,
            incomes,
            cards
        });
    }, [searchTerm, loans, expenses, subscriptions, clients, incomes, cards]);

    if (!isOpen) return null;

    const { totalMatches, results } = searchResults;

    const sections = [
        { key: 'loans', label: 'Compras Parceladas', items: results.loans, icon: '🛍️' },
        { key: 'expenses', label: 'Despesas Avulsas', items: results.expenses, icon: '💸' },
        { key: 'subscriptions', label: 'Assinaturas Fixas', items: results.subscriptions, icon: '🔁' },
        { key: 'clients', label: 'Pessoas & Contatos', items: results.clients, icon: '👥' },
        { key: 'incomes', label: 'Receitas', items: results.incomes, icon: '💰' }
    ].filter(sec => sec.items.length > 0);

    return (
        <div 
            className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 p-4 bg-black/80 backdrop-blur-md animate-fadeIn"
            role="dialog"
            aria-modal="true"
            aria-label="Busca global de lançamentos"
        >
            <div className="bg-[var(--fc-surface-1)] border border-[var(--fc-border-default)] w-full max-w-2xl rounded-3xl shadow-[var(--fc-shadow-lg)] overflow-hidden flex flex-col max-h-[80vh]">
                {/* Search Bar Input */}
                <div className="p-4 sm:p-5 border-b border-[var(--fc-border-subtle)] flex items-center gap-3 bg-[var(--fc-surface-2)]">
                    <span className="text-xl text-[var(--fc-accent)]" aria-hidden="true">🔎</span>
                    <input
                        ref={inputRef}
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Buscar compra, pessoa, assinatura, despesa..."
                        aria-label="Termo de busca"
                        className="w-full bg-transparent text-[var(--fc-text-primary)] placeholder-[var(--fc-text-muted)] text-base sm:text-lg font-medium focus:outline-none"
                    />
                    {searchTerm && (
                        <button
                            type="button"
                            onClick={() => setSearchTerm('')}
                            className="text-xs text-[var(--fc-text-muted)] hover:text-[var(--fc-text-primary)] transition p-1 focus:outline-none focus:ring-1 focus:ring-[var(--fc-focus-ring)]"
                            aria-label="Limpar busca"
                        >
                            <span aria-hidden="true">✕</span>
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Fechar busca global"
                        className="text-xs font-semibold px-2.5 py-1 rounded-xl bg-[var(--fc-surface-3)] text-[var(--fc-text-secondary)] border border-[var(--fc-border-subtle)] hover:text-[var(--fc-text-primary)] transition cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--fc-focus-ring)]"
                    >
                        ESC
                    </button>
                </div>

                {/* Resultados */}
                <div className="overflow-y-auto p-4 sm:p-6 space-y-6">
                    {!searchTerm.trim() ? (
                        <div className="text-center py-12 text-[var(--fc-text-muted)] text-sm space-y-2">
                            <p>Digite para buscar em compras, despesas, assinaturas e pessoas.</p>
                            <p className="text-xs text-[var(--fc-text-muted)] opacity-80">Dica: Ignora acentos e maiúsculas (ex: "farmacia", "joao").</p>
                        </div>
                    ) : totalMatches === 0 ? (
                        <div className="text-center py-12 text-[var(--fc-text-muted)] text-sm">
                            Nenhum resultado encontrado para <span className="text-[var(--fc-accent)] font-semibold">"{searchTerm}"</span>.
                        </div>
                    ) : (
                        sections.map(section => (
                            <div key={section.key} className="space-y-2">
                                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--fc-accent)]">
                                    <span>{section.icon}</span>
                                    <span>{section.label} ({section.items.length})</span>
                                </div>
                                <div className="divide-y divide-[var(--fc-border-subtle)] bg-[var(--fc-surface-2)] border border-[var(--fc-border-subtle)] rounded-2xl overflow-hidden">
                                    {section.items.map(item => (
                                        <div key={item.id} className="p-3.5 flex items-center justify-between hover:bg-[var(--fc-surface-3)] transition">
                                            <div className="pr-3 truncate">
                                                <p className="text-sm font-semibold text-[var(--fc-text-primary)] truncate">{item.title}</p>
                                                <p className="text-xs text-[var(--fc-text-secondary)] truncate">{item.subtitle}</p>
                                            </div>
                                            {item.value !== null && item.value !== undefined && (
                                                <span className="text-sm font-mono font-bold text-[var(--fc-accent)] whitespace-nowrap">
                                                    {formatCurrencyDisplay(item.value)}
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
