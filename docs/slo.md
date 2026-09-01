# FinControl — Service Level Objectives (SLOs) & Gestão de Error Budget

Este documento define os Indicadores de Nível de Serviço (SLIs), Objetivos de Nível de Serviço (SLOs), Orçamentos de Erro (*Error Budgets*), prontidão de medição e o desenho de alertas operacionais do FinControl.

---

## 1. Princípios e Distinções Fundamentais

```text
┌─────────────────────────────────────────────────────────────────────────┐
│  SLI (Service Level Indicator)                                          │
│  "O que medimos em tempo real" — A métrica quantitativa observada.      │
│  Exemplo: % de requisições atendidas com sucesso ou dentro do SLA.      │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  SLO (Service Level Objective)                                          │
│  "A meta interna de confiabilidade que a engenharia se compromete"      │
│  Exemplo: 99.5% de sucesso em uma janela móvel de 30 dias.              │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Error Budget (Orçamento de Erro)                                       │
│  "A margem tolerável de imperfeição" — (100% - SLO)                     │
│  Exemplo: 0.5% em 30 dias = margem aceitável de degradação transitória. │
└─────────────────────────────────────────────────────────────────────────┘
```

> [!IMPORTANT]
> **Distinção entre SLO, Threshold de Alerta e Performance Observada:**
> - **SLO (Objetivo):** Meta interna de engenharia em janela ampla (ex: 30 dias) para guiar decisões de publicação e confiabilidade.
> - **Threshold de Alerta (Sinal Operacional):** Gatilho de curto prazo (ex: $\ge 2$ falhas em 5 minutos) para acordar o operador em incidentes agudos. Alertas **não** são fórmulas de SLO.
> - **Performance Observada:** O comportamento real registrado pela telemetria em produção.

---

## 2. Definição Precisa dos SLIs (Service Level Indicators)

### SLI 1: Disponibilidade de Infraestrutura do Hosting (Hosting Availability)
$$\text{SLI}_{\text{Hosting}} = \frac{\text{Total de Requisições HTTP com Status } 2\text{xx e } 3\text{xx}}{\text{Total de Requisições HTTP ao Firebase Hosting}} \times 100$$
- **Fonte:** Métricas de tráfego do Firebase Hosting / Cloud CDN.

### SLI 2: Disponibilidade Funcional da Aplicação (Functional Frontend Availability)
$$\text{SLI}_{\text{Frontend Functional}} = \frac{\text{Tentativas Sintéticas com Login Válido + Dashboard Renderizado com Dados}}{\text{Total de Tentativas Sintéticas Controladas}} \times 100$$
- **Fonte:** Suíte de testes sintéticos contínuos (Synthetic Monitors).

### SLI 3: Taxa de Processamento Livre de 5xx em Cloud Functions (5xx-free Processing Rate)
$$\text{SLI}_{\text{Functions (5xx-free)}} = \frac{\text{Total de Requisições Elegíveis com Resposta } \neq 5\text{xx}}{\text{Total de Requisições Elegíveis às Cloud Functions}} \times 100$$
- **Tratamento Semântico Rigoroso de Códigos de Retorno:**
  - **2xx / 3xx (Sucesso / Redirecionamento):** Contam como desfechos válidos e bem-sucedidos.
  - **4xx Esperados / Defesa Operacional:** Rejeições como `401 unauthenticated`, `400 invalid_argument` (parâmetros incorretos do cliente), `429 resource-exhausted` (cooldown/rate limit ativo), `401 WEBHOOK_SIGNATURE_INVALID` (tentativa externa não autorizada) e `405 method_not_allowed` (scanners de rede) **são comportamentos corretos do sistema de proteção**. São computados como desfechos atendidos com sucesso na disponibilidade livre de 5xx (não constituem indisponibilidade do sistema).
  - **4xx Inesperados:** Aumento súbito de 400 por quebra de schema após deploy é tratado como defeito de release em auditorias específicas, mas não como falha de infraestrutura 5xx.
  - **5xx (Falhas de Servidor):** Erros internos de execução, falhas de infraestrutura no Firestore (`fail_closed_error`), exceções não tratadas e timeouts com upstream (`500/504`) reduzem o SLI e consomem o Error Budget.
- **Fonte de Medição:** Métrica Cloud Run `run.googleapis.com/request_count` segmentada por `response_code_class="5xx"`. `severity="ERROR"` em logs é indicador complementar de diagnóstico e não sinônimo automático de código HTTP 5xx.

