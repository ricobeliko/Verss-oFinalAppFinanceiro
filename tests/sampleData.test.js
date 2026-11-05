// tests/sampleData.test.js
import { describe, it, expect } from 'vitest';
import {
  getSampleData,
  sampleData,
  PEOPLE,
  CANONICAL_PRICING,
} from '../src/features/landing/lib/sampleData';

describe('Landing Sample Data — Fonte Única e Coerência Matemática', () => {
  it('deve exportar estrutura de dados de exemplo válida por padrão', () => {
    expect(sampleData).toBeDefined();
    expect(sampleData.cards).toHaveLength(3);
    expect(sampleData.installments).toHaveLength(4);
    expect(sampleData.subscriptions).toHaveLength(4);
    expect(sampleData.timeline).toHaveLength(5);
    expect(sampleData.people).toEqual(PEOPLE);
  });

  it('deve fechar a fatura do Cartão Principal com a soma exata de suas transações (zero drift)', () => {
    const data = getSampleData(new Date(2026, 10, 5)); // Novembro/2026
    const principal = data.cards[0];

    const sumTransactionsCents = principal.transactions.reduce((acc, tx) => acc + tx.amountCents, 0);

    expect(sumTransactionsCents).toBe(principal.totalCents);
    expect(principal.totalCents).toBe(384025);
    expect(principal.totalDisplay).toBe('R$ 3.840,25');
  });

  it('deve respeitar a conservação de limite do cartão (Total + Disponível = Limite)', () => {
    const data = getSampleData();
    const principal = data.cards[0];

    expect(principal.totalCents + principal.availableCents).toBe(principal.limitCents);
    expect(principal.limitCents).toBe(1000000); // R$ 10.000,00
    expect(principal.availableCents).toBe(615975); // R$ 6.159,75
    expect(principal.availableDisplay).toBe('R$ 6.159,75');
  });

  it('deve sincronizar perfeitamente o Cartão Principal e a Timeline de 5 meses', () => {
    const data = getSampleData(new Date(2026, 10, 5));

    // Mês 0 da timeline é a fatura atual do Cartão Principal
    expect(data.timeline[0].totalCents).toBe(data.cards[0].totalCents);
    expect(data.timeline[0].total).toBe(data.cards[0].totalDisplay);

    // Mês 1 da timeline é a previsão da fatura seguinte do Cartão Principal
    expect(data.timeline[1].totalCents).toBe(data.cards[0].nextCycleTotalCents);
    expect(data.timeline[1].total).toBe(data.cards[0].nextCycleTotalDisplay);

    // Mês 4 da timeline bate com a última parcela do Smartphone de Trabalho
    const smartphoneInst = data.installments.find((i) => i.id === 'inst-smartphone');
    expect(data.timeline[4].totalCents).toBe(smartphoneInst.installmentCents);
    expect(data.timeline[4].installments).toBe(1);
    expect(data.timeline[4].status).toBe('Final');
  });

  it('deve garantir coerência do Notebook de Trabalho entre transação, parcela e divisão', () => {
    const data = getSampleData();
    const txNotebook = data.cards[0].transactions.find((tx) => tx.id === 'tx-notebook');
    const instNotebook = data.installments.find((inst) => inst.id === 'inst-notebook');

    expect(txNotebook.amountCents).toBe(instNotebook.installmentCents);
    expect(txNotebook.amountCents).toBe(115000); // R$ 1.150,00

    // Divisão 50/50 com Lucas
    expect(txNotebook.debtorShareCents).toBe(57500); // R$ 575,00
    expect(txNotebook.yourShareCents).toBe(57500); // R$ 575,00
    expect(txNotebook.debtorShareCents + txNotebook.yourShareCents).toBe(txNotebook.amountCents);

    // Saldo restante: 6 parcelas de 1.150,00 = 6.900,00
    expect(instNotebook.remainingCents).toBe(690000);
  });

  it('deve calcular datas relativas consecutivas sem quebrar na virada de ano', () => {
    // Caso de virada de ano: Novembro/2026 -> Dezembro/2026, Janeiro/2027, Fevereiro/2027, Março/2027
    const nov2026 = new Date(2026, 10, 15);
    const dataNov = getSampleData(nov2026);

    expect(dataNov.timeline[0].month).toBe('Novembro');
    expect(dataNov.timeline[0].year).toBe('2026');

    expect(dataNov.timeline[1].month).toBe('Dezembro');
    expect(dataNov.timeline[1].year).toBe('2026');

    expect(dataNov.timeline[2].month).toBe('Janeiro');
    expect(dataNov.timeline[2].year).toBe('2027');

    expect(dataNov.timeline[3].month).toBe('Fevereiro');
    expect(dataNov.timeline[3].year).toBe('2027');

    expect(dataNov.timeline[4].month).toBe('Março');
    expect(dataNov.timeline[4].year).toBe('2027');

    // Caso de Dezembro/2026
    const dez2026 = new Date(2026, 11, 1);
    const dataDez = getSampleData(dez2026);
    expect(dataDez.timeline[0].month).toBe('Dezembro');
    expect(dataDez.timeline[0].year).toBe('2026');
    expect(dataDez.timeline[1].month).toBe('Janeiro');
    expect(dataDez.timeline[1].year).toBe('2027');
  });

  it('deve fornecer regra do centavo residual coerente com R$ 100,00', () => {
    const data = getSampleData();
    const rule = data.residualCentRule;

    expect(rule.invoiceTotalCents).toBe(10000);
    expect(rule.partialPaidCents + rule.partialRemainingCents).toBe(rule.invoiceTotalCents);
    expect(rule.fullPaidCents + rule.fullRemainingCents).toBe(rule.invoiceTotalCents);
    expect(rule.partialRemainingCents).toBe(1); // 1 centavo
    expect(rule.fullRemainingCents).toBe(0);
  });

  it('deve expor preços canônicos oficiais sem mutações', () => {
    expect(CANONICAL_PRICING.freeCents).toBe(0);
    expect(CANONICAL_PRICING.freeDisplay).toBe('R$ 0');
    expect(CANONICAL_PRICING.proCents).toBe(2999);
    expect(CANONICAL_PRICING.proDisplay).toBe('R$ 29,99');
    expect(CANONICAL_PRICING.sku).toBe('PRO-LIFETIME-01');
  });
});
