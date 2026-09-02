# FinControl — Plano de Resposta a Incidentes & Runbooks Operacionais

Este documento define o processo formal de gestão de incidentes operacionais, níveis de severidade (SEV), etapas de contenção e runbooks de resolução para o FinControl.

---

## 1. Classificação de Severidade & SLAs

| Nível | Descrição | Impacto | Tempo de Resposta (SLA) | Tempo de Mitigação |
| :--- | :--- | :--- | :--- | :--- |
| **SEV-1 (Crítico)** | Sistema indisponível, perda de dados ou quebra total de pagamentos. | Todos os usuários afetados ou falha no processamento financeiro. | < 15 minutos | < 2 horas |
| **SEV-2 (Alto)** | Recurso crítico degradado (ex: cadastro de compras falhando, webhook com erro, anomalia crítica de custos). | Subconjunto significativo de usuários, reconciliação atrasada ou risco financeiro. | < 30 minutos | < 4 horas |
| **SEV-3 (Médio)** | Funcionalidade secundária inoperante (ex: IA indisponível, export CSV lento, alerta de 90% budget). | Usuários pontuais sem impacto na integridade financeira. | < 2 horas | < 24 horas |
| **SEV-4 (Baixo)** | Problema cosmético, warning de log ou pequena inconsistência de layout. | Baixo ou nulo. | < 24 horas | Próximo sprint |

---

## 2. Ciclo de Vida do Incidente

```text
[1. DETECTAR] ──> [2. CONTER] ──> [3. DIAGNOSTICAR] ──> [4. CORRIGIR] ──> [5. VALIDAR] ──> [6. COMUNICAR] ──> [7. POST-MORTEM]
```

1. **Detectar:** Identificação via Cloud Logging, Cloud Monitoring, Cloud Billing alerts, telemetria frontend (`reportClientError`), alertas ou relatório de usuário.
2. **Conter:** Isolar o componente em falha para estancar o impacto (ex: ativar modo de manutenção, fallback determinístico, desativar webhook temporariamente, conter tráfego anômalo).
3. **Diagnosticar:** Analisar logs estruturados, correlacionar por `stage`, `userHash` e timestamps.
4. **Corrigir:** Aplicar hotfix mínimo, revert ou ajuste de configuração no GCP/Firebase.
5. **Validar:** Executar bateria de testes automatizados (`npm test`, `npm run lint`, `npm run build`) antes do deploy.
6. **Comunicar:** Informar status aos canais operacionais e usuários afetados com clareza e transparência.
7. **Post-Mortem:** Documentar causa raiz, lições aprendidas e ações preventivas em até 48h.

---

## 3. Runbooks Operacionais

### Runbook 1: Webhook do Mercado Pago Falhando / Rejeições 500
* **Sintoma:** Usuários realizam pagamento aprovado no Mercado Pago mas plano Black Pro não é ativado.
* **Diagnóstico:**
  1. Acessar GCP Logs Explorer e filtrar:
     ```text
     resource.type="cloud_function"
     jsonPayload.stage="paymentWebhookMercadoPago"
     severity>=ERROR
     ```
  2. Verificar se o erro é de autenticação de secret (`MERCADOPAGO_ACCESS_TOKEN`), timeout ou conflito de idempotência em `/payments`.
* **Mitigação & Resolução:**
  1. Se for falha de secret, verificar status do secret no GCP Secret Manager.
  2. Para reprocessar manualmente um pagamento pago:
     - Obter o `paymentId` da notificação do Mercado Pago.
     - Executar script de reconciliação administrativo usando `admin.firestore()`.
     - Atualizar `users_fallback/{userId}` com `plan: 'pro'` e gravar log em `/payments`.

---

### Runbook 2: Firebase Authentication Indisponível
* **Sintoma:** Tela de login exibe erro genérico ou usuários não conseguem renovar token JWT.
* **Diagnóstico:**
  1. Checar status da nuvem Google em `status.firebase.google.com`.
  2. Verificar se o cliente está recebendo erro `auth/network-request-failed` ou `auth/too-many-requests`.
* **Mitigação:**
  1. Os dados locais em cache do Firestore continuam protegidos pelo IndexedDB offline persistence.
  2. Exibir banner de aviso de conectividade no frontend.
  3. Não tentar bypass de segurança de auth no frontend.

---

### Runbook 3: Firestore Rules Bloqueando Usuários Legítimos
* **Sintoma:** Clientes recebem `permission-denied` ao salvar ou listar dados no Dashboard.
* **Diagnóstico:**
  1. Consultar logs de regras no GCP:
     ```text
     resource.type="firestore_database"
     logName=~"firestore.googleapis.com%2Frules"
     ```
  2. Rodar localmente `npm run test:rules` para reproduzir o cenário da regra que falhou.
* **Mitigação:**
  1. Identificar o atributo ou subcoleção que violou a condição `request.auth.uid == userId`.
  2. Corrigir `firestore.rules` mantendo a segurança estrita e implantar via `firebase deploy --only firestore:rules`.

---

### Runbook 4: Deploy Frontend Quebrado / Rollback Imediato
* **Sintoma:** Erro branco (WSOD) em produção ou regressão crítica após deploy do Hosting.
* **Diagnóstico:**
  1. Checar console do navegador ou `reportClientError` no Cloud Logging.
