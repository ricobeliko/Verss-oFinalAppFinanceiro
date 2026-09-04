// src/services/financialService.js
import { formatCurrencyDisplay, parseCurrencyInput } from '../utils/currency';

/**
 * Converte um valor monetário (número float ou string) para centavos inteiros.
 * Evita imprecisões clássicas de ponto flutuante do JavaScript (ex: 0.1 + 0.2).
 * @param {number|string} value - Valor em reais (ex: 100.50 ou "100.50")
 * @returns {number} Valor inteiro em centavos (ex: 10050)
 */
export function toCents(value) {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'number') {
        if (isNaN(value) || !Number.isFinite(value)) return 0;
        return Math.round(value * 100);
    }
    const parsedNum = parseCurrencyInput(value);
    if (!parsedNum || !Number.isFinite(parsedNum)) return 0;
    return Math.round(parsedNum * 100);
}

/**
 * Converte centavos inteiros de volta para float com 2 casas decimais.
 * @param {number} cents - Valor em centavos
 * @returns {number} Valor em reais com precisão float
 */
export function fromCents(cents) {
    if (cents === null || cents === undefined || isNaN(cents)) return 0;
    return Math.round(cents) / 100;
}

/**
 * Valida se um valor financeiro é positivo e numérico.
 * @param {number|string} value
 * @returns {boolean}
 */
export function isValidFinancialValue(value) {
    const cents = toCents(value);
    return cents > 0 && Number.isSafeInteger(cents);
}

/**
 * Calcula a divisão exata de parcelas garantindo que a soma de todas seja 100% igual ao total.
 * O centavo residual é compensado na última parcela.
 * Trata rolagem de meses e anos, respeitando o número máximo de dias de cada mês (ex: 28/29 em Fev, 30 em Abr).
 *
 * @param {Object} params
 * @param {number|string} params.totalValue - Valor total da compra
 * @param {number} params.count - Quantidade de parcelas (inteiro positivo)
 * @param {string} [params.startDate] - Data da 1ª parcela (formato 'YYYY-MM-DD')
 * @returns {Array<Object>} Lista de parcelas com { number, value, dueDate, status, paidDate }
 */
export function calculateInstallments({ totalValue, count, startDate }) {
    const totalCents = toCents(totalValue);
    const installmentsCount = parseInt(count, 10);

    // Validações de entrada estritas
    if (totalCents <= 0 || isNaN(installmentsCount) || installmentsCount < 1) {
        return [];
    }

    const baseCentsPerInstallment = Math.floor(totalCents / installmentsCount);
    let accumulatedCents = 0;
    const installments = [];

    // Parse da data inicial se fornecida
    let startYear, startMonth, startDay;
    if (startDate && typeof startDate === 'string' && startDate.includes('-')) {
        [startYear, startMonth, startDay] = startDate.split('-').map(Number);
    } else {
        const today = new Date();
        startYear = today.getUTCFullYear();
        startMonth = today.getUTCMonth() + 1;
        startDay = today.getUTCDate();
    }

    for (let index = 0; index < installmentsCount; index++) {
        const isLast = index === installmentsCount - 1;

        // A última parcela absorve a diferença exata de centavos residuais
        const installmentCents = isLast
            ? (totalCents - accumulatedCents)
            : baseCentsPerInstallment;

        accumulatedCents += installmentCents;

        // Cálculo da data de vencimento com compensação de dias máximos do mês
        const targetMonthIndex = (startMonth - 1) + index;
        const targetYear = startYear + Math.floor(targetMonthIndex / 12);
        const targetMonth = ((targetMonthIndex % 12) + 12) % 12;

        const maxDaysInTargetMonth = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
        const actualDay = Math.min(startDay, maxDaysInTargetMonth);

        const dueDateObj = new Date(Date.UTC(targetYear, targetMonth, actualDay, 12, 0, 0));
        const dueDateStr = dueDateObj.toISOString().split('T')[0];

        installments.push({
            number: index + 1,
            value: fromCents(installmentCents),
            dueDate: dueDateStr,
            status: 'Pendente',
            paidDate: null
        });
    }

    return installments;
}

/**
 * Retorna o valor fornecido se for um Array legítimo; caso contrário, retorna array vazio [].
 * Proteção determinística e fail-safe contra shapes legados inválidos ({}, string, number, null).
 * NUNCA converte objetos com Object.values ou Array.from para evitar distorção financeira de dados legados.
 *
 * @template T
 * @param {T} value
 * @returns {Array}
 */
export const asArray = (value) => (Array.isArray(value) ? value : []);

/**
 * Calcula o saldo devedor remanescente de uma compra ou cliente.
 * @param {number|string} totalValue - Valor total
 * @param {number|string} valuePaid - Valor já pago
 * @returns {number} Saldo devedor
 */
export function calculateRemainingAmount(totalValue, valuePaid) {
    const totalCents = toCents(totalValue);
    const paidCents = toCents(valuePaid);
    const remainingCents = Math.max(0, totalCents - paidCents);
    return fromCents(remainingCents);
}

/**
 * Determina o status de pagamento baseado no total e no valor pago.
 * @param {number|string} totalValue
 * @param {number|string} valuePaid
 * @returns {'Pago'|'Parcial'|'Pendente'}
 */
export function calculatePaymentStatus(totalValue, valuePaid) {
    const totalCents = toCents(totalValue);
    const paidCents = toCents(valuePaid);

    if (totalCents <= 0) return 'Pago';
    if (paidCents >= totalCents) return 'Pago';
    if (paidCents > 0) return 'Parcial';
    return 'Pendente';
}

/**
 * Calcula o saldo líquido geral: Receitas - (Despesas + Parcelas de Cartão).
 * Utiliza centavos inteiros em toda a redução.
 *
 * @param {Array<{value: number}>} incomes
 * @param {Array<{value: number}>} expenses
 * @param {Array<{value: number}>} cardInstallments
 * @returns {{ totalIncomes: number, totalExpenses: number, totalCardDebt: number, netBalance: number }}
 */
export function calculateNetBalance(incomes = [], expenses = [], cardInstallments = []) {
    const safeIncomes = asArray(incomes);
    const safeExpenses = asArray(expenses);
    const safeCardInstallments = asArray(cardInstallments);

    const incomesCents = safeIncomes.reduce((acc, item) => acc + toCents(item?.value || 0), 0);
    const expensesCents = safeExpenses.reduce((acc, item) => acc + toCents(item?.value || 0), 0);
    const cardDebtCents = safeCardInstallments.reduce((acc, item) => acc + toCents(item?.value || 0), 0);

    const totalOutflowCents = expensesCents + cardDebtCents;
    const netBalanceCents = incomesCents - totalOutflowCents;

    return {
        totalIncomes: fromCents(incomesCents),
        totalExpenses: fromCents(expensesCents),
        totalCardDebt: fromCents(cardDebtCents),
        netBalance: fromCents(netBalanceCents)
    };
}

/**
 * Calcula o consolidado de dívidas, valores pagos e saldo devedor de um cliente/pessoa.
 *
 * @param {Array<Object>} clientLoans - Compras ou parcelas do cliente
 * @param {Array<Object>} [clientExpenses] - Despesas avulsas vinculadas
 * @param {Array<Object>} [clientSubscriptions] - Assinaturas vinculadas
 * @returns {{ totalOwed: number, totalPaid: number, remainingBalance: number }}
 */
export function calculateClientDebt(clientLoans = [], clientExpenses = [], clientSubscriptions = []) {
    const safeLoans = asArray(clientLoans);
    const safeExpenses = asArray(clientExpenses);
    const safeSubs = asArray(clientSubscriptions);

    let totalOwedCents = 0;
    let totalPaidCents = 0;

    // Processa compras/parcelas
    safeLoans.forEach(loan => {
        if (!loan) return;
        const val = toCents(loan.totalValue || loan.value || 0);
        const paid = toCents(loan.paidValue || (loan.status === 'Pago' ? (loan.totalValue || loan.value || 0) : 0));
        totalOwedCents += val;
        totalPaidCents += Math.min(paid, val);
    });

    // Processa despesas avulsas vinculadas
    safeExpenses.forEach(exp => {
        if (!exp) return;
        const val = toCents(exp.value || 0);
        const paid = toCents(exp.paidValue || (exp.status === 'Pago' ? exp.value : 0));
        totalOwedCents += val;
        totalPaidCents += Math.min(paid, val);
    });

    // Processa assinaturas vinculadas
    safeSubs.forEach(sub => {
        if (!sub) return;
        const val = toCents(sub.value || 0);
        const paid = toCents(sub.status === 'Pago' ? sub.value : 0);
        totalOwedCents += val;
        totalPaidCents += Math.min(paid, val);
    });

    const remainingCents = Math.max(0, totalOwedCents - totalPaidCents);

    return {
        totalOwed: fromCents(totalOwedCents),
        totalPaid: fromCents(totalPaidCents),
        remainingBalance: fromCents(remainingCents)
    };
}

/**
 * Calcula o valor total da fatura de um cartão em um mês de competência específico.
 *
 * @param {Array<Object>} loans - Lista de compras com parcelas
 * @param {string} targetMonth - Mês no formato 'YYYY-MM'
 * @param {string} [cardId] - ID do cartão (opcional para filtrar cartão específico)
 * @returns {number} Total da fatura em reais
 */
export function calculateCardInvoiceTotal(loans = [], targetMonth, cardId = null) {
    if (!targetMonth) return 0;
    let totalInvoiceCents = 0;
    const safeLoans = asArray(loans);

    safeLoans.forEach(loan => {
        if (!loan || (cardId && loan.cardId !== cardId)) return;

        const insts = asArray(loan.installments);
        if (insts.length > 0) {
            insts.forEach(inst => {
                if (inst?.dueDate && inst.dueDate.startsWith(targetMonth)) {
                    totalInvoiceCents += toCents(inst.value || 0);
                }
            });
        } else if (loan.dueDate && loan.dueDate.startsWith(targetMonth)) {
            totalInvoiceCents += toCents(loan.totalValue || loan.value || 0);
        }
    });

    return fromCents(totalInvoiceCents);
}

