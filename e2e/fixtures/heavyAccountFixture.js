// e2e/fixtures/heavyAccountFixture.js

export function offsetMonth(yearMonth, offset) {
  const [yearStr, monthStr] = yearMonth.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const totalMonths = year * 12 + (month - 1) + offset;
  const targetYear = Math.floor(totalMonths / 12);
  const targetMonth = (totalMonths % 12) + 1;
  return `${targetYear}-${String(targetMonth).padStart(2, '0')}`;
}

export function getHeavyAccountData(baseMonth = '2026-11') {
  const m = (offset) => offsetMonth(baseMonth, offset);

  // 1. 8 Cartões de Crédito com diferentes ciclos de fechamento e vencimento
  const cards = [
    { id: 'card-1', name: 'Nubank Ultravioleta Black', limit: 35000, color: '#8A05BE', closingDay: 10, dueDay: 17 },
    { id: 'card-2', name: 'Itaú Personnalité Visa Infinite', limit: 50000, color: '#EC7000', closingDay: 5, dueDay: 12 },
    { id: 'card-3', name: 'XP Investimentos Visa Infinite', limit: 40000, color: '#1A1A1A', closingDay: 15, dueDay: 22 },
    { id: 'card-4', name: 'Bradesco Aeternum Visa Infinite', limit: 70000, color: '#CC092F', closingDay: 1, dueDay: 8 },
    { id: 'card-5', name: 'Santander Unlimited Mastercard Black', limit: 45000, color: '#E60000', closingDay: 20, dueDay: 27 },
    { id: 'card-6', name: 'C6 Carbon Mastercard Black', limit: 30000, color: '#242424', closingDay: 8, dueDay: 15 },
    { id: 'card-7', name: 'Inter Mastercard Black Win', limit: 25000, color: '#FF7A00', closingDay: 12, dueDay: 19 },
    { id: 'card-8', name: 'BTG Pactual Ultrablue Mastercard', limit: 60000, color: '#001E62', closingDay: 25, dueDay: 2 },
  ];

  // 2. 10 Pessoas/Clientes com nomes realistas
  const clients = [
    { id: 'client-1', name: 'Mariana Vasconcelos de Albuquerque', phone: '11988887777' },
    { id: 'client-2', name: 'Carlos Eduardo Mendonça da Silva', phone: '11977776666' },
    { id: 'client-3', name: 'Beatriz Fontes de Vasconcelos', phone: '11966665555' },
    { id: 'client-4', name: 'Rodrigo Henrique Guimarães Peixoto', phone: '11955554444' },
    { id: 'client-5', name: 'Fernanda Cavalcanti de Oliveira', phone: '11944443333' },
    { id: 'client-6', name: 'Lucas Gabriel Martins Ferreira', phone: '11933332222' },
    { id: 'client-7', name: 'Juliana Pires de Camargo', phone: '11922221111' },
    { id: 'client-8', name: 'Thiago Alexandre de Souza', phone: '11911110000' },
    { id: 'client-9', name: 'Camila Nogueira Barreto', phone: '11999998888' },
    { id: 'client-10', name: 'Gustavo Henrique Bittencourt', phone: '11988881234' },
  ];

  // 3. 60 Compras Parceladas distribuídas entre M-24 e M+12 (média 10 parcelas cada)
  const loans = [];
  const loanCategories = ['Tecnologia', 'Casa & Reforma', 'Educação', 'Viagens', 'Saúde & Bem-estar', 'Automotivo', 'Móveis'];

  for (let idx = 1; idx <= 60; idx++) {
    const card = cards[idx % cards.length];
    const client = clients[idx % clients.length];
    const category = loanCategories[idx % loanCategories.length];
    const installmentsCount = 6 + (idx % 7) * 2; // de 6 a 18 parcelas (média ~10)
    // Início espalhado entre 20 meses atrás e 2 meses atrás
    const startOffset = -20 + (idx % 22);
    const totalAmount = Math.round((1200 + (idx * 317) % 18000) * 100) / 100;
    const installmentValue = Math.round((totalAmount / installmentsCount) * 100) / 100;

    const installments = [];
    const isShared = idx % 5 === 0; // 12 compras compartilhadas
    const p2Client = clients[(idx + 3) % clients.length];

    const p1Installments = [];
    const p2Installments = [];

    for (let num = 1; num <= installmentsCount; num++) {
      const instMonthOffset = startOffset + num - 1;
      const instMonth = m(instMonthOffset);
      const isPast = instMonthOffset < 0;
      const isCurrent = instMonthOffset === 0;

      let status = 'Pendente';
      if (isPast) {
        status = 'Paga';
      } else if (isCurrent) {
        status = idx % 2 === 0 ? 'Paga' : 'Pendente';
      }

      const instObj = {
        number: num,
        value: installmentValue,
        dueDate: `${instMonth}-${String(card.dueDay).padStart(2, '0')}`,
        status,
        paidDate: status === 'Paga' ? `${instMonth}-${String(Math.max(1, card.dueDay - 2)).padStart(2, '0')}` : null,
      };
      installments.push(instObj);

      if (isShared) {
        const half = Math.round((installmentValue / 2) * 100) / 100;
        p1Installments.push({ ...instObj, value: half });
        p2Installments.push({ ...instObj, value: half });
      }
    }

    const currentInstallment = Math.min(
      installmentsCount,
      Math.max(1, -startOffset + 1)
    );

    const loanObj = {
      id: `loan-heavy-${idx}`,
      description: `Compra Parcelada #${idx} ${category} ${client.name.split(' ')[0]}`,
      cardId: card.id,
      clientId: client.id,
      totalAmount,
      totalValue: totalAmount,
      installmentsCount,
      installmentValue,
      currentInstallment,
      status: currentInstallment > installmentsCount ? 'Finalizado' : 'Ativo',
      startDate: `${m(startOffset)}-05`,
      firstDueDate: `${m(startOffset)}-${String(card.dueDay).padStart(2, '0')}`,
      installments,
      isMyDebt: idx % 3 === 0,
      category,
      isShared,
    };

    if (isShared) {
      const halfTotal = Math.round((totalAmount / 2) * 100) / 100;
      loanObj.sharedDetails = {
        person1: {
          clientId: client.id,
          shareAmount: halfTotal,
          installments: p1Installments,
        },
        person2: {
          clientId: p2Client.id,
          shareAmount: halfTotal,
          installments: p2Installments,
        },
      };
    }

    loans.push(loanObj);
  }

  // 4. 250 Despesas Avulsas distribuídas pelos últimos 12 meses (M-11 a M0)
  const expenses = [];
  const expenseDescriptions = [
    'Supermercado Pão de Açúcar Compra da Semana',
    'Abastecimento Posto Ipiranga Gasolina Aditivada',
    'Farmácia Droga Raia Medicamentos e Cuidados',
    'Almoço Restaurante a Quilo Executivo',
    'Café Padaria Gourmet da Esquina',
    'Uber Viagem até o Centro e Reunião',
    'Estacionamento Shopping Center Iguatemi',
    'Pet Shop Ração Premium e Banhos',
    'Livraria Livro de Gestão Financeira',
    'Material de Papelaria Escritório em Casa',
    'Cinema com Pipoca e Refrigerante',
    'Lavagem Completa Veículo Familiar',
  ];

  for (let idx = 1; idx <= 250; idx++) {
    const monthOffset = -(idx % 12); // últimos 12 meses
    const day = 1 + (idx % 27);
    const dateStr = `${m(monthOffset)}-${String(day).padStart(2, '0')}`;
    const card = cards[idx % cards.length];
    const client = clients[idx % clients.length];
    const desc = `${expenseDescriptions[idx % expenseDescriptions.length]} #${idx}`;
    const value = Math.round((35 + (idx * 47) % 650) * 100) / 100;

    expenses.push({
      id: `exp-heavy-${idx}`,
      description: desc,
      cardId: card.id,
      clientId: client.id,
      value,
      date: `${dateStr}T12:00:00.000Z`,
      category: 'Alimentação & Rotina',
      status: monthOffset < 0 ? 'Paga' : (idx % 3 === 0 ? 'Paga' : 'Pendente'),
    });
  }

  // 5. 40 Receitas distribuídas pelos últimos 12 meses
  const incomes = [];
  const incomeDescriptions = [
    'Salário Mensal CLT Empresa de Tecnologia',
    'Rendimento de Investimentos e Dividendos FII',
    'Consultoria Freelance Arquitetura de Software',
    'Repasse de Aluguel Imóvel Residencial',
    'Venda de Equipamento Usado Mercado Livre',
  ];

  for (let idx = 1; idx <= 40; idx++) {
    const monthOffset = -(idx % 12);
    const day = 5 + (idx % 20);
    const dateStr = `${m(monthOffset)}-${String(day).padStart(2, '0')}`;
    const client = clients[idx % clients.length];
    const desc = `${incomeDescriptions[idx % incomeDescriptions.length]} #${idx}`;
    const value = Math.round((1500 + (idx * 280) % 7500) * 100) / 100;

    incomes.push({
      id: `inc-heavy-${idx}`,
      description: desc,
      clientId: client.id,
      value,
      date: dateStr,
      category: 'Rendimentos',
    });
  }

  // 6. 30 Assinaturas Recorrentes ativas com histórico de pagamento
  const subscriptions = [];
  const paidSubscriptions = [];
  const subServices = [
    { name: 'Adobe Creative Cloud', amount: 275.00 },
    { name: 'Spotify Familiar', amount: 44.90 },
    { name: 'JetBrains All Pack', amount: 310.00 },
    { name: 'Google Workspace', amount: 190.50 },
    { name: 'Netflix Premium 4K', amount: 59.90 },
    { name: 'Smart Fit Black', amount: 149.90 },
    { name: 'iCloud+ 2TB', amount: 49.90 },
    { name: 'Jornal Valor Econômico', amount: 89.90 },
    { name: 'Amazon Prime Anual', amount: 19.90 },
    { name: 'Disney+ e Star+', amount: 45.90 },
    { name: 'YouTube Premium Família', amount: 41.90 },
    { name: 'ChatGPT Plus OpenAI', amount: 120.00 },
    { name: 'GitHub Copilot Business', amount: 95.00 },
    { name: 'Sem Parar Pedágio', amount: 37.90 },
    { name: 'Seguro Celular Pier', amount: 65.00 },
  ];

  for (let idx = 1; idx <= 30; idx++) {
    const svc = subServices[(idx - 1) % subServices.length];
    const card = cards[idx % cards.length];
    const client = clients[idx % clients.length];
    const subId = `sub-heavy-${idx}`;

    subscriptions.push({
      id: subId,
      name: `${svc.name} (${client.name.split(' ')[0]})`,
      description: `${svc.name} #${idx}`,
      amount: svc.amount,
      value: svc.amount,
      dueDate: String(5 + (idx % 22)),
      cardId: card.id,
      clientId: client.id,
      status: 'Ativa',
    });

    // Histórico de pagamento para os últimos 12 meses
    for (let mo = -11; mo <= 0; mo++) {
      if (mo < 0 || idx % 2 === 0) {
        paidSubscriptions.push(`${subId}_${m(mo)}`);
      }
    }
  }

  return {
    clients,
    cards,
    loans,
    expenses,
    incomes,
    subscriptions,
    paidSubscriptions,
  };
}
