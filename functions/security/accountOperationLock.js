// functions/security/accountOperationLock.js
/**
 * @fileoverview Lock persistente e distribuído para operações de conta críticas (e.g. deleteUserAccount).
 * Garante exclusão mútua distribuída entre instâncias da Cloud Function via transações atômicas no Firestore,
 * com ownership token criptográfico (leaseId), recuperação de leases stale e liberação via Compare-and-Set.
 */

const crypto = require("crypto");
const admin = require("firebase-admin");

/**
 * Adquire um lock persistente exclusivo para uma operação destrutiva de conta.
 *
 * @param {FirebaseFirestore.Firestore} db Instância do Firestore Admin SDK.
 * @param {Object} params Parâmetros de aquisição.
 * @param {string} params.userId UID autenticado do usuário.
 * @param {string} [params.operation="deleteUserAccount"] Identificador da operação.
 * @param {number} [params.staleThresholdMs=75000] Tempo limite para considerar uma lease abandonada (deve ser > function timeout).
 * @param {number} [params.ttlMs=86400000] TTL de expiração e retenção da operação (24 horas padrão).
 * @returns {Promise<{ operationRef: FirebaseFirestore.DocumentReference, leaseId: string }>}
 * @throws {Error} OPERATION_IN_PROGRESS se houver uma operação ativa em andamento para o mesmo UID.
 */
async function acquireAccountOperationLock(db, {
    userId,
    operation = "deleteUserAccount",
    staleThresholdMs = 75 * 1000,
    ttlMs = 24 * 60 * 60 * 1000,
}) {
    if (!userId || typeof userId !== "string") {
        throw new Error("INVALID_USER_ID");
    }

    const operationRef = db.collection("account_operations").doc(userId);
    const leaseId = crypto.randomUUID();
    const now = Date.now();

    await db.runTransaction(async (transaction) => {
        const docSnap = await transaction.get(operationRef);
        const exists = docSnap.exists;
        const data = exists ? docSnap.data() : null;

        if (exists && data) {
            const isDeleting = data.status === "deleting";
            const lastUpdated = typeof data.updatedAt === "number" ? data.updatedAt : (typeof data.startedAt === "number" ? data.startedAt : 0);
            const isStale = (now - lastUpdated) > staleThresholdMs;

            // Se estiver em execução ativa e não stale, bloqueia concorrência
            if (isDeleting && !isStale) {
                throw new Error("OPERATION_IN_PROGRESS");
            }
        }

        const startedAt = (exists && data && typeof data.startedAt === "number") ? data.startedAt : now;
        let expiresAt;
        try {
            expiresAt = admin.firestore.Timestamp.fromMillis(now + ttlMs);
        } catch {
            expiresAt = new Date(now + ttlMs);
        }

        transaction.set(operationRef, {
            operation,
            leaseId,
            status: "deleting",
            startedAt,
            updatedAt: now,
            expiresAt,
        }, { merge: true });
    });

    return { operationRef, leaseId };
}

/**
 * Atualiza o status de uma operação de conta com Compare-and-Set seguro de leaseId.
 *
 * @param {FirebaseFirestore.Firestore} db Instância do Firestore Admin SDK.
 * @param {FirebaseFirestore.DocumentReference} operationRef Referência ao documento de lock.
 * @param {string} leaseId Token de posse exclusivo gerado na aquisição.
 * @param {string} newStatus Novo status da operação ("deleting" | "auth_deleted" | "completed" | "failed").
 * @returns {Promise<{ updated: boolean, reason?: string }>}
 */
async function updateAccountOperationStatus(db, operationRef, leaseId, newStatus) {
    if (!operationRef || !leaseId) {
        return { updated: false, reason: "INVALID_PARAMETERS" };
    }

    const now = Date.now();

    return await db.runTransaction(async (transaction) => {
        const docSnap = await transaction.get(operationRef);
        if (!docSnap.exists) {
            return { updated: false, reason: "DOCUMENT_NOT_FOUND" };
        }

        const data = docSnap.data() || {};
        if (data.leaseId !== leaseId) {
            return { updated: false, reason: "LEASE_LOST" };
        }

        transaction.set(operationRef, {
            status: newStatus,
            updatedAt: now,
        }, { merge: true });

        return { updated: true };
    });
}

/**
 * Libera ou finaliza o lock de operação de conta com Compare-and-Set seguro de leaseId.
 *
 * @param {FirebaseFirestore.Firestore} db Instância do Firestore Admin SDK.
 * @param {FirebaseFirestore.DocumentReference} operationRef Referência ao documento de lock.
 * @param {string} leaseId Token de posse exclusivo gerado na aquisição.
 * @param {string} [finalStatus="completed"] Status final da operação ("completed" | "failed").
 * @returns {Promise<{ released: boolean, reason?: string }>}
 */
async function releaseAccountOperationLock(db, operationRef, leaseId, finalStatus = "completed") {
    if (!operationRef || !leaseId) {
        return { released: false, reason: "INVALID_PARAMETERS" };
    }

    const now = Date.now();

    return await db.runTransaction(async (transaction) => {
        const docSnap = await transaction.get(operationRef);
        if (!docSnap.exists) {
            return { released: false, reason: "DOCUMENT_NOT_FOUND" };
        }

        const data = docSnap.data() || {};
        if (data.leaseId !== leaseId) {
            return { released: false, reason: "LEASE_LOST" };
        }

        transaction.set(operationRef, {
            status: finalStatus,
            updatedAt: now,
        }, { merge: true });

        return { released: true };
    });
}

module.exports = {
    acquireAccountOperationLock,
    updateAccountOperationStatus,
    releaseAccountOperationLock,
};
