// functions/index.js

const crypto = require("crypto");
const { onCall, onRequest, HttpsError } = require("firebase-functions/v2/https");
const { logger } = require("firebase-functions");
const admin = require("firebase-admin");
const { MercadoPagoConfig, Preference, Payment } = require("mercadopago");

if (admin.apps.length === 0) {
    admin.initializeApp();
}

// ============================================================
// HELPERS UNIVERSAIS DE SEGURANÇA E PRIVACIDADE
// ============================================================

/**
 * Hash de UID para logs pseudônimos (Zero PII / Privacidade).
 * Nota: Representa pseudonimização criptográfica, não anonimização absoluta.
 */
function hashUid(uid) {
    if (!uid) return "anonymous";
    return crypto.createHash("sha256").update(String(uid)).digest("hex").slice(0, 12);
}

/**
 * Sanitiza strings de erro para evitar vazamento de credenciais, cartões ou PII.
 */
function sanitizeErrorMessage(str) {
    if (!str || typeof str !== "string") return "";
    return str
        .replace(/[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/g, "[EMAIL_REDACTED]")
        .replace(/\b(?:\d[ -]*?){13,19}\b/g, "[CARD_REDACTED]")
        .replace(/(bearer\s+)[a-zA-Z0-9_.-]+/gi, "$1[TOKEN_REDACTED]")
        .slice(0, 500);
}

const { reserveApiActionAttempt, releaseApiActionInFlight } = require("./security/rateLimit");

// ============================================================
// HELPERS DO WEBHOOK MERCADO PAGO
// ============================================================

/**
 * Extrai o identificador canônico de dados da URL (query param 'data.id')
 * utilizado como origem oficial e exclusiva da assinatura pelo Mercado Pago.
 */
function extractWebhookQueryDataId(req) {
    if (req.query && req.query['data.id']) {
        return String(req.query['data.id']).trim();
    }
    return null;
}

/**
 * Realiza o parsing seguro dos parâmetros do cabeçalho x-signature (ts=...,v1=...).
 */
function parseXSignature(xSignature) {
    if (!xSignature || typeof xSignature !== "string") {
        return null;
    }
    const parts = {};
    for (const item of xSignature.split(",")) {
        const eqIdx = item.indexOf("=");
        if (eqIdx !== -1) {
            const key = item.slice(0, eqIdx).trim();
            const val = item.slice(eqIdx + 1).trim();
            if (key && val) {
                parts[key] = val;
            }
        }
    }
    if (!parts.ts || !parts.v1) {
        return null;
    }
    return parts;
}

/**
 * Valida a assinatura criptográfica oficial (HMAC-SHA256) do Mercado Pago.
 * Especificação Oficial:
 * - Manifest: "id:${normalizedDataId};request-id:${xRequestId};ts:${ts};"
 * - Normalização: data.id em minúsculas (lowercase) para caracteres alfanuméricos.
 * - Comparação em tempo constante (timingSafeEqual) para proteção contra timing attacks.
 */
function validateMercadoPagoWebhookSignature({ secret, xSignature, xRequestId, dataId }) {
    if (!secret || !xSignature || !xRequestId || !dataId) {
        return false;
    }

    try {
        const parts = parseXSignature(xSignature);
        if (!parts || !parts.ts || !parts.v1) {
            return false;
        }

        const normalizedDataId = String(dataId).trim().toLowerCase();
        const normalizedRequestId = String(xRequestId).trim();
        const normalizedTs = String(parts.ts).trim();

        const manifest = `id:${normalizedDataId};request-id:${normalizedRequestId};ts:${normalizedTs};`;
        const calculatedHmac = crypto.createHmac("sha256", secret).update(manifest).digest("hex");

        const hmacBuf = Buffer.from(calculatedHmac, "hex");
        const v1Buf = Buffer.from(parts.v1, "hex");

        if (hmacBuf.length === 0 || v1Buf.length === 0 || hmacBuf.length !== v1Buf.length) {
            return false;
        }

        return crypto.timingSafeEqual(hmacBuf, v1Buf);
    } catch {
        return false;
    }
}

// ============================================================
// FUNÇÃO 1: createMercadoPagoPreference
// Cria preferência de pagamento no Mercado Pago para upgrade Pro.
// Auth obrigatória. Email verificado obrigatório.
// Anti-Abuso: Rate Limit Compartilhado + Cooldown + Lease Ownership Lock via Firestore Transaction.
// Secret: MERCADOPAGO_ACCESS_TOKEN via GCP Secret Manager.
// ============================================================
exports.createMercadoPagoPreference = onCall(
    {
        region: "southamerica-east1",
        maxInstances: 3,
        concurrency: 10,
        timeoutSeconds: 60,
        memory: "256MiB",
        secrets: ["MERCADOPAGO_ACCESS_TOKEN"],
    },
    async (request) => {
        const stage = "createMercadoPagoPreference";

        // 1. Validação de Autenticação
        if (!request.auth) {
            logger.warn(`[${stage}] Tentativa não autenticada rejeitada.`, {
                stage,
                result: "unauthenticated",
            });
            throw new HttpsError("unauthenticated", "Você precisa estar logado para realizar esta ação.");
        }

        const userId = request.auth.uid;
        const userLogHash = hashUid(userId);

        // 2. Validação de E-mail do Token
        if (!request.auth.token.email) {
            logger.error(`[${stage}] Usuário sem e-mail tentou iniciar pagamento.`, {
                stage,
                userHash: userLogHash,
                result: "invalid_argument",
            });
            throw new HttpsError("invalid-argument", "O e-mail do usuário é obrigatório para o pagamento.");
        }

        // 3. Validação de E-mail Verificado (Server-Side)
        if (request.auth.token.email_verified !== true) {
            logger.warn(`[${stage}] Usuário com e-mail não verificado tentou iniciar pagamento.`, {
                stage,
                userHash: userLogHash,
                event: "MP_PREFERENCE_EMAIL_UNVERIFIED",
                result: "failed_precondition_email_unverified",
            });
            throw new HttpsError("failed-precondition", "Você precisa confirmar seu endereço de e-mail antes de realizar pagamentos.");
        }

        // 4. Rate Limiting Compartilhado & Anti-Abuso (Firestore Transaction com Lease Token)
        const db = admin.firestore();
        let rateLimitRef = null;
        let leaseId = null;

        try {
            const reservation = await reserveApiActionAttempt(db, {
                userId,
                action: "createMercadoPagoPreference",
                cooldownMs: 15 * 1000,
                hourlyLimit: 5,
                staleInFlightMs: 75 * 1000,
            });
            rateLimitRef = reservation.rateLimitRef;
            leaseId = reservation.leaseId;
        } catch (error) {
            if (error.message === "INFLIGHT_ACTIVE") {
                logger.warn(`[${stage}] Chamada simultânea bloqueada por concorrência ativa.`, {
                    stage,
                    userHash: userLogHash,
                    event: "MP_PREFERENCE_INFLIGHT_BLOCKED",
                    result: "rate_limited_inflight",
                });
                throw new HttpsError("resource-exhausted", "Existe uma solicitação de pagamento em andamento. Aguarde alguns instantes.");
            }
            if (error.message === "COOLDOWN_ACTIVE") {
                logger.warn(`[${stage}] Chamada bloqueada por cooldown ativo.`, {
                    stage,
                    userHash: userLogHash,
                    event: "MP_PREFERENCE_COOLDOWN",
                    result: "rate_limited_cooldown",
                });
                throw new HttpsError("resource-exhausted", "Aguarde alguns instantes antes de gerar uma nova preferência de pagamento.");
            }
            if (error.message === "HOURLY_LIMIT_EXCEEDED") {
                logger.warn(`[${stage}] Limite horário de criação de preferências atingido.`, {
                    stage,
                    userHash: userLogHash,
                    event: "MP_PREFERENCE_RATE_LIMITED",
                    result: "rate_limited_hourly",
                });
                throw new HttpsError("resource-exhausted", "Limite de tentativas de pagamento atingido para esta hora. Tente novamente mais tarde.");
            }

            // Fail Closed em caso de erro inesperado no Firestore
            logger.error(`[${stage}] Falha de infraestrutura ao validar rate limit. Fail Closed acionado.`, {
                stage,
                userHash: userLogHash,
                errorDetails: error.message,
                result: "fail_closed_error",
            });
            throw new HttpsError("internal", "Não foi possível validar as cotas de segurança para esta operação.");
        }

        logger.info(`[${stage}] Reserva de cota e lease autorizadas. Iniciando chamada ao Mercado Pago.`, {
            stage,
            userHash: userLogHash,
        });

        const client = new MercadoPagoConfig({
            accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
        });

        try {
            const preference = new Preference(client);
            const preferenceData = {
                items: [{
                    id: "PRO-LIFETIME-01",
                    title: "FinControl Pro - Acesso Vitalício",
                    description: "Acesso a todos os recursos premium do FinControl.",
                    quantity: 1,
                    currency_id: "BRL",
                    unit_price: 29.99,
                }],
                payer: { email: request.auth.token.email },
                back_urls: {
                    success: "https://controle-de-cartao.web.app/dashboard?payment=success",
                    failure: "https://controle-de-cartao.web.app/dashboard?payment=failure",
                    pending: "https://controle-de-cartao.web.app/dashboard?payment=pending",
                },
                auto_return: "approved",
                external_reference: userId,
            };

            const startMs = Date.now();
            const result = await preference.create({ body: preferenceData });
            const latencyMs = Date.now() - startMs;

            logger.info(`[${stage}] Preferência criada com sucesso.`, {
                stage,
                userHash: userLogHash,
                preferenceId: result.id,
                latencyMs,
                result: "success",
            });

            return {
                preferenceId: result.id,
                init_point: result.init_point,
            };
        } catch (error) {
            logger.error(`[${stage}] Falha ao criar preferência no Mercado Pago.`, {
                stage,
                userHash: userLogHash,
                errorCode: error.status || error.code || "unknown",
                errorType: error.constructor?.name || "Error",
                result: "error",
            });
            throw new HttpsError("internal", "Falha ao criar a preferência de pagamento.");
        } finally {
            if (rateLimitRef && leaseId) {
                const releaseResult = await releaseApiActionInFlight(db, rateLimitRef, leaseId);
                if (!releaseResult.released && releaseResult.reason) {
                    logger.warn(`[${stage}] Liberação de lease falhou ou foi suplantada.`, {
                        stage,
                        userHash: userLogHash,
                        event: "MP_PREFERENCE_LEASE_RELEASE_FAILED",
                        reason: releaseResult.reason,
                    });
                }
            }
        }
    }
);

// ============================================================
// FUNÇÃO 2: paymentWebhookMercadoPago
// Processa notificações IPN/Webhook do Mercado Pago com validação HMAC de assinatura.
// Idempotente: ignora eventos já processados.
// Auth: Validação criptográfica de origem (x-signature / x-request-id) via HMAC-SHA256.
// Secret: MERCADOPAGO_ACCESS_TOKEN e MERCADOPAGO_WEBHOOK_SECRET via GCP Secret Manager.
// ============================================================
exports.paymentWebhookMercadoPago = onRequest(
    {
        region: "southamerica-east1",
        maxInstances: 3,
        concurrency: 20,
        timeoutSeconds: 60,
        memory: "256MiB",
        secrets: ["MERCADOPAGO_ACCESS_TOKEN", "MERCADOPAGO_WEBHOOK_SECRET"],
    },
    async (req, res) => {
        const stage = "paymentWebhookMercadoPago";

        if (req.method !== 'POST') {
            logger.warn(`[${stage}] Método não permitido.`, {
                stage,
                method: req.method,
                result: "method_not_allowed",
            });
            res.status(405).send('Method Not Allowed');
            return;
        }

        // 1. Extração da query canônica e cabeçalhos para autenticação
        const queryDataId = extractWebhookQueryDataId(req);
        const xSignature = req.headers['x-signature'];
        const xRequestId = req.headers['x-request-id'];

        // 2. Fail Closed: Rejeição precoce se query['data.id'] ou headers estiverem ausentes
        if (!xSignature || !xRequestId || !queryDataId) {
            logger.warn(`[${stage}] Webhook rejeitado: assinatura ou query['data.id'] ausente.`, {
                stage,
                event: "WEBHOOK_SIGNATURE_MISSING",
                hasSignature: Boolean(xSignature),
                hasRequestId: Boolean(xRequestId),
                hasQueryDataId: Boolean(queryDataId),
                result: "unauthorized_missing_headers",
            });
            res.status(401).send("Assinatura ou identificador ausente.");
            return;
        }

        // 3. Verificação do segredo de validação
        const webhookSecret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
        if (!webhookSecret) {
            logger.error(`[${stage}] Configuração incompleta: MERCADOPAGO_WEBHOOK_SECRET ausente.`, {
                stage,
                result: "secret_missing_config_error",
            });
            res.status(500).send("Erro interno de configuração de segurança.");
            return;
        }

        // 4. Validação criptográfica HMAC-SHA256 da assinatura oficial
        const isValidSignature = validateMercadoPagoWebhookSignature({
            secret: webhookSecret,
            xSignature,
            xRequestId,
            dataId: queryDataId,
        });

        if (!isValidSignature) {
            logger.warn(`[${stage}] Webhook rejeitado: assinatura criptográfica inválida.`, {
                stage,
                event: "WEBHOOK_SIGNATURE_INVALID",
                result: "unauthorized_invalid_signature",
            });
            res.status(401).send("Assinatura inválida.");
            return;
        }

        logger.info(`[${stage}] Assinatura do webhook validada com sucesso.`, {
            stage,
            event: "WEBHOOK_SIGNATURE_VALID",
            xRequestId,
        });

        // 5. Proteção contra Body / Query Mismatch
        const bodyDataId = req.body?.data?.id ? String(req.body.data.id).trim() : null;
        if (bodyDataId && bodyDataId !== queryDataId) {
            logger.warn(`[${stage}] Webhook rejeitado: divergência entre body.data.id e query['data.id'].`, {
                stage,
                event: "WEBHOOK_BODY_QUERY_MISMATCH",
                result: "bad_request_mismatched_id",
            });
            res.status(400).send("Identificador do corpo diverge da requisição assinada.");
            return;
        }

        // 6. Verificação do tipo de evento
        const { type } = req.body || {};
        if (type && type !== "payment") {
            logger.info(`[${stage}] Evento ignorado (tipo não processado).`, {
                stage,
                eventType: type,
                result: "ignored",
            });
            res.status(200).send("Evento ignorado.");
            return;
        }

        // Recurso bruto preservado para consulta de API e persistência
        const paymentId = queryDataId;

        logger.info(`[${stage}] Webhook autenticado recebido para processamento.`, {
            stage,
            paymentId,
            eventType: type || "payment",
        });

        try {
            const client = new MercadoPagoConfig({ accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN });
            const paymentClient = new Payment(client);

            const startMs = Date.now();
            const payment = await paymentClient.get({ id: paymentId });
            const mpLatencyMs = Date.now() - startMs;

            const paymentStatus = payment.status;
            const userId = payment.external_reference;

            logger.info(`[${stage}] Status do pagamento obtido via API MP.`, {
                stage,
                paymentId,
                paymentStatus,
                hasUserId: Boolean(userId),
                mpLatencyMs,
            });

            if (!userId) {
                logger.warn(`[${stage}] external_reference ausente — pagamento sem userId.`, {
                    stage,
                    paymentId,
                    paymentStatus,
                    result: "skipped_no_user",
                });
                res.status(200).send("Webhook recebido sem userId.");
                return;
            }

            const userRef = admin.firestore().collection("users_fallback").doc(userId);
            const paymentDocRef = userRef.collection("payments").doc(paymentId);

            const [userDoc, paymentDoc] = await Promise.all([
                userRef.get(),
                paymentDocRef.get()
            ]);

            switch (paymentStatus) {
                case 'approved': {
                    // Idempotência: pagamento já processado anteriormente
                    if (paymentDoc.exists && paymentDoc.data().status === 'approved' &&
                        userDoc.exists && userDoc.data().plan === 'pro') {
                        logger.info(`[${stage}] Idempotência aplicada — pagamento já processado.`, {
                            stage,
                            paymentId,
                            userId,
                            result: "idempotent_skip",
                        });
                        res.status(200).send("Pagamento já processado.");
                        return;
                    }

                    const batch = admin.firestore().batch();
                    const updatePayload = { plan: "pro" };

                    if (!userDoc.exists || userDoc.data().plan !== 'pro' || !userDoc.data().proSince) {
                        updatePayload.proSince = admin.firestore.FieldValue.serverTimestamp();
                    }

                    batch.set(userRef, updatePayload, { merge: true });
                    batch.set(paymentDocRef, {
                        paymentId,
                        status: 'approved',
                        transactionAmount: payment.transaction_amount || 29.99,
                        currencyId: payment.currency_id || 'BRL',
                        paymentMethodId: payment.payment_method_id || null,
                        dateApproved: payment.date_approved || new Date().toISOString(),
                        processedAt: admin.firestore.FieldValue.serverTimestamp(),
                    }, { merge: true });

                    await batch.commit();

                    logger.info(`[${stage}] Acesso Pro concedido com sucesso.`, {
                        stage,
                        paymentId,
                        userId,
                        paymentStatus,
                        result: "pro_granted",
                    });
                    break;
                }

                case 'refunded':
                case 'charged_back':
                case 'cancelled': {
                    const batch = admin.firestore().batch();
                    batch.set(userRef, {
                        plan: "free",
                        proSince: admin.firestore.FieldValue.delete(),
                        lastStatus: `payment_${paymentStatus}`,
                    }, { merge: true });

                    batch.set(paymentDocRef, {
                        paymentId,
                        status: paymentStatus,
                        processedAt: admin.firestore.FieldValue.serverTimestamp(),
                    }, { merge: true });

                    await batch.commit();

                    logger.info(`[${stage}] Acesso Pro revogado.`, {
                        stage,
                        paymentId,
                        userId,
                        paymentStatus,
                        result: "pro_revoked",
                    });
                    break;
                }

                default:
                    logger.info(`[${stage}] Status de pagamento não tratado — ignorado.`, {
                        stage,
                        paymentId,
                        userId,
                        paymentStatus,
                        result: "status_unhandled",
                    });
                    break;
            }
        } catch (error) {
            logger.error(`[${stage}] Erro crítico no processamento do webhook.`, {
                stage,
                paymentId,
                errorType: error.constructor?.name || "Error",
                errorCode: error.status || error.code || "unknown",
                result: "error",
            });
            res.status(500).send("Erro interno ao processar webhook.");
            return;
        }

        res.status(200).send("Webhook recebido.");
    }
);

// ============================================================
// FUNÇÃO 3: generateAiMonthlyBriefing
// Gera síntese financeira mensal agregada e contextualizada.
// Apenas métricas agregadas — sem PII ou dados individuais de transação.
// Secret: GEMINI_API_KEY via GCP Secret Manager.
//
// ⚠️ HARDENING & ANTI-ABUSO (Fase 6):
// 1. Feature Flag: AI_PROVIDER_ENABLED (default: false).
// 2. Rate Limiting: Cooldown de 30s e máximo de 5 gerações por hora por UID.
// 3. Concorrência: Bloqueio de chamadas simultâneas por UID.
// 4. Opt-in e Auth estritos: Validação server-side contra users_fallback.
// ============================================================
exports.generateAiMonthlyBriefing = onCall(
    {
        region: "southamerica-east1",
        maxInstances: 2,
        concurrency: 5,
        timeoutSeconds: 60,
        memory: "256MiB",
        secrets: ["GEMINI_API_KEY"],
    },
    async (request) => {
        const stage = "generateAiMonthlyBriefing";

        if (!request.auth) {
            logger.warn(`[${stage}] Tentativa não autenticada rejeitada.`, {
                stage,
                result: "unauthenticated",
            });
            throw new HttpsError("unauthenticated", "Você precisa estar logado para acessar este recurso.");
        }

        const userId = request.auth.uid;
        const userLogHash = hashUid(userId);
        const db = admin.firestore();

        // 1. Verificação de opt-in explícito no banco
        const userDoc = await db.collection("users_fallback").doc(userId).get();
        if (!userDoc.exists) {
            logger.warn(`[${stage}] Documento de usuário não encontrado.`, {
                stage,
                userHash: userLogHash,
                result: "user_not_found",
            });
            throw new HttpsError("not-found", "Perfil de usuário não encontrado.");
        }

        const userData = userDoc.data() || {};
        const isOptedIn = userData.aiPreferences && userData.aiPreferences.optIn === true;

        if (!isOptedIn) {
            logger.warn(`[${stage}] Tentativa sem opt-in rejeitada.`, {
                stage,
                userHash: userLogHash,
                result: "opt_in_missing",
            });
            throw new HttpsError(
                "permission-denied",
                "O recurso de inteligência artificial está desativado. Ative-o expressamente nas configurações para prosseguir."
            );
        }

        // 2. Proteção Anti-Abuso & Rate Limiting (Transação Atômica no Firestore)
        const rateLimitRef = db.collection("ai_rate_limits").doc(userId);
        const now = Date.now();
        const COOLDOWN_MS = 30 * 1000; // 30 segundos
        const HOURLY_LIMIT = 5; // Máximo 5 por hora
        const ONE_HOUR_MS = 60 * 60 * 1000;

        try {
            await db.runTransaction(async (transaction) => {
                const limitDoc = await transaction.get(rateLimitRef);
                const limitData = limitDoc.exists ? limitDoc.data() : { requestTimestamps: [], inFlight: false };

                // Bloqueio de concorrência ativa (< 30s)
                if (limitData.inFlight && (now - (limitData.lastRequestAt || 0)) < COOLDOWN_MS) {
                    throw new Error("CONCURRENT_REQUEST_BLOCKED");
                }

                // Cooldown individual
                if (limitData.lastRequestAt && (now - limitData.lastRequestAt) < COOLDOWN_MS) {
                    throw new Error("COOLDOWN_ACTIVE");
                }

                // Janela deslizante de 1 hora
                const recentRequests = (limitData.requestTimestamps || []).filter(t => (now - t) < ONE_HOUR_MS);
                if (recentRequests.length >= HOURLY_LIMIT) {
                    throw new Error("HOURLY_LIMIT_EXCEEDED");
                }

                // Marca requisição em voo
                transaction.set(rateLimitRef, {
                    lastRequestAt: now,
                    inFlight: true,
                    requestTimestamps: [...recentRequests, now],
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                }, { merge: true });
            });
        } catch (error) {
            if (error.message === "CONCURRENT_REQUEST_BLOCKED" || error.message === "COOLDOWN_ACTIVE") {
                logger.warn(`[${stage}] Requisição bloqueada por cooldown/concorrência.`, {
                    stage,
                    userHash: userLogHash,
                    result: "rate_limited_cooldown",
                });
                throw new HttpsError("resource-exhausted", "Aguarde alguns instantes antes de solicitar uma nova síntese de IA.");
            }
            if (error.message === "HOURLY_LIMIT_EXCEEDED") {
                logger.warn(`[${stage}] Limite horário de IA atingido.`, {
                    stage,
                    userHash: userLogHash,
                    result: "rate_limited_hourly",
                });
                throw new HttpsError("resource-exhausted", "Limite de sínteses de inteligência artificial atingido para esta hora. Tente novamente mais tarde.");
            }
            throw error;
        }

        // Função auxiliar para liberar flag inFlight
        const releaseInFlightLock = async () => {
            try {
                await rateLimitRef.set({ inFlight: false }, { merge: true });
            } catch (e) {
                // Não falha se limpeza de lock falhar
            }
        };

        // 3. Sanitização estrita do payload de entrada (apenas agregados, zero PII)
        const data = request.data || {};
        const sanitizedData = {
            competence: String(data.competence || "").slice(0, 7),
            invoiceTotal: Number(data.invoiceTotal || 0),
            invoiceDeltaPercent: Number(data.invoiceDeltaPercent || 0),
            topCategory: String(data.topCategory || "Diversos").slice(0, 30),
            topCategoryPercent: Number(data.topCategoryPercent || 0),
            repassesPendingTotal: Number(data.repassesPendingTotal || 0),
            endingPurchasesCount: Number(data.endingPurchasesCount || 0),
            nextMonthReliefAmount: Number(data.nextMonthReliefAmount || 0),
        };

        // 4. Feature Flag Backend e Fallback Determinístico
        const isAiProviderEnabled = process.env.AI_PROVIDER_ENABLED === "true";
        const apiKey = process.env.GEMINI_API_KEY;

        if (!isAiProviderEnabled || !apiKey) {
            await releaseInFlightLock();
            logger.info(`[${stage}] Feature flag desativada ou chave ausente — retornando síntese determinística.`, {
                stage,
                userHash: userLogHash,
                competence: sanitizedData.competence,
                result: "deterministic_fallback",
            });

            const deltaDesc = sanitizedData.invoiceDeltaPercent < 0
                ? `uma redução de ${Math.abs(sanitizedData.invoiceDeltaPercent)}% em relação ao mês anterior`
                : (sanitizedData.invoiceDeltaPercent > 0
                    ? `um aumento de ${sanitizedData.invoiceDeltaPercent}% em relação ao mês anterior`
                    : 'estabilidade em relação ao mês anterior');

            const reliefDesc = sanitizedData.endingPurchasesCount > 0
                ? ` Adicionalmente, ${sanitizedData.endingPurchasesCount} compras parceladas foram concluídas, promovendo um alívio estimado de R$ ${sanitizedData.nextMonthReliefAmount.toFixed(2)} no fluxo de caixa do próximo mês.`
                : '';

            return {
                text: `No fechamento da competência ${sanitizedData.competence}, suas faturas totalizaram R$ ${sanitizedData.invoiceTotal.toFixed(2)}, representando ${deltaDesc}. A principal categoria de despesa foi ${sanitizedData.topCategory}, concentrando ${sanitizedData.topCategoryPercent}% dos seus lançamentos.${reliefDesc}`,
                model: "deterministic-engine-v1",
                optInVerified: true,
            };
        }

        // 5. Prompt rígido e chamada segura ao Gemini
        const promptText = `
Você é o assistente executivo do FinControl, um sistema financeiro premium.
Redija um resumo mensal curto (2 a 3 parágrafos), objetivo, elegante e neutro em português do Brasil.

FATOS DETERMINÍSTICOS DA COMPETÊNCIA (${sanitizedData.competence}):
- Total das faturas deste mês: R$ ${sanitizedData.invoiceTotal.toFixed(2)}
- Variação em relação ao mês anterior: ${sanitizedData.invoiceDeltaPercent > 0 ? '+' : ''}${sanitizedData.invoiceDeltaPercent}%
- Categoria de maior peso: ${sanitizedData.topCategory} (${sanitizedData.topCategoryPercent}% do total gasto)
- Total de repasses pendentes de terceiros neste mês: R$ ${sanitizedData.repassesPendingTotal.toFixed(2)}
- Compras finalizadas neste mês: ${sanitizedData.endingPurchasesCount} compras (alívio de R$ ${sanitizedData.nextMonthReliefAmount.toFixed(2)} no fluxo do próximo mês)

DIRETRIZES RÍGIDAS DE CONDUTA:
1. Utilize EXATAMENTE os valores monetários e percentuais informados acima. NÃO altere, NÃO invente e NÃO recalcule nenhum número.
2. Seja puramente descritivo e neutro.
3. NUNCA ofereça aconselhamento de investimento, recomendações de compra ou juízos morais sobre os gastos.
`;

        logger.info(`[${stage}] Invocando Gemini API com proteção de taxa.`, {
            stage,
            userHash: userLogHash,
            competence: sanitizedData.competence,
            model: "gemini-1.5-flash",
        });

        try {
            const startMs = Date.now();
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: promptText }] }],
                        generationConfig: {
                            temperature: 0.2,
                            maxOutputTokens: 300,
                        },
                    }),
                }
            );
            const latencyMs = Date.now() - startMs;

            if (!response.ok) {
                logger.error(`[${stage}] Gemini API retornou erro HTTP.`, {
                    stage,
                    userHash: userLogHash,
                    httpStatus: response.status,
                    latencyMs,
                    result: "gemini_http_error",
                });
                throw new Error(`Gemini API HTTP ${response.status}`);
            }

            const resJson = await response.json();
            const generatedText = resJson.candidates?.[0]?.content?.parts?.[0]?.text || "";

            await releaseInFlightLock();

            logger.info(`[${stage}] Síntese gerada com sucesso via Gemini.`, {
                stage,
                userHash: userLogHash,
                competence: sanitizedData.competence,
                latencyMs,
                outputLength: generatedText.length,
                result: "success",
            });

            return {
                text: generatedText.trim(),
                model: "gemini-1.5-flash",
                optInVerified: true,
            };
        } catch (error) {
            await releaseInFlightLock();
            logger.error(`[${stage}] Falha ao invocar Gemini.`, {
                stage,
                userHash: userLogHash,
                errorType: error.constructor?.name || "Error",
                result: "gemini_invoke_error",
            });
            throw new HttpsError("internal", "Não foi possível gerar a síntese de IA no momento. Tente novamente mais tarde.");
        }
    }
);

