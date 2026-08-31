// tests/firestoreListeners.test.js
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
    subscribeToFirestoreQuery,
    buildCanonicalQueryKey,
    clearUserSubscriptions,
    clearAllSubscriptions,
    getSubscriptionMetrics,
    resetSubscriptionMetrics,
} from '../src/services/firestoreSubscriptionRegistry.js';
import { calculateMonthlyComparisonSummary } from '../src/services/financialService.js';

// Mock do onSnapshot do Firestore para simular eventos de rede e contagem de chamadas
vi.mock('firebase/firestore', () => {
    return {
        onSnapshot: vi.fn(() => vi.fn()),
    };
});

import { onSnapshot } from 'firebase/firestore';

describe('Firestore Subscription Registry & Listener Optimization (Fase 7.2.4)', () => {
    beforeEach(() => {
        clearAllSubscriptions();
        resetSubscriptionMetrics();
        vi.clearAllMocks();
    });

    afterEach(() => {
        clearAllSubscriptions();
        resetSubscriptionMetrics();
    });

    it('deve deduplicar múltiplos consumidores na mesma query canônica criando apenas 1 underlying listener', () => {
        const mockQueryRef = { id: 'cards-collection' };
        const canonicalKey = buildCanonicalQueryKey({ collectionPath: 'users_fallback/user-1/cards', uid: 'user-1' });

        const receivedDataA = [];
        const receivedDataB = [];

        // Consumidor A (ex: Dashboard)
        const unsubA = subscribeToFirestoreQuery({
            queryRef: mockQueryRef,
            canonicalKey,
            uid: 'user-1',
            onNext: (snap) => receivedDataA.push(snap),
        });

        // Consumidor B (ex: NotificationCenterPopover)
        const unsubB = subscribeToFirestoreQuery({
            queryRef: mockQueryRef,
            canonicalKey,
            uid: 'user-1',
            onNext: (snap) => receivedDataB.push(snap),
        });

        const metrics = getSubscriptionMetrics();
        expect(onSnapshot).toHaveBeenCalledTimes(1); // Exatamente 1 underlying listener
        expect(metrics.activeSubscriptionsCount).toBe(1);
        expect(metrics.activeConsumersCount).toBe(2);
        expect(metrics.duplicateSubscriptionsSaved).toBe(1);

        // Simula disparo de snapshot pelo Firestore
        const mockSnapshot = {
            docs: [{ id: 'card-1', data: () => ({ name: 'Cartão Black', limit: 5000 }) }],
        };
        const onSnapshotCallback = vi.mocked(onSnapshot).mock.calls[0][1];
        onSnapshotCallback(mockSnapshot);

        // Ambos os consumidores devem receber o mesmo dado
        expect(receivedDataA.length).toBe(1);
        expect(receivedDataB.length).toBe(1);
        expect(receivedDataA[0]).toBe(mockSnapshot);
        expect(receivedDataB[0]).toBe(mockSnapshot);

        unsubA();
        unsubB();
    });

    it('deve manter o underlying listener ativo enquanto houver pelo menos 1 consumidor e encerrar apenas quando refCount == 0', () => {
        const mockRawUnsub = vi.fn();
        vi.mocked(onSnapshot).mockReturnValueOnce(mockRawUnsub);

        const mockQueryRef = { id: 'loans-collection' };
        const canonicalKey = buildCanonicalQueryKey({ collectionPath: 'users_fallback/user-1/loans', uid: 'user-1' });

        const unsub1 = subscribeToFirestoreQuery({
            queryRef: mockQueryRef,
            canonicalKey,
            uid: 'user-1',
            onNext: vi.fn(),
        });

        const unsub2 = subscribeToFirestoreQuery({
            queryRef: mockQueryRef,
            canonicalKey,
            uid: 'user-1',
            onNext: vi.fn(),
        });

        expect(getSubscriptionMetrics().activeSubscriptionsCount).toBe(1);
        expect(getSubscriptionMetrics().activeConsumersCount).toBe(2);

        // Consumidor 1 desmonta (unmount)
        unsub1();
        expect(mockRawUnsub).not.toHaveBeenCalled(); // Não deve fechar o listener subjacente
        expect(getSubscriptionMetrics().activeSubscriptionsCount).toBe(1);
        expect(getSubscriptionMetrics().activeConsumersCount).toBe(1);

        // Consumidor 2 desmonta (unmount)
        unsub2();
        expect(mockRawUnsub).toHaveBeenCalledTimes(1); // Agora sim encerra no Firestore
        expect(getSubscriptionMetrics().activeSubscriptionsCount).toBe(0);
        expect(getSubscriptionMetrics().activeConsumersCount).toBe(0);
        expect(getSubscriptionMetrics().totalSubscriptionsDestroyed).toBe(1);
    });

    it('não deve deduplicar queries diferentes do mesmo usuário', () => {
        const queryCards = { id: 'cards' };
        const queryExpenses = { id: 'expenses' };

        const keyCards = buildCanonicalQueryKey({ collectionPath: 'users_fallback/user-1/cards', uid: 'user-1' });
        const keyExpenses = buildCanonicalQueryKey({ collectionPath: 'users_fallback/user-1/expenses', uid: 'user-1' });

        const unsub1 = subscribeToFirestoreQuery({ queryRef: queryCards, canonicalKey: keyCards, uid: 'user-1', onNext: vi.fn() });
        const unsub2 = subscribeToFirestoreQuery({ queryRef: queryExpenses, canonicalKey: keyExpenses, uid: 'user-1', onNext: vi.fn() });

        expect(onSnapshot).toHaveBeenCalledTimes(2);
        expect(getSubscriptionMetrics().activeSubscriptionsCount).toBe(2);
        expect(getSubscriptionMetrics().duplicateSubscriptionsSaved).toBe(0);

        unsub1();
        unsub2();
        expect(getSubscriptionMetrics().activeSubscriptionsCount).toBe(0);
    });

    it('não deve deduplicar a mesma coleção entre usuários diferentes (Isolamento Cross-User)', () => {
        const queryUserA = { id: 'cards-user-A' };
        const queryUserB = { id: 'cards-user-B' };

        const keyA = buildCanonicalQueryKey({ collectionPath: 'users_fallback/USER_A/cards', uid: 'USER_A' });
        const keyB = buildCanonicalQueryKey({ collectionPath: 'users_fallback/USER_B/cards', uid: 'USER_B' });

        const unsubA = subscribeToFirestoreQuery({ queryRef: queryUserA, canonicalKey: keyA, uid: 'USER_A', onNext: vi.fn() });
        const unsubB = subscribeToFirestoreQuery({ queryRef: queryUserB, canonicalKey: keyB, uid: 'USER_B', onNext: vi.fn() });

        expect(onSnapshot).toHaveBeenCalledTimes(2);
        expect(getSubscriptionMetrics().activeSubscriptionsCount).toBe(2);

        unsubA();
        unsubB();
    });

    it('deve limpar todas as subscriptions de um usuário em clearUserSubscriptions ou logout', () => {
        const mockUnsubA1 = vi.fn();
        const mockUnsubA2 = vi.fn();
        const mockUnsubB = vi.fn();

        vi.mocked(onSnapshot)
            .mockReturnValueOnce(mockUnsubA1)
            .mockReturnValueOnce(mockUnsubA2)
            .mockReturnValueOnce(mockUnsubB);

        subscribeToFirestoreQuery({
            queryRef: { id: 'q1' },
            canonicalKey: 'users_fallback/user-A/cards',
            uid: 'user-A',
            onNext: vi.fn(),
        });
        subscribeToFirestoreQuery({
            queryRef: { id: 'q2' },
            canonicalKey: 'users_fallback/user-A/loans',
            uid: 'user-A',
            onNext: vi.fn(),
        });
        subscribeToFirestoreQuery({
            queryRef: { id: 'q3' },
            canonicalKey: 'users_fallback/user-B/cards',
            uid: 'user-B',
            onNext: vi.fn(),
        });

        expect(getSubscriptionMetrics().activeSubscriptionsCount).toBe(3);

        // Logout do Usuário A
        clearUserSubscriptions('user-A');

        expect(mockUnsubA1).toHaveBeenCalledTimes(1);
        expect(mockUnsubA2).toHaveBeenCalledTimes(1);
        expect(mockUnsubB).not.toHaveBeenCalled(); // Usuário B permanece ativo

        expect(getSubscriptionMetrics().activeSubscriptionsCount).toBe(1);

        clearAllSubscriptions();
        expect(mockUnsubB).toHaveBeenCalledTimes(1);
        expect(getSubscriptionMetrics().activeSubscriptionsCount).toBe(0);
    });

    it('deve entregar o snapshot mais recente imediatamente para novos consumidores sem refetch de rede', () => {
        const mockQueryRef = { id: 'incomes' };
        const canonicalKey = 'users_fallback/user-1/incomes';

        const unsub1 = subscribeToFirestoreQuery({
            queryRef: mockQueryRef,
            canonicalKey,
            uid: 'user-1',
            onNext: vi.fn(),
        });

        // Simula primeiro snapshot da rede
        const mockSnapshot = { docs: [{ id: 'inc-1', data: () => ({ amount: 3500 }) }] };
        const onSnapshotCallback = vi.mocked(onSnapshot).mock.calls[0][1];
        onSnapshotCallback(mockSnapshot);

        // Novo consumidor entra depois que o dado já chegou
        const lateConsumerData = [];
        const unsub2 = subscribeToFirestoreQuery({
            queryRef: mockQueryRef,
            canonicalKey,
            uid: 'user-1',
            onNext: (snap) => lateConsumerData.push(snap),
        });

        // Deve ter recebido o snapshot síncrono imediatamente do cache
        expect(lateConsumerData.length).toBe(1);
        expect(lateConsumerData[0]).toBe(mockSnapshot);
        expect(onSnapshot).toHaveBeenCalledTimes(1); // Nenhuma nova requisição de rede

        unsub1();
        unsub2();
    });

    it('deve propagar erros para todos os inscritos sem travar o registry', () => {
        const mockQueryRef = { id: 'error-query' };
        const canonicalKey = 'users_fallback/user-1/error';

        const errorsA = [];
        const errorsB = [];

        const unsubA = subscribeToFirestoreQuery({
            queryRef: mockQueryRef,
            canonicalKey,
            uid: 'user-1',
            onNext: vi.fn(),
            onError: (err) => errorsA.push(err),
        });

        const unsubB = subscribeToFirestoreQuery({
            queryRef: mockQueryRef,
            canonicalKey,
            uid: 'user-1',
            onNext: vi.fn(),
            onError: (err) => errorsB.push(err),
        });

        const mockError = new Error('PERMISSION_DENIED');
        const onErrorCallback = vi.mocked(onSnapshot).mock.calls[0][2];
        onErrorCallback(mockError);

        expect(errorsA).toEqual([mockError]);
        expect(errorsB).toEqual([mockError]);

        // Cleanup deve funcionar normalmente
        unsubA();
        unsubB();
        expect(getSubscriptionMetrics().activeSubscriptionsCount).toBe(0);
    });

    it('deve garantir integridade matemática dos agregados financeiros com dados distribuídos pelo registry', () => {
        const mockQueryExpenses = { id: 'expenses' };
        const canonicalKey = 'users_fallback/user-math/expenses';

        let receivedExpenses = [];
        const unsub = subscribeToFirestoreQuery({
            queryRef: mockQueryExpenses,
            canonicalKey,
            uid: 'user-math',
            onNext: (snap) => {
                receivedExpenses = snap.docs.map((d) => d.data());
            },
        });

        const testExpenses = [
            { id: 'exp-1', value: 150.50, date: new Date('2026-08-05T00:00:00Z'), category: 'Alimentação' },
            { id: 'exp-2', value: 49.50, date: new Date('2026-08-10T00:00:00Z'), category: 'Transporte' },
            { id: 'exp-3', value: 200.00, date: new Date('2026-07-15T00:00:00Z'), category: 'Alimentação' },
        ];

        const mockSnapshot = {
            docs: testExpenses.map((exp) => ({ id: exp.id, data: () => exp })),
        };

        const onSnapshotCallback = vi.mocked(onSnapshot).mock.calls[0][1];
        onSnapshotCallback(mockSnapshot);

        expect(receivedExpenses.length).toBe(3);

        // Executa cálculo financeiro sobre os dados recebidos
        const summary = calculateMonthlyComparisonSummary({
            selectedMonth: '2026-08',
            loans: [],
            expenses: receivedExpenses,
            incomes: [{ value: 1000.00, date: new Date('2026-08-01T00:00:00Z') }],
        });

        // 150.50 + 49.50 = 200.00 de despesas em 2026-08 vs 200.00 em 2026-07 (exp-3)
        expect(summary.previousMonth).toBe('2026-07');
        expect(summary.expensesDelta.delta).toBe(0);
        expect(summary.expensesDelta.percentage).toBe(0);

        unsub();
    });
});
