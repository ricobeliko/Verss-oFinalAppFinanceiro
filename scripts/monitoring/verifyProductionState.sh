#!/usr/bin/env bash
# scripts/monitoring/verifyProductionState.sh
# FinControl — Read-Only Production Observability Drift Guard
#
# Este script executa verificações ESTREITAMENTE READ-ONLY no Google Cloud
# comparando o estado real provisionado contra monitoring/production-state.json.
#
# Comportamento estritamente FAIL-CLOSED: Qualquer indisponibilidade de CLI,
# autenticação, rede ou divergência de configuração resulta em EXIT != 0.

set -euo pipefail

PROJECT_ID="${PROJECT_ID:-controle-de-cartao}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STATE_FILE="$(cd "${SCRIPT_DIR}/../.." && pwd)/monitoring/production-state.json"

echo "========================================================"
echo "FinControl — Production Monitoring Drift Verification"
echo "Project: ${PROJECT_ID}"
echo "Manifest: ${STATE_FILE}"
echo "========================================================"

if [[ ! -f "${STATE_FILE}" ]]; then
  echo "[-] ERRO CRÍTICO: Arquivo de manifesto não encontrado: ${STATE_FILE}" >&2
  exit 1
fi

# 1. Validação estrutural do manifesto local
STATE_FILE="${STATE_FILE}" PROJECT_ID="${PROJECT_ID}" node -e "
const fs = require('fs');
const state = JSON.parse(fs.readFileSync(process.env.STATE_FILE, 'utf8'));
if (!state.projectId || state.projectId !== process.env.PROJECT_ID) {
  console.error('[-] projectId divergente no manifesto:', state.projectId);
  process.exit(1);
}
if (!Array.isArray(state.metrics) || state.metrics.length !== 4) {
  console.error('[-] Quantidade de métricas inválida no manifesto (esperado 4):', state.metrics?.length);
  process.exit(1);
}
if (!Array.isArray(state.policies) || state.policies.length !== 5) {
  console.error('[-] Quantidade de policies inválida no manifesto (esperado 5):', state.policies?.length);
  process.exit(1);
}
"

echo "[+] Manifesto local monitoring/production-state.json estruturalmente íntegro."

# 2. FAIL-CLOSED: Verificação de disponibilidade da CLI gcloud
if ! command -v gcloud &> /dev/null; then
  echo "[-] ERRO CRÍTICO (FAIL-CLOSED): gcloud CLI não encontrada no PATH." >&2
  echo "[-] A verificação remota de produção exige gcloud autenticada." >&2
  echo "PRODUCTION_MONITORING_DRIFT_CHECK_UNVERIFIED: gcloud_cli_missing" >&2
  exit 1
fi

# 3. FAIL-CLOSED: Consulta global de políticas e auditoria de duplicidade
echo "[+] Consultando lista de políticas de alerta no Google Cloud Monitoring..."
POLICIES_LIST_JSON="$(gcloud monitoring policies list --project="${PROJECT_ID}" --format=json 2>&1)" || {
  echo "[-] ERRO CRÍTICO (FAIL-CLOSED): Falha ao listar políticas no Cloud Monitoring para o projeto ${PROJECT_ID}." >&2
  echo "[-] Detalhes: ${POLICIES_LIST_JSON}" >&2
  echo "PRODUCTION_MONITORING_DRIFT_CHECK_UNVERIFIED: api_or_auth_failure" >&2
  exit 1
}

# 4. FAIL-CLOSED: Validação individual de cada uma das 4 métricas via `gcloud logging metrics describe`
echo "[+] Validando 4 log-based metrics remotas via gcloud logging metrics describe..."
STATE_FILE="${STATE_FILE}" PROJECT_ID="${PROJECT_ID}" node -e "
const fs = require('fs');
const { execSync } = require('child_process');
const state = JSON.parse(fs.readFileSync(process.env.STATE_FILE, 'utf8'));
const projectId = process.env.PROJECT_ID;

function normalizeFilter(f) {
  if (typeof f !== 'string') return '';
  return f.replace(/\s+/g, ' ').trim();
}

function isUnitEquivalent(uA, uB) {
  if (typeof uA !== 'string' || typeof uB !== 'string') return false;
  return uA.trim() === uB.trim();
}

