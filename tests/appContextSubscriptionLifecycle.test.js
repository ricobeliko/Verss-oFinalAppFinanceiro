// tests/appContextSubscriptionLifecycle.test.js
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Variáveis de controle para os mocks
let authCallback = null;
let authUnsubscribeMock = null;
let profileListeners = new Map();
let firestoreOnSnapshotListeners = [];

vi.mock('firebase/app', () => ({
    initializeApp: vi.fn(() => ({})),
}));

vi.mock('firebase/auth', () => ({
    getAuth: vi.fn(() => ({ currentUser: null })),
    onAuthStateChanged: vi.fn((_auth, callback) => {
        authCallback = callback;
        authUnsubscribeMock = vi.fn(() => {
            authCallback = null;
        });
        return authUnsubscribeMock;
    }),
    signOut: vi.fn(),
}));

vi.mock('firebase/firestore', () => ({
    getFirestore: vi.fn(() => ({ type: 'mock-db' })),
    doc: vi.fn((_db, ...segments) => ({
        path: segments.join('/'),
        id: segments[segments.length - 1],
    })),
    onSnapshot: vi.fn((queryRef, onNext, onError) => {
        const unsub = vi.fn();
        const item = { queryRef, onNext, onError, unsub };
        firestoreOnSnapshotListeners.push(item);
        if (queryRef?.path) {
            profileListeners.set(queryRef.path, item);
        }
        return unsub;
    }),
    updateDoc: vi.fn(),
    serverTimestamp: vi.fn(() => new Date()),
}));

