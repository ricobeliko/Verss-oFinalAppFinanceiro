# FinControl — Plano de Resposta a Incidentes & Runbooks Operacionais

Este documento define o processo formal de gestão de incidentes operacionais, níveis de severidade (SEV), etapas de contenção e runbooks de resolução para o FinControl.

---

## 1. Classificação de Severidade & SLAs

| Nível | Descrição | Impacto | Tempo de Resposta (SLA) | Tempo de Mitigação |
| :--- | :--- | :--- | :--- | :--- |
| **SEV-1 (Crítico)** | Sistema indisponível, perda de dados ou quebra total de pagamentos. | Todos os usuários afetados ou falha no processamento financeiro. | < 15 minutos | < 2 horas |
| **SEV-2 (Alto)** | Recurso crítico degradado (ex: cadastro de compras falhando, webhook com erro). | Subconjunto significativo de usuários ou reconciliação atrasada. | < 30 minutos | < 4 horas |
| **SEV-3 (Médio)** | Funcionalidade secundária inoperante (ex: IA indisponível, export CSV lento). | Usuários pontuais sem impacto na integridade financeira. | < 2 horas | < 24 horas |
| **SEV-4 (Baixo)** | Problema cosmético, warning de log ou pequena inconsistência de layout. | Baixo ou nulo. | < 24 horas | Próximo sprint |

---

## 2. Ciclo de Vida do Incidente

```text
[1. DETECTAR] ──> [2. CONTER] ──> [3. DIAGNOSTICAR] ──> [4. CORRIGIR] ──> [5. VALIDAR] ──> [6. COMUNICAR] ──> [7. POST-MORTEM]
```

1. **Detectar:** Identificação via Cloud Logging, telemetria frontend (`reportClientError`), alertas ou relatório de usuário.
2. **Conter:** Isolar o componente em falha para estancar o impacto (ex: ativar modo de manutenção, fallback determinístico, desativar webhook temporariamente).
3. **Diagnosticar:** Analisar logs estruturados, correlacionar por `stage`, `userHash` e timestamps.
4. **Corrigir:** Aplicar hotfix mínimo, revert ou ajuste de configuração no GCP/Firebase.
5. **Validar:** Executar bateria de testes automatizados (`npm test`, `npm run test:e2e`, `npm run test:rules`) antes do deploy.
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
