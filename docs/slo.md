# FinControl — Service Level Objectives (SLOs) & Gestão de Error Budget

Este documento define os Indicadores de Nível de Serviço (SLIs), Objetivos de Nível de Serviço (SLOs), Orçamentos de Erro (*Error Budgets*), modelo de severidade e o desenho de alertas candidatos do FinControl.

---

## 1. Princípios e Distinções Fundamentais

```text
┌─────────────────────────────────────────────────────────────────────────┐
│  SLI (Service Level Indicator)                                          │
│  "O que medimos em tempo real" — A métrica quantitativa observada.      │
│  Exemplo: % de requisições HTTP 2xx/3xx atendidas pelo Hosting.         │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  SLO (Service Level Objective)                                          │
│  "A meta interna de confiabilidade que a engenharia se compromete"      │
│  Exemplo: 99.9% de sucesso em uma janela móvel de 30 dias.              │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Error Budget (Orçamento de Erro)                                       │
│  "A margem tolerável de imperfeição" — (100% - SLO)                     │
│  Exemplo: 0.1% em 30 dias = ~43.2 minutos de indisponibilidade permitida│
└─────────────────────────────────────────────────────────────────────────┘
```

> [!IMPORTANT]
> **Distinção entre SLO, SLA e Performance Observada:**
> - **SLO (Objetivo):** Meta interna da equipe de engenharia para guiar decisões de release e priorização de qualidade.
> - **SLA (Acordo de Nível de Serviço):** Contrato comercial/legal com clientes, tipicamente com penalidades financeiras (o FinControl opera com foco em SLOs internos).
> - **Performance Observada:** O comportamento real registrado pela telemetria em produção, que pode oscilar acima ou abaixo do SLO.

---

## 2. Definição dos SLIs (Service Level Indicators)

### SLI 1: Disponibilidade de Infraestrutura do Hosting (Hosting Availability)
$$\text{SLI}_{\text{Hosting}} = \frac{\text{Total de Requisições HTTP com Status } 2\text{xx e } 3\text{xx}}{\text{Total de Requisições HTTP ao Firebase Hosting}} \times 100$$
- **Fonte:** Métricas de tráfego do Firebase Hosting / Cloud CDN.

### SLI 2: Disponibilidade Funcional da Aplicação (Functional Frontend Availability)
$$\text{SLI}_{\text{Frontend Functional}} = \frac{\text{Tentativas com Login Válido + Dashboard Renderizado com Dados}}{\text{Total de Tentativas Sintéticas / Sessões Ativas Iniciadas}} \times 100$$
- **Fonte:** Telemetria de inicialização no cliente e suítes sintéticas de teste contínuo.

### SLI 3: Taxa de Sucesso de Processamento em Cloud Functions (5xx-free Processing Rate)
$$\text{SLI}_{\text{Functions}} = \frac{\text{Total de Invocações com Resposta } \neq 5\text{xx}}{\text{Total de Invocações Válidas das Cloud Functions}} \times 100$$
- **Fonte:** Cloud Functions Gen2 Execution Logs / Cloud Run Metrics.
- **Nota:** Rejeições esperadas 4xx (401 unauthenticated, 429 rate limited) são excluídas do numerador e consideradas comportamento correto do sistema de defesa.

### SLI 4: Latência das Funções Críticas de Negócio (Critical Function Latency)
$$\text{SLI}_{\text{Latency}} = \frac{\text{Total de Requisições atendidas com Latência } \le \text{Threshold P95}}{\text{Total de Requisições das Funções Críticas}} \times 100$$
- **Thresholds Alvo:**
  - `createMercadoPagoPreference`: $\text{P95} \le 3.000\text{ms}$
  - `paymentWebhookMercadoPago`: $\text{P95} \le 2.000\text{ms}$

### SLI 5: Taxa de Sessões Livres de Falhas Fatais no Frontend (Fatal Crash-Free Sessions)
$$\text{SLI}_{\text{Crash-Free}} = \frac{\text{Total de Sessões Sem Ativação do ErrorBoundary}}{\text{Total de Sessões Ativas no Frontend}} \times 100$$
- **Fonte:** Relatórios de telemetria `reportClientError` emitidos por `src/components/ErrorBoundary.jsx`.

