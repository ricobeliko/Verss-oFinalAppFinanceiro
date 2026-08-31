// src/hooks/useLoans.js
import { useState, useEffect } from 'react';
import { collection } from 'firebase/firestore';
import { useAppContext } from '../context/AppContext';
import { subscribeToFirestoreQuery, buildCanonicalQueryKey } from '../services/firestoreSubscriptionRegistry';

export function useLoans() {
    const { db, userId, isAuthReady, getUserCollectionPathSegments } = useAppContext();
    const [loans, setLoans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isStale, setIsStale] = useState(false);

    useEffect(() => {
        if (!isAuthReady || !userId || !db) {
            setLoading(false);
            return;
        }

        // Suporte a dados sintéticos isolados para testes E2E sem tocar na produção
        if (import.meta.env.DEV && typeof window !== 'undefined' && window.__FINCONTROL_E2E_MOCK_DATA__?.loans) {
            setLoans(window.__FINCONTROL_E2E_MOCK_DATA__.loans);
            setLoading(false);
            setError(null);
            setIsStale(false);
            return;
        }

        const basePath = [...getUserCollectionPathSegments(), userId];
        const loansRef = collection(db, ...basePath, 'loans');
        const canonicalKey = buildCanonicalQueryKey({
            collectionPath: `${basePath.join('/')}/loans`,
            uid: userId,
        });

        const unsubscribe = subscribeToFirestoreQuery({
            queryRef: loansRef,
            canonicalKey,
            uid: userId,
            onNext: (snapshot) => {
                const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
                data.sort((a, b) => {
                    const dateA = a.createdAt?.toDate?.() || new Date(a.purchaseDate || a.date || 0);
                    const dateB = b.createdAt?.toDate?.() || new Date(b.purchaseDate || b.date || 0);
                    return dateB - dateA;
                });
                setLoans(data);
                setLoading(false);
                setError(null);
                setIsStale(false);
            },
            onError: (err) => {
                if (import.meta.env?.DEV) {
                    console.error('Erro no listener useLoans:', err);
                }
                setError(err);
                setIsStale(true);
                setLoading(false);
            },
        });

        return () => unsubscribe();
    }, [db, userId, isAuthReady, getUserCollectionPathSegments]);

    return { loans, loading, error, isStale };
}
