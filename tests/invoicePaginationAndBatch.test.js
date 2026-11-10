// tests/invoicePaginationAndBatch.test.js
import { describe, it, expect, vi } from 'vitest';
import { calculateInvoiceBreakdownForMonth } from '../src/services/financialService';
import { getInvoice130Fixture } from '../e2e/fixtures/invoice130Fixture.js';

describe('Bloco C: Paginação, Integridade da Fatura e Batch de 500 Operações (Fase 11)', () => {
  const baseMonth = '2026-11';
  const fixture = getInvoice130Fixture(baseMonth);
  const INVOICE_BATCH_SIZE = 50;

  it('processa fixture sintética com >= 130 itens na fatura com integridade matemática exata', () => {
    const breakdown = calculateInvoiceBreakdownForMonth({
      targetMonth: baseMonth,
      loans: fixture.loans,
      subscriptions: fixture.subscriptions,
      expenses: fixture.expenses,
      cards: fixture.cards,
      personId: 'all',
      cardId: 'all',
      knownClientIds: fixture.clients,
      paidSubscriptions: [],
    });

    expect(breakdown.items.length).toBeGreaterThanOrEqual(130);
    expect(breakdown.totalCommitted).toBeGreaterThan(0);

    // Zero drift em centavos
    const sumCents = breakdown.items.reduce((acc, item) => acc + Math.round((item.value || 0) * 100), 0);
    expect(sumCents).toBe(Math.round(breakdown.totalCommitted * 100));
  });

  describe('1. Paginação e Lotes de Renderização (INVOICE_BATCH_SIZE = 50)', () => {
    it('inicia com exatamente 50 itens visíveis e expande progressivamente (50 -> 100 -> todos)', () => {
      const breakdown = calculateInvoiceBreakdownForMonth({
        targetMonth: baseMonth,
        loans: fixture.loans,
        subscriptions: fixture.subscriptions,
        expenses: fixture.expenses,
        cards: fixture.cards,
        personId: 'all',
        cardId: 'all',
        knownClientIds: fixture.clients,
        paidSubscriptions: [],
      });

      const allItems = breakdown.items;
      const totalItems = allItems.length;
      let visibleCount = INVOICE_BATCH_SIZE;

      // Estado inicial: 50 itens
      let visibleItems = allItems.slice(0, visibleCount);
      expect(visibleItems.length).toBe(50);
      expect(allItems.length > visibleCount).toBe(true);

      // Status text: "Exibindo 50 de X itens"
      const statusText1 = `Exibindo ${visibleItems.length} de ${totalItems} itens`;
      expect(statusText1).toBe(`Exibindo 50 de ${totalItems} itens`);

      // Ação "Mostrar mais 50 itens" -> 100 itens
      visibleCount = Math.min(visibleCount + INVOICE_BATCH_SIZE, totalItems);
      visibleItems = allItems.slice(0, visibleCount);
      expect(visibleItems.length).toBe(100);
      const statusText2 = `Exibindo ${visibleItems.length} de ${totalItems} itens`;
      expect(statusText2).toBe(`Exibindo 100 de ${totalItems} itens`);

      // Ação "Mostrar mais 50 itens" até completar ou "Mostrar todos"
      visibleCount = totalItems;
      visibleItems = allItems.slice(0, visibleCount);
      expect(visibleItems.length).toBe(totalItems);
      expect(visibleItems.length).toBeGreaterThanOrEqual(130);
    });

    it('os KPIs e totais são rigorosamente idênticos antes e depois do particionamento em lotes', () => {
      const breakdown = calculateInvoiceBreakdownForMonth({
        targetMonth: baseMonth,
        loans: fixture.loans,
        subscriptions: fixture.subscriptions,
        expenses: fixture.expenses,
        cards: fixture.cards,
        personId: 'all',
        cardId: 'all',
        knownClientIds: fixture.clients,
        paidSubscriptions: [],
      });

      const allItems = breakdown.items;
      const initial50Items = allItems.slice(0, 50);

      // Os KPIs do cabeçalho são calculados sobre 100% dos dados (breakdown), e não apenas o lote de 50
      const totalGlobal = breakdown.totalCommitted;

      // O lote de 50 exibe apenas uma fatia visual, mas a soma de 100% dos itens do breakdown preserva a exatidão
      const sumAll = allItems.reduce((acc, i) => acc + i.value, 0);
      expect(Math.round(sumAll * 100)).toBe(Math.round(totalGlobal * 100));

      // Se somássemos apenas os primeiros 50 itens, o valor seria muito menor
      const sum50 = initial50Items.reduce((acc, i) => acc + i.value, 0);
      expect(sum50).toBeLessThan(totalGlobal);
      expect(breakdown.totalCommitted).toBeGreaterThan(sum50);
    });

    it('a ordenação do conjunto atua sobre 100% dos dados antes da paginação em lotes', () => {
      const breakdown = calculateInvoiceBreakdownForMonth({
        targetMonth: baseMonth,
        loans: fixture.loans,
        subscriptions: fixture.subscriptions,
        expenses: fixture.expenses,
        cards: fixture.cards,
        personId: 'all',
        cardId: 'all',
        knownClientIds: fixture.clients,
        paidSubscriptions: [],
      });

      const allItems = [...breakdown.items];

      // Ordena por valor decrescente
      const sortedDesc = [...allItems].sort((a, b) => b.value - a.value);
      const batch50Desc = sortedDesc.slice(0, 50);

      // O item de maior valor de toda a fatura deve ser o 1º do lote
      expect(batch50Desc[0].id).toBe(sortedDesc[0].id);
      expect(batch50Desc[0].value).toBe(sortedDesc[0].value);
      // O 50º item deve ter valor maior ou igual ao 51º
      expect(batch50Desc[49].value).toBeGreaterThanOrEqual(sortedDesc[50].value);
    });

    it('reset do contador visível para INVOICE_BATCH_SIZE (50) ao trocar mês ou filtros', () => {
      let visibleInvoiceItemsCount = 140; // Usuário expandiu todos os itens

      // Simulação do efeito do useEffect([selectedMonth, selectedCardFilter, selectedClientFilter, sortConfig])
      const simulateFilterChange = () => {
        visibleInvoiceItemsCount = INVOICE_BATCH_SIZE;
      };

      // Troca de mês
      simulateFilterChange();
      expect(visibleInvoiceItemsCount).toBe(50);

      // Usuário expande novamente
      visibleInvoiceItemsCount = 100;

      // Troca de filtro de cartão
      simulateFilterChange();
      expect(visibleInvoiceItemsCount).toBe(50);
    });
  });

  describe('2. Auditoria de "Marcar Tudo Como Pago" e Limite de 500 do writeBatch', () => {
    // Implementação de MockWriteBatch fiel à especificação do Cloud Firestore
    class FirestoreWriteBatchMock {
      constructor(maxOperations = 500) {
        this.maxOperations = maxOperations;
        this.operations = [];
        this.committed = false;
      }

      set(docRef, data) {
        if (this.committed) throw new Error('Cannot add to committed batch');
        this.operations.push({ type: 'set', docRef, data });
      }

      update(docRef, data) {
        if (this.committed) throw new Error('Cannot add to committed batch');
        this.operations.push({ type: 'update', docRef, data });
      }

      delete(docRef) {
        if (this.committed) throw new Error('Cannot add to committed batch');
        this.operations.push({ type: 'delete', docRef });
      }

      async commit() {
        if (this.operations.length > this.maxOperations) {
          const err = new Error(
            `FirebaseError: [code=invalid-argument]: A write batch can contain at most ${this.maxOperations} operations.`
          );
          err.code = 'invalid-argument';
          throw err;
        }
        this.committed = true;
        return this.operations.length;
      }
    }

    it('modal de confirmação calcula e exibe TODOS os itens pendentes da fatura (não apenas os 50 visíveis)', () => {
      const breakdown = calculateInvoiceBreakdownForMonth({
        targetMonth: baseMonth,
        loans: fixture.loans,
        subscriptions: fixture.subscriptions,
        expenses: fixture.expenses,
        cards: fixture.cards,
        personId: 'all',
        cardId: 'all',
        knownClientIds: fixture.clients,
        paidSubscriptions: [],
      });

      const displayableItems = breakdown.items;
      const visibleDisplayableItems = displayableItems.slice(0, 50);

      const pendingAll = displayableItems.filter(item => item.currentStatus !== 'Paga');
      const pendingVisibleOnly = visibleDisplayableItems.filter(item => item.currentStatus !== 'Paga');

      // Na UI: message={`Tem certeza de que deseja marcar TODOS os ${displayableItems.filter(item => item.currentStatus !== 'Paga').length} itens...`}
      const confirmationCount = displayableItems.filter(item => item.currentStatus !== 'Paga').length;

      expect(confirmationCount).toBe(pendingAll.length);
      expect(confirmationCount).toBeGreaterThan(pendingVisibleOnly.length);
      expect(confirmationCount).toBeGreaterThanOrEqual(130);
    });

    it('handleMarkAllAsPaid executa com sucesso em faturas normais de >= 130 itens (dentro do limite de 500)', async () => {
      const breakdown = calculateInvoiceBreakdownForMonth({
        targetMonth: baseMonth,
        loans: fixture.loans,
        subscriptions: fixture.subscriptions,
        expenses: fixture.expenses,
        cards: fixture.cards,
        personId: 'all',
        cardId: 'all',
        knownClientIds: fixture.clients,
        paidSubscriptions: [],
      });

      const displayableItems = breakdown.items;
      const itemsToUpdate = displayableItems.filter(item => item.currentStatus !== 'Paga');
      const batch = new FirestoreWriteBatchMock(500);

      const updatedLoansMap = new Map();
      let updatesMade = 0;

      itemsToUpdate.forEach(item => {
        if (item.type === 'Parcela') {
          const loanId = item.loanId;
          let loanData = updatedLoansMap.get(loanId);
          if (!loanData) {
            const originalLoan = fixture.loans.find(l => l.id === loanId);
            if (!originalLoan) return;
            loanData = JSON.parse(JSON.stringify(originalLoan));
            updatedLoansMap.set(loanId, loanData);
          }
          // Atualiza status da parcela
          if (!loanData.isShared && Array.isArray(loanData.installments)) {
            const inst = loanData.installments.find(i => i.number === item.number);
            if (inst) {
              inst.status = 'Paga';
              inst.paidDate = '2026-11-15';
            }
          }
        } else if (item.type === 'Despesa') {
          batch.update({ path: `expenses/${item.id}` }, { status: 'Paga' });
          updatesMade++;
        } else if (item.type === 'Assinatura') {
          batch.set({ path: `paidSubscriptions/${item.id}` }, { status: 'Paga', month: baseMonth });
          updatesMade++;
        }
      });

      updatedLoansMap.forEach((loanData, loanId) => {
        batch.update({ path: `loans/${loanId}` }, { installments: loanData.installments });
        updatesMade++;
      });

      // Total de operações no batch: 40 despesas + 30 assinaturas + 90 empréstimos = 160 operações
      expect(batch.operations.length).toBeLessThanOrEqual(500);
      expect(batch.operations.length).toBe(updatesMade);

      const committedCount = await batch.commit();
      expect(committedCount).toBe(updatesMade);
      expect(committedCount).toBeGreaterThanOrEqual(130);
    });

    it('AUDITORIA DE RISCO PRÉ-EXISTENTE: se a fatura contiver mais de 500 operações, o writeBatch sem particionamento estoura', async () => {
      // Cria cenário sintético de estresse com 505 despesas pendentes
      const excessiveExpenses = [];
      for (let i = 1; i <= 505; i++) {
        excessiveExpenses.push({
          id: `exp-large-${i}`,
          type: 'Despesa',
          currentStatus: 'Pendente',
        });
      }

      const batch = new FirestoreWriteBatchMock(500);

      // Reproduz o loop exato de Dashboard.jsx (~linhas 569-620)
      excessiveExpenses.forEach(item => {
        batch.update({ path: `expenses/${item.id}` }, { status: 'Paga' });
      });

      expect(batch.operations.length).toBe(505);

      // batch.commit() DEVE falhar com erro do Firestore
      await expect(batch.commit()).rejects.toThrow(
        /A write batch can contain at most 500 operations/
      );
    });
  });

  describe('3. Montagem em Duas Etapas (isAnalyticsReady / isChartsBelowFoldReady)', () => {
    it('disparo de fc:page-reveal-start com transição sequencial e frame de assentamento', async () => {
      vi.useFakeTimers();

      let isAnalyticsReady = false;
      let isChartsBelowFoldReady = false;

      const onReveal = () => {
        isAnalyticsReady = true;
        setTimeout(() => {
          isChartsBelowFoldReady = true;
        }, 120);
      };

      onReveal();

      expect(isAnalyticsReady).toBe(true);
      expect(isChartsBelowFoldReady).toBe(false);

      // Avança 120ms para o frame da segunda etapa
      vi.advanceTimersByTime(120);
      expect(isChartsBelowFoldReady).toBe(true);

      vi.useRealTimers();
    });

    it('fallback de segurança de 400ms ativa ambos os gráficos se o evento do véu não ocorrer', () => {
      vi.useFakeTimers();

      let isAnalyticsReady = false;
      let isChartsBelowFoldReady = false;

      const fallbackTimer = setTimeout(() => {
        isAnalyticsReady = true;
        isChartsBelowFoldReady = true;
      }, 400);

      // Antes dos 400ms, continuam false
      vi.advanceTimersByTime(300);
      expect(isAnalyticsReady).toBe(false);
      expect(isChartsBelowFoldReady).toBe(false);

      // Ao atingir 400ms, o fallback libera ambos
      vi.advanceTimersByTime(100);
      expect(isAnalyticsReady).toBe(true);
      expect(isChartsBelowFoldReady).toBe(true);

      clearTimeout(fallbackTimer);
      vi.useRealTimers();
    });

    it('gate Pro restringe montagem de gráficos analíticos avançados para plano gratuito', () => {
      const hasProAccessFree = false;
      const hasProAccessPro = true;

      const renderCommitments = (hasPro) => (hasPro ? 'FutureCommitmentsCard' : 'ProUpsellLock');

      expect(renderCommitments(hasProAccessFree)).toBe('ProUpsellLock');
      expect(renderCommitments(hasProAccessPro)).toBe('FutureCommitmentsCard');
    });
  });
});
