// src/hooks/useExpenses.js
import { useState, useEffect } from 'react';
import { collection } from 'firebase/firestore';
import { useAppContext } from '../context/AppContext';
import { subscribeToFirestoreQuery, buildCanonicalQueryKey } from '../services/firestoreSubscriptionRegistry';

export function useExpenses() {
    const { db, userId, isAuthReady, getUserCollectionPathSegments } = useAppContext();
    const [expenses, setExpenses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isStale, setIsStale] = useState(false);

    useEffect(() => {
        if (!isAuthReady || !userId || !db) {
            setLoading(false);
            return;
        }

        // Suporte a dados sintéticos isolados para testes E2E sem tocar na produção
        if (import.meta.env.DEV && typeof window !== 'undefined' && window.__FINCONTROL_E2E_MOCK_DATA__?.expenses) {
            setExpenses(window.__FINCONTROL_E2E_MOCK_DATA__.expenses);
            setLoading(false);
            setError(null);
            setIsStale(false);
            return;
        }

        const basePath = [...getUserCollectionPathSegments(), userId];
        const expensesRef = collection(db, ...basePath, 'expenses');
        const canonicalKey = buildCanonicalQueryKey({
            collectionPath: `${basePath.join('/')}/expenses`,
            uid: userId,
        });

        const unsubscribe = subscribeToFirestoreQuery({
            queryRef: expensesRef,
            canonicalKey,
            uid: userId,
            onNext: (snapshot) => {
                const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
                data.sort((a, b) => {
                    const dateA = a.createdAt?.toDate?.() || new Date(a.date || 0);
                    const dateB = b.createdAt?.toDate?.() || new Date(b.date || 0);
                    return dateB - dateA;
                });
                setExpenses(data);
                setLoading(false);
                setError(null);
                setIsStale(false);
            },
            onError: (err) => {
                if (import.meta.env?.DEV) {
                    console.error('Erro no listener useExpenses:', err);
                }
                setError(err);
                setIsStale(true);
                setLoading(false);
            },
        });

        return () => unsubscribe();
    }, [db, userId, isAuthReady, getUserCollectionPathSegments]);

    return { expenses, loading, error, isStale };
}
