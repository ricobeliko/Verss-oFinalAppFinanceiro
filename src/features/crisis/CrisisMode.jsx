// src/features/crisis/CrisisMode.jsx

import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { useAppContext } from '../../context/AppContext';
import { formatCurrencyDisplay } from '../../utils/currency';
import Spinner from '../../components/Spinner';

export default function CrisisMode({ selectedMonth }) {
    const { db, userId, isAuthReady, getUserCollectionPathSegments } = useAppContext();
    
    const [loans, setLoans] = useState([]);
    const [expenses, setExpenses] = useState([]);
    const [subscriptions, setSubscriptions] = useState([]);
    const [cards, setCards] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // Sincroniza dados do Firebase em tempo real
    useEffect(() => {
        if (!isAuthReady || !userId || !db) return;
        setIsLoading(true);

        const userCollectionPath = getUserCollectionPathSegments();
        const basePath = [...userCollectionPath, userId];

        const unsubLoans = onSnapshot(collection(db, ...basePath, 'loans'), (snap) => {
            setLoans(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        const unsubExpenses = onSnapshot(collection(db, ...basePath, 'expenses'), (snap) => {
            setExpenses(snap.docs.map(d => {
                const data = d.data();
                const dateValue = data.date?.toDate ? data.date.toDate().toISOString() : data.date;
                const convertedDate = dateValue ? new Date(String(dateValue).substring(0, 10) + 'T00:00:00Z') : null;
                return { id: d.id, ...data, date: convertedDate };
            }));
        });

        const unsubSubs = onSnapshot(collection(db, ...basePath, 'subscriptions'), (snap) => {
            setSubscriptions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        const unsubCards = onSnapshot(collection(db, ...basePath, 'cards'), (snap) => {
            setCards(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            setIsLoading(false);
        });

        return () => {
            unsubLoans();
            unsubExpenses();
            unsubSubs();
            unsubCards();
        };
    }, [db, userId, isAuthReady, getUserCollectionPathSegments]);

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
                            cardName: cardObj ? cardObj.name : 'Cartão Black'
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
            const expDate = exp.date;
            if (!(expDate instanceof Date) || isNaN(expDate)) return false;
            return expDate.getUTCFullYear() === filterYear && expDate.getUTCMonth() + 1 === filterMonth;
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
            <div className="flex justify-center items-center h-96 bg-carbon-900 border border-carbon-800 rounded-3xl shadow-2xl">
                <Spinner />
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fadeIn">
            {/* Header de Auditoria */}
            <div className="bg-gradient-to-r from-carbon-900 via-carbon-800 to-carbon-900 border border-gold/30 p-6 sm:p-8 rounded-3xl shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold/10 text-gold border border-gold/20 text-xs font-bold mb-3">
                        ⚡ AUDITORIA CIRÚRGICA DE CONTAS
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-gold-cream">
                        Modo Crise & Raio-X Financeiro
                    </h2>
                    <p className="text-sm text-gray-400 mt-1">
                        Esmiuçando cada centavo do período de <span className="text-gold font-semibold">{selectedMonth}</span> para corte e alívio de caixa.
                    </p>
                </div>
                <div className="bg-carbon-900 border border-carbon-700 px-6 py-4 rounded-2xl text-right shadow-inner">
                    <span className="text-xs text-gray-400 block uppercase tracking-wider">Total Comprometido</span>
                    <span className="text-2xl font-black font-mono text-gold">
                        {formatCurrencyDisplay(auditData.totalSum)}
                    </span>
                </div>
            </div>

            {/* Grid Principal Esmiuçado (3 Cards de Detalhamento) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* 1. Raio-X de Assinaturas */}
                <div className="bg-gradient-to-br from-[#FFF3D6] via-[#F6D365] to-[#F2B705] text-carbon-900 rounded-3xl p-6 shadow-xl flex flex-col justify-between">
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <span className="text-xs font-black tracking-widest uppercase bg-carbon-900/10 px-3 py-1 rounded-full">
                                RECORRÊNCIAS
                            </span>
                            <span className="font-mono font-black text-lg">{formatCurrencyDisplay(auditData.totalSubsVal)}</span>
                        </div>
                        <h3 className="text-base font-black tracking-tight text-carbon-900 mb-3">
                            💡 Onde Cortar: Assinaturas
                        </h3>
                        
                        {auditData.subsList.length > 0 ? (
                            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                {auditData.subsList.map((sub, idx) => (
                                    <div key={idx} className="bg-carbon-900/10 border border-carbon-900/10 p-2.5 rounded-2xl flex justify-between items-center text-xs">
                                        <div>
                                            <span className="font-bold block">{sub.name}</span>
                                            <span className="text-[10px] opacity-75">Saída: {sub.cardName}</span>
                                        </div>
                                        <span className="font-mono font-bold text-rose-900">{formatCurrencyDisplay(sub.value)}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs font-medium text-carbon-800">Nenhuma assinatura ativa registrada.</p>
                        )}
                    </div>
                    <div className="mt-4 pt-3 border-t border-carbon-900/15 text-[11px] font-bold text-carbon-900 flex justify-between">
                        <span>Ação sugerida:</span>
                        <span>Pausar 2 serviços = -R$ X</span>
                    </div>
                </div>

                {/* 2. Raio-X de Parcelas do Cartão */}
                <div className="bg-carbon-900 border border-carbon-800 text-gold-cream rounded-3xl p-6 shadow-xl flex flex-col justify-between">
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <span className="text-xs font-black tracking-widest uppercase bg-gold/10 text-gold px-3 py-1 rounded-full border border-gold/20">
                                CARTÃO DE CRÉDITO
                            </span>
                            <span className="font-mono font-black text-lg text-gold">{formatCurrencyDisplay(auditData.totalInstallmentsVal)}</span>
                        </div>
                        <h3 className="text-base font-black tracking-tight text-gold-cream mb-3">
                            💳 Parcelas Caindo na Fatura
                        </h3>

                        {auditData.installmentList.length > 0 ? (
                            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                {auditData.installmentList.map((inst, idx) => (
                                    <div key={idx} className="bg-carbon-800/60 border border-carbon-700/60 p-2.5 rounded-2xl flex justify-between items-center text-xs">
                                        <div className="pr-2 truncate">
                                            <span className="font-bold text-gold-cream block truncate">{inst.description}</span>
                                            <span className="text-[10px] text-gray-400">Parcela {inst.number} ({inst.cardName})</span>
                                        </div>
                                        <span className="font-mono font-bold text-amber-400 whitespace-nowrap">{formatCurrencyDisplay(inst.value)}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs text-gray-400">Nenhuma parcela ativa para este mês.</p>
                        )}
                    </div>
                    <div className="mt-4 pt-3 border-t border-carbon-800 text-[11px] font-semibold text-gray-400 flex justify-between">
                        <span>Alerta:</span>
                        <span className="text-amber-400">Evitar novos parcelamentos</span>
                    </div>
                </div>

                {/* 3. Raio-X de Despesas Avulsas */}
                <div className="bg-carbon-900 border border-carbon-800 text-gold-cream rounded-3xl p-6 shadow-xl flex flex-col justify-between">
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <span className="text-xs font-black tracking-widest uppercase bg-rose-500/10 text-rose-400 px-3 py-1 rounded-full border border-rose-500/20">
                                GASTOS AVULSOS
                            </span>
                            <span className="font-mono font-black text-lg text-rose-400">{formatCurrencyDisplay(auditData.totalExpensesVal)}</span>
                        </div>
                        <h3 className="text-base font-black tracking-tight text-gold-cream mb-3">
                            🔍 Despesas do Período
                        </h3>

                        {auditData.expenseList.length > 0 ? (
                            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                {auditData.expenseList.map((exp, idx) => (
                                    <div key={idx} className="bg-carbon-800/60 border border-carbon-700/60 p-2.5 rounded-2xl flex justify-between items-center text-xs">
                                        <div className="pr-2 truncate">
                                            <span className="font-bold text-gold-cream block truncate">{exp.description}</span>
                                            <span className="text-[10px] text-gray-400">Categoria: {exp.category}</span>
                                        </div>
                                        <span className="font-mono font-bold text-rose-400 whitespace-nowrap">{formatCurrencyDisplay(exp.value)}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs text-gray-400">Nenhuma despesa avulsa registrada no mês.</p>
                        )}
                    </div>
                    <div className="mt-4 pt-3 border-t border-carbon-800 text-[11px] font-semibold text-gray-400 flex justify-between">
                        <span>Meta de Redução:</span>
                        <span className="text-emerald-400">-15% até o fechamento</span>
                    </div>
                </div>

            </div>
        </div>
    );
}