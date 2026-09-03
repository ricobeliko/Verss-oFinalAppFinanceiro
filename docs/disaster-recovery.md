# FinControl — Plano de Backup e Disaster Recovery (DR)

Este documento estabelece a política operacional, arquitetura, rotinas de cópia de segurança e o procedimento emergencial de restauração de dados para o FinControl em produção.

---

## 1. Contexto de Infraestrutura

- **Projeto Google Cloud / Firebase:** `controle-de-cartao`
- **Banco de Dados Principal:** Cloud Firestore (Modo Nativo)
- **Região Principal:** `southamerica-east1` (São Paulo)
- **Mecanismo de Backup Principal:** Firestore Native Scheduled Backups (`backupSchedules/20403673-4b8e-4a20-adb9-11f483db7922`)
- **Point-in-Time Recovery (PITR):** Habilitado nativamente no Cloud Firestore (janela contínua de 7 dias / `604800s`)
- **Coleções Críticas do Sistema:**
  - `users_fallback/{userId}/*` (e subcoleções `cards`, `loans`, `expenses`, `incomes`, `subscriptions`, `paidSubscriptions`, `clients`)
  - `users_fallback/{userId}/payments/*` (Histórico de transações)
  - `system_config/*`

---

## 2. Metas e Acordos de Nível de Serviço (SLAs Operacionais)

| Métrica | Meta | Definição |
| :--- | :---: | :--- |
| **RPO (Recovery Point Objective)** | **≤ 24 Horas** | Perda máxima tolerável de dados em caso de desastre catastrófico. (Com PITR ativo no Firestore, o RPO efetivo é de até 1 minuto nos últimos 7 dias). |
| **RTO (Recovery Time Objective)** | **≤ 2 Horas** | Tempo máximo estimado para conclusão do processo de importação e validação da integridade após declaração de desastre. |

### RPO e RTO — Estado Real Comprovado em Produção

| Métrica | Meta Documentada | Estado Real Comprovado (Fase 7.10) |
|---------|:----------------:|:----------------------------------:|
| **RPO** | ≤ 24h (backup) / ~1min (PITR) | ✅ **COMPROVADO** — Rotina nativa diária em estado `READY` + PITR ativo (7 dias) |
| **RTO** | ≤ 2 horas | ⚠️ **META OPERACIONAL** — Restauração granular documentada para database isolado |

> [!NOTE]
> **Evidência Operacional de RPO:** A auditoria ao vivo na Fase 7.10 comprovou que o Firestore Native Scheduled Backups gera snapshots diários automáticos na região `southamerica-east1`, mantendo múltiplos backups válidos e com retenção de 14 dias, garantindo estritamente a meta de RPO $\le 24\text{h}$.

---

## 3. Arquitetura de Backup

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                     Cloud Firestore (Nativo)                            │
│                      (controle-de-cartao)                               │
└────────────────────┬──────────────────────────────┬─────────────────────┘
                     │                              │
                     │ (Snapshot Diário Automático) │ (Log Contínuo de Mutações)
                     ▼                              ▼
┌──────────────────────────────────────┐  ┌───────────────────────────────┐
│   Firestore Native Scheduled Backup  │  │  Point-in-Time Recovery (PITR)│
│  - Schedule diário automático        │  │  - Retenção ativa: 7 dias     │
│  - Retenção: 14 dias                 │  │  - Granularidade: minuto      │
│  - Região: southamerica-east1        │  │    a minuto                   │
└──────────────────┬───────────────────┘  └───────────────┬───────────────┘
                   │                                      │
                   └──────────────────┬───────────────────┘
                                      ▼ (Em caso de incidente)
                   ┌──────────────────────────────────────┐
                   │        Restauração Controlada        │
                   │        (em ambiente ISOLADO)         │
                   └──────────────────────────────────────┘
```

### 3.1 Frequência e Janela Operacional
- **Frequência dos Snapshots:** Execução diária automática gerenciada nativamente pelo Google Cloud Firestore.
- **Retenção dos Backups:** 14 dias para snapshots agendados.
- **Janela do PITR:** Recuperação pontual a qualquer timestamp dos últimos 7 dias (`VersionRetentionPeriod: 604800s`).

---

## 4. Como Auditar a Rotina no Google Cloud

### Passo 1: Verificar o Agendamento de Backup Nativo

```bash
gcloud firestore backups schedules list \
  --database='(default)' \
  --project=controle-de-cartao
```

Esperado: schedule ativo com periodicidade diária e retenção de 14 dias (`1209600s`).

### Passo 2: Listar os Snapshots Disponíveis

```bash
gcloud firestore backups list \
  --database='(default)' \
  --location=southamerica-east1 \
  --project=controle-de-cartao
```

Esperado: lista de backups em estado `READY` com timestamp e prazo de expiração.

### Passo 3: Verificar Status do PITR

```bash
gcloud firestore databases describe \
  --database='(default)' \
  --project=controle-de-cartao \
  --format="json"
