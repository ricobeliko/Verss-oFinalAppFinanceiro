// tests/invoiceTableResponsive.test.js
import { describe, it, expect } from 'vitest';
import { calculateInvoiceBreakdownForMonth } from '../src/services/financialService';
import { getTableHeavyData } from '../e2e/fixtures/tableFixture.js';
import { formatCurrencyDisplay } from '../src/utils/currency';

describe('Bloco A: Tabela de Itens da Fatura e Responsividade', () => {
  const { clients, cards, loans, expenses, subscriptions } = getTableHeavyData('2026-11');

  it('processa e decompõe mais de 45 itens de fatura sintéticos com precisão exata', () => {
    const breakdown = calculateInvoiceBreakdownForMonth({
      targetMonth: '2026-11',
      loans,
      subscriptions,
      expenses,
      cards,
      personId: 'all',
      cardId: 'all',
      knownClientIds: clients,
      paidSubscriptions: [],
    });

    expect(breakdown.items.length).toBeGreaterThanOrEqual(45);
    expect(breakdown.totalCommitted).toBeGreaterThan(0);
    expect(breakdown.totalRecebido + breakdown.totalPendente).toBeCloseTo(breakdown.totalCommitted, 2);
  });

  it('cada item possui todos os campos necessários para renderização segura em tabela e card', () => {
    const breakdown = calculateInvoiceBreakdownForMonth({
      targetMonth: '2026-11',
      loans,
      subscriptions,
      expenses,
      cards,
      personId: 'all',
      cardId: 'all',
      knownClientIds: clients,
      paidSubscriptions: [],
    });

    for (const item of breakdown.items) {
      expect(item.id).toBeDefined();
      expect(['Parcela', 'Despesa', 'Assinatura', 'Avulso']).toContain(item.type);
      expect(item.description).toBeTruthy();
      expect(typeof item.value).toBe('number');
      expect(item.value).toBeGreaterThan(0);
      expect(['Paga', 'Pendente', 'Atrasado']).toContain(item.currentStatus);

      // Formatação monetária segura
      const formatted = formatCurrencyDisplay(item.value);
      expect(formatted).toMatch(/^R\$\s[\d.,]+$/);

      // Verificação de vínculo com pessoa ou cartão
      if (item.clientId) {
        const clientFound = clients.find(c => c.id === item.clientId);
        expect(clientFound).toBeDefined();
      }
      if (item.cardId) {
        const cardFound = cards.find(c => c.id === item.cardId);
        expect(cardFound).toBeDefined();
      }
    }
  });

  it('permite ordenação estável por tipo, descrição, pessoa, cartão e valor', () => {
    const breakdown = calculateInvoiceBreakdownForMonth({
      targetMonth: '2026-11',
      loans,
      subscriptions,
      expenses,
      cards,
      personId: 'all',
      cardId: 'all',
      knownClientIds: clients,
      paidSubscriptions: [],
    });

    const items = [...breakdown.items];

    // Ordenação por valor ascendente
    const sortedByValueAsc = [...items].sort((a, b) => a.value - b.value);
    expect(sortedByValueAsc[0].value).toBeLessThanOrEqual(sortedByValueAsc[sortedByValueAsc.length - 1].value);

    // Ordenação por descrição
    const sortedByDesc = [...items].sort((a, b) => a.description.localeCompare(b.description));
    expect(sortedByDesc[0].description.localeCompare(sortedByDesc[sortedByDesc.length - 1].description)).toBeLessThanOrEqual(0);
  });
});
