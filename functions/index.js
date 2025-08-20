// functions/index.js

// ATUALIZAÇÃO: Importando o logger v2, o setGlobalOptions e o HttpsError
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2");
const logger = require("firebase-functions/logger");

const admin = require("firebase-admin");
const stripePackage = require("stripe");

// ATUALIZAÇÃO: Definindo a região da função explicitamente.
// A sua imagem de erro indica "us-central1", então vamos usar essa.
// Isso evita problemas de localização e é uma boa prática para funções v2.
setGlobalOptions({ region: "us-central1" });

admin.initializeApp();

// --- FUNÇÃO DE CHECKOUT DE PRODUÇÃO ---
exports.createStripeCheckout = onCall(async (request) => {
    // A chave de teste do Stripe. Em produção, use variáveis de ambiente.
    const stripe = stripePackage("sk_test_51RpFfW2fpb1gGSlpurSb98GJenvPL6ys2Ly8SPFFLtAAb76U55OJpZLTSxN1gjzEnzJc5MFWfRBEyGkg1eeJa6ic00IL174s1l");

    if (!request.auth) {
        // ATUALIZAÇÃO: Usando o logger v2
        logger.error("Tentativa de checkout não autenticada.");
        // ATUALIZAÇÃO: Usando o HttpsError importado
        throw new HttpsError("unauthenticated", "Você precisa estar logado para fazer o upgrade.");
    }

    const userId = request.auth.uid;
    const userEmail = request.auth.token.email;

    try {
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            mode: "subscription",
            success_url: "https://controle-de-cartao.web.app/?upgrade=success",
            cancel_url: "https://controle-de-cartao.web.app/?upgrade=cancelled",
            client_reference_id: userId,
            customer_email: userEmail,
            line_items: [
                {
                    price: "price_1RpFkz2fpb1gGSlpVn5YA6Up",
                    quantity: 1,
                },
            ],
        });

        return { url: session.url };

    } catch (error) {
        // ATUALIZAÇÃO: Usando o logger v2 e retornando uma mensagem de erro mais detalhada
        logger.error("Erro ao criar a sessão de checkout do Stripe:", error);
        
        // Retorna a mensagem de erro original do Stripe para o cliente,
        // o que facilita a depuração de problemas como chaves ou preços inválidos.
        throw new HttpsError("internal", error.message || "Não foi possível criar a sessão de checkout.");
    }
});