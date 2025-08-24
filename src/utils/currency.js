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
 * Esta função é a parceira da 'handleCurrencyInputChange' e desfaz a formatação com segurança.
 * @param {string} inputString - A string de entrada da moeda.
 * @returns {number} O valor numérico analisado. Retorna 0 se a entrada for inválida.
 */
export const parseCurrencyInput = (inputString) => {
  if (typeof inputString !== 'string' || !inputString.trim()) {
    return 0;
  }
  // Remove tudo que não for dígito ou a vírgula do decimal.
  const cleanedString = inputString
    .replace(/\./g, '')  // Remove os pontos de milhar
    .replace(',', '.'); // Troca a vírgula do decimal por um ponto

  // Remove qualquer caractere não numérico que possa ter sobrado (exceto o ponto decimal)
  const finalString = cleanedString.replace(/[^0-9.]/g, '');
    
  const parsed = parseFloat(finalString);
  return isNaN(parsed) ? 0 : parsed;
};

/**
 * Formata um valor numérico para ser usado em um campo de input (ex: 1234.56 -> "1.234,56").
 * Útil para preencher o formulário ao editar uma compra existente.
 * @param {number} value - O valor numérico.
 * @returns {string} O valor formatado para um campo de input.
 */
export const formatCurrencyForInput = (value) => {
    const num = Number(value);
    if (isNaN(num)) return '';
    return num.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
};


/**
 * Manipulador de eventos onChange para campos de input de moeda.
 * Esta é a "máscara inteligente" que aceita qualquer formato e o padroniza.
 * @param {function} setter - A função setState do React para atualizar o valor do estado.
 */
export const handleCurrencyInputChange = (setter) => (e) => {
  let value = e.target.value;
  
  // 1. Remove tudo que não for dígito. Isso trata "1.599,18" e "1599,18" da mesma forma.
  value = value.replace(/\D/g, '');

  // 2. Se estiver vazio, define o estado como uma string vazia para o placeholder aparecer.
  if (value === '') {
    setter('');
    return;
  }

  // 3. Converte para número para remover zeros à esquerda (ex: "0050" -> 50)
  const numberValue = parseInt(value, 10);

  // 4. Formata o número de centavos de volta para uma string no formato BRL (ex: 123456 -> "1.234,56")
  const formattedValue = (numberValue / 100).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  // 5. Atualiza o estado com o valor formatado.
  setter(formattedValue);
};