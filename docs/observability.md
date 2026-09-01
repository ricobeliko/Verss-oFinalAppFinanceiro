# FinControl — Observabilidade de Produção & Arquitetura de Sinais

Este documento descreve a infraestrutura de observabilidade, inventário de sinais, telemetria de backend/frontend, auditoria de privacidade de logs, guardrails operacionais e monitoramento de produção do FinControl.

---

## 1. Camadas de Observabilidade

```text
┌───────────────────────────────────────────────────────────────────────┐
│                          Frontend (Browser)                           │
│  - ErrorBoundary (captura de crashes React em runtime)                │
│  - reportClientError (telemetria sanitizada com rate limit in-memory)  │
│  - IndexedDB Offline Sync Status (isStale, status de reconexão)       │
└───────────────────────────────────┬───────────────────────────────────┘
                                    │ HTTPS (onCall)
                                    ▼
┌───────────────────────────────────────────────────────────────────────┐
│                     Cloud Functions (Gen2 / Cloud Run)                │
│  - Structured JSON Logging (firebase-functions/logger)                │
│  - Stage, Result, UserHash (Pseudonimização), LatencyMs, ErrorCode    │
│  - Anti-Abuso / Rate Limit Logging (api_rate_limits, ai_rate_limits)  │
│  - Account Operation Lock Logging (CAS lease tokens)                  │
└───────────────────────────────────┬───────────────────────────────────┘
                                    │
                                    ▼
┌───────────────────────────────────────────────────────────────────────┐
│                      Google Cloud Observability                       │
│  - Cloud Logging (armazenamento e consulta estruturada de logs)       │
│  - Cloud Monitoring (métricas de latência, instâncias e throughput)   │
│  - Alert Policies (LogMatch / Metric Thresholds — candidato)          │
│  - Firebase App Check Monitoring (Token validation breakdown)         │
└───────────────────────────────────────────────────────────────────────┘
```

---

## 2. Inventário de Sinais Operacionais

| SINAL | FONTE (ORIGEM) | COLETADO HOJE? | ALERTA ATIVO? | SEVERIDADE | AÇÃO OPERACIONAL / OWNER |
| :--- | :--- | :---: | :---: | :---: | :--- |
| **Frontend fatal error (Crash)** | `ErrorBoundary.jsx` -> `reportClientError` | **SIM** ✅ | ⚠️ PENDENTE | **SEV-1 / SEV-2** | Investigar componente causador, acionar rollback se afetar > 0.5% sessões. |
| **ErrorBoundary activation volume** | `reportClientError` Cloud Function | **SIM** ✅ | ⚠️ PENDENTE | **SEV-2** | Avaliar regressão de UI ou anomalia em navegador específico. |
| **Authentication failures** | Firebase Auth Client / SDK | **SIM** ✅ (Console) | ❌ NÃO | **SEV-2 / SEV-3** | Verificar indisponibilidade regional do Identity Toolkit ou bloqueio de domínio. |
| **Firestore permission-denied** | `firestore.rules` (Cloud Logging) | **SIM** ✅ | ❌ NÃO | **SEV-2** | Auditar quebra de contrato no schema ou violação de isolamento por regra. |
| **App Check invalid / rejected** | Firebase App Check Metrics | **SIM** ✅ (Console) | ❌ NÃO | **SEV-2** | Auditar clientes desatualizados ou tráfego malicioso antes de enforcement. |
| **Cloud Function 5xx Internal** | Cloud Run Revision / Functions | **SIM** ✅ | ⚠️ PENDENTE | **SEV-2** | Identificar exceção não tratada, dependência externa ou bug de backend. |
| **Cloud Function 4xx abnormal rate** | Cloud Run HTTP logs | **SIM** ✅ | ❌ NÃO | **SEV-3** | Avaliar se é tentativa de abuso/brute force ou quebra de payload do cliente. |
| **Function Latency P95 Degradation** | Cloud Run Metrics / `latencyMs` | **SIM** ✅ | ❌ NÃO | **SEV-3** | Investigar degradação no upstream (Mercado Pago / Firestore). |
| **Function Instance Saturation** | Cloud Run Container Metrics | **SIM** ✅ | ❌ NÃO | **SEV-2** | Verificar enfileiramento ou necessidade de ajuste no `maxInstances`. |
| **Rate-Limit / Cooldown Rejection** | `reserveApiActionAttempt` logs | **SIM** ✅ | ❌ NÃO | **SEV-3** | Informação operacional de anti-abuso. Sem ação se pontual; investigar se massivo. |
| **Delete-Account Failure / Stall** | `deleteUserAccount` logs | **SIM** ✅ | ⚠️ PENDENTE | **SEV-2** | Verificar falha em lote de exclusão ou stale lock em `/account_operations`. |
| **Webhook Signature Invalid** | `paymentWebhookMercadoPago` logs | **SIM** ✅ | ⚠️ PENDENTE | **SEV-2** | Verificar expiração de segredo (`MERCADOPAGO_WEBHOOK_SECRET`) ou tentativa de ataque. |
| **Webhook Processing Failure (500)** | `paymentWebhookMercadoPago` logs | **SIM** ✅ | ⚠️ PENDENTE | **SEV-2** | Acionar Runbook 1, reconciliar pagamento manual via `admin.firestore()`. |
| **Payment Replay (Idempotency)** | `paymentWebhookMercadoPago` logs | **SIM** ✅ | ❌ NÃO | **INFO / SEV-3** | Operação normal de proteção contra duplicação de crédito. |
| **Firestore Read Volume Spike** | Cloud Firestore Metrics | **SIM** ✅ (Console) | ❌ NÃO | **SEV-3** | Investigar listener vazando no frontend (`onSnapshot` duplicado). |
| **Firestore Write Volume Spike** | Cloud Firestore Metrics | **SIM** ✅ (Console) | ❌ NÃO | **SEV-3** | Investigar loop de gravação ou atividade massiva de usuário. |

