// e2e/fixtures/tableFixture.js

export function getTableHeavyData(baseMonth = '2026-11') {
  const clients = [
    { id: 'client-1', name: 'Mariana Vasconcelos de Albuquerque', phone: '11988887777' },
    { id: 'client-2', name: 'Carlos Eduardo Mendonça da Silva', phone: '11977776666' },
    { id: 'client-3', name: 'Beatriz Fontes de Vasconcelos', phone: '11966665555' },
    { id: 'client-4', name: 'Rodrigo Henrique Guimarães Peixoto', phone: '11955554444' },
    { id: 'client-5', name: 'Fernanda Cavalcanti de Oliveira', phone: '11944443333' },
  ];

  const cards = [
    { id: 'card-1', name: 'Nubank Ultravioleta Black Mastercard', limit: 25000, color: '#8A05BE', closingDay: 10, dueDay: 17 },
    { id: 'card-2', name: 'Itaú Personnalité Visa Infinite', limit: 40000, color: '#EC7000', closingDay: 5, dueDay: 12 },
    { id: 'card-3', name: 'XP Investimentos Visa Infinite', limit: 35000, color: '#1A1A1A', closingDay: 15, dueDay: 22 },
  ];

  const loans = [];
  const expenses = [];
  const subscriptions = [];

  // 1. 25 Compras Parceladas com descrições compridas e valores variados
  const loanTemplates = [
    { desc: 'Notebook Dell XPS 15 32GB RAM e Monitor 4K', total: 12345.60, count: 12, cur: 4, clientIdx: 0, cardIdx: 0 },
    { desc: 'Smartphone Galaxy S24 Ultra Titanium Gray', total: 7890.00, count: 10, cur: 3, clientIdx: 1, cardIdx: 1 },
    { desc: 'Revisão Periódica Completa Concessionária Autorizada', total: 3450.00, count: 6, cur: 2, clientIdx: 2, cardIdx: 0 },
    { desc: 'Curso de Pós-Graduação em Arquitetura de Software', total: 6000.00, count: 12, cur: 5, clientIdx: 0, cardIdx: 2 },
    { desc: 'Passagens Aéreas Internacionais Férias em Família', total: 9800.00, count: 10, cur: 4, clientIdx: 3, cardIdx: 1 },
    { desc: 'Reforma da Sala de Estar e Piso Porcelanato', total: 15600.00, count: 12, cur: 6, clientIdx: 1, cardIdx: 2 },
    { desc: 'Geladeira French Door Inox Frost Free 540L', total: 8499.00, count: 10, cur: 5, clientIdx: 4, cardIdx: 0 },
    { desc: 'Mesa de Jantar Madeira Maciça com 8 Cadeiras', total: 4200.00, count: 6, cur: 3, clientIdx: 2, cardIdx: 1 },
    { desc: 'Smart TV 75 Polegadas Neo QLED 4K Samsung', total: 6799.00, count: 10, cur: 2, clientIdx: 0, cardIdx: 2 },
    { desc: 'Ar Condicionado Inverter Dual 18000 BTUs Quente/Frio', total: 3890.00, count: 6, cur: 4, clientIdx: 3, cardIdx: 0 },
    { desc: 'Lava e Seca Smart Front Load 14kg Titanium', total: 5299.00, count: 8, cur: 3, clientIdx: 4, cardIdx: 1 },
    { desc: 'iPad Pro 13 Polegadas M4 com Apple Pencil Pro', total: 11200.00, count: 10, cur: 1, clientIdx: 1, cardIdx: 2 },
    { desc: 'Seguro Automotivo Anual Cobertura Completa', total: 4680.00, count: 6, cur: 4, clientIdx: 0, cardIdx: 0 },
    { desc: 'Móveis Planejados Cozinha Gourmet e Ilha', total: 18500.00, count: 12, cur: 7, clientIdx: 2, cardIdx: 1 },
    { desc: 'Bicicleta Elétrica Urbana Aro 29 com Bateria Lítio', total: 6400.00, count: 8, cur: 5, clientIdx: 3, cardIdx: 2 },
    { desc: 'Câmera Mirrorless Sony Alpha A7 IV com Lente 24-70mm', total: 16800.00, count: 12, cur: 3, clientIdx: 0, cardIdx: 0 },
    { desc: 'Colchão Queen Size Molas Ensacadas Viscoelástico', total: 3990.00, count: 6, cur: 2, clientIdx: 4, cardIdx: 1 },
    { desc: 'Conjunto de Pneus Michelin Primacy 4 Aro 18', total: 3200.00, count: 4, cur: 2, clientIdx: 1, cardIdx: 2 },
    { desc: 'Aparelho Ortodôntico Invisível Tratamento Completo', total: 8500.00, count: 10, cur: 6, clientIdx: 2, cardIdx: 0 },
    { desc: 'Console PlayStation 5 Slim com 2 Controles e Headset', total: 4100.00, count: 8, cur: 4, clientIdx: 3, cardIdx: 1 },
    // 5 Compras Compartilhadas com sharedDetails
    { desc: 'Compra Compartilhada: Supermercado Mensal Pão de Açúcar', total: 2400.00, count: 3, cur: 2, clientIdx: 0, cardIdx: 0, isShared: true, p2ClientIdx: 1 },
    { desc: 'Compra Compartilhada: Hospedagem Pousada Praia do Rosa', total: 3600.00, count: 4, cur: 2, clientIdx: 2, cardIdx: 1, isShared: true, p2ClientIdx: 3 },
    { desc: 'Compra Compartilhada: Utensílios e Louças Jantar Natalino', total: 1800.00, count: 2, cur: 1, clientIdx: 1, cardIdx: 2, isShared: true, p2ClientIdx: 4 },
    { desc: 'Compra Compartilhada: Passagens de Trem Turístico Serrano', total: 1500.00, count: 3, cur: 2, clientIdx: 0, cardIdx: 0, isShared: true, p2ClientIdx: 2 },
    { desc: 'Compra Compartilhada: Material de Pintura e Reforma Coletiva', total: 2900.00, count: 4, cur: 3, clientIdx: 3, cardIdx: 1, isShared: true, p2ClientIdx: 4 },
  ];

  loanTemplates.forEach((tpl, idx) => {
    const instVal = Math.round((tpl.total / tpl.count) * 100) / 100;
    const installments = [];
    for (let i = 1; i <= tpl.count; i++) {
      installments.push({
        number: i,
        value: instVal,
        dueDate: `${baseMonth}-15`,
        status: i < tpl.cur ? 'Paga' : (i === tpl.cur ? (idx % 3 === 0 ? 'Paga' : 'Pendente') : 'Pendente'),
      });
    }

    const loanObj = {
      id: `loan-heavy-${idx + 1}`,
      description: tpl.desc,
      cardId: cards[tpl.cardIdx].id,
      clientId: clients[tpl.clientIdx].id,
      totalAmount: tpl.total,
      installmentsCount: tpl.count,
      installmentValue: instVal,
      currentInstallment: tpl.cur,
      startDate: '2026-06-15',
      installments,
      isMyDebt: false,
      category: 'Diversos',
    };

    if (tpl.isShared) {
      const halfTotal = Math.round((tpl.total / 2) * 100) / 100;
      const halfInst = Math.round((instVal / 2) * 100) / 100;
      loanObj.sharedDetails = {
        person1: {
          clientId: clients[tpl.clientIdx].id,
          shareAmount: halfTotal,
          installments: installments.map(ins => ({ ...ins, value: halfInst })),
        },
        person2: {
          clientId: clients[tpl.p2ClientIdx].id,
          shareAmount: halfTotal,
          installments: installments.map(ins => ({ ...ins, value: halfInst })),
        },
      };
    }

    loans.push(loanObj);
  });

  // 2. 15 Despesas Avulsas com descrições compridas no mês base
  const expenseTemplates = [
    { desc: 'Supermercado Pão de Açúcar Loja Central 123 Granja Viana', val: 1450.85, cardIdx: 0, clientIdx: 0 },
    { desc: 'Combustível Posto Shell Rodovia dos Imigrantes Km 45', val: 320.50, cardIdx: 1, clientIdx: 1 },
    { desc: 'Farmácia Droga Raia Medicamentos Especiais e Vitaminas', val: 489.90, cardIdx: 2, clientIdx: 2 },
    { desc: 'Jantar de Celebração de Aniversário Restaurante Fasano Jardins', val: 1250.00, cardIdx: 0, clientIdx: 3 },
    { desc: 'Manutenção Preventiva de Emergência Encanamento Predial', val: 890.00, cardIdx: 1, clientIdx: 4 },
    { desc: 'Consulta Médica Dermatologista Especialista em Procedimentos', val: 650.00, cardIdx: 2, clientIdx: 0 },
    { desc: 'Pet Shop Petz Rações Premium Medicamentos e Acessórios', val: 410.30, cardIdx: 0, clientIdx: 1 },
    { desc: 'Livraria Cultura Livros Técnicos e Didáticos de Tecnologia', val: 560.20, cardIdx: 1, clientIdx: 2 },
    { desc: 'Óptica e Joalheria Lentes Antirreflexo Multifocais', val: 2100.00, cardIdx: 2, clientIdx: 3 },
    { desc: 'Padaria e Confeitaria Artesanal Pães Especiais e Café Gourmet', val: 185.40, cardIdx: 0, clientIdx: 4 },
    { desc: 'Estacionamento Mensalista Edifício Comercial Paulista', val: 450.00, cardIdx: 1, clientIdx: 0 },
    { desc: 'Lavanderia Especializada Higienização de Ternos e Casacos', val: 280.00, cardIdx: 2, clientIdx: 1 },
    { desc: 'Papelaria Universitária Materiais para Escritório e Impressão', val: 195.80, cardIdx: 0, clientIdx: 2 },
    { desc: 'Adega e Empório Vinhos Importados e Queijos Especiais', val: 890.50, cardIdx: 1, clientIdx: 3 },
    { desc: 'Serviço de Chaveiro e Troca de Fechadura Tetra Segurança', val: 340.00, cardIdx: 2, clientIdx: 4 },
  ];

  expenseTemplates.forEach((exp, idx) => {
    expenses.push({
      id: `exp-heavy-${idx + 1}`,
      description: exp.desc,
      cardId: cards[exp.cardIdx].id,
      clientId: clients[exp.clientIdx].id,
      value: exp.val,
      date: `${baseMonth}-08T14:30:00.000Z`,
      category: 'Alimentação & Serviços',
    });
  });

  // 3. 8 Assinaturas Recorrentes com descrições compridas
  const subTemplates = [
    { desc: 'Assinatura Mensal Adobe Creative Cloud All Apps', val: 275.00, cardIdx: 0, clientIdx: 0 },
    { desc: 'Plano Familiar Spotify Premium Sem Anúncios e Qualidade Máxima', val: 44.90, cardIdx: 1, clientIdx: 1 },
    { desc: 'Assinatura Anual JetBrains All Products Pack Developers', val: 310.00, cardIdx: 2, clientIdx: 2 },
    { desc: 'Plano Corporativo Google Workspace Business Plus', val: 190.50, cardIdx: 0, clientIdx: 3 },
    { desc: 'Assinatura Streaming Netflix Plano Premium 4K HDR', val: 59.90, cardIdx: 1, clientIdx: 4 },
    { desc: 'Assinatura Academia Smart Fit Plano Black Nacional', val: 149.90, cardIdx: 2, clientIdx: 0 },
    { desc: 'Serviço de Armazenamento Nuvem iCloud+ 2TB Familiar', val: 49.90, cardIdx: 0, clientIdx: 1 },
    { desc: 'Assinatura Semanal Jornal Valor Econômico Edição Digital', val: 89.90, cardIdx: 1, clientIdx: 2 },
  ];

  subTemplates.forEach((sub, idx) => {
    subscriptions.push({
      id: `sub-heavy-${idx + 1}`,
      name: sub.desc,
      description: sub.desc,
      amount: sub.val,
      value: sub.val,
      dueDate: '15',
      cardId: cards[sub.cardIdx].id,
      clientId: clients[sub.clientIdx].id,
      status: 'Ativa',
    });
  });

  return { clients, cards, loans, expenses, subscriptions };
}
