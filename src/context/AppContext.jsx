// src/context/AppContext.jsx

import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, updateDoc, onSnapshot } from 'firebase/firestore'; // ✅ 1. onSnapshot importado
import { auth, db, functions } from '../utils/firebase'; 
import Toast from '../components/Toast';

const useInactivityLogout = (logoutCallback, timeout = 900000) => {
    const [lastActivity, setLastActivity] = useState(Date.now());
    useEffect(() => {
        const events = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll'];
        const resetTimer = () => setLastActivity(Date.now());
        events.forEach(event => window.addEventListener(event, resetTimer));
        const interval = setInterval(() => {
            if (auth.currentUser && (Date.now() - lastActivity > timeout)) {
                logoutCallback('Sua sessão expirou por inatividade.');
            }
        }, 10000);
        return () => {
            clearInterval(interval);
            events.forEach(event => window.removeEventListener(event, resetTimer));
        };
    }, [lastActivity, logoutCallback, timeout]);
};

export const AppContext = createContext();
export const useAppContext = () => useContext(AppContext);

export const AppProvider = ({ children }) => {
    const [userProfile, setUserProfile] = useState(null);
    const [userId, setUserId] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [isPro, setIsPro] = useState(false);
    const [isTrialActive, setIsTrialActive] = useState(false);
    const [theme, setTheme] = useState('dark'); 
    const [toast, setToast] = useState({ message: '', type: 'info', visible: false });

    const getUserCollectionPathSegments = () => ['users_fallback'];

    const handleLogout = useCallback((message) => {
        signOut(auth).then(() => {
            if (message) {
                localStorage.setItem('logoutMessage', message);
            }
        });
    }, []);

    useInactivityLogout(handleLogout, 900000);

    // ✅ 2. LÓGICA DE ATUALIZAÇÃO EM TEMPO REAL
    useEffect(() => {
        const logoutMessage = localStorage.getItem('logoutMessage');
        if (logoutMessage) {
            showToast(logoutMessage, 'info');
            localStorage.removeItem('logoutMessage');
        }

        let unsubscribeUserDoc = () => {};

        const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
            // Limpa o listener do usuário anterior ao trocar de conta ou deslogar
            unsubscribeUserDoc();

            if (currentUser) {
                const userCollectionPath = getUserCollectionPathSegments();
                const userDocRef = doc(db, ...userCollectionPath, currentUser.uid);
                
                // onSnapshot "escuta" por mudanças no documento do usuário em tempo real
                unsubscribeUserDoc = onSnapshot(userDocRef, (doc) => {
                    if (doc.exists()) {
                        const userData = doc.data();
                        setUserProfile({ ...currentUser, ...userData });
                        setIsPro(userData.plan === 'pro');
                        const trialExpiresAt = userData.trialExpiresAt?.toDate();
                        setIsTrialActive(!!(trialExpiresAt && trialExpiresAt > new Date()));
                    }
                    // (O caso de doc não existir é tratado no registro)
                });

                setUserId(currentUser.uid);
            } else {
                setUserProfile(null);
                setUserId(null);
                setIsPro(false);
                setIsTrialActive(false);
            }
            setIsAuthReady(true);
        });

        return () => {
            unsubscribeAuth();
            unsubscribeUserDoc();
        };
    }, []);

    const showToast = (message, type = 'info') => {
        setToast({ message, type, visible: true });
        setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 4000);
    };
    
    const clearToast = () => {
        setToast(prev => ({...prev, visible: false}));
    };

    // ✅ 3. FUNÇÃO DE ATIVAÇÃO SIMPLIFICADA
    const activateFreeTrial = async () => {
        if (!userId) {
            return showToast('Você precisa estar logado para ativar o teste.', 'error');
        }
        if (userProfile?.trialExpiresAt) {
            return showToast('O teste grátis já foi ativado para esta conta.', 'warning');
        }
        
        try {
            const userCollectionPath = getUserCollectionPathSegments();
            const userDocRef = doc(db, ...userCollectionPath, userId);
            const trialEndDate = new Date();
            trialEndDate.setDate(trialEndDate.getDate() + 30);

            await updateDoc(userDocRef, { trialExpiresAt: trialEndDate });
            // Não precisamos mais atualizar o estado manualmente aqui.
            // O onSnapshot cuidará disso automaticamente!
            showToast('Mês grátis ativado! Aproveite os recursos PRO.', 'success');
        } catch(error) {
            console.error("Erro detalhado ao ativar o mês grátis:", error);
            showToast(`Falha ao ativar: ${error.code || error.message}`, 'error');
        }
    };
    
    const value = {
        currentUser: userProfile, userProfile, userId, isAuthReady, isPro, isTrialActive,
        activateFreeTrial, db, auth, theme, setTheme, showToast, getUserCollectionPathSegments,
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
};