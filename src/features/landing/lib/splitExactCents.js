// src/features/landing/lib/splitExactCents.js

export const MIN_CENTS = 1; // R$ 0,01
export const MAX_CENTS = 100000000; // R$ 1.000.000,00
export const MAX_INPUT_LENGTH = 12;

/**
 * Analisa uma entrada de texto de moeda para centavos inteiros determinísticos.
 *
 * Regra do Parser:
 * 1. Limpeza de prefixo 'R$' / 'r$' e espaços em branco.
 * 2. Rejeição de caracteres não numéricos além de ponto e vírgula.
 * 3. Se contiver vírgula (','):
 *    - A vírgula é tratada como separador decimal.
 *    - Todos os pontos são tratados como separadores de milhar (removidos).
 *    - Parte decimal é normalizada: se 1 dígito (ex: ",5"), vira 50 centavos; se 2 dígitos (ex: ",50"), vira 50 centavos.
 * 4. Se contiver apenas ponto(s) ('.') e nenhuma vírgula:
 *    - Se tiver exatamente 1 ou 2 dígitos após o último ponto (ex: "1000.5" ou "1000.50"): o ponto é separador decimal.
 *    - Se tiver 3 ou mais dígitos após o último ponto (ex: "1.000" ou "10.000"): os pontos são separadores de milhar.
 * 5. Se não contiver separadores: número inteiro em reais convertido para centavos (* 100).
 * 6. Limite e Validação:
 *    - Valores <= 0 ou texto não numérico retornam null.
 *    - Valores > MAX_CENTS (R$ 1.000.000,00) são limitados ao teto MAX_CENTS.
 *
 * @param {string|number|null|undefined} input
 * @param {Object} [options]
 * @param {boolean} [options.clampToMin] - Se true, valores positivos abaixo do mínimo viram MIN_CENTS.
 * @returns {number|null} Centavos inteiros ou null se inválido/vazio.
 */
export function parseCurrencyToCents(input, options = {}) {
  if (input === null || input === undefined) return null;

  let str = String(input).trim();
  if (!str) return null;

  // Remove prefixo R$ ou r$
  str = str.replace(/^r\$\s*/i, '').trim();
  if (!str) return null;

  // Rejeita qualquer caractere inválido
  if (!/^[0-9.,]+$/.test(str)) {
    return null;
  }

  // Limite de comprimento da entrada
  if (str.length > MAX_INPUT_LENGTH) {
    str = str.slice(0, MAX_INPUT_LENGTH);
  }

  const hasComma = str.includes(',');
  const hasDot = str.includes('.');

  let totalCents = 0;

  if (hasComma) {
    // Vírgula é o separador decimal oficial pt-BR
    const parts = str.split(',');
    if (parts.length > 2) return null; // mais de uma vírgula é inválido

    const intPartRaw = parts[0].replace(/\./g, ''); // remove pontos de milhar
    const decPartRaw = parts[1] || '';

    const intPart = parseInt(intPartRaw || '0', 10);
    if (isNaN(intPart)) return null;

    let centsFraction = 0;
    if (decPartRaw.length === 1) {
      centsFraction = parseInt(decPartRaw, 10) * 10;
    } else if (decPartRaw.length >= 2) {
      centsFraction = parseInt(decPartRaw.slice(0, 2), 10);
    }

    if (isNaN(centsFraction)) return null;
    totalCents = intPart * 100 + centsFraction;
  } else if (hasDot) {
    // Apenas ponto(s)
    const lastDotIndex = str.lastIndexOf('.');
    const afterLastDot = str.slice(lastDotIndex + 1);

    if (afterLastDot.length === 1 || afterLastDot.length === 2) {
      // Decimal com ponto (ex: "1000.5", "1000.50", "1.000.50")
      const intPartRaw = str.slice(0, lastDotIndex).replace(/\./g, '');
      const intPart = parseInt(intPartRaw || '0', 10);
      if (isNaN(intPart)) return null;

      let centsFraction = 0;
      if (afterLastDot.length === 1) {
        centsFraction = parseInt(afterLastDot, 10) * 10;
      } else {
        centsFraction = parseInt(afterLastDot, 10);
      }

      if (isNaN(centsFraction)) return null;
      totalCents = intPart * 100 + centsFraction;
    } else {
      // Ponto como milhar (ex: "1.000", "10.000", "1.000.000")
      const intPart = parseInt(str.replace(/\./g, ''), 10);
      if (isNaN(intPart)) return null;
      totalCents = intPart * 100;
    }
  } else {
    // Apenas dígitos
    const intPart = parseInt(str, 10);
    if (isNaN(intPart)) return null;
    totalCents = intPart * 100;
  }

  if (totalCents <= 0) {
    if (options.clampToMin && str !== '0' && str !== '') {
      return MIN_CENTS;
    }
    return null;
  }

  if (totalCents > MAX_CENTS) {
    return MAX_CENTS;
  }

  return totalCents;
}

/**
 * Formata centavos inteiros para exibição em moeda pt-BR com separador de milhar.
 * Exemplo: 100000 -> "R$ 1.000,00", 33334 -> "R$ 333,34".
 *
 * @param {number|null|undefined} cents
 * @returns {string}
 */
export function formatCentsDisplay(cents) {
  if (cents === null || cents === undefined || isNaN(cents)) {
    return 'R$ 0,00';
  }
  return (cents / 100)
    .toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    })
    .replace(/\u00A0/g, ' ');
}

/**
 * Formata centavos inteiros para preenchimento de campo de texto no formato numérico pt-BR.
 * Exemplo: 100000 -> "1.000,00".
 *
 * @param {number|null|undefined} cents
 * @returns {string}
 */
