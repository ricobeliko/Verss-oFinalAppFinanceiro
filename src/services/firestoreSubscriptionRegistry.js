// src/services/firestoreSubscriptionRegistry.js
/**
 * @fileoverview Registro compartilhado e deduplicação de listeners Firestore em tempo real.
 * Garante que múltiplos componentes/hooks inscritos na mesma query canônica compartilhem
 * uma única subscription ativa subjacente (onSnapshot) via Reference Counting.
 *
 * Características:
 * - Chave canônica unívoca por query e UID.
 * - Reference counting com encerramento determinístico quando refCount === 0.
 * - Distribuição síncrona do snapshot mais recente para novos inscritos sem novo fetch de rede.
 * - Isolamento estrito entre usuários e limpeza total em logout.
 * - Métricas de observabilidade e diagnósticos (Zero PII).
 */

import { onSnapshot } from 'firebase/firestore';

// Registro central de subscriptions ativas: Map<canonicalKey, Entry>
const subscriptionRegistry = new Map();

// Métricas de observabilidade em memória (Zero PII)
const metrics = {
    activeSubscriptionsCount: 0,
    activeConsumersCount: 0,
    totalSubscriptionsCreated: 0,
    totalSubscriptionsDestroyed: 0,
    duplicateSubscriptionsSaved: 0,
};

/**
 * Constrói uma chave canônica determinística para a consulta Firestore.
 *
 * @param {Object} params
 * @param {string} params.collectionPath Caminho da coleção (ex: 'users_fallback/UID/cards')
 * @param {string} params.uid UID autenticado do usuário
 * @param {Array<string>} [params.queryClauses=[]] Cláusulas de query serializadas (ex: ['month:==:2026-08'])
 * @returns {string} Chave canônica
 */
export function buildCanonicalQueryKey({ collectionPath, queryClauses = [] }) {
    const clausesStr = queryClauses.length > 0 ? `?${queryClauses.sort().join('&')}` : '';
    return `${collectionPath}${clausesStr}`;
}

/**
 * Inscreve um consumidor em uma query do Firestore com deduplicação e reference counting.
 *
 * @param {Object} params
 * @param {Object} params.queryRef Query ou CollectionReference do Firestore
 * @param {string} params.canonicalKey Chave canônica da consulta
 * @param {string} params.uid UID do usuário para isolamento estrito
 * @param {Function} params.onNext Callback chamado a cada novo snapshot (ou com snapshot em cache)
 * @param {Function} [params.onError] Callback chamado em caso de erro na query
 * @returns {Function} Função de cancelamento de inscrição do consumidor (unsubscribe)
 */
export function subscribeToFirestoreQuery({ queryRef, canonicalKey, uid, onNext, onError }) {
    if (!queryRef || !canonicalKey || !uid || typeof onNext !== 'function') {
        return () => {};
    }

    const subscriber = { onNext, onError };

    // Cenário 1: Já existe uma subscription ativa subjacente para esta chave canônica
    if (subscriptionRegistry.has(canonicalKey)) {
        const entry = subscriptionRegistry.get(canonicalKey);
        entry.refCount++;
        entry.subscribers.add(subscriber);
        metrics.activeConsumersCount++;
        metrics.duplicateSubscriptionsSaved++;

        // Emite imediatamente o snapshot em cache para o novo consumidor (se já disponível)
        if (entry.hasEmitted) {
            if (entry.lastError && typeof onError === 'function') {
                onError(entry.lastError);
            } else if (entry.lastSnapshot) {
                try {
                    onNext(entry.lastSnapshot);
                } catch (err) {
                    console.error('[SubscriptionRegistry] Erro ao entregar snapshot em cache ao novo assinante:', err);
                }
            }
        }

        // Função de cleanup do consumidor
        return () => {
            unsubscribeConsumer(canonicalKey, subscriber);
        };
    }

    // Cenário 2: Primeira inscrição — Cria nova subscription subjacente no Firestore
    const entry = {
        canonicalKey,
        uid,
        queryRef,
        refCount: 1,
        subscribers: new Set([subscriber]),
        lastSnapshot: null,
        lastError: null,
        hasEmitted: false,
        rawUnsubscribe: null,
    };

    metrics.activeSubscriptionsCount++;
    metrics.activeConsumersCount++;
    metrics.totalSubscriptionsCreated++;

    try {
        const rawUnsub = onSnapshot(
            queryRef,
            (snapshot) => {
                entry.hasEmitted = true;
                entry.lastSnapshot = snapshot;
                entry.lastError = null;

                entry.subscribers.forEach((sub) => {
                    try {
                        sub.onNext(snapshot);
                    } catch (err) {
                        console.error('[SubscriptionRegistry] Erro ao notificar assinante:', err);
                    }
                });
            },
            (error) => {
                entry.hasEmitted = true;
                entry.lastError = error;

                if (import.meta.env?.DEV) {
                    console.error(`[SubscriptionRegistry] Erro no listener Firestore (${canonicalKey}):`, error);
                }

                entry.subscribers.forEach((sub) => {
                    try {
                        sub.onError?.(error);
                    } catch (err) {
                        console.error('[SubscriptionRegistry] Erro ao notificar erro ao assinante:', err);
                    }
                });
            }
        );

        entry.rawUnsubscribe = rawUnsub;
        subscriptionRegistry.set(canonicalKey, entry);
    } catch (error) {
        if (import.meta.env?.DEV) {
            console.error(`[SubscriptionRegistry] Falha crítica ao inicializar onSnapshot (${canonicalKey}):`, error);
        }
        onError?.(error);
        return () => {};
    }

    return () => {
        unsubscribeConsumer(canonicalKey, subscriber);
    };
}

