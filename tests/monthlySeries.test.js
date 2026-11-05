// tests/monthlySeries.test.js
import { describe, it, expect } from 'vitest';
import {
  shiftMonth,
  calculateMonthlySeries,
  calculateFutureCommitmentsForPerson,
} from '../src/services/financialService';

describe('Série Mensal de Compromissos — Domínio e Invariantes (Fase 4B)', () => {
  describe('shiftMonth', () => {
    it('desloca meses corretamente dentro do mesmo ano', () => {
      expect(shiftMonth('2026-08', -3)).toBe('2026-05');
      expect(shiftMonth('2026-05', 3)).toBe('2026-08');
      expect(shiftMonth('2026-08', 0)).toBe('2026-08');
    });

    it('cruza virada de ano no sentido passado e futuro', () => {
      expect(shiftMonth('2026-02', -3)).toBe('2025-11');
      expect(shiftMonth('2026-11', 3)).toBe('2027-02');
      expect(shiftMonth('2026-01', -1)).toBe('2025-12');
      expect(shiftMonth('2026-12', 1)).toBe('2027-01');
    });

    it('trata entradas inválidas defensivamente', () => {
      expect(shiftMonth('')).toBe('');
      expect(shiftMonth(null)).toBe('');
      expect(shiftMonth('invalido')).toBe('');
    });
  });

  describe('calculateMonthlySeries — Estrutura e Variações', () => {
    const clients = [
      { id: 'client-ana', name: 'Ana Silva' },
      { id: 'client-bruno', name: 'Bruno Lima' },
    ];

    const testLoans = [
      // Compra exclusiva da Ana: 3x de R$ 100,00 (Ago, Set, Out de 2026)
      {
        id: 'loan-ana-1',
        description: 'Curso Ana',
        clientId: 'client-ana',
        isShared: false,
        installments: [
          { number: 1, value: 100.0, dueDate: '2026-08-10' },
          { number: 2, value: 100.0, dueDate: '2026-09-10' },
          { number: 3, value: 100.0, dueDate: '2026-10-10' },
        ],
      },
      // Compra compartilhada entre Ana e Bruno (70/30): 2x
      {
        id: 'loan-shared-1',
        description: 'Mercado Compartilhado',
        isShared: true,
        sharedDetails: {
          person1: {
            clientId: 'client-ana',
            installments: [
              { number: 1, value: 70.01, dueDate: '2026-08-15' },
              { number: 2, value: 70.0, dueDate: '2026-09-15' },
            ],
          },
          person2: {
            clientId: 'client-bruno',
            installments: [
              { number: 1, value: 30.0, dueDate: '2026-08-15' },
              { number: 2, value: 30.01, dueDate: '2026-09-15' },
            ],
          },
        },
      },
      // Compra sem atribuição (sem clientId): 2x de R$ 50,00
      {
        id: 'loan-unassigned-1',
        description: 'Gasto Sem Dono',
        clientId: null,
        isShared: false,
        installments: [
          { number: 1, value: 50.0, dueDate: '2026-08-20' },
          { number: 2, value: 50.0, dueDate: '2026-09-20' },
        ],
      },
    ];

    const testSubscriptions = [
      { id: 'sub-netflix', name: 'Netflix', amount: 55.9, clientId: 'client-ana', isActive: true },
      { id: 'sub-spotify', name: 'Spotify Familiar', amount: 34.9, clientId: 'client-bruno', isActive: true },
      { id: 'sub-gym', name: 'Academia Inativa', amount: 100.0, clientId: 'client-ana', isActive: false },
    ];

    it('gera série de 6 meses centrada no mês base com propriedades consistentes', () => {
      const series = calculateMonthlySeries({
        loans: testLoans,
        subscriptions: testSubscriptions,
        endMonth: '2026-08',
        monthsBack: 5,
        monthsForward: 0,
        personId: 'all',
        knownClientIds: clients,
      });

      expect(series).toHaveLength(6);
      expect(series[0].month).toBe('2026-03');
      expect(series[5].month).toBe('2026-08');
      expect(series[5].isCurrent).toBe(true);
      expect(series[5].isProjected).toBe(false);

      // Em agosto de 2026:
      // Parcelas: Ana (100) + Shared P1 (70.01) + Shared P2 (30.00) + Unassigned (50) = 250.01
      // Assinaturas ativas: Netflix (55.90) + Spotify (34.90) = 90.80
      // Total: 250.01 + 90.80 = 340.81
      const ago = series[5];
      expect(ago.installmentsTotal).toBe(250.01);
      expect(ago.subscriptionsTotal).toBe(90.8);
      expect(ago.totalCommitted).toBe(340.81);
      expect(ago.totalCommittedCents).toBe(34081);
    });

    it('INVARIANTE 1: ponto da série para o mês selecionado == calculateFutureCommitmentsForPerson ao centavo', () => {
      const selectedMonth = '2026-08';

      const series = calculateMonthlySeries({
        loans: testLoans,
        subscriptions: testSubscriptions,
        endMonth: selectedMonth,
        monthsBack: 3,
        monthsForward: 2,
        personId: 'all',
        knownClientIds: clients,
      });

      const currentPoint = series.find((p) => p.month === selectedMonth);
      expect(currentPoint).toBeDefined();

      const singleMonthFuture = calculateFutureCommitmentsForPerson({
        loans: testLoans,
        subscriptions: testSubscriptions,
        startMonth: selectedMonth,
        monthsCount: 1,
        personId: 'all',
        knownClientIds: clients,
      });

      expect(currentPoint.totalCommitted).toBe(singleMonthFuture[0].totalCommitted);
      expect(currentPoint.totalCommittedCents).toBe(Math.round(singleMonthFuture[0].totalCommitted * 100));
      expect(currentPoint.installmentsTotal).toBe(singleMonthFuture[0].installmentsTotal);
      expect(currentPoint.subscriptionsTotal).toBe(singleMonthFuture[0].subscriptionsTotal);
    });

    it('INVARIANTE 2: soma das pessoas + sem atribuição == Todos em cada mês da série', () => {
      const selectedMonth = '2026-08';

      const seriesAll = calculateMonthlySeries({
        loans: testLoans,
        subscriptions: testSubscriptions,
        endMonth: selectedMonth,
        monthsBack: 3,
        monthsForward: 3,
        personId: 'all',
        knownClientIds: clients,
      });

      const seriesAna = calculateMonthlySeries({
        loans: testLoans,
        subscriptions: testSubscriptions,
        endMonth: selectedMonth,
        monthsBack: 3,
        monthsForward: 3,
        personId: 'client-ana',
        knownClientIds: clients,
      });

      const seriesBruno = calculateMonthlySeries({
        loans: testLoans,
        subscriptions: testSubscriptions,
        endMonth: selectedMonth,
        monthsBack: 3,
        monthsForward: 3,
        personId: 'client-bruno',
        knownClientIds: clients,
      });

      const seriesUnassigned = calculateMonthlySeries({
        loans: testLoans,
        subscriptions: testSubscriptions,
        endMonth: selectedMonth,
        monthsBack: 3,
        monthsForward: 3,
        personId: 'unassigned',
        knownClientIds: clients,
      });

      expect(seriesAll).toHaveLength(7);

      seriesAll.forEach((pointAll, idx) => {
        const pointAna = seriesAna[idx];
        const pointBruno = seriesBruno[idx];
        const pointUnassigned = seriesUnassigned[idx];

        expect(pointAna.month).toBe(pointAll.month);
        expect(pointBruno.month).toBe(pointAll.month);
        expect(pointUnassigned.month).toBe(pointAll.month);

        const sumInstallmentsCents =
          pointAna.installmentsCents + pointBruno.installmentsCents + pointUnassigned.installmentsCents;
        expect(sumInstallmentsCents).toBe(pointAll.installmentsCents);

        const sumSubsCents =
          pointAna.subscriptionsCents + pointBruno.subscriptionsCents + pointUnassigned.subscriptionsCents;
        expect(sumSubsCents).toBe(pointAll.subscriptionsCents);

        const sumTotalCents =
          pointAna.totalCommittedCents + pointBruno.totalCommittedCents + pointUnassigned.totalCommittedCents;
        expect(sumTotalCents).toBe(pointAll.totalCommittedCents);
      });
    });

    it('trata divisão por zero sem NaN (retorna null para percentual indefinido)', () => {
      // Série com mês anterior zerado e mês atual com valor
      const loansZeroToHero = [
        {
          id: 'loan-zero-to-hero',
          description: 'Apenas em Setembro',
          clientId: 'client-ana',
          installments: [{ number: 1, value: 150.0, dueDate: '2026-09-10' }],
        },
      ];

      const series = calculateMonthlySeries({
        loans: loansZeroToHero,
        subscriptions: [],
        endMonth: '2026-09',
        monthsBack: 1, // Agosto (0) e Setembro (150)
        monthsForward: 0,
        personId: 'all',
      });

      expect(series).toHaveLength(2);
      const ago = series[0];
      const set = series[1];

      expect(ago.totalCommitted).toBe(0);
      expect(set.totalCommitted).toBe(150);

      // Divisão por zero: percentage é null (sem NaN), direction é 'up'
      expect(set.delta.percentage).toBeNull();
      expect(isNaN(set.delta.percentage)).toBe(false);
      expect(set.delta.direction).toBe('up');
      expect(set.delta.value).toBe(150.0);
    });

    it('trata série cruzando virada de ano (ex: 2026-10 a 2027-03)', () => {
      const yearCrossingLoans = [
        {
          id: 'loan-crossing',
          description: 'Compra 6x Virada',
          clientId: 'client-ana',
          installments: [
            { number: 1, value: 100.0, dueDate: '2026-10-10' },
            { number: 2, value: 100.0, dueDate: '2026-11-10' },
            { number: 3, value: 100.0, dueDate: '2026-12-10' },
            { number: 4, value: 100.0, dueDate: '2027-01-10' },
            { number: 5, value: 100.0, dueDate: '2027-02-10' },
            { number: 6, value: 100.0, dueDate: '2027-03-10' },
          ],
        },
      ];

      const series = calculateMonthlySeries({
        loans: yearCrossingLoans,
        subscriptions: [],
        endMonth: '2026-12',
        monthsBack: 2, // Out, Nov, Dez
        monthsForward: 3, // Jan, Fev, Mar
        personId: 'all',
      });

      expect(series).toHaveLength(6);
      expect(series[0].month).toBe('2026-10');
      expect(series[2].month).toBe('2026-12');
      expect(series[2].isCurrent).toBe(true);
      expect(series[3].month).toBe('2027-01');
      expect(series[3].isProjected).toBe(true);
      expect(series[5].month).toBe('2027-03');

      series.forEach((pt) => {
        expect(pt.totalCommitted).toBe(100.0);
        expect(pt.totalCommittedCents).toBe(10000);
      });
    });

    it('dados vazios produzem série de zeros sem erro nem NaN', () => {
      const series = calculateMonthlySeries({
        loans: [],
        subscriptions: [],
        endMonth: '2026-08',
        monthsBack: 5,
        monthsForward: 0,
        personId: 'all',
      });

      expect(series).toHaveLength(6);
      series.forEach((pt) => {
        expect(pt.totalCommitted).toBe(0);
        expect(pt.installmentsTotal).toBe(0);
        expect(pt.subscriptionsTotal).toBe(0);
        expect(pt.delta.value).toBe(0);
        expect(pt.delta.percentage).toBe(0);
        expect(pt.delta.direction).toBe('neutral');
        expect(isNaN(pt.delta.value)).toBe(false);
      });
    });

    it('suporta janela de 8 meses contínua com compras, compartilhadas e assinaturas', () => {
      const series = calculateMonthlySeries({
        loans: testLoans,
        subscriptions: testSubscriptions,
        endMonth: '2026-08',
        monthsBack: 4,
        monthsForward: 3,
        personId: 'all',
        knownClientIds: clients,
      });

      expect(series).toHaveLength(8);
      expect(series[0].month).toBe('2026-04');
      expect(series[4].month).toBe('2026-08');
      expect(series[4].isCurrent).toBe(true);
      expect(series[7].month).toBe('2026-11');
      expect(series[7].isProjected).toBe(true);
    });
  });
});
