// src/hooks/useIncomes.js
import { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { useAppContext } from '../context/AppContext';

export function useIncomes() {
    const { db, userId, isAuthReady, getUserCollectionPathSegments } = useAppContext();
    const [incomes, setIncomes] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!isAuthReady || !userId || !db) {
            setLoading(false);
            return;
        }

        // Suporte a dados sintéticos isolados para testes E2E sem tocar na produção
        if (import.meta.env.DEV && typeof window !== 'undefined' && window.__FINCONTROL_E2E_MOCK_DATA__?.incomes) {
            setIncomes(window.__FINCONTROL_E2E_MOCK_DATA__.incomes);
            setLoading(false);
            return;
        }

        const basePath = [...getUserCollectionPathSegments(), userId];
        const incomesRef = collection(db, ...basePath, 'incomes');

        const unsubscribe = onSnapshot(
            incomesRef,
            (snapshot) => {
                const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                data.sort((a, b) => {
                    const dateA = a.createdAt?.toDate?.() || new Date(a.date || 0);
                    const dateB = b.createdAt?.toDate?.() || new Date(b.date || 0);
                    return dateB - dateA;
                });
                setIncomes(data);
                setLoading(false);
            },
            (error) => {
                if (import.meta.env?.DEV) {
                    console.error('Erro no listener useIncomes:', error);
                }
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [db, userId, isAuthReady, getUserCollectionPathSegments]);

    return { incomes, loading };
}