/**
 * Remove um consumidor específico e encerra a subscription subjacente se refCount chegar a 0.
 *
 * @param {string} canonicalKey
 * @param {Object} subscriber
 */
function unsubscribeConsumer(canonicalKey, subscriber) {
    const entry = subscriptionRegistry.get(canonicalKey);
    if (!entry) return;

    entry.subscribers.delete(subscriber);
    entry.refCount = Math.max(0, entry.refCount - 1);
    metrics.activeConsumersCount = Math.max(0, metrics.activeConsumersCount - 1);

    // Se não houver mais nenhum consumidor ativo, encerra a subscription subjacente no Firestore
    if (entry.refCount === 0) {
        if (typeof entry.rawUnsubscribe === 'function') {
            try {
                entry.rawUnsubscribe();
            } catch (err) {
                console.error('[SubscriptionRegistry] Erro ao executar rawUnsubscribe:', err);
            }
        }
        subscriptionRegistry.delete(canonicalKey);
        metrics.activeSubscriptionsCount = Math.max(0, metrics.activeSubscriptionsCount - 1);
        metrics.totalSubscriptionsDestroyed++;
    }
}

/**
 * Limpa todas as subscriptions de um usuário específico (em logout ou troca de conta).
 *
 * @param {string} uid UID do usuário cujas subscriptions devem ser limpas
 */
export function clearUserSubscriptions(uid) {
    if (!uid) return;

    for (const [key, entry] of subscriptionRegistry.entries()) {
        if (entry.uid === uid) {
            if (typeof entry.rawUnsubscribe === 'function') {
                try {
                    entry.rawUnsubscribe();
                } catch (err) {
                    console.error('[SubscriptionRegistry] Erro ao limpar subscription de usuário:', err);
                }
            }
            subscriptionRegistry.delete(key);
            metrics.activeSubscriptionsCount = Math.max(0, metrics.activeSubscriptionsCount - 1);
            metrics.totalSubscriptionsDestroyed++;
        }
    }
}

/**
 * Encerra todas as subscriptions ativas e reseta o registry por completo.
 */
export function clearAllSubscriptions() {
    for (const [, entry] of subscriptionRegistry.entries()) {
        if (typeof entry.rawUnsubscribe === 'function') {
            try {
                entry.rawUnsubscribe();
            } catch (err) {
                console.error('[SubscriptionRegistry] Erro ao limpar todas as subscriptions:', err);
            }
        }
    }
    subscriptionRegistry.clear();
    metrics.activeSubscriptionsCount = 0;
    metrics.activeConsumersCount = 0;
}

/**
 * Retorna as métricas operacionais do registry para diagnóstico e testes automatizados.
 *
 * @returns {Object}
 */
export function getSubscriptionMetrics() {
    return {
        ...metrics,
        registrySize: subscriptionRegistry.size,
    };
}

/**
 * Reseta os contadores de métricas para execução determinística de testes.
 */
export function resetSubscriptionMetrics() {
    metrics.activeSubscriptionsCount = subscriptionRegistry.size;
    metrics.activeConsumersCount = Array.from(subscriptionRegistry.values()).reduce((sum, e) => sum + e.refCount, 0);
    metrics.totalSubscriptionsCreated = 0;
    metrics.totalSubscriptionsDestroyed = 0;
    metrics.duplicateSubscriptionsSaved = 0;
}
