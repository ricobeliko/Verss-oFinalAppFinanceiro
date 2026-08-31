// src/services/firestoreSubscriptionRegistry.js
/**
 * @fileoverview Registro compartilhado e deduplicação de listeners Firestore em tempo real.
 * Garante que múltiplos componentes/hooks inscritos na mesma query canônica compartilhem
 * uma única subscription ativa subjacente (onSnapshot) via Reference Counting.
 *
 * Características:
 * - Chave canônica unívoca incorporando UID obrigatoriamente.
 * - Reference counting com encerramento determinístico quando refCount === 0.
 * - Distribuição síncrona do snapshot mais recente para novos inscritos sem novo fetch de rede.
 * - Recuperação segura e não-tóxica de erros terminais em onSnapshot.
 * - Isolamento estrito entre usuários e limpeza total em logout / troca direta de conta.
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
 * @param {string} params.uid UID autenticado do usuário (obrigatório)
 * @param {Array<string>} [params.queryClauses=[]] Cláusulas de query serializadas (ex: ['month:==:2026-08'])
 * @returns {string} Chave canônica ou string vazia se inválido
 */
export function buildCanonicalQueryKey({ collectionPath, uid, queryClauses = [] } = {}) {
    if (!uid || typeof uid !== 'string' || !uid.trim()) {
        return '';
    }
    if (!collectionPath || typeof collectionPath !== 'string' || !collectionPath.trim()) {
        return '';
    }

    const sortedClauses = Array.isArray(queryClauses) ? [...queryClauses].sort() : [];
    const clausesStr = sortedClauses.length > 0 ? `|query:${sortedClauses.join('&')}` : '';

    return `uid:${uid.trim()}|path:${collectionPath.trim()}${clausesStr}`;
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
    // Validação fail-closed
    if (
        !queryRef ||
        !canonicalKey ||
        typeof canonicalKey !== 'string' ||
        !canonicalKey.trim() ||
        !uid ||
        typeof uid !== 'string' ||
        !uid.trim() ||
        typeof onNext !== 'function'
    ) {
        return () => {};
    }

    const subscriber = { onNext, onError };

    // Cenário 1: Já existe uma subscription ativa subjacente para esta chave canônica
    if (subscriptionRegistry.has(canonicalKey)) {
        const entry = subscriptionRegistry.get(canonicalKey);

        // Se a entry existente estiver em estado terminal, não anexar como saudável
        if (!entry.isTerminal) {
            entry.refCount++;
            entry.subscribers.add(subscriber);
            metrics.activeConsumersCount++;
            metrics.duplicateSubscriptionsSaved++;

            // Emite imediatamente o snapshot em cache para o novo consumidor (se já disponível e saudável)
            if (entry.hasEmitted && entry.lastSnapshot) {
                try {
                    onNext(entry.lastSnapshot);
                } catch (err) {
                    console.error('[SubscriptionRegistry] Erro ao entregar snapshot em cache ao novo assinante:', err);
                }
            }

            // Função de cleanup do consumidor
            return () => {
                unsubscribeConsumer(canonicalKey, subscriber, entry);
            };
        }
    }

    // Cenário 2: Primeira inscrição ou recriação após erro terminal
    const entry = {
        canonicalKey,
        uid,
        queryRef,
        refCount: 1,
        subscribers: new Set([subscriber]),
        lastSnapshot: null,
        lastError: null,
        hasEmitted: false,
        isTerminal: false,
        rawUnsubscribe: null,
    };

    metrics.activeSubscriptionsCount++;
    metrics.activeConsumersCount++;
    metrics.totalSubscriptionsCreated++;
    subscriptionRegistry.set(canonicalKey, entry);

    try {
        const rawUnsub = onSnapshot(
            queryRef,
            (snapshot) => {
                if (entry.isTerminal) return;
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
                // Tratamento determinístico de erro terminal
                entry.isTerminal = true;
                entry.hasEmitted = true;
                entry.lastError = error;

                if (import.meta.env?.DEV) {
                    console.error(`[SubscriptionRegistry] Erro terminal no listener Firestore (${canonicalKey}):`, error);
                }

                // Notifica todos os assinantes ativos sobre o erro
                entry.subscribers.forEach((sub) => {
                    try {
                        sub.onError?.(error);
                    } catch (err) {
                        console.error('[SubscriptionRegistry] Erro ao notificar erro ao assinante:', err);
                    }
                });

                // Encerra a conexão subjacente crua se ainda ativa
                if (typeof entry.rawUnsubscribe === 'function') {
                    try {
                        entry.rawUnsubscribe();
                    } catch (err) {
                        console.error('[SubscriptionRegistry] Erro ao executar rawUnsubscribe pós-erro:', err);
                    }
                    entry.rawUnsubscribe = null;
                }

                // Invalida do mapa para que novas inscrições/remounts criem um novo listener limpo
                if (subscriptionRegistry.get(canonicalKey) === entry) {
                    subscriptionRegistry.delete(canonicalKey);
                    metrics.activeSubscriptionsCount = Math.max(0, metrics.activeSubscriptionsCount - 1);
                    metrics.totalSubscriptionsDestroyed++;
                }
            }
        );

        entry.rawUnsubscribe = rawUnsub;
    } catch (error) {
        // Rollback obrigatório em caso de falha síncrona na inicialização
        subscriptionRegistry.delete(canonicalKey);
        metrics.activeSubscriptionsCount = Math.max(0, metrics.activeSubscriptionsCount - 1);
        metrics.activeConsumersCount = Math.max(0, metrics.activeConsumersCount - 1);
        metrics.totalSubscriptionsCreated = Math.max(0, metrics.totalSubscriptionsCreated - 1);

        if (import.meta.env?.DEV) {
            console.error(`[SubscriptionRegistry] Falha síncrona ao inicializar onSnapshot (${canonicalKey}):`, error);
        }
        onError?.(error);
        return () => {};
    }

    return () => {
        unsubscribeConsumer(canonicalKey, subscriber, entry);
    };
}

/**
 * Remove um consumidor específico e encerra a subscription subjacente se refCount chegar a 0.
 *
 * @param {string} canonicalKey
 * @param {Object} subscriber
 * @param {Object} entryRef
 */
function unsubscribeConsumer(canonicalKey, subscriber, entryRef) {
    metrics.activeConsumersCount = Math.max(0, metrics.activeConsumersCount - 1);

    if (!entryRef) return;

    entryRef.subscribers.delete(subscriber);
    entryRef.refCount = Math.max(0, entryRef.refCount - 1);

    // Se a entry ainda estiver no registry ativo e não houver mais nenhum consumidor ativo
    if (entryRef.refCount === 0 && subscriptionRegistry.get(canonicalKey) === entryRef) {
        if (typeof entryRef.rawUnsubscribe === 'function') {
            try {
                entryRef.rawUnsubscribe();
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
            metrics.activeConsumersCount = Math.max(0, metrics.activeConsumersCount - entry.refCount);
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
