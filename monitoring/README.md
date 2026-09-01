# FinControl — Monitoring-as-Code Catalog & Deployment Guide

Este diretório contém os templates JSON versionados das políticas de alerta do Google Cloud Monitoring para o FinControl.

---

## 1. Estado Operacional Atual

> [!IMPORTANT]
> **Status dos Templates:** `PROPOSED CONFIGURATION (NOT DEPLOYED)`.
> Nenhuma política de alerta foi criada no projeto `controle-de-cartao` nesta fase documental. A criação de políticas no GCP requer a substituição prévia do canal de notificação.

---

## 2. Catálogo de Políticas de Alerta

| ARQUIVO | POLÍTICA (DISPLAY NAME) | SINAL DE ORIGEM | SEVERIDADE | STATUS | RUNBOOK ASSOCIADO |
| :--- | :--- | :--- | :---: | :---: | :--- |
| `alert-webhook-mp-errors.json` | Webhook Mercado Pago Errors | `paymentWebhookMercadoPago` AND `severity="ERROR"` | **SEV-2** | CANDIDATE | [Runbook 1](file:///c:/Users/Sibelly/OneDrive/Documentos/Projetos/Verss-oFinalAppFinanceiro/docs/incident-response.md#runbook-1-webhook-do-mercado-pago-falhando--rejeições-500) |
| `alert-preference-mp-errors.json` | Mercado Pago Preference Errors | `createMercadoPagoPreference` AND `severity="ERROR"` | **SEV-2** | CANDIDATE | [Runbook 1](file:///c:/Users/Sibelly/OneDrive/Documentos/Projetos/Verss-oFinalAppFinanceiro/docs/incident-response.md#runbook-1-webhook-do-mercado-pago-falhando--rejeições-500) |
| `alert-backend-errors.json` | Backend Critical Errors | `deleteuseraccount` / `reportclienterror` runtime exceptions | **SEV-2** | CANDIDATE | [Runbook 3](file:///c:/Users/Sibelly/OneDrive/Documentos/Projetos/Verss-oFinalAppFinanceiro/docs/incident-response.md#runbook-3-firestore-rules-bloqueando-usuários-legítimos) |
| `alert-frontend-crashes.json` | Frontend Crash Spike | `FRONTEND_ERROR_REPORTED` via `ErrorBoundary` | **SEV-2** | CANDIDATE | [Runbook 4](file:///c:/Users/Sibelly/OneDrive/Documentos/Projetos/Verss-oFinalAppFinanceiro/docs/incident-response.md#runbook-4-deploy-frontend-quebrado--rollback-imediato) |
| `alert-rate-limit-flood.json` | Rate Limit Flood & Abuse | `result=~"^rate_limited"` em Cloud Functions | **SEV-3** | CANDIDATE | [Runbook 2](file:///c:/Users/Sibelly/OneDrive/Documentos/Projetos/Verss-oFinalAppFinanceiro/docs/incident-response.md#runbook-2-firebase-authentication-indisponível) |

---

## 3. Instruções de Implantação e Substituição de Placeholder

Todos os templates utilizam o placeholder explícito:
`"NOTIFICATION_CHANNEL_ID_REQUIRED_AT_DEPLOY_TIME"`

### Passo a Passo para Implantação Futura:

1. **Identificar o Resource Name do Canal de Notificação:**
   ```bash
   gcloud monitoring channels list --project=controle-de-cartao
   # Exemplo de saída: projects/controle-de-cartao/notificationChannels/1234567890123456
   ```

2. **Substituir o Placeholder e Criar a Política:**
   ```bash
   sed 's|NOTIFICATION_CHANNEL_ID_REQUIRED_AT_DEPLOY_TIME|projects/controle-de-cartao/notificationChannels/YOUR_CHANNEL_ID|g' \
     monitoring/alert-webhook-mp-errors.json > /tmp/deploy-policy.json

   gcloud alpha monitoring policies create \
     --policy-from-file=/tmp/deploy-policy.json \
     --project=controle-de-cartao
   ```

3. **Comando de Rollback / Exclusão de Política:**
   ```bash
   gcloud alpha monitoring policies delete POLICY_ID --project=controle-de-cartao
   ```

---

## 4. Salvaguardas e Auditoria de Privacidade

- **Zero Secrets / Zero PII:** Nenhum token, credencial, chave de API ou e-mail está presente nos templates.
- **Resource Type:** Todos os alertas de backend filtram `resource.type="cloud_run_revision"`, compatível com Cloud Functions Gen2.
- **Auto-Close:** Intervalo padrão de `1800s` (30 minutos) para auto-resolução de incidentes transitórios.
- **Notification Rate Limit:** Limite de 1 notificação a cada `300s` (5 minutos) para evitar tempestades de alertas.
