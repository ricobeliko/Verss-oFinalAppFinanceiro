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
    return isNaN(inputString) ? 0 : inputString;
  }
  if (typeof inputString !== 'string') {
    return 0;
  }

  let str = inputString.trim();
  if (!str) return 0;

  // Se contiver ponto E vírgula (ex: "1.234,56" ou "1,234.56")
  if (str.includes('.') && str.includes(',')) {
    const lastDot = str.lastIndexOf('.');
    const lastComma = str.lastIndexOf(',');
    if (lastComma > lastDot) {
      // Padrão Brasileiro: 1.234,56 -> remove pontos e troca vírgula por ponto
      str = str.replace(/\./g, '').replace(',', '.');
    } else {
      // Padrão Internacional: 1,234.56 -> remove vírgulas
      str = str.replace(/,/g, '');
    }
  } else if (str.includes(',')) {
    // Apenas vírgula: "1234,56" -> troca vírgula por ponto
    str = str.replace(',', '.');
  } else if (str.includes('.')) {
    // Apenas pontos: se tiver múltiplos pontos (ex: 1.000.000) remove todos exceto se for decimal único
    const parts = str.split('.');
    if (parts.length > 2) {
      str = str.replace(/\./g, '');
    }
    // Se tiver 1 ponto único, mantém como ponto decimal padrão (ex: "100.50")
  }

  // Remove caracteres que não sejam dígitos, ponto decimal ou sinal negativo
  const finalString = str.replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(finalString);
  return isNaN(parsed) ? 0 : parsed;
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
    if (isNaN(num)) return '';
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