for (const m of state.metrics) {
  let metricJsonStr;
  try {
    metricJsonStr = execSync('gcloud logging metrics describe ' + m.name + ' --project=' + projectId + ' --format=json', { stdio: ['ignore', 'pipe', 'pipe'] }).toString('utf8');
  } catch (err) {
    console.error('[-] DRIFT DETECTADO: Falha ao descrever métrica no GCP:', m.name, err.message);
    process.exit(1);
  }

  const remote = JSON.parse(metricJsonStr);
  if (remote.name !== m.name) {
    console.error('[-] DRIFT DETECTADO: Nome da métrica divergente:', remote.name, 'Esperado:', m.name);
    process.exit(1);
  }

  const descriptor = remote.metricDescriptor || {};
  if (descriptor.metricKind !== m.kind) {
    console.error('[-] DRIFT DETECTADO: metricKind divergente em:', m.name, 'GCP:', descriptor.metricKind, 'Esperado:', m.kind);
    process.exit(1);
  }
  if (descriptor.valueType !== m.valueType) {
    console.error('[-] DRIFT DETECTADO: valueType divergente em:', m.name, 'GCP:', descriptor.valueType, 'Esperado:', m.valueType);
    process.exit(1);
  }

  // BLOCKER B: Validação de Unit
  if (m.unit && !isUnitEquivalent(descriptor.unit, m.unit)) {
    console.error('[-] DRIFT DETECTADO: unit divergente em:', m.name, 'GCP:', descriptor.unit, 'Esperado:', m.unit);
    process.exit(1);
  }

  // BLOCKER A: Validação genérica de filtro exato para todas as métricas (com normalização de whitespace)
  if (normalizeFilter(remote.filter) !== normalizeFilter(m.filter)) {
    console.error('[-] DRIFT DETECTADO: Filtro da métrica divergente em:', m.name);
    console.error('  GCP:     ', remote.filter);
    console.error('  Manifest:', m.filter);
    process.exit(1);
  }

  // Validação adicional fail-closed de Preference como defesa em profundidade
  if (m.name === 'preference_errors_count') {
    const rf = remote.filter || '';
    if (!rf.includes('fail_closed_error') || !rf.includes('result=\"error\"')) {
      console.error('[-] DRIFT DETECTADO: Filtro de preference_errors_count não inclui fail_closed_error e result=\"error\":', rf);
      process.exit(1);
    }
    const forbidden = ['invalid_argument', 'unauthenticated', 'failed_precondition', 'rate_limited'];
    for (const term of forbidden) {
      if (rf.includes(term)) {
        console.error('[-] DRIFT DETECTADO: Filtro de preference_errors_count contém termo 4xx proibido:', term, rf);
        process.exit(1);
      }
    }
  }
}
console.log('[+] Todas as 4 log-based metrics remotas validadas com sucesso (filtros, descriptors e units).');
"

# 5. FAIL-CLOSED: Validação individual de cada uma das 5 políticas via `gcloud monitoring policies describe`
echo "[+] Validando 5 alert policies remotas individualmente via gcloud monitoring policies describe..."
STATE_FILE="${STATE_FILE}" PROJECT_ID="${PROJECT_ID}" POLICIES_LIST_JSON="${POLICIES_LIST_JSON}" node -e "
const fs = require('fs');
const { execSync } = require('child_process');
const state = JSON.parse(fs.readFileSync(process.env.STATE_FILE, 'utf8'));
const cloudPoliciesList = JSON.parse(process.env.POLICIES_LIST_JSON);
const projectId = process.env.PROJECT_ID;

function normalizeFilter(f) {
  if (typeof f !== 'string') return '';
  return f.replace(/\s+/g, ' ').trim();
}

function isZeroDuration(duration) {
  if (typeof duration !== 'string') return false;
  const trimmed = duration.trim();
  if (!trimmed) return false;
  return /^0+(\.0+)?s$/.test(trimmed);
}

function isThresholdEquivalent(valA, valB) {
  if (valA === undefined || valA === null || valB === undefined || valB === null) return false;
  const numA = Number(valA);
  const numB = Number(valB);
  if (isNaN(numA) || isNaN(numB)) return false;
  return numA === numB;
}

