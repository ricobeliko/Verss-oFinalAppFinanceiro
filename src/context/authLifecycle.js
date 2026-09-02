// src/context/authLifecycle.js

import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../utils/firebase';
import { clearAllSubscriptions, clearUserSubscriptions } from '../services/firestoreSubscriptionRegistry';

export const getUserCollectionPathSegments = () => ['users_fallback'];

/**
 * Gerenciador central do ciclo de vida de autenticação e escuta de perfil de usuário.
 * Controla:
 * - Inscrição e cancelamento determinístico de profile listeners.
 * - Limpeza atômica de subscriptions em trocas diretas UserA -> UserB ou logout.
 * - Stale guard por geração para evitar que callbacks tardios de contas antigas sobrescrevam o perfil atual.
 * - Prevenção de listeners duplicados na reemissão do mesmo UID.
 */
export function setupAuthLifecycle({
    authInstance = auth,
    dbInstance = db,
    getPathSegments = getUserCollectionPathSegments,
    onAuthChanged = onAuthStateChanged,
    docFn = doc,
    onSnapshotFn = onSnapshot,
    setCurrentUser,
    setUserProfile,
    setIsAuthReady,
    showToast,
    clearUserSubs = clearUserSubscriptions,
    clearAllSubs = clearAllSubscriptions,
    e2eSession = null,
} = {}) {
    if (e2eSession && import.meta.env?.DEV) {
        setCurrentUser?.({
            uid: e2eSession.uid || 'e2e-user-sintetico',
            email: e2eSession.email || 'e2e-user@test.local',
            emailVerified: true,
            displayName: e2eSession.name || 'Usuário E2E',
        });
        setUserProfile?.({
            name: e2eSession.name || 'Usuário E2E',
            email: e2eSession.email || 'e2e-user@test.local',
            plan: e2eSession.plan || 'pro',
            budgets: e2eSession.budgets || { Alimentação: 1500, Transporte: 500 },
            notificationSettings: e2eSession.notificationSettings || { cardDueEnabled: true, cardDueDays: 3, receivablesEnabled: true },
            aiPreferences: e2eSession.aiPreferences || { optIn: false },
        });
        setIsAuthReady?.(true);
        return () => {
            if (e2eSession?.uid) {
                clearUserSubs?.(e2eSession.uid);
            }
            clearAllSubs?.();
        };
    }

    let unsubscribeFromUserProfile = null;
    let previousUid = null;
    let profileListenerGeneration = 0;

    const unsubscribeFromAuth = onAuthChanged(authInstance, (user) => {
        // Se o UID mudou diretamente (ex: UserA -> UserB ou UserA -> null), encerra os listeners e limpa as subscriptions de A
        if (previousUid && (!user || user.uid !== previousUid)) {
            if (typeof unsubscribeFromUserProfile === 'function') {
                try {
                    unsubscribeFromUserProfile();
                } catch (err) {
                    console.error('Erro ao encerrar listener de perfil anterior:', err);
                }
                unsubscribeFromUserProfile = null;
            }
            clearUserSubs?.(previousUid);
        }

        setCurrentUser?.(user);

        if (user) {
            // Se for reemissão do mesmo UID e o listener já estiver ativo, não duplica
            if (user.uid === previousUid && typeof unsubscribeFromUserProfile === 'function') {
                setIsAuthReady?.(true);
                return;
            }

            // Encerra listener anterior antes de criar novo
            if (typeof unsubscribeFromUserProfile === 'function') {
                try {
                    unsubscribeFromUserProfile();
                } catch (err) {
                    console.error('Erro ao encerrar listener de perfil anterior:', err);
                }
                unsubscribeFromUserProfile = null;
            }

            previousUid = user.uid;
            const currentGeneration = ++profileListenerGeneration;
            const userCollectionPath = getPathSegments();
            const userDocRef = docFn(dbInstance, ...userCollectionPath, user.uid);

            unsubscribeFromUserProfile = onSnapshotFn(
                userDocRef,
                (docSnap) => {
                    // Stale guard: se a geração mudou ou o UID atual não for mais este, ignora callback atrasado
                    if (currentGeneration !== profileListenerGeneration) return;

                    if (docSnap && typeof docSnap.exists === 'function' && docSnap.exists()) {
                        setUserProfile?.(docSnap.data());
                    } else if (docSnap && typeof docSnap.exists !== 'function' && docSnap.data) {
                        setUserProfile?.(docSnap.data);
                    } else {
                        console.warn('Perfil de usuário não encontrado no Firestore para o UID:', user.uid);
                        setUserProfile?.(null);
                    }
                    setIsAuthReady?.(true);
                },
                (error) => {
                    if (currentGeneration !== profileListenerGeneration) return;

                    console.error('Erro ao escutar o perfil do usuário:', error);
                    showToast?.('Erro ao carregar dados do usuário.', 'error');
                    setIsAuthReady?.(true);
                }
            );
        } else {
            previousUid = null;
            profileListenerGeneration++;
            if (typeof unsubscribeFromUserProfile === 'function') {
                try {
                    unsubscribeFromUserProfile();
                } catch (err) {
                    console.error('Erro ao encerrar listener de perfil:', err);
                }
                unsubscribeFromUserProfile = null;
            }
            clearAllSubs?.();
            setUserProfile?.(null);
            setIsAuthReady?.(true);
        }
    });

    return () => {
        profileListenerGeneration++;
        if (typeof unsubscribeFromAuth === 'function') {
            unsubscribeFromAuth();
        }
        if (typeof unsubscribeFromUserProfile === 'function') {
            try {
                unsubscribeFromUserProfile();
            } catch (err) {
                console.error('Erro ao encerrar listener de perfil no cleanup:', err);
            }
            unsubscribeFromUserProfile = null;
        }
        clearAllSubs?.();
    };
}
