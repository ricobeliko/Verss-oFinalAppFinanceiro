// functions/index.js

const functions = require("firebase-functions");
const admin = require("firebase-admin");
const cors = require("cors")({ origin: true }); // Usaremos para o webhook

admin.initializeApp();

/**
 * Função que pega o seu link de pagamento do Mercado Pago e o entrega ao app.
 * Sendo uma função 'onCall', o Firebase ajuda a gerenciar o CORS automaticamente.
 */
exports.getPaymentLink = functions.https.onCall((data, context) => {
  // 1. Verifica se o usuário está logado.
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "Você precisa estar autenticado para realizar esta ação."
    );
  }

  // 2. Busca o seu link secreto que guardamos.
  const basePaymentLink = functions.config().pagamento.link_pro;
  if (!basePaymentLink) {
    console.error("ERRO: A variável de ambiente 'pagamento.link_pro' não foi encontrada!");
    throw new functions.https.HttpsError("internal", "O link de pagamento não está configurado no servidor.");
  }
  
  // 3. Pega o ID do usuário para anexar ao link.
  const userId = context.auth.uid;
  // O link final terá a referência externa para o Mercado Pago saber quem está pagando.
  const finalLink = `${basePaymentLink}&external_reference=${userId}`;

  // 4. Retorna o link de pagamento completo para o aplicativo.
  return { link: finalLink };
});

/**
 * Webhook que "ouve" as notificações do Mercado Pago.
 * Usa 'onRequest' e precisa do 'cors'.
 */
exports.paymentWebhook = functions.https.onRequest(async (req, res) => {
    // Envolvemos a lógica com o cors para garantir a comunicação
    cors(req, res, async () => {
        console.log("Webhook do Mercado Pago recebido:", req.body);

        // Apenas processa se for uma notificação de pagamento criado/atualizado.
        if (req.body.type === "payment") {
            const paymentId = req.body.data.id;
            const accessToken = functions.config().pagamento.access_token;

            if (!accessToken) {
                console.error("ERRO: Access Token do Mercado Pago não configurado!");
                res.status(500).send("Erro de configuração interna.");
                return;
            }

            try {
                // Busca os detalhes completos do pagamento na API do Mercado Pago
                const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`
                    }
                });
                const paymentDetails = await response.json();

                const userId = paymentDetails.external_reference;
                const paymentStatus = paymentDetails.status;

                console.log(`Status do Pagamento: ${paymentStatus}, ID do Usuário: ${userId}`);

                if (paymentStatus === "approved" && userId) {
                    const userRef = admin.firestore().collection("users_fallback").doc(userId);
                    
                    await userRef.set({
                        isPro: true,
                        plan: 'pro_lifetime',
                        proSince: admin.firestore.FieldValue.serverTimestamp(),
                    }, { merge: true });

                    console.log(`Acesso Pro concedido com sucesso para o usuário: ${userId}`);
                }
            } catch (error) {
                console.error("Erro ao processar o webhook do Mercado Pago:", error);
                res.status(500).send("Erro ao processar o pagamento.");
                return;
            }
        }
        res.status(200).send("OK");
    });
});