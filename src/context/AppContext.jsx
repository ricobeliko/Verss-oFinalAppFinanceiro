// src/context/AppContext.jsx

import React, { useState, useEffect, createContext, useContext } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db, functions } from '../utils/firebase'; // Removido getUserCollectionPathSegments daqui se não estiver em firebase.js
import Toast from '../components/Toast'; // Adicionado para o componente Toast

// Função auxiliar movida para dentro ou importada se estiver em firebase.js
const getUserCollectionPathSegments = () => ['users_fallback'];

export const AppContext = createContext();

export const useAppContext = () => {
    return useContext(AppContext);
};

export function AppProvider({ children }) {
    const [currentUser, setCurrentUser] = useState(null);
    const [userProfile, setUserProfile] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [toast, setToast] = useState({ message: '', type: 'info', visible: false }); // Estado de toast unificado

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setCurrentUser(user);
            if (user && user.uid) {
                try {
                    const userCollectionPath = getUserCollectionPathSegments();
                    const userDocRef = doc(db, ...userCollectionPath, user.uid);
                    const docSnap = await getDoc(userDocRef);
                    const userData = docSnap.exists() ? docSnap.data() : null;
                    setUserProfile(userData);
                } catch (error) {
                    console.error("Erro ao buscar perfil do usuário:", error);
                    setUserProfile(null);
                }
            } else {
                setUserProfile(null);
            }
            setIsAuthReady(true);
        });
        return () => unsubscribe();
    }, []);

    const showToast = (message, type = 'info') => {
        setToast({ message, type, visible: true });
        setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 4000);
    };
    
    const clearToast = () => {
        setToast(prev => ({...prev, visible: false}));
    };

    const value = {
        currentUser,
        userId: currentUser?.uid,
        userProfile,
        isPro: userProfile?.plan === 'pro',
        isTrialActive: userProfile?.trialExpiresAt?.toDate() > new Date(), // Lógica de trial pode ser adicionada aqui se necessário
        isAuthReady,
        showToast,
        db,
        auth,
        functions,
        getUserCollectionPathSegments,
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