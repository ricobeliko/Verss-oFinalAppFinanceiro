// src/features/clients/FinancialReportModal.jsx

import React, { useEffect, useState, useMemo } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { useAppContext } from '../../context/AppContext';
import { formatCurrencyDisplay } from '../../utils/currency';
import { copyTextToClipboardFallback } from '../../utils/helpers';
import UpgradePrompt from '../../components/UpgradePrompt';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// --- Ícone de Fechar ---
const XIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
);


export default function FinancialReportModal({ isOpen, onClose, client }) {
    const { userId, db, isPro, isTrialActive, showToast, getUserCollectionPathSegments } = useAppContext();
    const [loans, setLoans] = useState([]);
    const [expenses, setExpenses] = useState([]);
    const [subscriptions, setSubscriptions] = useState([]);

    const hasProAccess = isPro || isTrialActive;

    useEffect(() => {
        if (!isOpen || !client || !userId || !hasProAccess) return;

        const userCollectionPath = getUserCollectionPathSegments();
        
        const loansQuery = query(collection(db, ...userCollectionPath, userId, 'loans'), where("clientId", "==", client.id));
        const unsubLoans = onSnapshot(loansQuery, snapshot => {
            setLoans(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        const expensesQuery = query(collection(db, ...userCollectionPath, userId, 'expenses'), where("clientId", "==", client.id));
        const unsubExpenses = onSnapshot(expensesQuery, snapshot => {
            setExpenses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        const subsQuery = query(collection(db, ...userCollectionPath, userId, 'subscriptions'), where("clientId", "==", client.id));
        const unsubSubs = onSnapshot(subsQuery, snapshot => {
            setSubscriptions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        return () => {
            unsubLoans();
            unsubExpenses();
            unsubSubs();
        };
    }, [isOpen, client, userId, db, hasProAccess, getUserCollectionPathSegments]);

    const reportData = useMemo(() => {
        if (!client) return null;

        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        // 1. Resumo do Mês Atual
        // ✅ CORREÇÃO: Adicionada verificação 'Array.isArray()' para garantir que 'loan.installments' é um array.
        const monthlyLoans = loans.flatMap(loan => 
            Array.isArray(loan.installments) 
            ? loan.installments.filter(inst => {
                const dueDate = new Date(inst.dueDate + 'T00:00:00');
                return dueDate.getMonth() === currentMonth && dueDate.getFullYear() === currentYear;
            })
            : [] // Se não for um array, retorna um array vazio para flatMap.
        ).reduce((sum, inst) => sum + inst.value, 0);
        
        const monthlyExpenses = expenses.filter(exp => {
            const expDate = new Date(exp.date + 'T00:00:00');
            return expDate.getMonth() === currentMonth && expDate.getFullYear() === currentYear;
        }).reduce((sum, exp) => sum + exp.value, 0);

        const monthlySubscriptions = subscriptions.filter(sub => sub.isActive).reduce((sum, sub) => sum + sub.amount, 0);

        // 2. Próximas Parcelas a Vencer
        const futureInstallments = {};
        loans.forEach(loan => {
            // ✅ CORREÇÃO: Adicionada verificação 'Array.isArray()' aqui também por segurança.
            if (Array.isArray(loan.installments)) {
                loan.installments.forEach(inst => {
                    if (inst.status === 'Pendente' || inst.status === 'Atrasado') {
                        const dueDate = new Date(inst.dueDate + 'T00:00:00');
                        const monthYear = `${dueDate.toLocaleString('pt-BR', { month: 'long' })} de ${dueDate.getFullYear()}`;
                        futureInstallments[monthYear] = (futureInstallments[monthYear] || 0) + inst.value;
                    }
                });
            }
        });
        
        // 3. Compras em Aberto
        const openLoans = loans.filter(loan => loan.statusPaymentClient !== 'Pago Total');

        // 4. Saldo Devedor Total
        const totalDebt = openLoans.reduce((sum, loan) => sum + (loan.balanceDueClient || 0), 0);

        return {
            generationDate: new Date().toLocaleString('pt-BR'),
            clientName: client.name,
            monthlyInvoice: monthlyLoans + monthlyExpenses,
            monthlySubscriptions,
            monthlyExpenses,
            futureInstallments,
            openLoans,
            totalDebt
        };
    }, [client, loans, expenses, subscriptions]);

    const generateReportText = () => {
        if (!reportData) return '';
        
        const { clientName, generationDate, monthlyInvoice, monthlyExpenses, monthlySubscriptions, futureInstallments, openLoans, totalDebt } = reportData;

        let text = `RELATÓRIO FINANCEIRO - ${clientName.toUpperCase()}\n`;
        text += `Gerado em: ${generationDate}\n`;
        text += `================================================\n\n`;

        text += `--- RESUMO PARA O MÊS ATUAL ---\n`;
        text += `> Compras na Fatura: ${formatCurrencyDisplay(monthlyInvoice - monthlyExpenses)}\n`;
        text += `> Despesas Avulsas: ${formatCurrencyDisplay(monthlyExpenses)}\n`;
        text += `> Assinaturas: ${formatCurrencyDisplay(monthlySubscriptions)}\n\n`;

        text += `--- PRÓXIMAS PARCELAS A VENCER ---\n`;
        Object.entries(futureInstallments).forEach(([month, value]) => {
            text += `> ${month}: ${formatCurrencyDisplay(value)}\n`;
        });
        text += `\n`;

        text += `--- COMPRAS EM ABERTO ---\n`;
        openLoans.forEach(loan => {
            // ✅ CORREÇÃO: Garantindo que 'installments' é um array antes de usar '.find()'.
            const installments = Array.isArray(loan.installments) ? loan.installments : [];
            const nextInstallment = installments.find(inst => inst.status === 'Pendente' || inst.status === 'Atrasado');
            
            text += `> ${loan.description.toUpperCase()}\n`;
            if (nextInstallment) {
                 text += `  - Próxima Parcela: ${nextInstallment.number}/${installments.length} no valor de ${formatCurrencyDisplay(nextInstallment.value)}\n`;
            }
            text += `  - Saldo devedor total da compra: ${formatCurrencyDisplay(loan.balanceDueClient)}\n\n`;
        });

        text += `--- RESUMO GERAL ---\n`;
        text += `> SALDO DEVEDOR TOTAL (TODAS AS COMPRAS): ${formatCurrencyDisplay(totalDebt)}\n\n`;
        text += `-----------------------\n`;

        return text;
    };

    const handleCopyText = () => {
        const text = generateReportText();
        if (copyTextToClipboardFallback(text)) {
            showToast('Relatório copiado para a área de transferência!', 'success');
        } else {
            showToast('Erro ao copiar o relatório.', 'error');
        }
    };
    
    const handleExportPDF = () => {
        const reportElement = document.getElementById('financial-report-content');
        if (reportElement) {
            showToast('Gerando PDF... Aguarde.', 'info');
            html2canvas(reportElement, {
                backgroundColor: '#1f2937', 
                scale: 2 
            }).then(canvas => {
                const imgData = canvas.toDataURL('image/png');
                const pdf = new jsPDF('p', 'mm', 'a4');
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
                pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
                pdf.save(`relatorio_${client.name.toLowerCase().replace(' ', '_')}.pdf`);
            }).catch(err => {
                showToast('Erro ao gerar PDF.', 'error');
                console.error("Erro no html2canvas:", err);
            });
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col text-gray-200">
                
                <div className="flex justify-between items-center p-4 border-b border-gray-700 flex-shrink-0">
                    <div>
                        <h2 className="text-xl font-bold text-white">Relatório Financeiro</h2>
                        <p className="text-sm text-gray-400">{reportData?.clientName}</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-700 transition">
                        <XIcon />
                    </button>
                </div>

                <div className="flex-grow overflow-y-auto p-6 relative">
                    {!hasProAccess ? (
                        <div className="absolute inset-0 flex items-center justify-center bg-gray-800/50 backdrop-blur-sm rounded-b-lg">
                            <UpgradePrompt />
                        </div>
                    ) : !reportData ? (
                        <div className="text-center py-10">Carregando dados...</div>
                    ) : (
                        <div id="financial-report-content" className="p-4 bg-gray-900 rounded-md">
                            <p className="text-xs text-gray-500 mb-4">Gerado em: {reportData.generationDate}</p>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                                <div className="bg-red-900/50 border border-red-800 p-4 rounded-lg">
                                    <h3 className="font-semibold text-red-300">Fatura do Mês (Compras + Despesas)</h3>
                                    <p className="text-2xl font-bold text-white">{formatCurrencyDisplay(reportData.monthlyInvoice)}</p>
                                </div>
                                <div className="bg-purple-900/50 border border-purple-800 p-4 rounded-lg">
                                    <h3 className="font-semibold text-purple-300">Compromisso Mensal (Assinaturas)</h3>
                                    <p className="text-2xl font-bold text-white">{formatCurrencyDisplay(reportData.monthlySubscriptions)}</p>
                                </div>
                            </div>

                            <div className="mb-6">
                                <h3 className="text-lg font-semibold border-b border-gray-700 pb-2 mb-2 text-yellow-300">Próximas Parcelas a Vencer</h3>
                                <ul className="space-y-1 text-sm">
                                    {Object.entries(reportData.futureInstallments).map(([month, value]) => (
                                        <li key={month} className="flex justify-between">
                                            <span>{month}</span>
                                            <span className="font-mono">{formatCurrencyDisplay(value)}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            
                            <div className="mb-6">
                                <h3 className="text-lg font-semibold border-b border-gray-700 pb-2 mb-2 text-blue-300">Compras em Aberto</h3>
                                <div className="space-y-3 text-sm">
                                    {reportData.openLoans.map(loan => {
                                        // ✅ CORREÇÃO: Verificação final aqui também para segurança na renderização.
                                        const installments = Array.isArray(loan.installments) ? loan.installments : [];
                                        const nextInst = installments.find(i => i.status === 'Pendente' || i.status === 'Atrasado');
                                        return (
                                            <div key={loan.id} className="p-2 bg-gray-800/50 rounded">
                                                <p className="font-bold text-white">{loan.description}</p>
                                                {nextInst && <p className="text-xs text-gray-400">Próxima Parcela: {nextInst.number}/{installments.length} de {formatCurrencyDisplay(nextInst.value)}</p>}
                                                <p className="text-xs text-gray-400">Saldo Devedor: {formatCurrencyDisplay(loan.balanceDueClient)}</p>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                            
                             <div className="mt-6 pt-4 border-t border-gray-700">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-lg font-semibold text-green-300">SALDO DEVEDOR TOTAL</h3>
                                    <p className="text-xl font-bold font-mono text-white">{formatCurrencyDisplay(reportData.totalDebt)}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex justify-end items-center p-4 border-t border-gray-700 flex-shrink-0 gap-4">
                    <button 
                        onClick={handleCopyText}
                        disabled={!hasProAccess}
                        className="px-4 py-2 text-sm font-medium bg-gray-600 hover:bg-gray-500 rounded-md transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Copiar Texto
                    </button>
                    <button 
                        onClick={handleExportPDF}
                        disabled={!hasProAccess}
                        className="px-4 py-2 text-sm font-medium bg-red-600 hover:bg-red-700 text-white rounded-md transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Exportar PDF
                    </button>
                </div>
            </div>
        </div>
    );
}