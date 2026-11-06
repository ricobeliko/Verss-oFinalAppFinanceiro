// tests/personReportCsv.test.js
import { describe, it, expect } from 'vitest';
import {
  generatePersonReportCsv,
  sanitizeCsvFormula,
  sanitizeFilename,
  clampDayOfMonth,
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

  describe('5. Fase 7.1 — Consistência Estrita CSV Anual/Mensal com o Relatório e Cobertura Sem Itens', () => {
    it('soma dos valores do CSV mensal e anual para pessoa com compra própria, compartilhada e assinatura bate ao centavo com o relatório', () => {
      const personX = { id: 'client-X', name: 'Carlos Eduardo' };
      const testCards = [{ id: 'card-x', name: 'Mastercard Black' }];

      const personLoans = [
        // 1. Compra própria (3 parcelas de R$ 120,50 ao longo de 2026-08, 2026-09, 2026-10)
        {
          id: 'loan-x-own',
          description: 'Smartphone Trabalho',
          clientId: personX.id,
          cardId: 'card-x',
          isShared: false,
          installmentsCount: 3,
          installments: [
            { number: 1, value: 120.50, dueDate: '2026-08-10', status: 'Pendente' },
            { number: 2, value: 120.50, dueDate: '2026-09-10', status: 'Pendente' },
            { number: 3, value: 120.50, dueDate: '2026-10-10', status: 'Pendente' }
          ]
        },
        // 2. Compra compartilhada (cota do Carlos: 2 parcelas de R$ 75,33 em 2026-08 e R$ 75,34 em 2026-09)
        {
          id: 'loan-x-shared',
          description: 'Ar-Condicionado Compartilhado',
          cardId: 'card-x',
          isShared: true,
          sharedDetails: {
            person1: {
              clientId: personX.id,
              name: 'Carlos Eduardo',
              installments: [
                { number: 1, value: 75.33, dueDate: '2026-08-20', status: 'Pendente' },
                { number: 2, value: 75.34, dueDate: '2026-09-20', status: 'Pendente' }
              ]
            },
            person2: {
              clientId: 'client-other',
              name: 'Outra Pessoa',
              installments: [
                { number: 1, value: 75.33, dueDate: '2026-08-20', status: 'Pendente' },
                { number: 2, value: 75.34, dueDate: '2026-09-20', status: 'Pendente' }
              ]
            }
          }
        }
      ];

      // 3. Assinatura ativa (R$ 39,90/mês)
      const personSubs = [
        {
          id: 'sub-x',
          name: 'Streaming Premium',
          clientId: personX.id,
          cardId: 'card-x',
          amount: 39.90,
          dueDate: '15',
          isActive: true
        }
      ];

      // 4. Despesa avulsa em 2026-08 (R$ 45,00)
      const personExpenses = [
        {
          id: 'exp-x',
          description: 'Café & Lanche',
          clientId: personX.id,
          cardId: 'card-x',
          value: 45.00,
          date: '2026-08-05'
        }
      ];

      // --- Verificação Mensal (2026-08) ---
      // Itens esperados no mês:
      // - Parcela própria: 120.50
      // - Parcela compartilhada (cota Carlos): 75.33
      // - Assinatura: 39.90
      // - Despesa avulsa: 45.00
      // Total mensal: 120.50 + 75.33 + 39.90 + 45.00 = 280.73
      const expectedMonthlyCents = 12050 + 7533 + 3990 + 4500; // 28073 centavos

      const csvMonthly = generatePersonReportCsv({
        client: personX,
        periodType: 'month',
        targetPeriod: '2026-08',
        loans: personLoans,
        expenses: personExpenses,
        subscriptions: personSubs,
        cards: testCards
      });

      const monthlyLines = csvMonthly.split('\r\n').filter((l) => l.trim().length > 0);
      const monthlyDataRows = monthlyLines.slice(1);
      expect(monthlyDataRows.length).toBe(4);

      let sumMonthlyCents = 0;
      monthlyDataRows.forEach((row) => {
        const cols = row.split(';').map((c) => c.replace(/^"|"$/g, ''));
        const valStr = cols[7];
        const valNum = parseFloat(valStr.replace(',', '.'));
        sumMonthlyCents += Math.round(valNum * 100);
      });

      expect(sumMonthlyCents).toBe(expectedMonthlyCents);
      expect(sumMonthlyCents / 100).toBe(280.73);

      // --- Verificação Anual (2026) ---
      // Itens esperados no ano 2026:
      // - 3 parcelas próprias: 3x 120.50 = 361.50 (36150 centavos)
      // - 2 parcelas compartilhadas: 75.33 + 75.34 = 150.67 (15067 centavos)
      // - 12 meses da assinatura ativa: 12x 39.90 = 478.80 (47880 centavos)
      // - 1 despesa avulsa: 45.00 (4500 centavos)
      // Total anual: 361.50 + 150.67 + 478.80 + 45.00 = 1035.97
      const expectedAnnualCents = 36150 + 15067 + 47880 + 4500; // 103597 centavos

      const csvAnnual = generatePersonReportCsv({
        client: personX,
        periodType: 'year',
        targetPeriod: '2026',
        loans: personLoans,
        expenses: personExpenses,
        subscriptions: personSubs,
        cards: testCards
      });

      const annualLines = csvAnnual.split('\r\n').filter((l) => l.trim().length > 0);
      const annualDataRows = annualLines.slice(1);
      // Total de linhas: 3 próprias + 2 compartilhadas + 12 assinaturas + 1 despesa = 18 linhas
      expect(annualDataRows.length).toBe(18);

      let sumAnnualCents = 0;
      annualDataRows.forEach((row) => {
        const cols = row.split(';').map((c) => c.replace(/^"|"$/g, ''));
        const valStr = cols[7];
        const valNum = parseFloat(valStr.replace(',', '.'));
        sumAnnualCents += Math.round(valNum * 100);
      });

      expect(sumAnnualCents).toBe(expectedAnnualCents);
      expect(sumAnnualCents / 100).toBe(1035.97);
    });

    it('clampDayOfMonth ajusta corretamente dias para o último dia válido do mês (inclusive bissexto)', () => {
      expect(clampDayOfMonth(2026, 2, 31)).toBe('28');
      expect(clampDayOfMonth(2024, 2, 31)).toBe('29'); // Ano bissexto
      expect(clampDayOfMonth(2026, 4, 31)).toBe('30'); // Abril
      expect(clampDayOfMonth(2026, 1, 31)).toBe('31'); // Janeiro
      expect(clampDayOfMonth(2026, 2, 15)).toBe('15'); // Dia dentro do limite
    });

    it('assinatura com dia 31 em fevereiro gera data clamped válida (28 em 2026, 29 em 2024)', () => {
      const client = { id: 'client-sub-31', name: 'Carla Dias' };
      const testCards = [{ id: 'card-1', name: 'Nubank' }];
      const sub31 = [{
        id: 'sub-netflix',
        name: 'Streaming 4K',
        amount: 55.90,
        clientId: client.id,
        cardId: 'card-1',
        dueDate: 31,
        isActive: true
      }];

      // Mensal 2026-02 (não bissexto) -> deve clamp para 2026-02-28
      const csv2026 = generatePersonReportCsv({
        client,
        periodType: 'month',
        targetPeriod: '2026-02',
        loans: [],
        expenses: [],
        subscriptions: sub31,
        cards: testCards
      });
      expect(csv2026).toContain('2026-02-28');
      expect(csv2026).not.toContain('2026-02-31');

      // Mensal 2024-02 (bissexto) -> deve clamp para 2024-02-29
      const csv2024 = generatePersonReportCsv({
        client,
        periodType: 'month',
        targetPeriod: '2024-02',
        loans: [],
        expenses: [],
        subscriptions: sub31,
        cards: testCards
      });
      expect(csv2024).toContain('2024-02-29');
      expect(csv2024).not.toContain('2024-02-31');

      // Anual 2026 -> verifica fevereiro clamped para 28 e meses de 30 dias clamped para 30
      const csvAnnual = generatePersonReportCsv({
        client,
        periodType: 'year',
        targetPeriod: '2026',
        loans: [],
        expenses: [],
        subscriptions: sub31,
        cards: testCards
      });
      expect(csvAnnual).toContain('2026-02-28');
      expect(csvAnnual).toContain('2026-04-30');
      expect(csvAnnual).toContain('2026-06-30');
      expect(csvAnnual).toContain('2026-09-30');
      expect(csvAnnual).toContain('2026-11-30');
      expect(csvAnnual).toContain('2026-01-31');
    });

    it('pessoa sem nenhum item gera CSV válido com BOM e cabeçalho sem lançar erro nem corromper', () => {
      const emptyPerson = { id: 'client-empty', name: 'Nenhum Gasto' };

      const csv = generatePersonReportCsv({
        client: emptyPerson,
        periodType: 'year',
        targetPeriod: '2026',
        loans: [],
        expenses: [],
        subscriptions: [],
        cards: []
      });

      expect(csv.startsWith('\uFEFF')).toBe(true);
      const lines = csv.split('\r\n').filter((l) => l.trim().length > 0);
      // Apenas o cabeçalho
      expect(lines.length).toBe(1);
      expect(lines[0]).toContain('Tipo');
      expect(lines[0]).toContain('Data');
      expect(lines[0]).toContain('Descrição');
      expect(lines[0]).toContain('Valor (R$)');
    });
  });
});
