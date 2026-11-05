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
 * Calcula a divisão exata de um valor em centavos entre N pessoas.
 * 
 * Regra de Distribuição de Resto:
 * - baseCents = floor(totalCents / peopleCount)
 * - remainder = totalCents % peopleCount
 * - Os primeiros 'remainder' participantes recebem (baseCents + 1).
 * - Os demais participantes recebem baseCents.
 * 
 * Comparação com o App FinControl:
 * - Em parcelamentos (financialService.js:calculateInstallments), o centavo residual é absorvido
 *   na última parcela cronológica.
 * - Em divisões compartilhadas entre pessoas (SharedPurchaseSection.jsx e simulação justa),
 *   o resto é distribuído 1 centavo por participante a começar pelo primeiro até esgotar o resto.
 *   Isso garante que a maior e a menor fração nunca difiram em mais de 1 centavo e que a soma
 *   das partes seja rigorosamente idêntica ao total de centavos (drift = 0).
 * 
 * @param {number|null} totalCents - Total em centavos inteiros.
 * @param {number} peopleCount - Quantidade de participantes (2 a 5).
 * @returns {Object|null}
 */
export function splitExactCents(totalCents, peopleCount) {
  if (totalCents === null || totalCents === undefined || isNaN(totalCents) || totalCents < MIN_CENTS) {
    return null;
  }

  const count = parseInt(peopleCount, 10);
  if (isNaN(count) || count < 2 || count > 5) {
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
    driftCents, // Sempre 0
  };
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