---

## 3. Telemetria e Estado por Cloud Function

| FUNÇÃO | ESTADO OPERACIONAL | TIPO | MEMÓRIA / TIMEOUT | INSTÂNCIAS / CONCORRÊNCIA | LOGGING ESTRUTURADO | SINAIS CHAVE |
| :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| `createMercadoPagoPreference` | **DEPLOYED ✅** | `onCall` (Gen2) | 256 MiB / 60s | max 3 / conc 10 | `stage`, `result`, `latencyMs`, `userHash` | `unauthenticated`, `invalid_argument`, `failed_precondition_email_unverified`, `rate_limited_*`, `success`, `error` |
| `paymentWebhookMercadoPago` | **DEPLOYED ✅** | `onRequest` (Gen2) | 256 MiB / 60s | max 3 / conc 20 | `stage`, `result`, `mpLatencyMs`, `paymentStatus` | `WEBHOOK_SIGNATURE_INVALID`, `WEBHOOK_BODY_QUERY_MISMATCH`, `idempotent_skip`, `pro_granted`, `pro_revoked`, `error` |
| `deleteUserAccount` | **DEPLOYED ✅** | `onCall` (Gen2) | 256 MiB / 60s | max 2 / conc 2 | `stage`, `result`, `userHash` | `ACCOUNT_DELETION_LOCKED`, `lock_acquisition_error`, `success`, `error` |
| `reportClientError` | **DEPLOYED ✅** | `onCall` (Gen2) | 256 MiB / 30s | max 2 / conc 20 | `stage`, `event`, `errorType`, `component`, `route` | `FRONTEND_ERROR_REPORTED`, in-memory sliding window rate limit |
| `generateAiMonthlyBriefing` | 🔒 **NOT DEPLOYED / PROVIDER DISABLED** | `onCall` (Gen2) | 256 MiB / 60s | max 2 / conc 5 | `stage`, `result`, `userHash`, `latencyMs` | `opt_in_missing`, `deterministic_fallback`, `gemini_http_error` (Recurso desativado em produção) |

---

## 4. Classificação Operacional de Erros: 4xx vs. 5xx

