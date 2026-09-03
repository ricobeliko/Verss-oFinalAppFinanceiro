# FinControl — Estratégia de Staging & Preview Channels

Este documento estabelece o modelo oficial de homologação, testes intermediários e segurança para publicação de novas versões do FinControl.

---

## 1. Mapeamento de Ambientes

```text
STAGING_FIREBASE_PROJECT: fincontrol-teste-cartao
STAGING_PROJECT_STATUS: OPERATIONAL_WITH_FIRST_FUNCTION
STAGING_RULES: DEPLOYED
STAGING_HOSTING: DEPLOYED
STAGING_BILLING: BLAZE
STAGING_ALERT_BUDGET: BRL_10_ACTIVE
STAGING_SPEND_CAP: BRL_10_CLOUD_RUN_FUNCTIONS_ACTIVE
STAGING_FUNCTIONS: reportClientError_ONLY
STAGING_APP_CHECK: CONFIGURED
REPORT_CLIENT_ERROR_APP_CHECK: ENFORCED
REPORT_CLIENT_ERROR_REPLAY_PROTECTION: NOT_ENABLED
STAGING_ARTIFACT_CLEANUP: 1_DAY
STAGING_REAL_DATA: NONE
STAGING_EXTERNAL_PAID_APIS: DISABLED
ENVIRONMENT_BUILD_GUARD: IMPLEMENTED
```

> [!IMPORTANT]
> **Ambiente de Staging Operacional & Primeira Function Ativa (Fase 8.2 Change Set 9):**
> O projeto `fincontrol-teste-cartao` é o ambiente isolado oficial de testes do FinControl, acessível em `https://fincontrol-teste-cartao.web.app`.
>
> **Estado Operacional e Guardrails Ativos:**
> - **Faturamento & Proteção Financeira:** Plano Blaze vinculado a conta dedicada isolada com **Budget de Alerta de R$ 10,00/mês** (50%, 90%, 100%) e **Spend Cap de R$ 10,00** para Cloud Run Functions.
> - **Primeira Cloud Function:** `reportClientError` (Gen2, Node.js 22, `southamerica-east1`, 256MiB, timeout 30s, maxInstances=2, concurrency=20).
> - **App Check:** Registrado para o Web App de staging. Na Cloud Function `reportClientError`, o App Check está **estritamente enforced no backend** (`enforceAppCheck: true`), comprovado por teste negativo com rejeição HTTP 401 UNAUTHENTICATED. *Nota: Não há enforcement global declarado em outros recursos do projeto*. Replay protection (`consumeAppCheckToken`) não está ativado.
> - **Otimização de Custos de Armazenamento:** Política de limpeza do Artifact Registry (`southamerica-east1`) ativa com retenção de **1 dia** para imagens transitórias de build.
> - **Firestore Rules & Hosting:** Rules canônicas idênticas à produção e frontend staging compilado via `npm run build:staging`.
>
> **Limitações Críticas do Staging:**
> O ambiente de staging **AINDA NÃO replica a produção totalmente**. Permanecem rigorosamente **fora de escopo e não implantados**:
> 1. `deleteUserAccount` (não implantada em staging)
> 2. `createMercadoPagoPreference` (não implantada em staging)
> 3. `paymentWebhookMercadoPago` (não implantada em staging)
> 4. `generateAiMonthlyBriefing` (não implantada em staging)
> 5. Integrações de pagamento reais do Mercado Pago (desabilitadas)
> 6. Chamadas à API Gemini (desabilitadas)
> 7. Replay protection de App Check
>
> **Owner Cost Policy:**
> - `STRICT_LOW_COST = true`
> - Qualquer nova Function ou recurso com potencial de custo: **REQUIRES_OWNER_APPROVAL**.
> - O projeto `controle-de-cartao` permanece intocado como ambiente único e exclusivo de Produção.

---

## 2. Estratégia de Validação em Três Níveis

Para garantir segurança máxima sem comprometer a estabilidade de produção, o ciclo de qualidade do FinControl adota uma arquitetura em 3 níveis bem delimitados:

