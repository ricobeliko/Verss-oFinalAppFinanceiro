// src/context/AppProvider.jsx

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { signOut } from 'firebase/auth';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, getAppFunctions } from '../utils/firebase';
import Toast from '../components/Toast';
import { clearAllSubscriptions, clearUserSubscriptions } from '../services/firestoreSubscriptionRegistry';
import { AppContext } from './AppContext';
import { setupAuthLifecycle, getUserCollectionPathSegments } from './authLifecycle';

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

export default AppProvider;