```

Confirmar que `pointInTimeRecoveryEnablement` está como `POINT_IN_TIME_RECOVERY_ENABLED`.

---

## 5. Status Operacional Atual (Comprovado na Fase 7.10)

| Item | Status | Evidência Operacional |
|------|:------:|-----------------------|
| **Firestore Scheduled Backup Nativo** | ✅ ATIVO | Schedule `backupSchedules/20403673-4b8e-4a20-adb9-11f483db7922` |
| **Frequência / Retenção** | ✅ DIÁRIA / 14 DIAS | Snapshot diário automático; retenção de 14 dias (`1209600s`) |
| **Último backup executado** | ✅ COMPROVADO | Múltiplos backups em estado `READY` em `southamerica-east1` |
| **PITR (Point-in-Time Recovery)** | ✅ ATIVO | Habilitado com retenção de 7 dias (`604800s`) |
| **Restore drill periódico** | ⚠️ PLANEJADO | Procedimento seguro documentado na Seção 7 |

---

## 6. Procedimento de Restauração de Emergência (Disaster Recovery)

> [!CAUTION]
> A restauração **NUNCA deve ser executada diretamente em produção** como primeiro passo.
> Sempre restaurar primeiro em ambiente isolado (ver Seção 7) e validar integridade.
> Antes de iniciar, declare a janela de manutenção e notifique a liderança técnica.

### Cenário 1: Restauração Granular via Point-in-Time Recovery (PITR)

Caso uma exclusão acidental tenha ocorrido nas últimas horas:

```bash
# Restaurar para database ISOLADO (nunca diretamente em produção)
gcloud firestore databases restore \
  --source-database='(default)' \
  --destination-database='restored-$(date +%Y%m%d-%H%M)' \
  --recovery-time='2026-08-23T20:00:00Z' \
  --project=controle-de-cartao
```

### Cenário 2: Importação a partir do Cloud Storage (Export Completo)

```bash
# 1. Listar backups disponíveis
gcloud firestore backups list --database='(default)' --project=controle-de-cartao

# 2. Restaurar para database ISOLADO
gcloud firestore databases restore \
  --source-backup='projects/controle-de-cartao/locations/southamerica-east1/backups/[BACKUP_ID]' \
  --destination-database='restored-$(date +%Y%m%d-%H%M)' \
  --project=controle-de-cartao
```

---

## 7. Restore Drill (Teste de Restauração Seguro)

**Objetivo:** Comprovar que o backup funciona ANTES de uma situação de emergência.

### Procedimento Seguro

```
PASSO 1: Identificar backup/snapshot recente
    ↓
PASSO 2: Criar database temporário isolado
    gcloud firestore databases create \
      --database=restore-drill-$(date +%Y%m%d) \
      --location=southamerica-east1 \
      --project=controle-de-cartao
    ↓
PASSO 3: Restaurar para o database temporário
    (usar comando de Cenário 1 ou 2 acima)
    ↓
PASSO 4: Verificar integridade dos dados
    - Confirmar que coleção users_fallback existe
    - Verificar pelo menos 1 documento de usuário
    - Confirmar subcoleções (cards, loans, etc.)
    ↓
PASSO 5: Documentar resultado
    - Data do drill
    - Backup utilizado (ID ou timestamp)
    - Tempo total de execução
    - Sucesso ou falha
    ↓
PASSO 6: Excluir database temporário
    gcloud firestore databases delete restore-drill-$(date +%Y%m%d) \
      --project=controle-de-cartao
```

**Frequência recomendada:** Trimestral (a cada 3 meses)  
**Responsável:** Desenvolvedor com acesso ao GCP

---

## 8. Checklist de Verificação Pós-Restauração

Após a conclusão da importação:

1. [ ] Testar login de usuário e verificação de plano em `users_fallback/{userId}`.
2. [ ] Validar integridade dos cards (`cards`) e integridade de parcelas em `loans`.
3. [ ] Executar a suíte de testes unitários: `npm test`.
4. [ ] Conferir o dashboard financeiro em modo leitura para confirmar saldo líquido.
5. [ ] Liberar acesso aos usuários e documentar a causa raiz do incidente.

---

## 9. PITR vs. Scheduled Backup Nativo — Diferença Operacional

| Dimensão | PITR (Point-in-Time Recovery) | Firestore Scheduled Backup Nativo |
|----------|-------------------------------|----------------------------------|
| **Granularidade** | Minuto a minuto (últimos 7 dias) | Snapshot diário automático |
| **Cobertura temporal** | Até 7 dias atrás (`604800s`) | Até 14 dias (`1209600s`) |
| **Caso de uso ideal** | Exclusão acidental ou corrupção recente | Desastre completo ou corrupção > 7 dias |
| **Destino de restore** | Novo database no mesmo projeto | Novo database no mesmo projeto |
| **Risco não coberto** | Erros silenciosos > 7 dias | Janela de até 24h entre snapshots |

**Conclusão:** PITR e Scheduled Backups nativos são **complementares**, não substitutos.

---

*Documento atualizado na Fase 7.10 — Consolidação Final de Produção.*
*Última atualização: 2026-09-02*