/**
 * Agrupa itens financeiros por categoria e soma os valores com precisão em centavos.
 *
 * @param {Array<Object>} items - Lista de despesas ou receitas
 * @returns {Array<{ category: string, total: number }>} Lista ordenada pelo total decrescente
 */
export function aggregateByCategory(items = []) {
    const categoryMap = {};
    const safeItems = asArray(items);

    safeItems.forEach(item => {
        if (!item) return;
        const cat = (item.category && String(item.category).trim()) || 'Outros';
        const cents = toCents(item.value || 0);
        categoryMap[cat] = (categoryMap[cat] || 0) + cents;
    });

    return Object.entries(categoryMap)
        .map(([category, totalCents]) => ({
            category,
            total: fromCents(totalCents)
        }))
        .sort((a, b) => b.total - a.total);
}

/**
 * Calcula a projeção de compromissos conhecidos mês a mês a partir de um mês de referência.
 * Considera parcelas de compras (incluindo compartilhadas) e assinaturas ativas.
 *
 * @param {Object} params
 * @param {Array<Object>} params.loans - Lista de compras parceladas
 * @param {Array<Object>} [params.subscriptions=[]] - Lista de assinaturas
 * @param {string} params.startMonth - Mês de partida no formato 'YYYY-MM'
 * @param {number} [params.monthsCount=4] - Quantidade de meses a projetar (ex: 4 para M, M+1, M+2, M+3)
 * @returns {Array<{ month: string, label: string, installmentsTotal: number, subscriptionsTotal: number, totalCommitted: number, endingLoansCount: number, reliefAmount: number }>}
 */
export function calculateFutureCommitments({ loans = [], subscriptions = [], startMonth, monthsCount = 4 }) {
    if (!startMonth || typeof startMonth !== 'string' || !startMonth.includes('-')) {
        return [];
    }

    const [startYearNum, startMonthNum] = startMonth.split('-').map(Number);
    if (isNaN(startYearNum) || isNaN(startMonthNum)) return [];

    const safeLoans = asArray(loans);
    const safeSubs = asArray(subscriptions);

    const activeSubsCents = safeSubs
        .filter(s => s && s.isActive !== false && s.status !== 'Inativa')
        .reduce((sum, s) => sum + toCents(s.amount !== undefined ? s.amount : (s.value || 0)), 0);

    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const projection = [];

    for (let i = 0; i < monthsCount; i++) {
        const targetMonthIndex = (startMonthNum - 1) + i;
        const targetYear = startYearNum + Math.floor(targetMonthIndex / 12);
        const targetMonthZeroIndexed = ((targetMonthIndex % 12) + 12) % 12;
        const targetMonthString = `${targetYear}-${String(targetMonthZeroIndexed + 1).padStart(2, '0')}`;
        const monthLabel = `${monthNames[targetMonthZeroIndexed]}/${String(targetYear).slice(2)}`;

        let installmentsCents = 0;
        let endingLoansCount = 0;
        let reliefCents = 0;

        safeLoans.forEach(loan => {
            if (!loan) return;
            const processInstallmentList = (instList, isSharedPortion = false) => {
                const safeInstList = asArray(instList);
                if (safeInstList.length === 0) return;

                const instThisMonth = safeInstList.find(inst => inst?.dueDate && inst.dueDate.startsWith(targetMonthString));
                if (instThisMonth) {
                    installmentsCents += toCents(instThisMonth.value || 0);

                    const lastInst = safeInstList[safeInstList.length - 1];
                    if (lastInst?.dueDate && lastInst.dueDate.startsWith(targetMonthString)) {
                        if (!isSharedPortion) {
                            endingLoansCount += 1;
                            reliefCents += toCents(instThisMonth.value || 0);
                        }
                    }
                }
            };

            if (loan.isShared && loan.sharedDetails) {
                if (loan.sharedDetails.person1) processInstallmentList(loan.sharedDetails.person1.installments, true);
                if (loan.sharedDetails.person2) processInstallmentList(loan.sharedDetails.person2.installments, true);

                const allInsts = asArray(loan.installments);
                if (allInsts.length > 0) {
                    const lastInst = allInsts[allInsts.length - 1];
                    if (lastInst?.dueDate && lastInst.dueDate.startsWith(targetMonthString)) {
                        endingLoansCount += 1;
                        reliefCents += toCents(lastInst.value || 0);
                    }
                }
            } else {
                processInstallmentList(loan.installments, false);
            }
        });

        const totalCommittedCents = installmentsCents + activeSubsCents;

        projection.push({
            month: targetMonthString,
            label: monthLabel,
            installmentsTotal: fromCents(installmentsCents),
            subscriptionsTotal: fromCents(activeSubsCents),
            totalCommitted: fromCents(totalCommittedCents),
            endingLoansCount,
            reliefAmount: fromCents(reliefCents)
        });
    }

    return projection;
}

/**
 * Calcula a curva de descompressão financeira em um determinado horizonte de meses.
 * Identifica o valor mensal total que deixa de ser cobrado e o total de compras finalizadas.
 *
 * @param {Object} params
 * @param {Array<Object>} params.loans - Lista de compras
 * @param {string} params.startMonth - Mês inicial 'YYYY-MM'
 * @param {number} [params.monthsCount=4] - Quantidade de meses
 * @returns {{ totalLoansEnding: number, totalMonthlyRelief: number, timeline: Array<{ month: string, label: string, relief: number, endingCount: number }> }}
 */
export function calculateDebtReliefTimeline({ loans = [], startMonth, monthsCount = 4 }) {
    const safeLoans = asArray(loans);
    const commitments = calculateFutureCommitments({ loans: safeLoans, subscriptions: [], startMonth, monthsCount });

    let totalLoansEnding = 0;
    let totalMonthlyReliefCents = 0;
    const timeline = [];

    commitments.forEach(item => {
        if (item.endingLoansCount > 0) {
            totalLoansEnding += item.endingLoansCount;
            totalMonthlyReliefCents += toCents(item.reliefAmount);
            timeline.push({
                month: item.month,
                label: item.label,
                relief: item.reliefAmount,
                endingCount: item.endingLoansCount
            });
        }
    });

    return {
        totalLoansEnding,
        totalMonthlyRelief: fromCents(totalMonthlyReliefCents),
        timeline
    };
}

/**
 * Consolida os repasses de terceiros (valores que amigos/familiares devem ao titular)
 * para um mês específico e projeta o saldo devedor futuro total por pessoa.
 *
 * Garante proteção estrita contra contagem dupla em compras compartilhadas.
 *
 * @param {Object} params
 * @param {Array<Object>} params.loans - Compras/parcelas
 * @param {Array<Object>} [params.expenses=[]] - Despesas avulsas
 * @param {Array<Object>} [params.subscriptions=[]] - Assinaturas
 * @param {Array<Object>} params.clients - Lista de pessoas cadastradas
 * @param {string} params.targetMonth - Mês no formato 'YYYY-MM'
 * @returns {{
 *   totalReceivableThisMonth: number,
 *   totalPaidThisMonth: number,
 *   totalPendingThisMonth: number,
 *   totalFutureReceivables: number,
 *   byClient: Array<{
 *     clientId: string,
 *     clientName: string,
 *     receivableThisMonth: number,
 *     paidThisMonth: number,
 *     pendingThisMonth: number,
 *     totalFutureRemaining: number,
 *     hasPending: boolean
 *   }>
 * }}
 */
