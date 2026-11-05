// src/features/landing/lib/sampleData.js
import { formatCentsDisplay } from './splitExactCents';

export const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export const SHORT_MONTH_NAMES = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
];

export const PEOPLE = ['Você', 'Lucas', 'Mariana', 'Beatriz', 'Felipe'];

export const CANONICAL_PRICING = {
  freeCents: 0,
  freeDisplay: 'R$ 0',
  proCents: 2999,
  proDisplay: 'R$ 29,99',
  sku: 'PRO-LIFETIME-01',
};

/**
 * Adiciona N meses a uma data com preservação segura do dia 1.
 * @param {Date} baseDate
 * @param {number} monthOffset
 * @returns {Date}
 */
export function addMonths(baseDate, monthOffset) {
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();
  return new Date(year, month + monthOffset, 1);
}

/**
 * Constrói todos os dados de exemplo da Landing Page com integridade matemática
 * em centavos inteiros e datas relativas à data de referência informada.
 * 
 * @param {Date} [referenceDate=new Date()]
 * @returns {Object} Estrutura de dados de exemplo única e coerente.
 */
export function getSampleData(referenceDate = new Date()) {
  const m0 = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
  const mPrev = addMonths(m0, -1);
  const m1 = addMonths(m0, 1);
  const m2 = addMonths(m0, 2);
  const m3 = addMonths(m0, 3);
  const m4 = addMonths(m0, 4);
  const m6 = addMonths(m0, 6);

  // =========================================================================
  // 1. CARDS & INVOICES (Todas as quantias em centavos inteiros)
  // =========================================================================

  // Cartão Principal: Detalhamento exato da fatura atual (R$ 3.840,25 = 384.025 centavos)
  const cardPrincipalTransactions = [
    {
      id: 'tx-notebook',
      name: 'Notebook de Trabalho (04/10)',
      category: 'Tecnologia • Parcelamento Compartilhado',
      amountCents: 115000, // R$ 1.150,00
      isShared: true,
      splitPercent: '50%',
      debtorName: 'Lucas',
      debtorShareCents: 57500, // R$ 575,00
      yourShareCents: 57500, // R$ 575,00
      tag: 'Divisão 50%',
    },
    {
      id: 'tx-smartphone',
      name: 'Smartphone de Trabalho (08/12)',
      category: 'Tecnologia • Parcelamento Individual',
      amountCents: 62500, // R$ 625,00
      isShared: false,
    },
    {
      id: 'tx-revisao',
      name: 'Revisão Automotiva 40.000km (04/06)',
      category: 'Transporte • Manutenção Preventiva',
      amountCents: 31500, // R$ 315,00
      isShared: false,
    },
    {
      id: 'tx-curso',
      name: 'Curso de Especialização (10/10)',
      category: 'Educação • Última Parcela',
      amountCents: 45000, // R$ 450,00
      isShared: false,
    },
    {
      id: 'tx-streaming',
      name: 'Plataforma de Streaming',
      category: 'Assinatura Recorrente',
      amountCents: 5990, // R$ 59,90
      isShared: false,
      isSubscription: true,
    },
    {
      id: 'tx-academia',
      name: 'Assinatura de Academia',
      category: 'Assinatura Recorrente',
      amountCents: 13990, // R$ 139,90
      isShared: false,
      isSubscription: true,
    },
    {
      id: 'tx-mercado',
      name: 'Despesas de Supermercado',
      category: 'Alimentação • À vista',
      amountCents: 110045, // R$ 1.100,45
      isShared: false,
      tag: 'Compra confirmada',
    },
  ];

  // Invariante matemático da fatura do Cartão Principal
  const cardPrincipalTotalCents = cardPrincipalTransactions.reduce(
    (acc, tx) => acc + tx.amountCents,
    0
  ); // 384.025 centavos (R$ 3.840,25)
  const cardPrincipalLimitCents = 1000000; // R$ 10.000,00
  const cardPrincipalAvailableCents = cardPrincipalLimitCents - cardPrincipalTotalCents; // 615.975 centavos (R$ 6.159,75)
  const cardPrincipalUsedPercent = (cardPrincipalTotalCents / cardPrincipalLimitCents) * 100; // 38.4025%

  const cards = [
    {
      id: 'card-principal',
      brand: 'Cartão Principal',
      type: 'Crédito Principal',
      status: 'Aberta',
      statusColor: 'text-[var(--fc-accent)] bg-[var(--fc-accent-soft)] border-[var(--fc-accent)]/30',
      totalCents: cardPrincipalTotalCents,
      totalDisplay: formatCentsDisplay(cardPrincipalTotalCents),
      limitCents: cardPrincipalLimitCents,
      limitDisplay: formatCentsDisplay(cardPrincipalLimitCents),
      availableCents: cardPrincipalAvailableCents,
      availableDisplay: formatCentsDisplay(cardPrincipalAvailableCents),
      limitUsed: `${cardPrincipalUsedPercent.toFixed(1).replace('.', ',')}%`,
      limitUsedPercentage: cardPrincipalUsedPercent,
      closeDate: `28/${SHORT_MONTH_NAMES[mPrev.getMonth()]}`,
      dueDate: `05/${SHORT_MONTH_NAMES[m0.getMonth()]}`,
      closeDayNumber: 28,
      dueDayNumber: 5,
      nextCycleTotalCents: 241020, // R$ 2.410,20
      nextCycleTotalDisplay: formatCentsDisplay(241020),
      transactions: cardPrincipalTransactions,
    },
    {
      id: 'card-investimentos',
      brand: 'Cartão de Investimentos',
      type: 'Crédito Especial',
      status: 'Fechada',
      statusColor: 'text-[var(--fc-success)] bg-[var(--fc-success-soft)] border-[var(--fc-success)]/30',
      totalCents: 129000, // R$ 1.290,00
      totalDisplay: formatCentsDisplay(129000),
      limitCents: 500000, // R$ 5.000,00
      limitDisplay: formatCentsDisplay(500000),
      availableCents: 371000, // R$ 3.710,00
      availableDisplay: formatCentsDisplay(371000),
      limitUsed: '25,8%',
      closeDate: `01/${SHORT_MONTH_NAMES[m0.getMonth()]}`,
      dueDate: `10/${SHORT_MONTH_NAMES[m0.getMonth()]}`,
      closeDayNumber: 1,
      dueDayNumber: 10,
    },
    {
      id: 'card-dia-a-dia',
      brand: 'Cartão Dia a Dia',
      type: 'Crédito Básico',
      status: 'Futura',
      statusColor: 'text-[var(--fc-info)] bg-[var(--fc-info-soft)] border-[var(--fc-info)]/30',
      totalCents: 82040, // R$ 820,40
      totalDisplay: formatCentsDisplay(82040),
      limitCents: 500000, // R$ 5.000,00
      limitDisplay: formatCentsDisplay(500000),
      availableCents: 417960, // R$ 4.179,60
      availableDisplay: formatCentsDisplay(417960),
      limitUsed: '16,4%',
      closeDate: `08/${SHORT_MONTH_NAMES[m1.getMonth()]}`,
      dueDate: `15/${SHORT_MONTH_NAMES[m1.getMonth()]}`,
      closeDayNumber: 8,
      dueDayNumber: 15,
    },
  ];

  // =========================================================================
  // 2. PARCELAMENTOS (Installments harmonizados com o Living Ledger e Timeline)
  // =========================================================================
  const installments = [
    {
      id: 'inst-notebook',
      title: 'Notebook de Trabalho',
      installments: '04 de 10',
      currentInstallment: 4,
      totalInstallments: 10,
      installmentCents: 115000,
      installment: formatCentsDisplay(115000), // R$ 1.150,00
      remainingCents: 690000,
      remaining: formatCentsDisplay(690000), // R$ 6.900,00 (6 x 1.150,00)
      finishDate: `${MONTH_NAMES[m6.getMonth()]} / ${m6.getFullYear()}`,
      progress: 40,
      isShared: true,
      debtorName: 'Lucas',
      debtorShareCents: 57500,
      debtorShareDisplay: formatCentsDisplay(57500), // R$ 575,00
    },
    {
      id: 'inst-smartphone',
      title: 'Smartphone de Trabalho',
      installments: '08 de 12',
      currentInstallment: 8,
      totalInstallments: 12,
      installmentCents: 62500,
      installment: formatCentsDisplay(62500), // R$ 625,00
      remainingCents: 250000,
      remaining: formatCentsDisplay(250000), // R$ 2.500,00 (4 x 625,00)
      finishDate: `${MONTH_NAMES[m4.getMonth()]} / ${m4.getFullYear()}`,
      progress: 67,
    },
    {
      id: 'inst-revisao',
      title: 'Revisão Automotiva 40.000km',
      installments: '04 de 06',
      currentInstallment: 4,
      totalInstallments: 6,
      installmentCents: 31500,
      installment: formatCentsDisplay(31500), // R$ 315,00
      remainingCents: 63000,
      remaining: formatCentsDisplay(63000), // R$ 630,00 (2 x 315,00)
      finishDate: `${MONTH_NAMES[m2.getMonth()]} / ${m2.getFullYear()}`,
      progress: 67,
    },
    {
      id: 'inst-curso',
      title: 'Curso de Especialização',
      installments: '10 de 10',
      currentInstallment: 10,
      totalInstallments: 10,
      installmentCents: 45000,
      installment: formatCentsDisplay(45000), // R$ 450,00
      remainingCents: 0,
      remaining: formatCentsDisplay(0), // R$ 0,00
      finishDate: 'Última parcela quitada!',
      progress: 100,
      completed: true,
    },
  ];

  // =========================================================================
  // 3. ASSINATURAS RECORRENTES (Cobranças fixas harmonizadas com os cartões)
  // =========================================================================
  const subscriptions = [
    {
      name: 'Plataforma de Streaming',
      frequency: 'Recorrente',
      amountCents: 5990,
      amount: formatCentsDisplay(5990), // R$ 59,90
      card: 'Cartão Principal',
    },
    {
      name: 'Ferramentas de Produtividade',
      frequency: 'Recorrente',
      amountCents: 5500,
      amount: formatCentsDisplay(5500), // R$ 55,00
      card: 'Cartão de Investimentos',
    },
    {
      name: 'Assinatura de Academia',
      frequency: 'Recorrente',
      amountCents: 13990,
      amount: formatCentsDisplay(13990), // R$ 139,90
      card: 'Cartão Principal',
    },
    {
      name: 'Infraestrutura em Nuvem',
      frequency: 'Variável',
      amountCents: 4210,
      amount: formatCentsDisplay(4210), // R$ 42,10
      card: 'Cartão Dia a Dia',
    },
  ];

  // =========================================================================
  // 4. TIMELINE DE 5 MESES CONSECUTIVOS (Coerente com as parcelas acima)
  // =========================================================================
  const timeline = [
    {
      month: MONTH_NAMES[m0.getMonth()],
      shortMonth: SHORT_MONTH_NAMES[m0.getMonth()],
      year: String(m0.getFullYear()),
      totalCents: 384025,
      total: formatCentsDisplay(384025), // R$ 3.840,25 (fatura atual do Cartão Principal)
      installments: 8,
      status: 'Atual',
    },
    {
      month: MONTH_NAMES[m1.getMonth()],
      shortMonth: SHORT_MONTH_NAMES[m1.getMonth()],
      year: String(m1.getFullYear()),
      totalCents: 241020,
      total: formatCentsDisplay(241020), // R$ 2.410,20 (fatura seguinte do Cartão Principal)
      installments: 6,
      status: 'Previsto',
    },
    {
      month: MONTH_NAMES[m2.getMonth()],
      shortMonth: SHORT_MONTH_NAMES[m2.getMonth()],
      year: String(m2.getFullYear()),
      totalCents: 189050,
      total: formatCentsDisplay(189050), // R$ 1.890,50
      installments: 5,
      status: 'Previsto',
    },
    {
      month: MONTH_NAMES[m3.getMonth()],
      shortMonth: SHORT_MONTH_NAMES[m3.getMonth()],
      year: String(m3.getFullYear()),
      totalCents: 125000,
      total: formatCentsDisplay(125000), // R$ 1.250,00
      installments: 3,
      status: 'Previsto',
    },
    {
      month: MONTH_NAMES[m4.getMonth()],
      shortMonth: SHORT_MONTH_NAMES[m4.getMonth()],
      year: String(m4.getFullYear()),
      totalCents: 62500,
      total: formatCentsDisplay(62500), // R$ 625,00 (12ª e última parcela do Smartphone!)
      installments: 1,
      status: 'Final',
    },
  ];

  // =========================================================================
  // 5. REGRA DO CENTAVO RESIDUAL (O Princípio de R$ 0,01)
  // =========================================================================
  const residualCentRule = {
    invoiceTotalCents: 10000,
    invoiceTotalDisplay: formatCentsDisplay(10000), // R$ 100,00
    partialPaidCents: 9999,
    partialPaidDisplay: formatCentsDisplay(9999), // R$ 99,99
    partialRemainingCents: 1,
    partialRemainingDisplay: formatCentsDisplay(1), // R$ 0,01
    fullPaidCents: 10000,
    fullPaidDisplay: formatCentsDisplay(10000), // R$ 100,00
    fullRemainingCents: 0,
    fullRemainingDisplay: formatCentsDisplay(0), // R$ 0,00
  };

  return {
    referenceDate,
    cards,
    cardPrincipal: cards[0],
    installments,
    subscriptions,
    timeline,
    residualCentRule,
    people: PEOPLE,
  };
}

// Instância padrão para consumo imediato nos componentes da Landing
export const sampleData = getSampleData();