---

## 3. Matriz de SLOs Realistas do FinControl (Janela de 30 Dias)

Para um aplicativo de gestão financeira em fase de consolidação e volume moderado, as metas são desenhadas de forma justificada e pragmática, evitando metas inatingíveis (como 99.999%):

| SLO | SLI ASSOCIADO | META (TARGET) | JANELA DE MEDIÇÃO | FONTE DE MEDIÇÃO | LIMITAÇÕES CONHECIDAS |
| :--- | :--- | :---: | :---: | :--- | :--- |
| **SLO 1: Hosting Availability** | $\text{SLI}_{\text{Hosting}}$ | **99.9%** | 30 dias móveis | Firebase Hosting Metrics | Dependência direta do SLA de infraestrutura global do Google Cloud. |
| **SLO 2: Functional Availability** | $\text{SLI}_{\text{Frontend Functional}}$ | **99.5%** | 30 dias móveis | Client Telemetry / Synthetics | Flutuações de conectividade de rede do usuário final no browser. |
| **SLO 3: Functions Success Rate** | $\text{SLI}_{\text{Functions}}$ | **99.5%** | 30 dias móveis | Cloud Logging (5xx count) | Instabilidades transitórias na API externa do Mercado Pago afetam o webhook. |
| **SLO 4: Critical Latency (P95)** | $\text{SLI}_{\text{Latency}}$ | **95.0%** | 30 dias móveis | Cloud Run Latency Metrics | Cold starts de containers serverless podem gerar outliers pontuais. |
| **SLO 5: Crash-Free Sessions** | $\text{SLI}_{\text{Crash-Free}}$ | **99.5%** | 30 dias móveis | `reportClientError` logs | Extensões de navegador do usuário podem causar erros de renderização locais. |

---

## 4. Orçamento de Erro (Error Budget)

O Orçamento de Erro representa a quantidade aceitável de degradação antes que a confiabilidade do produto seja considerada comprometida.

$$\text{Error Budget} = 100\% - \text{SLO}$$

### Cálculo do Orçamento em Tempo (Janela de 30 dias = 43.200 minutos):

$$\text{Tempo de Indisponibilidade Tolerado} = 43.200\text{ minutos} \times (1 - \text{SLO})$$

| SLO | META | ERROR BUDGET (%) | TEMPO MÁXIMO DE INDISPONIBILIDADE (30 DIAS) | POLÍTICA DE ESGOTAMENTO DO BUDGET |
| :--- | :---: | :---: | :---: | :--- |
| **SLO 1 (Hosting)** | 99.9% | **0.1%** | **43,2 minutos** | Congelar novos deploys; focar em estabilidade de build e CDN. |
| **SLO 2 (Frontend Funcional)** | 99.5% | **0.5%** | **216,0 minutos (3,6 horas)** | Investigar regressões de release e acionar rollback se necessário. |
| **SLO 3 (Functions 5xx)** | 99.5% | **0.5%** | **0,5% das requisições** | Priorizar correções de backend e isolamento de dependências. |
| **SLO 4 (Latência P95)** | 95.0% | **5.0%** | **5,0% das requisições** | Otimizar queries Firestore e ajustar timeouts upstream. |
| **SLO 5 (Crash-Free Sessions)** | 99.5% | **0.5%** | **0,5% das sessões** | Tratar causas raiz no `ErrorBoundary` antes de novas features. |

---

## 5. Modelo de Severidade de Incidentes (SEV-1, SEV-2, SEV-3)

| NÍVEL | CRITÉRIOS DE DISPARO | IMPACTO OPERACIONAL | SLA RESPOSTA | SLA MITIGAÇÃO |
| :--- | :--- | :--- | :---: | :---: |
| **SEV-1 (Crítico)** | - Indisponibilidade global do Hosting ou tela de Login.<br>- Crash fatal do Dashboard para a maioria dos usuários.<br>- Corrupção matemática ou perda de dados financeiros comprovada. | Todos os usuários afetados ou risco iminente de integridade contábil. | **< 15 min** | **< 2 horas** |
| **SEV-2 (Alto)** | - Taxa de erro 5xx em Cloud Functions > 5% persistente.<br>- Webhook do Mercado Pago acumulando falhas de processamento.<br>- Bloqueio de exclusão de conta (`deleteUserAccount`) ou falha em rate limits. | Subconjunto significativo de usuários ou reconciliação financeira atrasada. | **< 30 min** | **< 4 horas** |
| **SEV-3 (Médio)** | - Degradação não crítica (ex: exportação CSV lenta).<br>- Alertas de crescimento anormal de rate limit (tentativas pontuais de abuso).<br>- Aviso de consumo de cota ou degradação leve de latência P95. | Usuários isolados sem impacto na integridade financeira. | **< 2 horas** | **< 24 horas** |

