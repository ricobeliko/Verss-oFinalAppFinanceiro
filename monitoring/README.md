# FinControl — Monitoring-as-Code Catalog & Deployment Guide

Este diretório contém os templates versionados das políticas de alerta do Google Cloud Monitoring e descritores de métricas baseadas em logs (Log-Based Metrics) para o FinControl.

---

## 1. Estado Operacional Atual

> [!IMPORTANT]
> **Status dos Templates:** `PROPOSED CONFIGURATION (NOT DEPLOYED)`.
> Nenhuma política de alerta ou métrica foi criada no projeto `controle-de-cartao` nesta fase documental. A implantação no GCP requer a substituição prévia do canal de notificação.

---

## 2. Categorização Semântica dos Alertas

O FinControl classifica suas políticas de alerta em duas categorias semânticas estritas:

### Categoria A: Alertas de Evento Único (Single Event LogMatch)
- **Mecanismo:** `conditionMatchedLog` (disparo imediato no primeiro evento de log correspondente).
- **Caso de Uso:** Operações críticas onde uma única falha inesperada de infraestrutura já justifica investigação imediata (ex: erro inesperado de backend em `deleteUserAccount`).
- **Nota sobre `notificationRateLimit`:** O campo `notificationRateLimit` controla apenas o intervalo mínimo entre notificações para evitar tempestades de alertas; ele **NÃO** realiza contagem agregada de eventos por janela temporal.

### Categoria B: Alertas de Contagem e Taxa Agregada (Metric Threshold)
- **Mecanismo:** Log-Based Metric (`monitoring/metrics/*.json`) + Cloud Monitoring Policy (`conditionThreshold` com `alignmentPeriod: "300s"` e `perSeriesAligner: "ALIGN_SUM"`).
- **Caso de Uso:** Políticas com salvaguarda de baixo volume que exigem $\ge N$ falhas em uma janela de 5 minutos (ex: $\ge 2$ falhas no webhook, $\ge 3$ na preferência MP, $\ge 5$ crashes no frontend, $\ge 30$ rejeições de rate limit).

---

## 3. Catálogo de Políticas e Métricas

| ARQUIVO DE POLÍTICA | MÉTRICA BASEADA EM LOGS | TIPO / SEMÂNTICA | THRESHOLD OPERACIONAL | SEVERIDADE | RUNBOOK ASSOCIADO |
| :--- | :--- | :---: | :---: | :---: | :--- |
| `alert-webhook-mp-errors.json` | `metrics/webhook-processing-errors-count.json` | **Categoria B** (Metric Threshold) | $\ge 2$ falhas em 5 min | **SEV-2** | [Runbook 1](../docs/incident-response.md#runbook-1-webhook-do-mercado-pago-falhando--rejeições-500) |
| `alert-preference-mp-errors.json` | `metrics/preference-errors-count.json` | **Categoria B** (Metric Threshold) | $\ge 3$ falhas em 5 min | **SEV-2** | [Runbook 1](../docs/incident-response.md#runbook-1-webhook-do-mercado-pago-falhando--rejeições-500) |
| `alert-frontend-crashes.json` | `metrics/frontend-crash-count.json` | **Categoria B** (Metric Threshold) | $\ge 5$ crashes em 5 min | **SEV-2** | [Runbook 4](../docs/incident-response.md#runbook-4-deploy-frontend-quebrado--rollback-imediato) |
| `alert-rate-limit-flood.json` | `metrics/rate-limit-rejections-count.json` | **Categoria B** (Metric Threshold) | $\ge 30$ rejeições em 5 min | **SEV-3** | [Runbook 2](../docs/incident-response.md#runbook-2-firebase-authentication-indisponível) |
| `alert-backend-errors.json` | N/A (LogMatch direto) | **Categoria A** (Single Event) | $\ge 1$ falha inesperada | **SEV-2** | [Runbook 3](../docs/incident-response.md#runbook-3-firestore-rules-bloqueando-usuários-legítimos) |

---

## 4. Auditoria de Cardinalidade e Privacidade

- **Zero High-Cardinality Labels:** Nenhuma métrica baseada em logs utiliza `userId`, `userHash`, `paymentId`, strings de mensagem de erro ou URLs arbitrárias como labels métricos. Todos os descritores operam com cardinalidade zero/mínima (`unit: "1"`).
- **Zero Secrets / Zero PII:** Nenhum token, credencial, chave de API ou e-mail está presente nos templates ou filtros.
- **Resource Type:** Todos os filtros utilizam `resource.type="cloud_run_revision"`, compatível com Cloud Functions Gen2.
- **Placeholder de Notificação:** Todos os templates utilizam estritamente `"NOTIFICATION_CHANNEL_ID_REQUIRED_AT_DEPLOY_TIME"`.

---

## 5. Guia de Implantação e Remoção (Comandos Estáveis)

### Passo 1: Criar as Métricas Baseadas em Logs (Categoria B)
```bash
gcloud logging metrics create webhook_processing_errors_count \
  --config-from-file=monitoring/metrics/webhook-processing-errors-count.json \
  --project=controle-de-cartao

gcloud logging metrics create preference_errors_count \
  --config-from-file=monitoring/metrics/preference-errors-count.json \
  --project=controle-de-cartao

gcloud logging metrics create frontend_crash_count \
  --config-from-file=monitoring/metrics/frontend-crash-count.json \
  --project=controle-de-cartao

gcloud logging metrics create rate_limit_rejections_count \
  --config-from-file=monitoring/metrics/rate-limit-rejections-count.json \
  --project=controle-de-cartao
```

### Passo 2: Substituir o Canal de Notificação e Criar as Políticas de Alerta
```bash
# 1. Identificar o ID do canal de notificação
gcloud monitoring channels list --project=controle-de-cartao

# 2. Aplicar a política com o ID real
sed 's|NOTIFICATION_CHANNEL_ID_REQUIRED_AT_DEPLOY_TIME|projects/controle-de-cartao/notificationChannels/YOUR_CHANNEL_ID|g' \
  monitoring/alert-webhook-mp-errors.json > /tmp/deploy-policy.json

gcloud monitoring policies create \
  --policy-from-file=/tmp/deploy-policy.json \
  --project=controle-de-cartao
```

### Passo 3: Remoção / Rollback de Políticas e Métricas
```bash
# Excluir política de alerta
gcloud monitoring policies delete POLICY_ID --project=controle-de-cartao

# Excluir métrica baseada em logs
gcloud logging metrics delete METRIC_NAME --project=controle-de-cartao
```
