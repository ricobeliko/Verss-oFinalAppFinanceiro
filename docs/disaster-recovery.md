# FinControl — Plano de Backup e Disaster Recovery (DR)

Este documento estabelece a política operacional, arquitetura, rotinas de cópia de segurança e o procedimento emergencial de restauração de dados para o FinControl em produção.

---

## 1. Contexto de Infraestrutura

- **Projeto Google Cloud / Firebase:** `controle-de-cartao`
- **Banco de Dados Principal:** Cloud Firestore (Modo Nativo)
- **Região Principal:** `southamerica-east1` (São Paulo)
- **Bucket de Armazenamento de Backups:** `gs://controle-de-cartao-backups/`
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

### RPO e RTO — Estado Real vs. Documentado

| Métrica | Documentado | Real (Fase 6) |
|---------|:-----------:|:-------------:|
| RPO | ≤ 24h (backup) / ~1min (PITR) | ⚠️ **DESCONHECIDO** — PITR e backup precisam ser verificados |
| RTO | ≤ 2 horas | ⚠️ **DESCONHECIDO** — procedimento nunca foi testado |

> [!WARNING]
> Os valores documentados são aspiracionais. Para torná-los comprovados, é necessário:
> 1. Verificar que PITR está ATIVO no console GCP
> 2. Verificar que o bucket de backup existe e tem arquivos
> 3. Executar um restore drill em ambiente isolado (ver Seção 7)

---

## 3. Arquitetura de Backup

```text
┌─────────────────────────┐
│     Cloud Firestore     │
│ (controle-de-cartao)    │
└───────────┬─────────────┘
            │
            │  Rotina Diária (03:00 BRT via Firestore Scheduled Backups / Cloud Scheduler)
            ▼
┌─────────────────────────┐
│      Cloud Storage      │
│ gs://controle-de-cartao │  Política de Ciclo de Vida:
│       -backups/         │  - Retenção ativa: 30 dias
└───────────┬─────────────┘  - Transição para Coldline/Delete: > 30 dias
            │
            ▼ (Em caso de incidente)
┌─────────────────────────┐
│ Restauração Controlada  │
│ (em ambiente ISOLADO)   │
└─────────────────────────┘
```

### 3.1 Frequência e Janela Operacional
- **Frequência:** Execução diária automática às 03:00 (horário de Brasília), período de menor tráfego de usuários.
- **Retenção:** 30 dias para backups diários.

---

## 4. Como Configurar a Rotina Automática no GCP

### Passo 1: Verificar se o bucket existe

```bash
gcloud storage buckets describe gs://controle-de-cartao-backups \
  --project=controle-de-cartao
```

Se não existir, criar:

```bash
gcloud storage buckets create gs://controle-de-cartao-backups \
  --project=controle-de-cartao \
  --location=southamerica-east1 \
  --default-storage-class=STANDARD
```

### Passo 2: Configurar política de retenção (30 dias)

```bash
cat > /tmp/lifecycle.json << 'EOF'
{
  "lifecycle": {
    "rule": [
      {
        "action": {"type": "Delete"},
        "condition": {"age": 30}
      }
    ]
  }
}
EOF
gcloud storage buckets update gs://controle-de-cartao-backups \
  --lifecycle-file=/tmp/lifecycle.json
```

### Passo 3: Verificar se o Backup Agendado Nativo existe

```bash
gcloud firestore backups schedules list \
  --database='(default)' \
  --project=controle-de-cartao
```

Se não existir, criar:

```bash
gcloud firestore backups schedules create \
  --database='(default)' \
  --recurrence=daily \
  --retention=30d \
  --project=controle-de-cartao
```

### Passo 4: Verificar status do PITR

```bash
gcloud firestore databases describe \
  --database='(default)' \
  --project=controle-de-cartao \
  --format="json" | grep -i "pointInTimeRecovery"
```

Se não estiver ativo:

```bash
gcloud firestore databases update \
  --database='(default)' \
  --enable-point-in-time-recovery \
  --project=controle-de-cartao
```

### Passo 5: Verificar último backup disponível

```bash
gcloud firestore backups list \
  --database='(default)' \
  --project=controle-de-cartao
```

---

## 5. Status Operacional Atual

> [!CAUTION]
> Os itens abaixo precisam ser verificados manualmente no GCP Console ou via gcloud CLI.
> A documentação NÃO é evidência de execução.

| Item | Status | Como verificar |
|------|:------:|----------------|
| Bucket `gs://controle-de-cartao-backups/` | ⚠️ A VERIFICAR | `gcloud storage buckets describe ...` |
| Política de retenção 30d | ⚠️ A VERIFICAR | `gcloud storage buckets describe ... --format=json` |
| Backup agendado nativo | ⚠️ A VERIFICAR | `gcloud firestore backups schedules list ...` |
| Último backup executado | ⚠️ A VERIFICAR | `gcloud firestore backups list ...` |
| PITR ativo | ⚠️ A VERIFICAR | `gcloud firestore databases describe ...` |
| Restore drill executado | ❌ NÃO | Ver Seção 7 |

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

## 9. PITR vs. Backup Independente — Diferença Operacional

| Dimensão | PITR | Export/Backup Independente |
|----------|------|--------------------------|
| Granularidade | Minuto a minuto (últimos 7 dias) | Snapshot diário |
| Cobertura temporal | Até 7 dias atrás | Até 30 dias |
| Caso de uso ideal | Exclusão acidental recente | Desastre completo, migração |
| Destino de restore | Novo database no mesmo projeto | Import para qualquer projeto |
| Risco não coberto | Erros silenciosos > 7 dias | Janela de até 24h de perda |

**Conclusão:** PITR e backup independente são **complementares**, não substitutos.

---

*Documento atualizado na Fase 6 — Production Readiness & Operação Confiável.*  
*Última atualização: 2026-08-24*
