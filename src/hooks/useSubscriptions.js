// src/hooks/useSubscriptions.js
import { useState, useEffect } from 'react';
import { collection } from 'firebase/firestore';
import { useAppContext } from '../context/AppContext';
import { subscribeToFirestoreQuery, buildCanonicalQueryKey } from '../services/firestoreSubscriptionRegistry';

export function useSubscriptions() {
    const { db, userId, isAuthReady, getUserCollectionPathSegments } = useAppContext();
    const [subscriptions, setSubscriptions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isStale, setIsStale] = useState(false);

    useEffect(() => {
        if (!isAuthReady || !userId || !db) {
            setLoading(false);
            return;
        }

        // Suporte a dados sintéticos isolados para testes E2E sem tocar na produção
        if (import.meta.env.DEV && typeof window !== 'undefined' && window.__FINCONTROL_E2E_MOCK_DATA__?.subscriptions) {
            setSubscriptions(window.__FINCONTROL_E2E_MOCK_DATA__.subscriptions);
            setLoading(false);
            setError(null);
            setIsStale(false);
            return;
        }

        const basePath = [...getUserCollectionPathSegments(), userId];
        const subscriptionsRef = collection(db, ...basePath, 'subscriptions');
        const canonicalKey = buildCanonicalQueryKey({
            collectionPath: `${basePath.join('/')}/subscriptions`,
            uid: userId,
        });

        const unsubscribe = subscribeToFirestoreQuery({
            queryRef: subscriptionsRef,
            canonicalKey,
            uid: userId,
            onNext: (snapshot) => {
                const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
                setSubscriptions(data);
                setLoading(false);
                setError(null);
                setIsStale(false);
            },
            onError: (err) => {
                if (import.meta.env?.DEV) {
                    console.error('Erro no listener useSubscriptions:', err);
                }
                setError(err);
                setIsStale(true);
                setLoading(false);
            },
        });

        return () => unsubscribe();
    }, [db, userId, isAuthReady, getUserCollectionPathSegments]);

    return { subscriptions, loading, error, isStale };
}
