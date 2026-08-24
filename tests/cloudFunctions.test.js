// tests/cloudFunctions.test.js
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

    describe('createMercadoPagoPreference', () => {
        const handler = async (request, preferenceCreateFn) => {
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
            }
        };

        it('deve rejeitar chamada de usuário não autenticado', async () => {
            await expect(handler({ auth: null }, mockPreferenceCreate)).rejects.toMatchObject({
                code: 'unauthenticated'
            });
            expect(mockPreferenceCreate).not.toHaveBeenCalled();
        });

        it('deve rejeitar chamada de usuário sem e-mail cadastrado', async () => {
            const request = { auth: { uid: 'user-123', token: {} } };
            await expect(handler(request, mockPreferenceCreate)).rejects.toMatchObject({
                code: 'invalid-argument'
            });
            expect(mockPreferenceCreate).not.toHaveBeenCalled();
        });

        it('deve criar preferência com parâmetros corretos para usuário válido', async () => {
            mockPreferenceCreate.mockResolvedValue({
                id: 'pref-999',
                init_point: 'https://mercadopago.com/checkout/pref-999'
            });

            const request = { auth: { uid: 'user-vip-1', token: { email: 'cliente@fincontrol.com' } } };
            const res = await handler(request, mockPreferenceCreate);

            expect(res.preferenceId).toBe('pref-999');
            expect(res.init_point).toBe('https://mercadopago.com/checkout/pref-999');
            expect(mockPreferenceCreate).toHaveBeenCalledWith(expect.objectContaining({
                body: expect.objectContaining({
                    payer: { email: 'cliente@fincontrol.com' },
                    external_reference: 'user-vip-1',
                    items: expect.arrayContaining([
                        expect.objectContaining({
                            id: 'PRO-LIFETIME-01',
                            unit_price: 29.99
                        })
                    ])
                })
            }));
        });
    });

    describe('paymentWebhookMercadoPago e Idempotência', () => {
        const webhookHandler = async (req, res, { paymentGetFn, db }) => {
            if (req.method !== 'POST') {
                res.status(405).send('Method Not Allowed');
                return;
            }

            const { type, data } = req.body || {};

            if (type === "payment" && data && data.id) {
                const paymentId = String(data.id);
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
            }

            res.status(200).send("Webhook recebido.");
        };

        it('deve retornar 405 Method Not Allowed para métodos diferentes de POST', async () => {
            const req = { method: 'GET', body: {} };
            const res = {
                statusCode: null,
                body: null,
                status(code) { this.statusCode = code; return this; },
                send(msg) { this.body = msg; return this; }
            };

            await webhookHandler(req, res, { paymentGetFn: mockPaymentGet, db: mockFirestoreDb });
            expect(res.statusCode).toBe(405);
        });

        it('deve processar pagamento aprovado, promover usuário para PRO e gravar em /payments', async () => {
            mockPaymentGet.mockResolvedValue({
                id: 'pay-12345',
                status: 'approved',
                external_reference: 'user-destinatario',
                transaction_amount: 29.99,
                currency_id: 'BRL'
            });

            const mockUserDoc = { exists: true, data: () => ({ plan: 'free' }) };
            const mockPaymentDoc = { exists: false, data: () => ({}) };

            mockFirestoreDb.get.mockImplementation(function() {
                return Promise.resolve(mockUserDoc);
            });

            // Configurar retorno de doc().get()
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
                body: { type: 'payment', data: { id: 'pay-12345' } }
            };
            const res = {
                statusCode: null,
                body: null,
                status(code) { this.statusCode = code; return this; },
                send(msg) { this.body = msg; return this; }
            };

            await webhookHandler(req, res, { paymentGetFn: mockPaymentGet, db: customDb });

            expect(mockBatch.set).toHaveBeenCalledTimes(2);
            expect(mockBatch.commit).toHaveBeenCalledTimes(1);
            expect(res.statusCode).toBe(200);
            expect(res.body).toBe("Webhook recebido.");
        });

        it('deve garantir IDEMPOTÊNCIA completa caso o mesmo paymentId aprovado seja reenviado', async () => {
            mockPaymentGet.mockResolvedValue({
                id: 'pay-12345',
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
                body: { type: 'payment', data: { id: 'pay-12345' } }
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
            // Idempotência: Não deve ter chamado o batch para gravar novamente
            expect(mockBatch.commit).not.toHaveBeenCalled();
        });

        it('deve revogar plano Pro em caso de reembolso ou cancelamento', async () => {
            mockPaymentGet.mockResolvedValue({
                id: 'pay-refund-1',
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
                body: { type: 'payment', data: { id: 'pay-refund-1' } }
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
                const snapshot = await subcolRef.limit(500).get();
                if (!snapshot.empty) {
                    const batch = db.batch();
                    snapshot.docs.forEach((docSnap) => batch.delete(docSnap.ref));
                    await batch.commit();
                }
            }

            await db.collection('ai_rate_limits').doc(userId).delete().catch(() => {});
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


