// tests/futureCommitmentsByPerson.test.js
import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import {
  calculateFutureCommitments,
  calculateFutureCommitmentsForPerson,
} from '../src/services/financialService';
import FutureCommitmentsCard from '../src/components/FutureCommitmentsCard';

describe('Projeção dos Próximos Meses por Pessoa — Domínio e Invariantes (Commit C)', () => {
  const startMonth = '2026-08';
  const personA = 'client-A';
  const personB = 'client-B';
  const personC = 'client-C';
  const allPeople = [personA, personB, personC];

  // Cenário complexo de estresse financeiro: compras exclusivas, compartilhadas ímpares e assinaturas
  const loans = [
    // 1. Compra exclusiva da Pessoa A (3x R$ 120,00)
    {
      id: 'loan-exclusive-A',
      description: 'Curso React',
      clientId: personA,
      isShared: false,
      installments: [
        { number: 1, value: 120.0, dueDate: '2026-08-15' },
        { number: 2, value: 120.0, dueDate: '2026-09-15' },
        { number: 3, value: 120.0, dueDate: '2026-10-15' },
      ],
    },
    // 2. Compra exclusiva da Pessoa B (2x R$ 85,50)
    {
      id: 'loan-exclusive-B',
      description: 'Tênis Corrida',
      clientId: personB,
      isShared: false,
      installments: [
        { number: 1, value: 85.5, dueDate: '2026-08-20' },
        { number: 2, value: 85.5, dueDate: '2026-09-20' },
      ],
    },
    // 3. Compra compartilhada com centavos ímpares (Total R$ 100,01 dividido entre A e B)
    // Parcela 1: A paga 50.01, B paga 50.00 (soma exata 100.01)
    // Parcela 2: A paga 50.00, B paga 50.01 (soma exata 100.01)
    {
      id: 'loan-shared-odd-cents',
      description: 'Jantar Compartilhado',
      isShared: true,
      sharedDetails: {
        person1: {
          clientId: personA,
          installments: [
            { number: 1, value: 50.01, dueDate: '2026-08-25' },
            { number: 2, value: 50.0, dueDate: '2026-09-25' },
          ],
        },
        person2: {
          clientId: personB,
          installments: [
            { number: 1, value: 50.0, dueDate: '2026-08-25' },
            { number: 2, value: 50.01, dueDate: '2026-09-25' },
          ],
        },
      },
      installments: [
        { number: 1, value: 100.01, dueDate: '2026-08-25' },
        { number: 2, value: 100.01, dueDate: '2026-09-25' },
      ],
    },
    // 4. Compra sem atribuição (titular sem clientId: 4x R$ 200,00)
    {
      id: 'loan-unassigned',
      description: 'Manutenção Veículo',
      clientId: null,
      isShared: false,
      installments: [
        { number: 1, value: 200.0, dueDate: '2026-08-05' },
        { number: 2, value: 200.0, dueDate: '2026-09-05' },
        { number: 3, value: 200.0, dueDate: '2026-10-05' },
        { number: 4, value: 200.0, dueDate: '2026-11-05' },
      ],
    },
  ];

  const subscriptions = [
    { id: 'sub-A', name: 'Software A', amount: 39.9, clientId: personA, isActive: true },
    { id: 'sub-B', name: 'Streaming B', value: 55.0, clientId: personB, isActive: true },
    { id: 'sub-unassigned', name: 'Nuvem Geral', amount: 19.99, clientId: null, isActive: true },
  ];

  it('INVARIANTE MATEMÁTICO: Para todo mês M, Projeção_Todos(M) == Soma(Projeção_Pessoas) + Projeção_SemPessoa(M) a zero drift', () => {
    const monthsCount = 4;

    // 1. Projeção Geral Consolidada ([Todos])
    const projTodos = calculateFutureCommitments({
      loans,
      subscriptions,
      startMonth,
      monthsCount,
    });

    expect(projTodos.length).toBe(monthsCount);

    // 2. Projeção individual por pessoa
    const projByPerson = allPeople.map((personId) => {
      return calculateFutureCommitmentsForPerson({
        loans,
        subscriptions,
        startMonth,
        monthsCount,
        personId,
      });
    });

    // 3. Projeção dos compromissos sem vínculo de pessoa
    const projSemPessoa = calculateFutureCommitmentsForPerson({
      loans,
      subscriptions,
      startMonth,
      monthsCount,
      personId: 'unassigned',
    });

    // 4. Validação estrita mês a mês (centavo a centavo)
    for (let m = 0; m < monthsCount; m++) {
      const monthLabel = projTodos[m].label;

      // Soma de parcelas de todas as pessoas + sem atribuição
      const somaParcelasCents =
        projByPerson.reduce(
          (acc, p) => acc + Math.round((p[m]?.installmentsTotal || 0) * 100),
          0
        ) + Math.round((projSemPessoa[m]?.installmentsTotal || 0) * 100);

      const todosParcelasCents = Math.round((projTodos[m]?.installmentsTotal || 0) * 100);

      // Soma de assinaturas de todas as pessoas + sem atribuição
      const somaAssinaturasCents =
        projByPerson.reduce(
          (acc, p) => acc + Math.round((p[m]?.subscriptionsTotal || 0) * 100),
          0
        ) + Math.round((projSemPessoa[m]?.subscriptionsTotal || 0) * 100);

      const todosAssinaturasCents = Math.round((projTodos[m]?.subscriptionsTotal || 0) * 100);

      // Total comprometido
      const somaTotalCommittedCents =
        projByPerson.reduce(
          (acc, p) => acc + Math.round((p[m]?.totalCommitted || 0) * 100),
          0
        ) + Math.round((projSemPessoa[m]?.totalCommitted || 0) * 100);

      const todosTotalCommittedCents = Math.round((projTodos[m]?.totalCommitted || 0) * 100);

      // Asserção inegociável de igualdade exata (ZERO DRIFT)
      expect(
        somaParcelasCents,
        `Divergência de parcelas no mês ${monthLabel}: soma partes (${somaParcelasCents}) != todos (${todosParcelasCents})`
      ).toBe(todosParcelasCents);

      expect(
        somaAssinaturasCents,
        `Divergência de assinaturas no mês ${monthLabel}: soma partes (${somaAssinaturasCents}) != todos (${todosAssinaturasCents})`
      ).toBe(todosAssinaturasCents);

      expect(
        somaTotalCommittedCents,
        `Divergência de total comprometido no mês ${monthLabel}: soma partes (${somaTotalCommittedCents}) != todos (${todosTotalCommittedCents})`
      ).toBe(todosTotalCommittedCents);
    }
  });

  it('Compras compartilhadas com valores ímpares (ex.: 50,01 + 50,00) preservam exatidão de soma', () => {
    const projA = calculateFutureCommitmentsForPerson({
      loans,
      subscriptions: [],
      startMonth,
      monthsCount: 2,
      personId: personA,
    });
    const projB = calculateFutureCommitmentsForPerson({
      loans,
      subscriptions: [],
      startMonth,
      monthsCount: 2,
      personId: personB,
    });
    const projTodos = calculateFutureCommitments({
      loans,
      subscriptions: [],
      startMonth,
      monthsCount: 2,
    });

    // Mês 0 (2026-08): A tem 120.00 + 50.01 = 170.01; B tem 85.50 + 50.00 = 135.50
    expect(projA[0].installmentsTotal).toBe(170.01);
    expect(projB[0].installmentsTotal).toBe(135.5);

    // Mês 1 (2026-09): A tem 120.00 + 50.00 = 170.00; B tem 85.50 + 50.01 = 135.51
    expect(projA[1].installmentsTotal).toBe(170.0);
    expect(projB[1].installmentsTotal).toBe(135.51);

    // Soma das pessoas no mês 0 sem o unassigned bate com a soma esperada
    const somaMes0Cents =
      Math.round(projA[0].installmentsTotal * 100) +
      Math.round(projB[0].installmentsTotal * 100) +
      20000; // unassigned: 200.00
    expect(somaMes0Cents).toBe(Math.round(projTodos[0].installmentsTotal * 100));
  });

  it('Pessoa sem compromissos retorna projeções com valores 0.00 sem erros', () => {
    const projC = calculateFutureCommitmentsForPerson({
      loans,
      subscriptions,
      startMonth,
      monthsCount: 4,
      personId: personC,
    });

    projC.forEach((item) => {
      expect(item.installmentsTotal).toBe(0);
      expect(item.subscriptionsTotal).toBe(0);
      expect(item.totalCommitted).toBe(0);
    });
  });

  it('FutureCommitmentsCard renderiza seletor segmentado com [Todos], clientes e [Sem atribuição]', () => {
    const clients = [
      { id: personA, name: 'Alice Cooper' },
      { id: personB, name: 'Bob Dylan' },
    ];

    const html = renderToString(
      React.createElement(FutureCommitmentsCard, {
        loans,
        subscriptions,
        selectedMonth: '2026-08',
        clients,
      })
    );

    // Estrutura semântica e A11y do seletor
    expect(html).toContain('role="group"');
    expect(html).toContain('aria-label="Filtrar projeção por pessoa"');

    // Botões de pessoas no seletor
    expect(html).toContain('Todos');
    expect(html).toContain('Alice Cooper');
    expect(html).toContain('Bob Dylan');
    expect(html).toContain('Sem atribuição');

    // Título e card
    expect(html).toContain('Projeção dos Próximos Meses');
    expect(html).toContain('Ago/26');
  });
});
