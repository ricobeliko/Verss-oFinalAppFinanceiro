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

    const headerLine = headers.map(escapeCsvField).join(';');

    const rows = transactions.map(t => {
        const type = t.type || 'Movimentação';
        const date = t.date || t.dueDate || '';
        const description = t.description || t.name || '';
        const category = t.category || '-';
        const client = t.clientName || t.person || '-';
        const card = t.cardName || t.paymentMethod || 'Dinheiro/Pix';
        const installment = t.installment || (t.totalInstallments ? `${t.installmentNumber || 1}/${t.totalInstallments}` : '-');
        const value = formatCsvCurrency(t.value !== undefined ? t.value : t.amount);
        const status = t.status || 'Pendente';

        return [
            escapeCsvField(type),
            escapeCsvField(date),
            escapeCsvField(description),
            escapeCsvField(category),
            escapeCsvField(client),
            escapeCsvField(card),
            escapeCsvField(installment),
            escapeCsvField(value),
            escapeCsvField(status)
        ].join(';');
    });

    // UTF-8 BOM + Cabeçalho + Linhas
    return '\uFEFF' + [headerLine, ...rows].join('\r\n');
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
 * Gera um relatório CSV anual consolidado com resumo financeiro e detalhamento de todos os lançamentos do ano.
 * 
 * @param {Object} params
 * @param {string|number} params.targetYear - Ano de referência (ex: '2026' ou 2026)
 * @param {Array<Object>} [params.loans=[]] - Compras parceladas
 * @param {Array<Object>} [params.expenses=[]] - Despesas avulsas
 * @param {Array<Object>} [params.subscriptions=[]] - Assinaturas
 * @param {Array<Object>} [params.incomes=[]] - Receitas cadastradas
 * @param {Array<Object>} [params.cards=[]] - Cartões cadastrados
 * @param {Array<Object>} [params.clients=[]] - Pessoas cadastradas
 * @returns {string} Conteúdo CSV completo formatado no padrão brasileiro com UTF-8 BOM
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
    const cardMap = new Map((cards || []).map(c => [c.id, c.name]));
    const clientMap = new Map((clients || []).map(c => [c.id, c.name]));

    let totalIncomesCents = 0;
    let totalExpensesCents = 0;
    let totalCardInstallmentsCents = 0;
    let totalSubscriptionsCents = 0;

    const itemizedRows = [];

    // 1. Processar Receitas do Ano
    incomes.forEach(inc => {
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
    expenses.forEach(exp => {
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

    // 3. Processar Parcelas de Compras que vencem no Ano
    loans.forEach(loan => {
        const cardName = cardMap.get(loan.cardId) || 'Cartão';
        const clientName = clientMap.get(loan.clientId) || '-';

        const processInst = (inst, pClientName) => {
            if (!inst.dueDate || !inst.dueDate.startsWith(yearStr)) return;
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

            (p1?.installments || []).forEach(inst => processInst(inst, p1Name));
            (p2?.installments || []).forEach(inst => processInst(inst, p2Name));
        } else {
            (loan.installments || []).forEach(inst => processInst(inst, clientName));
        }
    });

    // 4. Processar Assinaturas do Ano (12 competências para assinaturas ativas)
    subscriptions.forEach(sub => {
        if (sub.isActive === false || sub.status === 'Inativa') return;
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

