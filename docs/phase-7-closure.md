# FinControl — Fase 7: Closure & Production Readiness Record

Este documento constitui o registro oficial, canônico e auditável do fechamento da **Fase 7 — Estabilização de Dependências, Modernização de Tooling e Production Readiness** do FinControl.

---

## 1. Final Status

- **Fase:** 7
- **Status:** `CLOSURE CANDIDATE` (Closure candidate pending documentation PR merge)
- **Data do Registro:** 2026-09-02
- **Ambiente de Produção:** `controle-de-cartao`

---

## 2. Canonical Baseline

- **Main Commit SHA:** `896981d1d0564cb46bae5480c7ed57936b8754c2`
- **CI de Referência:** Run ID `33620309154`
- **CI Conclusion:** `success`
- **Required Checks:**
  - `Lint · Unit Tests · Build` (success)
  - `E2E Browser · Playwright · Emulators` (success)
- **GitHub Ruleset:** `FinControl Main Protection` (Enforcement: `active`, Bypass Actors: `0`)
- **Runtime Oficial do Projeto:** Node 22 (`functions/package.json` engines.node = "22", CI com asserção estrita de Node 22)
- **GitHub Actions Modernizadas:** `actions/checkout@v7.0.1`, `actions/setup-node@v7.0.0`, `actions/upload-artifact@v7.0.1`, `actions/setup-java@v6.0.0`

---

## 3. Phase Inventory

| Subfase | Título / Escopo | Status Oficial |
| :--- | :--- | :---: |
| **7.1** | Remoção de dependências não utilizadas no frontend (`mercadopago`, `cors`) | **CLOSED** |
| **7.2** | Hardening de segurança backend, App Check, Rate Limiting e Cloud Billing | **CLOSED** |
| **7.3** | Consolidada nas subfases 7.5 e 7.6 | **NOT_DOCUMENTED** |
| **7.4** | Consolidada nas subfases 7.5 e 7.6 | **NOT_DOCUMENTED** |
| **7.5** | Frontend Quality: ESLint, estabilização de re-renders e hooks | **CLOSED** |
| **7.6** | Accessibility Hardening: conformidade WCAG 2.2 AA, foco, teclado e ARIA | **CLOSED** |
| **7.7** | Release & Staging Readiness: fail-closed preflight, manifest schema e emulators | **CLOSED** |
| **7.8** | Observability & Monitoring-as-Code: métricas, 5 alert policies ativas e drift guard | **CLOSED** |
| **7.9** | Tooling & Modernization: Actions v7, jsPDF 4.2.1, Flat Config e Fast Refresh zero warnings | **CLOSED** |
| **7.10** | Final Production Readiness Reconciliation & Documentation Closure | **CLOSURE IN PROGRESS** |

---

## 4. Quality Baseline

- **Root Lint:** `0 errors / 0 warnings` (`eslint . --max-warnings 0`)
- **Functions Lint:** `0 errors / 0 warnings`
- **Vitest Suite:** `328 passed / 13 skipped / 0 failed` (100% dos testes executados passaram)
  - Financial tests: `58 passed` ([`tests/financialService.test.js`](../tests/financialService.test.js))
  - Auth lifecycle tests: `14 passed` ([`tests/appContextSubscriptionLifecycle.test.js`](../tests/appContextSubscriptionLifecycle.test.js))
  - Cloud Functions tests: `46 passed` ([`tests/cloudFunctions.test.js`](../tests/cloudFunctions.test.js))
  - Firestore Rules tests: `35 passed` ([`tests/firestoreRules.test.js`](../tests/firestoreRules.test.js))
- **Production Build:** `PASS` (Vite build concluído sem dependências circulares ou erros de importação)
- **E2E Browser Suite:** `PASS` (Executado via Playwright com Firebase Emulators em projeto sintético)

---

## 5. Financial Integrity

- **Lógica Financeira Central:** [`src/services/financialService.js`](../src/services/financialService.js) mantido estritamente intocado no bloco de fechamento.
- **Invariantes Matemáticas:** Centavos inteiros preservados, soma de parcelas exata e Zero-Cent Drift aprovado.
- **Financial Integrity Index:** `100/100` (conforme índice homologado do projeto sustentado por 58 testes determinísticos).

---

## 6. App Check

- **Cloud Firestore:** `ENFORCED` (Comprovado ao vivo via App Check REST API)
- **Firebase Authentication:** `UNENFORCED` (Identity Platform)
- **Provedor Web:** reCAPTCHA Enterprise (`ReCaptchaEnterpriseProvider`)
- **Debug Tokens em Produção:** `0` (Zero tokens cadastrados em produção)
- **Superfície Excluída:** O webhook do Mercado Pago (`paymentWebhookMercadoPago`) **não** utiliza App Check por ser comunicação machine-to-machine externa, sendo protegido por assinatura criptográfica HMAC-SHA256 (`x-signature`) e validação de idempotência.

