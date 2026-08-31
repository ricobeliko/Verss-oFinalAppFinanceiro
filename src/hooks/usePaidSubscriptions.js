// src/hooks/usePaidSubscriptions.js
import { useState, useEffect } from 'react';
import { collection } from 'firebase/firestore';
import { useAppContext } from '../context/AppContext';
import { subscribeToFirestoreQuery, buildCanonicalQueryKey } from '../services/firestoreSubscriptionRegistry';

export function usePaidSubscriptions() {
    const { db, userId, isAuthReady, getUserCollectionPathSegments } = useAppContext();
    const [paidSubscriptions, setPaidSubscriptions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isStale, setIsStale] = useState(false);

    useEffect(() => {
        if (!isAuthReady || !userId || !db) {
            setLoading(false);
            return;
        }

        const basePath = [...getUserCollectionPathSegments(), userId];
        const paidSubsRef = collection(db, ...basePath, 'paidSubscriptions');
        const canonicalKey = buildCanonicalQueryKey({
            collectionPath: `${basePath.join('/')}/paidSubscriptions`,
            uid: userId,
        });

        const unsubscribe = subscribeToFirestoreQuery({
            queryRef: paidSubsRef,
            canonicalKey,
            uid: userId,
            onNext: (snapshot) => {
                const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
                setPaidSubscriptions(data);
                setLoading(false);
                setError(null);
                setIsStale(false);
            },
            onError: (err) => {
                if (import.meta.env?.DEV) {
                    console.error('Erro no listener usePaidSubscriptions:', err);
                }
                setError(err);
                setIsStale(true);
                setLoading(false);
            },
        });

        return () => unsubscribe();
    }, [db, userId, isAuthReady, getUserCollectionPathSegments]);

    return { paidSubscriptions, loading, error, isStale };
}
