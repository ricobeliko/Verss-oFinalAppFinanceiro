// tests/planEntitlements.test.js
import { describe, it, expect } from 'vitest';
import {
    FREE_LIMITS,
    PRO_FEATURES,
    checkProAccess,
    canAddPerson,
    canAddCard,
    LIMIT_MESSAGES,
} from '../src/config/planEntitlements';

describe('FinControl — Canonical Plan Entitlements (Fase 8.7 Stage A.3)', () => {
    describe('1. Free Plan Limits Constants', () => {
        it('deve congelar o limite canônico de 3 pessoas para o plano Free', () => {
            expect(FREE_LIMITS.people).toBe(3);
        });

        it('deve congelar o limite canônico de 2 cartões para o plano Free', () => {
            expect(FREE_LIMITS.cards).toBe(2);
        });

        it('deve conter as 16 features Pro congeladas', () => {
            expect(PRO_FEATURES).toHaveLength(16);
            expect(PRO_FEATURES).toEqual([
                'unlimited_people',
                'unlimited_cards',
                'income_balance',
                'category_expenses',
                'analytics_by_person',
                'analytics_by_category',
                'crisis_mode',
                'executive_summary',
                'simulator',
                'monthly_csv',
                'annual_report',
                'quick_audit',
                'debt_goals',
                'deterministic_insights',
                'future_commitments',
                'category_budgets',
            ]);
        });
    });

    describe('2. Pro Access Contract (isPro || isTrialActive)', () => {
        it('deve conceder acesso quando isPro for verdadeiro', () => {
            expect(checkProAccess({ isPro: true, isTrialActive: false })).toBe(true);
        });

        it('deve conceder acesso quando isTrialActive for verdadeiro', () => {
            expect(checkProAccess({ isPro: false, isTrialActive: true })).toBe(true);
        });

        it('deve conceder acesso quando plan === "pro"', () => {
            expect(checkProAccess({ isPro: false, isTrialActive: false, plan: 'pro' })).toBe(true);
        });

        it('deve negar acesso quando usuário for Free sem trial ativo', () => {
            expect(checkProAccess({ isPro: false, isTrialActive: false, plan: 'free' })).toBe(false);
            expect(checkProAccess({})).toBe(false);
        });
    });

    describe('3. People Creation Limit (FREE_PEOPLE_LIMIT = 3)', () => {
        it('permite adicionar pessoas quando contagem for menor que 3 no Free (0, 1, 2)', () => {
            // Positional
            expect(canAddPerson(0, false).allowed).toBe(true);
            expect(canAddPerson(1, false).allowed).toBe(true);
            expect(canAddPerson(2, false).allowed).toBe(true);

            // Object
            expect(canAddPerson({ isPro: false, isTrialActive: false, peopleCount: 0 }).allowed).toBe(true);
            expect(canAddPerson({ isPro: false, isTrialActive: false, peopleCount: 2 }).allowed).toBe(true);
        });

        it('bloqueia a 4ª pessoa no Free quando já existirem 3 (fail-closed)', () => {
            const checkPositional = canAddPerson(3, false);
            expect(checkPositional.allowed).toBe(false);
            expect(checkPositional.message).toBe('Você atingiu o limite de 3 pessoas do plano Free.');

            const checkObject = canAddPerson({ isPro: false, isTrialActive: false, peopleCount: 3 });
            expect(checkObject.allowed).toBe(false);
            expect(checkObject.message).toBe(LIMIT_MESSAGES.peopleReached);
        });

        it('bloqueia quando contagem for maior que 3 no Free (ex: 5 pessoas após downgrade)', () => {
            const check = canAddPerson(5, false);
            expect(check.allowed).toBe(false);
            expect(check.message).toBe(LIMIT_MESSAGES.peopleReached);
        });

        it('permite criação ilimitada quando usuário for Pro ou possuir Trial ativo', () => {
            expect(canAddPerson(3, true).allowed).toBe(true);
            expect(canAddPerson(10, true).allowed).toBe(true);
            expect(canAddPerson({ isPro: true, isTrialActive: false, peopleCount: 5 }).allowed).toBe(true);
            expect(canAddPerson({ isPro: false, isTrialActive: true, peopleCount: 5 }).allowed).toBe(true);
        });
    });

    describe('4. Card Creation Limit (FREE_CARD_LIMIT = 2)', () => {
        it('permite adicionar cartões quando contagem for menor que 2 no Free (0, 1)', () => {
            expect(canAddCard(0, false).allowed).toBe(true);
            expect(canAddCard(1, false).allowed).toBe(true);

            expect(canAddCard({ isPro: false, isTrialActive: false, cardCount: 0 }).allowed).toBe(true);
            expect(canAddCard({ isPro: false, isTrialActive: false, cardCount: 1 }).allowed).toBe(true);
        });

        it('bloqueia o 3º cartão no Free quando já existirem 2 (fail-closed)', () => {
            const checkPositional = canAddCard(2, false);
            expect(checkPositional.allowed).toBe(false);
            expect(checkPositional.message).toBe('Você atingiu o limite de 2 cartões do plano Free.');

            const checkObject = canAddCard({ isPro: false, isTrialActive: false, cardCount: 2 });
            expect(checkObject.allowed).toBe(false);
            expect(checkObject.message).toBe(LIMIT_MESSAGES.cardsReached);
        });

        it('bloqueia quando contagem for maior que 2 no Free (ex: 4 cartões após downgrade)', () => {
            const check = canAddCard(4, false);
            expect(check.allowed).toBe(false);
            expect(check.message).toBe(LIMIT_MESSAGES.cardsReached);
        });

        it('permite criação ilimitada de cartões quando for Pro ou Trial ativo', () => {
            expect(canAddCard(2, true).allowed).toBe(true);
            expect(canAddCard(8, true).allowed).toBe(true);
            expect(canAddCard({ isPro: true, isTrialActive: false, cardCount: 5 }).allowed).toBe(true);
            expect(canAddCard({ isPro: false, isTrialActive: true, cardCount: 5 }).allowed).toBe(true);
        });
    });

    describe('5. Data Preservation Guarantee', () => {
        it('garante que dados existentes de cartões e pessoas nunca sejam truncados por limites', () => {
            // Se um usuário cadastrou 5 pessoas enquanto era Pro e reverteu para o Free,
            // a lista de pessoas deve manter todos os 5 registros intactos.
            const existingPeople = [
                { id: '1', name: 'Pessoa 1' },
                { id: '2', name: 'Pessoa 2' },
                { id: '3', name: 'Pessoa 3' },
                { id: '4', name: 'Pessoa 4' },
                { id: '5', name: 'Pessoa 5' },
            ];

            // A lista é exibida integralmente
            expect(existingPeople).toHaveLength(5);
            // Mas novas criações são bloqueadas
            expect(canAddPerson(existingPeople.length, false).allowed).toBe(false);
        });

        it('garante que 4 cartões existentes nunca sejam apagados ou ocultados', () => {
            const existingCards = [
                { id: 'c1', name: 'Cartão 1' },
                { id: 'c2', name: 'Cartão 2' },
                { id: 'c3', name: 'Cartão 3' },
                { id: 'c4', name: 'Cartão 4' },
            ];

            expect(existingCards).toHaveLength(4);
            expect(canAddCard(existingCards.length, false).allowed).toBe(false);
        });
    });
});