A infraestrutura de observabilidade não trata todo erro HTTP 4xx como um incidente. A distinção é estrita:

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                           4XX (Client Errors)                           │
│                                                                         │
│  [ESPERADOS / OPERAÇÃO NORMAL]                                          │
│  - 401 unauthenticated: Usuário deslogado tentando ação restrita       │
│  - 400 invalid_argument: Validação de formulário / parâmetros inválidos   │
│  - 429 resource-exhausted: Rate limit / cooldown ativo (anti-abuso)     │
│  - 401 WEBHOOK_SIGNATURE_INVALID: Assinatura externa inválida (scanners)│
│  - 405 method_not_allowed: Scanners fazendo GET no endpoint de webhook │
│                                                                         │
│  [POTENCIALMENTE ANORMAIS]                                              │
│  - Aumento súbito de 401/403/429 (> 10x do baseline histórico)          │
│  - Erro 400 recorrente após deploy de nova versão (quebra de schema)   │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                          5XX (Server Errors)                            │
│                                                                         │
│  [PRIORIDADE OPERACIONAL ALTA (SEV-1 / SEV-2)]                          │
│  - 500 Internal / Fail Closed: Falha em transação Firestore             │
│  - 500 Webhook Failure: Erro no processamento de pagamento do MP        │
│  - 500 Lock Acquisition Failure: Travamento em deleteUserAccount        │
│  - 504 Gateway Timeout: Upstream do Mercado Pago indisponível           │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Observabilidade de Pagamentos & Webhook Mercado Pago

O webhook do Mercado Pago (`paymentWebhookMercadoPago`) é o ponto de contato financeiro mais crítico do backend:

1. **Validação Criptográfica HMAC-SHA256:**
   - Sinais: `WEBHOOK_SIGNATURE_VALID`, `WEBHOOK_SIGNATURE_INVALID`, `WEBHOOK_SIGNATURE_MISSING`.
   - Manifest validado: `id:${normalizedDataId};request-id:${xRequestId};ts:${ts};` com comparação em tempo constante (`crypto.timingSafeEqual`).
2. **Proteção contra Body / Query Mismatch:**
   - Se `body.data.id` diferir de `query['data.id']`, emite `WEBHOOK_BODY_QUERY_MISMATCH` e rejeita imediatamente com HTTP 400.
3. **Idempotência de Processamento:**
   - Consulta `/users_fallback/{userId}/payments/{paymentId}` antes de conceder acesso Pro.
   - Eventos repetidos registram `result="idempotent_skip"` e retornam HTTP 200 sem reprocessamento.
4. **Sanitização Absoluta:**
   - **NUNCA** registrar em log: `MERCADOPAGO_ACCESS_TOKEN`, `MERCADOPAGO_WEBHOOK_SECRET`, string completa da assinatura HMAC, dados de cartão de crédito ou dados cadastrais completos do comprador.

---

## 6. Observabilidade de Rate Limits & Anti-Abuso

O sistema de rate limit (`functions/security/rateLimit.js`) opera via transações atômicas no Firestore (`api_rate_limits`):

- **Sinais Monitorados:**
  - `rate_limited_cooldown`: Tentativa antes de expirar o cooldown individual (ex: 15s).
  - `rate_limited_hourly`: Limite de chamadas por janela deslizante de 1 hora atingido (ex: máx 5/hora).
  - `rate_limited_inflight`: Concorrência simultânea bloqueada pelo lease token ativo.
  - `staleInFlightMs CAS Takeover`: Recuperação automática de lease abandonado/órfão após expiração do timeout (75s).
  - `fail_closed_error`: Falha de infraestrutura no Firestore ao reservar cota (aciona Fail-Closed seguro).

---

## 7. Observabilidade de Exclusão de Conta (`deleteUserAccount`)

A exclusão de conta sob diretrizes de LGPD/GDPR é um processo **sequencial, paginado em lotes de 500 documentos e não-atômico**:

- **Fases e Sinais Registrados:**
  1. `ACCOUNT_DELETION_LOCKED`: Verificação do lock persistente em `/account_operations/{userId}`.
  2. `lock_acquisition_error`: Falha ao registrar a operação no Firestore.
  3. `Batch Progression`: Exclusão paginada em lotes de até 500 documentos em todas as 9 subcoleções (`cards`, `loans`, `expenses`, `incomes`, `subscriptions`, `paidSubscriptions`, `clients`, `payments`, `audit_logs`).
  4. `Auth Deletion`: Exclusão do registro de autenticação via `admin.auth().deleteUser(userId)` como etapa final.
  5. `Lock Status Update`: Marcação do documento de lock como `completed` via Compare-and-Set (CAS).
