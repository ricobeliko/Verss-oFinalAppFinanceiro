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

  describe('Fase 7.1 — 7 Cenários de Borda do Invariante Matemático', () => {
    function assertInvariantZeroDrift({ loans: lns = [], subscriptions: sbs = [], startMonth: sm, monthsCount: mc = 4, peopleIds = [] }) {
      const projTodos = calculateFutureCommitments({ loans: lns, subscriptions: sbs, startMonth: sm, monthsCount: mc });
      const projByPerson = peopleIds.map((pId) =>
        calculateFutureCommitmentsForPerson({ loans: lns, subscriptions: sbs, startMonth: sm, monthsCount: mc, personId: pId })
      );
      const projSemPessoa = calculateFutureCommitmentsForPerson({
        loans: lns,
        subscriptions: sbs,
        startMonth: sm,
        monthsCount: mc,
        personId: 'unassigned',
      });

      expect(projTodos.length).toBe(mc);

      for (let m = 0; m < mc; m++) {
        const monthLabel = projTodos[m]?.label || `Mês ${m}`;

        const somaInstCents =
          projByPerson.reduce((acc, p) => acc + Math.round((p[m]?.installmentsTotal || 0) * 100), 0) +
          Math.round((projSemPessoa[m]?.installmentsTotal || 0) * 100);
        const todosInstCents = Math.round((projTodos[m]?.installmentsTotal || 0) * 100);

        const somaSubsCents =
          projByPerson.reduce((acc, p) => acc + Math.round((p[m]?.subscriptionsTotal || 0) * 100), 0) +
          Math.round((projSemPessoa[m]?.subscriptionsTotal || 0) * 100);
        const todosSubsCents = Math.round((projTodos[m]?.subscriptionsTotal || 0) * 100);

        const somaTotalCents =
          projByPerson.reduce((acc, p) => acc + Math.round((p[m]?.totalCommitted || 0) * 100), 0) +
          Math.round((projSemPessoa[m]?.totalCommitted || 0) * 100);
        const todosTotalCents = Math.round((projTodos[m]?.totalCommitted || 0) * 100);

        expect(
          somaInstCents,
          `Divergência de parcelas em ${monthLabel}: soma partes (${somaInstCents}) != todos (${todosInstCents})`
        ).toBe(todosInstCents);

        expect(
          somaSubsCents,
          `Divergência de assinaturas em ${monthLabel}: soma partes (${somaSubsCents}) != todos (${todosSubsCents})`
        ).toBe(todosSubsCents);

        expect(
          somaTotalCents,
          `Divergência de total comprometido em ${monthLabel}: soma partes (${somaTotalCents}) != todos (${todosTotalCents})`
        ).toBe(todosTotalCents);
      }
    }

    it('Cenário (a): compartilhada com person2 sem clientId atribui parte de person2 a unassigned a zero centavos', () => {
      const testLoans = [{
        id: 'loan-shared-no-client-2',
        description: 'Mesa de Escritório',
        isShared: true,
        sharedDetails: {
          person1: {
            clientId: 'client-1',
            installments: [
              { number: 1, value: 150.55, dueDate: '2026-08-10' },
              { number: 2, value: 150.55, dueDate: '2026-09-10' }
            ]
          },
          person2: {
            clientId: null,
            installments: [
              { number: 1, value: 150.55, dueDate: '2026-08-10' },
              { number: 2, value: 150.55, dueDate: '2026-09-10' }
            ]
          }
        },
        installments: [
          { number: 1, value: 301.10, dueDate: '2026-08-10' },
          { number: 2, value: 301.10, dueDate: '2026-09-10' }
        ]
      }];

      assertInvariantZeroDrift({
        loans: testLoans,
        subscriptions: [],
        startMonth: '2026-08',
        monthsCount: 4,
        peopleIds: ['client-1']
      });
    });

    it('Cenário (b): compartilhada onde person1 e person2 são o MESMO clientId não causa dupla contagem e preserva zero drift', () => {
      const testLoans = [{
        id: 'loan-shared-same-client',
        description: 'Compra Dupla Mesma Pessoa',
        isShared: true,
        sharedDetails: {
          person1: {
            clientId: 'client-same',
            installments: [
              { number: 1, value: 75.25, dueDate: '2026-08-12' },
              { number: 2, value: 75.25, dueDate: '2026-09-12' }
            ]
          },
          person2: {
            clientId: 'client-same',
            installments: [
              { number: 1, value: 75.25, dueDate: '2026-08-12' },
              { number: 2, value: 75.25, dueDate: '2026-09-12' }
            ]
          }
        },
        installments: [
          { number: 1, value: 150.50, dueDate: '2026-08-12' },
          { number: 2, value: 150.50, dueDate: '2026-09-12' }
        ]
      }];

      assertInvariantZeroDrift({
        loans: testLoans,
        subscriptions: [],
        startMonth: '2026-08',
        monthsCount: 4,
        peopleIds: ['client-same']
      });
    });

    it('Cenário (c): divisão bem desigual 70/30 com centavos ímpares preserva soma exata a zero centavos', () => {
      const testLoans = [{
        id: 'loan-shared-unequal-70-30',
        description: 'Reforma Compartilhada 70/30',
        isShared: true,
        sharedDetails: {
          person1: {
            clientId: 'client-1',
            installments: [
              { number: 1, value: 233.33, dueDate: '2026-08-15' },
              { number: 2, value: 233.34, dueDate: '2026-09-15' }
            ]
          },
          person2: {
            clientId: 'client-2',
            installments: [
              { number: 1, value: 100.00, dueDate: '2026-08-15' },
              { number: 2, value: 99.99, dueDate: '2026-09-15' }
            ]
          }
        },
        installments: [
          { number: 1, value: 333.33, dueDate: '2026-08-15' },
          { number: 2, value: 333.33, dueDate: '2026-09-15' }
        ]
      }];

      assertInvariantZeroDrift({
        loans: testLoans,
        subscriptions: [],
        startMonth: '2026-08',
        monthsCount: 4,
        peopleIds: ['client-1', 'client-2']
      });
    });

    it('Cenário (d): horizonte cruzando virada de ano (2026-11 a 2027-02) preserva zero drift em todos os meses', () => {
      const testLoans = [
        {
          id: 'loan-year-cross-1',
          clientId: 'client-1',
          installments: [
            { number: 1, value: 100.00, dueDate: '2026-11-20' },
            { number: 2, value: 100.00, dueDate: '2026-12-20' },
            { number: 3, value: 100.00, dueDate: '2027-01-20' },
            { number: 4, value: 100.00, dueDate: '2027-02-20' }
          ]
        },
        {
          id: 'loan-year-cross-unassigned',
          clientId: null,
          installments: [
            { number: 1, value: 50.33, dueDate: '2026-11-05' },
            { number: 2, value: 50.33, dueDate: '2026-12-05' },
            { number: 3, value: 50.33, dueDate: '2027-01-05' },
            { number: 4, value: 50.34, dueDate: '2027-02-05' }
          ]
        }
      ];

      assertInvariantZeroDrift({
        loans: testLoans,
        subscriptions: [{ id: 'sub-year', name: 'Nuvem', amount: 29.90, clientId: 'client-1', isActive: true }],
        startMonth: '2026-11',
        monthsCount: 4,
        peopleIds: ['client-1']
      });
    });

    it('Cenário (e): mês intermediário sem nenhuma parcela retorna zero sem drift matemático', () => {
      const testLoans = [
        {
          id: 'loan-gap',
          clientId: 'client-1',
          installments: [
            { number: 1, value: 80.00, dueDate: '2026-08-10' },
            { number: 2, value: 80.00, dueDate: '2026-10-10' }
          ]
        }
      ];

      assertInvariantZeroDrift({
        loans: testLoans,
        subscriptions: [],
        startMonth: '2026-08',
        monthsCount: 3,
        peopleIds: ['client-1']
      });
    });

    it('Cenário (f): compartilhada sem sharedDetails.person1.installments não lança erro nem cria centavo fantasma', () => {
      const testLoans = [{
        id: 'loan-shared-missing-p1-inst',
        description: 'Compra Incompleta Legada',
        isShared: true,
        sharedDetails: {
          person1: {
            clientId: 'client-1'
          },
          person2: {
            clientId: 'client-2',
            installments: [
              { number: 1, value: 99.50, dueDate: '2026-08-15' },
              { number: 2, value: 99.50, dueDate: '2026-09-15' }
            ]
          }
        },
        installments: [
          { number: 1, value: 99.50, dueDate: '2026-08-15' },
          { number: 2, value: 99.50, dueDate: '2026-09-15' }
        ]
      }];

      expect(() => {
        assertInvariantZeroDrift({
          loans: testLoans,
          subscriptions: [],
          startMonth: '2026-08',
          monthsCount: 3,
          peopleIds: ['client-1', 'client-2']
        });
      }).not.toThrow();
    });

    it('Cenário (g): assinaturas inativas não são computadas e preservam zero drift', () => {
      const testSubs = [
        { id: 'sub-active', name: 'Ativa', amount: 49.90, clientId: 'client-1', isActive: true },
        { id: 'sub-inactive-1', name: 'Inativa 1', amount: 99.00, clientId: 'client-1', isActive: false },
        { id: 'sub-inactive-2', name: 'Inativa 2', amount: 150.00, clientId: null, status: 'Inativa' }
      ];

      assertInvariantZeroDrift({
        loans: [],
        subscriptions: testSubs,
        startMonth: '2026-08',
        monthsCount: 4,
        peopleIds: ['client-1']
      });
    });
  });
});
