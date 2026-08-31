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

describe('Firestore Subscription Registry & Listener Hardening (Fase 7.2.4 Final Remediation)', () => {
    beforeEach(() => {
        clearAllSubscriptions();
        resetSubscriptionMetrics();
        vi.clearAllMocks();
    });

    afterEach(() => {
        clearAllSubscriptions();
        resetSubscriptionMetrics();
    });

    it('A. same query / same UID => 1 underlying listener', () => {
        const mockQueryRef = { id: 'cards-collection' };
        const canonicalKey = buildCanonicalQueryKey({ collectionPath: 'users_fallback/user-1/cards', uid: 'user-1' });

        const receivedDataA = [];
        const receivedDataB = [];

        const unsubA = subscribeToFirestoreQuery({
            queryRef: mockQueryRef,
            canonicalKey,
            uid: 'user-1',
            onNext: (snap) => receivedDataA.push(snap),
        });

        const unsubB = subscribeToFirestoreQuery({
            queryRef: mockQueryRef,
            canonicalKey,
            uid: 'user-1',
            onNext: (snap) => receivedDataB.push(snap),
        });

        const metrics = getSubscriptionMetrics();
        expect(onSnapshot).toHaveBeenCalledTimes(1);
        expect(metrics.activeSubscriptionsCount).toBe(1);
        expect(metrics.activeConsumersCount).toBe(2);
        expect(metrics.duplicateSubscriptionsSaved).toBe(1);

        const mockSnapshot = {
            docs: [{ id: 'card-1', data: () => ({ name: 'Cartão Black', limit: 5000 }) }],
        };
        const onSnapshotCallback = vi.mocked(onSnapshot).mock.calls[0][1];
        onSnapshotCallback(mockSnapshot);

        expect(receivedDataA.length).toBe(1);
        expect(receivedDataB.length).toBe(1);
        expect(receivedDataA[0]).toBe(mockSnapshot);
        expect(receivedDataB[0]).toBe(mockSnapshot);

        unsubA();
        unsubB();
    });

    it('B. same path/query / different UID => 2 underlying listeners e chaves canônicas distintas', () => {
        const queryUserA = { id: 'cards-user-A' };
        const queryUserB = { id: 'cards-user-B' };

        const keyA = buildCanonicalQueryKey({ collectionPath: 'cards', uid: 'USER_A' });
        const keyB = buildCanonicalQueryKey({ collectionPath: 'cards', uid: 'USER_B' });

        expect(keyA).not.toBe(keyB);
        expect(keyA).toBe('uid:USER_A|path:cards');
        expect(keyB).toBe('uid:USER_B|path:cards');

        const unsubA = subscribeToFirestoreQuery({ queryRef: queryUserA, canonicalKey: keyA, uid: 'USER_A', onNext: vi.fn() });
        const unsubB = subscribeToFirestoreQuery({ queryRef: queryUserB, canonicalKey: keyB, uid: 'USER_B', onNext: vi.fn() });

        expect(onSnapshot).toHaveBeenCalledTimes(2);
        expect(getSubscriptionMetrics().activeSubscriptionsCount).toBe(2);

        unsubA();
        unsubB();
    });

    it('C. query clauses em ordem diferente => mesma canonical key determinística', () => {
        const key1 = buildCanonicalQueryKey({
            collectionPath: 'paidSubscriptions',
            uid: 'user-1',
            queryClauses: ['status:==:paid', 'month:==:2026-08', 'type:==:subscription'],
        });

        const key2 = buildCanonicalQueryKey({
            collectionPath: 'paidSubscriptions',
            uid: 'user-1',
            queryClauses: ['type:==:subscription', 'month:==:2026-08', 'status:==:paid'],
        });

        expect(key1).toBe(key2);
        expect(key1).toBe('uid:user-1|path:paidSubscriptions|query:month:==:2026-08&status:==:paid&type:==:subscription');
    });

    it('D. input queryClauses não é mutado pelo buildCanonicalQueryKey', () => {
        const originalArray = ['b:==:2', 'a:==:1', 'c:==:3'];
        const copyForComparison = [...originalArray];

        buildCanonicalQueryKey({
            collectionPath: 'loans',
            uid: 'user-1',
            queryClauses: originalArray,
        });

        expect(originalArray).toEqual(copyForComparison);
    });

    it('E. missing UID ou collectionPath => subscription rejeitada / fail closed', () => {
        const mockQueryRef = { id: 'invalid-call' };

        const emptyKey1 = buildCanonicalQueryKey({ collectionPath: 'loans', uid: '' });
        const emptyKey2 = buildCanonicalQueryKey({ collectionPath: '', uid: 'user-1' });
        const emptyKey3 = buildCanonicalQueryKey();

        expect(emptyKey1).toBe('');
        expect(emptyKey2).toBe('');
        expect(emptyKey3).toBe('');

        const unsub1 = subscribeToFirestoreQuery({ queryRef: mockQueryRef, canonicalKey: '', uid: 'user-1', onNext: vi.fn() });
        const unsub2 = subscribeToFirestoreQuery({ queryRef: mockQueryRef, canonicalKey: 'valid-key', uid: '', onNext: vi.fn() });
        const unsub3 = subscribeToFirestoreQuery({ queryRef: null, canonicalKey: 'valid-key', uid: 'user-1', onNext: vi.fn() });

        expect(onSnapshot).not.toHaveBeenCalled();
        expect(getSubscriptionMetrics().activeSubscriptionsCount).toBe(0);
        expect(getSubscriptionMetrics().activeConsumersCount).toBe(0);

        unsub1();
        unsub2();
        unsub3();
    });

    it('F. refCount 2 -> 1 => listener subjacente continua ativo', () => {
        const mockRawUnsub = vi.fn();
        vi.mocked(onSnapshot).mockReturnValueOnce(mockRawUnsub);

        const mockQueryRef = { id: 'loans' };
        const canonicalKey = buildCanonicalQueryKey({ collectionPath: 'loans', uid: 'user-1' });

        const unsub1 = subscribeToFirestoreQuery({ queryRef: mockQueryRef, canonicalKey, uid: 'user-1', onNext: vi.fn() });
        const unsub2 = subscribeToFirestoreQuery({ queryRef: mockQueryRef, canonicalKey, uid: 'user-1', onNext: vi.fn() });

        expect(getSubscriptionMetrics().activeConsumersCount).toBe(2);

        unsub1();
        expect(mockRawUnsub).not.toHaveBeenCalled();
        expect(getSubscriptionMetrics().activeSubscriptionsCount).toBe(1);
        expect(getSubscriptionMetrics().activeConsumersCount).toBe(1);

        unsub2();
    });

    it('G. refCount 1 -> 0 => rawUnsubscribe executado deterministricamente', () => {
        const mockRawUnsub = vi.fn();
        vi.mocked(onSnapshot).mockReturnValueOnce(mockRawUnsub);

        const mockQueryRef = { id: 'loans' };
        const canonicalKey = buildCanonicalQueryKey({ collectionPath: 'loans', uid: 'user-1' });

        const unsub = subscribeToFirestoreQuery({ queryRef: mockQueryRef, canonicalKey, uid: 'user-1', onNext: vi.fn() });

        expect(getSubscriptionMetrics().activeSubscriptionsCount).toBe(1);
        expect(getSubscriptionMetrics().activeConsumersCount).toBe(1);

        unsub();
        expect(mockRawUnsub).toHaveBeenCalledTimes(1);
        expect(getSubscriptionMetrics().activeSubscriptionsCount).toBe(0);
        expect(getSubscriptionMetrics().activeConsumersCount).toBe(0);
        expect(getSubscriptionMetrics().totalSubscriptionsDestroyed).toBe(1);
    });

    it('H. terminal onSnapshot error => subscribers recebem o erro', () => {
        const mockQueryRef = { id: 'error-query' };
        const canonicalKey = buildCanonicalQueryKey({ collectionPath: 'error', uid: 'user-1' });

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

        unsubA();
        unsubB();
    });

    it('I. após terminal error => entry não fica considerada listener saudável no registry ativo', () => {
        const mockRawUnsub = vi.fn();
        vi.mocked(onSnapshot).mockReturnValueOnce(mockRawUnsub);

        const mockQueryRef = { id: 'dead-query' };
        const canonicalKey = buildCanonicalQueryKey({ collectionPath: 'dead', uid: 'user-1' });

        const unsub = subscribeToFirestoreQuery({
            queryRef: mockQueryRef,
            canonicalKey,
            uid: 'user-1',
            onNext: vi.fn(),
            onError: vi.fn(),
        });

        expect(getSubscriptionMetrics().activeSubscriptionsCount).toBe(1);

        // Dispara erro terminal
        const mockError = new Error('UNAVAILABLE');
        const onErrorCallback = vi.mocked(onSnapshot).mock.calls[0][2];
        onErrorCallback(mockError);

        // Deve fechar a conexão crua e invalidar o entry do registro ativo
        expect(mockRawUnsub).toHaveBeenCalledTimes(1);
        expect(getSubscriptionMetrics().activeSubscriptionsCount).toBe(0);
        expect(getSubscriptionMetrics().registrySize).toBe(0);

        unsub();
    });

    it('J. nova inscrição após erro terminal => novo underlying onSnapshot é criado', () => {
        const mockQueryRef = { id: 'retry-query' };
        const canonicalKey = buildCanonicalQueryKey({ collectionPath: 'retry', uid: 'user-1' });

        const unsub1 = subscribeToFirestoreQuery({
            queryRef: mockQueryRef,
            canonicalKey,
            uid: 'user-1',
            onNext: vi.fn(),
            onError: vi.fn(),
        });

        expect(onSnapshot).toHaveBeenCalledTimes(1);

        // Erro terminal
        const onErrorCallback = vi.mocked(onSnapshot).mock.calls[0][2];
        onErrorCallback(new Error('NETWORK_TIMEOUT'));

        // Novo consumidor chega após a falha
        const unsub2 = subscribeToFirestoreQuery({
            queryRef: mockQueryRef,
            canonicalKey,
            uid: 'user-1',
            onNext: vi.fn(),
            onError: vi.fn(),
        });

        // Deve ter criado um 2º onSnapshot limpo
        expect(onSnapshot).toHaveBeenCalledTimes(2);
        expect(getSubscriptionMetrics().activeSubscriptionsCount).toBe(1);

        unsub1();
        unsub2();
        expect(getSubscriptionMetrics().activeSubscriptionsCount).toBe(0);
    });

    it('K. erro + old consumer cleanup => métricas decrementadas corretamente sem erros', () => {
        const mockQueryRef = { id: 'metrics-err' };
        const canonicalKey = buildCanonicalQueryKey({ collectionPath: 'err', uid: 'user-1' });

        const unsub1 = subscribeToFirestoreQuery({ queryRef: mockQueryRef, canonicalKey, uid: 'user-1', onNext: vi.fn(), onError: vi.fn() });
        const unsub2 = subscribeToFirestoreQuery({ queryRef: mockQueryRef, canonicalKey, uid: 'user-1', onNext: vi.fn(), onError: vi.fn() });

        expect(getSubscriptionMetrics().activeConsumersCount).toBe(2);

        // Erro terminal
        const onErrorCallback = vi.mocked(onSnapshot).mock.calls[0][2];
        onErrorCallback(new Error('ABORTED'));

        expect(getSubscriptionMetrics().activeSubscriptionsCount).toBe(0);

        // Consumidores desmontam normalmente após a tela tratar o erro
        unsub1();
        expect(getSubscriptionMetrics().activeConsumersCount).toBe(1);
        unsub2();
        expect(getSubscriptionMetrics().activeConsumersCount).toBe(0);
    });

    it('L. synchronous onSnapshot initialization throw => rollback total das métricas', () => {
        vi.mocked(onSnapshot).mockImplementationOnce(() => {
            throw new Error('SYNC_FIREBASE_INIT_FAILURE');
        });

        const mockQueryRef = { id: 'sync-fail' };
        const canonicalKey = buildCanonicalQueryKey({ collectionPath: 'fail', uid: 'user-1' });

        const receivedErrors = [];
        const unsub = subscribeToFirestoreQuery({
            queryRef: mockQueryRef,
            canonicalKey,
            uid: 'user-1',
            onNext: vi.fn(),
            onError: (err) => receivedErrors.push(err),
        });

        expect(receivedErrors.length).toBe(1);
        expect(receivedErrors[0].message).toBe('SYNC_FIREBASE_INIT_FAILURE');
        expect(getSubscriptionMetrics().activeSubscriptionsCount).toBe(0);
        expect(getSubscriptionMetrics().activeConsumersCount).toBe(0);
        expect(getSubscriptionMetrics().registrySize).toBe(0);

        unsub();
    });

    it('M. clearUserSubscriptions(UserA) => UserA zerado, UserB intacto e activeConsumersCount consistente', () => {
        const mockUnsubA1 = vi.fn();
        const mockUnsubA2 = vi.fn();
        const mockUnsubB = vi.fn();

        vi.mocked(onSnapshot)
            .mockReturnValueOnce(mockUnsubA1)
            .mockReturnValueOnce(mockUnsubA2)
            .mockReturnValueOnce(mockUnsubB);

        // User A tem 2 queries e 3 consumers totais (1 na q1 e 2 na q2)
        const keyA1 = buildCanonicalQueryKey({ collectionPath: 'cards', uid: 'user-A' });
        const keyA2 = buildCanonicalQueryKey({ collectionPath: 'loans', uid: 'user-A' });
        const keyB = buildCanonicalQueryKey({ collectionPath: 'cards', uid: 'user-B' });

        subscribeToFirestoreQuery({ queryRef: { id: 'q1' }, canonicalKey: keyA1, uid: 'user-A', onNext: vi.fn() });
        subscribeToFirestoreQuery({ queryRef: { id: 'q2' }, canonicalKey: keyA2, uid: 'user-A', onNext: vi.fn() });
        subscribeToFirestoreQuery({ queryRef: { id: 'q2' }, canonicalKey: keyA2, uid: 'user-A', onNext: vi.fn() });

        // User B tem 1 query e 1 consumer
        subscribeToFirestoreQuery({ queryRef: { id: 'q3' }, canonicalKey: keyB, uid: 'user-B', onNext: vi.fn() });

        expect(getSubscriptionMetrics().activeSubscriptionsCount).toBe(3);
        expect(getSubscriptionMetrics().activeConsumersCount).toBe(4);

        // Limpeza de User A
        clearUserSubscriptions('user-A');

        expect(mockUnsubA1).toHaveBeenCalledTimes(1);
        expect(mockUnsubA2).toHaveBeenCalledTimes(1);
        expect(mockUnsubB).not.toHaveBeenCalled();

        // Restou apenas User B (1 subscription, 1 consumer)
        expect(getSubscriptionMetrics().activeSubscriptionsCount).toBe(1);
        expect(getSubscriptionMetrics().activeConsumersCount).toBe(1);
        expect(getSubscriptionMetrics().registrySize).toBe(1);
    });

    it('N. clearAllSubscriptions() => todos os contadores e subscriptions zerados', () => {
        const key1 = buildCanonicalQueryKey({ collectionPath: 'c1', uid: 'u1' });
        const key2 = buildCanonicalQueryKey({ collectionPath: 'c2', uid: 'u2' });

        subscribeToFirestoreQuery({ queryRef: { id: '1' }, canonicalKey: key1, uid: 'u1', onNext: vi.fn() });
        subscribeToFirestoreQuery({ queryRef: { id: '2' }, canonicalKey: key2, uid: 'u2', onNext: vi.fn() });

        expect(getSubscriptionMetrics().activeSubscriptionsCount).toBe(2);

        clearAllSubscriptions();

        expect(getSubscriptionMetrics().activeSubscriptionsCount).toBe(0);
        expect(getSubscriptionMetrics().activeConsumersCount).toBe(0);
        expect(getSubscriptionMetrics().registrySize).toBe(0);
    });

    it('O. UserA -> UserB direct auth switch => subscriptions de UserA são limpas e UserB permanece independente', () => {
        const mockUnsubA = vi.fn();
        const mockUnsubB = vi.fn();

        vi.mocked(onSnapshot).mockReturnValueOnce(mockUnsubA).mockReturnValueOnce(mockUnsubB);

        const keyA = buildCanonicalQueryKey({ collectionPath: 'cards', uid: 'USER_A' });
        subscribeToFirestoreQuery({ queryRef: { id: 'cards-A' }, canonicalKey: keyA, uid: 'USER_A', onNext: vi.fn() });

        expect(getSubscriptionMetrics().activeSubscriptionsCount).toBe(1);

        // Simula troca direta de UID (executa clearUserSubscriptions('USER_A'))
        clearUserSubscriptions('USER_A');
        expect(mockUnsubA).toHaveBeenCalledTimes(1);
        expect(getSubscriptionMetrics().activeSubscriptionsCount).toBe(0);

        // USER_B entra
        const keyB = buildCanonicalQueryKey({ collectionPath: 'cards', uid: 'USER_B' });
        subscribeToFirestoreQuery({ queryRef: { id: 'cards-B' }, canonicalKey: keyB, uid: 'USER_B', onNext: vi.fn() });

        expect(getSubscriptionMetrics().activeSubscriptionsCount).toBe(1);
        expect(getSubscriptionMetrics().registrySize).toBe(1);
    });

    it('P. logout => zero listeners financeiros do UID anterior', () => {
        const keyA = buildCanonicalQueryKey({ collectionPath: 'incomes', uid: 'USER_LOGOUT' });
        subscribeToFirestoreQuery({ queryRef: { id: 'incomes' }, canonicalKey: keyA, uid: 'USER_LOGOUT', onNext: vi.fn() });

        expect(getSubscriptionMetrics().activeSubscriptionsCount).toBe(1);

        clearAllSubscriptions();

        expect(getSubscriptionMetrics().activeSubscriptionsCount).toBe(0);
        expect(getSubscriptionMetrics().activeConsumersCount).toBe(0);
    });

    it('Q. cached last snapshot => novo consumer recebe snapshot sem novo onSnapshot somente enquanto entry está saudável', () => {
        const mockQueryRef = { id: 'incomes-cache' };
        const canonicalKey = buildCanonicalQueryKey({ collectionPath: 'incomes', uid: 'user-cache' });

        const unsub1 = subscribeToFirestoreQuery({
            queryRef: mockQueryRef,
            canonicalKey,
            uid: 'user-cache',
            onNext: vi.fn(),
        });

        const mockSnapshot = { docs: [{ id: 'inc-1', data: () => ({ amount: 3500 }) }] };
        const onSnapshotCallback = vi.mocked(onSnapshot).mock.calls[0][1];
        onSnapshotCallback(mockSnapshot);

        const lateConsumerData = [];
        const unsub2 = subscribeToFirestoreQuery({
            queryRef: mockQueryRef,
            canonicalKey,
            uid: 'user-cache',
            onNext: (snap) => lateConsumerData.push(snap),
        });

        expect(lateConsumerData.length).toBe(1);
        expect(lateConsumerData[0]).toBe(mockSnapshot);
        expect(onSnapshot).toHaveBeenCalledTimes(1);

        unsub1();
        unsub2();
    });

    it('R. financial aggregate regression => valores matemáticos e centavos inalterados', () => {
        const mockQueryExpenses = { id: 'expenses' };
        const canonicalKey = buildCanonicalQueryKey({ collectionPath: 'expenses', uid: 'user-math' });

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

        const summary = calculateMonthlyComparisonSummary({
            selectedMonth: '2026-08',
            loans: [],
            expenses: receivedExpenses,
            incomes: [{ value: 1000.00, date: new Date('2026-08-01T00:00:00Z') }],
        });

        expect(summary.previousMonth).toBe('2026-07');
        expect(summary.expensesDelta.delta).toBe(0);
        expect(summary.expensesDelta.percentage).toBe(0);

        unsub();
    });
});