- **Proteção de Dados:** Zero conteúdo de documentos deletados é emitido nos logs.
- **Risco de Falha Parcial:** Em caso de interrupção, o lock entra em estado `failed` ou expira via `staleThresholdMs` (75s), permitindo retomada idempotente sem duplicidade.

---

## 8. Observabilidade de App Check

- **Métricas do Console Firebase:**
  - `Verified Requests`: Requisições com token reCAPTCHA Enterprise válido.
  - `Outdated Client Requests`: Requisições de clientes com tokens antigos ou expirados.
  - `Unknown Origin Requests`: Requisições sem cabeçalho de token de App Check.
  - `Invalid Requests`: Requisições com token malformado ou adulterado.
- **Estado Operacional Atual:**
  - Cloud Firestore: **UNENFORCED** (Janela de observação de 24h em andamento para auditar tráfego legítimo antes do bloqueio).
  - Firebase Authentication: **OFF/UNSET**.
  - **Diretriz:** Nenhuma alteração de enforcement é permitida durante a fase de observação.

---

## 9. Telemetria Frontend & ErrorBoundary

O componente `ErrorBoundary` (`src/components/ErrorBoundary.jsx`) captura exceções de renderização no React e emite telemetria para `reportClientError`:

- **Whitelist Estrita de Dimensões:**
  - `errorType` (máx 50 chars)
  - `component` (máx 50 chars)
  - `route` (sanitizado com `:id` para IDs dinâmicos)
  - `correlationId` (UUID v4)
  - `userHash` (UID pseudonimizado)
  - `timestamp` (ISO 8601)
- **Sanitização de Mensagens (`sanitizeErrorMessage`):**
  - Regex substitui e-mails por `[EMAIL_REDACTED]`, cartões por `[CARD_REDACTED]` e bearer tokens por `[TOKEN_REDACTED]`.
- **Proteção contra Flooding:**
  - Rate limit no cliente (cooldown de 10s entre envios) e sliding window in-memory no backend (máximo 10 requisições/minuto por IP/UID).

---

## 10. Auditoria de Privacidade de Logs

| CAMPO / DADO | CLASSIFICAÇÃO | REGRA DE RETENÇÃO E LOGGING |
| :--- | :---: | :--- |
| `stage`, `result`, `errorType`, `errorCode` | **SAFE** ✅ | Metadados técnicos operacionais padrão. Permitido em todos os logs. |
| `latencyMs`, `httpStatus`, `timestamp` | **SAFE** ✅ | Métricas de desempenho e diagnóstico. Permitido. |
| `route`, `component`, `correlationId` | **SAFE** ✅ | Rastreabilidade contextual sem dados de usuário. Permitido. |
| `hashUid(userId)` | **PSEUDONYMIZED** 🔒 | SHA-256 slice (12 hex chars). **Classificado estritamente como PSEUDONIMIZAÇÃO** (não anonimização absoluta), permitindo correlação técnica sem expor o UID real. |
| `email`, `nome`, `telefone`, `IP completo` | **PII** ❌ | Estritamente proibido nos logs. Sanitizado ou omitido no ponto de emissão. |
| `MERCADOPAGO_ACCESS_TOKEN`, `GEMINI_API_KEY` | **SECRET** 🛑 | **NUNCA** logar. Guardados no GCP Secret Manager. |
| `MERCADOPAGO_WEBHOOK_SECRET`, `x-signature` | **SECRET** 🛑 | Segredos criptográficos. Proibido registrar valores brutos. |
| Números de cartão, CVV, senhas | **FINANCIAL_RAW_DATA** 🛑 | **NUNCA** coletados ou logados pelo FinControl. |
| Valores brutos de compras individuais | **FINANCIAL_RAW_DATA** 🛑 | Omitidos dos logs de telemetria; apenas métricas agregadas quando indispensável. |

---

## 11. O Problema Estatístico de Baixo Volume (Low-Volume Safeguards)

O FinControl opera em escala controlada de produção com volume moderado de requisições.

> [!WARNING]
> **O Perigo das Métricas Percentuais Isoladas em Baixo Volume:**
> Em uma janela de 5 minutos com apenas 2 requisições, **1 falha pontual representa uma taxa de erro de 50%**. Disparar alertas baseados unicamente em percentuais (`error_rate > 5%`) gerará alarmes falsos frequentes e fadiga operacional.

