// src/features/landing/lib/sampleData.js
import { formatCentsDisplay } from './splitExactCents.js';

export const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export const SHORT_MONTH_NAMES = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
];

export const PEOPLE = ['Você', 'Lucas'];

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
 * MODELO BASE BRUTO (Fonte Única da Verdade).
 * Contém SOMENTE inteiros e centavos. Nenhum total, saldo ou percentual é digitado à mão.
 */
export const RAW_SAMPLE_MODEL = {
  cards: [
    {
      id: 'card-principal',
      brand: 'Cartão Principal',
      type: 'Crédito Principal',
      status: 'Aberta',
      statusColor: 'text-[var(--fc-accent)] bg-[var(--fc-accent-soft)] border-[var(--fc-accent)]/30',
      limitCents: 1000000, // R$ 10.000,00
      closeDayNumber: 28,
      dueDayNumber: 5,
      closeMonthOffset: -1,
      dueMonthOffset: 0,
    },
    {
      id: 'card-investimentos',
      brand: 'Cartão de Investimentos',
      type: 'Crédito Especial',
      status: 'Fechada',
      statusColor: 'text-[var(--fc-success)] bg-[var(--fc-success-soft)] border-[var(--fc-success)]/30',
      limitCents: 500000, // R$ 5.000,00
      closeDayNumber: 1,
      dueDayNumber: 10,
      closeMonthOffset: 0,
      dueMonthOffset: 0,
    },
    {
      id: 'card-dia-a-dia',
      brand: 'Cartão Dia a Dia',
      type: 'Crédito Básico',
      status: 'Futura',
      statusColor: 'text-[var(--fc-info)] bg-[var(--fc-info-soft)] border-[var(--fc-info)]/30',
      limitCents: 500000, // R$ 5.000,00
      closeDayNumber: 8,
      dueDayNumber: 15,
      closeMonthOffset: 1,
      dueMonthOffset: 1,
    },
  ],
  purchases: [
    // Cartão Principal
    {
      id: 'inst-notebook',
      cardId: 'card-principal',
      title: 'Notebook de Trabalho',
      category: 'Tecnologia • Parcelamento Compartilhado',
      installmentCents: 115000, // R$ 1.150,00
      currentInstallment: 7,
      totalInstallments: 10,
      isShared: true,
      person1ShareCents: 57500, // R$ 575,00 (50%)
      debtorName: 'Lucas',
    },
    {
      id: 'inst-smartphone',
      cardId: 'card-principal',
      title: 'Smartphone de Trabalho',
      category: 'Tecnologia • Parcelamento Individual',
      installmentCents: 62500, // R$ 625,00
      currentInstallment: 8,
      totalInstallments: 12,
      isShared: false,
    },
    {
      id: 'inst-revisao',
      cardId: 'card-principal',
      title: 'Revisão Automotiva 40.000km',
      category: 'Transporte • Manutenção Preventiva',
      installmentCents: 31500, // R$ 315,00
      currentInstallment: 4,
      totalInstallments: 6,
      isShared: false,
    },
    {
      id: 'inst-curso',
      cardId: 'card-principal',
      title: 'Curso de Especialização',
      category: 'Educação • Última Parcela',
      installmentCents: 45000, // R$ 450,00
      currentInstallment: 6,
      totalInstallments: 6,
      isShared: false,
    },
    // Cartão de Investimentos
    {
      id: 'inst-invest-equip',
      cardId: 'card-investimentos',
      title: 'Equipamentos de Escritório',
      category: 'Escritório',
      installmentCents: 123500, // R$ 1.235,00
      currentInstallment: 3,
      totalInstallments: 12,
      isShared: false,
    },
    // Cartão Dia a Dia
    {
      id: 'inst-dia-farmacia',
      cardId: 'card-dia-a-dia',
      title: 'Farmácia & Saúde Familiar',
      category: 'Saúde',
      installmentCents: 77830, // R$ 778,30
      currentInstallment: 2,
      totalInstallments: 4,
      isShared: false,
    },
  ],
  subscriptions: [
    {
      id: 'sub-streaming',
      cardId: 'card-principal',
      name: 'Plataforma de Streaming',
      category: 'Assinatura Recorrente',
      frequency: 'Recorrente',
      amountCents: 5990, // R$ 59,90
    },
    {
      id: 'sub-academia',
      cardId: 'card-principal',
      name: 'Assinatura de Academia',
      category: 'Assinatura Recorrente',
      frequency: 'Recorrente',
      amountCents: 13990, // R$ 139,90
    },
    {
      id: 'sub-produtividade',
      cardId: 'card-investimentos',
      name: 'Ferramentas de Produtividade',
      category: 'Produtividade',
      frequency: 'Recorrente',
      amountCents: 5500, // R$ 55,00
    },
    {
      id: 'sub-nuvem',
      cardId: 'card-dia-a-dia',
      name: 'Infraestrutura em Nuvem',
      category: 'Tecnologia',
      frequency: 'Variável',
      amountCents: 4210, // R$ 42,10
    },
  ],
  oneOffExpenses: [
    {
      id: 'tx-mercado',
      cardId: 'card-principal',
      name: 'Despesas de Supermercado',
      category: 'Alimentação • À vista',
      amountCents: 110045, // R$ 1.100,45
    },
  ],
};