export function calculateConsolidatedClientReceivables({
    loans = [],
    expenses = [],
    subscriptions = [],
    clients = [],
    targetMonth
}) {
    if (!targetMonth) {
        return {
            totalReceivableThisMonth: 0,
            totalPaidThisMonth: 0,
            totalPendingThisMonth: 0,
            totalFutureReceivables: 0,
            byClient: []
        };
    }

    const safeLoans = asArray(loans);
    const safeExpenses = asArray(expenses);
    const safeSubs = asArray(subscriptions);
    const safeClients = asArray(clients);

    let grandTotalReceivableCents = 0;
    let grandTotalPaidCents = 0;
    let grandTotalFutureCents = 0;

    const byClient = safeClients.map(client => {
        if (!client) return { clientId: '', clientName: '', receivableThisMonth: 0, paidThisMonth: 0, pendingThisMonth: 0, totalFutureRemaining: 0, hasPending: false };
        let clientReceivableCents = 0;
        let clientPaidCents = 0;
        let clientFutureRemainingCents = 0;

        // 1. Processar compras (individuais e compartilhadas)
        safeLoans.forEach(loan => {
            if (!loan) return;
            if (loan.isShared && loan.sharedDetails) {
                const isPerson1 = loan.sharedDetails.person1?.clientId === client.id;
                const isPerson2 = loan.sharedDetails.person2?.clientId === client.id;

                if (isPerson1 || isPerson2) {
                    const personDetails = isPerson1 ? loan.sharedDetails.person1 : loan.sharedDetails.person2;
                    const instList = asArray(personDetails?.installments);

                    instList.forEach(inst => {
                        if (!inst) return;
                        const isThisMonth = inst.dueDate && inst.dueDate.startsWith(targetMonth);
                        const instValCents = toCents(inst.value || 0);

                        if (isThisMonth) {
                            clientReceivableCents += instValCents;
                            if (inst.status === 'Pago' || inst.status === 'Paga') {
                                clientPaidCents += instValCents;
                            }
                        } else if (inst.dueDate && inst.dueDate > targetMonth) {
                            if (inst.status !== 'Pago' && inst.status !== 'Paga') {
                                clientFutureRemainingCents += instValCents;
                            }
                        }
                    });
                }
            } else if (loan.clientId === client.id) {
                const instList = asArray(loan.installments);
                if (instList.length > 0) {
                    instList.forEach(inst => {
                        if (!inst) return;
                        const isThisMonth = inst.dueDate && inst.dueDate.startsWith(targetMonth);
                        const instValCents = toCents(inst.value || 0);

                        if (isThisMonth) {
                            clientReceivableCents += instValCents;
                            if (inst.status === 'Pago' || inst.status === 'Paga') {
                                clientPaidCents += instValCents;
                            }
                        } else if (inst.dueDate && inst.dueDate > targetMonth) {
                            if (inst.status !== 'Pago' && inst.status !== 'Paga') {
                                clientFutureRemainingCents += instValCents;
                            }
                        }
                    });
                } else if (loan.dueDate && loan.dueDate.startsWith(targetMonth)) {
                    const totalValCents = toCents(loan.totalValue || loan.value || 0);
                    clientReceivableCents += totalValCents;
                    if (loan.status === 'Pago' || loan.status === 'Paga') {
                        clientPaidCents += totalValCents;
                    }
                }
            }
        });

        // 2. Processar despesas avulsas vinculadas
        safeExpenses.forEach(exp => {
            if (exp && exp.clientId === client.id) {
                const dateStr = typeof exp.date === 'string' ? exp.date : (exp.date?.toDate ? exp.date.toDate().toISOString().substring(0, 10) : (exp.date instanceof Date ? exp.date.toISOString().substring(0, 10) : ''));
                if (dateStr.startsWith(targetMonth)) {
                    const valCents = toCents(exp.value || 0);
                    clientReceivableCents += valCents;
                    if (exp.status === 'Pago' || exp.status === 'Paga') {
                        clientPaidCents += valCents;
                    }
                }
            }
        });

        // 3. Processar assinaturas vinculadas
        safeSubs.forEach(sub => {
            if (sub && sub.clientId === client.id && sub.isActive !== false && sub.status !== 'Inativa') {
                const valCents = toCents(sub.amount !== undefined ? sub.amount : (sub.value || 0));
                clientReceivableCents += valCents;
                if (sub.status === 'Pago' || sub.status === 'Paga') {
                    clientPaidCents += valCents;
                }
            }
        });

        const pendingCents = Math.max(0, clientReceivableCents - clientPaidCents);

        grandTotalReceivableCents += clientReceivableCents;
        grandTotalPaidCents += clientPaidCents;
        grandTotalFutureCents += clientFutureRemainingCents;

        return {
            clientId: client.id,
            clientName: client.name,
            receivableThisMonth: fromCents(clientReceivableCents),
            paidThisMonth: fromCents(clientPaidCents),
            pendingThisMonth: fromCents(pendingCents),
            totalFutureRemaining: fromCents(clientFutureRemainingCents),
            hasPending: pendingCents > 0
        };
    });

    const grandTotalPendingCents = Math.max(0, grandTotalReceivableCents - grandTotalPaidCents);

    return {
        totalReceivableThisMonth: fromCents(grandTotalReceivableCents),
        totalPaidThisMonth: fromCents(grandTotalPaidCents),
        totalPendingThisMonth: fromCents(grandTotalPendingCents),
        totalFutureReceivables: fromCents(grandTotalFutureCents),
        byClient
    };
}

/**
 * Retorna o mês de competência anterior no formato 'YYYY-MM'.
 * Trata corretamente viradas de ano (ex: '2027-01' -> '2026-12').
 *
 * @param {string} monthStr - Mês 'YYYY-MM'
 * @returns {string} Mês anterior 'YYYY-MM'
 */
export function getPreviousMonthString(monthStr) {
    if (!monthStr || typeof monthStr !== 'string' || !monthStr.includes('-')) return '';
    const [year, month] = monthStr.split('-').map(Number);
    if (isNaN(year) || isNaN(month)) return '';

    if (month === 1) {
        return `${year - 1}-12`;
    }
    return `${year}-${String(month - 1).padStart(2, '0')}`;
}

/**
 * Calcula a variação absoluta e percentual entre o valor atual e o anterior.
 * Nunca retorna NaN ou Infinity.
 *
 * @param {number} currentValue - Valor do mês atual
 * @param {number} previousValue - Valor do mês anterior
 * @returns {{ delta: number, percentage: number, direction: 'up'|'down'|'neutral', label: string }}
 */