export function formatCentsForInput(cents) {
  if (cents === null || cents === undefined || isNaN(cents)) {
    return '';
  }
  return (cents / 100).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Calcula parcelas com a MESMA regra de domínio do app real (financialService.js:calculateInstallments):
 * - baseCents = floor(totalCents / count)
 * - As primeiras count - 1 parcelas têm valor baseCents.
 * - A última parcela absorve a diferença residual inteira de centavos (totalCents - acumulado).
 * - Soma de todas as parcelas == totalCents estrito (drift = 0).
 *
 * @param {number} totalCents - Total da cota em centavos inteiros
 * @param {number} count - Número de parcelas (1 a 12)
 * @returns {Object} { totalCents, count, baseCents, lastCents, isUniform, installmentsCents, summaryText }
 */
export function calculateAppInstallments(totalCents, count) {
  const installmentsCount = parseInt(count, 10);
  if (totalCents <= 0 || isNaN(installmentsCount) || installmentsCount < 1) {
    return {
      totalCents: 0,
      count: installmentsCount || 1,
      baseCents: 0,
      lastCents: 0,
      isUniform: true,
      installmentsCents: [],
      summaryText: '0 parcelas',
    };
  }

  const baseCents = Math.floor(totalCents / installmentsCount);
  let accumulatedCents = 0;
  const installmentsCents = [];

  for (let index = 0; index < installmentsCount; index++) {
    const isLast = index === installmentsCount - 1;
    const installmentCents = isLast
      ? (totalCents - accumulatedCents)
      : baseCents;

    accumulatedCents += installmentCents;
    installmentsCents.push(installmentCents);
  }

  const lastCents = installmentsCents[installmentsCount - 1];
  const isUniform = baseCents === lastCents;

  let summaryText = '';
  if (installmentsCount === 1) {
    summaryText = `1 × ${formatCentsDisplay(totalCents)}`;
  } else if (isUniform) {
    summaryText = `${installmentsCount} × ${formatCentsDisplay(baseCents)}`;
  } else {
    summaryText = `${installmentsCount - 1} × ${formatCentsDisplay(baseCents)} + última ${formatCentsDisplay(lastCents)}`;
  }

  return {
    totalCents,
    count: installmentsCount,
    baseCents,
    lastCents,
    isUniform,
    installmentsCents,
    summaryText,
  };
}

/**
 * Simulador de compra compartilhada entre DUAS pessoas, fiel à regra do app real
 * (LoanManagement.jsx linhas ~142-143):
 * - Pessoa 1 = valor informado (no modo 'half': floor(total / 2))
 * - Pessoa 2 = total - Pessoa 1 (complemento exato em centavos)
 * - Erro claro se Pessoa 1 > total
 *
 * @param {Object} params
 * @param {number|null} params.totalCents - Valor total em centavos
 * @param {'half'|'custom'} [params.mode='half'] - Modo de rateio
 * @param {number|null} [params.person1CentsInput=null] - Valor customizado de Pessoa 1 em centavos
 * @param {number} [params.installmentsCount=1] - Quantidade de parcelas (1, 2, 3, 6, 10, 12)
 * @returns {Object|null}
 */
export function splitSharedPurchaseTwoPeople({
  totalCents,
  mode = 'half',
  person1CentsInput = null,
  installmentsCount = 1,
}) {
  if (totalCents === null || totalCents === undefined || isNaN(totalCents) || totalCents < MIN_CENTS) {
    return null;
  }

  const installments = parseInt(installmentsCount, 10) || 1;

  let p1Cents;
  let error = null;

  if (mode === 'half') {
    p1Cents = Math.floor(totalCents / 2);
  } else {
    const rawP1 = person1CentsInput !== null && person1CentsInput !== undefined ? person1CentsInput : 0;
    if (rawP1 > totalCents) {
      error = 'O valor da Pessoa 1 não pode ser maior que o valor total da compra.';
      p1Cents = null;
    } else {
      p1Cents = Math.max(0, rawP1);
    }
  }

  if (error || p1Cents === null) {
    return {
      totalCents,
      mode,
      installmentsCount: installments,
      error,
      person1: null,
      person2: null,
      sumCents: null,
      driftCents: null,
    };
  }

  const p2Cents = totalCents - p1Cents;

  const person1Plan = calculateAppInstallments(p1Cents, installments);
  const person2Plan = calculateAppInstallments(p2Cents, installments);

  const sumCents = p1Cents + p2Cents;
  const driftCents = sumCents - totalCents;

  return {
    totalCents,
    mode,
    installmentsCount: installments,
    error: null,
    person1: {
      name: 'Você (Pessoa 1)',
      cents: p1Cents,
      display: formatCentsDisplay(p1Cents),
      plan: person1Plan,
    },
    person2: {
      name: 'Lucas (Pessoa 2)',
      cents: p2Cents,
      display: formatCentsDisplay(p2Cents),
      plan: person2Plan,
    },
    sumCents,
    driftCents, // Rigorosamente 0
  };
}

/**
 * Função utilitária mantida para retrocompatibilidade.
 */
export function splitExactCents(totalCents, peopleCount) {
  if (totalCents === null || totalCents === undefined || isNaN(totalCents) || totalCents < MIN_CENTS) {
    return null;
  }

  const count = parseInt(peopleCount, 10);
  if (isNaN(count) || count < 2) {
    return null;
  }

  const baseCents = Math.floor(totalCents / count);
  const remainder = totalCents % count;

  const sharesCents = [];
  let sumCents = 0;

  for (let i = 0; i < count; i++) {
    const share = i < remainder ? baseCents + 1 : baseCents;
    sharesCents.push(share);
    sumCents += share;
  }

  const driftCents = sumCents - totalCents;

  return {
    totalCents,
    peopleCount: count,
    sharesCents,
    sumCents,
    driftCents,
  };
}
