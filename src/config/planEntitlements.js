// src/config/planEntitlements.js
/**
 * FinControl — Definições Canônicas de Entitlements e Limites de Planos (Fase 8.7 Stage A.3)
 * Módulo puro sem dependências externas ou efeitos colaterais.
 */

export const FREE_LIMITS = {
    people: 3,
    cards: 2,
};

export const PRO_FEATURES = [
    'unlimited_people',
    'unlimited_cards',
    'income_balance',
    'category_expenses',
    'analytics_by_person',
    'analytics_by_category',
    'crisis_mode',
    'executive_summary',
    'simulator',
    'monthly_csv',
    'annual_report',
    'quick_audit',
    'debt_goals',
    'deterministic_insights',
    'future_commitments',
    'category_budgets',
];

/**
 * Verifica se o usuário tem acesso Pro a partir do perfil ou flags.
 * Contrato: isPro || isTrialActive
 */
export function checkProAccess({ isPro, isTrialActive, plan }) {
    if (isPro) return true;
    if (isTrialActive) return true;
    if (plan === 'pro') return true;
    return false;
}

/**
 * Validação de limite de criação de pessoas no plano Free.
 * Suporta chamada posicional (count, hasProAccess) ou objeto ({ peopleCount, isPro, isTrialActive }).
 */
export function canAddPerson(arg1, arg2) {
    let count = 0;
    let hasAccess = false;
    if (typeof arg1 === 'object' && arg1 !== null) {
        count = arg1.peopleCount ?? arg1.count ?? 0;
        hasAccess = checkProAccess(arg1) || Boolean(arg1.hasProAccess);
    } else {
        count = Number(arg1 || 0);
        hasAccess = Boolean(arg2);
    }
    const allowed = hasAccess || count < FREE_LIMITS.people;
    return {
        allowed,
        message: allowed ? '' : LIMIT_MESSAGES.peopleReached,
        valueOf: () => allowed,
        [Symbol.toPrimitive]: () => allowed,
    };
}

/**
 * Validação de limite de criação de cartões no plano Free.
 * Suporta chamada posicional (count, hasProAccess) ou objeto ({ cardCount, isPro, isTrialActive }).
 */
export function canAddCard(arg1, arg2) {
    let count = 0;
    let hasAccess = false;
    if (typeof arg1 === 'object' && arg1 !== null) {
        count = arg1.cardCount ?? arg1.count ?? 0;
        hasAccess = checkProAccess(arg1) || Boolean(arg1.hasProAccess);
    } else {
        count = Number(arg1 || 0);
        hasAccess = Boolean(arg2);
    }
    const allowed = hasAccess || count < FREE_LIMITS.cards;
    return {
        allowed,
        message: allowed ? '' : LIMIT_MESSAGES.cardsReached,
        valueOf: () => allowed,
        [Symbol.toPrimitive]: () => allowed,
    };
}

export const LIMIT_MESSAGES = {
    peopleReached: 'Você atingiu o limite de 3 pessoas do plano Free.',
    cardsReached: 'Você atingiu o limite de 2 cartões do plano Free.',
};

