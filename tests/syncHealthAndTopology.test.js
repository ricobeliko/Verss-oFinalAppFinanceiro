// tests/syncHealthAndTopology.test.js
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
    subscribeToFirestoreQuery,
    buildCanonicalQueryKey,
    getSubscriptionMetrics,
    clearAllSubscriptions,
    resetSubscriptionMetrics,
} from '../src/services/firestoreSubscriptionRegistry.js';

// Mock do onSnapshot do Firestore
vi.mock('firebase/firestore', () => {
    return {
        onSnapshot: vi.fn(() => vi.fn()),
    };
});

import { onSnapshot } from 'firebase/firestore';

describe('Data Health (Sync Status) & Topology Harness (Fase 7.2.4 Final Remediation)', () => {
    beforeEach(() => {
        clearAllSubscriptions();
        resetSubscriptionMetrics();
        vi.clearAllMocks();
    });

    afterEach(() => {
        clearAllSubscriptions();
        resetSubscriptionMetrics();
    });

    it('Data Health: snapshot saudável -> erro terminal preserva dados e ativa isStale -> remount saudável limpa isStale', () => {
        const mockQueryRef = { id: 'cards-collection' };
        const canonicalKey = buildCanonicalQueryKey({ collectionPath: 'cards', uid: 'user-health' });

        let currentCards = [];
        let currentError = null;
        let isStale = false;

        // Consumidor se inscreve
        const unsub1 = subscribeToFirestoreQuery({
            queryRef: mockQueryRef,
            canonicalKey,
            uid: 'user-health',
            onNext: (snap) => {
                currentCards = snap.docs.map((d) => d.data());
                currentError = null;
                isStale = false;
            },
            onError: (err) => {
                currentError = err;
                isStale = true;
                // Os dados atuais são PRESERVADOS para não gerar falsos saldos zerados
            },
        });

        // 1. Snapshot inicial saudável
        const healthySnapshot = {
            docs: [{ id: 'c1', data: () => ({ name: 'Cartão VIP', limit: 15000 }) }],
        };
        const onSnapshotCallback = vi.mocked(onSnapshot).mock.calls[0][1];
        onSnapshotCallback(healthySnapshot);

        expect(currentCards.length).toBe(1);
        expect(currentCards[0].limit).toBe(15000);
        expect(currentError).toBeNull();
        expect(isStale).toBe(false);

        // 2. Erro terminal do Firestore
        const onErrorCallback = vi.mocked(onSnapshot).mock.calls[0][2];
        onErrorCallback(new Error('CONNECTION_LOST'));

        // Dados devem ser preservados e isStale/error ativados
        expect(currentCards.length).toBe(1);
        expect(currentCards[0].limit).toBe(15000);
        expect(isStale).toBe(true);
        expect(currentError.message).toBe('CONNECTION_LOST');

        unsub1();

        // 3. Remount saudável posterior
        const unsub2 = subscribeToFirestoreQuery({
            queryRef: mockQueryRef,
            canonicalKey,
            uid: 'user-health',
            onNext: (snap) => {
                currentCards = snap.docs.map((d) => d.data());
                currentError = null;
                isStale = false;
            },
            onError: (err) => {
                currentError = err;
                isStale = true;
            },
        });

        // Novo onSnapshot deve ter sido criado
        expect(onSnapshot).toHaveBeenCalledTimes(2);

        const freshSnapshot = {
            docs: [
                { id: 'c1', data: () => ({ name: 'Cartão VIP', limit: 15000 }) },
                { id: 'c2', data: () => ({ name: 'Cartão Reserva', limit: 5000 }) },
            ],
        };
        const freshSnapshotCallback = vi.mocked(onSnapshot).mock.calls[1][1];
        freshSnapshotCallback(freshSnapshot);

        expect(currentCards.length).toBe(2);
        expect(isStale).toBe(false);
        expect(currentError).toBeNull();

        unsub2();
    });

    it('Topology Harness 1: Dashboard + Topbar (12 consumers -> 7 underlying onSnapshot listeners: 41.7% de redução)', () => {
        const uid = 'user-topo-1';
        const collections = ['cards', 'loans', 'expenses', 'incomes', 'subscriptions', 'clients', 'paidSubscriptions'];

        const consumerUnsubs = [];

        // Dashboard instancia 7 subscriptions
        collections.forEach((col) => {
            const unsub = subscribeToFirestoreQuery({
                queryRef: { id: `dash-${col}` },
                canonicalKey: buildCanonicalQueryKey({ collectionPath: col, uid }),
                uid,
                onNext: vi.fn(),
            });
            consumerUnsubs.push(unsub);
        });

        // Topbar (NotificationCenterPopover) instancia 5 subscriptions simultâneas
        const topbarCollections = ['loans', 'expenses', 'subscriptions', 'cards', 'clients'];
        topbarCollections.forEach((col) => {
            const unsub = subscribeToFirestoreQuery({
                queryRef: { id: `topbar-${col}` },
                canonicalKey: buildCanonicalQueryKey({ collectionPath: col, uid }),
                uid,
                onNext: vi.fn(),
            });
            consumerUnsubs.push(unsub);
        });

        const metrics = getSubscriptionMetrics();
        expect(consumerUnsubs.length).toBe(12); // 12 consumidores ativos no frontend
        expect(metrics.activeConsumersCount).toBe(12);
        expect(metrics.activeSubscriptionsCount).toBe(7); // Exatamente 7 underlying listeners
        expect(metrics.duplicateSubscriptionsSaved).toBe(5); // 5 conexões duplicadas economizadas
        expect(onSnapshot).toHaveBeenCalledTimes(7);

        // Taxa de redução: (12 - 7) / 12 = 5 / 12 = 41.666...% -> 41.7%
        const reductionPct = ((12 - metrics.activeSubscriptionsCount) / 12) * 100;
        expect(reductionPct).toBeCloseTo(41.67, 1);

        consumerUnsubs.forEach((unsub) => unsub());
        expect(getSubscriptionMetrics().activeSubscriptionsCount).toBe(0);
    });

    it('Topology Harness 2: Dashboard + Topbar + GlobalSearch (18 consumers -> 7 underlying onSnapshot listeners: 61.1% de redução)', () => {
        const uid = 'user-topo-2';
        const collections = ['cards', 'loans', 'expenses', 'incomes', 'subscriptions', 'clients', 'paidSubscriptions'];

        const consumerUnsubs = [];

        // 1. Dashboard (7 consumers)
        collections.forEach((col) => {
            consumerUnsubs.push(
                subscribeToFirestoreQuery({
                    queryRef: { id: `dash-${col}` },
                    canonicalKey: buildCanonicalQueryKey({ collectionPath: col, uid }),
                    uid,
                    onNext: vi.fn(),
                })
            );
        });

        // 2. Topbar (5 consumers)
        ['loans', 'expenses', 'subscriptions', 'cards', 'clients'].forEach((col) => {
            consumerUnsubs.push(
                subscribeToFirestoreQuery({
                    queryRef: { id: `topbar-${col}` },
                    canonicalKey: buildCanonicalQueryKey({ collectionPath: col, uid }),
                    uid,
                    onNext: vi.fn(),
                })
            );
        });

        // 3. GlobalSearchModal aberto via Ctrl+K (6 consumers)
        ['loans', 'expenses', 'subscriptions', 'clients', 'cards', 'incomes'].forEach((col) => {
            consumerUnsubs.push(
                subscribeToFirestoreQuery({
                    queryRef: { id: `search-${col}` },
                    canonicalKey: buildCanonicalQueryKey({ collectionPath: col, uid }),
                    uid,
                    onNext: vi.fn(),
                })
            );
        });

        const metrics = getSubscriptionMetrics();
        expect(consumerUnsubs.length).toBe(18); // 18 consumidores no total
        expect(metrics.activeConsumersCount).toBe(18);
        expect(metrics.activeSubscriptionsCount).toBe(7); // Permanece em 7 underlying listeners
        expect(metrics.duplicateSubscriptionsSaved).toBe(11); // 11 conexões duplicadas economizadas
        expect(onSnapshot).toHaveBeenCalledTimes(7);

        // Taxa de redução: (18 - 7) / 18 = 11 / 18 = 61.111...% -> 61.1%
        const reductionPct = ((18 - metrics.activeSubscriptionsCount) / 18) * 100;
        expect(reductionPct).toBeCloseTo(61.11, 1);

        consumerUnsubs.forEach((unsub) => unsub());
        expect(getSubscriptionMetrics().activeSubscriptionsCount).toBe(0);
    });
});
