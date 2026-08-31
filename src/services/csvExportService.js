import { asArray } from './financialService';

// src/services/csvExportService.js

/**
 * Utilitário de Exportação de Dados Financeiros em formato CSV Brasileiro (Compatível com Excel/LibreOffice).
 * 
 * Regras do formato Brasileiro:
 * 1. UTF-8 com BOM (\uFEFF) para evitar corrupção de acentuação no Excel.
 * 2. Separador ponto-e-vírgula (;).
 * 3. Formatação monetária com vírgula decimal (ex: 1500,50).
 * 4. Tratamento e escape de aspas duplas ("").
 */

/**
 * Escapa uma string para inclusão segura em célula CSV.
 * @param {string|number|null|undefined} value
 * @returns {string}
 */
export function escapeCsvField(value) {
    if (value === null || value === undefined) return '""';
    const stringValue = String(value);
    // Se contiver aspas duplas, ponto-e-vírgula ou quebras de linha, colocar entre aspas e dobrar as aspas existentes
    if (stringValue.includes('"') || stringValue.includes(';') || stringValue.includes('\n') || stringValue.includes('\r')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return `"${stringValue}"`;
}

/**
 * Formata um valor numérico para o padrão de número decimal brasileiro em CSV.
 * @param {number} value
 * @returns {string} Ex: 1250.75 -> "1250,75"
 */
export function formatCsvCurrency(value) {
    if (typeof value !== 'number' || isNaN(value)) return '0,00';
    return value.toFixed(2).replace('.', ',');
}

/**
 * Gera o conteúdo CSV de transações financeiras consolidadas.
 * 
 * @param {Array<Object>} transactions
 * @returns {string} Conteúdo CSV com BOM UTF-8
 */
export function generateTransactionsCsv(transactions = []) {
    const safeTransactions = asArray(transactions);
    const headers = [
        'Tipo',
        'Data',
        'Descrição',
        'Categoria',
        'Pessoa/Cliente',
        'Forma de Pagamento',
        'Parcela',
        'Valor (R$)',
        'Status'
    ];

    const rows = safeTransactions.map(item => {
        if (!item) return '';
        const itemType = item.type || (item.installmentsCount ? 'Compra Parcelada' : (item.amount !== undefined ? 'Assinatura' : 'Despesa'));
        const itemDate = item.dueDate || (item.date instanceof Date ? item.date.toISOString().slice(0, 10) : (item.date || ''));
        const itemDesc = item.description || item.name || 'Sem Descrição';
        const itemCat = item.category || 'Geral';
        const itemPerson = item.personName || item.clientName || '-';
        const itemPayment = item.cardName || 'Dinheiro/Pix';
        const itemInstallment = item.currentInstallment ? `${item.currentInstallment}/${item.totalInstallments}` : '-';
        const itemVal = item.value !== undefined ? item.value : (item.amount !== undefined ? item.amount : 0);
        const itemStatus = item.currentStatus || item.status || 'Pendente';

        return [
            escapeCsvField(itemType),
            escapeCsvField(itemDate),
            escapeCsvField(itemDesc),
            escapeCsvField(itemCat),
            escapeCsvField(itemPerson),
            escapeCsvField(itemPayment),
            escapeCsvField(itemInstallment),
            escapeCsvField(formatCsvCurrency(itemVal)),
            escapeCsvField(itemStatus)
        ].join(';');
    });

    return '\uFEFF' + [headers.map(escapeCsvField).join(';'), ...rows].join('\r\n');
}

/**
 * Dispara o download de um arquivo CSV no navegador do usuário de forma segura.
 * 
 * @param {string} csvContent - Conteúdo CSV com BOM
 * @param {string} filename - Nome do arquivo a ser baixado
 */
export function downloadCsvFile(csvContent, filename = 'fincontrol-extrato.csv') {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/**
 * Gera o relatório anual financeiro em CSV consolidando todas as receitas, despesas, parcelas e assinaturas.
 * 
 * @param {Object} params
 * @param {number|string} params.targetYear - Ano de competência (ex: 2026)
 * @param {Array<Object>} [params.loans=[]] - Compras parceladas
 * @param {Array<Object>} [params.expenses=[]] - Despesas avulsas
 * @param {Array<Object>} [params.subscriptions=[]] - Assinaturas
 * @param {Array<Object>} [params.incomes=[]] - Receitas
 * @param {Array<Object>} [params.cards=[]] - Cartões de crédito
 * @param {Array<Object>} [params.clients=[]] - Pessoas cadastradas
 * @returns {string} Conteúdo do arquivo CSV com BOM UTF-8
 */
export function generateAnnualReportCsv({
    targetYear,
    loans = [],
    expenses = [],
    subscriptions = [],
    incomes = [],
    cards = [],
    clients = []
}) {
    const yearStr = String(targetYear || new Date().getFullYear());
    const safeCards = asArray(cards);
    const safeClients = asArray(clients);
    const safeLoans = asArray(loans);
    const safeExpenses = asArray(expenses);
    const safeSubs = asArray(subscriptions);
    const safeIncomes = asArray(incomes);

    const cardMap = new Map(safeCards.map(c => [c?.id, c?.name]));
    const clientMap = new Map(safeClients.map(c => [c?.id, c?.name]));

    let totalIncomesCents = 0;
    let totalExpensesCents = 0;
    let totalCardInstallmentsCents = 0;
    let totalSubscriptionsCents = 0;

    const itemizedRows = [];

    // 1. Processar Receitas do Ano
    safeIncomes.forEach(inc => {
        if (!inc) return;
        const dateStr = typeof inc.date === 'string' ? inc.date : (inc.date?.toDate ? inc.date.toDate().toISOString().slice(0, 10) : '');
        if (dateStr.startsWith(yearStr)) {
            const valCents = Math.round(Number(inc.value || 0) * 100);
            totalIncomesCents += valCents;
            itemizedRows.push({
                data: dateStr,
                competencia: dateStr.slice(0, 7),
                tipo: 'Receita',
                descricao: inc.description || 'Receita',
                categoria: inc.category || 'Renda',
                pessoa: '-',
                formaPagamento: 'Pix/Conta',
                parcela: '1/1',
                valor: Number(inc.value || 0),
                status: 'Recebido'
            });
        }
    });

    // 2. Processar Despesas Avulsas do Ano
    safeExpenses.forEach(exp => {
        if (!exp) return;
        const dateStr = typeof exp.date === 'string' ? exp.date : (exp.date?.toDate ? exp.date.toDate().toISOString().slice(0, 10) : '');
        if (dateStr.startsWith(yearStr)) {
            const valCents = Math.round(Number(exp.value || 0) * 100);
            totalExpensesCents += valCents;
            itemizedRows.push({
                data: dateStr,
                competencia: dateStr.slice(0, 7),
                tipo: 'Despesa Avulsa',
                descricao: exp.description || 'Despesa',
                categoria: exp.category || 'Geral',
                pessoa: clientMap.get(exp.clientId) || '-',
                formaPagamento: cardMap.get(exp.cardId) || 'Dinheiro/Pix',
                parcela: '1/1',
                valor: Number(exp.value || 0),
                status: exp.status || 'Pendente'
            });
        }
    });

    // 3. Processar Parcelas de Compras no Ano
    safeLoans.forEach(loan => {
        if (!loan) return;
        const clientName = loan.clientId ? clientMap.get(loan.clientId) : 'Titular';
        const cardName = cardMap.get(loan.cardId) || 'Cartão';

        const processInst = (inst, pClientName) => {
            if (!inst || !inst.dueDate || !inst.dueDate.startsWith(yearStr)) return;
            const valCents = Math.round(Number(inst.value || 0) * 100);
            totalCardInstallmentsCents += valCents;
            itemizedRows.push({
                data: inst.dueDate,
                competencia: inst.dueDate.slice(0, 7),
                tipo: 'Compra Parcelada',
                descricao: loan.description || 'Compra',
                categoria: loan.category || 'Cartão',
                pessoa: pClientName || clientName,
                formaPagamento: cardName,
                parcela: `${inst.number || 1}/${loan.installmentsCount || inst.total || 1}`,
                valor: Number(inst.value || 0),
                status: inst.status || 'Pendente'
            });
        };

        if (loan.isShared && loan.sharedDetails) {
            const p1 = loan.sharedDetails.person1;
            const p2 = loan.sharedDetails.person2;
            const p1Name = p1?.clientId ? clientMap.get(p1.clientId) : (p1?.name || '-');
            const p2Name = p2?.clientId ? clientMap.get(p2.clientId) : (p2?.name || '-');

            asArray(p1?.installments).forEach(inst => processInst(inst, p1Name));
            asArray(p2?.installments).forEach(inst => processInst(inst, p2Name));
        } else {
            asArray(loan.installments).forEach(inst => processInst(inst, clientName));
        }
    });

    // 4. Processar Assinaturas do Ano (12 competências para assinaturas ativas)
    safeSubs.forEach(sub => {
        if (!sub || sub.isActive === false || sub.status === 'Inativa') return;
        const subVal = Number(sub.amount !== undefined ? sub.amount : (sub.value || 0));
        const subValCents = Math.round(subVal * 100);
        const cardName = cardMap.get(sub.cardId) || 'Cartão';

        for (let m = 1; m <= 12; m++) {
            const mStr = String(m).padStart(2, '0');
            const dayStr = String(sub.dueDate || sub.dia || 1).padStart(2, '0');
            const subDate = `${yearStr}-${mStr}-${dayStr}`;

            totalSubscriptionsCents += subValCents;
            itemizedRows.push({
                data: subDate,
                competencia: `${yearStr}-${mStr}`,
                tipo: 'Assinatura',
                descricao: sub.name || 'Assinatura',
                categoria: 'Assinaturas',
                pessoa: '-',
                formaPagamento: cardName,
                parcela: 'Recorrente',
                valor: subVal,
                status: 'Ativa'
            });
        }
    });

    // Ordenar itens por data ascendente
    itemizedRows.sort((a, b) => a.data.localeCompare(b.data));

    // Totais Consolidados
    const totalDespesasGeraisCents = totalExpensesCents + totalCardInstallmentsCents + totalSubscriptionsCents;
    const saldoConsolidadoCents = totalIncomesCents - totalDespesasGeraisCents;

    const totalReceitas = totalIncomesCents / 100;
    const totalDespesas = totalDespesasGeraisCents / 100;
    const totalFaturas = totalCardInstallmentsCents / 100;
    const totalAvulsas = totalExpensesCents / 100;
    const totalAssinaturas = totalSubscriptionsCents / 100;
    const saldoConsolidado = saldoConsolidadoCents / 100;

    // Montagem do Relatório em Bloco
    const lines = [];

    lines.push(escapeCsvField(`RELATÓRIO FINANCEIRO ANUAL CONSOLIDADO - EXERCÍCIO ${yearStr}`));
    lines.push(escapeCsvField(`Gerado em: ${new Date().toLocaleString('pt-BR')}`));
    lines.push('');

    lines.push(escapeCsvField('RESUMO CONSOLIDADO DO ANO') + ';');
    lines.push(`${escapeCsvField('Indicador')};${escapeCsvField('Valor (R$)')}`);
    lines.push(`${escapeCsvField('Total de Receitas no Ano')};${escapeCsvField(formatCsvCurrency(totalReceitas))}`);
    lines.push(`${escapeCsvField('Total Comprometido em Faturas de Cartão')};${escapeCsvField(formatCsvCurrency(totalFaturas))}`);
    lines.push(`${escapeCsvField('Total em Despesas Avulsas')};${escapeCsvField(formatCsvCurrency(totalAvulsas))}`);
    lines.push(`${escapeCsvField('Total em Assinaturas Recorrentes')};${escapeCsvField(formatCsvCurrency(totalAssinaturas))}`);
    lines.push(`${escapeCsvField('Total Geral de Saídas')};${escapeCsvField(formatCsvCurrency(totalDespesas))}`);
    lines.push(`${escapeCsvField('Saldo Líquido Anual')};${escapeCsvField(formatCsvCurrency(saldoConsolidado))}`);
    lines.push('');

    lines.push(escapeCsvField('DETALHAMENTO DE LANÇAMENTOS DO EXERCÍCIO') + ';');
    const tableHeaders = [
        'Data',
        'Competência',
        'Tipo',
        'Descrição',
        'Categoria',
        'Pessoa/Contato',
        'Forma de Pagamento',
        'Parcela',
        'Valor (R$)',
        'Status'
    ];
    lines.push(tableHeaders.map(escapeCsvField).join(';'));

    itemizedRows.forEach(row => {
        lines.push([
            escapeCsvField(row.data),
            escapeCsvField(row.competencia),
            escapeCsvField(row.tipo),
            escapeCsvField(row.descricao),
            escapeCsvField(row.categoria),
            escapeCsvField(row.pessoa),
            escapeCsvField(row.formaPagamento),
            escapeCsvField(row.parcela),
            escapeCsvField(formatCsvCurrency(row.valor)),
            escapeCsvField(row.status)
        ].join(';'));
    });

    return '\uFEFF' + lines.join('\r\n');
}