### SLI 4: Conformidade de Latência de Funções Críticas (Latency Compliance)
$$\text{SLI}_{\text{Latency Compliance}} = \frac{\text{Total de Requisições atendidas com Latência } \le \text{Threshold Alvo}}{\text{Total de Requisições Válidas da Função}} \times 100$$
- **Definição Canônica por Threshold:** A métrica oficial do SLI é o percentual de requisições que respondem dentro do teto estipulado:
  - `createMercadoPagoPreference`: $\text{Threshold} \le 3.000\text{ms}$ (Meta: $\ge 95.0\%$)
  - `paymentWebhookMercadoPago`: $\text{Threshold} \le 2.000\text{ms}$ (Meta: $\ge 95.0\%$)
- **Nota:** Percentis de distribuição (ex: P95) são utilizados estritamente como diagnóstico secundário no Cloud Monitoring, não como a fórmula de definição do SLI.

### SLI 5: Taxa de Sessões Livres de Falhas Fatais no Frontend (Fatal Crash-Free Sessions)
$$\text{SLI}_{\text{Crash-Free}} = \frac{\text{Total de Sessões de Usuário Sem Ativação do ErrorBoundary}}{\text{Total de Sessões Ativas no Frontend}} \times 100$$
- **Fonte:** Eventos `FRONTEND_ERROR_REPORTED` emitidos pela função `reportClientError` a partir de `src/components/ErrorBoundary.jsx`.

---

## 3. Matriz de SLOs e Estado de Prontidão de Medição (Janela de 30 Dias)

| SLO | SLI ASSOCIADO | META (TARGET) | JANELA | ESTADO DE PRONTIDÃO DE MEDIÇÃO | FONTE E LIMITAÇÕES ATUAIS |
| :--- | :--- | :---: | :---: | :---: | :--- |
| **SLO 1: Hosting Availability** | $\text{SLI}_{\text{Hosting}}$ | **99.9%** | 30 dias | **PARTIALLY_MEASURABLE** | Métricas globais disponíveis no Firebase Console; cálculo exato automatizado requer export de logs do Hosting. |
| **SLO 2: Functional Availability** | $\text{SLI}_{\text{Frontend Functional}}$ | **99.5%** | 30 dias | **NOT_MEASURABLE_YET** | Requer implementação futura de Synthetic Monitor automatizado com conta de teste. |
| **SLO 3: Functions Success Rate** | $\text{SLI}_{\text{Functions (5xx-free)}}$ | **99.5%** | 30 dias | **PARTIALLY_MEASURABLE** | Mapeável via Cloud Run `request_count` filtrando `response_code_class="5xx"`; requer provisionamento de filtro agregado. |
| **SLO 4: Critical Latency Compliance** | $\text{SLI}_{\text{Latency Compliance}}$ | **95.0%** | 30 dias | **MEASURABLE_NOW** | Mapeável via Cloud Run Latency Metrics (`request_latencies` percentile distribution). |
| **SLO 5: Crash-Free Sessions** | $\text{SLI}_{\text{Crash-Free}}$ | **99.5%** | 30 dias | **PARTIALLY_MEASURABLE** | Numerador coletado via `reportClientError`; denominador (total de sessões ativas) requer telemetria de sessão ativa. |

---

## 4. Orçamento de Erro (Error Budget)

$$\text{Error Budget} = 100\% - \text{SLO}$$

### Cálculo do Orçamento para Janela de 30 Dias (43.200 minutos):

$$\text{Indisponibilidade Tolerada} = 43.200\text{ min} \times (1 - \text{SLO})$$

| SLO | META | ERROR BUDGET (%) | ORÇAMENTO TOLERADO (30 DIAS) | POLÍTICA DE ESGOTAMENTO DO BUDGET |
| :--- | :---: | :---: | :---: | :--- |
| **SLO 1 (Hosting)** | 99.9% | **0.1%** | **43,2 minutos** | Congelar novos deploys; focar em estabilidade de CDN e assets estáticos. |
| **SLO 2 (Frontend Funcional)** | 99.5% | **0.5%** | **216,0 minutos (3,6 horas)** | Investigar regressões de release e acionar rollback se necessário. |
| **SLO 3 (Functions 5xx)** | 99.5% | **0.5%** | **0,5% das requisições elegíveis** | Priorizar isolamento de falhas upstream e estabilidade de transações. |
| **SLO 4 (Latência)** | 95.0% | **5.0%** | **5,0% das requisições** | Otimizar chamadas externas ao Mercado Pago e índices do Firestore. |
| **SLO 5 (Crash-Free)** | 99.5% | **0.5%** | **0,5% das sessões** | Tratar causas raiz no `ErrorBoundary` antes de introduzir novas telas. |

---

## 5. Modelo de Severidade de Incidentes (SEV-1, SEV-2, SEV-3)

