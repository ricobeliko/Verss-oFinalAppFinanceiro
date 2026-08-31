// src/context/AppContext.jsx

import React, { useState, useEffect, useCallback, useMemo, createContext, useContext } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, onSnapshot, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, getAppFunctions } from '../utils/firebase';
import Toast from '../components/Toast';
import { clearAllSubscriptions, clearUserSubscriptions } from '../services/firestoreSubscriptionRegistry';

const getUserCollectionPathSegments = () => ['users_fallback'];

export const AppContext = createContext();

export const useAppContext = () => {
    return useContext(AppContext);
};

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

export function AppProvider({ children }) {
    const [currentUser, setCurrentUser] = useState(null);
    const [userProfile, setUserProfile] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [toast, setToast] = useState({ message: '', type: 'info', visible: false });

    const showToast = useCallback((message, type = 'info') => {
        setToast({ message, type, visible: true });
        setTimeout(() => setToast((prev) => ({ ...prev, visible: false })), 4000);
    }, []);

    const clearToast = useCallback(() => {
        setToast((prev) => ({ ...prev, visible: false }));
    }, []);

    useEffect(() => {
        // Suporte Seguro para Sessão de Testes E2E (Isolamento Estrito de Produção)
        const e2eSession =
            typeof window !== 'undefined'
                ? window.__FINCONTROL_E2E_USER__ || JSON.parse(sessionStorage.getItem('fincontrol_e2e_user') || 'null')
                : null;

        return setupAuthLifecycle({
            authInstance: auth,
            dbInstance: db,
            getPathSegments: getUserCollectionPathSegments,
            onAuthChanged: onAuthStateChanged,
            docFn: doc,
            onSnapshotFn: onSnapshot,
            setCurrentUser,
            setUserProfile,
            setIsAuthReady,
            showToast,
            clearUserSubs: clearUserSubscriptions,
            clearAllSubs: clearAllSubscriptions,
            e2eSession,
        });
    }, [showToast]);

    const activateFreeTrial = useCallback(async () => {
        if (!currentUser || !currentUser.uid) {
            showToast('Você precisa estar logado para ativar o teste.', 'error');
            return;
        }

        if (userProfile?.trialExpiresAt || userProfile?.plan === 'pro') {
            showToast('O período de teste já foi ativado ou você já é Pro.', 'info');
            return;
        }

        const trialEndDate = new Date();
        trialEndDate.setDate(trialEndDate.getDate() + 30);

        try {
            const userCollectionPath = getUserCollectionPathSegments();
            const userDocRef = doc(db, ...userCollectionPath, currentUser.uid);
            await updateDoc(userDocRef, {
                trialExpiresAt: trialEndDate,
                plan: 'vip_trial',
                updatedAt: serverTimestamp(),
            });
            showToast('Período de teste VIP ativado com sucesso! Aproveite 30 dias de acesso.', 'success');
        } catch (error) {
            console.error('Erro ao ativar período de teste VIP:', error);
            showToast('Não foi possível ativar o período de teste. Tente novamente mais tarde.', 'error');
        }
    }, [currentUser, userProfile, showToast]);

    const logout = useCallback(async () => {
        try {
            if (typeof window !== 'undefined' && (sessionStorage.getItem('fincontrol_e2e_user') || window.__FINCONTROL_E2E_USER__)) {
                delete window.__FINCONTROL_E2E_USER__;
                sessionStorage.removeItem('fincontrol_e2e_user');
                clearAllSubscriptions();
                setCurrentUser(null);
                setUserProfile(null);
                showToast('Você foi desconectado.', 'info');
                return;
            }
            await signOut(auth);
            if (typeof window !== 'undefined') {
                sessionStorage.removeItem('hasSeenWelcomeModal');
            }
            clearAllSubscriptions();
            setCurrentUser(null);
            setUserProfile(null);
            showToast('Você foi desconectado.', 'info');
        } catch (error) {
            console.error('Erro ao fazer logout:', error);
            showToast('Não foi possível fazer logout. Tente novamente.', 'error');
        }
    }, [showToast]);

    const isPro = userProfile?.plan === 'pro';
    const isTrialActive =
        userProfile?.trialExpiresAt && typeof userProfile.trialExpiresAt.toDate === 'function'
            ? userProfile.trialExpiresAt.toDate() > new Date()
            : userProfile?.trialExpiresAt
            ? new Date(userProfile.trialExpiresAt) > new Date()
            : false;

    const value = useMemo(() => ({
        currentUser,
        userId: currentUser?.uid,
        userProfile,
        isPro,
        isTrialActive,
        isAuthReady,
        showToast,
        db,
        auth,
        getAppFunctions,
        getUserCollectionPathSegments,
        activateFreeTrial,
        logout,
    }), [currentUser, userProfile, isPro, isTrialActive, isAuthReady, showToast, activateFreeTrial, logout]);

    return (
        <AppContext.Provider value={value}>
            {children}
            <Toast
                message={toast.message}
                type={toast.type}
                visible={toast.visible}
                onClose={clearToast}
            />
        </AppContext.Provider>
    );
}