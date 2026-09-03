# FinControl — Estratégia de Staging & Preview Channels

Este documento estabelece o modelo oficial de homologação, testes intermediários e segurança para publicação de novas versões do FinControl.

---

## 1. Mapeamento de Ambientes

```text
STAGING_FIREBASE_PROJECT: fincontrol-teste-cartao
STAGING_PROJECT_STATUS: PROVISIONED_CORE
STAGING_BILLING: NOT_LINKED
STAGING_FUNCTIONS: NOT_DEPLOYED
STAGING_APP_CHECK: NOT_CONFIGURED
ENVIRONMENT_BUILD_GUARD: IMPLEMENTED
```

> [!IMPORTANT]
> **Ambiente de Staging Dedicado Provisionado (Fase 8.2 Change Set 3):**
> O projeto `fincontrol-teste-cartao` foi criado como ambiente isolado de testes e homologação em nuvem.
> **Estado Atual:** A infraestrutura de base (Firestore Native `(default)` em `southamerica-east1`, Web App, Authentication Email/Password e Hosting) está provisionada.
> **Aviso de Limitação:** O ambiente de staging **AINDA NÃO replica totalmente a produção**: Billing/Blaze não está vinculado, Cloud Functions v2 não foram implantadas, App Check não foi configurado e integrações externas (Mercado Pago e Gemini) estão desligadas. O projeto `controle-de-cartao` permanece intocado como ambiente único de Produção.

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
