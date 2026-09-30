// src/features/crisis/CrisisMode.jsx

import React, { useMemo } from 'react';
import { formatCurrencyDisplay } from '../../utils/currency';
import Spinner from '../../components/Spinner';
import { useLoans } from '../../hooks/useLoans';
import { useExpenses } from '../../hooks/useExpenses';
import { useSubscriptions } from '../../hooks/useSubscriptions';
import { useCards } from '../../hooks/useCards';

export default function CrisisMode({ selectedMonth }) {
    const { loans, loading: loadingLoans } = useLoans();
    const { expenses, loading: loadingExpenses } = useExpenses();
    const { subscriptions, loading: loadingSubs } = useSubscriptions();
    const { cards, loading: loadingCards } = useCards();

    const isLoading = loadingLoans || loadingExpenses || loadingSubs || loadingCards;

    // Auditoria Cirúrgica e Esmiuçada
    const auditData = useMemo(() => {
        if (!selectedMonth) return { totalSum: 0, subsList: [], installmentList: [], expenseList: [] };

        const [filterYear, filterMonth] = selectedMonth.split('-').map(Number);

        // 1. Assinaturas Ativas
        const activeSubs = subscriptions.filter(s => s.isActive);
        const subsList = activeSubs.map(sub => {
            const cardObj = cards.find(c => c.id === sub.cardId);
            return {
                name: sub.name,
                value: Number(sub.amount || sub.value || 0),
                cardName: cardObj ? cardObj.name : 'Cartão Principal'
            };
        });
        const totalSubsVal = subsList.reduce((acc, s) => acc + s.value, 0);

        // 2. Parcelas do Mês (Empréstimos / Compras Parceladas)
        let installmentList = [];
        let totalInstallmentsVal = 0;

        loans.forEach(loan => {
            const cardObj = cards.find(c => c.id === loan.cardId);
            const processInst = (instList) => {
                if (!Array.isArray(instList)) return;
                instList.forEach(inst => {
                    const d = new Date(inst.dueDate + 'T00:00:00Z');
                    if (d.getUTCFullYear() === filterYear && d.getUTCMonth() === filterMonth - 1) {
                        const val = Number(inst.value || 0);
                        totalInstallmentsVal += val;
                        installmentList.push({
                            description: loan.description || 'Compra Parcelada',
                            number: `${inst.number}/${loan.installmentsCount || inst.installmentsCount || '?'}`,
                            value: val,
                            cardName: cardObj ? cardObj.name : 'Cartão Principal'
                        });
                    }
                });
            };

            if (loan.isShared && loan.sharedDetails) {
                if (loan.sharedDetails.person1) processInst(loan.sharedDetails.person1.installments);
                if (loan.sharedDetails.person2) processInst(loan.sharedDetails.person2.installments);
            } else {
                processInst(loan.installments);
            }
        });

        // 3. Despesas Avulsas do Mês
        const monthExpenses = expenses.filter(exp => {
            if (!exp.date) return false;
            const dateStr = typeof exp.date === 'string' ? exp.date : (exp.date?.toDate ? exp.date.toDate().toISOString().substring(0, 10) : (exp.date instanceof Date ? exp.date.toISOString().substring(0, 10) : ''));
            return dateStr.startsWith(selectedMonth);
        });

        const expenseList = monthExpenses.map(exp => {
            const cardObj = cards.find(c => c.id === exp.cardId);
            return {
                description: exp.description || exp.category || 'Despesa Avulsa',
                value: Number(exp.value || 0),
                category: exp.category || 'Geral',
                cardName: cardObj ? cardObj.name : 'Conta / Dinheiro'
            };
        });
        const totalExpensesVal = expenseList.reduce((acc, e) => acc + e.value, 0);

        const totalSum = totalSubsVal + totalInstallmentsVal + totalExpensesVal;

        return {
            totalSum,
            totalSubsVal,
            totalInstallmentsVal,
            totalExpensesVal,
            subsList,
            installmentList,
            expenseList
        };
    }, [loans, expenses, subscriptions, cards, selectedMonth]);

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-96 bg-[var(--fc-surface-1)] border border-[var(--fc-border-default)] rounded-3xl shadow-xl">
                <Spinner />
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fadeIn">
            {/* Header de Auditoria */}
            <div className="bg-[var(--fc-surface-1)] border border-[var(--fc-border-default)] p-6 sm:p-8 rounded-3xl shadow-xl backdrop-blur-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--fc-accent)]/10 text-[var(--fc-accent)] border border-[var(--fc-accent)]/20 text-xs font-bold mb-3">
                        ⚡ AUDITORIA CIRÚRGICA DE CONTAS
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-[var(--fc-text-primary)]">
                        Modo Crise & Raio-X Financeiro
                    </h2>
                    <p className="text-sm text-[var(--fc-text-secondary)] mt-1">
                        Esmiuçando cada centavo do período de <span className="text-[var(--fc-accent)] font-semibold">{selectedMonth}</span> para corte e alívio de caixa.
                    </p>
                </div>
                <div className="bg-[var(--fc-surface-2)] border border-[var(--fc-border-subtle)] px-6 py-4 rounded-2xl text-right shadow-sm">
                    <span className="text-xs text-[var(--fc-text-secondary)] block uppercase tracking-wider">Total Comprometido</span>
                    <span className="text-2xl font-black font-mono text-[var(--fc-accent)]">
                        {formatCurrencyDisplay(auditData.totalSum)}
                    </span>
                </div>
            </div>

            {/* Grid Principal Esmiuçado (3 Cards de Detalhamento) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* 1. Raio-X de Assinaturas */}
                <div className="bg-[var(--fc-surface-1)] border border-[var(--fc-border-default)] rounded-3xl p-6 shadow-xl flex flex-col justify-between">
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <span className="text-xs font-bold tracking-widest uppercase bg-[var(--fc-accent)]/10 text-[var(--fc-accent)] border border-[var(--fc-accent)]/20 px-3 py-1 rounded-full">
                                RECORRÊNCIAS
                            </span>
                            <span className="font-mono font-black text-lg text-[var(--fc-accent)]">{formatCurrencyDisplay(auditData.totalSubsVal)}</span>
                        </div>
                        <h3 className="text-base font-black tracking-tight text-[var(--fc-text-primary)] mb-3">
                            💡 Onde Cortar: Assinaturas
                        </h3>
                        
                        {auditData.subsList.length > 0 ? (
                            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                {auditData.subsList.map((sub, idx) => (
                                    <div key={idx} className="bg-[var(--fc-surface-2)] border border-[var(--fc-border-subtle)] p-2.5 rounded-2xl flex justify-between items-center text-xs">
                                        <div>
                                            <span className="font-bold text-[var(--fc-text-primary)] block">{sub.name}</span>
                                            <span className="text-[10px] text-[var(--fc-text-secondary)]">Saída: {sub.cardName}</span>
                                        </div>
                                        <span className="font-mono font-bold text-rose-600 dark:text-rose-400">{formatCurrencyDisplay(sub.value)}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs font-medium text-[var(--fc-text-secondary)]">Nenhuma assinatura ativa registrada.</p>
                        )}
                    </div>
                    <div className="mt-4 pt-3 border-t border-[var(--fc-border-subtle)] text-[11px] font-bold text-[var(--fc-text-secondary)] flex justify-between">
                        <span>Ação sugerida:</span>
                        <span className="text-[var(--fc-accent)]">Pausar serviços não essenciais</span>
                    </div>
                </div>

                {/* 2. Raio-X de Parcelas do Cartão */}
                <div className="bg-[var(--fc-surface-1)] border border-[var(--fc-border-default)] rounded-3xl p-6 shadow-xl flex flex-col justify-between">
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <span className="text-xs font-bold tracking-widest uppercase bg-[var(--fc-accent)]/10 text-[var(--fc-accent)] px-3 py-1 rounded-full border border-[var(--fc-accent)]/20">
                                CARTÃO DE CRÉDITO
                            </span>
                            <span className="font-mono font-black text-lg text-[var(--fc-accent)]">{formatCurrencyDisplay(auditData.totalInstallmentsVal)}</span>
                        </div>
                        <h3 className="text-base font-black tracking-tight text-[var(--fc-text-primary)] mb-3">
                            💳 Parcelas Caindo na Fatura
                        </h3>

                        {auditData.installmentList.length > 0 ? (
                            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                {auditData.installmentList.map((inst, idx) => (
                                    <div key={idx} className="bg-[var(--fc-surface-2)] border border-[var(--fc-border-subtle)] p-2.5 rounded-2xl flex justify-between items-center text-xs">
                                        <div className="pr-2 truncate">
                                            <span className="font-bold text-[var(--fc-text-primary)] block truncate">{inst.description}</span>
                                            <span className="text-[10px] text-[var(--fc-text-secondary)]">Parcela {inst.number} ({inst.cardName})</span>
                                        </div>
                                        <span className="font-mono font-bold text-amber-600 dark:text-amber-400 whitespace-nowrap">{formatCurrencyDisplay(inst.value)}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs text-[var(--fc-text-secondary)]">Nenhuma parcela ativa para este mês.</p>
                        )}
                    </div>
                    <div className="mt-4 pt-3 border-t border-[var(--fc-border-subtle)] text-[11px] font-semibold text-[var(--fc-text-secondary)] flex justify-between">
                        <span>Alerta:</span>
                        <span className="text-amber-600 dark:text-amber-400">Evitar novos parcelamentos</span>
                    </div>
                </div>

                {/* 3. Raio-X de Despesas Avulsas */}
                <div className="bg-[var(--fc-surface-1)] border border-[var(--fc-border-default)] rounded-3xl p-6 shadow-xl flex flex-col justify-between">
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <span className="text-xs font-bold tracking-widest uppercase bg-rose-500/10 text-rose-600 dark:text-rose-400 px-3 py-1 rounded-full border border-rose-500/20">
                                GASTOS AVULSOS
                            </span>
                            <span className="font-mono font-black text-lg text-rose-600 dark:text-rose-400">{formatCurrencyDisplay(auditData.totalExpensesVal)}</span>
                        </div>
                        <h3 className="text-base font-black tracking-tight text-[var(--fc-text-primary)] mb-3">
                            🔍 Despesas do Período
                        </h3>

                        {auditData.expenseList.length > 0 ? (
                            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                {auditData.expenseList.map((exp, idx) => (
                                    <div key={idx} className="bg-[var(--fc-surface-2)] border border-[var(--fc-border-subtle)] p-2.5 rounded-2xl flex justify-between items-center text-xs">
                                        <div className="pr-2 truncate">
                                            <span className="font-bold text-[var(--fc-text-primary)] block truncate">{exp.description}</span>
                                            <span className="text-[10px] text-[var(--fc-text-secondary)]">Categoria: {exp.category}</span>
                                        </div>
                                        <span className="font-mono font-bold text-rose-600 dark:text-rose-400 whitespace-nowrap">{formatCurrencyDisplay(exp.value)}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs text-[var(--fc-text-secondary)]">Nenhuma despesa avulsa registrada no mês.</p>
                        )}
                    </div>
                    <div className="mt-4 pt-3 border-t border-[var(--fc-border-subtle)] text-[11px] font-semibold text-[var(--fc-text-secondary)] flex justify-between">
                        <span>Meta de Redução:</span>
                        <span className="text-emerald-600 dark:text-emerald-400">-15% até o fechamento</span>
                    </div>
                </div>

            </div>
        </div>
    );
}