// ============================================================
// FUNÇÃO 4: deleteUserAccount
// Exclusão completa, atômica e irreversível da conta de usuário (LGPD/GDPR).
// Exclui subcoleções financeiras, documento raiz e Auth record.
// ============================================================
exports.deleteUserAccount = onCall(
    {
        region: "southamerica-east1",
        maxInstances: 2,
        concurrency: 2,
        timeoutSeconds: 60,
        memory: "256MiB",
    },
    async (request) => {
        const stage = "deleteUserAccount";

        if (!request.auth) {
            logger.warn(`[${stage}] Tentativa não autenticada rejeitada.`, {
                stage,
                result: "unauthenticated",
            });
            throw new HttpsError("unauthenticated", "Você precisa estar autenticado para excluir sua conta.");
        }

        const userId = request.auth.uid;
        const userLogHash = hashUid(userId);
        const db = admin.firestore();

        logger.info(`[${stage}] Iniciando exclusão completa da conta do usuário.`, {
            stage,
            userHash: userLogHash,
        });

        try {
            // 1. Excluir documentos em TODAS as subcoleções conhecidas sob users_fallback/{userId}
            const subcollections = [
                "cards",
                "loans",
                "expenses",
                "incomes",
                "subscriptions",
                "paidSubscriptions",
                "clients",
                "payments",
                "audit_logs",
            ];

            for (const subcol of subcollections) {
                const subcolRef = db.collection("users_fallback").doc(userId).collection(subcol);
                let hasMore = true;
                while (hasMore) {
                    const snapshot = await subcolRef.limit(500).get();
                    if (snapshot.empty || !snapshot.docs || snapshot.docs.length === 0) {
                        hasMore = false;
                        break;
                    }
                    const batch = db.batch();
                    snapshot.docs.forEach((docSnap) => batch.delete(docSnap.ref));
                    await batch.commit();
                    if (snapshot.docs.length < 500) {
                        hasMore = false;
                    }
                }
            }

            // 2. Excluir dados de rate limiting e preferências
            await db.collection("ai_rate_limits").doc(userId).delete().catch(() => {});
            await db.collection("api_rate_limits").doc(`${userId}_createMercadoPagoPreference`).delete().catch(() => {});

            // 3. Excluir documento principal de perfil
            await db.collection("users_fallback").doc(userId).delete();

            // 4. Excluir usuário no Firebase Authentication
            await admin.auth().deleteUser(userId);

            logger.info(`[${stage}] Conta excluída com sucesso em todos os armazenamentos.`, {
                stage,
                userHash: userLogHash,
                result: "success",
            });

            return {
                success: true,
                message: "Conta e dados excluídos com sucesso.",
                timestamp: new Date().toISOString(),
            };
        } catch (error) {
            logger.error(`[${stage}] Erro ao excluir conta de usuário.`, {
                stage,
                userHash: userLogHash,
                errorDetails: error.message,
                result: "error",
            });
            throw new HttpsError("internal", `Falha ao processar exclusão de conta: ${error.message}`);
        }
    }
);

