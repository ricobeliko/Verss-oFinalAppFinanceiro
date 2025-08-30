import React, { useState, useEffect, createContext, useContext } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, onSnapshot, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, functions } from '../utils/firebase';
import Toast from '../components/Toast';

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
        let unsubscribeFromUserProfile = () => {};

        const unsubscribeFromAuth = onAuthStateChanged(auth, (user) => {
            unsubscribeFromUserProfile();

            if (!user) {
                setCurrentUser(null);
                setUserProfile(null);
                setIsAuthReady(true);
                return;
            }

            setCurrentUser(user);
            const userCollectionPath = getUserCollectionPathSegments();
            const userDocRef = doc(db, ...userCollectionPath, user.uid);

            unsubscribeFromUserProfile = onSnapshot(userDocRef, (docSnapshot) => {
                if (docSnapshot.exists()) {
                    setUserProfile(docSnapshot.data());
                } else {
                    console.warn("Documento de usuário não encontrado para UID:", user.uid);
                    setUserProfile(null);
                }
                setIsAuthReady(true);
            }, (error) => {
                console.error("Erro ao escutar o documento do usuário:", error);
                setUserProfile(null);
                setIsAuthReady(true);
            });
        });

        return () => {
            unsubscribeFromAuth();
            unsubscribeFromUserProfile();
        };
    }, []);

    const activateFreeTrial = async () => {
        if (!currentUser || !currentUser.uid) {
            showToast('Você precisa estar logado para ativar o teste.', 'error');
            return;
        }

        if (userProfile?.trialExpiresAt || userProfile?.plan === 'pro') {
            showToast('O período de teste já foi ativado ou você já é Pro.', 'info');
            return;
        }

        try {
            const userCollectionPath = getUserCollectionPathSegments();
            const userDocRef = doc(db, ...userCollectionPath, currentUser.uid);

            const trialEndDate = new Date();
            trialEndDate.setDate(trialEndDate.getDate() + 30);

            await updateDoc(userDocRef, {
                trialExpiresAt: trialEndDate,
                updatedAt: serverTimestamp()
            });

            showToast('Mês grátis ativado com sucesso!', 'success');
        } catch (error) {
            console.error("Erro ao ativar o período de teste:", error);
            showToast('Não foi possível ativar o período de teste. Tente novamente.', 'error');
        }
    };

    const logout = async () => {
        try {
            await signOut(auth);
            sessionStorage.removeItem('hasSeenWelcomeModal');
            showToast('Você foi desconectado.', 'info');
        } catch (error) {
            console.error('Erro ao fazer logout:', error);
            showToast('Erro ao sair. Tente novamente.', 'error');
        }
    };

    const showToast = (message, type = 'info') => {
        setToast({ message, type, visible: true });
        setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 4000);
    };

    const clearToast = () => {
        setToast(prev => ({ ...prev, visible: false }));
    };

    const value = {
        currentUser,
        userId: currentUser?.uid,
        userProfile,
        // ✅ A CORREÇÃO DEFINITIVA ESTÁ AQUI ✅
        // Voltamos a verificar o campo `plan`, que é o que seu backend utiliza.
        isPro: userProfile?.plan === 'pro',
        isTrialActive: userProfile?.trialExpiresAt && typeof userProfile.trialExpiresAt.toDate === 'function'
            ? userProfile.trialExpiresAt.toDate() > new Date()
            : false,
        isAuthReady,
        showToast,
        db,
        auth,
        functions,
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

