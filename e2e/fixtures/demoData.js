// e2e/fixtures/demoData.js

/**
 * Utilitário determinístico de aritmética de meses no formato 'YYYY-MM'.
 * Suporta travessia de virada de ano em ambas as direções.
 */
export function offsetMonth(yearMonth, offset) {
  const [yearStr, monthStr] = yearMonth.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const totalMonths = year * 12 + (month - 1) + offset;
  const targetYear = Math.floor(totalMonths / 12);
  const targetMonth = (totalMonths % 12) + 1;
  return `${targetYear}-${String(targetMonth).padStart(2, '0')}`;
}

export const demoClients = [
  { id: 'client-1', name: 'Mariana Silva', phone: '11988887777' },
  { id: 'client-2', name: 'Carlos Eduardo', phone: '11977776666' },
  { id: 'client-3', name: 'Beatriz Costa', phone: '11966665555' },
];

export const demoCards = [
  { id: 'card-1', name: 'Nubank Ultravioleta', limit: 15000, color: '#8A05BE', closingDay: 10, dueDay: 17 },
  { id: 'card-2', name: 'XP Visa Infinite', limit: 25000, color: '#1A1A1A', closingDay: 5, dueDay: 12 },
];

/**
 * Constrói o conjunto completo de dados sintéticos de demonstração no formato REAL do app,
 * centrado deterministicamente em torno de `baseMonth` (cobrindo ~8 meses: passado, presente e futuro).
 * 
 * Formato 100% canônico do Firestore do FinControl:
 * - Valores monetários em REAIS (ex: 300, 59.90, 350.50)
 * - Compras com array `installments` (number, value, dueDate YYYY-MM-DD, status)
 * - Compra compartilhada com `sharedDetails.person1/person2` (clientId, shareAmount, installments próprios)
 * - Despesas avulsas com `cardId`, `date`, `clientId`, `value`
 * - Assinaturas ativas com `value`, `amount`, `dueDate`, `cardId`, `clientId`
 */
