# FinControl — Observabilidade de Produção

Este documento descreve a estratégia de observabilidade do FinControl, incluindo logs estruturados, alertas GCP e monitoramento do webhook Mercado Pago.

---

## 1. Camadas de Observabilidade

```
Cloud Functions (Backend)
    ↓ logger.info / logger.warn / logger.error (estruturado)
    ↓
Cloud Logging (GCP)
    ↓
GCP Alert Policies → notificação por e-mail / Slack
```

```
Frontend (Browser)
    ↓ ErrorBoundary (captura crashes de renderização)
    ↓
[PENDÊNCIA OPERACIONAL] → telemetria não configurada ainda
```

---

## 2. Logs Estruturados nas Cloud Functions

Todas as Cloud Functions usam campos padronizados nos logs:

| Campo | Descrição |
|-------|-----------|
| `stage` | Nome da função onde o log foi gerado |
| `result` | Resultado da operação (`success`, `error`, `ignored`, etc.) |
| `userId` | UID do usuário (nunca e-mail, nunca nome) |
| `paymentId` | ID do pagamento MP (identificador técnico, sem valor financeiro) |
| `latencyMs` | Latência da chamada externa em milissegundos |
| `errorType` | Nome da classe do erro (ex: `HttpsError`) |
| `errorCode` | Código HTTP ou código Firebase do erro |

### O que NUNCA aparece nos logs

- Access token do Mercado Pago
- API Key do Gemini
- E-mail do usuário (exceto como hash ou omitido)
- Payload financeiro bruto (valores de transações individuais)
- Dados de cartão
- PII além do userId técnico

---

## 3. Mapa de Operações com Logs

### `createMercadoPagoPreference`

| Evento | Nível | Campo `result` |
|--------|:-----:|---------------|
| Tentativa não autenticada | WARN | `unauthenticated` |
| Usuário sem e-mail | ERROR | `invalid_argument` |
| Preferência criada | INFO | `success` |
| Falha na API MP | ERROR | `error` |

### `paymentWebhookMercadoPago`

| Evento | Nível | Campo `result` |
|--------|:-----:|---------------|
| Método não POST | WARN | `method_not_allowed` |
| Evento ignorado (não-payment) | INFO | `ignored` |
| Status do pagamento obtido | INFO | _(status do MP)_ |
| external_reference ausente | WARN | `skipped_no_user` |
| Idempotência aplicada | INFO | `idempotent_skip` |
| Acesso Pro concedido | INFO | `pro_granted` |
| Acesso Pro revogado | INFO | `pro_revoked` |
| Status não tratado | INFO | `status_unhandled` |
| Erro crítico | ERROR | `error` |

### `generateAiMonthlyBriefing`

| Evento | Nível | Campo `result` |
|--------|:-----:|---------------|
| Tentativa não autenticada | WARN | `unauthenticated` |
| Usuário não encontrado | WARN | `user_not_found` |
| Sem opt-in | WARN | `opt_in_missing` |
| Fallback determinístico | INFO | `deterministic_fallback` |
| Gemini chamado | INFO | _(latencyMs)_ |
| Síntese gerada | INFO | `success` |
| Erro HTTP Gemini | ERROR | `gemini_http_error` |
| Falha na invocação | ERROR | `gemini_invoke_error` |

---

## 4. GCP Alerting — Configuração Operacional (LogMatch)

> [!WARNING]
> **⚠️ PENDÊNCIA OPERACIONAL**
>
> O GCP Alerting deve ser provisionado no Google Cloud Monitoring utilizando políticas baseadas em logs (`conditionMatchedLog`) a partir dos templates JSON em `monitoring/`.

### Templates Versionados em `monitoring/`

- `monitoring/alert-webhook-mp-errors.json` (Alerta Webhook MP)
- `monitoring/alert-preference-mp-errors.json` (Alerta Preferência MP)
- `monitoring/alert-backend-errors.json` (Alerta Backend Functions)

---

### ALERTA 1 — Erros HTTP 5xx no Webhook Mercado Pago

**Objetivo:** Detectar falhas de processamento de pagamento imediatamente.

**Tipo:** Log-based alert (LogMatch)  
**Filtro de log:**

```
resource.type="cloud_run_revision"
severity="ERROR"
jsonPayload.stage="paymentWebhookMercadoPago"
```

**Condição:** Disparo em tempo real (LogMatch)  
**Taxa de Notificação:** Máximo 1 a cada 300s (`notificationRateLimit`)  
**Auto-close:** 1800s  
**Severidade interna:** SEV-2 (pagamento crítico)  
**Arquivo:** `monitoring/alert-webhook-mp-errors.json`