/**
 * Calcula a porcentagem utilizada com aritmética inteira (uma casa decimal, arredondamento padrão).
 * @param {number} totalCents
 * @param {number} limitCents
 * @returns {{ formatted: string, percentage: number }}
 */
export function calculateCardUsedPercent(totalCents, limitCents) {
  if (!limitCents || limitCents <= 0) {
    return { formatted: '0,0%', percentage: 0 };
  }
  const tenths = Math.round((totalCents * 1000) / limitCents);
  const whole = Math.floor(tenths / 10);
  const dec = tenths % 10;
  return {
    formatted: `${whole},${dec}%`,
    percentage: tenths / 10,
  };
}

/**
 * Calcula a fatura detalhada de um cartão específico para um mês com offset relativo (0 = mês atual).
 * @param {string} cardId
 * @param {number} monthOffset
 * @param {Object} rawModel
 * @returns {Object} Fatura calculada com parcelas, assinaturas, avulsa e totais.
 */
export function calculateMonthInvoice(cardId, monthOffset, rawModel = RAW_SAMPLE_MODEL) {
  const activePurchases = [];
  let installmentsTotalCents = 0;

  for (const purchase of rawModel.purchases) {
    if (purchase.cardId === cardId) {
      const installmentNumber = purchase.currentInstallment + monthOffset;
      if (installmentNumber <= purchase.totalInstallments) {
        activePurchases.push({
          ...purchase,
          installmentNumber,
        });
        installmentsTotalCents += purchase.installmentCents;
      }
    }
  }

  const subscriptions = rawModel.subscriptions.filter(s => s.cardId === cardId);
  const subscriptionsTotalCents = subscriptions.reduce((sum, s) => sum + s.amountCents, 0);

  // Despesa avulsa é computada estritamente no ciclo atual (offset 0)
  const oneOffExpenses = monthOffset === 0
    ? rawModel.oneOffExpenses.filter(e => e.cardId === cardId)
    : [];
  const oneOffTotalCents = oneOffExpenses.reduce((sum, e) => sum + e.amountCents, 0);

  const totalCents = installmentsTotalCents + subscriptionsTotalCents + oneOffTotalCents;
  const installmentsCount = activePurchases.length;
  const subscriptionsCount = subscriptions.length;
  const oneOffCount = oneOffExpenses.length;
  const entriesCount = installmentsCount + subscriptionsCount + oneOffCount;

  const parts = [];
  if (installmentsCount > 0) {
    parts.push(`${installmentsCount} ${installmentsCount === 1 ? 'parcela' : 'parcelas'}`);
  }
  if (subscriptionsCount > 0) {
    parts.push(`${subscriptionsCount} ${subscriptionsCount === 1 ? 'assinatura' : 'assinaturas'}`);
  }
  if (oneOffCount > 0) {
    parts.push(`${oneOffCount} ${oneOffCount === 1 ? 'avulsa' : 'avulsas'}`);
  }
  const entriesDetail = parts.join(' + ');

  return {
    monthOffset,
    cardId,
    activePurchases,
    subscriptions,
    oneOffExpenses,
    installmentsTotalCents,
    subscriptionsTotalCents,
    oneOffTotalCents,
    totalCents,
    totalDisplay: formatCentsDisplay(totalCents),
    installmentsCount,
    subscriptionsCount,
    oneOffCount,
    entriesCount,
    entriesDetail,
  };
}