export function getDemoData(baseMonth = '2026-11') {
  const m = (offset) => offsetMonth(baseMonth, offset);

  // 1. Compra 1: Mariana Silva - Notebook Dell Inspiron (8 parcelas de R$ 300,00 no Nubank)
  // Abrange M-3 a M+4 (passado, atual e futuro)
  const loan1Installments = [];
  for (let i = 1; i <= 8; i++) {
    const month = m(i - 4); // i=1 -> M-3, i=4 -> M0 (atual), i=8 -> M+4
    loan1Installments.push({
      number: i,
      value: 300.0,
      dueDate: `${month}-17`,
      status: i <= 3 ? 'Paga' : 'Pendente',
      paidDate: i <= 3 ? `${month}-15` : null,
    });
  }

  const loan1 = {
    id: 'loan-1',
    description: 'Notebook Dell Inspiron',
    cardId: 'card-1',
    clientId: 'client-1',
    totalValue: 2400.0,
    installmentsCount: 8,
    installmentValue: 300.0,
    status: 'Ativo',
    startDate: `${m(-3)}-02`,
    firstDueDate: `${m(-3)}-17`,
    purchaseType: 'normal',
    installments: loan1Installments,
  };

  // 2. Compra 2: Compartilhada Desigual (60% Mariana / 40% Carlos) - Geladeira French Door (10 parcelas no XP)
  // Total: R$ 5.000,00 (10x R$ 500,00). Mariana: R$ 3.000,00 (10x R$ 300,00). Carlos: R$ 2.000,00 (10x R$ 200,00).
  // Abrange M-2 a M+7
  const loan2RootInstallments = [];
  const loan2Person1Installments = [];
  const loan2Person2Installments = [];
  for (let i = 1; i <= 10; i++) {
    const month = m(i - 3); // i=1 -> M-2, i=3 -> M0 (atual), i=10 -> M+7
    const isPast = i <= 2;
    loan2RootInstallments.push({
      number: i,
      value: 500.0,
      dueDate: `${month}-12`,
      status: isPast ? 'Paga' : 'Pendente',
    });
    loan2Person1Installments.push({
      number: i,
      value: 300.0,
      dueDate: `${month}-12`,
      status: isPast ? 'Paga' : 'Pendente',
    });
    loan2Person2Installments.push({
      number: i,
      value: 200.0,
      dueDate: `${month}-12`,
      status: isPast ? 'Paga' : 'Pendente',
    });
  }

  const loan2 = {
    id: 'loan-2',
    description: 'Geladeira French Door Compartilhada',
    cardId: 'card-2',
    isShared: true,
    splitOption: 'custom',
    totalValue: 5000.0,
    installmentsCount: 10,
    installmentValue: 500.0,
    status: 'Ativo',
    startDate: `${m(-2)}-01`,
    firstDueDate: `${m(-2)}-12`,
    installments: loan2RootInstallments,
    sharedDetails: {
      person1: {
        clientId: 'client-1',
        shareAmount: 3000.0,
        sharePercentage: 60,
        installments: loan2Person1Installments,
      },
      person2: {
        clientId: 'client-2',
        shareAmount: 2000.0,
        sharePercentage: 40,
        installments: loan2Person2Installments,
      },
    },
  };

  // 3. Compra 3: Beatriz Costa - Curso de Pós-Graduação (6 parcelas de R$ 300,00 no Nubank)
  // Abrange M-1 a M+4
  const loan3Installments = [];
  for (let i = 1; i <= 6; i++) {
    const month = m(i - 2); // i=1 -> M-1, i=2 -> M0 (atual), i=6 -> M+4
    loan3Installments.push({
      number: i,
      value: 300.0,
      dueDate: `${month}-17`,
      status: i === 1 ? 'Paga' : 'Pendente',
    });
  }

  const loan3 = {
    id: 'loan-3',
    description: 'Curso de Pós-Graduação',
    cardId: 'card-1',
    clientId: 'client-3',
    totalValue: 1800.0,
    installmentsCount: 6,
    installmentValue: 300.0,
    status: 'Ativo',
    startDate: `${m(-1)}-08`,
    firstDueDate: `${m(-1)}-17`,
    purchaseType: 'normal',
    installments: loan3Installments,
  };

  // 4. Compra 4: Sem Atribuição (Unassigned) - Manutenção Predial (4 parcelas de R$ 200,00 no XP)
  // Abrange M0 a M+3
  const loan4Installments = [];
  for (let i = 1; i <= 4; i++) {
    const month = m(i - 1); // i=1 -> M0 (atual), i=4 -> M+3
    loan4Installments.push({
      number: i,
      value: 200.0,
      dueDate: `${month}-12`,
      status: 'Pendente',
    });
  }

  const loan4 = {
    id: 'loan-4',
    description: 'Manutenção Predial',
    cardId: 'card-2',
    clientId: null,
    totalValue: 800.0,
    installmentsCount: 4,
    installmentValue: 200.0,
    status: 'Ativo',
    startDate: `${m(0)}-03`,
    firstDueDate: `${m(0)}-12`,
    purchaseType: 'normal',
    installments: loan4Installments,
  };

  // 5. Assinaturas Vigentes Contratuais (valores em reais)
  const subscriptions = [
    {
      id: 'sub-1',
      name: 'Netflix Premium 4K',
      amount: 59.90,
      value: 59.90,
      cardId: 'card-1',
      dueDate: '15',
      clientId: 'client-1',
      status: 'Ativa',
      isActive: true,
    },
    {
      id: 'sub-2',
      name: 'Spotify Família',
      amount: 34.90,
      value: 34.90,
      cardId: 'card-2',
      dueDate: '10',
      clientId: 'client-2',
      status: 'Ativa',
      isActive: true,
    },
    {
      id: 'sub-3',
      name: 'Amazon Prime',
      amount: 19.90,
      value: 19.90,
      cardId: 'card-1',
      dueDate: '25',
      clientId: null, // Sem atribuição
      status: 'Ativa',
      isActive: true,
    },
  ];

  // 6. Despesas Avulsas (com cardId, date, value, clientId)
  const expenses = [
    // Exp 1: Compra no dia 05 do mês atual no Nubank (fechamento dia 10 -> fatura cai em M0)
    {
      id: 'exp-1',
      description: 'Supermercado Mensal',
      value: 350.50,
      cardId: 'card-1',
      date: `${m(0)}-05`,
      clientId: 'client-1',
      status: 'Pendente',
    },
    // Exp 2: Compra no dia 02 do mês atual no XP (fechamento dia 05 -> fatura cai em M0)
    {
      id: 'exp-2',
      description: 'Jantar Comemoração',
      value: 210.00,
      cardId: 'card-2',
      date: `${m(0)}-02`,
      clientId: 'client-2',
      status: 'Pendente',
    },
    // Exp 3: Compra no dia 25 do mês M-1 no Nubank (fechamento dia 10 -> dia 25 é pós-fechamento, fatura cai em M0!)
    {
      id: 'exp-3',
      description: 'Farmácia Noturna (Pós-Fechamento)',
      value: 85.00,
      cardId: 'card-1',
      date: `${m(-1)}-25`,
      clientId: 'client-3',
      status: 'Pendente',
    },
    // Exp 4: Compra no dia 02 do mês M-1 no Nubank (fechamento dia 10 -> fatura caiu em M-1)
    {
      id: 'exp-4',
      description: 'Combustível Posto',
      value: 150.00,
      cardId: 'card-1',
      date: `${m(-1)}-02`,
      clientId: 'client-1',
      status: 'Paga',
    },
  ];

  return {
    clients: demoClients,
    cards: demoCards,
    loans: [loan1, loan2, loan3, loan4],
    subscriptions,
    expenses,
    incomes: [],
    paidSubscriptions: [],
  };
}

/**
 * Gera a string do snippet de console que pode ser copiada/colada no DevTools do navegador
 * ou executada diretamente via `page.evaluate()`.
 */
export function generateConsoleSnippet(baseMonth = '2026-11') {
  const data = getDemoData(baseMonth);
  return `(() => {
  const demoData = ${JSON.stringify(data, null, 2)};
  const demoUser = {
    uid: 'demo-fase-4b',
    email: 'demo@fincontrol.app',
    displayName: 'Mariana Silva',
    name: 'Mariana Silva',
    plan: 'pro'
  };

  if (typeof window !== 'undefined') {
    window.__FINCONTROL_E2E_USER__ = demoUser;
    window.__FINCONTROL_E2E_MOCK_DATA__ = demoData;
    sessionStorage.setItem('fincontrol_e2e_user', JSON.stringify(demoUser));
    sessionStorage.setItem('fincontrol_e2e_plan', 'pro');
    sessionStorage.setItem('fincontrol_e2e_data', JSON.stringify(demoData));
    window.dispatchEvent(new CustomEvent('fincontrol:e2e-data-updated', { detail: demoData }));
    console.log('[FinControl] Dados de demonstração da Fase 4B carregados com sucesso!');
    if (window.location.pathname !== '/dashboard') {
      window.location.href = '/dashboard';
    } else {
      setTimeout(() => {
        window.location.reload();
      }, 50);
    }
  }

  return {
    status: 'success',
    clientsCount: demoData.clients.length,
    loansCount: demoData.loans.length,
    subscriptionsCount: demoData.subscriptions.length,
    expensesCount: demoData.expenses.length
  };
})();`;
}

export const demoData = getDemoData();
