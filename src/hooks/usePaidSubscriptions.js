// src/hooks/usePaidSubscriptions.js
import { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { useAppContext } from '../context/AppContext';

export function usePaidSubscriptions() {
    const { db, userId, isAuthReady, getUserCollectionPathSegments } = useAppContext();
    const [paidSubscriptions, setPaidSubscriptions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!isAuthReady || !userId || !db) {
            setLoading(false);
            return;
        }

        const basePath = [...getUserCollectionPathSegments(), userId];
        const paidSubsRef = collection(db, ...basePath, 'paidSubscriptions');

        const unsubscribe = onSnapshot(
            paidSubsRef,
            (snapshot) => {
                const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setPaidSubscriptions(data);
                setLoading(false);
            },
            (error) => {
                if (import.meta.env?.DEV) {
                    console.error('Erro no listener usePaidSubscriptions:', error);
                }
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [db, userId, isAuthReady, getUserCollectionPathSegments]);

    return { paidSubscriptions, loading };
}
