// src/features/clients/FinancialReportModal.jsx

import React, { useEffect, useState, useMemo } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { useAppContext } from '../../context/AppContext';
import { formatCurrencyDisplay } from '../../utils/currency';
import { copyTextToClipboardFallback } from '../../utils/helpers';
import UpgradePrompt from '../../components/UpgradePrompt';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// --- Ícones ---
const XIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
);

export default function FinancialReportModal({ isOpen, onClose, client }) {
    const { userId, db, isPro, isTrialActive, showToast, getUserCollectionPathSegments } = useAppContext();
    const [allLoans, setAllLoans] = useState([]);
    const [allExpenses, setAllExpenses] = useState([]);
    const [allSubscriptions, setAllSubscriptions] = useState([]);

    const hasProAccess = isPro || isTrialActive;

    useEffect(() => {
        if (!isOpen || !client || !userId || !hasProAccess) return;

        const userCollectionPath = getUserCollectionPathSegments();
        const basePath = [...userCollectionPath, userId];
        
        const unsubLoans = onSnapshot(collection(db, ...basePath, 'loans'), snapshot => {
            setAllLoans(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        const unsubExpenses = onSnapshot(collection(db, ...basePath, 'expenses'), snapshot => {
            setAllExpenses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        const unsubSubs = onSnapshot(collection(db, ...basePath, 'subscriptions'), snapshot => {
            setAllSubscriptions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
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

        const clientLoans = allLoans.filter(loan => 
            loan.isShared 
            ? loan.sharedDetails?.person1?.clientId === client.id || loan.sharedDetails?.person2?.clientId === client.id
            : loan.clientId === client.id
        );
        const clientExpenses = allExpenses.filter(exp => exp.clientId === client.id);
        const clientSubscriptions = allSubscriptions.filter(sub => sub.clientId === client.id);

        const monthlyInstallments = clientLoans.flatMap(loan => {
            let installments = [];
            if (loan.isShared) {
                if (loan.sharedDetails?.person1?.clientId === client.id) installments = loan.sharedDetails.person1.installments;
                else if (loan.sharedDetails?.person2?.clientId === client.id) installments = loan.sharedDetails.person2.installments;
            } else {
                installments = loan.installments;
            }
            return Array.isArray(installments) ? installments : [];
        }).filter(inst => {
            const dueDate = new Date(inst.dueDate + 'T00:00:00');
            return dueDate.getMonth() === currentMonth && dueDate.getFullYear() === currentYear;
        });

        const monthlyExpenses = clientExpenses.filter(exp => {
            const expDate = exp.date?.toDate ? exp.date.toDate() : new Date(exp.date + 'T00:00:00');
            return expDate.getMonth() === currentMonth && expDate.getFullYear() === currentYear;
        });

        const monthlyLoansValue = monthlyInstallments.reduce((sum, inst) => sum + inst.value, 0);
        const monthlyExpensesValue = monthlyExpenses.reduce((sum, exp) => sum + exp.value, 0);
        const monthlySubscriptionsValue = clientSubscriptions.filter(sub => sub.isActive).reduce((sum, sub) => sum + sub.amount, 0);
        
        const monthlySpendingByCategory = {};
        
        monthlyExpenses.forEach(exp => {
            const category = exp.category || 'Outros';
            monthlySpendingByCategory[category] = (monthlySpendingByCategory[category] || 0) + exp.value;
        });

        if (monthlyLoansValue > 0) {
            monthlySpendingByCategory['Compras Parceladas'] = (monthlySpendingByCategory['Compras Parceladas'] || 0) + monthlyLoansValue;
        }

        if (monthlySubscriptionsValue > 0) {
            monthlySpendingByCategory['Assinaturas'] = (monthlySpendingByCategory['Assinaturas'] || 0) + monthlySubscriptionsValue;
        }

        const futureInstallments = {};
        clientLoans.forEach(loan => {
            let installmentsToProcess = [];
            if (loan.isShared) {
                if (loan.sharedDetails?.person1?.clientId === client.id) installmentsToProcess = loan.sharedDetails.person1.installments;
                else if (loan.sharedDetails?.person2?.clientId === client.id) installmentsToProcess = loan.sharedDetails.person2.installments;
            } else {
                installmentsToProcess = loan.installments;
            }
            
            if (Array.isArray(installmentsToProcess)) {
                installmentsToProcess.forEach(inst => {
                    if (inst.status === 'Pendente' || inst.status === 'Atrasado') {
                        const dueDate = new Date(inst.dueDate + 'T00:00:00');
                        const monthYear = `${dueDate.toLocaleString('pt-BR', { month: 'long' })} de ${dueDate.getFullYear()}`;
                        futureInstallments[monthYear] = (futureInstallments[monthYear] || 0) + inst.value;
                    }
                });
            }
        });
        
        const openLoans = [];
        let totalDebt = 0;

        clientLoans.forEach(loan => {
            let balanceDueForClient = 0;
            let statusForClient = '';
            
            if (loan.isShared) {
                if (loan.sharedDetails?.person1?.clientId === client.id) {
                    balanceDueForClient = loan.sharedDetails.person1.balanceDue || 0;
                    statusForClient = loan.sharedDetails.person1.statusPayment;
                } else if (loan.sharedDetails?.person2?.clientId === client.id) {
                    balanceDueForClient = loan.sharedDetails.person2.balanceDue || 0;
                    statusForClient = loan.sharedDetails.person2.statusPayment;
                }
            } else {
                balanceDueForClient = loan.balanceDueClient || 0;
                statusForClient = loan.statusPaymentClient;
            }

            if (statusForClient !== 'Pago Total') {
                openLoans.push({ ...loan, balanceDueClient: balanceDueForClient });
                totalDebt += balanceDueForClient;
            }
        });

        return {
            generationDate: new Date().toLocaleString('pt-BR'),
            clientName: client.name,
            monthlyInvoice: monthlyLoansValue + monthlyExpensesValue,
            monthlySubscriptions: monthlySubscriptionsValue,
            monthlyExpenses: monthlyExpensesValue,
            monthlySpendingByCategory,
            futureInstallments,
            openLoans,
            totalDebt
        };
    }, [client, allLoans, allExpenses, allSubscriptions]);

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
        text += `--- PRÓXIMAS PARCELAS A VENCER (SUA PARTE) ---\n`;
        Object.entries(futureInstallments).forEach(([month, value]) => {
            text += `> ${month}: ${formatCurrencyDisplay(value)}\n`;
        });
        text += `\n`;
        text += `--- COMPRAS EM ABERTO (SUA PARTE) ---\n`;
        openLoans.forEach(loan => {
            let installments = [];
            if(loan.isShared) {
                if(loan.sharedDetails?.person1?.clientId === client.id) installments = loan.sharedDetails.person1.installments;
                else if(loan.sharedDetails?.person2?.clientId === client.id) installments = loan.sharedDetails.person2.installments;
            } else {
                installments = loan.installments;
            }
            installments = Array.isArray(installments) ? installments : [];
            const nextInstallment = installments.find(inst => inst.status === 'Pendente' || inst.status === 'Atrasado');
            
            text += `> ${loan.description ? loan.description.toUpperCase() : 'COMPRA SEM DESCRIÇÃO'}\n`;
            if (nextInstallment) {
                 text += `  - Próxima Parcela: ${nextInstallment.number}/${installments.length} no valor de ${formatCurrencyDisplay(nextInstallment.value)}\n`;
            }
            text += `  - Saldo devedor (sua parte): ${formatCurrencyDisplay(loan.balanceDueClient)}\n\n`;
        });
        text += `--- RESUMO GERAL ---\n`;
        text += `> SALDO DEVEDOR TOTAL (SUA PARTE): ${formatCurrencyDisplay(totalDebt)}\n\n`;
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
                backgroundColor: '#141414', 
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity" onClick={onClose}></div>

            <div className="relative z-10 w-full max-w-4xl max-h-[90vh] bg-[#141414] border border-[#3A3A3A] rounded-3xl shadow-2xl flex flex-col text-gray-200 overflow-hidden animate-scaleUp">
                
                {/* Cabeçalho */}
                <div className="flex justify-between items-center p-6 border-b border-[#2A2A2A] flex-shrink-0">
                    <div>
                        <h2 className="text-xl font-bold text-[#FFF3D6] tracking-tight">Relatório Financeiro</h2>
                        <p className="text-sm text-gold mt-0.5">{reportData?.clientName}</p>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-full bg-[#2A2A2A] text-gray-400 hover:text-white flex items-center justify-center transition cursor-pointer">
                        <XIcon />
                    </button>
                </div>

                {/* Conteúdo */}
                <div className="flex-grow overflow-y-auto p-6 relative">
                    {!hasProAccess ? (
                        <div className="absolute inset-0 flex items-center justify-center bg-[#141414]/90 backdrop-blur-sm rounded-3xl">
                            <UpgradePrompt />
                        </div>
                    ) : !reportData ? (
                        <div className="text-center py-10 text-gray-400">Carregando dados...</div>
                    ) : (
                        <div id="financial-report-content" className="p-6 bg-carbon-900 border border-carbon-800 rounded-3xl space-y-6">
                            <p className="text-xs text-gray-500">Gerado em: {reportData.generationDate}</p>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="bg-carbon-800 border border-carbon-700 p-5 rounded-2xl">
                                    <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Fatura do Mês (Compras + Despesas)</h3>
                                    <p className="text-2xl font-black text-gold">{formatCurrencyDisplay(reportData.monthlyInvoice)}</p>
                                </div>
                                <div className="bg-carbon-800 border border-carbon-700 p-5 rounded-2xl">
                                    <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Compromisso Mensal (Assinaturas)</h3>
                                    <p className="text-2xl font-black text-gold-cream">{formatCurrencyDisplay(reportData.monthlySubscriptions)}</p>
                                </div>
                            </div>

                            {/* Gastos do Mês por Categoria */}
                            <div className="bg-carbon-800/60 border border-carbon-700 p-5 rounded-2xl space-y-3">
                                <h3 className="text-sm font-bold uppercase tracking-wider text-gold flex items-center gap-2">
                                    <span>📝</span> Gastos do Mês por Categoria
                                </h3>
                                <ul className="space-y-2 text-sm divide-y divide-carbon-700/50">
                                    {Object.entries(reportData.monthlySpendingByCategory).map(([category, value]) => (
                                        <li key={category} className="flex justify-between pt-2 first:pt-0">
                                            <span className="text-gray-300 font-medium">{category}</span>
                                            <span className="font-mono font-bold text-gold-cream">{formatCurrencyDisplay(value)}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* Próximas Parcelas a Vencer */}
                            <div className="bg-carbon-800/60 border border-carbon-700 p-5 rounded-2xl space-y-3">
                                <h3 className="text-sm font-bold uppercase tracking-wider text-gold flex items-center gap-2">
                                    <span>📈</span> Próximas Parcelas a Vencer
                                </h3>
                                <ul className="space-y-2 text-sm divide-y divide-carbon-700/50">
                                    {Object.entries(reportData.futureInstallments).map(([month, value]) => (
                                        <li key={month} className="flex justify-between pt-2 first:pt-0">
                                            <span className="text-gray-300 font-medium">{month}</span>
                                            <span className="font-mono font-bold text-gold-cream">{formatCurrencyDisplay(value)}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            
                            {/* Compras em Aberto */}
                            <div className="bg-carbon-800/60 border border-carbon-700 p-5 rounded-2xl space-y-3">
                                <h3 className="text-sm font-bold uppercase tracking-wider text-gold flex items-center gap-2">
                                    <span>📂</span> Compras em Aberto (Sua Parte)
                                </h3>
                                <div className="space-y-3 text-sm">
                                    {reportData.openLoans.map(loan => {
                                        let installments = [];
                                        if(loan.isShared) {
                                            if(loan.sharedDetails?.person1?.clientId === client.id) installments = loan.sharedDetails.person1.installments;
                                            else if(loan.sharedDetails?.person2?.clientId === client.id) installments = loan.sharedDetails.person2.installments;
                                        } else {
                                            installments = loan.installments;
                                        }
                                        installments = Array.isArray(installments) ? installments : [];
                                        const nextInst = installments.find(i => i.status === 'Pendente' || i.status === 'Atrasado');
                                        return (
                                            <div key={loan.id} className="p-3 bg-carbon-900 border border-carbon-700 rounded-xl space-y-1">
                                                <p className="font-bold text-gold-cream">{loan.description || "Compra sem descrição"}</p>
                                                {nextInst && <p className="text-xs text-gray-400">Próxima Parcela: <span className="text-gray-200 font-medium">{nextInst.number}/{installments.length}</span> de <span className="text-gold font-medium">{formatCurrencyDisplay(nextInst.value)}</span></p>}
                                                <p className="text-xs text-gray-400">Saldo Devedor (sua parte): <span className="text-emerald-400 font-bold">{formatCurrencyDisplay(loan.balanceDueClient)}</span></p>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                            
                            {/* Saldo Devedor Total */}
                            <div className="p-5 bg-gradient-to-r from-carbon-900 via-carbon-800 to-carbon-900 border border-gold/30 rounded-2xl flex justify-between items-center shadow-xl">
                                <h3 className="text-sm font-extrabold uppercase tracking-wider text-gold">💰 SALDO DEVEDOR TOTAL (SUA PARTE)</h3>
                                <p className="text-2xl font-black font-mono text-emerald-400">{formatCurrencyDisplay(reportData.totalDebt)}</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Rodapé */}
                <div className="flex justify-end items-center p-4 border-t border-[#2A2A2A] flex-shrink-0 gap-3">
                    <button onClick={handleCopyText} disabled={!hasProAccess} className="py-2.5 px-5 bg-carbon-800 hover:bg-carbon-700 rounded-2xl text-gray-300 transition cursor-pointer font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed">
                        Copiar Texto
                    </button>
                    <button onClick={handleExportPDF} disabled={!hasProAccess} className="py-2.5 px-5 bg-gradient-to-r from-gold-light to-gold hover:opacity-90 rounded-2xl text-carbon-900 font-bold transition cursor-pointer text-sm shadow-lg shadow-gold/20 disabled:opacity-50 disabled:cursor-not-allowed">
                        Exportar PDF
                    </button>
                </div>
            </div>
        </div>
    );
}