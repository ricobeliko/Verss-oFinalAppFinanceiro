// src/hooks/useCards.js
import { useState, useEffect } from 'react';
import { collection } from 'firebase/firestore';
import { useAppContext } from '../context/AppContext';
import { subscribeToFirestoreQuery, buildCanonicalQueryKey } from '../services/firestoreSubscriptionRegistry';

export function useCards() {
    const { db, userId, isAuthReady, getUserCollectionPathSegments } = useAppContext();
    const [cards, setCards] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!isAuthReady || !userId || !db) {
            setLoading(false);
            return;
        }

        // Suporte a dados sintéticos isolados para testes E2E sem tocar na produção
        if (import.meta.env.DEV && typeof window !== 'undefined' && window.__FINCONTROL_E2E_MOCK_DATA__?.cards) {
            setCards(window.__FINCONTROL_E2E_MOCK_DATA__.cards);
            setLoading(false);
            return;
        }

        const basePath = [...getUserCollectionPathSegments(), userId];
        const cardsRef = collection(db, ...basePath, 'cards');
        const canonicalKey = buildCanonicalQueryKey({
            collectionPath: `${basePath.join('/')}/cards`,
            uid: userId,
        });

        const unsubscribe = subscribeToFirestoreQuery({
            queryRef: cardsRef,
            canonicalKey,
            uid: userId,
            onNext: (snapshot) => {
                const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setCards(data);
                setLoading(false);
            },
            onError: (error) => {
                if (import.meta.env?.DEV) {
                    console.error('Erro no listener useCards:', error);
                }
                setLoading(false);
            },
        });

        return () => unsubscribe();
    }, [db, userId, isAuthReady, getUserCollectionPathSegments]);

    return { cards, loading };
}
