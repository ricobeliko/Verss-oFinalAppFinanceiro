# FinControl — Monitoring-as-Code & Production Observability Guide

Este diretório gerencia a infraestrutura de observabilidade e alertas do FinControl no Google Cloud Monitoring, estruturado em duas camadas rigorosamente separadas: **Versioned Template State** (templates de infraestrutura como código seguros para versionamento) e **Current Production State** (estado real em operação).

---

## 1. Versioned Template State (Safe-by-Default Templates)

Os arquivos versionados neste diretório (`monitoring/*.json` e `monitoring/metrics/*.json`) constituem a especificação canônica e segura para provisionamento e evolução contínua da observabilidade:

- **Safe-by-Default:** Todos os templates de políticas mantêm `enabled: false` para evitar ativações automáticas indevidas durante execuções de automação de pré-deploy.
- **Canal de Notificação Desacoplado:** Os templates utilizam o placeholder padrão `"NOTIFICATION_CHANNEL_ID_REQUIRED_AT_DEPLOY_TIME"`. Nenhum identificador de recurso de canal de notificação ou dado sensível (como endereços de e-mail) é fixado nos templates versionados.
- **Zero Secrets / Zero PII:** Nenhum token, chave de API ou dado de identificação pessoal faz parte dos descritores.
- **Aplicação Deliberada:** A implantação de qualquer template requer intervenção explícita de operador via CLI autenticada com resolução de variáveis de ambiente.

---

## 2. Current Production State (Estado Operacional Validado na Fase 7.8.3)

O projeto de produção `controle-de-cartao` opera atualmente com a stack completa de observabilidade e políticas de alerta ativas, conforme registrado em `monitoring/production-state.json`:

### Canal de Notificação Operacional
- **Display Name:** `FinControl Operações`
- **Tipo:** `email`
- **Status:** `enabled: true`

### Métricas Baseadas em Logs Provisionadas (4 Métricas)
1. `webhook_processing_errors_count` (DELTA, INT64): Falhas 5xx críticas de processamento em `paymentWebhookMercadoPago`.
2. `preference_errors_count` (DELTA, INT64): Falhas internas/upstream em `createMercadoPagoPreference` (allowlist estrita: `fail_closed_error` e `error`; excluindo `invalid_argument`, `unauthenticated`, `failed_precondition` e `rate_limited_*`).
3. `frontend_crash_count` (DELTA, INT64): Falhas fatais de renderização registradas pelo `ErrorBoundary` via `reportClientError`.
4. `rate_limit_rejections_count` (DELTA, INT64): Rejeições agregadas por limite de taxa e cooldown ativo em Cloud Functions (`result=~"^rate_limited"`).

### Políticas de Alerta Ativas em Produção (5 Políticas — Todas `enabled: true`)
| NOME DA POLÍTICA | RESOURCE ID | TIPO DE CONDIÇÃO | THRESHOLD OPERACIONAL | SEVERIDADE | RUNBOOK ASSOCIADO |
| :--- | :--- | :---: | :---: | :---: | :--- |
| **Backend Critical Errors** | `12435886503438713935` | Single Event (`conditionMatchedLog`) | $\ge 1$ falha inesperada | **SEV-2** | [Runbook 3](../docs/incident-response.md#runbook-3-firestore-rules-bloqueando-usuários-legítimos) |
| **Webhook Mercado Pago Errors** | `16070910205452193166` | Metric Threshold (`conditionThreshold`) | $\ge 2$ falhas em 5 min | **SEV-2** | [Runbook 1](../docs/incident-response.md#runbook-1-webhook-do-mercado-pago-falhando--rejeições-500) |
| **Mercado Pago Preference Errors** | `7325912833265943606` | Metric Threshold (`conditionThreshold`) | $\ge 3$ falhas em 5 min | **SEV-2** | [Runbook 1](../docs/incident-response.md#runbook-1-webhook-do-mercado-pago-falhando--rejeições-500) |
| **Frontend Crash Spike** | `15578765959110476833` | Metric Threshold (`conditionThreshold`) | $\ge 5$ crashes em 5 min | **SEV-2** | [Runbook 4](../docs/incident-response.md#runbook-4-deploy-frontend-quebrado--rollback-imediato) |
| **Rate Limit Flood & Abuse** | `14951649493746072121` | Metric Threshold (`conditionThreshold`) | $\ge 30$ rejeições em 5 min | **SEV-3** | [Runbook 2](../docs/incident-response.md#runbook-2-firebase-authentication-indisponível) |

---

## 3. Verificação Contínua de Drift (Read-Only Drift Guard)

Para garantir que a infraestrutura provisionada no Google Cloud não sofra desvios não autorizados em relação à especificação canônica, o repositório disponibiliza o utilitário:

```bash
bash scripts/monitoring/verifyProductionState.sh
```

Este script executa **estritamente comandos read-only** (`gcloud logging metrics describe`, `gcloud monitoring policies describe/list`) e valida métricas, tipos, filtros, thresholds e canais contra `monitoring/production-state.json`.
