// src/services/searchService.js

/**
 * Normaliza uma string para busca: converte para minúsculas e remove acentos e caracteres diacríticos.
 * 
 * @param {string|number|null|undefined} text - Texto a ser normalizado
 * @returns {string} Texto normalizado
 */
export function normalizeSearchText(text) {
    if (text === null || text === undefined) return '';
    return String(text)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
}

/**
 * Executa uma busca unificada em memória em todas as entidades já carregadas.
 * 
 * @param {Object} params
 * @param {string} params.query - Termo de busca digitado pelo usuário
 * @param {Array<Object>} [params.loans=[]] - Compras parceladas
 * @param {Array<Object>} [params.expenses=[]] - Despesas avulsas
 * @param {Array<Object>} [params.subscriptions=[]] - Assinaturas
 * @param {Array<Object>} [params.clients=[]] - Pessoas cadastradas
 * @param {Array<Object>} [params.incomes=[]] - Receitas cadastradas
 * @param {Array<Object>} [params.cards=[]] - Cartões cadastrados
 * @returns {{
 *   totalMatches: number,
 *   results: {
 *     loans: Array<Object>,
 *     expenses: Array<Object>,
 *     subscriptions: Array<Object>,
 *     clients: Array<Object>,
 *     incomes: Array<Object>
 *   }
 * }}
 */
export function performGlobalSearch({
    query = '',
    loans = [],
    expenses = [],
    subscriptions = [],
    clients = [],
    incomes = [],
    cards = []
}) {
    const term = normalizeSearchText(query);
    if (!term) {
        return {
            totalMatches: 0,
            results: {
                loans: [],
                expenses: [],
                subscriptions: [],
                clients: [],
                incomes: []
            }
        };
    }

    const cardMap = new Map((cards || []).map(c => [c.id, c.name]));
    const clientMap = new Map((clients || []).map(c => [c.id, c.name]));

    // 1. Filtrar Compras Parceladas
    const matchedLoans = (loans || []).filter(loan => {
        const desc = normalizeSearchText(loan.description);
        const cardName = normalizeSearchText(cardMap.get(loan.cardId) || '');
        const clientName = normalizeSearchText(clientMap.get(loan.clientId) || '');
        const valStr = String(loan.totalValue || loan.value || '');
        return desc.includes(term) || cardName.includes(term) || clientName.includes(term) || valStr.includes(term);
    }).map(l => ({
        id: l.id,
        title: l.description || 'Compra Parcelada',
        subtitle: `${l.installmentsCount || 1}x no ${cardMap.get(l.cardId) || 'Cartão'}`,
        value: Number(l.totalValue || l.value || 0),
        type: 'loan',
        badge: 'Compra'
    }));

    // 2. Filtrar Despesas Avulsas
    const matchedExpenses = (expenses || []).filter(exp => {
        const desc = normalizeSearchText(exp.description);
        const category = normalizeSearchText(exp.category);
        const cardName = normalizeSearchText(cardMap.get(exp.cardId) || '');
        const clientName = normalizeSearchText(clientMap.get(exp.clientId) || '');
        return desc.includes(term) || category.includes(term) || cardName.includes(term) || clientName.includes(term);
    }).map(e => ({
        id: e.id,
        title: e.description || e.category || 'Despesa Avulsa',
        subtitle: `${e.category || 'Geral'} • ${e.date ? (typeof e.date === 'string' ? e.date.substring(0, 10) : '') : ''}`,
        value: Number(e.value || 0),
        type: 'expense',
        badge: 'Despesa'
    }));

    // 3. Filtrar Assinaturas
    const matchedSubs = (subscriptions || []).filter(sub => {
        const name = normalizeSearchText(sub.name);
        const cardName = normalizeSearchText(cardMap.get(sub.cardId) || '');
        return name.includes(term) || cardName.includes(term);
    }).map(s => ({
        id: s.id,
        title: s.name || 'Assinatura',
        subtitle: `Dia ${s.dueDate || s.dia || '?'} • ${cardMap.get(s.cardId) || 'Cartão'}`,
        value: Number(s.amount !== undefined ? s.amount : (s.value || 0)),
        type: 'subscription',
        badge: 'Assinatura'
    }));

    // 4. Filtrar Pessoas
    const matchedClients = (clients || []).filter(c => {
        const name = normalizeSearchText(c.name);
        return name.includes(term);
    }).map(c => ({
        id: c.id,
        title: c.name || 'Pessoa',
        subtitle: 'Pessoa / Contato',
        value: null,
        type: 'client',
        badge: 'Pessoa'
    }));

    // 5. Filtrar Receitas
    const matchedIncomes = (incomes || []).filter(inc => {
        const desc = normalizeSearchText(inc.description);
        return desc.includes(term);
    }).map(i => ({
        id: i.id,
        title: i.description || 'Receita',
        subtitle: `Receita • ${i.date ? (typeof i.date === 'string' ? i.date.substring(0, 10) : '') : ''}`,
        value: Number(i.value || 0),
        type: 'income',
        badge: 'Receita'
    }));

    const totalMatches = matchedLoans.length + matchedExpenses.length + matchedSubs.length + matchedClients.length + matchedIncomes.length;

    return {
        totalMatches,
        results: {
            loans: matchedLoans,
            expenses: matchedExpenses,
            subscriptions: matchedSubs,
            clients: matchedClients,
            incomes: matchedIncomes
        }
    };
}
