import React, { useState, useEffect, createContext, useContext } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, onSnapshot, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, getAppFunctions } from '../utils/firebase';
import Toast from '../components/Toast';
import { clearAllSubscriptions } from '../services/firestoreSubscriptionRegistry';

const getUserCollectionPathSegments = () => ['users_fallback'];

export const AppContext = createContext();

export const useAppContext = () => {
    return useContext(AppContext);
};

export function AppProvider({ children }) {
    const [currentUser, setCurrentUser] = useState(null);
    const [userProfile, setUserProfile] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [toast, setToast] = useState({ message: '', type: 'info', visible: false });

    useEffect(() => {
        // Suporte Seguro para Sessão de Testes E2E (Isolamento Estrito de Produção)
        const e2eSession = typeof window !== 'undefined'
            ? (window.__FINCONTROL_E2E_USER__ || JSON.parse(sessionStorage.getItem('fincontrol_e2e_user') || 'null'))
            : null;

        if (e2eSession && import.meta.env.DEV) {
            setCurrentUser({
                uid: e2eSession.uid || 'e2e-user-sintetico',
                email: e2eSession.email || 'e2e-user@test.local',
                emailVerified: true,
                displayName: e2eSession.name || 'Usuário E2E'
            });
            setUserProfile({
                name: e2eSession.name || 'Usuário E2E',
                email: e2eSession.email || 'e2e-user@test.local',
                plan: e2eSession.plan || 'pro',
                budgets: e2eSession.budgets || { 'Alimentação': 1500, 'Transporte': 500 },
                notificationSettings: e2eSession.notificationSettings || { cardDueEnabled: true, cardDueDays: 3, receivablesEnabled: true },
                aiPreferences: e2eSession.aiPreferences || { optIn: false }
            });
            setIsAuthReady(true);
            return;
        }

        let unsubscribeFromUserProfile = () => {};

        const unsubscribeFromAuth = onAuthStateChanged(auth, (user) => {
            setCurrentUser(user);
            if (user) {
                const userCollectionPath = getUserCollectionPathSegments();
                const userDocRef = doc(db, ...userCollectionPath, user.uid);
                
                unsubscribeFromUserProfile = onSnapshot(userDocRef, (docSnap) => {
                    if (docSnap.exists()) {
                        setUserProfile(docSnap.data());
                    } else {
                        console.warn("Perfil de usuário não encontrado no Firestore para o UID:", user.uid);
                        setUserProfile(null);
                    }
                    setIsAuthReady(true);
                }, (error) => {
                    console.error("Erro ao escutar o perfil do usuário:", error);
                    showToast('Erro ao carregar dados do usuário.', 'error');
                    setIsAuthReady(true);
                });
            } else {
                unsubscribeFromUserProfile();
                clearAllSubscriptions();
                setUserProfile(null);
                setIsAuthReady(true);
            }
        });

        return () => {
            unsubscribeFromAuth();
            unsubscribeFromUserProfile();
            clearAllSubscriptions();
        };
    }, []);

    const showToast = (message, type = 'info') => {
        setToast({ message, type, visible: true });
        setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 4000);
    };

    const clearToast = () => {
        setToast(prev => ({ ...prev, visible: false }));
    };

    const activateFreeTrial = async () => {
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
                updatedAt: serverTimestamp()
            });
            showToast("Período de teste VIP ativado com sucesso! Aproveite 30 dias de acesso.", "success");
        } catch (error) {
            console.error("Erro ao ativar período de teste VIP:", error);
            showToast("Não foi possível ativar o período de teste. Tente novamente mais tarde.", "error");
        }
    };

    const logout = async () => {
        try {
            if (typeof window !== 'undefined' && (sessionStorage.getItem('fincontrol_e2e_user') || window.__FINCONTROL_E2E_USER__)) {
                delete window.__FINCONTROL_E2E_USER__;
                sessionStorage.removeItem('fincontrol_e2e_user');
                setCurrentUser(null);
                setUserProfile(null);
                showToast('Você foi desconectado.', 'info');
                return;
            }
            await signOut(auth);
            sessionStorage.removeItem('hasSeenWelcomeModal');
            setCurrentUser(null);
            setUserProfile(null);
            showToast("Você foi desconectado.", "info");
        } catch (error) {
            console.error("Erro ao fazer logout:", error);
            showToast("Não foi possível fazer logout. Tente novamente.", "error");
        }
    };

    const value = {
        currentUser,
        userId: currentUser?.uid,
        userProfile,
        isPro: userProfile?.plan === 'pro',
        isTrialActive: userProfile?.trialExpiresAt && typeof userProfile.trialExpiresAt.toDate === 'function'
            ? userProfile.trialExpiresAt.toDate() > new Date()
            : false,
        isAuthReady,
        showToast,
        db,
        auth,
        getAppFunctions,
        getUserCollectionPathSegments,
        activateFreeTrial,
        logout,
    };

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