---

## 7. Firestore Rules

- **Local SHA-256:** `3d8eb82e81003e28ca106120eecd5717f582c6a2d7674dfe0e68d5b5070fd402`
- **Remote SHA-256:** `3d8eb82e81003e28ca106120eecd5717f582c6a2d7674dfe0e68d5b5070fd402`
- **Remote Ruleset:** `projects/controle-de-cartao/rulesets/bd3b0e6a-3dbc-4eb0-8e02-e288fb98d67f` (Release: `projects/controle-de-cartao/releases/cloud.firestore`)
- **Exact Match:** `true` (Conferência exata de conteúdo e hash do arquivo local [`firestore.rules`](../firestore.rules) contra produção)

---

## 8. Firestore Index Drift

- **Configuração Local:** 1 índice composto (`incomes`: `clientId ASC, date DESC`) + 1 TTL field override (`account_operations.expiresAt` com `ttl: true`).
- **Configuração Remota (Produção):** 2 índices compostos (`incomes`: `clientId ASC, date ASC` e `incomes`: `clientId ASC, date DESC`) + 1 TTL ativo.
- **Drift Mapeado:** 1 índice remoto adicional (`incomes: clientId ASC, date ASC`).
- **Classificação:** `ACCEPTED_KNOWN_DEBT`
- **Diretriz de Segurança:** O deploy de índices permanece intencionalmente bloqueado em [`docs/release-process.md`](release-process.md#43-firestore-indexes-deploy-gate) até que ocorra uma reconciliação formal, prevenindo a remoção acidental de índices compostos em produção.

---

## 9. Cloud Functions

### 9.1 Funções do Source Atual (Managed Backend)
Declaradas no código-fonte [`functions/index.js`](../functions/index.js) e operando em `nodejs22` (Cloud Functions v2):
1. `createMercadoPagoPreference` (`onCall`, maxInstances: 3, concurrency: 10)
2. `paymentWebhookMercadoPago` (`onRequest`, maxInstances: 3, concurrency: 20)
3. `deleteUserAccount` (`onCall`, maxInstances: 2, concurrency: 2)
4. `reportClientError` (`onCall`, maxInstances: 2, concurrency: 20)

### 9.2 Função de IA
- `generateAiMonthlyBriefing` (`onCall`): Declarada no código-fonte com fallback determinístico no frontend, porém **NÃO IMPLANTADA** em produção (`NOT DEPLOYED`).

### 9.3 Funções Legadas Órfãs (Unmanaged Backend)
Implantadas em 23/11/2025 em runtime `nodejs20` (Cloud Functions v2):
1. `fetchOwnerData` (`onRequest`)
2. `generateShareToken` (`onCall`)
3. `saveSharedInvoices` (`onRequest`)

**Evidência Operacional Coletada na Fase 7.10:**
- Requisições nos últimos 30 dias: **0**
- Requisições nos últimos 7 dias: **0**
- Chamadas a partir do frontend atual: **0**
- Presença no histórico Git deste repositório: **Inexistente** (recurso experimental antigo)
- Classificação de Drift: `ORPHANED_INACTIVE`

---

## 10. Accepted Operational Debt — Legacy Functions

As três funções legadas órfãs (`fetchOwnerData`, `generateShareToken`, `saveSharedInvoices`):
1. **Não bloqueiam o fechamento da Fase 7:** Não recebem tráfego, não consomem orçamento e não interferem na lógica do FinControl.
2. **Não devem ser excluídas de forma abrupta:** A política de produção exige aprovação explícita do operador antes de qualquer remoção de recurso em nuvem.
3. **Ação Recomendada:** `CONTROLLED_DELETE_AFTER_APPROVAL` — Agendar a deleção controlada dos serviços Cloud Run associados em etapa de manutenção pós-roadmap.
4. **Secret Associado:** O secret `JWT_SECRET` no Secret Manager deverá ser avaliado para depreciação **somente após** a remoção formal das três funções legadas.

---

## 11. Mercado Pago

- **SDK Pinned:** `mercadopago@2.8.0` (travado estritamente em `functions/package.json` e `functions/package-lock.json`).
- **Chamadas Reais:** Nenhuma chamada real à API do Mercado Pago foi realizada durante o ciclo de auditoria e fechamento (`false`).
- **Secrets no Secret Manager:** `MERCADOPAGO_ACCESS_TOKEN` e `MERCADOPAGO_WEBHOOK_SECRET` provisionados com versões ativas (payloads mantidos inacessados).

---

## 12. Gemini / Real AI

- **Chave de API:** `GEMINI_API_KEY` não está provisionada no Secret Manager de produção.
- **Status da Função:** `generateAiMonthlyBriefing` não está implantada.
- **Chamadas Reais:** `0` chamadas realizadas.
- **Mecanismo Ativo:** O frontend opera com fallback determinístico estrito em [`src/features/dashboard/ProSummary.jsx`](../src/features/dashboard/ProSummary.jsx) e [`src/components/ProAnalyticsCharts.jsx`](../src/components/ProAnalyticsCharts.jsx).

---

## 13. Cloud Billing

- **Status do Projeto:** `LIVE_VERIFIED` (Projeto `controle-de-cartao` vinculado a conta de faturamento ativa com `billingEnabled: true` comprovado com HTTP 200 via `cloudbilling.googleapis.com`).
- **Configuração de Budget:** `DOCUMENTED_ONLY` (Teto de R$ 25,00/mês com alertas em 50%, 90% e 100% de `CURRENT_SPEND` homologados na Fase 7.2.6; a leitura granular via REST API na conta raiz retornou HTTP 403 por exigir papel de Administrador de Faturamento da organização).

---

## 14. Cloud Monitoring

- **Log-Based Metrics:** `4 / 4` ativas em produção (`frontend_crash_count`, `preference_errors_count`, `rate_limit_rejections_count`, `webhook_processing_errors_count`).
- **Alert Policies:** `5 / 5` ativas no Cloud Monitoring com `enabled: true`.
- **Drift:** `NONE` (Mapeamento 1:1 validado contra [`monitoring/production-state.json`](../monitoring/production-state.json) e testado em [`tests/monitoringProductionState.test.js`](../tests/monitoringProductionState.test.js)).

---

## 15. Backup e Disaster Recovery

- **Mecanismo Principal:** **Firestore Native Scheduled Backups** (`backupSchedules/20403673-4b8e-4a20-adb9-11f483db7922`).
- **Periodicidade:** Diária automática na região `southamerica-east1`.
- **Retenção dos Backups:** 14 dias (`1209600s`).
- **Point-in-Time Recovery (PITR):** Ativo com retenção contínua de 7 dias (`604800s`).
- **Evidência Operacional de RPO:** Múltiplos backups em estado `READY` existentes, com o snapshot mais recente capturado dentro da janela de 24 horas, comprovando operacionalmente a meta de `RPO ≤ 24h`.
- **Documentação:** Atualizada e reconciliada em [`docs/disaster-recovery.md`](disaster-recovery.md).

---

## 16. Hosting

- **Versão Live em Produção:** `sites/controle-de-cartao/versions/fe669241db09ec67` (Release `1788163023285000`, status `FINALIZED`).
- **Deploy do Commit Atual:** `MAIN_DEPLOYED = false`
- **Classificação:** `PENDING_RELEASE / ACCEPTED_KNOWN_DEBT`
- **Diretriz Constitucional:** O encerramento da Fase 7 atesta a prontidão do código e das dependências para produção, mas **não autoriza nem executa deploy automático**. A promoção do Hosting seguirá o rito oficial de preflight e release manual.

---

## 17. Service Level Objectives (SLOs)

- **Fórmulas e Metas:** Formalizadas em [`docs/slo.md`](slo.md) para Hosting (99.9%), Frontend Funcional (99.5%), Functions 5xx-free (99.5%), Latência Crítica (95.0%) e Sessões Crash-Free (99.5%).
- **Janela Histórica:** A janela agregada contínua de 30 dias de telemetria completa em produção requer amadurecimento temporal contínuo.
- **Classificação:** `ACCEPTED_KNOWN_DEBT`

---

## 18. Deferred Post-Roadmap Items

Permanecem expressamente adiados para etapas posteriores ao roadmap:
1. **VIP Free Month:** Investigação e correção funcional do fluxo `activateFreeTrial` no Firestore.
2. **Aposentadoria de Funções Legadas:** Deleção controlada das 3 Cloud Functions órfãs (`fetchOwnerData`, `generateShareToken`, `saveSharedInvoices`) após homologação pelo operador.
3. **Depreciação de Secret:** Remoção de `JWT_SECRET` do Secret Manager após exclusão das funções legadas.
4. **Reconciliação de Índices do Firestore:** Alinhamento de `firestore.indexes.json` com o console GCP.
5. **Staging Dedicated Project:** Provisionamento do projeto em nuvem `controle-de-cartao-staging`.
6. **Redesign Visual:** Preservação estrita do Design System *Carbon Black & Gold*.
7. **Major Upgrades de Alto Risco:** Migrações de React 19, Recharts 3, Firebase 12/14, ESLint 9/10 e Vite 8 mantidas congeladas.

---

## 19. Declaração de Segurança

- `PRODUCTION_MUTATED = false`
- `DEPLOY_EXECUTED = false`
- `SECRETS_PAYLOAD_ACCESSED = false`
- `MERCADOPAGO_REAL_CALLED = false`
- `GEMINI_REAL_CALLED = false`
- `SOURCE_FILES_CHANGED = 0`
- `DOCUMENTATION_FILES_CHANGED = 2`