// A. Auditoria de duplicidade por displayName
const displayCount = {};
let fincontrolPoliciesCount = 0;
for (const p of cloudPoliciesList) {
  if (p.displayName && p.displayName.startsWith('FinControl')) {
    fincontrolPoliciesCount++;
    displayCount[p.displayName] = (displayCount[p.displayName] || 0) + 1;
    if (displayCount[p.displayName] > 1) {
      console.error('[-] DRIFT DETECTADO: Política duplicada no GCP por displayName:', p.displayName);
      process.exit(1);
    }
  }
}

if (fincontrolPoliciesCount !== 5) {
  console.error('[-] DRIFT DETECTADO: Quantidade de políticas FinControl no GCP diferente de 5:', fincontrolPoliciesCount);
  process.exit(1);
}

// B. Validação individual de cada política pelo resourceName canônico
const channelsEncountered = new Set();

for (const expected of state.policies) {
  let policyJsonStr;
  try {
    policyJsonStr = execSync('gcloud monitoring policies describe ' + expected.resourceName + ' --project=' + projectId + ' --format=json', { stdio: ['ignore', 'pipe', 'pipe'] }).toString('utf8');
  } catch (err) {
    console.error('[-] DRIFT DETECTADO: Falha ao descrever política por resourceName canônico:', expected.resourceName, err.message);
    process.exit(1);
  }

  const remote = JSON.parse(policyJsonStr);
  if (remote.name !== expected.resourceName) {
    console.error('[-] DRIFT DETECTADO: ResourceName divergente. GCP:', remote.name, 'Esperado:', expected.resourceName);
    process.exit(1);
  }
  if (remote.displayName !== expected.displayName) {
    console.error('[-] DRIFT DETECTADO: DisplayName divergente em:', expected.resourceName, 'GCP:', remote.displayName, 'Esperado:', expected.displayName);
    process.exit(1);
  }
  if (remote.enabled !== true) {
    console.error('[-] DRIFT DETECTADO: Política de produção não está enabled: true:', expected.displayName);
    process.exit(1);
  }

  const conditions = remote.conditions || [];
  if (conditions.length !== 1) {
    console.error('[-] DRIFT DETECTADO: Quantidade de condições divergente em:', expected.displayName, conditions.length);
    process.exit(1);
  }

  const cond = conditions[0];
  if (expected.type === 'SINGLE_EVENT_LOG_MATCH') {
    if (!cond.conditionMatchedLog) {
      console.error('[-] DRIFT DETECTADO: Esperado conditionMatchedLog para:', expected.displayName);
      process.exit(1);
    }
    if (cond.conditionThreshold) {
      console.error('[-] DRIFT DETECTADO: conditionThreshold inesperado em política Single Event:', expected.displayName);
      process.exit(1);
    }
    // BLOCKER C: Validação exata do filtro de log de Backend
    if (normalizeFilter(cond.conditionMatchedLog.filter) !== normalizeFilter(expected.filter)) {
      console.error('[-] DRIFT DETECTADO: Filtro de log do backend divergente em:', expected.displayName);
      console.error('  GCP:     ', cond.conditionMatchedLog.filter);
      console.error('  Manifest:', expected.filter);
      process.exit(1);
    }
  } else if (expected.type === 'METRIC_THRESHOLD') {
    if (!cond.conditionThreshold) {
      console.error('[-] DRIFT DETECTADO: Esperado conditionThreshold para:', expected.displayName);
      process.exit(1);
    }
    if (cond.conditionMatchedLog) {
      console.error('[-] DRIFT DETECTADO: conditionMatchedLog inesperado em política MetricThreshold:', expected.displayName);
      process.exit(1);
    }
    const ct = cond.conditionThreshold;
    if (!normalizeFilter(ct.filter).includes(expected.metric)) {
      console.error('[-] DRIFT DETECTADO: Métrica divergente em:', expected.displayName, 'Filtro:', ct.filter, 'Esperado:', expected.metric);
      process.exit(1);
    }
    if (ct.comparison !== expected.comparison) {
      console.error('[-] DRIFT DETECTADO: Comparison divergente em:', expected.displayName, 'GCP:', ct.comparison, 'Esperado:', expected.comparison);
      process.exit(1);
    }
    // Comparação numérica tolerando inteiros e floats (1 vs 1.0)
    if (!isThresholdEquivalent(ct.thresholdValue, expected.thresholdValue)) {
      console.error('[-] DRIFT DETECTADO: ThresholdValue divergente em:', expected.displayName, 'GCP:', ct.thresholdValue, 'Esperado:', expected.thresholdValue);
      process.exit(1);
    }
    // BLOCKER D: Duração obrigatória estritamente zero
    if (!isZeroDuration(ct.duration)) {
      console.error('[-] DRIFT DETECTADO: Duration inválida ou ausente (esperado 0s):', ct.duration);
      process.exit(1);
    }
    const agg = (ct.aggregations && ct.aggregations[0]) || {};
    if (agg.alignmentPeriod !== expected.alignmentPeriod) {
      console.error('[-] DRIFT DETECTADO: alignmentPeriod divergente em:', expected.displayName, agg.alignmentPeriod);
      process.exit(1);
    }
    if (agg.perSeriesAligner !== expected.perSeriesAligner) {
      console.error('[-] DRIFT DETECTADO: perSeriesAligner divergente em:', expected.displayName, agg.perSeriesAligner);
      process.exit(1);
    }
    if (agg.crossSeriesReducer !== expected.crossSeriesReducer) {
      console.error('[-] DRIFT DETECTADO: crossSeriesReducer divergente em:', expected.displayName, agg.crossSeriesReducer);
      process.exit(1);
    }
  }

  // Rastrear canais de notificação associados
  const policyChannels = remote.notificationChannels || [];
  if (policyChannels.length !== 1) {
    console.error('[-] DRIFT DETECTADO: Política deve possuir exatamente 1 canal de notificação:', expected.displayName, policyChannels.length);
    process.exit(1);
  }
  channelsEncountered.add(policyChannels[0]);
}

