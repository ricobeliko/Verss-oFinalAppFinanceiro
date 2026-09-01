// scripts/monitoring/monitoringVerificationHelpers.js
// Funções puras de normalização e validação para o Drift Guard

/**
 * Normaliza filtros de log e métricas colapsando múltiplos espaços em branco e quebras de linha
 * @param {string} filter
 * @returns {string}
 */
export function normalizeFilter(filter) {
    if (typeof filter !== 'string') return '';
    return filter.replace(/\s+/g, ' ').trim();
}

/**
 * Valida se um valor de duration representa estritamente zero segundos ("0s", "0.000s", "0.0s")
 * Rejeita valores ausentes (undefined, null, ""), vazios ou não-nulos (> 0)
 * @param {any} duration
 * @returns {boolean}
 */
export function isZeroDuration(duration) {
    if (typeof duration !== 'string') return false;
    const trimmed = duration.trim();
    if (!trimmed) return false;
    return /^0+(\.0+)?s$/.test(trimmed);
}

/**
 * Valida equivalência numérica de thresholds tolerando representações inteiras e decimais (1 vs 1.0)
 * @param {any} valA
 * @param {any} valB
 * @returns {boolean}
 */
export function isThresholdEquivalent(valA, valB) {
    if (valA === undefined || valA === null || valB === undefined || valB === null) return false;
    const numA = Number(valA);
    const numB = Number(valB);
    if (isNaN(numA) || isNaN(numB)) return false;
    return numA === numB;
}

/**
 * Valida equivalência de unidade de métricas
 * @param {any} unitA
 * @param {any} unitB
 * @returns {boolean}
 */
export function isUnitEquivalent(unitA, unitB) {
    if (typeof unitA !== 'string' || typeof unitB !== 'string') return false;
    return unitA.trim() === unitB.trim();
}
