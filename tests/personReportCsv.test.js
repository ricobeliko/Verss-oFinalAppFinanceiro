// tests/personReportCsv.test.js
import { describe, it, expect } from 'vitest';
import {
  generatePersonReportCsv,
  sanitizeCsvFormula,
  sanitizeFilename,
} from '../src/services/csvExportService';

describe('Export CSV Mensal e Anual por Pessoa (Commit D)', () => {
  const clientA = { id: 'client-A', name: 'Ana Oliveira' };
  const clientB = { id: 'client-B', name: 'Bruno Santos' };
  const targetMonth = '2026-08';
  const targetYear = '2026';

  const cards = [
    { id: 'card-1', name: 'Nubank Ultravioleta' },
    { id: 'card-2', name: 'Itaú Personalité' },
  ];

  const loans = [
    // Compra exclusiva da Ana
    {
      id: 'loan-ana',
      description: 'Notebook Trabalho',
      clientId: clientA.id,
      cardId: 'card-1',
      isShared: false,
      installmentsCount: 3,
      installments: [
        { number: 1, value: 350.25, dueDate: '2026-08-10', status: 'Pendente' },
        { number: 2, value: 350.25, dueDate: '2026-09-10', status: 'Pendente' },
        { number: 3, value: 350.25, dueDate: '2026-10-10', status: 'Pendente' },
      ],
    },
    // Compra exclusiva do Bruno
    {
      id: 'loan-bruno',
      description: 'Smartphone Bruno',
      clientId: clientB.id,
      cardId: 'card-2',
      isShared: false,
      installmentsCount: 2,
      installments: [
        { number: 1, value: 800.0, dueDate: '2026-08-15', status: 'Pendente' },
        { number: 2, value: 800.0, dueDate: '2026-09-15', status: 'Pendente' },
      ],
    },
    // Compra compartilhada entre Ana e Bruno (Total R$ 100,01 -> 50,01 Ana + 50,00 Bruno)
    {
      id: 'loan-shared',
      description: 'Supermercado Mensal Compartilhado',
      cardId: 'card-1',
      isShared: true,
      sharedDetails: {
        person1: {
          clientId: clientA.id,
          name: 'Ana Oliveira',
          installments: [
            { number: 1, value: 50.01, dueDate: '2026-08-20', status: 'Pendente' },
            { number: 2, value: 50.0, dueDate: '2026-09-20', status: 'Pendente' },
          ],
        },
        person2: {
          clientId: clientB.id,
          name: 'Bruno Santos',
          installments: [
            { number: 1, value: 50.0, dueDate: '2026-08-20', status: 'Pendente' },
            { number: 2, value: 50.01, dueDate: '2026-09-20', status: 'Pendente' },
          ],
        },
      },
    },
    // Compra de outro cliente ou sem vínculo
    {
      id: 'loan-outros',
      description: 'Reforma Casa',
      clientId: 'outro-cliente',
      cardId: 'card-2',
      isShared: false,
      installments: [
        { number: 1, value: 999.99, dueDate: '2026-08-01', status: 'Pendente' },
      ],
    },
  ];

  const expenses = [
    // Despesa da Ana
    {
      id: 'exp-ana',
      description: 'Uber Reunião',
      clientId: clientA.id,
      cardId: 'card-1',
      value: 42.5,
      date: '2026-08-12',
      category: 'Transporte',
    },
    // Despesa do Bruno
    {
      id: 'exp-bruno',
      description: 'Almoço Executivo',
      clientId: clientB.id,
      cardId: 'card-2',
      value: 65.0,
      date: '2026-08-14',
      category: 'Alimentação',
    },
  ];

  const subscriptions = [
    // Assinatura da Ana
    {
      id: 'sub-ana',
      name: 'GitHub Copilot Pro',
      clientId: clientA.id,
      cardId: 'card-1',
      amount: 49.9,
      dueDate: '05',
      isActive: true,
    },
    // Assinatura do Bruno
    {
      id: 'sub-bruno',
      name: 'Spotify Premium',
      clientId: clientB.id,
      cardId: 'card-2',
      value: 34.9,
      dueDate: '10',
      isActive: true,
    },
  ];

  describe('1. Isolamento Estrito de Dados por Pessoa (Zero Leakage)', () => {
    it('o CSV do mês da Ana contém apenas os itens da Ana e exclui os do Bruno ou terceiros', () => {
      const csv = generatePersonReportCsv({
        client: clientA,
        periodType: 'month',
        targetPeriod: targetMonth,
        loans,
        expenses,
        subscriptions,
        cards,
      });

      expect(csv.startsWith('\uFEFF')).toBe(true);

      // Deve conter os lançamentos da Ana
      expect(csv).toContain('Notebook Trabalho');
      expect(csv).toContain('Supermercado Mensal Compartilhado');
      expect(csv).toContain('Uber Reunião');
      expect(csv).toContain('GitHub Copilot Pro');
      expect(csv).toContain('Ana Oliveira');

      // NÃO deve conter nada do Bruno nem de terceiros
      expect(csv).not.toContain('Smartphone Bruno');
      expect(csv).not.toContain('Almoço Executivo');
      expect(csv).not.toContain('Spotify Premium');
      expect(csv).not.toContain('Reforma Casa');
      expect(csv).not.toContain('Bruno Santos');
      expect(csv).not.toContain('outro-cliente');
    });

    it('o CSV do mês do Bruno contém apenas os itens do Bruno', () => {
      const csv = generatePersonReportCsv({
        client: clientB,
        periodType: 'month',
        targetPeriod: targetMonth,
        loans,
        expenses,
        subscriptions,
        cards,
      });

      expect(csv).toContain('Smartphone Bruno');
      expect(csv).toContain('Almoço Executivo');
      expect(csv).toContain('Spotify Premium');
      expect(csv).toContain('Bruno Santos');

      expect(csv).not.toContain('Notebook Trabalho');
      expect(csv).not.toContain('Uber Reunião');
      expect(csv).not.toContain('GitHub Copilot Pro');
      expect(csv).not.toContain('Ana Oliveira');
    });
  });

  describe('2. Integridade Matemática e Centavos Exatos (Zero Drift)', () => {
    it('soma dos itens no CSV mensal da Ana bate com exatidão com o total esperado', () => {
      const csv = generatePersonReportCsv({
        client: clientA,
        periodType: 'month',
        targetPeriod: targetMonth,
        loans,
        expenses,
        subscriptions,
        cards,
      });

      // Itens esperados da Ana em 2026-08:
      // 1. Notebook: R$ 350,25
      // 2. Supermercado Compartilhado (cota Ana): R$ 50,01
      // 3. Uber: R$ 42,50
      // 4. Copilot: R$ 49,90
      // Soma esperada: 350.25 + 50.01 + 42.50 + 49.90 = 492.66
      const expectedTotalCents = 35025 + 5001 + 4250 + 4990; // 49266

      // Extrai os valores das linhas CSV (coluna 7: Valor)
      const lines = csv.split('\r\n').filter((l) => l.trim().length > 0);
      const dataRows = lines.slice(1); // descarta cabeçalho

      expect(dataRows.length).toBe(4);

      let sumCents = 0;
      dataRows.forEach((row) => {
        const cols = row.split(';').map((c) => c.replace(/^"|"$/g, ''));
        const valStr = cols[7]; // Coluna Valor (R$)
        const valNum = parseFloat(valStr.replace(',', '.'));
        sumCents += Math.round(valNum * 100);
      });

      expect(sumCents).toBe(expectedTotalCents);
      expect(sumCents / 100).toBe(492.66);
    });

    it('o CSV anual da Ana projeta 12 ocorrências da assinatura e todas as parcelas do ano', () => {
      const csv = generatePersonReportCsv({
        client: clientA,
        periodType: 'year',
        targetPeriod: targetYear,
        loans,
        expenses,
        subscriptions,
        cards,
      });

      // No ano 2026:
      // - 3 parcelas do Notebook (3x 350.25)
      // - 2 parcelas do Supermercado (50.01 + 50.00)
      // - 1 despesa do Uber (42.50)
      // - 12 assinaturas mensais do Copilot (12x 49.90)
      // Total de linhas: 3 + 2 + 1 + 12 = 18 linhas
      const lines = csv.split('\r\n').filter((l) => l.trim().length > 0);
      const dataRows = lines.slice(1);

      expect(dataRows.length).toBe(18);

      const subRows = dataRows.filter((r) => r.includes('GitHub Copilot Pro'));
      expect(subRows.length).toBe(12);
    });
  });

  describe('3. Mitigação de CSV Injection (CWE-1236)', () => {
    it('deve neutralizar caracteres perigosos de fórmulas (=, +, @, -)', () => {
      expect(sanitizeCsvFormula('=1+1')).toBe("'=1+1");
      expect(sanitizeCsvFormula('+cmd|')).toBe("'+cmd|");
      expect(sanitizeCsvFormula('@SUM(A1:B1)')).toBe("'@SUM(A1:B1)");
      expect(sanitizeCsvFormula('-AtaqueFormula')).toBe("'-AtaqueFormula");

      // Valores seguros devem ser preservados
      expect(sanitizeCsvFormula('Mercado Normal')).toBe('Mercado Normal');
      expect(sanitizeCsvFormula(150.5)).toBe(150.5);
      expect(sanitizeCsvFormula('-')).toBe('-'); // Traço de campo vazio
      expect(sanitizeCsvFormula('-50.00')).toBe('-50.00'); // Número negativo
    });

    it('itens com descrições maliciosas são higienizados na geração do CSV', () => {
      const maliciousLoans = [
        {
          id: 'loan-hack',
          description: '=HYPERLINK("http://evil.com","Clique")',
          clientId: clientA.id,
          cardId: 'card-1',
          installments: [
            { number: 1, value: 100, dueDate: '2026-08-01', status: 'Pendente' },
          ],
        },
      ];

      const csv = generatePersonReportCsv({
        client: clientA,
        periodType: 'month',
        targetPeriod: targetMonth,
        loans: maliciousLoans,
        expenses: [],
        subscriptions: [],
      });

      expect(csv).toContain("\"'=HYPERLINK");
      expect(csv).not.toContain('"=HYPERLINK');
    });
  });

  describe('4. Padronização e Sanitização do Nome do Arquivo', () => {
    it('deve higienizar nomes de pessoas com acentos, espaços e caracteres especiais', () => {
      expect(sanitizeFilename('Ana Oliveira')).toBe('ana-oliveira');
      expect(sanitizeFilename('João da Silva & Cia.')).toBe('joao-da-silva-cia');
      expect(sanitizeFilename('Élcio / Müller * Test?')).toBe('elcio-muller-test');
      expect(sanitizeFilename('')).toBe('pessoa');
      expect(sanitizeFilename(null)).toBe('pessoa');
    });
  });
});