```text
┌────────────────────────────────────────────────────────┐
│  LEVEL 1: Local & CI Emulator Suite (Mutações Livres)  │
│  - Firestore, Auth, Functions Emulators locais          │
│  - Testes E2E com Playwright & concorrência            │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│  LEVEL 2: Hosting Preview Channel (Estritamente Read)  │
│  - Validação de layout, rotas, lazy loading, CSP      │
│  - Zero transações financeiras / Zero Mercado Pago     │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│  LEVEL 3: Produção Pós-Deploy (Smoke Controlado)       │
│  - Validação de SHA, CDN, ErrorBoundary ausente        │
│  - Observabilidade e monitoramento em tempo real       │
└────────────────────────────────────────────────────────┘
```

---

## 3. Matriz de Testes por Nível

| Nível | Ambiente | Escopo de Testes Permitido | Mutações / Writes |
| :--- | :--- | :--- | :---: |
| **LEVEL 1 (Local / CI)** | Emuladores Firebase (`demo-fincontrol-e2e`) | - Testes unitários (`npm test`)<br>- Concorrência real de lease e rate limits<br>- Write paths de cartões, compras, despesas e receitas<br>- Exclusão de contas e isolamento entre usuários | ✅ Permitido |
| **LEVEL 2 (Preview Channel)** | Firebase Hosting Preview (`--expires-in 2h`) | - Smoke visual da Landing Page e telas de Auth<br>- Carregamento de chunks lazy do Vite<br>- Validação de cabeçalhos de segurança e CSP<br>- Troca de tokens App Check<br>- Acessibilidade e navegação por teclado | ❌ **PROIBIDO** (Read-Only) |
| **LEVEL 3 (Produção Live)** | `controle-de-cartao.web.app` | - Status HTTP 200 e validação de SHA256 do `index.html`<br>- Carregamento do Dashboard sem acionamento de `ErrorBoundary`<br>- Auditoria de telemetria no Cloud Logging | 🔒 Apenas smoke do operador |

---

## 4. Regras e Restrições de Preview Channels (Level 2)

> [!CAUTION]
> **Preview Hosting != Backend Isolado.**
> Se o build do Preview Channel apontar para os serviços de produção (`controle-de-cartao`), qualquer escrita no frontend refletirá no banco de dados real.

Portanto, em qualquer sessão de teste em **Preview Channel**, é **TERMINANTEMENTE PROIBIDO**:
1. Executar pagamentos ou checkout de planos.
2. Chamar a Cloud Function `createMercadoPagoPreference`.
3. Executar o fluxo de exclusão de conta real (`deleteUserAccount`).
4. Criar, editar ou deletar movimentações financeiras de clientes reais.
5. Alterar metas globais ou configurações de sistema.

---

## 5. Environment Build Guard & Fail-Closed Isolation (Fase 8.2)

Para prevenir contaminação cruzada de dados, o FinControl implementa validação determinística de ambiente pré-build em `scripts/validate-firebase-environment.mjs` com as seguintes invariantes inegociáveis:

1. **Invariante de Produção:**
   - Exige estritamente `VITE_FIREBASE_PROJECT_ID === "controle-de-cartao"`.
   - Rejeita qualquer tentativa de build de produção com emuladores ativos (`VITE_USE_FIREBASE_EMULATOR === true`).
   - Se qualquer condição falhar, o build é abortado com código de saída 1 (*Fail-Closed*).

2. **Invariante de Staging:**
   - Exige que `VITE_FIREBASE_PROJECT_ID` seja não vazio.
   - **Bloqueio Absoluto:** Proíbe terminantemente `VITE_FIREBASE_PROJECT_ID === "controle-de-cartao"` (impede que um build de staging aponte para o banco de dados de produção).
   - Proíbe `VITE_FIREBASE_PROJECT_ID === "demo-fincontrol-e2e"` (staging requer projeto real em nuvem, não emulador local).
   - Rejeita emuladores ativos em builds de staging.

3. **Invariante Local / CI:**
   - O projeto sintético `demo-fincontrol-e2e` só é permitido quando `VITE_USE_FIREBASE_EMULATOR === true`.

```bash
# Execuções seguras com validação fail-closed
npm run build:production  # Valida produção antes de vite build --mode production
npm run build:staging     # Valida isolamento de staging antes de vite build --mode staging
npm run build             # Build padrão preservado para CI
```
