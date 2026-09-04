// src/components/PdfImportModal.jsx

import React, { useState, useEffect, useMemo } from 'react';
import { collection, doc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { formatCurrencyDisplay } from '../utils/currency';
import { extractTextLinesFromPdf, parseInvoiceTransactions, matchAndDeduplicate } from '../utils/pdfParser';
import { toCents, fromCents, calculateRemainingAmount, calculatePaymentStatus, mapDomainStatusToLoanStatus } from '../services/financialService';
import Spinner from './Spinner';

// --- Ícones ---
const UploadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
);

const CheckCircleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
);

const RepeatIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
);

const SparklesIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
);

export default function PdfImportModal({ 
    isOpen, 
    onClose, 
    cards = [], 
    clients = [], 
    existingLoans = [], 
    onSaveSuccess, 
    db, 
    userId, 
    getUserCollectionPathSegments, 
    showToast 
}) {
    const [file, setFile] = useState(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisStatus, setAnalysisStatus] = useState('Lendo arquivo PDF...');
    const [importedItems, setImportedItems] = useState([]);
    const [selectedCardId, setSelectedCardId] = useState(cards[0]?.id || '');
    const [bulkClientId, setBulkClientId] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (cards.length > 0 && !selectedCardId) {
            setSelectedCardId(cards[0].id);
        }
    }, [cards, selectedCardId]);

    // Recalcula duplicidades quando o usuário troca o cartão de destino
    useEffect(() => {
        if (selectedCardId) {
            setImportedItems(prev => {
                if (!prev || prev.length === 0) return prev;
                return matchAndDeduplicate(prev, existingLoans, selectedCardId);
            });
        }
    }, [selectedCardId, existingLoans]);

    // Fechar com Escape quando seguro
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && isOpen && !isSubmitting) {
                onClose();
            }
        };
        if (isOpen) {
            window.addEventListener('keydown', handleKeyDown);
        }
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, isSubmitting, onClose]);

    // Estatísticas da importação
    const stats = useMemo(() => {
        const totalFound = importedItems.length;
        const duplicates = importedItems.filter(i => i.isDuplicate).length;
        const selectedToImport = importedItems.filter(i => i.selected).length;
        const totalValue = importedItems
            .filter(i => i.selected)
            .reduce((acc, i) => acc + (i.value || 0), 0);

        return { totalFound, duplicates, selectedToImport, totalValue };
    }, [importedItems]);

    // Leitura real e análise do PDF no navegador
    const handleFileUpload = async (e) => {
        const uploadedFile = e.target.files[0];
        if (!uploadedFile) return;

        if (uploadedFile.type !== 'application/pdf' && !uploadedFile.name.toLowerCase().endsWith('.pdf')) {
            showToast('Por favor, selecione um arquivo no formato PDF.', 'error');
            return;
        }

        // SEGURANÇA: Limita tamanho máximo do PDF para mitigar DoS via PDF malicioso com
        // dimensões BMP inválidas ou payload excepcionalmente grande.
        // CVEs: GHSA-67pg-wm7f-q7fj, GHSA-95fx-jjr5-f39c
        const MAX_PDF_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
        if (uploadedFile.size > MAX_PDF_SIZE_BYTES) {
            showToast('O arquivo PDF deve ter no máximo 10 MB. Extratos de fatura normalmente são muito menores.', 'error');
            return;
        }

        setFile(uploadedFile);
        setIsAnalyzing(true);
        setAnalysisStatus('Extraindo texto e estrutura das páginas da fatura...');

        try {
            // 1. Extração do texto bruto das páginas
            const rawLines = await extractTextLinesFromPdf(uploadedFile);

            if (!rawLines || rawLines.length === 0) {
                throw new Error('Nenhum texto legível foi encontrado na fatura. Verifique se o PDF não é uma imagem escaneada.');
            }

            setAnalysisStatus('Identificando compras, datas, valores e parcelamentos...');

            // 2. Identificação das transações (Nubank, Itaú, Inter, Bradesco, Santander, C6, etc.)
            const currentYear = new Date().getFullYear().toString();
            const extractedTransactions = parseInvoiceTransactions(rawLines, currentYear);

            if (extractedTransactions.length === 0) {
                showToast('Não foi possível identificar lançamentos de compras nesta fatura. Verifique se o PDF contém o detalhamento das transações.', 'warning');
                setIsAnalyzing(false);
                return;
            }

            setAnalysisStatus('Cruzando dados com compras já cadastradas...');

            // 3. Verificação anti-duplicidade e cruzamento inteligente
            const targetCardId = selectedCardId || cards[0]?.id || '';
            const processedItems = matchAndDeduplicate(extractedTransactions, existingLoans, targetCardId);

            setImportedItems(processedItems);
            showToast(`${processedItems.length} lançamentos encontrados na fatura!`, 'success');
        } catch (error) {
            console.error('Erro no processamento da fatura PDF:', error);
            showToast(error.message || 'Erro ao processar o arquivo PDF.', 'error');
            setFile(null);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleItemChange = (id, field, value) => {
        setImportedItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
    };

    const handleToggleSelectAll = (select) => {
        setImportedItems(prev => prev.map(item => ({ ...item, selected: select })));
    };

    const handleApplyBulkClient = () => {
        if (!bulkClientId) {
            showToast('Selecione uma pessoa para aplicar.', 'warning');
            return;
        }
        setImportedItems(prev => prev.map(item => item.selected ? { ...item, clientId: bulkClientId } : item));
        const selectedCount = importedItems.filter(i => i.selected).length;
        showToast(`Pessoa atribuída a ${selectedCount} compra(s) selecionada(s)!`, 'success');
    };

    // Salva compras no Firestore com projeção precisa de parcelas futuras
    const handleConfirmImport = async () => {
        if (isSubmitting) return;

        if (!selectedCardId) {
            showToast('Selecione o cartão de crédito destinatário.', 'warning');
            return;
        }

        const itemsToSave = importedItems.filter(item => item.selected);

        if (itemsToSave.length === 0) {
            showToast('Nenhum item selecionado para importação.', 'warning');
            return;
        }

        setIsSubmitting(true);
        try {
            const userCollectionPath = getUserCollectionPathSegments();
            const loansRef = collection(db, ...userCollectionPath, userId, 'loans');
            const batch = writeBatch(db);
            let count = 0;

            itemsToSave.forEach(item => {
                const totalCount = item.totalInstallments || 1;
                const currentInst = item.currentInstallment || 1;
                const itemDateStr = item.date || new Date().toISOString().split('T')[0];
                const [iYear, iMonth, iDay] = itemDateStr.split('-').map(Number);

                // Valor total da compra baseado na quantidade de parcelas (cent-safe)
                const observedCents = toCents(item.value);
                const totalValCents = observedCents * totalCount;
                const totalVal = fromCents(totalValCents);
                const newLoanRef = doc(loansRef);

                // Projeta as parcelas da compra com tratamento exato de fim de mês
                const installmentsList = [];
                let priorPaidCents = 0;

                for (let index = 0; index < totalCount; index++) {
                    const instNumber = index + 1;
                    const monthOffset = index - (currentInst - 1);
                    
                    const targetMonthIndex = (iMonth - 1) + monthOffset;
                    const targetYear = iYear + Math.floor(targetMonthIndex / 12);
                    const targetMonth = ((targetMonthIndex % 12) + 12) % 12;

                    const maxDaysInTargetMonth = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
                    const actualDay = Math.min(iDay, maxDaysInTargetMonth);

                    const dueDate = new Date(Date.UTC(targetYear, targetMonth, actualDay, 12, 0, 0));
                    const dueDateStr = dueDate.toISOString().split('T')[0];

                    // Parcelas anteriores à fatura atual são consideradas pagas
                    const isPriorInstallment = instNumber < currentInst;
                    const status = isPriorInstallment ? 'Paga' : 'Pendente';
                    const paidDate = isPriorInstallment ? dueDateStr : null;

                    if (isPriorInstallment) {
                        priorPaidCents += observedCents;
                    }

                    installmentsList.push({
                        number: instNumber,
                        value: item.value,
                        dueDate: dueDateStr,
                        status: status,
                        paidDate: paidDate
                    });
                }

                const totalPaidSoFar = fromCents(priorPaidCents);
                const balanceDue = calculateRemainingAmount(totalVal, totalPaidSoFar);
                const statusPayment = mapDomainStatusToLoanStatus(calculatePaymentStatus(totalVal, totalPaidSoFar));

                batch.set(newLoanRef, {
                    description: item.description,
                    totalValue: totalVal,
                    installmentsCount: totalCount,
                    purchaseDate: itemDateStr,
                    cardId: selectedCardId,
                    clientId: item.clientId || '',
                    isShared: false,
                    installments: installmentsList,
                    valuePaidClient: totalPaidSoFar,
                    balanceDueClient: balanceDue,
                    statusPaymentClient: statusPayment,
                    userId: userId,
                    createdAt: serverTimestamp(),
                    importedFromPdf: true
                });
                count++;
            });

            await batch.commit();
            showToast(`${count} compra(s) importada(s) e vinculada(s) ao cartão com sucesso!`, 'success');
            if (typeof onSaveSuccess === 'function') onSaveSuccess();
            onClose();
        } catch (error) {
            console.error('Erro ao salvar compras da fatura:', error);
            showToast(`Erro ao salvar compras da fatura: ${error.message}`, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleReset = () => {
        setFile(null);
        setImportedItems([]);
        setIsAnalyzing(false);
    };

    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 bg-black/80 backdrop-blur-md flex justify-center items-center z-50 p-4 animate-fadeIn"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pdf-import-modal-title"
        >
            <div className="bg-[#141414] border border-[#3A3A3A] rounded-3xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[92vh]">
                
                {/* Header */}
                <div className="p-6 border-b border-[#2A2A2A] flex justify-between items-center bg-[#1A1A1A]">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-[#F2B705]/10 text-[#F2B705] border border-[#F2B705]/20 rounded-2xl" aria-hidden="true">
                            <SparklesIcon />
                        </div>
                        <div>
                            <h2 id="pdf-import-modal-title" className="text-xl font-bold text-[#FFF3D6] tracking-tight">Importação Inteligente de Fatura PDF</h2>
                            <p className="text-xs text-gray-400 mt-0.5">Lê Nubank, Itaú, Inter, Bradesco, Santander e outros bancos com motor anti-duplicidade.</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose} 
                        aria-label="Fechar modal de importação PDF"
                        className="w-8 h-8 rounded-full bg-[#2A2A2A] text-gray-400 hover:text-white flex items-center justify-center transition cursor-pointer focus:outline-none focus:ring-2 focus:ring-gold/50"
                    >
                        <span aria-hidden="true">✕</span>
                    </button>
                </div>

                {/* Conteúdo Principal */}
                <div className="p-6 overflow-y-auto space-y-6 flex-1">
                    {!file ? (
                        <div className="border-2 border-dashed border-[#3A3A3A] hover:border-[#F2B705]/60 rounded-3xl p-10 text-center transition flex flex-col items-center justify-center space-y-4 bg-[#1A1A1A]/40">
                            <div className="p-5 bg-[#F2B705]/10 text-[#F2B705] rounded-2xl border border-[#F2B705]/20 shadow-lg shadow-[#F2B705]/5">
                                <UploadIcon />
                            </div>
                            <div className="max-w-md">
                                <p className="text-base font-bold text-[#FFF3D6]">Arraste ou selecione o PDF da sua fatura</p>
                                <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">
                                    O leitor identifica automaticamente compras à vista, parcelamentos (ex: 02/10), datas, valores e detecta compras já cadastradas no seu cartão.
                                </p>
                            </div>
                            <label className="bg-gradient-to-r from-[#FFF3D6] to-[#F2B705] text-[#141414] font-extrabold py-3 px-7 rounded-2xl shadow-lg shadow-[#F2B705]/20 cursor-pointer hover:opacity-90 text-xs transition uppercase tracking-wider">
                                Escolher Arquivo PDF
                                <input type="file" accept=".pdf,application/pdf" className="hidden" onChange={handleFileUpload} />
                            </label>
                        </div>
                    ) : isAnalyzing ? (
                        <div className="py-24 text-center space-y-5">
                            <div className="flex justify-center"><Spinner /></div>
                            <div className="space-y-1">
                                <p className="text-base text-[#F2B705] font-bold animate-pulse">{analysisStatus}</p>
                                <p className="text-xs text-gray-500">Isso leva apenas alguns segundos...</p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-5">
                            {/* Barra de Controles e Estatísticas */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-[#1A1A1A] p-4 rounded-2xl border border-[#2A2A2A]">
                                <div>
                                    <label className="text-xs text-gray-400 block mb-1 font-semibold">Vincular a qual Cartão?</label>
                                    <select 
                                        value={selectedCardId} 
                                        onChange={(e) => setSelectedCardId(e.target.value)}
                                        className="w-full bg-[#2A2A2A] border border-[#3A3A3A] rounded-xl px-3 py-2 text-xs text-[#FFF3D6] focus:ring-2 focus:ring-[#F2B705] outline-none cursor-pointer"
                                    >
                                        {cards.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>

                                <div>
                                    <label className="text-xs text-gray-400 block mb-1 font-semibold">Atribuir Pessoa em Massa</label>
                                    <div className="flex gap-2">
                                        <select 
                                            value={bulkClientId} 
                                            onChange={(e) => setBulkClientId(e.target.value)}
                                            className="w-full bg-[#2A2A2A] border border-[#3A3A3A] rounded-xl px-3 py-2 text-xs text-[#FFF3D6] focus:ring-2 focus:ring-[#F2B705] outline-none cursor-pointer"
                                        >
                                            <option value="">Selecione a Pessoa...</option>
                                            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                        <button 
                                            onClick={handleApplyBulkClient}
                                            className="px-3 py-2 bg-[#2A2A2A] hover:bg-[#3A3A3A] border border-[#3A3A3A] text-xs font-bold text-gray-200 rounded-xl transition cursor-pointer flex-shrink-0"
                                            title="Aplica a pessoa selecionada a todos os itens marcados"
                                        >
                                            Aplicar
                                        </button>
                                    </div>
                                </div>

                                <div className="flex items-center justify-around bg-[#222] p-2.5 rounded-xl border border-[#333]">
                                    <div className="text-center">
                                        <span className="text-[10px] text-gray-400 block uppercase font-bold">Total Lidos</span>
                                        <span className="text-sm font-black text-gray-200">{stats.totalFound}</span>
                                    </div>
                                    <div className="text-center">
                                        <span className="text-[10px] text-emerald-400 block uppercase font-bold">A Importar</span>
                                        <span className="text-sm font-black text-emerald-400">{stats.selectedToImport}</span>
                                    </div>
                                    <div className="text-center">
                                        <span className="text-[10px] text-rose-400 block uppercase font-bold">Duplicados</span>
                                        <span className="text-sm font-black text-rose-400">{stats.duplicates}</span>
                                    </div>
                                    <div className="text-center border-l border-[#3A3A3A] pl-3">
                                        <span className="text-[10px] text-[#F2B705] block uppercase font-bold">Valor Total</span>
                                        <span className="text-sm font-black text-[#F2B705] font-mono">{formatCurrencyDisplay(stats.totalValue)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Ações rápidas de seleção */}
                            <div className="flex justify-between items-center text-xs px-1">
                                <div className="flex gap-2">
                                    <button onClick={() => handleToggleSelectAll(true)} className="text-[#F2B705] hover:underline cursor-pointer font-semibold">Marcar todos</button>
                                    <span className="text-gray-600">|</span>
                                    <button onClick={() => handleToggleSelectAll(false)} className="text-gray-400 hover:text-white cursor-pointer font-semibold">Desmarcar todos</button>
                                </div>
                                <button onClick={handleReset} className="text-gray-400 hover:text-rose-400 cursor-pointer font-semibold">
                                    ↺ Trocar arquivo PDF
                                </button>
                            </div>

                            {/* Tabela de Revisão dos Lançamentos */}
                            <div className="border border-[#2A2A2A] rounded-2xl overflow-hidden bg-[#1A1A1A]">
                                <table className="min-w-full text-left border-collapse text-xs">
                                    <thead>
                                        <tr className="bg-[#222] text-gray-400 uppercase font-semibold border-b border-[#2A2A2A]">
                                            <th className="p-3 w-10 text-center">✓</th>
                                            <th className="p-3">Data / Descrição</th>
                                            <th className="p-3">Valor da Parcela</th>
                                            <th className="p-3">Parcelamento</th>
                                            <th className="p-3">Pessoa Responsável</th>
                                            <th className="p-3">Status Anti-Duplicidade</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#2A2A2A]">
                                        {importedItems.map((item) => (
                                            <tr 
                                                key={item.id} 
                                                className={`transition-colors ${
                                                    item.isDuplicate 
                                                        ? 'bg-rose-500/5 opacity-70 hover:bg-rose-500/10' 
                                                        : item.selected 
                                                            ? 'hover:bg-[#2A2A2A]/50 bg-[#1A1A1A]' 
                                                            : 'opacity-40 hover:opacity-80'
                                                }`}
                                            >
                                                <td className="p-3 text-center">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={item.selected} 
                                                        onChange={(e) => handleItemChange(item.id, 'selected', e.target.checked)} 
                                                        className="w-4 h-4 rounded bg-[#2A2A2A] border-[#3A3A3A] text-[#F2B705] focus:ring-[#F2B705] cursor-pointer"
                                                    />
                                                </td>
                                                <td className="p-3 font-semibold text-[#FFF3D6]">
                                                    {item.description}
                                                    <span className="block text-[10px] text-gray-400 font-mono mt-0.5">{item.date}</span>
                                                </td>
                                                <td className="p-3 font-mono font-black text-[#F2B705] whitespace-nowrap">
                                                    {formatCurrencyDisplay(item.value)}
                                                </td>
                                                <td className="p-3 text-gray-300 whitespace-nowrap">
                                                    {item.totalInstallments > 1 ? (
                                                        <span className="inline-flex items-center gap-1 text-amber-400 font-bold bg-amber-500/10 px-2.5 py-1 rounded-xl border border-amber-500/20">
                                                            {item.currentInstallment}/{item.totalInstallments} ({item.totalInstallments - item.currentInstallment + 1} restante(s))
                                                        </span>
                                                    ) : (
                                                        <span className="text-gray-400 bg-[#2A2A2A] px-2.5 py-1 rounded-xl">À vista (1x)</span>
                                                    )}
                                                </td>
                                                <td className="p-3">
                                                    <select 
                                                        value={item.clientId} 
                                                        onChange={(e) => handleItemChange(item.id, 'clientId', e.target.value)}
                                                        className="bg-[#2A2A2A] border border-[#3A3A3A] rounded-xl px-2.5 py-1.5 text-[#FFF3D6] outline-none focus:ring-1 focus:ring-[#F2B705] cursor-pointer w-full max-w-[180px]"
                                                    >
                                                        <option value="">Selecione...</option>
                                                        {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                                    </select>
                                                </td>
                                                <td className="p-3 whitespace-nowrap">
                                                    {item.isDuplicate ? (
                                                        <span className="inline-flex items-center gap-1.5 text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-xl border border-rose-500/20 font-medium text-[11px]" title={item.duplicateReason}>
                                                            <RepeatIcon /> Já Cadastrada
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1.5 text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-xl border border-emerald-500/20 font-medium text-[11px]">
                                                            <CheckCircleIcon /> Nova Compra
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-[#2A2A2A] flex justify-between items-center bg-[#1A1A1A]">
                    <span className="text-xs text-gray-400 font-medium">
                        {importedItems.length > 0 && `${stats.selectedToImport} de ${stats.totalFound} compras selecionadas para importação`}
                    </span>
                    <div className="flex gap-3">
                        <button onClick={onClose} className="px-5 py-2.5 rounded-2xl bg-[#2A2A2A] hover:bg-[#3A3A3A] text-gray-300 text-xs font-semibold transition cursor-pointer">
                            Cancelar
                        </button>
                        {file && !isAnalyzing && importedItems.length > 0 && (
                            <button 
                                onClick={handleConfirmImport} 
                                disabled={stats.selectedToImport === 0 || isSubmitting}
                                className={`px-6 py-2.5 rounded-2xl bg-gradient-to-r from-[#FFF3D6] to-[#F2B705] text-[#141414] text-xs font-black shadow-lg shadow-[#F2B705]/20 transition cursor-pointer uppercase tracking-wider flex items-center gap-2 ${
                                    stats.selectedToImport === 0 || isSubmitting ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'
                                }`}
                            >
                                {isSubmitting && <Spinner />}
                                <span>{isSubmitting ? 'Salvando...' : `Confirmar e Salvar (${stats.selectedToImport})`}</span>
                            </button>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}