// In-memory sliding window rate limit para telemetria frontend (máx 10 por minuto por IP/UID)
const clientErrorReportLimits = new Map();

function isClientErrorReportAllowed(identifier) {
    const now = Date.now();
    const windowMs = 60 * 1000;
    const maxPerMin = 10;

    let timestamps = clientErrorReportLimits.get(identifier) || [];
    timestamps = timestamps.filter(t => (now - t) < windowMs);

    if (timestamps.length >= maxPerMin) {
        return false;
    }

    timestamps.push(now);
    clientErrorReportLimits.set(identifier, timestamps);
    return true;
}

// ============================================================
// FUNÇÃO 5: reportClientError
// Observabilidade Frontend: Recebe relatórios sanitizados de erros do cliente.
// Rate-limited no backend para evitar flooding de logs. Whitelist estrita.
// ============================================================
exports.reportClientError = onCall(
    {
        region: "southamerica-east1",
        maxInstances: 2,
        concurrency: 20,
        timeoutSeconds: 30,
        memory: "256MiB",
    },
    async (request) => {
        const stage = "reportClientError";
        const clientIp = request.rawRequest?.ip || "anonymous_ip";
        const identifier = request.auth ? request.auth.uid : clientIp;

        // Rate Limit Backend-Side
        if (!isClientErrorReportAllowed(identifier)) {
            return { received: false, throttled: true };
        }

        const data = request.data || {};

        // Whitelist estrita de campos
        const rawErrorType = String(data.errorType || data.errorName || "ClientError").slice(0, 50);
        const rawComponent = String(data.component || "UnknownComponent").slice(0, 50);
        const rawRoute = String(data.route || data.url || "/").slice(0, 100);
        const rawCorrelationId = String(data.correlationId || "").slice(0, 36);
        const rawErrorMessage = String(data.errorMessage || "").slice(0, 300);

        const userLogHash = request.auth ? hashUid(request.auth.uid) : "anonymous";

        // Sanitização estrita contra vazamento acidental de tokens/PII
        const sanitizedErrorType = sanitizeErrorMessage(rawErrorType);
        const sanitizedComponent = sanitizeErrorMessage(rawComponent);
        const sanitizedMessage = sanitizeErrorMessage(rawErrorMessage);
        const sanitizedRoute = rawRoute.replace(/[0-9a-fA-F-]{20,}/g, ":id");

        logger.error(`[ClientError] ${sanitizedErrorType} @ ${sanitizedComponent}: ${sanitizedMessage}`, {
            stage,
            event: "FRONTEND_ERROR_REPORTED",
            errorType: sanitizedErrorType,
            component: sanitizedComponent,
            route: sanitizedRoute,
            correlationId: rawCorrelationId || undefined,
            userHash: userLogHash,
            timestamp: new Date().toISOString(),
        });

        return { received: true };
    }
);

// Exportações auxiliares para testes unitários e validação de segurança
exports.hashUid = hashUid;
exports.sanitizeErrorMessage = sanitizeErrorMessage;
exports.reserveApiActionAttempt = reserveApiActionAttempt;
exports.releaseApiActionInFlight = releaseApiActionInFlight;
exports.extractWebhookQueryDataId = extractWebhookQueryDataId;
exports.parseXSignature = parseXSignature;
exports.validateMercadoPagoWebhookSignature = validateMercadoPagoWebhookSignature;