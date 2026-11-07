// tests/financialParity.test.js
import { describe, it, expect } from 'vitest';
import {
  calculateConsolidatedClientReceivables,
  calculateInvoiceBreakdownForMonth,
} from '../src/services/financialService.js';
import {
  calculateConsolidatedClientReceivablesLegacy,
  calculateInvoiceBreakdownForMonthLegacy,
} from './helpers/legacyFinancial.js';
import { formatCurrencyDisplay } from '../src/utils/currency.js';

/**
 * Gerador pseudoaleatório com semente fixa (Lehmer / Park-Miller PRNG)
 * Garante 100% de reproducibilidade em qualquer máquina e ambiente.
 */
function createRng(seed = 42) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return function () {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

describe('Bloco 1 — Testes de Equivalência e Paridade Financeira (Constituição: Zero Drift)', () => {
  describe('1. formatCurrencyDisplay — Paridade Exata com toLocaleString', () => {
    const broadList = [
      0,
      -0,
      0.1,
      0.005,
      1234.5,
      -1234.5,
      1e9,
      -1e9,
      12345.67,
      999999.99,
      0.0001,
      1000000000.5,
      NaN,
      null,
      undefined,
      '12,5',
      '1000',
      '-500',
      'R$ 100,50',
      '',
      '   ',
      'abc',
      false,
      true,
      Infinity,
      -Infinity,
    ];

    it('deve formatar valores da lista ampla de forma idêntica a toLocaleString (incluindo espaço não separável)', () => {
      broadList.forEach((val) => {
        const actual = formatCurrencyDisplay(val);
        const num = Number(val);
        const expected =
          typeof num !== 'number' || isNaN(num)
            ? 'R$ 0,00'
            : num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

        expect(actual).toBe(expected);
      });
    });

    it('deve ter paridade para 3.000 números pseudoaleatórios', () => {
      const rng = createRng(1001);
      for (let i = 0; i < 3000; i++) {
        const val = (rng() * 200000 - 100000) * (rng() > 0.5 ? 1 : 0.01);
        const rounded = Math.round(val * 100) / 100;
        const actual = formatCurrencyDisplay(rounded);
        const expected = rounded.toLocaleString('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        });
        expect(actual).toBe(expected);
      }
    });
  });

  describe('2. calculateInvoiceBreakdownForMonth — 3.000 Casos de Paridade com Semente Fixa', () => {
    it('deve coincidir exatamente com calculateInvoiceBreakdownForMonthLegacy em todos os 3.000 casos', () => {
      const rng = createRng(2026);
      const months = ['2026-10', '2026-11', '2026-12', '2027-01', '', null, 'invalido'];
      const clientPool = ['cli-1', 'cli-2', 'cli-3', 'cli-dup', 'cli-dup', '', undefined, null];
      const cardPool = ['card-1', 'card-2', 'card-dup', 'card-dup', '', undefined];

      for (let i = 0; i < 3000; i++) {
        const targetMonth = months[Math.floor(rng() * months.length)];
        const personId = rng() > 0.3 ? (rng() > 0.5 ? 'all' : (rng() > 0.5 ? 'unassigned' : 'cli-1')) : 'cli-dup';
        const cardId = rng() > 0.3 ? (rng() > 0.5 ? 'all' : 'card-1') : 'card-dup';

        // Cartões (com suporte a duplicados para validar regra do primeiro encontrado)
        const cardsCount = Math.floor(rng() * 4);
        const cards = [];
        for (let c = 0; c < cardsCount; c++) {
          const cid = cardPool[Math.floor(rng() * cardPool.length)];
          cards.push({
            id: cid,
            name: `Card ${cid} (idx:${c})`,
            closingDay: 5 + (c * 5),
            dueDay: 12 + (c * 5),
          });
        }

        // Clientes
        const clientsCount = Math.floor(rng() * 5);
        const clients = [];
        for (let cl = 0; cl < clientsCount; cl++) {
          const cid = clientPool[Math.floor(rng() * clientPool.length)];
          clients.push({ id: cid, name: `Client ${cid}` });
        }

        // Compras parceladas
        const loansCount = Math.floor(rng() * 6);
        const loans = [];
        for (let l = 0; l < loansCount; l++) {
          const isShared = rng() > 0.5;
          const p1Id = clientPool[Math.floor(rng() * clientPool.length)];
          const p2Id = rng() > 0.2 ? clientPool[Math.floor(rng() * clientPool.length)] : undefined;
          const cid = cardPool[Math.floor(rng() * cardPool.length)];

          if (isShared) {
            loans.push({
              id: `loan-s-${l}`,
              description: `Shared ${l}`,
              cardId: cid,
              isShared: true,
              sharedDetails: {
                person1: {
                  clientId: p1Id,
                  shareAmount: 100,
                  installments: [
                    { number: 1, dueDate: '2026-11-10', value: 50, status: rng() > 0.5 ? 'Pago' : 'Pendente' },
                    { number: 2, dueDate: '2026-12-10', value: 50, status: 'Pendente' },
                  ],
                },
                person2: p2Id ? {
                  clientId: p2Id,
                  shareAmount: 100,
                  installments: [
                    { number: 1, dueDate: '2026-11-10', value: 50, status: rng() > 0.5 ? 'Paga' : 'Pendente' },
                    { number: 2, dueDate: '2026-12-10', value: 50, status: 'Pendente' },
                  ],
                } : null,
              },
            });
          } else {
            loans.push({
              id: `loan-i-${l}`,
              description: `Indiv ${l}`,
              cardId: cid,
              clientId: p1Id,
              isShared: false,
              installments: rng() > 0.3 ? [
                { number: 1, dueDate: '2026-11-12', value: 80, status: rng() > 0.5 ? 'Pago' : 'Pendente' },
              ] : [],
              dueDate: '2026-11-12',
              totalValue: 80,
              status: rng() > 0.5 ? 'Pago' : 'Pendente',
            });
          }
        }

        // Despesas avulsas (com date string, Date e Timestamp)
        const expensesCount = Math.floor(rng() * 8);
        const expenses = [];
        for (let e = 0; e < expensesCount; e++) {
          const cid = cardPool[Math.floor(rng() * cardPool.length)];
          const clid = clientPool[Math.floor(rng() * clientPool.length)];
          const dateType = Math.floor(rng() * 3);
          let dateVal;
          if (dateType === 0) {
            dateVal = '2026-11-04T12:00:00Z';
          } else if (dateType === 1) {
            dateVal = new Date(Date.UTC(2026, 10, 4, 12, 0, 0));
          } else {
            dateVal = { toDate: () => new Date(Date.UTC(2026, 10, 4, 12, 0, 0)) };
          }

          expenses.push({
            id: `exp-${e}`,
            description: `Exp ${e}`,
            cardId: cid,
            clientId: clid,
            value: 45.5,
            date: dateVal,
            status: rng() > 0.5 ? 'Paga' : 'Pendente',
          });
        }

        // Assinaturas
        const subsCount = Math.floor(rng() * 5);
        const subscriptions = [];
        for (let s = 0; s < subsCount; s++) {
          const cid = cardPool[Math.floor(rng() * cardPool.length)];
          const clid = clientPool[Math.floor(rng() * clientPool.length)];
          subscriptions.push({
            id: `sub-${s}`,
            name: `Sub ${s}`,
            cardId: cid,
            clientId: clid,
            amount: rng() > 0.5 ? 29.9 : undefined,
            value: 29.9,
            dueDate: '10',
            status: rng() > 0.3 ? 'Ativa' : 'Inativa',
            isActive: rng() > 0.3,
          });
        }

        const input = {
          targetMonth,
          loans,
          subscriptions,
          expenses,
          cards,
          personId,
          cardId,
          knownClientIds: clients,
          paidSubscriptions: [],
        };

        const actual = calculateInvoiceBreakdownForMonth(input);
        const expected = calculateInvoiceBreakdownForMonthLegacy(input);

        expect(actual).toEqual(expected);
      }
    });
  });

  describe('3. calculateConsolidatedClientReceivables — 3.000 Casos de Paridade com Semente Fixa', () => {
    it('deve coincidir exatamente com calculateConsolidatedClientReceivablesLegacy em todos os 3.000 casos', () => {
      const rng = createRng(3033);
      const months = ['2026-11', '2026-12', '2027-01', '', null, 'invalido'];
      const clientPool = ['cli-1', 'cli-2', 'cli-3', 'cli-dup', 'cli-dup', '', undefined, null];

      for (let i = 0; i < 3000; i++) {
        const targetMonth = months[Math.floor(rng() * months.length)];

        // Clientes (com IDs duplicados, nulos, undefined)
        const clientsCount = Math.floor(rng() * 6);
        const clients = [];
        for (let cl = 0; cl < clientsCount; cl++) {
          const cid = clientPool[Math.floor(rng() * clientPool.length)];
          clients.push(cid === null && rng() > 0.5 ? null : { id: cid, name: `Client ${cid}` });
        }

        // Compras
        const loansCount = Math.floor(rng() * 8);
        const loans = [];
        for (let l = 0; l < loansCount; l++) {
          const isShared = rng() > 0.5;
          const samePerson = rng() > 0.7;
          const p1Id = clientPool[Math.floor(rng() * clientPool.length)];
          const p2Id = samePerson ? p1Id : (rng() > 0.3 ? clientPool[Math.floor(rng() * clientPool.length)] : undefined);

          if (isShared) {
            loans.push({
              id: `loan-s-${l}`,
              isShared: true,
              sharedDetails: {
                person1: {
                  clientId: p1Id,
                  installments: [
                    { number: 1, dueDate: '2026-11-05', value: 60, status: rng() > 0.5 ? 'Pago' : 'Pendente' },
                    { number: 2, dueDate: '2026-12-05', value: 60, status: rng() > 0.5 ? 'Paga' : 'Pendente' },
                  ],
                },
                person2: p2Id ? {
                  clientId: p2Id,
                  installments: [
                    { number: 1, dueDate: '2026-11-05', value: 40, status: rng() > 0.5 ? 'Paga' : 'Pendente' },
                    { number: 2, dueDate: '2026-12-05', value: 40, status: 'Pendente' },
                  ],
                } : null,
              },
            });
          } else {
            loans.push({
              id: `loan-i-${l}`,
              clientId: p1Id,
              isShared: false,
              installments: rng() > 0.3 ? [
                { number: 1, dueDate: '2026-11-15', value: 120, status: rng() > 0.5 ? 'Pago' : 'Pendente' },
              ] : [],
              dueDate: '2026-11-15',
              totalValue: 120,
              status: rng() > 0.5 ? 'Pago' : 'Pendente',
            });
          }
        }

        // Despesas (com Date, String e Timestamp)
        const expensesCount = Math.floor(rng() * 8);
        const expenses = [];
        for (let e = 0; e < expensesCount; e++) {
          const clid = clientPool[Math.floor(rng() * clientPool.length)];
          const dateType = Math.floor(rng() * 3);
          let dateVal;
          if (dateType === 0) {
            dateVal = '2026-11-04';
          } else if (dateType === 1) {
            dateVal = new Date(Date.UTC(2026, 10, 4));
          } else {
            dateVal = { toDate: () => new Date(Date.UTC(2026, 10, 4)) };
          }

          expenses.push({
            id: `exp-${e}`,
            clientId: clid,
            value: 50,
            date: dateVal,
            status: rng() > 0.5 ? 'Pago' : 'Pendente',
          });
        }

        // Assinaturas
        const subsCount = Math.floor(rng() * 6);
        const subscriptions = [];
        for (let s = 0; s < subsCount; s++) {
          const clid = clientPool[Math.floor(rng() * clientPool.length)];
          subscriptions.push({
            id: `sub-${s}`,
            clientId: clid,
            amount: rng() > 0.5 ? 35 : undefined,
            value: 35,
            status: rng() > 0.3 ? 'Pago' : (rng() > 0.5 ? 'Paga' : 'Pendente'),
            isActive: rng() > 0.3,
          });
        }

        const input = {
          loans,
          expenses,
          subscriptions,
          clients,
          targetMonth,
        };

        const actual = calculateConsolidatedClientReceivables(input);
        const expected = calculateConsolidatedClientReceivablesLegacy(input);

        expect(actual).toEqual(expected);
      }
    });
  });
});
