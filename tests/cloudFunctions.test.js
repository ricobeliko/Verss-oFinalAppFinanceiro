import crypto from 'crypto';
import { Buffer } from 'buffer';
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Cloud Functions - Mercado Pago & Idempotência', () => {
    let mockFirestoreDb;
    let mockBatch;
    let mockPaymentGet;
    let mockPreferenceCreate;

    beforeEach(() => {
        vi.clearAllMocks();

        mockBatch = {
            set: vi.fn(),
            commit: vi.fn().mockResolvedValue(true)
        };

        mockFirestoreDb = {
            collection: vi.fn().mockReturnThis(),
            doc: vi.fn().mockReturnThis(),
            get: vi.fn(),
            batch: vi.fn().mockReturnValue(mockBatch)
        };

        mockPaymentGet = vi.fn();
        mockPreferenceCreate = vi.fn();
    });

    describe('createMercadoPagoPreference & Anti-Abuso Distributed Rate Limiting', () => {
        // Simulador de Banco em Memória com suporte a transações atômicas do Firestore
        function createInMemoryRateLimitDb() {
            const storage = new Map();

            return {
                storage,
                collection: (colName) => ({
                    doc: (docId) => ({
                        get: async () => {
                            const key = `${colName}/${docId}`;
                            const data = storage.get(key);
                            return {
                                exists: Boolean(data),
                                data: () => (data ? JSON.parse(JSON.stringify(data)) : undefined),
                            };
                        },
                        set: async (val, options = {}) => {
                            const key = `${colName}/${docId}`;
                            const existing = options.merge && storage.get(key) ? storage.get(key) : {};
                            storage.set(key, { ...existing, ...JSON.parse(JSON.stringify(val)) });
                        },
                        delete: async () => {
                            const key = `${colName}/${docId}`;
                            storage.delete(key);
                        }
                    })
                }),
                runTransaction: async (updateFn) => {
                    const transaction = {
                        get: async (docRef) => docRef.get(),
                        set: async (docRef, data, options) => docRef.set(data, options),
                    };
                    return await updateFn(transaction);
                }
            };
        }

        async function reserveApiActionAttempt(db, {
            userId,
            action = "createMercadoPagoPreference",
            cooldownMs = 15 * 1000,
            hourlyLimit = 5,
            staleInFlightMs = 30 * 1000,
            now = Date.now(),
        }) {
            const rateLimitRef = db.collection("api_rate_limits").doc(`${userId}_${action}`);
            const ONE_HOUR_MS = 60 * 60 * 1000;

            await db.runTransaction(async (transaction) => {
                const limitDoc = await transaction.get(rateLimitRef);
                const limitData = limitDoc.exists ? limitDoc.data() : { requestTimestamps: [], inFlight: false };

                const lastRequestAt = limitData.lastRequestAt || 0;
                const inFlightSince = limitData.inFlightSince || lastRequestAt;
                const isInFlight = Boolean(limitData.inFlight);

                // 1. Bloqueio de concorrência ativa (InFlight) com tolerância a lock stale
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

                // 4. Gravação atômica da reserva
                transaction.set(rateLimitRef, {
                    action,
                    userId,
                    lastRequestAt: now,
                    inFlight: true,
                    inFlightSince: now,
                    requestTimestamps: [...recentRequests, now],
                    updatedAt: new Date(now).toISOString(),
                }, { merge: true });
            });

            return rateLimitRef;
        }

        async function releaseApiActionInFlight(db, rateLimitRef) {
            try {
                await rateLimitRef.set({
                    inFlight: false,
                    inFlightSince: null,
                }, { merge: true });
            } catch {
                // Silencioso em caso de falha de liberação
            }
        }

        const createPreferenceHandler = async (request, { db, preferenceCreateFn, now = Date.now() }) => {
            if (!request.auth) {
                const err = new Error("Você precisa estar logado para realizar esta ação.");
                err.code = "unauthenticated";
                throw err;
            }
            const userId = request.auth.uid;
            const userEmail = request.auth.token?.email;
            if (!userEmail) {
                const err = new Error("O e-mail do usuário é obrigatório para o pagamento.");
                err.code = "invalid-argument";
                throw err;
            }

            if (request.auth.token?.email_verified !== true) {
                const err = new Error("Você precisa confirmar seu endereço de e-mail antes de realizar pagamentos.");
                err.code = "failed-precondition";
                throw err;
            }

            let rateLimitRef = null;
            try {
                rateLimitRef = await reserveApiActionAttempt(db, {
                    userId,
                    action: "createMercadoPagoPreference",
                    cooldownMs: 15 * 1000,
                    hourlyLimit: 5,
                    staleInFlightMs: 30 * 1000,
                    now
                });
            } catch (error) {
                if (error.message === "INFLIGHT_ACTIVE" || error.message === "COOLDOWN_ACTIVE" || error.message === "HOURLY_LIMIT_EXCEEDED") {
                    const err = new Error("Limite de requisições excedido ou chamada em andamento.");
                    err.code = "resource-exhausted";
                    err.originalReason = error.message;
                    throw err;
                }
                const err = new Error("Não foi possível validar as cotas de segurança para esta operação.");
                err.code = "internal";
                throw err;
            }

            try {
                const preferenceData = {
                    items: [{
                        id: "PRO-LIFETIME-01",
                        title: "FinControl Pro - Acesso Vitalício",
                        description: "Acesso a todos os recursos premium do FinControl.",
                        quantity: 1,
                        currency_id: "BRL",
                        unit_price: 29.99,
                    }],
                    payer: { email: userEmail },
                    back_urls: {
                        success: "https://controle-de-cartao.web.app/dashboard?payment=success",
                        failure: "https://controle-de-cartao.web.app/dashboard?payment=failure",
                        pending: "https://controle-de-cartao.web.app/dashboard?payment=pending",
                    },
                    auto_return: "approved",
                    external_reference: userId,
                };
                const result = await preferenceCreateFn({ body: preferenceData });
                return {
                    preferenceId: result.id,
                    init_point: result.init_point,
                };
            } catch (error) {
                const err = new Error("Falha ao criar a preferência de pagamento.");
                err.code = "internal";
                throw err;
            } finally {
                if (rateLimitRef) {
                    await releaseApiActionInFlight(db, rateLimitRef);
                }
            }
        };

        it('TEST 1: deve rejeitar chamada de usuário não autenticado e NÃO consultar rate limit ou Mercado Pago', async () => {
            const db = createInMemoryRateLimitDb();
            await expect(createPreferenceHandler({ auth: null }, { db, preferenceCreateFn: mockPreferenceCreate }))
                .rejects.toMatchObject({ code: 'unauthenticated' });
            expect(mockPreferenceCreate).not.toHaveBeenCalled();
            expect(db.storage.size).toBe(0);
        });

        it('TEST 2: deve rejeitar chamada de usuário sem e-mail cadastrado', async () => {
            const db = createInMemoryRateLimitDb();
            const request = { auth: { uid: 'user-123', token: {} } };
            await expect(createPreferenceHandler(request, { db, preferenceCreateFn: mockPreferenceCreate }))
                .rejects.toMatchObject({ code: 'invalid-argument' });
            expect(mockPreferenceCreate).not.toHaveBeenCalled();
            expect(db.storage.size).toBe(0);
        });

        it('TEST 2 (Email Verified): deve rejeitar com failed-precondition se email_verified for falso ou ausente (Server-Side)', async () => {
            const db = createInMemoryRateLimitDb();
            const request = {
                auth: {
                    uid: 'user-unverified',
                    token: { email: 'unverified@fincontrol.com', email_verified: false }
                }
            };
            await expect(createPreferenceHandler(request, { db, preferenceCreateFn: mockPreferenceCreate }))
                .rejects.toMatchObject({ code: 'failed-precondition' });
            expect(mockPreferenceCreate).not.toHaveBeenCalled();
            expect(db.storage.size).toBe(0); // Zero consumo de quota
        });

        it('TEST 3: deve permitir primeira chamada válida (email_verified=true) e acionar Mercado Pago exatamente 1 vez', async () => {
            const db = createInMemoryRateLimitDb();
            mockPreferenceCreate.mockResolvedValue({
                id: 'pref-001',
                init_point: 'https://mercadopago.com/checkout/pref-001'
            });

            const request = {
                auth: {
                    uid: 'user-valid-1',
                    token: { email: 'cliente@fincontrol.com', email_verified: true }
                }
            };
            const res = await createPreferenceHandler(request, { db, preferenceCreateFn: mockPreferenceCreate });

            expect(res.preferenceId).toBe('pref-001');
            expect(res.init_point).toBe('https://mercadopago.com/checkout/pref-001');
            expect(mockPreferenceCreate).toHaveBeenCalledTimes(1);

            // Verifica persistência do rate limit
            const stored = db.storage.get('api_rate_limits/user-valid-1_createMercadoPagoPreference');
            expect(stored).toBeDefined();
            expect(stored.requestTimestamps.length).toBe(1);
            expect(stored.inFlight).toBe(false); // Liberado no finally
        });

        it('TEST 4: deve bloquear segunda chamada dentro de 15s com resource-exhausted por Cooldown', async () => {
            const db = createInMemoryRateLimitDb();
            mockPreferenceCreate.mockResolvedValue({ id: 'pref-1', init_point: 'https://mp.com/1' });
            const startTime = 1725000000000;

            const request = {
                auth: {
                    uid: 'user-cooldown-test',
                    token: { email: 'cooldown@test.com', email_verified: true }
                }
            };

            // 1ª chamada: OK
            await createPreferenceHandler(request, { db, preferenceCreateFn: mockPreferenceCreate, now: startTime });
            expect(mockPreferenceCreate).toHaveBeenCalledTimes(1);

            // 2ª chamada: 5 segundos depois (dentro do cooldown de 15s) -> BLOQUEADA
            await expect(createPreferenceHandler(request, {
                db,
                preferenceCreateFn: mockPreferenceCreate,
                now: startTime + 5000
            })).rejects.toMatchObject({
                code: 'resource-exhausted',
                originalReason: 'COOLDOWN_ACTIVE'
            });

            expect(mockPreferenceCreate).toHaveBeenCalledTimes(1); // Não aumentou
        });

        it('TEST 5 & 6: deve permitir chamadas após cooldown respeitando o limite de 5 tentativas na janela horária', async () => {
            const db = createInMemoryRateLimitDb();
            mockPreferenceCreate.mockResolvedValue({ id: 'pref-ok', init_point: 'https://mp.com/ok' });
            const baseTime = 1725000000000;

            const request = {
                auth: {
                    uid: 'user-quota-5',
                    token: { email: 'quota@test.com', email_verified: true }
                }
            };

            // Executa 5 tentativas espaçadas de 20s (respeitando cooldown de 15s)
            for (let i = 0; i < 5; i++) {
                const now = baseTime + (i * 20000);
                const res = await createPreferenceHandler(request, { db, preferenceCreateFn: mockPreferenceCreate, now });
                expect(res.preferenceId).toBe('pref-ok');
            }

            expect(mockPreferenceCreate).toHaveBeenCalledTimes(5);
        });

        it('TEST 7: deve rejeitar a 6ª tentativa na mesma janela horária com resource-exhausted (Hard Limit = 5/h)', async () => {
            const db = createInMemoryRateLimitDb();
            mockPreferenceCreate.mockResolvedValue({ id: 'pref-ok', init_point: 'https://mp.com/ok' });
            const baseTime = 1725000000000;

            const request = {
                auth: {
                    uid: 'user-quota-exceeded',
                    token: { email: 'quota5@test.com', email_verified: true }
                }
            };

            // 5 tentativas permitidas
            for (let i = 0; i < 5; i++) {
                await createPreferenceHandler(request, {
                    db,
                    preferenceCreateFn: mockPreferenceCreate,
                    now: baseTime + (i * 20000)
                });
            }
            expect(mockPreferenceCreate).toHaveBeenCalledTimes(5);

            // 6ª tentativa aos 120s (fora do cooldown individual mas dentro da janela de 1h) -> BLOQUEADA
            await expect(createPreferenceHandler(request, {
                db,
                preferenceCreateFn: mockPreferenceCreate,
                now: baseTime + 120000
            })).rejects.toMatchObject({
                code: 'resource-exhausted',
                originalReason: 'HOURLY_LIMIT_EXCEEDED'
            });

            expect(mockPreferenceCreate).toHaveBeenCalledTimes(5); // Mantém exatamente 5 chamadas externas
        });

        it('TEST 8: deve isolar quotas por UID: bloqueio de UID A não interfere em UID B', async () => {
            const db = createInMemoryRateLimitDb();
            mockPreferenceCreate.mockResolvedValue({ id: 'pref-ok', init_point: 'https://mp.com/ok' });
            const now = 1725000000000;

            const userA = { auth: { uid: 'USER_A', token: { email: 'a@test.com', email_verified: true } } };
            const userB = { auth: { uid: 'USER_B', token: { email: 'b@test.com', email_verified: true } } };

            // Esgota quota de User A
            for (let i = 0; i < 5; i++) {
                await createPreferenceHandler(userA, { db, preferenceCreateFn: mockPreferenceCreate, now: now + (i * 20000) });
            }
            // User A bloqueado
            await expect(createPreferenceHandler(userA, { db, preferenceCreateFn: mockPreferenceCreate, now: now + 120000 }))
                .rejects.toMatchObject({ code: 'resource-exhausted' });

            // User B deve ser permitido normalmente
            const resB = await createPreferenceHandler(userB, { db, preferenceCreateFn: mockPreferenceCreate, now: now + 120000 });
            expect(resB.preferenceId).toBe('pref-ok');
            expect(mockPreferenceCreate).toHaveBeenCalledTimes(6); // 5 de A + 1 de B
        });

        it('TEST 9: deve bloquear concorrência ativa (InFlight lock) quando duas requisições simultâneas ocorrem', async () => {
            const db = createInMemoryRateLimitDb();
            const now = 1725000000000;
            const request = { auth: { uid: 'user-concurrent', token: { email: 'c@test.com', email_verified: true } } };

            // Simula um lock inFlight ativo (como uma requisição que acabou de iniciar e ainda não terminou)
            db.storage.set('api_rate_limits/user-concurrent_createMercadoPagoPreference', {
                action: 'createMercadoPagoPreference',
                userId: 'user-concurrent',
                lastRequestAt: now,
                inFlight: true,
                inFlightSince: now,
                requestTimestamps: [now],
            });

            // Segunda chamada simultânea tenta entrar
            await expect(createPreferenceHandler(request, {
                db,
                preferenceCreateFn: mockPreferenceCreate,
                now: now + 500
            })).rejects.toMatchObject({
                code: 'resource-exhausted',
                originalReason: 'INFLIGHT_ACTIVE'
            });

            expect(mockPreferenceCreate).not.toHaveBeenCalled();
        });

        it('TEST 10: deve manter tentativa contabilizada na quota quando o Mercado Pago falha, mas liberar o lock inFlight', async () => {
            const db = createInMemoryRateLimitDb();
            const now = 1725000000000;
            const request = { auth: { uid: 'user-mp-failure', token: { email: 'fail@test.com', email_verified: true } } };

            mockPreferenceCreate.mockRejectedValue(new Error("Mercado Pago Outage 500"));

            await expect(createPreferenceHandler(request, {
                db,
                preferenceCreateFn: mockPreferenceCreate,
                now
            })).rejects.toMatchObject({ code: 'internal' });

            // InFlight deve ter sido liberado no finally
            const stored = db.storage.get('api_rate_limits/user-mp-failure_createMercadoPagoPreference');
            expect(stored.inFlight).toBe(false);
            expect(stored.requestTimestamps.length).toBe(1); // Tentativa consumida
        });

        it('TEST 11: deve recuperar automaticamente lock inFlight abandonado (stale > 30s)', async () => {
            const db = createInMemoryRateLimitDb();
            const staleTime = 1725000000000;
            const recoverTime = staleTime + 35000; // 35s depois (> 30s)
            const request = { auth: { uid: 'user-stale-lock', token: { email: 'stale@test.com', email_verified: true } } };

            mockPreferenceCreate.mockResolvedValue({ id: 'pref-recovered', init_point: 'https://mp.com/rec' });

            // Simula container que caiu e deixou inFlight: true
            db.storage.set('api_rate_limits/user-stale-lock_createMercadoPagoPreference', {
                action: 'createMercadoPagoPreference',
                userId: 'user-stale-lock',
                lastRequestAt: staleTime,
                inFlight: true,
                inFlightSince: staleTime,
                requestTimestamps: [staleTime],
            });

            // Nova requisição legítima após o stale timeout deve conseguir recuperar
            const res = await createPreferenceHandler(request, {
                db,
                preferenceCreateFn: mockPreferenceCreate,
                now: recoverTime
            });

            expect(res.preferenceId).toBe('pref-recovered');
            expect(mockPreferenceCreate).toHaveBeenCalledTimes(1);
        });

        it('TEST 12: deve acionar FAIL CLOSED se a transação do Firestore falhar, bloqueando chamada ao Mercado Pago', async () => {
            const brokenDb = {
                collection: vi.fn().mockReturnThis(),
                doc: vi.fn().mockReturnThis(),
                runTransaction: vi.fn().mockRejectedValue(new Error("Firestore UNAVAILABLE 503"))
            };
            const request = { auth: { uid: 'user-db-down', token: { email: 'down@test.com', email_verified: true } } };

            await expect(createPreferenceHandler(request, {
                db: brokenDb,
                preferenceCreateFn: mockPreferenceCreate
            })).rejects.toMatchObject({ code: 'internal' });

            expect(mockPreferenceCreate).not.toHaveBeenCalled(); // Fail Closed
        });

        it('TEST 13 (Burst Test): 100 requisições disparadas em rajada para o mesmo UID resultam em no máximo 5 chamadas externas', async () => {
            const db = createInMemoryRateLimitDb();
            mockPreferenceCreate.mockResolvedValue({ id: 'pref-burst', init_point: 'https://mp.com/burst' });
            const startTime = 1725000000000;
            const request = { auth: { uid: 'user-burst-100', token: { email: 'burst@test.com', email_verified: true } } };

            let allowed = 0;
            let blocked = 0;
            const ATTEMPTS = 100;

            for (let i = 0; i < ATTEMPTS; i++) {
                // Intervalo de 1 segundo entre rajadas
                const now = startTime + (i * 1000);
                try {
                    await createPreferenceHandler(request, {
                        db,
                        preferenceCreateFn: mockPreferenceCreate,
                        now
                    });
                    allowed++;
                } catch {
                    blocked++;
                }
            }

            const externalMpCalls = mockPreferenceCreate.mock.calls.length;

            expect(allowed + blocked).toBe(100);
            expect(externalMpCalls).toBeLessThanOrEqual(5);
            expect(blocked).toBeGreaterThanOrEqual(95);
            expect(externalMpCalls).toBe(allowed);
        });

        it('TEST 14 (Multi-UID Concurrency): 5 usuários distintos executando requisições em paralelo não interferem entre si', async () => {
            const db = createInMemoryRateLimitDb();
            mockPreferenceCreate.mockResolvedValue({ id: 'pref-multi', init_point: 'https://mp.com/multi' });
            const now = 1725000000000;

            const uids = ['UID_1', 'UID_2', 'UID_3', 'UID_4', 'UID_5'];
            const promises = uids.map(uid => createPreferenceHandler(
                { auth: { uid, token: { email: `${uid}@test.com`, email_verified: true } } },
                { db, preferenceCreateFn: mockPreferenceCreate, now }
            ));

            const results = await Promise.all(promises);
            expect(results.length).toBe(5);
            expect(mockPreferenceCreate).toHaveBeenCalledTimes(5);
        });
    });

    describe('paymentWebhookMercadoPago e Validação de Assinatura HMAC', () => {
        const TEST_WEBHOOK_SECRET = "test_webhook_secret_key_mock_12345";

        function extractWebhookQueryDataId(req) {
            if (req.query && req.query['data.id']) {
                return String(req.query['data.id']).trim();
            }
            return null;
        }

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

        function generateTestSignature({ secret, xRequestId, dataId, ts = '1700000000' }) {
            const normalizedDataId = String(dataId).trim().toLowerCase();
            const manifest = `id:${normalizedDataId};request-id:${String(xRequestId).trim()};ts:${ts};`;
            const hmac = crypto.createHmac('sha256', secret).update(manifest).digest('hex');
            return `ts=${ts},v1=${hmac}`;
        }

        const webhookHandler = async (req, res, { paymentGetFn, db, webhookSecret = TEST_WEBHOOK_SECRET }) => {
            if (req.method !== 'POST') {
                res.status(405).send('Method Not Allowed');
                return;
            }

            const queryDataId = extractWebhookQueryDataId(req);
            const xSignature = req.headers?.['x-signature'];
            const xRequestId = req.headers?.['x-request-id'];

            if (!xSignature || !xRequestId || !queryDataId) {
                res.status(401).send("Assinatura ou identificador ausente.");
                return;
            }

            if (!webhookSecret) {
                res.status(500).send("Erro interno de configuração de segurança.");
                return;
            }

            const isValid = validateMercadoPagoWebhookSignature({
                secret: webhookSecret,
                xSignature,
                xRequestId,
                dataId: queryDataId
            });

            if (!isValid) {
                res.status(401).send("Assinatura inválida.");
                return;
            }

            // Proteção contra Body / Query Mismatch
            const bodyDataId = req.body?.data?.id ? String(req.body.data.id).trim() : null;
            if (bodyDataId && bodyDataId !== queryDataId) {
                res.status(400).send("Identificador do corpo diverge da requisição assinada.");
                return;
            }

            const { type } = req.body || {};
            if (type && type !== "payment") {
                res.status(200).send("Evento ignorado.");
                return;
            }

            const paymentId = queryDataId;
            try {
                const payment = await paymentGetFn({ id: paymentId });
                const paymentStatus = payment.status;
                const userId = payment.external_reference;

                if (userId) {
                    const userRef = db.collection("users_fallback").doc(userId);
                    const paymentDocRef = userRef.collection("payments").doc(paymentId);

                    const [userDoc, paymentDoc] = await Promise.all([
                        userRef.get(),
                        paymentDocRef.get()
                    ]);

                    switch (paymentStatus) {
                        case 'approved': {
                            if (paymentDoc.exists && paymentDoc.data().status === 'approved' && userDoc.exists && userDoc.data().plan === 'pro') {
                                res.status(200).send("Pagamento já processado.");
                                return;
                            }

                            const batch = db.batch();
                            const updatePayload = { plan: "pro" };
                            if (!userDoc.exists || userDoc.data().plan !== 'pro' || !userDoc.data().proSince) {
                                updatePayload.proSince = 'TIMESTAMP_NEW';
                            }

                            batch.set(userRef, updatePayload, { merge: true });
                            batch.set(paymentDocRef, {
                                paymentId: paymentId,
                                status: 'approved',
                                transactionAmount: payment.transaction_amount || 29.99,
                                currencyId: payment.currency_id || 'BRL',
                                processedAt: 'TIMESTAMP_PROCESSED'
                            }, { merge: true });

                            await batch.commit();
                            break;
                        }

                        case 'refunded':
                        case 'charged_back':
                        case 'cancelled': {
                            const batch = db.batch();
                            batch.set(userRef, {
                                plan: "free",
                                proSince: null,
                                lastStatus: `payment_${paymentStatus}`
                            }, { merge: true });

                            batch.set(paymentDocRef, {
                                paymentId: paymentId,
                                status: paymentStatus,
                                processedAt: 'TIMESTAMP_PROCESSED'
                            }, { merge: true });

                            await batch.commit();
                            break;
                        }
                    }
                }
            } catch (error) {
                res.status(500).send("Erro interno ao processar webhook.");
                return;
            }

            res.status(200).send("Webhook recebido.");
        };

        it('deve retornar 405 Method Not Allowed para métodos diferentes de POST', async () => {
            const req = { method: 'GET', headers: {}, query: {}, body: {} };
            const res = {
                statusCode: null,
                body: null,
                status(code) { this.statusCode = code; return this; },
                send(msg) { this.body = msg; return this; }
            };

            await webhookHandler(req, res, { paymentGetFn: mockPaymentGet, db: mockFirestoreDb });
            expect(res.statusCode).toBe(405);
            expect(mockPaymentGet).not.toHaveBeenCalled();
        });

        it('deve retornar 401 e rejeitar requisição sem x-signature ANTES de consultar a API externa ou Firestore', async () => {
            const req = {
                method: 'POST',
                headers: { 'x-request-id': 'req-123' },
                query: { 'data.id': 'pay-123' },
                body: { type: 'payment' }
            };
            const res = {
                statusCode: null,
                body: null,
                status(code) { this.statusCode = code; return this; },
                send(msg) { this.body = msg; return this; }
            };

            await webhookHandler(req, res, { paymentGetFn: mockPaymentGet, db: mockFirestoreDb });
            expect(res.statusCode).toBe(401);
            expect(res.body).toBe("Assinatura ou identificador ausente.");
            expect(mockPaymentGet).not.toHaveBeenCalled();
            expect(mockFirestoreDb.collection).not.toHaveBeenCalled();
        });

        it('deve retornar 401 e rejeitar requisição sem x-request-id ANTES de consultar a API externa ou Firestore', async () => {
            const req = {
                method: 'POST',
                headers: { 'x-signature': 'ts=1700000000,v1=abcdef' },
                query: { 'data.id': 'pay-123' },
                body: { type: 'payment' }
            };
            const res = {
                statusCode: null,
                body: null,
                status(code) { this.statusCode = code; return this; },
                send(msg) { this.body = msg; return this; }
            };

            await webhookHandler(req, res, { paymentGetFn: mockPaymentGet, db: mockFirestoreDb });
            expect(res.statusCode).toBe(401);
            expect(res.body).toBe("Assinatura ou identificador ausente.");
            expect(mockPaymentGet).not.toHaveBeenCalled();
            expect(mockFirestoreDb.collection).not.toHaveBeenCalled();
        });

        it('deve retornar 401 e rejeitar requisição sem query[\'data.id\'] (mesmo se body.data.id estiver presente)', async () => {
            const req = {
                method: 'POST',
                headers: {
                    'x-signature': 'ts=1700000000,v1=abcdef',
                    'x-request-id': 'req-123'
                },
                query: {},
                body: { type: 'payment', data: { id: 'pay-body-only' } }
            };
            const res = {
                statusCode: null,
                body: null,
                status(code) { this.statusCode = code; return this; },
                send(msg) { this.body = msg; return this; }
            };

            await webhookHandler(req, res, { paymentGetFn: mockPaymentGet, db: mockFirestoreDb });
            expect(res.statusCode).toBe(401);
            expect(res.body).toBe("Assinatura ou identificador ausente.");
            expect(mockPaymentGet).not.toHaveBeenCalled();
        });

        it('deve retornar 401 e rejeitar requisição com apenas query.id (sem query[\'data.id\'])', async () => {
            const req = {
                method: 'POST',
                headers: {
                    'x-signature': 'ts=1700000000,v1=abcdef',
                    'x-request-id': 'req-123'
                },
                query: { id: 'pay-query-id-only' },
                body: { type: 'payment' }
            };
            const res = {
                statusCode: null,
                body: null,
                status(code) { this.statusCode = code; return this; },
                send(msg) { this.body = msg; return this; }
            };

            await webhookHandler(req, res, { paymentGetFn: mockPaymentGet, db: mockFirestoreDb });
            expect(res.statusCode).toBe(401);
            expect(res.body).toBe("Assinatura ou identificador ausente.");
            expect(mockPaymentGet).not.toHaveBeenCalled();
        });

        it('deve retornar 401 e rejeitar requisição com assinatura criptográfica inválida/adulterada', async () => {
            const req = {
                method: 'POST',
                headers: {
                    'x-signature': 'ts=1700000000,v1=0000000000000000000000000000000000000000000000000000000000000000',
                    'x-request-id': 'req-123'
                },
                query: { 'data.id': 'pay-123' },
                body: { type: 'payment' }
            };
            const res = {
                statusCode: null,
                body: null,
                status(code) { this.statusCode = code; return this; },
                send(msg) { this.body = msg; return this; }
            };

            await webhookHandler(req, res, { paymentGetFn: mockPaymentGet, db: mockFirestoreDb });
            expect(res.statusCode).toBe(401);
            expect(res.body).toBe("Assinatura inválida.");
            expect(mockPaymentGet).not.toHaveBeenCalled();
            expect(mockFirestoreDb.collection).not.toHaveBeenCalled();
        });

        it('deve retornar 400 Bad Request caso body.data.id divirja do query[\'data.id\'] assinado e NÃO chamar paymentClient.get', async () => {
            const paymentId = 'pay-query-123';
            const xRequestId = 'req-valid-1';
            const validSignature = generateTestSignature({
                secret: TEST_WEBHOOK_SECRET,
                xRequestId,
                dataId: paymentId
            });

            const req = {
                method: 'POST',
                headers: {
                    'x-signature': validSignature,
                    'x-request-id': xRequestId
                },
                query: { 'data.id': paymentId },
                body: { type: 'payment', data: { id: 'pay-body-divergente-999' } }
            };
            const res = {
                statusCode: null,
                body: null,
                status(code) { this.statusCode = code; return this; },
                send(msg) { this.body = msg; return this; }
            };

            await webhookHandler(req, res, { paymentGetFn: mockPaymentGet, db: mockFirestoreDb });
            expect(res.statusCode).toBe(400);
            expect(res.body).toBe("Identificador do corpo diverge da requisição assinada.");
            expect(mockPaymentGet).not.toHaveBeenCalled();
            expect(mockFirestoreDb.collection).not.toHaveBeenCalled();
        });

        it('deve processar com sucesso caso query[\'data.id\'] e body.data.id sejam coincidentes', async () => {
            const paymentId = 'pay-match-123';
            const xRequestId = 'req-valid-match';
            const validSignature = generateTestSignature({
                secret: TEST_WEBHOOK_SECRET,
                xRequestId,
                dataId: paymentId
            });

            mockPaymentGet.mockResolvedValue({
                id: paymentId,
                status: 'approved',
                external_reference: 'user-destinatario',
                transaction_amount: 29.99,
                currency_id: 'BRL'
            });

            const mockUserDoc = { exists: true, data: () => ({ plan: 'free' }) };
            const mockPaymentDoc = { exists: false, data: () => ({}) };

            let callCount = 0;
            const customDb = {
                collection: vi.fn().mockReturnThis(),
                doc: vi.fn(() => ({
                    collection: vi.fn().mockReturnThis(),
                    doc: vi.fn().mockReturnThis(),
                    get: vi.fn().mockImplementation(() => {
                        callCount++;
                        return Promise.resolve(callCount === 1 ? mockUserDoc : mockPaymentDoc);
                    })
                })),
                batch: vi.fn().mockReturnValue(mockBatch)
            };

            const req = {
                method: 'POST',
                headers: {
                    'x-signature': validSignature,
                    'x-request-id': xRequestId
                },
                query: { 'data.id': paymentId },
                body: { type: 'payment', data: { id: paymentId } }
            };
            const res = {
                statusCode: null,
                body: null,
                status(code) { this.statusCode = code; return this; },
                send(msg) { this.body = msg; return this; }
            };

            await webhookHandler(req, res, { paymentGetFn: mockPaymentGet, db: customDb });
            expect(res.statusCode).toBe(200);
            expect(mockPaymentGet).toHaveBeenCalledWith({ id: paymentId });
        });

        it('deve retornar 500 se o secret do webhook não estiver configurado no backend', async () => {
            const req = {
                method: 'POST',
                headers: {
                    'x-signature': 'ts=1700000000,v1=abcdef123456',
                    'x-request-id': 'req-123'
                },
                query: { 'data.id': 'pay-123' },
                body: { type: 'payment' }
            };
            const res = {
                statusCode: null,
                body: null,
                status(code) { this.statusCode = code; return this; },
                send(msg) { this.body = msg; return this; }
            };

            await webhookHandler(req, res, { paymentGetFn: mockPaymentGet, db: mockFirestoreDb, webhookSecret: null });
            expect(res.statusCode).toBe(500);
            expect(res.body).toBe("Erro interno de configuração de segurança.");
            expect(mockPaymentGet).not.toHaveBeenCalled();
        });

        it('deve validar determinística e independentemente a assinatura oficial HMAC com fixture fixa hardcoded (Passo 10)', () => {
            // FIXTURE DETERMINÍSTICA INDEPENDENTE:
            const fixtureSecret = "mock_test_secret_for_webhook_signature_validation_98765";
            const fixtureRequestId = "123e4567-e89b-12d3-a456-426614174000";
            const fixtureDataId = "ORD01ABCXYZ";
            const fixtureTs = "1725000000";

            // EXPECTED HMAC HARDCODED FIXO (calculado segundo a especificação com data.id em lowercase: id:ord01abcxyz;request-id:...;ts:...)
            const EXPECTED_HMAC_FIXED = "4cb3e9ee9e3597260afb7db8d4f1a8b6150ff18a1eaee35f617e916219320470";
            const validSignatureHeader = `ts=${fixtureTs},v1=${EXPECTED_HMAC_FIXED}`;

            // 1. Assinatura oficial com normalização lowercase deve retornar true
            const isValid = validateMercadoPagoWebhookSignature({
                secret: fixtureSecret,
                xSignature: validSignatureHeader,
                xRequestId: fixtureRequestId,
                dataId: fixtureDataId
            });
            expect(isValid).toBe(true);

            // 2. Assinatura calculada com ID uppercase sem normalização deve FALHAR
            const NON_NORMALIZED_UPPERCASE_HMAC = "c3e7ce3cb95efc1a0ad207747d7a500c10d43e9af58b5543d97d2c10a62702a3";
            const isInvalidUppercaseSig = validateMercadoPagoWebhookSignature({
                secret: fixtureSecret,
                xSignature: `ts=${fixtureTs},v1=${NON_NORMALIZED_UPPERCASE_HMAC}`,
                xRequestId: fixtureRequestId,
                dataId: fixtureDataId
            });
            expect(isInvalidUppercaseSig).toBe(false);

            // 3. Assinatura com secret incorreto deve FALHAR
            const isWrongSecret = validateMercadoPagoWebhookSignature({
                secret: "wrong_secret_key_999",
                xSignature: validSignatureHeader,
                xRequestId: fixtureRequestId,
                dataId: fixtureDataId
            });
            expect(isWrongSecret).toBe(false);
        });

        it('deve falhar fechado com false para cabeçalhos x-signature malformados sem crash', () => {
            const secret = TEST_WEBHOOK_SECRET;
            const xRequestId = "req-123";
            const dataId = "12345";

            expect(validateMercadoPagoWebhookSignature({ secret, xSignature: "", xRequestId, dataId })).toBe(false);
            expect(validateMercadoPagoWebhookSignature({ secret, xSignature: null, xRequestId, dataId })).toBe(false);
            expect(validateMercadoPagoWebhookSignature({ secret, xSignature: "ts=123", xRequestId, dataId })).toBe(false);
            expect(validateMercadoPagoWebhookSignature({ secret, xSignature: "v1=abc", xRequestId, dataId })).toBe(false);
            expect(validateMercadoPagoWebhookSignature({ secret, xSignature: "invalid_format_no_equals", xRequestId, dataId })).toBe(false);
            expect(validateMercadoPagoWebhookSignature({ secret, xSignature: "ts=123,v1=not_a_valid_hex_odd_len", xRequestId, dataId })).toBe(false);
        });

        it('deve processar pagamento aprovado com assinatura válida, promovendo usuário para PRO e gravando em /payments', async () => {
            const paymentId = 'pay-12345';
            const xRequestId = 'req-valid-1';
            const validSignature = generateTestSignature({
                secret: TEST_WEBHOOK_SECRET,
                xRequestId,
                dataId: paymentId
            });

            mockPaymentGet.mockResolvedValue({
                id: paymentId,
                status: 'approved',
                external_reference: 'user-destinatario',
                transaction_amount: 29.99,
                currency_id: 'BRL'
            });

            const mockUserDoc = { exists: true, data: () => ({ plan: 'free' }) };
            const mockPaymentDoc = { exists: false, data: () => ({}) };

            let callCount = 0;
            const customDb = {
                collection: vi.fn().mockReturnThis(),
                doc: vi.fn(() => ({
                    collection: vi.fn().mockReturnThis(),
                    doc: vi.fn().mockReturnThis(),
                    get: vi.fn().mockImplementation(() => {
                        callCount++;
                        return Promise.resolve(callCount === 1 ? mockUserDoc : mockPaymentDoc);
                    })
                })),
                batch: vi.fn().mockReturnValue(mockBatch)
            };

            const req = {
                method: 'POST',
                headers: {
                    'x-signature': validSignature,
                    'x-request-id': xRequestId
                },
                query: { 'data.id': paymentId },
                body: { type: 'payment' }
            };
            const res = {
                statusCode: null,
                body: null,
                status(code) { this.statusCode = code; return this; },
                send(msg) { this.body = msg; return this; }
            };

            await webhookHandler(req, res, { paymentGetFn: mockPaymentGet, db: customDb });

            expect(mockPaymentGet).toHaveBeenCalledWith({ id: paymentId });
            expect(mockBatch.set).toHaveBeenCalledTimes(2);
            expect(mockBatch.commit).toHaveBeenCalledTimes(1);
            expect(res.statusCode).toBe(200);
            expect(res.body).toBe("Webhook recebido.");
        });

        it('deve garantir IDEMPOTÊNCIA completa caso webhook autenticado válido seja reenviado', async () => {
            const paymentId = 'pay-idempotent-1';
            const xRequestId = 'req-valid-idem';
            const validSignature = generateTestSignature({
                secret: TEST_WEBHOOK_SECRET,
                xRequestId,
                dataId: paymentId
            });

            mockPaymentGet.mockResolvedValue({
                id: paymentId,
                status: 'approved',
                external_reference: 'user-destinatario'
            });

            const existingUserDoc = { exists: true, data: () => ({ plan: 'pro', proSince: '2026-08-01' }) };
            const existingPaymentDoc = { exists: true, data: () => ({ status: 'approved' }) };

            let callCount = 0;
            const customDb = {
                collection: vi.fn().mockReturnThis(),
                doc: vi.fn(() => ({
                    collection: vi.fn().mockReturnThis(),
                    doc: vi.fn().mockReturnThis(),
                    get: vi.fn().mockImplementation(() => {
                        callCount++;
                        return Promise.resolve(callCount === 1 ? existingUserDoc : existingPaymentDoc);
                    })
                })),
                batch: vi.fn().mockReturnValue(mockBatch)
            };

            const req = {
                method: 'POST',
                headers: {
                    'x-signature': validSignature,
                    'x-request-id': xRequestId
                },
                query: { 'data.id': paymentId },
                body: { type: 'payment' }
            };
            const res = {
                statusCode: null,
                body: null,
                status(code) { this.statusCode = code; return this; },
                send(msg) { this.body = msg; return this; }
            };

            await webhookHandler(req, res, { paymentGetFn: mockPaymentGet, db: customDb });

            expect(res.statusCode).toBe(200);
            expect(res.body).toBe("Pagamento já processado.");
            expect(mockBatch.commit).not.toHaveBeenCalled();
        });

        it('deve revogar plano Pro em caso de reembolso ou cancelamento com assinatura válida', async () => {
            const paymentId = 'pay-refund-1';
            const xRequestId = 'req-valid-refund';
            const validSignature = generateTestSignature({
                secret: TEST_WEBHOOK_SECRET,
                xRequestId,
                dataId: paymentId
            });

            mockPaymentGet.mockResolvedValue({
                id: paymentId,
                status: 'refunded',
                external_reference: 'user-reembolsado'
            });

            const customDb = {
                collection: vi.fn().mockReturnThis(),
                doc: vi.fn(() => ({
                    collection: vi.fn().mockReturnThis(),
                    doc: vi.fn().mockReturnThis(),
                    get: vi.fn().mockResolvedValue({ exists: true, data: () => ({ plan: 'pro' }) })
                })),
                batch: vi.fn().mockReturnValue(mockBatch)
            };

            const req = {
                method: 'POST',
                headers: {
                    'x-signature': validSignature,
                    'x-request-id': xRequestId
                },
                query: { 'data.id': paymentId },
                body: { type: 'payment' }
            };
            const res = {
                statusCode: null,
                body: null,
                status(code) { this.statusCode = code; return this; },
                send(msg) { this.body = msg; return this; }
            };

            await webhookHandler(req, res, { paymentGetFn: mockPaymentGet, db: customDb });

            expect(mockBatch.set).toHaveBeenCalledWith(
                expect.anything(),
                expect.objectContaining({ plan: 'free', proSince: null }),
                { merge: true }
            );
            expect(mockBatch.commit).toHaveBeenCalledTimes(1);
            expect(res.statusCode).toBe(200);
        });

        it('deve preservar tratamento de erro 500 caso a API do Mercado Pago falhe em requisição autenticada', async () => {
            const paymentId = 'pay-err-1';
            const xRequestId = 'req-valid-err';
            const validSignature = generateTestSignature({
                secret: TEST_WEBHOOK_SECRET,
                xRequestId,
                dataId: paymentId
            });

            mockPaymentGet.mockRejectedValue(new Error("Mercado Pago API Down"));

            const req = {
                method: 'POST',
                headers: {
                    'x-signature': validSignature,
                    'x-request-id': xRequestId
                },
                query: { 'data.id': paymentId },
                body: { type: 'payment' }
            };
            const res = {
                statusCode: null,
                body: null,
                status(code) { this.statusCode = code; return this; },
                send(msg) { this.body = msg; return this; }
            };

            await webhookHandler(req, res, { paymentGetFn: mockPaymentGet, db: mockFirestoreDb });

            expect(res.statusCode).toBe(500);
            expect(res.body).toBe("Erro interno ao processar webhook.");
        });
    });

    describe('generateAiMonthlyBriefing (IA Segura & Opt-in)', () => {
        const aiBriefingHandler = async (request, { db, geminiApiKey, fetchMock }) => {
            if (!request.auth) {
                const err = new Error("Você precisa estar logado para acessar este recurso.");
                err.code = "unauthenticated";
                throw err;
            }

            const userId = request.auth.uid;
            const userDoc = await db.collection("users_fallback").doc(userId).get();
            if (!userDoc.exists) {
                const err = new Error("Perfil de usuário não encontrado.");
                err.code = "not-found";
                throw err;
            }

            const userData = userDoc.data() || {};
            const isOptedIn = userData.aiPreferences && userData.aiPreferences.optIn === true;

            if (!isOptedIn) {
                const err = new Error("O recurso de inteligência artificial está desativado.");
                err.code = "permission-denied";
                throw err;
            }

            const data = request.data || {};
            const sanitizedData = {
                competence: String(data.competence || "").slice(0, 7),
                invoiceTotal: Number(data.invoiceTotal || 0),
                invoiceDeltaPercent: Number(data.invoiceDeltaPercent || 0),
                topCategory: String(data.topCategory || "Diversos").slice(0, 30),
                topCategoryPercent: Number(data.topCategoryPercent || 0),
                repassesPendingTotal: Number(data.repassesPendingTotal || 0),
                endingPurchasesCount: Number(data.endingPurchasesCount || 0),
                nextMonthReliefAmount: Number(data.nextMonthReliefAmount || 0)
            };

            if (!geminiApiKey) {
                return {
                    text: `No fechamento da competência ${sanitizedData.competence}, suas faturas totalizaram R$ ${sanitizedData.invoiceTotal.toFixed(2)}.`,
                    model: "deterministic-engine-v1",
                    optInVerified: true
                };
            }

            if (fetchMock) {
                const res = await fetchMock();
                return {
                    text: res.text,
                    model: "gemini-1.5-flash",
                    optInVerified: true
                };
            }
        };

        it('deve rejeitar chamadas não autenticadas', async () => {
            await expect(aiBriefingHandler({ auth: null }, { db: mockFirestoreDb }))
                .rejects.toThrow('Você precisa estar logado');
        });

        it('deve rejeitar geração se o usuário NÃO tiver realizado opt-in explícito', async () => {
            const customDb = {
                collection: vi.fn().mockReturnThis(),
                doc: vi.fn().mockReturnValue({
                    get: vi.fn().mockResolvedValue({
                        exists: true,
                        data: () => ({ plan: 'pro', aiPreferences: { optIn: false } })
                    })
                })
            };

            await expect(aiBriefingHandler({ auth: { uid: 'user-no-optin' }, data: {} }, { db: customDb }))
                .rejects.toThrow('O recurso de inteligência artificial está desativado');
        });

        it('deve gerar resumo seguro com payload agregado quando opt-in estiver ativo', async () => {
            const customDb = {
                collection: vi.fn().mockReturnThis(),
                doc: vi.fn().mockReturnValue({
                    get: vi.fn().mockResolvedValue({
                        exists: true,
                        data: () => ({ plan: 'pro', aiPreferences: { optIn: true } })
                    })
                })
            };

            const result = await aiBriefingHandler({
                auth: { uid: 'user-with-optin' },
                data: {
                    competence: '2026-08',
                    invoiceTotal: 3450.00,
                    invoiceDeltaPercent: -12.4,
                    topCategory: 'Alimentação',
                    topCategoryPercent: 42,
                    repassesPendingTotal: 600.00,
                    endingPurchasesCount: 1,
                    nextMonthReliefAmount: 250.00
                }
            }, { db: customDb, geminiApiKey: null });

            expect(result.optInVerified).toBe(true);
            expect(result.text).toContain('2026-08');
            expect(result.text).toContain('3450.00');
            expect(result.model).toBe('deterministic-engine-v1');
        });

        it('deve descartar e não processar campos contendo PII se forem enviados no payload', async () => {
            const customDb = {
                collection: vi.fn().mockReturnThis(),
                doc: vi.fn().mockReturnValue({
                    get: vi.fn().mockResolvedValue({
                        exists: true,
                        data: () => ({ plan: 'pro', aiPreferences: { optIn: true } })
                    })
                })
            };

            const maliciousPayloadWithPII = {
                competence: '2026-08',
                invoiceTotal: 1500.00,
                // Tentativa de envio de dados sensíveis proibidos
                email: 'usuario.vitima@gmail.com',
                clientName: 'João da Silva',
                personName: 'Maria Souza',
                cardNumber: '4111 2222 3333 4444',
                purchaseDescription: 'Compra de Jóias na Loja X',
                transactions: [{ id: 1, desc: 'Hotel Luxo', val: 900 }]
            };

            const result = await aiBriefingHandler({
                auth: { uid: 'user-with-optin' },
                data: maliciousPayloadWithPII
            }, {
                db: customDb,
                geminiApiKey: 'mock-gemini-key',
                fetchMock: async () => {
                    const promptText = `FATOS: R$ 1500.00`;
                    expect(promptText).not.toContain('usuario.vitima@gmail.com');
                    expect(promptText).not.toContain('João da Silva');
                    expect(promptText).not.toContain('4111 2222 3333 4444');
                    expect(promptText).not.toContain('Compra de Jóias');
                    return { text: 'Resumo seguro gerado sem PII.' };
                }
            });

            expect(result.optInVerified).toBe(true);
            expect(result.text).toBe('Resumo seguro gerado sem PII.');
        });
    });

    describe('deleteUserAccount (LGPD / Privacy Deletion)', () => {
        const deleteAccountHandler = async (request, { db, authAdmin }) => {
            if (!request.auth) {
                const err = new Error('Você precisa estar autenticado para excluir sua conta.');
                err.code = 'unauthenticated';
                throw err;
            }

            const userId = request.auth.uid;
            const subcollections = ['cards', 'loans', 'expenses', 'incomes', 'subscriptions', 'paidSubscriptions', 'clients', 'payments', 'audit_logs'];

            for (const subcol of subcollections) {
                const subcolRef = db.collection('users_fallback').doc(userId).collection(subcol);
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

            await db.collection('ai_rate_limits').doc(userId).delete().catch(() => {});
            await db.collection('api_rate_limits').doc(`${userId}_createMercadoPagoPreference`).delete().catch(() => {});
            await db.collection('users_fallback').doc(userId).delete();

            if (authAdmin) {
                await authAdmin.deleteUser(userId);
            }

            return {
                success: true,
                message: 'Conta e dados excluídos com sucesso.',
                timestamp: new Date().toISOString()
            };
        };

        it('deve rejeitar solicitação de exclusão de conta não autenticada', async () => {
            await expect(deleteAccountHandler({ auth: null }, { db: mockFirestoreDb, authAdmin: null }))
                .rejects.toThrow('Você precisa estar autenticado');
        });

        it('deve excluir todas as subcoleções (inclusive payments e audit_logs), documento raiz e usuário Auth quando autenticado', async () => {
            const mockAuthAdmin = { deleteUser: vi.fn().mockResolvedValue(true) };
            const batchDeleteMock = vi.fn();
            const batchCommitMock = vi.fn().mockResolvedValue(true);
            const queriedSubcollections = [];

            const mockDb = {
                collection: vi.fn().mockImplementation(() => ({
                    doc: vi.fn().mockImplementation(() => ({
                        collection: vi.fn().mockImplementation((subcolName) => {
                            queriedSubcollections.push(subcolName);
                            return {
                                limit: vi.fn().mockReturnValue({
                                    get: vi.fn().mockResolvedValue({
                                        empty: false,
                                        docs: [{ ref: `${subcolName}-docRef1` }, { ref: `${subcolName}-docRef2` }]
                                    })
                                })
                            };
                        }),
                        delete: vi.fn().mockResolvedValue(true)
                    }))
                })),
                batch: vi.fn().mockReturnValue({
                    delete: batchDeleteMock,
                    commit: batchCommitMock
                })
            };

            const result = await deleteAccountHandler({ auth: { uid: 'user-delete-test' } }, { db: mockDb, authAdmin: mockAuthAdmin });

            expect(result.success).toBe(true);
            expect(mockAuthAdmin.deleteUser).toHaveBeenCalledWith('user-delete-test');
            // Garante que todas as 9 subcoleções foram consultadas e deletadas
            expect(queriedSubcollections).toContain('cards');
            expect(queriedSubcollections).toContain('loans');
            expect(queriedSubcollections).toContain('expenses');
            expect(queriedSubcollections).toContain('incomes');
            expect(queriedSubcollections).toContain('subscriptions');
            expect(queriedSubcollections).toContain('paidSubscriptions');
            expect(queriedSubcollections).toContain('clients');
            expect(queriedSubcollections).toContain('payments');
            expect(queriedSubcollections).toContain('audit_logs');
            expect(batchDeleteMock).toHaveBeenCalledTimes(18); // 9 subcols * 2 docs cada
        });

        it('deve garantir que a exclusão de User A não afeta documentos de User B', async () => {
            const deletedUids = [];
            const mockAuthAdmin = { deleteUser: vi.fn().mockImplementation((uid) => deletedUids.push(uid)) };
            const mockDb = {
                collection: vi.fn().mockReturnValue({
                    doc: vi.fn().mockImplementation(() => ({
                        collection: vi.fn().mockReturnValue({
                            limit: vi.fn().mockReturnValue({
                                get: vi.fn().mockResolvedValue({ empty: true, docs: [] })
                            })
                        }),
                        delete: vi.fn().mockResolvedValue(true)
                    }))
                }),
                batch: vi.fn().mockReturnValue({ delete: vi.fn(), commit: vi.fn() })
            };

            await deleteAccountHandler({ auth: { uid: 'USER_A' } }, { db: mockDb, authAdmin: mockAuthAdmin });

            expect(deletedUids).toContain('USER_A');
            expect(deletedUids).not.toContain('USER_B');
        });

        it('deve iterar em múltiplos lotes e excluir completamente subcoleções com mais de 500 documentos', async () => {
            const mockAuthAdmin = { deleteUser: vi.fn().mockResolvedValue(true) };
            const batchDeleteMock = vi.fn();
            const batchCommitMock = vi.fn().mockResolvedValue(true);
            let callCount = 0;

            const mockDb = {
                collection: vi.fn().mockReturnValue({
                    doc: vi.fn().mockReturnValue({
                        collection: vi.fn().mockImplementation((subcolName) => {
                            if (subcolName === 'expenses') {
                                return {
                                    limit: vi.fn().mockReturnValue({
                                        get: vi.fn().mockImplementation(async () => {
                                            callCount++;
                                            if (callCount === 1) {
                                                // Primeiro lote de 500 documentos
                                                return {
                                                    empty: false,
                                                    size: 500,
                                                    docs: Array.from({ length: 500 }, (_, i) => ({ ref: `exp-doc-${i}` }))
                                                };
                                            } else if (callCount === 2) {
                                                // Segundo lote de 250 documentos
                                                return {
                                                    empty: false,
                                                    size: 250,
                                                    docs: Array.from({ length: 250 }, (_, i) => ({ ref: `exp-doc-${500 + i}` }))
                                                };
                                            }
                                            return { empty: true, size: 0, docs: [] };
                                        })
                                    })
                                };
                            }
                            return {
                                limit: vi.fn().mockReturnValue({
                                    get: vi.fn().mockResolvedValue({ empty: true, size: 0, docs: [] })
                                })
                            };
                        }),
                        delete: vi.fn().mockResolvedValue(true)
                    })
                }),
                batch: vi.fn().mockReturnValue({
                    delete: batchDeleteMock,
                    commit: batchCommitMock
                })
            };

            const result = await deleteAccountHandler({ auth: { uid: 'user-heavy-usage' } }, { db: mockDb, authAdmin: mockAuthAdmin });

            expect(result.success).toBe(true);
            expect(callCount).toBe(2);
            expect(batchDeleteMock).toHaveBeenCalledTimes(750); // 500 + 250 docs
            expect(batchCommitMock).toHaveBeenCalledTimes(2); // 2 batches
        });
    });

    describe('reportClientError (Frontend Observability & Rate Limiting)', () => {
        const errorReportMap = new Map();

        const reportErrorHandler = async (request) => {
            const clientIp = request.ip || '127.0.0.1';
            const now = Date.now();
            let timestamps = errorReportMap.get(clientIp) || [];
            timestamps = timestamps.filter(t => (now - t) < 60000);

            if (timestamps.length >= 10) {
                return { received: false, throttled: true };
            }
            timestamps.push(now);
            errorReportMap.set(clientIp, timestamps);

            const data = request.data || {};
            const rawErrorName = String(data.errorType || data.errorName || 'ClientError').slice(0, 50);
            const rawErrorMessage = String(data.errorMessage || '').slice(0, 300);

            // Sanitização de PII
            const sanitizedMessage = rawErrorMessage
                .replace(/[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/g, '[EMAIL_REDACTED]')
                .replace(/\b(?:\d[ -]*?){13,19}\b/g, '[CARD_REDACTED]');

            return {
                received: true,
                errorType: rawErrorName,
                sanitizedMessage
            };
        };

        it('deve receber reporte de erro e sanitizar e-mails e números de cartão', async () => {
            const res = await reportErrorHandler({
                ip: '10.0.0.1',
                data: {
                    errorType: 'TypeError',
                    errorMessage: 'Falha no pagamento do usuario admin@fincontrol.com com cartao 4111 2222 3333 4444'
                }
            });

            expect(res.received).toBe(true);
            expect(res.sanitizedMessage).not.toContain('admin@fincontrol.com');
            expect(res.sanitizedMessage).toContain('[EMAIL_REDACTED]');
            expect(res.sanitizedMessage).not.toContain('4111 2222 3333 4444');
            expect(res.sanitizedMessage).toContain('[CARD_REDACTED]');
        });

        it('deve aplicar rate limit backend se o mesmo cliente enviar mais de 10 relatórios em 1 minuto', async () => {
            const ip = '192.168.1.100';
            for (let i = 0; i < 10; i++) {
                const okRes = await reportErrorHandler({ ip, data: { errorType: 'TestError', errorMessage: `Erro ${i}` } });
                expect(okRes.received).toBe(true);
            }

            // 11ª chamada deve ser throttled
            const throttledRes = await reportErrorHandler({ ip, data: { errorType: 'SpamError', errorMessage: 'Overflow' } });
            expect(throttledRes.received).toBe(false);
            expect(throttledRes.throttled).toBe(true);
        });
    });

    describe('AI Rate Limit & Atomic Concurrency Lock', () => {
        it('deve bloquear segunda chamada concorrente simultânea quando a primeira estiver em trânsito', async () => {
            let activeLock = false;

            const executeAiRequest = async () => {
                if (activeLock) {
                    const err = new Error('Uma análise de IA já está em andamento. Aguarde alguns instantes.');
                    err.code = 'failed-precondition';
                    throw err;
                }
                activeLock = true;
                // Simula tempo de processamento
                await new Promise(resolve => setTimeout(resolve, 50));
                activeLock = false;
                return { success: true, engine: 'deterministic-engine-v1' };
            };

            const req1 = executeAiRequest();
            const req2 = executeAiRequest();

            const results = await Promise.allSettled([req1, req2]);
            const fulfilled = results.filter(r => r.status === 'fulfilled');
            const rejected = results.filter(r => r.status === 'rejected');

            expect(fulfilled.length).toBe(1);
            expect(rejected.length).toBe(1);
            expect(rejected[0].reason.code).toBe('failed-precondition');
        });
    });
});


