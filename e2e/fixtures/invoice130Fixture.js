// e2e/fixtures/invoice130Fixture.js
/**
 * Fixture determinística com >= 130 itens para validação de paginação e batch de fatura.
 * Inclui:
 * - 70 compras parceladas individuais (70 parcelas no mês alvo)
 * - 20 compras compartilhadas (2 pessoas cada = 40 parcelas no mês alvo)
 * - 40 despesas avulsas no mês alvo
 * - 30 assinaturas recorrentes ativas no mês alvo
 * Total: 180 itens na fatura do mês base (2026-11).
 */

export function getInvoice130Fixture(baseMonth = '2026-11') {
  const clients = [
    { id: 'client-1', name: 'Mariana Vasconcelos de Albuquerque', phone: '11988887777', userId: 'test-user-130' },
    { id: 'client-2', name: 'Carlos Eduardo Mendonça da Silva', phone: '11977776666', userId: 'test-user-130' },
    { id: 'client-3', name: 'Beatriz Fontes de Vasconcelos', phone: '11966665555', userId: 'test-user-130' },
    { id: 'client-4', name: 'Rodrigo Henrique Guimarães Peixoto', phone: '11955554444', userId: 'test-user-130' },
    { id: 'client-5', name: 'Fernanda Cavalcanti de Oliveira', phone: '11944443333', userId: 'test-user-130' },
  ];

  const cards = [
    { id: 'card-1', name: 'Nubank Ultravioleta Black Mastercard', limit: 30000, color: '#8A05BE', closingDay: 10, dueDay: 17, userId: 'test-user-130' },
    { id: 'card-2', name: 'Itaú Personnalité Visa Infinite', limit: 50000, color: '#EC7000', closingDay: 5, dueDay: 12, userId: 'test-user-130' },
    { id: 'card-3', name: 'XP Investimentos Visa Infinite', limit: 40000, color: '#1A1A1A', closingDay: 15, dueDay: 22, userId: 'test-user-130' },
  ];

  const loans = [];
  const expenses = [];
  const subscriptions = [];

  // 1. 70 Compras Parceladas Individuais (1 parcela cada no mês 2026-11)
  for (let i = 1; i <= 70; i++) {
    const cardIdx = (i - 1) % cards.length;
    const clientIdx = (i - 1) % clients.length;
    const totalAmount = 1200 + i * 50;
    const installmentsCount = 12;
    const installmentValue = Math.round((totalAmount / installmentsCount) * 100) / 100;
    const currentInstallment = 3; // Parcela 3 cai exatamente em 2026-11

    const installments = [];
    for (let instNum = 1; instNum <= installmentsCount; instNum++) {
      const m = 8 + instNum;
      const yr = m > 12 ? 2027 : 2026;
      const mn = m > 12 ? m - 12 : m;
      installments.push({
        number: instNum,
        value: installmentValue,
        dueDate: `${yr}-${String(mn).padStart(2, '0')}-15`,
        status: instNum < currentInstallment ? 'Paga' : 'Pendente',
      });
    }

    loans.push({
      id: `loan-indiv-${i}`,
      description: `Compra Individual #${i} - Equipamento e Serviços`,
      cardId: cards[cardIdx].id,
      clientId: clients[clientIdx].id,
      totalAmount,
      totalValue: totalAmount,
      installmentsCount,
      installmentValue,
      currentInstallment,
      startDate: '2026-09-15',
      installments,
      isMyDebt: false,
      category: 'Equipamentos',
      userId: 'test-user-130',
    });
  }

  // 2. 20 Compras Compartilhadas (cada uma gera 2 itens na fatura = 40 itens)
  for (let i = 1; i <= 20; i++) {
    const cardIdx = (i - 1) % cards.length;
    const clientIdx = (i - 1) % clients.length;
    const client2Idx = (clientIdx + 1) % clients.length;
    const totalAmount = 2400 + i * 100;
    const installmentsCount = 12;
    const installmentValue = Math.round((totalAmount / installmentsCount) * 100) / 100;
    const shareVal = Math.round((installmentValue / 2) * 100) / 100;
    const currentInstallment = 3;

    const p1Installments = [];
    const p2Installments = [];
    for (let instNum = 1; instNum <= installmentsCount; instNum++) {
      const m = 8 + instNum;
      const yr = m > 12 ? 2027 : 2026;
      const mn = m > 12 ? m - 12 : m;
      const dueDate = `${yr}-${String(mn).padStart(2, '0')}-15`;
      p1Installments.push({
        number: instNum,
        value: shareVal,
        dueDate,
        status: instNum < currentInstallment ? 'Paga' : 'Pendente',
      });
      p2Installments.push({
        number: instNum,
        value: shareVal,
        dueDate,
        status: instNum < currentInstallment ? 'Paga' : 'Pendente',
      });
    }

    loans.push({
      id: `loan-shared-${i}`,
      description: `Compra Compartilhada #${i} - Gastos Coletivos`,
      cardId: cards[cardIdx].id,
      clientId: clients[clientIdx].id,
      totalAmount,
      totalValue: totalAmount,
      installmentsCount,
      installmentValue,
      currentInstallment,
      startDate: '2026-09-15',
      isShared: true,
      isMyDebt: false,
      category: 'Compartilhado',
      userId: 'test-user-130',
      sharedDetails: {
        person1: {
          clientId: clients[clientIdx].id,
          shareAmount: Math.round((totalAmount / 2) * 100) / 100,
          valuePaid: 0,
          balanceDue: Math.round((totalAmount / 2) * 100) / 100,
          statusPayment: 'Pendente',
          installments: p1Installments,
        },
        person2: {
          clientId: clients[client2Idx].id,
          shareAmount: Math.round((totalAmount / 2) * 100) / 100,
          valuePaid: 0,
          balanceDue: Math.round((totalAmount / 2) * 100) / 100,
          statusPayment: 'Pendente',
          installments: p2Installments,
        },
      },
    });
  }

  // 3. 40 Despesas Avulsas no mês base (2026-11)
  for (let i = 1; i <= 40; i++) {
    const cardIdx = (i - 1) % cards.length;
    const clientIdx = (i - 1) % clients.length;
    expenses.push({
      id: `expense-fixture-${i}`,
      description: `Despesa Avulsa #${i} - Manutenção e Suprimentos`,
      amount: 45.50 + i * 10,
      value: 45.50 + i * 10,
      date: `${baseMonth}-${String((i % 25) + 1).padStart(2, '0')}`,
      cardId: cards[cardIdx].id,
      clientId: clients[clientIdx].id,
      status: 'Pendente',
      category: 'Operacional',
      userId: 'test-user-130',
    });
  }

  // 4. 30 Assinaturas Recorrentes
  for (let i = 1; i <= 30; i++) {
    const cardIdx = (i - 1) % cards.length;
    const clientIdx = (i - 1) % clients.length;
    subscriptions.push({
      id: `sub-fixture-${i}`,
      name: `Assinatura #${i} Software SaaS e Cloud`,
      amount: 29.90 + i * 5,
      value: 29.90 + i * 5,
      cardId: cards[cardIdx].id,
      clientId: clients[clientIdx].id,
      billingCycle: 'monthly',
      paymentMethod: 'card',
      active: true,
      category: 'Software',
      userId: 'test-user-130',
    });
  }

  return {
    clients,
    cards,
    loans,
    expenses,
    subscriptions,
    paidSubscriptions: [],
  };
}