| NÍVEL | CRITÉRIOS DE DISPARO | IMPACTO OPERACIONAL | SLA RESPOSTA | SLA MITIGAÇÃO |
| :--- | :--- | :--- | :---: | :---: |
| **SEV-1 (Crítico)** | - Indisponibilidade global do Hosting ou tela de Login.<br>- Crash fatal do Dashboard para múltiplos usuários.<br>- Corrupção matemática ou perda de dados financeiros comprovada. | Todos os usuários afetados ou risco iminente de integridade contábil. | **< 15 min** | **< 2 horas** |
| **SEV-2 (Alto)** | - Taxa de erro 5xx em Cloud Functions > 5% persistente.<br>- Webhook do Mercado Pago acumulando falhas de processamento.<br>- Falha em exclusão de conta (`deleteUserAccount`). | Subconjunto significativo de usuários ou reconciliação financeira atrasada. | **< 30 min** | **< 4 horas** |
| **SEV-3 (Médio)** | - Degradação não crítica (ex: exportação CSV lenta).<br>- Alertas de crescimento anormal de rate limit (tentativas pontuais de abuso).<br>- Aviso de consumo de cota ou degradação leve de latência. | Usuários isolados sem impacto na integridade financeira. | **< 2 horas** | **< 24 horas** |

---

## 6. Políticas de Alerta Operacionais (Implantadas em Produção)

> [!IMPORTANT]
> **Estado Operacional Confirmado:** As políticas de alerta e métricas abaixo estão **implantadas e ativas (`enabled: true`)** no projeto `controle-de-cartao` no Google Cloud Monitoring (validadas na Fase 7.8.3 e rastreadas em `monitoring/production-state.json`). Os templates em `monitoring/*.json` são preservados com `enabled: false` e placeholders para portabilidade de código.

| NOME DO ALERTA | MECANISMO TÉCNICO | THRESHOLD OPERACIONAL | JANELA | SEVERIDADE | SALVAGUARDA DE BAIXO VOLUME | RUNBOOK ASSOCIADO |
| :--- | :--- | :--- | :---: | :---: | :--- | :--- |
| `ALERT_WEBHOOK_MP_5XX` | Log-Based Metric Threshold (`webhook_processing_errors_count`) | $\ge 2$ falhas de processamento | 5 min | **SEV-2** | Contagem agregada via `ALIGN_SUM` em 300s; ignora assinaturas inválidas e 4xx esperados. | [Runbook 1](incident-response.md#runbook-1-webhook-do-mercado-pago-falhando--rejeições-500) |
| `ALERT_PREFERENCE_MP_5XX` | Log-Based Metric Threshold (`preference_errors_count`) | $\ge 3$ falhas internas | 5 min | **SEV-2** | Contagem agregada via `ALIGN_SUM` em 300s; ignora validações de cliente (`invalid_argument`) e 4xx. | [Runbook 1](incident-response.md#runbook-1-webhook-do-mercado-pago-falhando--rejeições-500) |
| `ALERT_ACCOUNT_DELETION_FAIL` | Single Event LogMatch (`conditionMatchedLog`) | $\ge 1$ falha inesperada | N/A | **SEV-2** | LogMatch de evento único; ignora `operation_in_progress` (429 esperado). | [Runbook 3](incident-response.md#runbook-3-firestore-rules-bloqueando-usuários-legítimos) |
| `ALERT_FRONTEND_CRASH_SPIKE` | Log-Based Metric Threshold (`frontend_crash_count`) | $\ge 5$ crashes no frontend | 5 min | **SEV-2** | Contagem agregada via `ALIGN_SUM` em 300s (zero high-cardinality labels). | [Runbook 4](incident-response.md#runbook-4-deploy-frontend-quebrado--rollback-imediato) |
| `ALERT_RATE_LIMIT_FLOOD` | Log-Based Metric Threshold (`rate_limit_rejections_count`) | $\ge 30$ rejeições | 5 min | **SEV-3** | Threshold elevado ($\ge 30$) para evitar falso-positivo com uso normal. | [Runbook 2](incident-response.md#runbook-2-firebase-authentication-indisponível) |
| `ALERT_APPCHECK_REJECTION_SPIKE` | Firebase App Check Console Metric | $> 20\%$ de requisições inválidas ($\ge 50$ reqs) | 15 min | **SEV-2** | **MANUAL GATE / CONSOLE METRIC** (Acompanhamento direto no Firebase Console). | App Check Console Gate |

---

## 7. Especificação de Testes Sintéticos Futuros (Synthetics)

Para habilitar a medição contínua e automatizada de `SLO 2: Functional Availability` sem impactar usuários:
1. **Conta de Teste Dedicada:** Utilizar exclusivamente credenciais sintéticas de teste em ambiente isolado (nunca contas reais de operador).
2. **Fluxo Sintético Mínimo:**
   - Requisição HTTP 200 na Landing Page.
   - Renderização da tela de Login.
   - Autenticação de usuário sintético via Firebase Auth.
   - Carregamento de dados de leitura no Dashboard em menos de 5 segundos.
   - Logout e encerramento limpo da sessão.