---

### ALERTA 2 — Erros em createMercadoPagoPreference

**Objetivo:** Detectar falhas na criação de preferência antes do checkout.

**Tipo:** Log-based alert (LogMatch)  
**Filtro:**

```
resource.type="cloud_run_revision"
severity="ERROR"
jsonPayload.stage="createMercadoPagoPreference"
```

**Condição:** Disparo em tempo real (LogMatch)  
**Taxa de Notificação:** Máximo 1 a cada 300s (`notificationRateLimit`)  
**Auto-close:** 1800s  
**Severidade interna:** SEV-2  
**Arquivo:** `monitoring/alert-preference-mp-errors.json`

---

### ALERTA 3 — Exceções não tratadas em Cloud Functions

**Objetivo:** Detectar erros inesperados que escaparam dos catch blocks ou crashes de runtime nas Cloud Functions do FinControl.

**Tipo:** Log-based alert (LogMatch)  
**Filtro:**

```
resource.type="cloud_run_revision"
severity="ERROR"
resource.labels.service_name=~"^(paymentwebhookmercadopago|createmercadopagopreference|generateaimonthlybriefing|deleteuseraccount|reportclienterror)$"
```

**Condição:** Disparo em tempo real (LogMatch)  
**Taxa de Notificação:** Máximo 1 a cada 300s (`notificationRateLimit`)  
**Auto-close:** 1800s  
**Severidade interna:** SEV-2  
**Arquivo:** `monitoring/alert-backend-errors.json`  
*Nota: Validar os service_name reais no Cloud Logging antes de implantar.*

---

### Procedimento para Teste de Entrega do Canal de E-mail

Para comprovar a entrega sem provocar erros em produção financeira:
1. Criar política temporária com filtro sintético:
   `resource.type="global" jsonPayload.testEvent="FINCONTROL_ALERT_CHANNEL_TEST_2026"`
2. Emitir log sintético via Cloud Shell:
   `gcloud logging write fincontrol-ops-test '{"testEvent":"FINCONTROL_ALERT_CHANNEL_TEST_2026","message":"Synthetic alert delivery test"}' --payload-type=json --severity=ERROR --project=controle-de-cartao`
3. Confirmar recebimento do e-mail na caixa de entrada.
4. Excluir **somente** a política temporária de teste.

---

### ALERTA 4 — Latência anormal do Webhook (futuro)

**Objetivo:** Detectar lentidão na API do Mercado Pago.

**Tipo:** Métrica customizada (requer implementação de `custom.googleapis.com/webhook_latency_ms`)  
**Status:** Não implementado — aguarda volume suficiente para definir threshold confiável.

---

## 5. Consultas Cloud Logging Úteis

### Ver todos os pagamentos aprovados (últimas 24h)

```
resource.type="cloud_run_revision"
jsonPayload.result="pro_granted"
timestamp >= "2026-08-23T00:00:00Z"
```

### Ver todas as tentativas de IA sem opt-in

```
resource.type="cloud_run_revision"
jsonPayload.result="opt_in_missing"
```

### Ver falhas do webhook nas últimas 6h

```
resource.type="cloud_run_revision"
severity="ERROR"
jsonPayload.stage="paymentWebhookMercadoPago"
```

### Ver latência de chamadas ao Gemini

```
resource.type="cloud_run_revision"
jsonPayload.stage="generateAiMonthlyBriefing"
jsonPayload.result="success"
```

---

## 6. Frontend Error Reporting

O `ErrorBoundary` (`src/components/ErrorBoundary.jsx`) captura crashes de renderização React e emite telemetria anonimizada para a Cloud Function `reportClientError` (`functions/index.js`).

**Garantias de Privacidade e Resiliência:**
- Sanitização estrita contra tokens, e-mails ou PII (`sanitizeErrorMessage`).
- Rate limiting no cliente e no servidor (máximo 10 requisições/minuto por IP/UID).
- Exibição de UI de fallback graciosa no tema Carbon Black & Gold sem bloqueio da navegação.

---

## 7. Métricas Futuras

Quando o volume de usuários justificar:

| Métrica | Valor esperado | Sinal de alerta |
|---------|:-------------:|:---------------:|
| Taxa de aprovação MP | > 95% | < 90% |
| Webhooks processados/hora | variável | queda repentina > 50% |
| Latência média de Functions | < 2s | > 8s |
| Taxa de opt-in IA | crescente | reversão inesperada |

---

*Documento criado na Fase 6 — Production Readiness.*  
*Última atualização: 2026-08-24*