* **Resolução (Rollback em < 2 minutos):**
  1. Executar rollback instantâneo para a versão estável anterior no Firebase Hosting:
     ```bash
     firebase hosting:clone SITE_ID:PREVIOUS_VERSION_ID SITE_ID:live
     ```
     Ou no console Firebase Hosting -> Release History -> Clicar nos 3 pontos da versão anterior -> "Rollback".

---

### Runbook 5: Backup Automático Ausente ou Inconsistente
* **Sintoma:** Alerta de ausência de backup diário ou falha no job do Cloud Scheduler.
* **Diagnóstico:**
  1. Verificar logs do Cloud Scheduler:
     ```text
     resource.type="cloud_scheduler_job"
     jsonPayload.jobName="firestore-daily-backup"
     ```
* **Resolução:**
  1. Disparar export manual imediato:
     ```bash
     gcloud firestore export gs://fincontrol-backups-production/manual-$(date +%Y%m%d) --project=controle-de-cartao
     ```
  2. Verificar permissões do Service Account `roles/datastore.importExportAdmin`.

---

### Runbook 6: Provedor de IA (Gemini) Indisponível / Erro de Quota
* **Sintoma:** Resumo mensal de IA falha ou retorna timeout.
* **Diagnóstico:**
  1. Consultar logs de `generateAiMonthlyBriefing` com filtro `result="gemini_http_error"`.
* **Mitigação:**
  1. O sistema já possui fallback determinístico nativo (`deterministic-engine-v1`) que assume imediatamente a síntese sem quebrar a experiência do usuário.
  2. Para forçar o fallback para 100% dos usuários temporariamente:
     - Definir variável de ambiente / secret `AI_PROVIDER_ENABLED="false"`.

---

### Runbook 7: Alerta de Consumo & Gestão de Orçamento (Cloud Billing & Cost Guardrails)

#### A. Estado Operacional Verificado no Google Cloud
* **Cloud Billing API:** `billingbudgets.googleapis.com` habilitada no projeto.
* **Orçamento Ativo:** 1 orçamento mensal com valor fixado em **R$ 25,00** (`amount: 25.00 BRL`, `calendarPeriod: MONTH`).
* **Escopo:** Exclusivo do projeto `controle-de-cartao` (`target project number: 364725310124`).
* **Thresholds de Gasto Real (CURRENT_SPEND):**
  - **50%** (R$ 12,50): Acompanhamento informativo de consumo.
  - **90%** (R$ 22,50): Alerta de atenção para investigação operacional.
  - **100%** (R$ 25,00): Alerta de alcance do teto orçamentário mensal.
* **Canais de Notificação:** Destinatários padrão de IAM (`DEFAULT_IAM_RECIPIENTS_ENABLED=true` com rota de e-mail ativa para administradores de faturamento).
* **Configurações Opcionais / Backlog P3:**
  - Inclusão do threshold de 75% e de alertas projetados (*FORECASTED_SPEND*) constituem melhorias incrementais não bloqueadoras.
  - O orçamento opera puramente via notificações assíncronas de e-mail (sem Pub/Sub ou Monitoring Notification Channel vinculados ao budget).

> [!IMPORTANT]
> **Natureza do Orçamento de Billing:**
> O orçamento do Cloud Billing é um mecanismo de **DETECÇÃO E ALERTA**, e **NÃO interrompe automaticamente os serviços nem impõe um hard cap físico de desligamento**.
> Da mesma forma, os guardrails de aplicação e infraestrutura (`maxInstances: 2 a 3`, `concurrency: 2 a 20`, rate limits no Firestore) são limitadores de taxa e concorrência para prevenir abusos pontuais, **mas não substituem o monitoramento de faturamento**.

#### B. Diagnóstico de Anomalias de Custo
1. Ao receber notificação de threshold (> 50%, > 90% ou > 100%), acessar:
   - **GCP Console -> Billing -> Reports:** Filtrar por SKU e Serviço para isolar os maiores ofensores (Cloud Functions, Cloud Firestore, Cloud Logging, Network Egress).
   - **Cloud Monitoring -> Metrics Explorer:** Inspecionar taxa de invocações (`cloud_function/executions`), requisições no Cloud Run (`cloud_run_revision/request_count`) e instâncias ativas (`cloud_run_revision/instance_count`).
   - **Cloud Logging Explorer:** Verificar picos anômalos de erro ou chamadas externas:
     ```text
     resource.type="cloud_run_revision"
     severity>=WARNING
     ```

#### C. Mitigação & Contenção Operacional
1. **Flooding externo contra Cloud Functions:**
   - As funções de produção possuem tetos rígidos (`maxInstances: 3` em webhook e preferência; `maxInstances: 2` nas demais), limitando o número simultâneo de containers em execução.
   - Em caso de rajada maliciosa volumosa, avaliar bloqueio por IP ou proteção de borda na CDN.
2. **Consumo excessivo no Cloud Firestore:**
   - Com App Check `ENFORCED` em produção, requisições diretas não autorizadas são bloqueadas na borda antes de atingir o banco.
   - Caso o aumento decorra de clientes oficiais, auditar o ciclo de vida dos listeners (`firestoreSubscriptionRegistry`) para identificar eventuais vazamentos de subscrição.
3. **Ingestão de telemetria no Cloud Logging:**
   - O rate limiter backend do `reportClientError` (máx. 10 relatórios/min por IP/UID) impede tempestades de logs de erro do frontend que possam exceder a franquia gratuita de 50 GB/mês.
