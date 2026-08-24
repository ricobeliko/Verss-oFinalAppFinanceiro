// src/hooks/useSubscriptions.js
import { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { useAppContext } from '../context/AppContext';

export function useSubscriptions() {
    const { db, userId, isAuthReady, getUserCollectionPathSegments } = useAppContext();
    const [subscriptions, setSubscriptions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!isAuthReady || !userId || !db) {
            setLoading(false);
            return;
        }

        // Suporte a dados sintéticos isolados para testes E2E sem tocar na produção
        if (import.meta.env.DEV && typeof window !== 'undefined' && window.__FINCONTROL_E2E_MOCK_DATA__?.subscriptions) {
            setSubscriptions(window.__FINCONTROL_E2E_MOCK_DATA__.subscriptions);
            setLoading(false);
            return;
        }

        const basePath = [...getUserCollectionPathSegments(), userId];
        const subscriptionsRef = collection(db, ...basePath, 'subscriptions');

        const unsubscribe = onSnapshot(
            subscriptionsRef,
            (snapshot) => {
                const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setSubscriptions(data);
                setLoading(false);
            },
            (error) => {
                if (import.meta.env?.DEV) {
                    console.error('Erro no listener useSubscriptions:', error);
                }
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [db, userId, isAuthReady, getUserCollectionPathSegments]);

    return { subscriptions, loading };
}