export function calculateMonthOverMonthDelta(currentValue = 0, previousValue = 0) {
    const curCents = toCents(currentValue || 0);
    const prevCents = toCents(previousValue || 0);
    const deltaCents = curCents - prevCents;
    const delta = fromCents(deltaCents);

    if (prevCents === 0 && curCents === 0) {
        return { delta: 0, percentage: 0, direction: 'neutral', label: '0,0%' };
    }

    if (prevCents === 0 && curCents > 0) {
        return { delta, percentage: 100, direction: 'up', label: '+100,0%' };
    }

    if (prevCents > 0 && curCents === 0) {
        return { delta, percentage: -100, direction: 'down', label: '-100,0%' };
    }

    const percentage = Number(((deltaCents / prevCents) * 100).toFixed(1));
    const direction = percentage > 0 ? 'up' : (percentage < 0 ? 'down' : 'neutral');
    const label = `${percentage > 0 ? '+' : ''}${percentage.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;

    return { delta, percentage, direction, label };
}

/**
 * Calcula o comparativo mensal de métricas-chave entre o mês atual e o anterior.
 * Utiliza apenas os dados em memória já carregados (zero novas leituras no Firestore).
 *
 * @param {Object} params
 * @param {string} params.selectedMonth - Mês atual 'YYYY-MM'
 * @param {Array<Object>} [params.loans=[]] - Compras/faturas
 * @param {Array<Object>} [params.expenses=[]] - Despesas avulsas
 * @param {Array<Object>} [params.subscriptions=[]] - Assinaturas
 * @param {Array<Object>} [params.incomes=[]] - Receitas
 * @returns {{
 *   previousMonth: string,
 *   invoiceDelta: { delta: number, percentage: number, direction: string, label: string },
 *   incomesDelta: { delta: number, percentage: number, direction: string, label: string },
 *   currentInvoiceTotal: number,
 *   previousInvoiceTotal: number
 * }}
 */
export function calculateMonthlyComparisonSummary({
    selectedMonth,
    loans = [],
    expenses = [],
    incomes = []
}) {
    const prevMonth = getPreviousMonthString(selectedMonth);
    if (!prevMonth) {
        const defaultDelta = { delta: 0, percentage: 0, direction: 'neutral', label: '0,0%' };
        return {
            previousMonth: '',
            invoiceDelta: defaultDelta,
            expensesDelta: defaultDelta,
            incomesDelta: defaultDelta,
            currentInvoiceTotal: 0,
            previousInvoiceTotal: 0
        };
    }

    const safeLoans = asArray(loans);
    const safeExpenses = asArray(expenses);
    const safeIncomes = asArray(incomes);

    const curInvoice = calculateCardInvoiceTotal(safeLoans, selectedMonth);
    const prevInvoice = calculateCardInvoiceTotal(safeLoans, prevMonth);
    const invoiceDelta = calculateMonthOverMonthDelta(curInvoice, prevInvoice);

    const curExpensesCents = safeExpenses.filter(exp => {
        if (!exp) return false;
        const dStr = typeof exp.date === 'string' ? exp.date : (exp.date?.toDate ? exp.date.toDate().toISOString().substring(0, 10) : (exp.date instanceof Date ? exp.date.toISOString().substring(0, 10) : ''));
        return dStr.startsWith(selectedMonth);
    }).reduce((sum, exp) => sum + toCents(exp.value || 0), 0);

    const prevExpensesCents = safeExpenses.filter(exp => {
        if (!exp) return false;
        const dStr = typeof exp.date === 'string' ? exp.date : (exp.date?.toDate ? exp.date.toDate().toISOString().substring(0, 10) : (exp.date instanceof Date ? exp.date.toISOString().substring(0, 10) : ''));
        return dStr.startsWith(prevMonth);
    }).reduce((sum, exp) => sum + toCents(exp.value || 0), 0);

    const expensesDelta = calculateMonthOverMonthDelta(fromCents(curExpensesCents), fromCents(prevExpensesCents));

    const curIncomesCents = safeIncomes.filter(inc => {
        if (!inc) return false;
        const dStr = typeof inc.date === 'string' ? inc.date : (inc.date?.toDate ? inc.date.toDate().toISOString().substring(0, 10) : (inc.date instanceof Date ? inc.date.toISOString().substring(0, 10) : ''));
        return dStr.startsWith(selectedMonth);
    }).reduce((sum, inc) => sum + toCents(inc.value || 0), 0);

    const prevIncomesCents = safeIncomes.filter(inc => {
        if (!inc) return false;
        const dStr = typeof inc.date === 'string' ? inc.date : (inc.date?.toDate ? inc.date.toDate().toISOString().substring(0, 10) : (inc.date instanceof Date ? inc.date.toISOString().substring(0, 10) : ''));
        return dStr.startsWith(prevMonth);
    }).reduce((sum, inc) => sum + toCents(inc.value || 0), 0);

    const incomesDelta = calculateMonthOverMonthDelta(fromCents(curIncomesCents), fromCents(prevIncomesCents));

    return {
        previousMonth: prevMonth,
        invoiceDelta,
        expensesDelta,
        incomesDelta,
        currentInvoiceTotal: curInvoice,
        previousInvoiceTotal: prevInvoice
    };
}

/**
 * Motor de Insights Determinísticos do FinControl.
 *
 * Gera no máximo 1 a 3 insights baseados estritamente em cálculos matemáticos puros
 * dos dados existentes. Proibido julgamentos morais, conselhos de investimento ou uso de IA.
 *
 * @param {Object} params
 * @param {string} params.selectedMonth - Mês de competência 'YYYY-MM'
 * @param {Array<Object>} [params.loans=[]] - Compras parceladas
 * @param {Array<Object>} [params.expenses=[]] - Despesas avulsas
 * @param {Array<Object>} [params.subscriptions=[]] - Assinaturas
 * @param {Array<Object>} [params.incomes=[]] - Receitas
 * @param {Array<Object>} [params.clients=[]] - Pessoas cadastradas
 * @param {number} [params.maxInsights=3] - Quantidade máxima a retornar
 * @returns {Array<{ id: string, type: string, priority: number, icon: string, title: string, text: string, level: 'info'|'positive'|'warning' }>}
 */
export function generateDeterministicFinancialInsights({
    selectedMonth,
    loans = [],
    expenses = [],
    subscriptions = [],
    incomes = [],
    clients = [],
    maxInsights = 3
}) {
    if (!selectedMonth) return [];

    const safeLoans = asArray(loans);
    const safeExpenses = asArray(expenses);
    const safeSubs = asArray(subscriptions);
    const safeIncomes = asArray(incomes);
    const safeClients = asArray(clients);

    const candidates = [];

    // 1. Regra de Descompressão (Alívio de Parcelas)
    const relief = calculateDebtReliefTimeline({ loans: safeLoans, startMonth: selectedMonth, monthsCount: 3 });
    if (relief.totalLoansEnding > 0 && relief.totalMonthlyRelief > 0) {
        const countText = relief.totalLoansEnding === 1 ? '1 compra chega' : `${relief.totalLoansEnding} compras chegam`;
        candidates.push({
            id: 'insight-relief',
            type: 'relief',
            priority: 1,
            icon: '🎉',
            title: 'Alívio de Parcelas',
            text: `${countText} ao fim nos próximos meses, liberando ${formatCurrencyDisplay(relief.totalMonthlyRelief)}/mês no seu fluxo.`,
            level: 'positive'
        });
    }

    // 2. Regra de Repasses de Terceiros
    const receivables = calculateConsolidatedClientReceivables({
        loans: safeLoans,
        expenses: safeExpenses,
        subscriptions: safeSubs,
        clients: safeClients,
        targetMonth: selectedMonth
    });
    if (receivables.totalReceivableThisMonth > 0) {
        candidates.push({
            id: 'insight-receivables',
            type: 'receivables',
            priority: 2,
            icon: '👥',
            title: 'Repasses de Terceiros',
            text: `${formatCurrencyDisplay(receivables.totalReceivableThisMonth)} da sua fatura deste mês correspondem a repasses de terceiros.`,
            level: 'info'
        });
    }

    // 3. Regra de Comprometimento de Renda
    const curIncomesCents = safeIncomes.filter(inc => {
        if (!inc) return false;
        const dStr = typeof inc.date === 'string' ? inc.date : (inc.date?.toDate ? inc.date.toDate().toISOString().substring(0, 10) : (inc.date instanceof Date ? inc.date.toISOString().substring(0, 10) : ''));
        return dStr.startsWith(selectedMonth);
    }).reduce((sum, inc) => sum + toCents(inc.value || 0), 0);

    const invoiceTotal = calculateCardInvoiceTotal(safeLoans, selectedMonth);
    const invoiceCents = toCents(invoiceTotal);

    if (curIncomesCents > 0 && invoiceCents > 0) {
        const commitmentPercentage = Math.round((invoiceCents / curIncomesCents) * 100);
        if (commitmentPercentage >= 60) {
            candidates.push({
                id: 'insight-commitment',
                type: 'commitment',
                priority: 3,
                icon: '📊',
                title: 'Comprometimento de Renda',
                text: `Suas faturas comprometem ${commitmentPercentage}% da sua renda cadastrada para este mês.`,
                level: 'warning'
            });
        }
    }

    // 4. Regra de Variação Mensal de Fatura
    const monthlySummary = calculateMonthlyComparisonSummary({ selectedMonth, loans: safeLoans, expenses: safeExpenses, incomes: safeIncomes });
    if (monthlySummary.previousInvoiceTotal > 0 && Math.abs(monthlySummary.invoiceDelta.percentage) >= 15) {
        const isIncrease = monthlySummary.invoiceDelta.direction === 'up';
        candidates.push({
            id: 'insight-invoice-variation',
            type: 'invoice_variation',
            priority: 4,
            icon: isIncrease ? '📈' : '📉',
            title: isIncrease ? 'Variação da Fatura' : 'Redução da Fatura',
            text: `A fatura total ${isIncrease ? 'aumentou' : 'reduziu'} ${Math.abs(monthlySummary.invoiceDelta.percentage).toLocaleString('pt-BR', { minimumFractionDigits: 1 })}% em relação a ${monthlySummary.previousMonth}.`,
            level: isIncrease ? 'warning' : 'positive'
        });
    }

    // 5. Regra de Concentração de Gastos por Categoria
    const monthExpenses = safeExpenses.filter(exp => {
        if (!exp) return false;
        const dStr = typeof exp.date === 'string' ? exp.date : (exp.date?.toDate ? exp.date.toDate().toISOString().substring(0, 10) : (exp.date instanceof Date ? exp.date.toISOString().substring(0, 10) : ''));
        return dStr.startsWith(selectedMonth);
    });

    if (monthExpenses.length >= 3) {
        const totalExpCents = monthExpenses.reduce((sum, exp) => sum + toCents(exp.value || 0), 0);
        if (totalExpCents > 0) {
            const categories = aggregateByCategory(monthExpenses);
            if (categories.length > 0) {
                const topCategory = categories[0];
                const topCategoryCents = toCents(topCategory.total);
                const categoryPercentage = Math.round((topCategoryCents / totalExpCents) * 100);

                if (categoryPercentage >= 40) {
                    candidates.push({
                        id: 'insight-category-concentration',
                        type: 'concentration',
                        priority: 5,
                        icon: '🏷️',
                        title: 'Concentração de Despesas',
                        text: `A categoria "${topCategory.category}" concentra ${categoryPercentage}% das despesas avulsas do mês.`,
                        level: 'info'
                    });
                }
            }
        }
    }

    return candidates
        .sort((a, b) => a.priority - b.priority)
        .slice(0, maxInsights);
}

/**
 * Calcula a inteligência de limite e comprometimento de um cartão no FinControl.
 * Opera estritamente com dados locais cadastrados (centavos inteiros).
 *
 * NOTA SEMÂNTICA: Os valores são estimativas baseadas exclusivamente nos lançamentos do FinControl,
 * e não refletem conexões diretas ou limites bancários reais externos.
 *
 * @param {Object} params
 * @param {Object} params.card - Objeto do cartão ({ id, limit, name, closingDay, dueDay })
 * @param {Array<Object>} [params.loans=[]] - Compras parceladas
 * @param {Array<Object>} [params.expenses=[]] - Despesas avulsas
 * @returns {{
 *   registeredLimit: number,
 *   committedAmount: number,
 *   estimatedAvailable: number,
 *   utilizationPercentage: number,
 *   isHighUtilization: boolean,
 *   utilizationLabel: string
 * }}
 */
export function calculateCardLimitIntelligence({ card, loans = [], expenses = [] }) {
    if (!card) {
        return {
            registeredLimit: 0,
            committedAmount: 0,
            estimatedAvailable: 0,
            utilizationPercentage: 0,
            isHighUtilization: false,
            utilizationLabel: '0,0%'
        };
    }

    const safeLoans = asArray(loans);
    const safeExpenses = asArray(expenses);
    const cardId = card.id;
    const limitCents = toCents(card.limit || 0);

    let committedCents = 0;

    // 1. Processar compras vinculadas ao cartão
    safeLoans.forEach(loan => {
        if (!loan || loan.cardId !== cardId) return;

        if (loan.isShared && loan.sharedDetails) {
            const p1Insts = asArray(loan.sharedDetails.person1?.installments);
            const p2Insts = asArray(loan.sharedDetails.person2?.installments);

            p1Insts.forEach(inst => {
                if (inst && inst.status !== 'Pago' && inst.status !== 'Paga') {
                    committedCents += toCents(inst.value || 0);
                }
            });
            p2Insts.forEach(inst => {
                if (inst && inst.status !== 'Pago' && inst.status !== 'Paga') {
                    committedCents += toCents(inst.value || 0);
                }
            });
        } else {
            const insts = asArray(loan.installments);
            if (insts.length > 0) {
                insts.forEach(inst => {
                    if (inst && inst.status !== 'Pago' && inst.status !== 'Paga') {
                        committedCents += toCents(inst.value || 0);
                    }
                });
            } else if (loan.status !== 'Pago' && loan.status !== 'Paga') {
                committedCents += toCents(loan.balanceDueClient !== undefined ? loan.balanceDueClient : (loan.totalValue || loan.value || 0));
            }
        }
    });

    // 2. Processar despesas avulsas pendentes do cartão
    safeExpenses.forEach(exp => {
        if (exp && exp.cardId === cardId && exp.status !== 'Pago' && exp.status !== 'Paga') {
            committedCents += toCents(exp.value || 0);
        }
    });

    const registeredLimit = fromCents(limitCents);
    const committedAmount = fromCents(committedCents);
    const estimatedAvailable = fromCents(Math.max(0, limitCents - committedCents));

    let utilizationPercentage = 0;
    if (limitCents > 0) {
        utilizationPercentage = Number(((committedCents / limitCents) * 100).toFixed(1));
    }

    const isHighUtilization = utilizationPercentage >= 85;
    const utilizationLabel = `${utilizationPercentage.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;

    return {
        registeredLimit,
        committedAmount,
        estimatedAvailable,
        utilizationPercentage,
        isHighUtilization,
        utilizationLabel
    };
}

/**
 * Motor de Alertas Financeiros Internos do FinControl.
 *
 * Gera alertas determinísticos e objetivos com prioridades e deduplicação.
 * Proibido push notifications, popups intrusivos ou chamadas externas.
 *
 * @param {Object} params
 * @param {string} params.selectedMonth - Mês de competência 'YYYY-MM'
 * @param {Array<Object>} [params.loans=[]] - Compras parceladas
 * @param {Array<Object>} [params.expenses=[]] - Despesas avulsas
 * @param {Array<Object>} [params.subscriptions=[]] - Assinaturas
 * @param {Array<Object>} [params.cards=[]] - Cartões de crédito
 * @param {Array<Object>} [params.clients=[]] - Pessoas cadastradas
 * @param {string} [params.todayStr] - Data atual no formato 'YYYY-MM-DD'
 * @param {Object} [params.notificationSettings={}] - Configurações de notificação
 * @param {number} [params.maxAlerts=3] - Quantidade máxima a retornar
 * @returns {Array<{ id: string, type: string, priority: number, level: 'attention'|'important'|'info'|'positive', title: string, message: string }>}
 */
export function generateFinancialAlerts({
    selectedMonth,
    loans = [],
    expenses = [],
    subscriptions = [],
    cards = [],
    clients = [],
    todayStr,
    notificationSettings = {},
    maxAlerts = 3
}) {
    if (!selectedMonth || typeof selectedMonth !== 'string') return [];

    const safeLoans = asArray(loans);
    const safeExpenses = asArray(expenses);
    const safeSubs = asArray(subscriptions);
    const safeCards = asArray(cards);
    const safeClients = asArray(clients);

    const settings = {
        cardDueEnabled: notificationSettings.cardDueEnabled !== false,
        cardDueDays: Number(notificationSettings.cardDueDays) || 3,
        receivablesEnabled: notificationSettings.receivablesEnabled !== false,
        highLimitEnabled: notificationSettings.highLimitEnabled !== false,
        highLimitThreshold: Number(notificationSettings.highLimitThreshold) || 85,
        subscriptionsEnabled: notificationSettings.subscriptionsEnabled !== false,
        anomaliesEnabled: notificationSettings.anomaliesEnabled !== false
    };

    const today = todayStr || new Date().toISOString().slice(0, 10);
    const [nowYear, nowMonth, nowDay] = today.split('-').map(Number);
    const [selYear, selMonth] = selectedMonth.split('-').map(Number);

    const candidates = [];

    // 1. Alerta de Vencimento de Fatura
    if (settings.cardDueEnabled && selYear === nowYear && selMonth === nowMonth) {
        safeCards.forEach(card => {
            if (!card) return;
            const cardInvoiceTotal = calculateCardInvoiceTotal(safeLoans, selectedMonth, card.id);
            if (cardInvoiceTotal <= 0) return;

            let hasPending = false;
            safeLoans.filter(l => l && l.cardId === card.id).forEach(loan => {
                asArray(loan.installments).forEach(inst => {
                    if (inst && inst.dueDate && inst.dueDate.startsWith(selectedMonth)) {
                        if (inst.status !== 'Pago' && inst.status !== 'Paga') {
                            hasPending = true;
                        }
                    }
                });
            });

            if (!hasPending) return;

            const dueDayNum = Number(card.dueDay);
            const daysUntilDue = dueDayNum - nowDay;

            if (daysUntilDue >= 0 && daysUntilDue <= settings.cardDueDays) {
                const dayText = daysUntilDue === 0 ? 'vence hoje' : (daysUntilDue === 1 ? 'vence amanhã' : `vence em ${daysUntilDue} dias`);
                candidates.push({
                    id: `alert-due-${card.id}`,
                    type: 'card_due',
                    priority: 1,
                    level: 'important',
                    title: `Fatura ${card.name}`,
                    message: `A fatura de ${formatCurrencyDisplay(cardInvoiceTotal)} ${dayText} (dia ${dueDayNum}).`
                });
            }
        });
    }

    // 2. Alerta de Repasse Pendente de Terceiros
    if (settings.receivablesEnabled) {
        const receivables = calculateConsolidatedClientReceivables({
            loans: safeLoans,
            expenses: safeExpenses,
            subscriptions: safeSubs,
            clients: safeClients,
            targetMonth: selectedMonth
        });

        if (receivables.totalPendingThisMonth > 0) {
            const pendingClientsCount = receivables.byClient.filter(c => c.hasPending).length;
            candidates.push({
                id: 'alert-pending-receivables',
                type: 'receivables_pending',
                priority: 2,
                level: 'attention',
                title: 'Repasses Pendentes',
                message: `Há ${formatCurrencyDisplay(receivables.totalPendingThisMonth)} pendente de repasse de ${pendingClientsCount} ${pendingClientsCount === 1 ? 'pessoa' : 'pessoas'} na fatura deste mês.`
            });
        }
    }

    // 3. Alerta de Limite Alto no App (>= threshold % do limite cadastrado)
    if (settings.highLimitEnabled) {
        safeCards.forEach(card => {
            if (!card) return;
            const limitInfo = calculateCardLimitIntelligence({ card, loans: safeLoans, expenses: safeExpenses });
            if (limitInfo.utilizationPercentage >= settings.highLimitThreshold) {
                candidates.push({
                    id: `alert-high-limit-${card.id}`,
                    type: 'high_limit',
                    priority: 3,
                    level: 'attention',
                    title: `Limite do Cartão ${card.name}`,
                    message: `${limitInfo.utilizationLabel} do limite cadastrado está comprometido no FinControl (${formatCurrencyDisplay(limitInfo.committedAmount)} de ${formatCurrencyDisplay(limitInfo.registeredLimit)}).`
                });
            }
        });
    }

    // 4. Alerta de Assinatura Próxima (<= 2 dias)
    if (settings.subscriptionsEnabled && selYear === nowYear && selMonth === nowMonth) {
        safeSubs.filter(s => s && s.isActive !== false && s.status !== 'Inativa').forEach(sub => {
            const subDay = Number(sub.dueDate || sub.dia);
            if (!isNaN(subDay)) {
                const daysUntilSub = subDay - nowDay;
                if (daysUntilSub >= 0 && daysUntilSub <= 2) {
                    const whenText = daysUntilSub === 0 ? 'hoje' : (daysUntilSub === 1 ? 'amanhã' : `em ${daysUntilSub} dias`);
                    const subVal = Number(sub.amount !== undefined ? sub.amount : (sub.value || 0));
                    candidates.push({
                        id: `alert-sub-${sub.id}`,
                        type: 'subscription_due',
                        priority: 4,
                        level: 'info',
                        title: `Assinatura ${sub.name}`,
                        message: `Cobrança recorrente de ${formatCurrencyDisplay(subVal)} agendada para ${whenText} (dia ${subDay}).`
                    });
                }
            }
        });
    }

    // 5. Alerta de Anomalia de Gastos
    if (settings.anomaliesEnabled) {
        const anomalies = detectExpenseAnomalies({ selectedMonth, expenses: safeExpenses, loans: safeLoans });
        anomalies.forEach((anomaly, index) => {
            candidates.push({
                id: `alert-anomaly-${index}`,
                type: 'anomaly',
                priority: 5,
                level: 'attention',
                title: `Anomalia: ${anomaly.category}`,
                message: anomaly.message
            });
        });
    }

    // 6. Alerta de Última Parcela no Mês
    const relief = calculateDebtReliefTimeline({ loans: safeLoans, startMonth: selectedMonth, monthsCount: 1 });
    if (relief.totalLoansEnding > 0) {
        candidates.push({
            id: 'alert-final-installment',
            type: 'final_installment',
            priority: 6,
            level: 'positive',
            title: 'Quitação de Compras',
            message: `${relief.totalLoansEnding} ${relief.totalLoansEnding === 1 ? 'compra está' : 'compras estão'} na última parcela neste mês, aliviando ${formatCurrencyDisplay(relief.totalMonthlyRelief)}/mês no próximo mês.`
        });
    }

    return candidates
        .sort((a, b) => a.priority - b.priority)
        .slice(0, maxAlerts);
}

/**
 * Detecta anomalias determinísticas de gastos por categoria comparando o mês atual contra a média móvel dos últimos 3 meses.
 * Aplica piso absoluto (mínimo R$ 150 de diferença) para evitar alertas em variações pequenas.
 *
 * @param {Object} params
 * @param {string} params.selectedMonth - Mês no formato 'YYYY-MM'
 * @param {Array<Object>} [params.expenses=[]]
 * @param {Array<Object>} [params.loans=[]]
 * @param {number} [params.historicalMonthsCount=3]
 * @param {number} [params.thresholdPercentage=50]
 * @param {number} [params.minimumDifferenceCents=15000]
 * @returns {Array<Object>} Lista de anomalias detectadas
 */
export function detectExpenseAnomalies({
    selectedMonth,
    expenses = [],
    loans = [],
    historicalMonthsCount = 3,
    thresholdPercentage = 50,
    minimumDifferenceCents = 15000
} = {}) {
    if (!selectedMonth || typeof selectedMonth !== 'string') return [];

    const safeExpenses = asArray(expenses);
    const safeLoans = asArray(loans);

    // Obter os meses históricos anteriores (ex: se M = 2026-08 -> 2026-07, 2026-06, 2026-05)
    const prevMonths = [];
    let cur = selectedMonth;
    for (let i = 0; i < historicalMonthsCount; i++) {
        cur = getPreviousMonthString(cur);
        if (cur) prevMonths.push(cur);
    }

    if (prevMonths.length === 0) return [];

    // Função auxiliar para calcular total em centavos por categoria em um mês
    const getCategoryTotalsForMonth = (monthStr) => {
        const catMap = {};

        // Despesas avulsas
        safeExpenses.forEach(exp => {
            if (!exp) return;
            const d = exp.date || exp.data;
            const dStr = typeof d === 'string' ? d : (d?.toDate ? d.toDate().toISOString().slice(0, 10) : (d instanceof Date ? d.toISOString().slice(0, 10) : ''));
            if (dStr.startsWith(monthStr)) {
                const cat = (exp.category && String(exp.category).trim()) || 'Outros';
                const valCents = toCents(exp.value || exp.amount || 0);
                catMap[cat] = (catMap[cat] || 0) + valCents;
            }
        });

        // Parcelas de cartão
        safeLoans.forEach(loan => {
            if (!loan) return;
            const cat = (loan.category && String(loan.category).trim()) || 'Compras Parceladas';
            asArray(loan.installments).forEach(inst => {
                if (inst && inst.dueDate && inst.dueDate.startsWith(monthStr)) {
                    const valCents = toCents(inst.value || 0);
                    catMap[cat] = (catMap[cat] || 0) + valCents;
                }
            });
        });

        return catMap;
    };

    const currentTotals = getCategoryTotalsForMonth(selectedMonth);
    const historicalTotalsList = prevMonths.map(m => getCategoryTotalsForMonth(m));

    const anomalies = [];

    Object.entries(currentTotals).forEach(([category, currentCents]) => {
        // Calcular média histórica dessa categoria nos meses anteriores que tiveram lançamentos
        const historyCentsArray = historicalTotalsList.map(hMap => hMap[category] || 0);
        const totalHistoryCents = historyCentsArray.reduce((acc, c) => acc + c, 0);
        const averageHistoryCents = Math.round(totalHistoryCents / prevMonths.length);

        const diffCents = currentCents - averageHistoryCents;

        // Verifica se a diferença supera o piso absoluto mínimo (ex: R$ 150,00)
        if (diffCents >= minimumDifferenceCents && averageHistoryCents > 0) {
            const percentageIncrease = Number(((diffCents / averageHistoryCents) * 100).toFixed(1));

            if (percentageIncrease >= thresholdPercentage) {
                const currentTotal = fromCents(currentCents);
                const historicalAverage = fromCents(averageHistoryCents);
                const difference = fromCents(diffCents);

                anomalies.push({
                    category,
                    currentTotal,
                    historicalAverage,
                    difference,
                    percentageIncrease,
                    message: `A categoria ${category} atingiu ${formatCurrencyDisplay(currentTotal)} no mês (${percentageIncrease > 0 ? '+' : ''}${percentageIncrease}% acima da média histórica de ${formatCurrencyDisplay(historicalAverage)}).`
                });
            }
        }
    });

    return anomalies.sort((a, b) => b.difference - a.difference);
}

/**
 * Gera um resumo executivo semanal determinístico (últimos 7 dias corridos + próximos 7 dias).
 *
 * @param {Object} params
 * @param {Array<Object>} [params.loans=[]]
 * @param {Array<Object>} [params.expenses=[]]
 * @param {Array<Object>} [params.subscriptions=[]]
 * @param {Array<Object>} [params.incomes=[]]
 * @param {string} [params.todayStr] - Data no formato 'YYYY-MM-DD'
 * @returns {Object} Fatos financeiros agregados da semana
 */
export function generateWeeklyFinancialSummary({
    loans = [],
    expenses = [],
    subscriptions = [],
    incomes = [],
    todayStr
} = {}) {
    const today = todayStr || new Date().toISOString().slice(0, 10);
    const [tY, tM, tD] = today.split('-').map(Number);
    const refDate = new Date(Date.UTC(tY, tM - 1, tD));

    const safeLoans = asArray(loans);
    const safeExpenses = asArray(expenses);
    const safeSubs = asArray(subscriptions);
    const safeIncomes = asArray(incomes);

    // Janela de 7 dias passados (D-6 a D)
    const pastStart = new Date(refDate);
    pastStart.setUTCDate(pastStart.getUTCDate() - 6);
    const pastStartStr = pastStart.toISOString().slice(0, 10);

    // Janela de 7 dias futuros (D+1 a D+7)
    const futureEnd = new Date(refDate);
    futureEnd.setUTCDate(futureEnd.getUTCDate() + 7);
    const futureEndStr = futureEnd.toISOString().slice(0, 10);

    let pastIncomesCents = 0;
    let pastExpensesCents = 0;
    let upcomingInstallmentsCents = 0;
    let upcomingSubscriptionsCents = 0;

    // 1. Receitas nos últimos 7 dias
    safeIncomes.forEach(inc => {
        if (!inc) return;
        const d = inc.date || inc.data;
        if (d && d >= pastStartStr && d <= today) {
            pastIncomesCents += toCents(inc.value || inc.amount || 0);
        }
    });

    // 2. Despesas avulsas nos últimos 7 dias
    safeExpenses.forEach(exp => {
        if (!exp) return;
        const d = exp.date || exp.data;
        if (d && d >= pastStartStr && d <= today) {
            pastExpensesCents += toCents(exp.value || exp.amount || 0);
        }
    });

    // 3. Parcelas de cartão nos próximos 7 dias
    safeLoans.forEach(loan => {
        if (!loan) return;
        const processInst = (inst) => {
            if (inst && inst.dueDate && inst.dueDate >= today && inst.dueDate <= futureEndStr) {
                if (inst.status !== 'Pago' && inst.status !== 'Paga') {
                    upcomingInstallmentsCents += toCents(inst.value || 0);
                }
            }
        };

        if (loan.isShared && loan.sharedDetails) {
            if (loan.sharedDetails.person1) asArray(loan.sharedDetails.person1.installments).forEach(processInst);
            if (loan.sharedDetails.person2) asArray(loan.sharedDetails.person2.installments).forEach(processInst);
        } else {
            asArray(loan.installments).forEach(processInst);
        }
    });

    // 4. Assinaturas nos próximos 7 dias
    const currentMonthPrefix = today.slice(0, 7);
    safeSubs.forEach(sub => {
        if (!sub || sub.isActive === false || sub.status === 'Inativa') return;
        const subDay = parseInt(sub.dueDate || sub.dia || 1, 10);
        const subDateStr = `${currentMonthPrefix}-${String(subDay).padStart(2, '0')}`;

        if (subDateStr >= today && subDateStr <= futureEndStr) {
            const subVal = Number(sub.amount !== undefined ? sub.amount : (sub.value || 0));
            upcomingSubscriptionsCents += toCents(subVal);
        }
    });

    const pastNetCents = pastIncomesCents - pastExpensesCents;
    const upcomingCommitmentsCents = upcomingInstallmentsCents + upcomingSubscriptionsCents;

    const relief = calculateDebtReliefTimeline({ loans: safeLoans, startMonth: currentMonthPrefix, monthsCount: 1 });

    return {
        window: {
            past: { start: pastStartStr, end: today },
            upcoming: { start: today, end: futureEndStr }
        },
        pastWeekIncomes: fromCents(pastIncomesCents),
        pastWeekExpenses: fromCents(pastExpensesCents),
        pastWeekNet: fromCents(pastNetCents),
        upcomingInstallments: fromCents(upcomingInstallmentsCents),
        upcomingSubscriptions: fromCents(upcomingSubscriptionsCents),
        upcomingCommitmentsTotal: fromCents(upcomingCommitmentsCents),
        endingLoansSoonCount: relief.totalLoansEnding,
        hasUpcomingCommitments: upcomingCommitmentsCents > 0
    };
}

/**
 * Gera um resumo executivo mensal determinístico combinando comparativo MoM,
 * top categorias, repasses de terceiros e alívio de fluxo de caixa.
 *
 * @param {Object} params
 * @param {string} params.selectedMonth - Mês no formato 'YYYY-MM'
 * @param {Array<Object>} [params.loans=[]]
 * @param {Array<Object>} [params.expenses=[]]
 * @param {Array<Object>} [params.subscriptions=[]]
 * @param {Array<Object>} [params.incomes=[]]
 * @param {Array<Object>} [params.clients=[]]
 * @returns {Object} Fatos consolidados do mês
 */
export function generateMonthlyFinancialSummary({
    selectedMonth,
    loans = [],
    expenses = [],
    subscriptions = [],
    incomes = [],
    clients = []
}) {
    const monthStr = selectedMonth || new Date().toISOString().slice(0, 7);

    const safeLoans = asArray(loans);
    const safeExpenses = asArray(expenses);
    const safeSubs = asArray(subscriptions);
    const safeIncomes = asArray(incomes);
    const safeClients = asArray(clients);

    // Comparativo Mensal vs Mês Anterior
    const comparison = calculateMonthlyComparisonSummary({
        selectedMonth: monthStr,
        loans: safeLoans,
        expenses: safeExpenses,
        incomes: safeIncomes
    });

    const curInvoice = calculateCardInvoiceTotal(safeLoans, monthStr);
    const curExpensesCents = safeExpenses.filter(exp => {
        if (!exp) return false;
        const dStr = typeof exp.date === 'string' ? exp.date : (exp.date?.toDate ? exp.date.toDate().toISOString().substring(0, 10) : (exp.date instanceof Date ? exp.date.toISOString().substring(0, 10) : ''));
        return dStr.startsWith(monthStr);
    }).reduce((sum, exp) => sum + toCents(exp.value || 0), 0);
    const curExpenses = fromCents(curExpensesCents);

    const curIncomesCents = safeIncomes.filter(inc => {
        if (!inc) return false;
        const dStr = typeof inc.date === 'string' ? inc.date : (inc.date?.toDate ? inc.date.toDate().toISOString().substring(0, 10) : (inc.date instanceof Date ? inc.date.toISOString().substring(0, 10) : ''));
        return dStr.startsWith(monthStr);
    }).reduce((sum, inc) => sum + toCents(inc.value || 0), 0);
    const curIncomes = fromCents(curIncomesCents);
    const netBalance = fromCents(curIncomesCents - (curExpensesCents + toCents(curInvoice)));

    // Top Categorias do Mês
    const monthExpenses = safeExpenses.filter(e => {
        if (!e) return false;
        const d = e.date || e.data;
        const dStr = typeof d === 'string' ? d : (d?.toDate ? d.toDate().toISOString().substring(0, 10) : (d instanceof Date ? d.toISOString().substring(0, 10) : ''));
        return dStr.startsWith(monthStr);
    });
    const monthInstallments = safeLoans.flatMap(l => {
        if (!l) return [];
        return asArray(l.installments)
            .filter(i => i && i.dueDate && i.dueDate.startsWith(monthStr))
            .map(i => ({ category: l.category || 'Compras Parceladas', value: i.value }));
    });
    const combinedMonthItems = [...monthExpenses, ...monthInstallments];

    const categoryBreakdown = aggregateByCategory(combinedMonthItems);
    const totalOutflow = curExpenses + curInvoice;

    const topCategoryItem = categoryBreakdown.length > 0 ? categoryBreakdown[0] : null;
    const topCategory = topCategoryItem ? {
        name: topCategoryItem.category,
        amount: topCategoryItem.total,
        percentage: totalOutflow > 0 ? Math.round((topCategoryItem.total / totalOutflow) * 100) : 0
    } : null;

    // Alívio de Compras Finalizadas
    const relief = calculateDebtReliefTimeline({
        loans: safeLoans,
        startMonth: monthStr,
        monthsCount: 1
    });

    // Repasses de Terceiros
    const repasses = calculateConsolidatedClientReceivables({
        loans: safeLoans,
        expenses: safeExpenses,
        subscriptions: safeSubs,
        clients: safeClients,
        targetMonth: monthStr
    });

    return {
        competence: monthStr,
        summary: {
            totalIncome: curIncomes,
            totalInvoice: curInvoice,
            totalExpenses: curExpenses,
            netBalance
        },
        deltas: {
            invoiceDelta: comparison.invoiceDelta,
            expensesDelta: comparison.expensesDelta,
            incomesDelta: comparison.incomesDelta
        },
        topCategory,
        repasses: {
            totalReceivable: repasses.totalReceivableThisMonth,
            totalPaid: repasses.totalPaidThisMonth,
            totalPending: repasses.totalPendingThisMonth,
            hasPending: repasses.totalPendingThisMonth > 0
        },
        endingPurchases: {
            count: relief.totalLoansEnding,
            reliefAmount: relief.totalMonthlyRelief
        }
    };
}

/**
 * Calcula o progresso de orçamentos (budgets) por categoria para o mês selecionado.
 *
 * @param {Object} params
 * @param {Object} [params.budgets={}] - Mapa de limites por categoria { [categoria]: limiteEmReais }
 * @param {Array<Object>} [params.expenses=[]] - Despesas avulsas
 * @param {Array<Object>} [params.loans=[]] - Compras/faturas
 * @param {string} params.selectedMonth - Mês no formato 'YYYY-MM'
 * @returns {Array<{ category: string, budgetLimit: number, spent: number, remaining: number, percentage: number, status: 'normal'|'warning'|'exceeded' }>}
 */
export function calculateCategoryBudgetsProgress({
    budgets = {},
    expenses = [],
    loans = [],
    selectedMonth
} = {}) {
    if (!selectedMonth || typeof selectedMonth !== 'string' || !budgets || typeof budgets !== 'object') {
        return [];
    }

    const monthStr = selectedMonth;
    const safeExpenses = asArray(expenses);
    const safeLoans = asArray(loans);

    // 1. Somar gastos por categoria no mês selecionado
    const categorySpentMap = {};

    safeExpenses.forEach(exp => {
        if (!exp) return;
        const d = exp.date || exp.data;
        const dStr = typeof d === 'string' ? d : (d?.toDate ? d.toDate().toISOString().slice(0, 10) : (d instanceof Date ? d.toISOString().slice(0, 10) : ''));
        if (dStr.startsWith(monthStr)) {
            const cat = (exp.category && String(exp.category).trim()) || 'Outros';
            const valCents = toCents(exp.value || exp.amount || 0);
            categorySpentMap[cat] = (categorySpentMap[cat] || 0) + valCents;
        }
    });

    safeLoans.forEach(loan => {
        if (!loan) return;
        const cat = (loan.category && String(loan.category).trim()) || 'Compras Parceladas';
        asArray(loan.installments).forEach(inst => {
            if (inst && inst.dueDate && inst.dueDate.startsWith(monthStr)) {
                const valCents = toCents(inst.value || 0);
                categorySpentMap[cat] = (categorySpentMap[cat] || 0) + valCents;
            }
        });
    });

    // 2. Mapear cada categoria que possui orçamento definido
    const results = [];

    Object.entries(budgets).forEach(([category, limitVal]) => {
        const limit = Number(limitVal);
        if (isNaN(limit) || limit <= 0) return;

        const limitCents = toCents(limit);
        const spentCents = categorySpentMap[category] || 0;
        const spent = fromCents(spentCents);
        const remainingCents = limitCents - spentCents;
        const remaining = fromCents(Math.max(0, remainingCents));
        const percentage = limitCents > 0 ? Number(((spentCents / limitCents) * 100).toFixed(1)) : 0;

        let status = 'normal';
        if (percentage >= 100) {
            status = 'exceeded';
        } else if (percentage >= 80) {
            status = 'warning';
        }

        results.push({
            category,
            budgetLimit: limit,
            spent,
            remaining,
            percentage,
            status
        });
    });

    return results.sort((a, b) => b.percentage - a.percentage);
}

// Alias para compatibilidade retroativa
export const detectCategorySpendingAnomalies = detectExpenseAnomalies;

/**
 * Calcula a data de vencimento da fatura do cartão para uma transação ou cobrança.
 * Regra canônica do produto:
 * - Se card, closingDay ou dueDay estiverem ausentes: retorna a própria data de transação.
 * - Se closingDay < dueDay: se dia da transação >= closingDay, avança para o próximo mês.
 * - Se closingDay >= dueDay: se transação >= data de fechamento no mesmo mês, avança 2 meses; senão avança 1 mês.
 * - Trata virada de ano e compensa dias de meses mais curtos (ex: 28/29 em Fev, 30 em Abr).
 *
 * @param {Date|string} transactionDate
 * @param {Object} card - Objeto de cartão com closingDay e dueDay
 * @returns {Date} Data de vencimento da fatura em UTC
 */
export function calculateInvoiceDueDate(transactionDate, card) {
    if (!transactionDate) return null;
    let dateObj;
    if (transactionDate instanceof Date) {
        dateObj = transactionDate;
    } else if (typeof transactionDate === 'string') {
        dateObj = new Date(transactionDate.includes('T') ? transactionDate : `${transactionDate}T12:00:00Z`);
    } else {
        return transactionDate;
    }

    if (isNaN(dateObj.getTime())) return transactionDate;
    if (!card || !card.closingDay || !card.dueDay) return dateObj;

    const closingDay = parseInt(card.closingDay, 10);
    const dueDay = parseInt(card.dueDay, 10);
    if (isNaN(closingDay) || isNaN(dueDay)) return dateObj;

    let dueMonth = dateObj.getUTCMonth();
    let dueYear = dateObj.getUTCFullYear();

    if (closingDay < dueDay) {
        if (dateObj.getUTCDate() >= closingDay) {
            dueMonth += 1;
        }
    } else {
        const closingDate = new Date(Date.UTC(dateObj.getUTCFullYear(), dateObj.getUTCMonth(), closingDay));
        if (dateObj >= closingDate) {
            dueMonth += 2;
        } else {
            dueMonth += 1;
        }
    }

    if (dueMonth > 11) {
        dueYear += Math.floor(dueMonth / 12);
        dueMonth %= 12;
    }

    // Compensa dias em meses mais curtos (Fevereiro 28/29, meses de 30 dias)
    const maxDaysInDueMonth = new Date(Date.UTC(dueYear, dueMonth + 1, 0)).getUTCDate();
    const actualDueDay = Math.min(dueDay, maxDaysInDueMonth);

    return new Date(Date.UTC(dueYear, dueMonth, actualDueDay));
}

/**
 * Mapeia o status do domínio ('Pago' | 'Parcial' | 'Pendente') para o status persistido do documento loan.
 * Preserva compatibilidade total com o modelo de dados existente ('Pago Total' | 'Pago Parcial' | 'Pendente').
 *
 * @param {'Pago'|'Parcial'|'Pendente'} domainStatus
 * @returns {'Pago Total'|'Pago Parcial'|'Pendente'}
 */
export function mapDomainStatusToLoanStatus(domainStatus) {
    if (domainStatus === 'Pago') return 'Pago Total';
    if (domainStatus === 'Parcial') return 'Pago Parcial';
    return 'Pendente';
}

/**
 * Calcula o total e o status de pendência de uma fatura de cartão em um mês de competência específico ('YYYY-MM').
 * Opera 100% em centavos inteiros para prevenir drift de ponto flutuante.
 *
 * @param {Object} params
 * @param {Object} params.card - Cartão com id, closingDay, dueDay
 * @param {string} params.selectedMonth - Mês no formato 'YYYY-MM'
 * @param {Array<Object>} [params.loans] - Compras/empréstimos (normais e compartilhados)
 * @param {Array<Object>} [params.expenses] - Despesas vinculadas a cartões
 * @param {Array<Object>} [params.subscriptions] - Assinaturas vinculadas a cartões
 * @param {Array<Object>} [params.paidSubscriptions] - Registro de assinaturas pagas
 * @returns {{ total: number, isPending: boolean }}
 */
export function calculateCardInvoiceDetails({
    card,
    selectedMonth,
    loans = [],
    expenses = [],
    subscriptions = [],
    paidSubscriptions = []
}) {
    if (!card || !card.id || !selectedMonth || typeof selectedMonth !== 'string') {
        return { total: 0, isPending: false };
    }

    const [filterYear, filterMonth] = selectedMonth.split('-').map(Number);
    if (isNaN(filterYear) || isNaN(filterMonth)) {
        return { total: 0, isPending: false };
    }

    const safeLoans = asArray(loans);
    const safeExpenses = asArray(expenses);
    const safeSubscriptions = asArray(subscriptions);
    const safePaidSubs = asArray(paidSubscriptions);

    let totalCents = 0;
    let isInvoicePending = false;

    // 1. Parcelas de compras (normais e compartilhadas)
    safeLoans.forEach(loan => {
        if (!loan || loan.cardId !== card.id) return;

        const processInstallments = (installments) => {
            if (!Array.isArray(installments)) return;
            installments.forEach(inst => {
                if (!inst || !inst.dueDate) return;
                const instDate = new Date(inst.dueDate + (inst.dueDate.includes('T') ? '' : 'T00:00:00Z'));
                if (isNaN(instDate.getTime())) return;

                if (instDate.getUTCFullYear() === filterYear && instDate.getUTCMonth() + 1 === filterMonth) {
                    totalCents += toCents(inst.value || 0);
                    if (inst.status !== 'Paga') {
                        isInvoicePending = true;
                    }
                }
            });
        };

        if (loan.isShared && loan.sharedDetails) {
            if (loan.sharedDetails.person1) processInstallments(loan.sharedDetails.person1.installments);
            if (loan.sharedDetails.person2) processInstallments(loan.sharedDetails.person2.installments);
        } else {
            processInstallments(loan.installments);
        }
    });

    // 2. Despesas avulsas atribuídas ao cartão
    safeExpenses.forEach(expense => {
        if (!expense || expense.cardId !== card.id) return;
        const rawDate = expense.date?.toDate ? expense.date.toDate() : (expense.date instanceof Date ? expense.date : new Date(expense.date + (typeof expense.date === 'string' && !expense.date.includes('T') ? 'T00:00:00Z' : '')));
        if (isNaN(rawDate.getTime())) return;

        const relevantDate = calculateInvoiceDueDate(rawDate, card);
        if (relevantDate.getUTCFullYear() === filterYear && relevantDate.getUTCMonth() + 1 === filterMonth) {
            totalCents += toCents(expense.value || 0);
            if (expense.status !== 'Paga') {
                isInvoicePending = true;
            }
        }
    });

    // 3. Assinaturas ativas no cartão com competência de fatura
    const addedSubKeys = new Set();
    safeSubscriptions.forEach(sub => {
        if (!sub || sub.cardId !== card.id || !sub.isActive) return;
        const subDueDay = parseInt(sub.dueDate, 10) || 1;

        [-1, 0].forEach(monthOffset => {
            const chargeDate = new Date(Date.UTC(filterYear, filterMonth - 1 + monthOffset, subDueDay));
            const invoiceDueDate = calculateInvoiceDueDate(chargeDate, card);

            if (invoiceDueDate.getUTCFullYear() === filterYear && invoiceDueDate.getUTCMonth() + 1 === filterMonth) {
                const uniqueKey = `${sub.id}-${chargeDate.toISOString().slice(0, 10)}`;
                if (!addedSubKeys.has(uniqueKey)) {
                    totalCents += toCents(sub.amount || 0);
                    const isPaid = safePaidSubs.some(ps => ps && ps.subscriptionId === sub.id && ps.month === selectedMonth);
                    if (!isPaid) {
                        isInvoicePending = true;
                    }
                    addedSubKeys.add(uniqueKey);
                }
            }
        });
    });

    return {
        total: fromCents(totalCents),
        isPending: isInvoicePending
    };
}

/**
 * Calcula o resumo financeiro consolidado de um cliente para o relatório financeiro individual.
 * Opera 100% em centavos inteiros em todas as reduções.
 *
 * @param {Object} params
 * @param {string} params.clientId - ID do cliente
 * @param {Array<Object>} [params.loans] - Lista completa de compras
 * @param {Array<Object>} [params.expenses] - Lista de despesas
 * @param {Array<Object>} [params.subscriptions] - Lista de assinaturas
 * @param {Date|string} [params.referenceDate] - Data de referência (mês atual)
 * @returns {Object} Resumo com monthlyInvoice, monthlySubscriptions, monthlyExpenses, monthlySpendingByCategory, futureInstallments, openLoans, totalDebt
 */
export function calculateClientFinancialReportSummary({
    clientId,
    loans = [],
    expenses = [],
    subscriptions = [],
    referenceDate = new Date()
}) {
    if (!clientId) {
        return {
            monthlyInvoice: 0,
            monthlySubscriptions: 0,
            monthlyExpenses: 0,
            monthlySpendingByCategory: {},
            futureInstallments: {},
            openLoans: [],
            totalDebt: 0
        };
    }

    const refDate = referenceDate instanceof Date
        ? referenceDate
        : new Date(typeof referenceDate === 'string' && !referenceDate.includes('T') ? `${referenceDate}T12:00:00Z` : referenceDate);

    const currentMonth = refDate.getMonth();
    const currentYear = refDate.getFullYear();

    const safeLoans = asArray(loans);
    const safeExpenses = asArray(expenses);
    const safeSubscriptions = asArray(subscriptions);

    // Filtra compras do cliente (normais ou compartilhadas como person1 ou person2)
    const clientLoans = safeLoans.filter(loan => {
        if (!loan) return false;
        if (loan.isShared) {
            return loan.sharedDetails?.person1?.clientId === clientId || loan.sharedDetails?.person2?.clientId === clientId;
        }
        return loan.clientId === clientId;
    });

    const clientExpenses = safeExpenses.filter(exp => exp && exp.clientId === clientId);
    const clientSubscriptions = safeSubscriptions.filter(sub => sub && sub.clientId === clientId);

    // 1. Parcelas do mês atual
    const monthlyInstallments = clientLoans.flatMap(loan => {
        let installments = [];
        if (loan.isShared) {
            if (loan.sharedDetails?.person1?.clientId === clientId) installments = loan.sharedDetails.person1.installments;
            else if (loan.sharedDetails?.person2?.clientId === clientId) installments = loan.sharedDetails.person2.installments;
        } else {
            installments = loan.installments;
        }
        return Array.isArray(installments) ? installments : [];
    }).filter(inst => {
        if (!inst || !inst.dueDate) return false;
        const dueDate = new Date(inst.dueDate + (inst.dueDate.includes('T') ? '' : 'T00:00:00'));
        return !isNaN(dueDate.getTime()) && dueDate.getMonth() === currentMonth && dueDate.getFullYear() === currentYear;
    });

    // 2. Despesas do mês atual
    const monthlyExpensesList = clientExpenses.filter(exp => {
        if (!exp || !exp.date) return false;
        const expDate = exp.date?.toDate ? exp.date.toDate() : (exp.date instanceof Date ? exp.date : new Date(exp.date + (typeof exp.date === 'string' && !exp.date.includes('T') ? 'T00:00:00' : '')));
        return !isNaN(expDate.getTime()) && expDate.getMonth() === currentMonth && expDate.getFullYear() === currentYear;
    });

    // Somas do mês em centavos
    const monthlyLoansCents = monthlyInstallments.reduce((sum, inst) => sum + toCents(inst?.value || 0), 0);
    const monthlyExpensesCents = monthlyExpensesList.reduce((sum, exp) => sum + toCents(exp?.value || 0), 0);
    const monthlySubscriptionsCents = clientSubscriptions.filter(sub => sub?.isActive).reduce((sum, sub) => sum + toCents(sub?.amount || 0), 0);

    // 3. Gastos por categoria em centavos
    const categoryCents = {};
    monthlyExpensesList.forEach(exp => {
        const category = exp.category || 'Outros';
        categoryCents[category] = (categoryCents[category] || 0) + toCents(exp.value || 0);
    });

    if (monthlyLoansCents > 0) {
        categoryCents['Compras Parceladas'] = (categoryCents['Compras Parceladas'] || 0) + monthlyLoansCents;
    }

    if (monthlySubscriptionsCents > 0) {
        categoryCents['Assinaturas'] = (categoryCents['Assinaturas'] || 0) + monthlySubscriptionsCents;
    }

    const monthlySpendingByCategory = {};
    Object.entries(categoryCents).forEach(([cat, cents]) => {
        monthlySpendingByCategory[cat] = fromCents(cents);
    });

    // 4. Próximas parcelas a vencer (sua parte) em centavos
    const futureInstallmentsCents = {};
    clientLoans.forEach(loan => {
        let installmentsToProcess = [];
        if (loan.isShared) {
            if (loan.sharedDetails?.person1?.clientId === clientId) installmentsToProcess = loan.sharedDetails.person1.installments;
            else if (loan.sharedDetails?.person2?.clientId === clientId) installmentsToProcess = loan.sharedDetails.person2.installments;
        } else {
            installmentsToProcess = loan.installments;
        }

        if (Array.isArray(installmentsToProcess)) {
            installmentsToProcess.forEach(inst => {
                if (inst && (inst.status === 'Pendente' || inst.status === 'Atrasado')) {
                    if (!inst.dueDate) return;
                    const dueDate = new Date(inst.dueDate + (inst.dueDate.includes('T') ? '' : 'T00:00:00'));
                    if (isNaN(dueDate.getTime())) return;
                    const monthYear = `${dueDate.toLocaleString('pt-BR', { month: 'long' })} de ${dueDate.getFullYear()}`;
                    futureInstallmentsCents[monthYear] = (futureInstallmentsCents[monthYear] || 0) + toCents(inst.value || 0);
                }
            });
        }
    });

    const futureInstallments = {};
    Object.entries(futureInstallmentsCents).forEach(([my, cents]) => {
        futureInstallments[my] = fromCents(cents);
    });

    // 5. Compras em aberto e Saldo devedor total em centavos
    const openLoans = [];
    let totalDebtCents = 0;

    clientLoans.forEach(loan => {
        let balanceDueForClient = 0;
        let statusForClient = '';

        if (loan.isShared) {
            if (loan.sharedDetails?.person1?.clientId === clientId) {
                balanceDueForClient = loan.sharedDetails.person1.balanceDue || 0;
                statusForClient = loan.sharedDetails.person1.statusPayment;
            } else if (loan.sharedDetails?.person2?.clientId === clientId) {
                balanceDueForClient = loan.sharedDetails.person2.balanceDue || 0;
                statusForClient = loan.sharedDetails.person2.statusPayment;
            }
        } else {
            balanceDueForClient = loan.balanceDueClient || 0;
            statusForClient = loan.statusPaymentClient;
        }

        if (statusForClient !== 'Pago Total') {
            const balCents = toCents(balanceDueForClient);
            openLoans.push({ ...loan, balanceDueClient: fromCents(balCents) });
            totalDebtCents += balCents;
        }
    });

    return {
        monthlyInvoice: fromCents(monthlyLoansCents + monthlyExpensesCents),
        monthlySubscriptions: fromCents(monthlySubscriptionsCents),
        monthlyExpenses: fromCents(monthlyExpensesCents),
        monthlySpendingByCategory,
        futureInstallments,
        openLoans,
        totalDebt: fromCents(totalDebtCents)
    };
}
