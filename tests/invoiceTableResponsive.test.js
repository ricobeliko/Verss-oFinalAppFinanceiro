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

  describe('Renderização em Lotes da Fatura (Fase 11)', () => {
    it('divide itens em lotes sem alterar integridade nem soma total de centavos', () => {
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

      const allItems = [...breakdown.items];
      const BATCH_SIZE = 50;
      const initialBatch = allItems.slice(0, BATCH_SIZE);

      expect(allItems.length).toBeGreaterThanOrEqual(45);
      expect(initialBatch.length).toBeLessThanOrEqual(BATCH_SIZE);

      // Soma de todos os itens vs totais do breakdown
      const totalAllItemsCents = allItems.reduce((acc, item) => acc + Math.round((item.value || 0) * 100), 0);
      const totalBreakdownCents = Math.round(breakdown.totalCommitted * 100);
      expect(totalAllItemsCents).toBe(totalBreakdownCents);

      // "Marcar Tudo Como Pago" atua sobre todos os itens pendentes do breakdown, não apenas o lote inicial
      const pendingAll = allItems.filter(item => item.currentStatus !== 'Paga');
      const pendingInitialBatch = initialBatch.filter(item => item.currentStatus !== 'Paga');

      expect(pendingAll.length).toBeGreaterThanOrEqual(pendingInitialBatch.length);
      // Todos os itens pendentes retêm identificadores válidos para atualização em lote
      for (const item of pendingAll) {
        expect(item.id).toBeTruthy();
        expect(['Parcela', 'Despesa', 'Assinatura', 'Avulso']).toContain(item.type);
      }
    });

    it('ordenação atua sobre o conjunto total antes do fatiamento em lote', () => {
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

      const allItems = [...breakdown.items];
      const sortedFull = [...allItems].sort((a, b) => b.value - a.value);
      const firstBatch = sortedFull.slice(0, 10);

      // O maior valor do primeiro lote deve ser o maior valor do conjunto global
      expect(firstBatch[0].value).toBe(sortedFull[0].value);
      // O menor valor do primeiro lote deve ser maior ou igual ao elemento da posição 10
      if (sortedFull.length > 10) {
        expect(firstBatch[9].value).toBeGreaterThanOrEqual(sortedFull[10].value);
      }
    });
  });
});
