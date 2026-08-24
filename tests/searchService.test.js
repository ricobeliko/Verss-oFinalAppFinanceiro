// tests/searchService.test.js
import { describe, it, expect } from 'vitest';
import { normalizeSearchText, performGlobalSearch } from '../src/services/searchService';

describe('Search Service - Normalização de Texto', () => {
    it('deve converter para minúsculas e remover acentos e diacríticos', () => {
        expect(normalizeSearchText('Farmácia')).toBe('farmacia');
        expect(normalizeSearchText('AÇÃO')).toBe('acao');
        expect(normalizeSearchText('Cartão de Crédito')).toBe('cartao de credito');
        expect(normalizeSearchText('  Netflix Brasil  ')).toBe('netflix brasil');
    });

    it('deve lidar com entradas nulas, indefinidas ou numéricas com segurança', () => {
        expect(normalizeSearchText(null)).toBe('');
        expect(normalizeSearchText(undefined)).toBe('');
        expect(normalizeSearchText(1234)).toBe('1234');
    });
});

describe('Search Service - Busca Global Unificada', () => {
    const cards = [
        { id: 'card-black', name: 'Cartão Black' },
        { id: 'card-inter', name: 'Inter Platinum' }
    ];

    const clients = [
        { id: 'c-joao', name: 'João Silva' },
        { id: 'c-maria', name: 'Maria Souza' }
    ];

    const loans = [
        { id: 'l-1', description: 'iPhone 15 Pro', cardId: 'card-black', clientId: 'c-joao', totalValue: 7000.00, installmentsCount: 10 },
        { id: 'l-2', description: 'Tênis Nike', cardId: 'card-inter', totalValue: 400.00, installmentsCount: 4 }
    ];

    const expenses = [
        { id: 'e-1', description: 'Farmácia São Paulo', category: 'Saúde', cardId: 'card-black', value: 85.50 },
        { id: 'e-2', description: 'Almoço Restaurante', category: 'Alimentação', value: 45.00 }
    ];

    const subscriptions = [
        { id: 's-1', name: 'Netflix Premium', amount: 55.90, cardId: 'card-black' },
        { id: 's-2', name: 'Spotify Família', amount: 34.90 }
    ];

    const incomes = [
        { id: 'i-1', description: 'Salário Mensal', value: 8500.00 }
    ];

    it('deve retornar resultado vazio quando a busca estiver vazia', () => {
        const result = performGlobalSearch({ query: '', loans, expenses, subscriptions, clients, incomes, cards });
        expect(result.totalMatches).toBe(0);
        expect(result.results.loans).toHaveLength(0);
    });

    it('deve encontrar itens ignorando acentos e maiúsculas ("farmacia" -> "Farmácia")', () => {
        const result = performGlobalSearch({ query: 'farmacia', loans, expenses, subscriptions, clients, incomes, cards });
        expect(result.totalMatches).toBe(1);
        expect(result.results.expenses).toHaveLength(1);
        expect(result.results.expenses[0].title).toBe('Farmácia São Paulo');
    });

    it('deve encontrar pessoa pelo nome ("joao" -> "João Silva")', () => {
        const result = performGlobalSearch({ query: 'joao', loans, expenses, subscriptions, clients, incomes, cards });
        // Encontra a pessoa João Silva E a compra iPhone que está vinculada a ele
        expect(result.results.clients).toHaveLength(1);
        expect(result.results.clients[0].title).toBe('João Silva');
        expect(result.results.loans).toHaveLength(1);
        expect(result.results.loans[0].title).toBe('iPhone 15 Pro');
    });

    it('deve agrupar resultados entre múltiplas entidades ("netflix")', () => {
        const result = performGlobalSearch({ query: 'netflix', loans, expenses, subscriptions, clients, incomes, cards });
        expect(result.totalMatches).toBe(1);
        expect(result.results.subscriptions).toHaveLength(1);
        expect(result.results.subscriptions[0].title).toBe('Netflix Premium');
    });

    it('deve encontrar compras pelo nome do cartão ("black")', () => {
        const result = performGlobalSearch({ query: 'black', loans, expenses, subscriptions, clients, incomes, cards });
        expect(result.results.loans).toHaveLength(1);
        expect(result.results.expenses).toHaveLength(1);
        expect(result.results.subscriptions).toHaveLength(1);
    });
});
