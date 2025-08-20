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
 * Converte uma string de moeda formatada (ex: "1.234,56") para um número (ex: 1234.56).
 * Remove todos os caracteres não numéricos, exceto a última vírgula, que é tratada como ponto decimal.
 * @param {string} inputString - A string de entrada da moeda.
 * @returns {number} O valor numérico analisado. Retorna 0 se a entrada for inválida.
 */
export const parseCurrencyInput = (inputString) => {
  if (typeof inputString !== 'string' || !inputString.trim()) {
    return 0;
  }
  // Remove "R$", espaços, e pontos de milhar. Troca a última vírgula por um ponto.
  const cleanedString = inputString
    .replace(/\s/g, '')
    .replace('R$', '')
    .replace(/\./g, '')
    .replace(',', '.');
    
  const parsed = parseFloat(cleanedString);
  return isNaN(parsed) ? 0 : parsed;
};

/**
 * Formata um valor numérico para ser usado em um campo de input (ex: 1234.56 -> "1.234,56").
 * ✅ CORREÇÃO: Usa toLocaleString para formatar corretamente com pontos de milhar.
 * @param {number} value - O valor numérico.
 * @returns {string} O valor formatado para um campo de input.
 */
export const formatCurrencyForInput = (value) => {
    const num = Number(value);
    if (isNaN(num)) return '';
    // Usa toLocaleString para obter a formatação completa, incluindo pontos de milhar
    return num.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
};


/**
 * Manipulador de eventos onChange para campos de input de moeda.
 * Garante que a entrada do usuário seja sempre formatada corretamente como um valor monetário.
 * ✅ CORREÇÃO: Lógica refeita para ser mais robusta e não gerar formatos inválidos.
 * @param {function} setter - A função setState do React para atualizar o valor do estado.
 */
export const handleCurrencyInputChange = (setter) => (e) => {
  let value = e.target.value;
  
  // 1. Remove tudo que não for dígito.
  value = value.replace(/\D/g, '');

  // 2. Se estiver vazio, define como string vazia.
  if (value === '') {
    setter('');
    return;
  }

  // 3. Converte para número para remover zeros à esquerda (ex: "0050" -> 50)
  const numberValue = parseInt(value, 10);

  // 4. Formata de volta para uma string com vírgula e pontos (ex: 123456 -> "1.234,56")
  const formattedValue = (numberValue / 100).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  // 5. Atualiza o estado
  setter(formattedValue);
};