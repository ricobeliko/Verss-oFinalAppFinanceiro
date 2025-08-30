const { onCall, onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const { MercadoPagoConfig, Preference, Payment } = require("mercadopago");
const functions = require("firebase-functions");

if (admin.apps.length === 0) {
    admin.initializeApp();
}

exports.createMercadoPagoPreference = onCall({ region: "southamerica-east1" }, async (request) => {
    // ✅ CORREÇÃO AQUI: Usando 'request.auth' em vez de 'context.auth'
    if (!request.auth) {
        throw new functions.https.HttpsError(
            "unauthenticated",
            "Você precisa estar logado para criar uma preferência de pagamento.",
        );
    }

    const client = new MercadoPagoConfig({
        accessToken: functions.config().mercadopago.access_token,
    });

    const userId = request.auth.uid;
    const userEmail = request.auth.token.email || null;

    if (!userEmail) {
        throw new functions.https.HttpsError(
            "invalid-argument",
            "O e-mail do usuário é necessário.",
        );
    }

    try {
        const preferenceClient = new Preference(client);
        const preferenceData = {
            items: [
                {
                    id: "PRO-LIFETIME-01",
                    title: "FinControl Pro - Acesso Vitalício",
                    description: "Acesso a todos os recursos premium do FinControl.",
                    quantity: 1,
                    currency_id: "BRL",
                    unit_price: 29.99,
                },
            ],
            payer: {
                email: userEmail,
            },
            back_urls: {
                success: "https://controle-de-cartao.web.app/dashboard?payment=success",
                failure: "https://controle-de-cartao.web.app/dashboard?payment=failure",
                pending: "https://controle-de-cartao.web.app/dashboard?payment=pending",
            },
            auto_return: "approved",
            external_reference: userId,
        };

        const result = await preferenceClient.create({ body: preferenceData });
        return { url: result.init_point };

    } catch (error) {
        console.error("Erro ao criar preferência do MP:", error);
        throw new functions.https.HttpsError(
            "internal",
            "Falha ao criar a preferência de pagamento.",
        );
    }
});

exports.paymentWebhookMercadoPago = onRequest({ region: "southamerica-east1" }, async (req, res) => {
    const client = new MercadoPagoConfig({
        accessToken: functions.config().mercadopago.access_token,
    });

    const { type, data } = req.body;
    if (type === "payment" && data && data.id) {
        try {
            const paymentClient = new Payment(client);
            const payment = await paymentClient.get({ id: data.id });
            
            if (payment) {
                const paymentStatus = payment.status;
                const userId = payment.external_reference;

                if (paymentStatus === "approved" && userId) {
                    const userRef = admin.firestore().collection("users").doc(userId);
                    await userRef.set(
                        {
                            plan: "pro",
                            proSince: admin.firestore.FieldValue.serverTimestamp(),
                        },
                        { merge: true },
                    );
                    console.log(`Acesso Pro concedido para o usuário: ${userId}`);
                }
            }
        } catch (error) {
            console.error("Erro no webhook do MP:", error);
            return res.status(200).send("Webhook processado com erro interno.");
        }
    }
    res.status(200).send("Webhook recebido.");
});