if (channelsEncountered.size !== 1) {
  console.error('[-] DRIFT DETECTADO: As 5 políticas não compartilham o mesmo canal de notificação. Canais encontrados:', channelsEncountered.size);
  process.exit(1);
}

// C. Validar o Notification Channel remoto de forma estritamente read-only (sem expor e-mail)
const channelResource = Array.from(channelsEncountered)[0];
let channelJsonStr;
try {
  channelJsonStr = execSync('gcloud beta monitoring channels describe ' + channelResource + ' --project=' + projectId + ' --format=json', { stdio: ['ignore', 'pipe', 'pipe'] }).toString('utf8');
} catch (err) {
  try {
    channelJsonStr = execSync('gcloud monitoring channels describe ' + channelResource + ' --project=' + projectId + ' --format=json', { stdio: ['ignore', 'pipe', 'pipe'] }).toString('utf8');
  } catch (err2) {
    console.error('[-] DRIFT DETECTADO: Falha ao descrever notification channel remoto:', channelResource, err2.message);
    process.exit(1);
  }
}

const remoteChannel = JSON.parse(channelJsonStr);
if (remoteChannel.displayName !== state.notificationChannel.displayName) {
  console.error('[-] DRIFT DETECTADO: DisplayName do canal divergente. GCP:', remoteChannel.displayName, 'Esperado:', state.notificationChannel.displayName);
  process.exit(1);
}
if (remoteChannel.type !== state.notificationChannel.type) {
  console.error('[-] DRIFT DETECTADO: Tipo do canal divergente. GCP:', remoteChannel.type, 'Esperado:', state.notificationChannel.type);
  process.exit(1);
}
if (remoteChannel.enabled !== state.notificationChannel.enabled) {
  console.error('[-] DRIFT DETECTADO: Status enabled do canal divergente. GCP:', remoteChannel.enabled, 'Esperado:', state.notificationChannel.enabled);
  process.exit(1);
}

console.log('[+] Todas as 5 políticas de alerta e o canal operacional validados com sucesso.');
"

echo "========================================================"
echo "PRODUCTION_MONITORING_DRIFT_CHECK_PASS"
echo "SCRIPT_RESULT=0"
echo "========================================================"
exit 0