/**
 * Constrói todos os dados de exemplo da Landing Page com integridade matemática
 * estrita e 100% derivada do modelo bruto em centavos.
 *
 * @param {Date} [referenceDate=new Date()]
 * @param {Object} [rawModel=RAW_SAMPLE_MODEL]
 * @returns {Object}
 */
export function getSampleData(referenceDate = new Date(), rawModel = RAW_SAMPLE_MODEL) {
  const m0 = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);

  // 1. CARDS COM FATURAS DERIVADAS
  const cards = rawModel.cards.map(c => {
    const currentInvoice = calculateMonthInvoice(c.id, 0, rawModel);
    const nextInvoice = calculateMonthInvoice(c.id, 1, rawModel);
    const availableCents = c.limitCents - currentInvoice.totalCents;
    const usage = calculateCardUsedPercent(currentInvoice.totalCents, c.limitCents);

    const closeDateObj = addMonths(m0, c.closeMonthOffset);
    const dueDateObj = addMonths(m0, c.dueMonthOffset);

    const transactions = [
      ...currentInvoice.activePurchases.map(p => ({
        id: p.id,
        name: p.title,
        category: p.category,
        amountCents: p.installmentCents,
        isShared: Boolean(p.isShared),
        debtorName: p.debtorName,
        debtorShareCents: p.isShared ? (p.installmentCents - p.person1ShareCents) : 0,
      })),
      ...currentInvoice.subscriptions.map(s => ({
        id: s.id,
        name: s.name,
        category: s.category,
        amountCents: s.amountCents,
        isSubscription: true,
      })),
      ...currentInvoice.oneOffExpenses.map(e => ({
        id: e.id,
        name: e.name,
        category: e.category,
        amountCents: e.amountCents,
        isOneOff: true,
      })),
    ];

    return {
      id: c.id,
      brand: c.brand,
      type: c.type,
      status: c.status,
      statusColor: c.statusColor,
      totalCents: currentInvoice.totalCents,
      totalDisplay: currentInvoice.totalDisplay,
      limitCents: c.limitCents,
      limitDisplay: formatCentsDisplay(c.limitCents),
      availableCents,
      availableDisplay: formatCentsDisplay(availableCents),
      limitUsed: usage.formatted,
      limitUsedPercentage: usage.percentage,
      closeDate: `${c.closeDayNumber < 10 ? '0' + c.closeDayNumber : c.closeDayNumber}/${SHORT_MONTH_NAMES[closeDateObj.getMonth()]}`,
      dueDate: `${c.dueDayNumber < 10 ? '0' + c.dueDayNumber : c.dueDayNumber}/${SHORT_MONTH_NAMES[dueDateObj.getMonth()]}`,
      closeDayNumber: c.closeDayNumber,
      dueDayNumber: c.dueDayNumber,
      nextCycleTotalCents: nextInvoice.totalCents,
      nextCycleTotalDisplay: nextInvoice.totalDisplay,
      currentInvoice,
      nextInvoice,
      transactions,
    };
  });

  const cardPrincipal = cards.find(c => c.id === 'card-principal') || cards[0];

  // 2. PARCELAMENTOS DERIVADOS DO MODELO
  const installments = rawModel.purchases.map(p => {
    const remainingInstallments = Math.max(0, p.totalInstallments - p.currentInstallment);
    const remainingCents = remainingInstallments * p.installmentCents;
    const progress = Math.round((p.currentInstallment * 100) / p.totalInstallments);
    const completed = p.currentInstallment >= p.totalInstallments;

    let finishDate;
    if (completed) {
      finishDate = 'Última parcela quitada!';
    } else {
      const finishMonthDate = addMonths(m0, remainingInstallments);
      finishDate = `${MONTH_NAMES[finishMonthDate.getMonth()]} / ${finishMonthDate.getFullYear()}`;
    }

    const curPad = p.currentInstallment < 10 ? `0${p.currentInstallment}` : String(p.currentInstallment);
    const totPad = p.totalInstallments < 10 ? `0${p.totalInstallments}` : String(p.totalInstallments);

    const baseResult = {
      id: p.id,
      cardId: p.cardId,
      title: p.title,
      category: p.category,
      currentInstallment: p.currentInstallment,
      totalInstallments: p.totalInstallments,
      installments: `${curPad} de ${totPad}`,
      installmentCents: p.installmentCents,
      installment: formatCentsDisplay(p.installmentCents),
      remainingCents,
      remaining: formatCentsDisplay(remainingCents),
      progress,
      completed,
      finishDate,
      remainingInstallments,
      isShared: Boolean(p.isShared),
    };

    if (p.isShared) {
      const person1ShareCents = p.person1ShareCents;
      const person2ShareCents = p.installmentCents - person1ShareCents;
      return {
        ...baseResult,
        debtorName: p.debtorName,
        person1ShareCents,
        person2ShareCents,
        debtorShareCents: person2ShareCents,
        debtorShareDisplay: formatCentsDisplay(person2ShareCents),
        yourShareCents: person1ShareCents,
        yourShareDisplay: formatCentsDisplay(person1ShareCents),
        splitPercent: `${Math.round((person1ShareCents * 100) / p.installmentCents)}%`,
      };
    }

    return baseResult;
  });

  // 3. ASSINATURAS DERIVADAS
  const subscriptions = rawModel.subscriptions.map(s => {
    const cardObj = rawModel.cards.find(c => c.id === s.cardId);
    return {
      id: s.id,
      name: s.name,
      category: s.category,
      frequency: s.frequency,
      amountCents: s.amountCents,
      amount: formatCentsDisplay(s.amountCents),
      card: cardObj ? cardObj.brand : 'Cartão',
      cardId: s.cardId,
    };
  });

  // 4. TIMELINE DE 5 MESES DO CARTÃO PRINCIPAL (Mês 0 a 4)
  // Determina o último mês em que há parcelas ativas no Cartão Principal
  const maxPrincipalOffset = rawModel.purchases
    .filter(p => p.cardId === 'card-principal')
    .reduce((max, p) => Math.max(max, p.totalInstallments - p.currentInstallment), 0);

  const timeline = [];
  for (let offset = 0; offset < 5; offset++) {
    const mDate = addMonths(m0, offset);
    const invoice = calculateMonthInvoice('card-principal', offset, rawModel);

    let status = 'Previsto';
    if (offset === 0) {
      status = 'Atual';
    } else if (offset === maxPrincipalOffset) {
      status = 'Final';
    }

    timeline.push({
      offset,
      month: MONTH_NAMES[mDate.getMonth()],
      shortMonth: SHORT_MONTH_NAMES[mDate.getMonth()],
      year: String(mDate.getFullYear()),
      totalCents: invoice.totalCents,
      total: invoice.totalDisplay,
      installments: invoice.installmentsCount,
      installmentsCount: invoice.installmentsCount,
      subscriptionsCount: invoice.subscriptionsCount,
      oneOffCount: invoice.oneOffCount,
      entriesCount: invoice.entriesCount,
      entriesDetail: invoice.entriesDetail,
      status,
    });
  }

  // 5. REGRA DO CENTAVO RESIDUAL (O Princípio de R$ 0,01)
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
    cardPrincipal,
    installments,
    subscriptions,
    timeline,
    residualCentRule,
    people: PEOPLE,
  };
}

// Instância padrão para consumo imediato nos componentes da Landing
export const sampleData = getSampleData();
