// functions/security/rateLimit.js

const crypto = require("crypto");

/**
 * Reserva atomicamente uma tentativa de ação de API com controle de taxa distribuído (Firestore Transaction).
 * Aplica:
 * 1. Lease Token / Ownership Token (crypto.randomUUID()) para proteção contra stale race conditions
 * 2. In-Flight Lock (concorrência e proteção contra rajadas simultâneas)
 * 3. Cooldown (intervalo mínimo entre requisições consecutivas)
 * 4. Sliding Window Quota (limite máximo de requisições por hora)
 * 5. Safe Stale Lease Recovery (recuperação segura de locks abandonados após timeout defensivo > function timeout)
 * 6. Fail Closed (rejeição segura caso o Firestore esteja indisponível)
 *
 * @param {Object} db Instância do Firestore (ou emulador/mock com runTransaction)
 * @param {Object} options Configurações de rate limiting e identidade
 * @returns {Promise<{ rateLimitRef: Object, leaseId: string }>}
 */
async function reserveApiActionAttempt(db, {
    userId,
    action = "createMercadoPagoPreference",
    cooldownMs = 15 * 1000,
    hourlyLimit = 5,
    staleInFlightMs = 75 * 1000,
    now = Date.now(),
}) {
    if (!userId) {
        throw new Error("USER_ID_REQUIRED");
    }

    const rateLimitRef = db.collection("api_rate_limits").doc(`${userId}_${action}`);
    const ONE_HOUR_MS = 60 * 60 * 1000;
    const leaseId = crypto.randomUUID();

    await db.runTransaction(async (transaction) => {
        const limitDoc = await transaction.get(rateLimitRef);
        const limitData = limitDoc.exists ? limitDoc.data() : { requestTimestamps: [], inFlight: false };

        const lastRequestAt = limitData.lastRequestAt || 0;
        const inFlightSince = limitData.inFlightSince || lastRequestAt;
        const isInFlight = Boolean(limitData.inFlight);

        // 1. Bloqueio de concorrência ativa (InFlight Lease) com tolerância a lock stale (> 75s)
        if (isInFlight && (now - inFlightSince) < staleInFlightMs) {
            throw new Error("INFLIGHT_ACTIVE");
        }

        // 2. Cooldown individual entre tentativas consecutivas
        if (lastRequestAt && (now - lastRequestAt) < cooldownMs) {
            throw new Error("COOLDOWN_ACTIVE");
        }

        // 3. Janela deslizante de 1 hora
        const recentRequests = (limitData.requestTimestamps || []).filter(t => (now - t) < ONE_HOUR_MS);
        if (recentRequests.length >= hourlyLimit) {
            throw new Error("HOURLY_LIMIT_EXCEEDED");
        }

        // 4. Gravação atômica da reserva com Lease Token explícito
        transaction.set(rateLimitRef, {
            action,
            userId,
            lastRequestAt: now,
            inFlight: true,
            inFlightSince: now,
            leaseId,
            requestTimestamps: [...recentRequests, now],
            updatedAt: new Date(now).toISOString(),
        }, { merge: true });
    });

    return { rateLimitRef, leaseId };
}

/**
 * Libera a lease inFlight de forma segura através de Compare-And-Set atômico (Firestore Transaction).
 * A lease só é liberada se o documento ainda contiver exatamente o mesmo leaseId gerado na reserva.
 * Um holder antigo NUNCA consegue liberar a lease de um holder novo.
 *
 * @param {Object} db Instância do Firestore (ou emulador/mock com runTransaction)
 * @param {Object} rateLimitRef Referência do documento de rate limit
 * @param {string} leaseId Token único de posse da lease
 * @returns {Promise<{ released: boolean, reason?: string }>}
 */
async function releaseApiActionInFlight(db, rateLimitRef, leaseId) {
    if (!rateLimitRef || !leaseId) {
        return { released: false, reason: "INVALID_ARGUMENTS" };
    }

    try {
        let wasReleased = false;

        await db.runTransaction(async (transaction) => {
            const docSnap = await transaction.get(rateLimitRef);
            if (!docSnap.exists) {
                return;
            }

            const data = docSnap.data() || {};
            // Compare-and-Set: Libera APENAS se o leaseId for exatamente o mesmo
            if (data.leaseId === leaseId) {
                transaction.set(rateLimitRef, {
                    inFlight: false,
                    inFlightSince: null,
                    leaseId: null,
                    updatedAt: new Date().toISOString(),
                }, { merge: true });
                wasReleased = true;
            }
        });

        return { released: wasReleased };
    } catch (err) {
        return { released: false, reason: err.message };
    }
}

module.exports = {
    reserveApiActionAttempt,
    releaseApiActionInFlight,
};
