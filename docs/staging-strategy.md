# FinControl — Estratégia de Staging & Preview Channels

Este documento estabelece o modelo oficial de homologação, testes intermediários e segurança para publicação de novas versões do FinControl.

---

## 1. Mapeamento de Ambientes

```text
STAGING_FIREBASE_PROJECT: NOT AVAILABLE
```

> [!IMPORTANT]
> **O FinControl não possui um projeto Firebase secundário ou exclusivo para Staging.**
> O único projeto de nuvem existente é `controle-de-cartao` (Produção).
> Qualquer tentativa de criar projetos ou recursos na nuvem sem autorização expressa é proibida.

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