---

## 6. Desenho de Alertas Candidatos (Alert Candidate Design)

> [!NOTE]
> Estes alertas representam a especificação técnica formal para configuração no Google Cloud Monitoring. **Nenhum alerta foi criado automaticamente em produção nesta fase.**

| NOME DO ALERTA | MÉTRICA / FILTRO DE LOG DE ORIGEM | CONDIÇÃO DE DISPARO | JANELA DE AVALIAÇÃO | SEVERIDADE | AÇÃO OPERACIONAL RECOMENDADA | RISCO DE FALSO-POSITIVO & SALVAGUARDA |
| :--- | :--- | :--- | :---: | :---: | :--- | :--- |
| `ALERT_WEBHOOK_MP_5XX` | `resource.type="cloud_run_revision" jsonPayload.stage="paymentWebhookMercadoPago" severity="ERROR"` | $\ge 2$ falhas em 5 minutos | 5 min | **SEV-2** | Acionar Runbook 1 (reconciliação manual de pagamentos). | **Baixo:** Exige erro explícito de execução no webhook. |
| `ALERT_PREFERENCE_MP_5XX` | `resource.type="cloud_run_revision" jsonPayload.stage="createMercadoPagoPreference" severity="ERROR"` | $\ge 3$ falhas em 5 minutos | 5 min | **SEV-2** | Verificar status do Secret Manager e disponibilidade da API do MP. | **Baixo:** Distingue 4xx (sem email/não autenticado) de falha 500. |
| `ALERT_ACCOUNT_DELETION_FAIL` | `resource.type="cloud_run_revision" jsonPayload.stage="deleteUserAccount" severity="ERROR"` | $\ge 1$ falha em 10 minutos | 10 min | **SEV-2** | Auditar locks em `/account_operations` e logs de subcoleções. | **Muito Baixo:** Processo tem baixa frequência e alta criticidade de compliance. |
| `ALERT_FRONTEND_CRASH_SPIKE` | `resource.type="cloud_run_revision" jsonPayload.event="FRONTEND_ERROR_REPORTED"` | $\ge 5$ eventos em 5 min de pelo menos 2 usuários distintos | 5 min | **SEV-2** | Analisar `component` e `route` nos logs; preparar rollback. | **Médio:** Salvaguarda de múltiplos `userHash` evita disparo por loop de 1 cliente. |
| `ALERT_RATE_LIMIT_FLOOD` | `resource.type="cloud_run_revision" jsonPayload.result=~"^rate_limited"` | $\ge 30$ rejeições em 5 minutos | 5 min | **SEV-3** | Auditar IP/UID para verificar ataque de negação de serviço ou script malicioso. | **Baixo:** Threshold alto evita alarmes com uso normal. |
| `ALERT_APPCHECK_REJECTION_SPIKE` | Firebase App Check Metric `invalid_request_count` | $> 20\%$ de requisições inválidas com volume $\ge 50$ reqs | 15 min | **SEV-2** | Auditar se houve liberação de versão antiga sem token antes de enforcement. | **Baixo:** Combina taxa percentual com contagem mínima de eventos. |

---

## 7. Salvaguardas para Baixo Volume de Requisições

Em conformidade com as diretrizes de confiabilidade do FinControl:
1. **Regra de Contagem Mínima:** Nenhum alerta de taxa percentual pode disparar com menos de 5 eventos na janela de avaliação.
2. **Auto-Supressão:** Notificações repetidas do mesmo incidente são suprimidas por um período mínimo de 300 segundos (`notificationRateLimit`).
3. **Auto-Fechamento:** Incidentes transitórios são automaticamente encerrados após 1.800 segundos sem recorrência de eventos.
