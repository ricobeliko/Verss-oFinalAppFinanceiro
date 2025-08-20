import React, { createContext, useState, useEffect, useContext } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../utils/firebase';
import Toast from '../components/Toast';

export const AppContext = createContext();

export const useAppContext = () => useContext(AppContext);

export const AppProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [userId, setUserId] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [isPro, setIsPro] = useState(false);
    const [theme, setTheme] = useState('dark');
    const [toast, setToast] = useState({ message: '', type: '', visible: false });

    // ✅ 1. FUNÇÃO ADICIONADA
    // Esta função retorna o caminho base para as coleções do usuário no Firestore.
    // Isso centraliza a lógica do caminho, facilitando futuras alterações.
    const getUserCollectionPathSegments = () => {
        // No seu projeto, o caminho base é 'users_fallback'.
        return ['users_fallback'];
    };

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                // Usando a nova função para obter o caminho de forma consistente
                const userCollectionPath = getUserCollectionPathSegments();
                const userDocRef = doc(db, ...userCollectionPath, currentUser.uid);
                const userDoc = await getDoc(userDocRef);

                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    setUser({ ...currentUser, ...userData });
                    setIsPro(userData.isPro || false);
                } else {
                    // Se o usuário não existir no Firestore, criamos um novo documento para ele.
                    const newUser = {
                        email: currentUser.email,
                        uid: currentUser.uid,
                        createdAt: serverTimestamp(),
                        isPro: false,
                    };
                    await setDoc(userDocRef, newUser);
                    setUser({ ...currentUser, ...newUser });
                    setIsPro(false);
                }
                setUserId(currentUser.uid);
            } else {
                setUser(null);
                setUserId(null);
                setIsPro(false);
            }
            setIsAuthReady(true);
        });
        return () => unsubscribe();
    }, []);

    const showToast = (message, type = 'info') => {
        setToast({ message, type, visible: true });
        setTimeout(() => {
            setToast((prev) => ({ ...prev, visible: false }));
        }, 3000);
    };

    // ✅ 2. ADICIONANDO A FUNÇÃO AO VALOR DO CONTEXTO
    // Agora, todos os componentes que usam o useAppContext() terão acesso a esta função.
    const value = {
        user,
        userId,
        isAuthReady,
        isPro,
        db,
        theme,
        setTheme,
        showToast,
        getUserCollectionPathSegments, // Exportando a função
    };

    return (
        <AppContext.Provider value={value}>
            {children}
            <Toast message={toast.message} type={toast.type} visible={toast.visible} />
        </AppContext.Provider>
    );
};