### Salvaguarda Operacional Obrigatória:
Todos os alertas e filtros de anomalia devem combinar:
$$\text{Condição de Disparo} = (\text{Taxa de Erro} \ge \text{Threshold}) \ \mathbf{AND} \ (\text{Volume Mínimo de Eventos} \ge N)$$
- Exemplo: Taxa de erro 5xx > 5% **E** pelo menos 5 falhas observadas em uma janela de 5 minutos.

---

## 12. Observabilidade de Custos & Guardrails de Infraestrutura

### Fontes de Custo Mapeadas:
1. **Cloud Firestore:** Operações de leitura (reads), escrita (writes), exclusão (deletes) e armazenamento de documentos.
2. **Cloud Functions (Gen2 / Cloud Run):** Quantidade de invocações, tempo de CPU/memória alocado (GB-segundos / vCPU-segundos) e tráfego de rede de saída (egress).
3. **Firebase Hosting:** Armazenamento de builds e transferência de banda de rede.
4. **Firebase App Check / reCAPTCHA Enterprise:** Verificações de token de segurança.
5. **Cloud Logging:** Volume de ingestão de logs estruturados (acima da cota gratuita de 50 GB/mês).

> [!NOTE]
> **Custo Real Atual:** `UNKNOWN / NEEDS CLOUD MEASUREMENT` (requer leitura do painel de Cloud Billing no GCP Console).

### Guardrails de Infraestrutura Existentes:
- `maxInstances: 3` (Preferência MP e Webhook) / `maxInstances: 2` (Exclusão de conta, report de erros e IA).
- `concurrency: 10 a 20` requisições por container.
- `timeoutSeconds: 30 a 60s`.

> [!IMPORTANT]
> `maxInstances` é um teto de concorrência para prevenir saturação de conexões e cold starts descontrolados, **NÃO constitui um teto orçamentário rígido (hard spending cap)**. O risco operacional em picos extremos inclui enfileiramento de requisições, rejeições HTTP 429 e backlog de retentativas do webhook.

---

## 13. Sinais de Backup & Disaster Recovery (DR)

- **Metas Operacionais Suportadas:**
  - **RPO Alvo:** $\le 24\text{h}$ (via backup diário às 03:00 BRT) / $\approx 1\text{min}$ (via Point-in-Time Recovery - PITR nos últimos 7 dias, se ativo no projeto).
  - **RTO Alvo:** $\le 2\text{ horas}$ para restauração e validação de integridade.
- **Sinais de Monitoramento:**
  - Falha na execução do agendamento de backup (`Cloud Scheduler / Firestore scheduled backup`).
  - Idade do último backup válido $> 26\text{ horas}$.
  - Status do Restore Drill Trimestral (realizado obrigatoriamente em database isolado `restore-drill-YYYYMMDD`, nunca em produção).

---

## 14. Plano de Prova de Volume Futura (Volume Test Plan)

A validação de limites e saturação de infraestrutura será conduzida exclusivamente em ambiente isolado:

- **Ambiente Obrigatório:** Firebase Emulator Suite local ou projeto dedicado de staging.
- **Proibição Absoluta:** **NUNCA** executar testes de carga contra o projeto `controle-de-cartao` em produção.
- **Cenários do Plano de Carga:**
  1. *Concurrent Reads Stress:* 100 usuários simultâneos consultando dados de cartões e faturas.
  2. *Concurrent Writes & Idempotency:* 20 chamadas simultâneas de webhook simulando concorrência no mesmo `paymentId`.
  3. *Rate Limit Threshold Boundaries:* Disparos em rajada para validar rejeição determinística de `COOLDOWN_ACTIVE` e `HOURLY_LIMIT_EXCEEDED`.
  4. *Listener Churn & Unmount Stress:* 50 montagens/desmontagens rápidas de componentes para auditar limpeza de inscrições no `firestoreSubscriptionRegistry`.
  5. *Batch Deletion Load:* Exclusão de contas com 2.500 documentos distribuídos em subcoleções (5 lotes de 500 docs).
- **Condições de Parada Imediata (Stop Conditions):**
  - Uso de CPU > 90% contínuo por > 30s.
  - Vazamento de memória (heap exhaustion / OOM).
  - Taxa de erro > 5%.
  - Latência P95 > 5.000ms.
