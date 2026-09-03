// src/utils/currency.js

/**
 * Formata um número para uma string de moeda BRL (R$ 1.234,56).
 * Lida com 'null', 'undefined' e valores não numéricos de forma segura, retornando 'R$ 0,00'.
 * @param {number | null | undefined} value - O valor numérico a ser formatado.
 * @returns {string} O valor formatado como string BRL.
 */
export const formatCurrencyDisplay = (value) => {
  const num = Number(value);
  if (typeof num !== 'number' || isNaN(num)) {
    return 'R$ 0,00';
  }
  return num.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
};

/**
 * Converte uma string de moeda formatada ou valor numérico para um número Float válido (ex: "1.234,56" -> 1234.56).
 * Suporta formatos brasileiros ("1.234,56"), formatos com vírgula ("1234,56"), decimais com ponto ("100.50") e números diretos.
 * @param {string | number | null | undefined} inputString - A entrada da moeda.
 * @returns {number} O valor numérico analisado. Retorna 0 se a entrada for inválida.
 */
export const parseCurrencyInput = (inputString) => {
  if (inputString === null || inputString === undefined || inputString === '') {
    return 0;
  }
  if (typeof inputString === 'number') {
    return (isNaN(inputString) || !Number.isFinite(inputString)) ? 0 : inputString;
  }
  if (typeof inputString !== 'string') {
    return 0;
  }

  let str = inputString.trim();
  if (!str) return 0;

  // 1. Tratamento e validação de sinal negativo e prefixo monetário
  let isNegative = false;
  if (str.startsWith('-')) {
    isNegative = true;
    str = str.slice(1).trim();
  }

  // Remove prefixo R$ ou r$ (opcional com espaços)
  if (/^r\$/i.test(str)) {
    str = str.replace(/^r\$/i, '').trim();
    // Suporte a sinal negativo após R$, ex: "R$ -50,00"
    if (!isNegative && str.startsWith('-')) {
      isNegative = true;
      str = str.slice(1).trim();
    }
  }

  if (!str) return 0;

  // Se ainda contiver qualquer sinal '-' ou '+' ou caracteres fora de dígitos e separadores,
  // rejeita imediatamente (evita que "abc100" ou "1-50" vire número)
  if (!/^[0-9.,]+$/.test(str)) {
    return 0;
  }

  const hasDot = str.includes('.');
  const hasComma = str.includes(',');

  let num = 0;

  // CASO A: Sem separadores (apenas dígitos) -> "10", "1000"
  if (!hasDot && !hasComma) {
    num = parseInt(str, 10);
    return isNegative ? -num : num;
  }

  // CASO B: Contém ponto E vírgula
  if (hasDot && hasComma) {
    const lastDot = str.lastIndexOf('.');
    const lastComma = str.lastIndexOf(',');

    if (lastComma > lastDot) {
      // Padrão Brasileiro: "1.000,50", "1.000.000,50"
      const parts = str.split(',');
      if (parts.length !== 2) return 0;
      const [intPart, decPart] = parts;
      if (!/^\d{1,3}(\.\d{3})+$/.test(intPart) || !/^\d+$/.test(decPart)) {
        return 0;
      }
      const normalized = intPart.replace(/\./g, '') + '.' + decPart;
      num = parseFloat(normalized);
    } else {
      // Padrão Internacional: "1,000.50", "1,000,000.50"
      const parts = str.split('.');
      if (parts.length !== 2) return 0;
      const [intPart, decPart] = parts;
      if (!/^\d{1,3}(,\d{3})+$/.test(intPart) || !/^\d+$/.test(decPart)) {
        return 0;
      }
      const normalized = intPart.replace(/,/g, '') + '.' + decPart;
      num = parseFloat(normalized);
    }
  } else if (hasComma) {
    // CASO C: Apenas vírgula -> "10,5", "10,50", "1000,50", "0,01"
    const parts = str.split(',');
    if (parts.length !== 2) return 0;
    const [intPart, decPart] = parts;
    if (!/^\d*$/.test(intPart) || !/^\d+$/.test(decPart)) {
      return 0;
    }
    const normalized = (intPart || '0') + '.' + decPart;
    num = parseFloat(normalized);
  } else if (hasDot) {
    // CASO D: Apenas ponto(s)
    const parts = str.split('.');
    if (parts.length === 2) {
      // Ponto único
      const [intPart, afterDot] = parts;
      if (!/^\d+$/.test(intPart) || !/^\d+$/.test(afterDot)) {
        return 0;
      }
      if (afterDot.length === 1 || afterDot.length === 2) {
        // Decimal internacional: "10.5", "10.50", "1000.50"
        num = parseFloat(str);
      } else if (afterDot.length === 3 && /^\d{1,3}$/.test(intPart)) {
        // Milhar brasileiro: "1.000" -> 1000, "10.000" -> 10000, "100.000" -> 100000
        num = parseInt(intPart + afterDot, 10);
      } else {
        // Formato estruturalmente inválido (ex: "1000.000" ou "10.0000")
        return 0;
      }
    } else if (parts.length > 2) {
      // Múltiplos pontos: aceitar apenas agrupamento de milhares coerente PT-BR
      // Exemplo: "1.000.000", "10.000.000"
      if (!/^\d{1,3}(\.\d{3})+$/.test(str)) {
        return 0;
      }
      num = parseInt(str.replace(/\./g, ''), 10);
    } else {
      return 0;
    }
  }

  if (isNaN(num) || !Number.isFinite(num)) {
    return 0;
  }

  return isNegative ? -num : num;
};

/**
 * Formata um valor numérico para ser usado em um campo de input (ex: 1234.56 -> "1.234,56").
 * Útil para preencher o formulário ao editar uma compra ou valor existente.
 * @param {number | string} value - O valor numérico.
 * @returns {string} O valor formatado para um campo de input.
 */
export const formatCurrencyForInput = (value) => {
    if (value === null || value === undefined || value === '') return '';
    const num = typeof value === 'number' ? value : parseCurrencyInput(value);
    if (typeof num !== 'number' || isNaN(num) || !Number.isFinite(num)) return '';
    return num.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
};

/**
 * Manipulador de eventos onChange para campos de input de moeda.
 * Aceita digitação progressiva e mantém formatação consistente.
 * @param {function} setter - A função setState do React para atualizar o valor do estado.
 */
export const handleCurrencyInputChange = (setter) => (e) => {
  let value = e.target.value;
  
  if (value === null || value === undefined) {
    setter('');
    return;
  }

  // 1. Remove tudo que não for dígito
  const digitsOnly = String(value).replace(/\D/g, '');

  // 2. Se estiver vazio, define o estado como uma string vazia para o placeholder aparecer.
  if (digitsOnly === '') {
    setter('');
    return;
  }

  // 3. Converte para número para remover zeros à esquerda (ex: "0050" -> 50)
  const numberValue = parseInt(digitsOnly, 10);
  if (isNaN(numberValue)) {
    setter('');
    return;
  }

  // 4. Formata o número de centavos de volta para uma string no formato BRL (ex: 123456 -> "1.234,56")
  const formattedValue = (numberValue / 100).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  // 5. Atualiza o estado com o valor formatado.
  setter(formattedValue);
};