import { setupAuthLifecycle } from '../src/context/AppContext.jsx';
import {
    subscribeToFirestoreQuery,
    buildCanonicalQueryKey,
    getSubscriptionMetrics,
    clearAllSubscriptions,
    resetSubscriptionMetrics,
} from '../src/services/firestoreSubscriptionRegistry.js';
import { doc, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

describe('AppContext Auth & Profile Lifecycle Controller (Fase 7.2.4 Final Remediation)', () => {
    let currentUserState = null;
    let userProfileState = null;
    let isAuthReadyState = false;
    let toastMessages = [];

    const mockAuthInstance = { name: 'mock-auth' };
    const mockDbInstance = { name: 'mock-db' };

    const setCurrentUser = (u) => {
        currentUserState = u;
    };
    const setUserProfile = (p) => {
        userProfileState = p;
    };
    const setIsAuthReady = (r) => {
        isAuthReadyState = r;
    };
    const showToast = (msg, type) => {
        toastMessages.push({ msg, type });
    };

    beforeEach(() => {
        clearAllSubscriptions();
        resetSubscriptionMetrics();
        profileListeners.clear();
        firestoreOnSnapshotListeners = [];
        authCallback = null;
        authUnsubscribeMock = null;
        currentUserState = null;
        userProfileState = null;
        isAuthReadyState = false;
        toastMessages = [];
        vi.clearAllMocks();
    });

    afterEach(() => {
        clearAllSubscriptions();
        resetSubscriptionMetrics();
    });

    it('A. UserA cria exatamente 1 profile listener ao autenticar', () => {
        const cleanup = setupAuthLifecycle({
            authInstance: mockAuthInstance,
            dbInstance: mockDbInstance,
            getPathSegments: () => ['users_fallback'],
            onAuthChanged: onAuthStateChanged,
            docFn: doc,
            onSnapshotFn: onSnapshot,
            setCurrentUser,
            setUserProfile,
            setIsAuthReady,
            showToast,
        });

        expect(authCallback).toBeDefined();

        // Emite UserA
        authCallback({ uid: 'user-A', email: 'userA@test.local' });

        expect(profileListeners.has('users_fallback/user-A')).toBe(true);
        expect(profileListeners.size).toBe(1);
        expect(currentUserState?.uid).toBe('user-A');

        cleanup();
    });

    it('B, C, D. UserA -> UserB direto: fecha listener de A, limpa subscriptions de A e inicia B de forma independente', () => {
        const cleanup = setupAuthLifecycle({
            authInstance: mockAuthInstance,
            dbInstance: mockDbInstance,
            getPathSegments: () => ['users_fallback'],
            onAuthChanged: onAuthStateChanged,
            docFn: doc,
            onSnapshotFn: onSnapshot,
            setCurrentUser,
            setUserProfile,
            setIsAuthReady,
            showToast,
        });

        // 1. UserA loga
        authCallback({ uid: 'user-A', email: 'userA@test.local' });
        const listenerA = profileListeners.get('users_fallback/user-A');
        expect(listenerA).toBeDefined();

        // 2. UserA cria uma subscription financeira no registry
        const unsubCardA = subscribeToFirestoreQuery({
            queryRef: { id: 'cards-A' },
            canonicalKey: buildCanonicalQueryKey({ collectionPath: 'cards', uid: 'user-A' }),
            uid: 'user-A',
            onNext: vi.fn(),
        });
        expect(getSubscriptionMetrics().activeSubscriptionsCount).toBe(1);

        // 3. Troca direta para UserB (sem passar por user = null)
        authCallback({ uid: 'user-B', email: 'userB@test.local' });

        // Listener A deve ter sido encerrado
        expect(listenerA.unsub).toHaveBeenCalledTimes(1);

        // Subscriptions financeiras de UserA devem ter sido limpas
        expect(getSubscriptionMetrics().activeSubscriptionsCount).toBe(0);

        // Listener B deve ter sido criado
        const listenerB = profileListeners.get('users_fallback/user-B');
        expect(listenerB).toBeDefined();
        expect(currentUserState?.uid).toBe('user-B');

        // Emite snapshot do perfil de B
        listenerB.onNext({
            exists: () => true,
            data: () => ({ name: 'Usuário B', plan: 'pro' }),
        });

        expect(userProfileState?.name).toBe('Usuário B');
        expect(userProfileState?.plan).toBe('pro');

        unsubCardA();
        cleanup();
    });

    it('E. same UID re-emission mantém exatamente 1 profile listener sem duplicar', () => {
        const cleanup = setupAuthLifecycle({
            authInstance: mockAuthInstance,
            dbInstance: mockDbInstance,
            getPathSegments: () => ['users_fallback'],
            onAuthChanged: onAuthStateChanged,
            docFn: doc,
            onSnapshotFn: onSnapshot,
            setCurrentUser,
            setUserProfile,
            setIsAuthReady,
            showToast,
        });

        authCallback({ uid: 'user-A', email: 'userA@test.local' });
        const initialListenerA = profileListeners.get('users_fallback/user-A');
        expect(initialListenerA.unsub).not.toHaveBeenCalled();

        // Reemite exatamente o mesmo UserA
        authCallback({ uid: 'user-A', email: 'userA@test.local' });

        // Não deve recriar nem chamar unsubscribe
        expect(initialListenerA.unsub).not.toHaveBeenCalled();
        expect(onSnapshot).toHaveBeenCalledTimes(1);

        cleanup();
    });

    it('F. callback atrasado de UserA é bloqueado pelo stale guard e não sobrescreve perfil de UserB', () => {
        const cleanup = setupAuthLifecycle({
            authInstance: mockAuthInstance,
            dbInstance: mockDbInstance,
            getPathSegments: () => ['users_fallback'],
            onAuthChanged: onAuthStateChanged,
            docFn: doc,
            onSnapshotFn: onSnapshot,
            setCurrentUser,
            setUserProfile,
            setIsAuthReady,
            showToast,
        });

        // UserA entra
        authCallback({ uid: 'user-A', email: 'userA@test.local' });
        const listenerA = profileListeners.get('users_fallback/user-A');

        // Troca para UserB
        authCallback({ uid: 'user-B', email: 'userB@test.local' });
        const listenerB = profileListeners.get('users_fallback/user-B');

        // Perfil de B chega
        listenerB.onNext({
            exists: () => true,
            data: () => ({ name: 'Perfil Legítimo de B' }),
        });
        expect(userProfileState?.name).toBe('Perfil Legítimo de B');

        // Callback atrasado/órfão de A dispara depois
        listenerA.onNext({
            exists: () => true,
            data: () => ({ name: 'Perfil Obsoleto de A' }),
        });

        // O perfil DEVE continuar sendo o de B
        expect(userProfileState?.name).toBe('Perfil Legítimo de B');

        cleanup();
    });

    it('G. logout (user === null) encerra profile listener e limpa todas as subscriptions financeiras', () => {
        const cleanup = setupAuthLifecycle({
            authInstance: mockAuthInstance,
            dbInstance: mockDbInstance,
            getPathSegments: () => ['users_fallback'],
            onAuthChanged: onAuthStateChanged,
            docFn: doc,
            onSnapshotFn: onSnapshot,
            setCurrentUser,
            setUserProfile,
            setIsAuthReady,
            showToast,
        });

        authCallback({ uid: 'user-A', email: 'userA@test.local' });
        const listenerA = profileListeners.get('users_fallback/user-A');

        subscribeToFirestoreQuery({
            queryRef: { id: 'loans-A' },
            canonicalKey: buildCanonicalQueryKey({ collectionPath: 'loans', uid: 'user-A' }),
            uid: 'user-A',
            onNext: vi.fn(),
        });
        expect(getSubscriptionMetrics().activeSubscriptionsCount).toBe(1);

        // Logout
        authCallback(null);

        expect(listenerA.unsub).toHaveBeenCalledTimes(1);
        expect(getSubscriptionMetrics().activeSubscriptionsCount).toBe(0);
        expect(currentUserState).toBeNull();
        expect(userProfileState).toBeNull();
        expect(isAuthReadyState).toBe(true);

        cleanup();
    });

    it('H. E2E session branch limpa subscriptions no unmount/cleanup', () => {
        subscribeToFirestoreQuery({
            queryRef: { id: 'e2e-cards' },
            canonicalKey: buildCanonicalQueryKey({ collectionPath: 'cards', uid: 'e2e-user-123' }),
            uid: 'e2e-user-123',
            onNext: vi.fn(),
        });
        expect(getSubscriptionMetrics().activeSubscriptionsCount).toBe(1);

        const cleanup = setupAuthLifecycle({
            e2eSession: { uid: 'e2e-user-123', name: 'Tester E2E' },
            setCurrentUser,
            setUserProfile,
            setIsAuthReady,
        });

        expect(currentUserState?.uid).toBe('e2e-user-123');
        expect(userProfileState?.name).toBe('Tester E2E');
        expect(isAuthReadyState).toBe(true);

        // Executa cleanup do unmount do branch E2E
        cleanup();

        expect(getSubscriptionMetrics().activeSubscriptionsCount).toBe(0);
    });

    it('I, J. Unmount cleanup limpa todos os listeners e garante zero cross-user leakage', () => {
        const cleanup = setupAuthLifecycle({
            authInstance: mockAuthInstance,
            dbInstance: mockDbInstance,
            getPathSegments: () => ['users_fallback'],
            onAuthChanged: onAuthStateChanged,
            docFn: doc,
            onSnapshotFn: onSnapshot,
            setCurrentUser,
            setUserProfile,
            setIsAuthReady,
            showToast,
        });

        authCallback({ uid: 'user-leak-test', email: 'leak@test.local' });
        const listener = profileListeners.get('users_fallback/user-leak-test');

        subscribeToFirestoreQuery({
            queryRef: { id: 'leak-q' },
            canonicalKey: buildCanonicalQueryKey({ collectionPath: 'incomes', uid: 'user-leak-test' }),
            uid: 'user-leak-test',
            onNext: vi.fn(),
        });
        expect(getSubscriptionMetrics().activeSubscriptionsCount).toBe(1);

        cleanup();

        expect(authUnsubscribeMock).toHaveBeenCalledTimes(1);
        expect(listener.unsub).toHaveBeenCalledTimes(1);
        expect(getSubscriptionMetrics().activeSubscriptionsCount).toBe(0);
    });
});
