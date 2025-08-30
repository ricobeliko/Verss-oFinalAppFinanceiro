// functions/index.js

const { onCall, onRequest } = require("firebase-functions/v2/https");
const { logger } = require("firebase-functions");
const admin = require("firebase-admin");
const { MercadoPagoConfig, Preference, Payment } = require("mercadopago");

if (admin.apps.length === 0) {
    admin.initializeApp();
}

// A função createMercadoPagoPreference continua a mesma, não precisa ser alterada.
exports.createMercadoPagoPreference = onCall(
    {
        region: "southamerica-east1",
        secrets: ["MERCADOPAGO_ACCESS_TOKEN"],
    },
    async (request) => {
        if (!request.auth) {
            logger.warn("Tentativa de pagamento não autenticada.");
            throw new Error("unauthenticated", "Você precisa estar logado para realizar esta ação.");
        }
        const client = new MercadoPagoConfig({
            accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
        });
        const userId = request.auth.uid;
        const userEmail = request.auth.token.email;
        if (!userEmail) {
            logger.error("Usuário sem e-mail tentou pagar.", { userId: userId });
            throw new Error("invalid-argument", "O e-mail do usuário é obrigatório para o pagamento.");
        }
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
                payer: { email: userEmail },
                back_urls: {
                    success: "https://controle-de-cartao.web.app/dashboard?payment=success",
                    failure: "https://controle-de-cartao.web.app/dashboard?payment=failure",
                    pending: "https://controle-de-cartao.web.app/dashboard?payment=pending",
                },
                auto_return: "approved",
                external_reference: userId,
            };
            const result = await preference.create({ body: preferenceData });
            logger.info("Preferência de pagamento criada com sucesso.", { userId: userId, preferenceId: result.id });
            return {
                preferenceId: result.id,
                init_point: result.init_point,
            };
        } catch (error) {
            logger.error("Erro ao criar preferência do Mercado Pago:", error);
            throw new Error("internal", "Falha ao criar a preferência de pagamento.");
        }
    }
);


// ✅ FUNÇÃO DE WEBHOOK ATUALIZADA
exports.paymentWebhookMercadoPago = onRequest(
    {
        region: "southamerica-east1",
        secrets: ["MERCADOPAGO_ACCESS_TOKEN"],
    },
    async (req, res) => {
        if (req.method !== 'POST') {
            res.status(405).send('Method Not Allowed');
            return;
        }

        const { type, data } = req.body;

        if (type === "payment" && data && data.id) {
            try {
                const client = new MercadoPagoConfig({ accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN });
                const paymentClient = new Payment(client);
                const payment = await paymentClient.get({ id: data.id });
                
                const paymentStatus = payment.status;
                const userId = payment.external_reference;

                if (userId) {
                    const userRef = admin.firestore().collection("users_fallback").doc(userId);
                    
                    // Usamos um 'switch' para lidar com os diferentes status do pagamento
                    switch (paymentStatus) {
                        case 'approved':
                            // Se aprovado, concede o acesso Pro
                            await userRef.set({
                                plan: "pro",
                                proSince: admin.firestore.FieldValue.serverTimestamp(),
                            }, { merge: true });
                            logger.info(`Acesso Pro concedido para o usuário: ${userId}`);
                            break;

                        case 'refunded':
                        case 'charged_back':
                        case 'cancelled':
                            // Se for estornado, devolvido ou cancelado, revoga o acesso
                            await userRef.set({
                                plan: "free", // Volta o plano para 'free'
                                proSince: admin.firestore.FieldValue.delete(), // Remove a data de início do Pro
                                lastStatus: `payment_${paymentStatus}` // Guarda o último status para referência
                            }, { merge: true });
                            logger.info(`Acesso Pro revogado para o usuário: ${userId} devido a status: ${paymentStatus}`);
                            break;
                            
                        default:
                            logger.info(`Webhook recebido para usuário ${userId} com status não tratado: ${paymentStatus}`);
                            break;
                    }
                }
            } catch (error) {
                logger.error("Erro no processamento do webhook:", error);
                res.status(500).send("Erro interno ao processar webhook.");
                return;
            }
        }
        
        res.status(200).send("Webhook recebido.");
    }
);