/* global process */
// tests/monitoringProductionState.test.js
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
    normalizeFilter,
    isZeroDuration,
    isThresholdEquivalent,
    isUnitEquivalent
} from '../scripts/monitoring/monitoringVerificationHelpers.js';

describe('FinControl — Production Monitoring State & Strict Drift Guard (Fase 7.8.4 Final Completeness)', () => {
    const monitoringDir = path.join(process.cwd(), 'monitoring');
    const stateFile = path.join(monitoringDir, 'production-state.json');
    const verifyScript = path.join(process.cwd(), 'scripts', 'monitoring', 'verifyProductionState.sh');

    it('production-state.json deve existir e ser um JSON válido', () => {
        expect(fs.existsSync(stateFile)).toBe(true);
        const content = fs.readFileSync(stateFile, 'utf8');
        expect(() => JSON.parse(content)).not.toThrow();
    });

    it('production-state.json deve conter identificadores e canal de notificação corretos', () => {
        const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
        expect(state.projectId).toBe('controle-de-cartao');
        expect(state.status).toBe('DEPLOYED');
        expect(state.verificationSource).toBeDefined();

        expect(state.notificationChannel).toBeDefined();
        expect(state.notificationChannel.displayName).toBe('FinControl Operações');
        expect(state.notificationChannel.type).toBe('email');
        expect(state.notificationChannel.enabled).toBe(true);
    });

    it('production-state.json deve conter exatamente as 4 métricas baseadas em logs provisionadas com unit: "1"', () => {
        const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
        expect(Array.isArray(state.metrics)).toBe(true);
        expect(state.metrics.length).toBe(4);

        const metricNames = state.metrics.map(m => m.name);
        expect(metricNames).toContain('webhook_processing_errors_count');
        expect(metricNames).toContain('preference_errors_count');
        expect(metricNames).toContain('frontend_crash_count');
        expect(metricNames).toContain('rate_limit_rejections_count');

        for (const metric of state.metrics) {
            expect(metric.kind).toBe('DELTA');
            expect(metric.valueType).toBe('INT64');
            expect(metric.unit).toBe('1');
            expect(metric.filter).toBeDefined();
        }

        // Validação da métrica de preferência com allowlist estrita
        const prefMetric = state.metrics.find(m => m.name === 'preference_errors_count');
        expect(prefMetric.filter).toContain('fail_closed_error');
        expect(prefMetric.filter).toContain('error');
        expect(prefMetric.filter).not.toContain('invalid_argument');
        expect(prefMetric.filter).not.toContain('unauthenticated');
        expect(prefMetric.filter).not.toContain('failed_precondition');
        expect(prefMetric.filter).not.toContain('rate_limited');
    });

    it('production-state.json deve conter exatamente as 5 políticas de alerta ativas em produção', () => {
        const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
        expect(Array.isArray(state.policies)).toBe(true);
        expect(state.policies.length).toBe(5);

        // Todas as políticas de produção devem estar enabled: true
        for (const policy of state.policies) {
            expect(policy.enabled).toBe(true);
            expect(policy.resourceName).toMatch(/^projects\/controle-de-cartao\/alertPolicies\/\d+$/);
            expect(policy.displayName).toBeDefined();
        }

        // Backend Critical Errors: Single Event
        const backendPolicy = state.policies.find(p => p.displayName.includes('Backend Critical Errors'));
        expect(backendPolicy).toBeDefined();
        expect(backendPolicy.type).toBe('SINGLE_EVENT_LOG_MATCH');
        expect(backendPolicy.conditionType).toBe('conditionMatchedLog');
        expect(backendPolicy.filter).toBeDefined();

        // Webhook: threshold >= 2 (thresholdValue: 1, duration: "0s")
        const webhookPolicy = state.policies.find(p => p.displayName.includes('Webhook Mercado Pago Errors'));
        expect(webhookPolicy).toBeDefined();
        expect(webhookPolicy.type).toBe('METRIC_THRESHOLD');
        expect(webhookPolicy.comparison).toBe('COMPARISON_GT');
        expect(webhookPolicy.thresholdValue).toBe(1);
        expect(webhookPolicy.duration).toBe('0s');
        expect(webhookPolicy.alignmentPeriod).toBe('300s');

        // Preference: threshold >= 3 (thresholdValue: 2, duration: "0s")
        const prefPolicy = state.policies.find(p => p.displayName.includes('Mercado Pago Preference Errors'));
        expect(prefPolicy).toBeDefined();
        expect(prefPolicy.type).toBe('METRIC_THRESHOLD');
        expect(prefPolicy.comparison).toBe('COMPARISON_GT');
        expect(prefPolicy.thresholdValue).toBe(2);
        expect(prefPolicy.duration).toBe('0s');
        expect(prefPolicy.alignmentPeriod).toBe('300s');

        // Frontend Crash Spike: threshold >= 5 (thresholdValue: 4, duration: "0s")
        const frontendPolicy = state.policies.find(p => p.displayName.includes('Frontend Crash Spike'));
        expect(frontendPolicy).toBeDefined();
        expect(frontendPolicy.type).toBe('METRIC_THRESHOLD');
        expect(frontendPolicy.comparison).toBe('COMPARISON_GT');
        expect(frontendPolicy.thresholdValue).toBe(4);
        expect(frontendPolicy.duration).toBe('0s');
        expect(frontendPolicy.alignmentPeriod).toBe('300s');

        // Rate Limit Flood: threshold >= 30 (thresholdValue: 29, duration: "0s")
        const rateLimitPolicy = state.policies.find(p => p.displayName.includes('Rate Limit Flood & Abuse'));
        expect(rateLimitPolicy).toBeDefined();
        expect(rateLimitPolicy.type).toBe('METRIC_THRESHOLD');
        expect(rateLimitPolicy.comparison).toBe('COMPARISON_GT');
        expect(rateLimitPolicy.thresholdValue).toBe(29);
        expect(rateLimitPolicy.duration).toBe('0s');
        expect(rateLimitPolicy.alignmentPeriod).toBe('300s');
    });

    it('production-state.json não deve conter PII, endereços de e-mail ou secrets', () => {
        const content = fs.readFileSync(stateFile, 'utf8');
        const forbiddenPatterns = [
            /AIza[0-9A-Za-z-_]{35}/,
            /APP_USR-[0-9a-zA-Z_-]+/,
            /-----BEGIN\s+PRIVATE\s+KEY-----/,
            /bearer\s+[A-Za-z0-9-_.]+/i,
            /[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/
        ];

        for (const pattern of forbiddenPatterns) {
            expect(content).not.toMatch(pattern);
        }
    });

    it('verifyProductionState.sh deve conter comandos read-only individuais obrigatórios', () => {
        expect(fs.existsSync(verifyScript)).toBe(true);
        const scriptContent = fs.readFileSync(verifyScript, 'utf8');

        expect(scriptContent).toContain('set -euo pipefail');

        // Comandos de consulta read-only individuais
        expect(scriptContent).toMatch(/gcloud\s+logging\s+metrics\s+describe/);
        expect(scriptContent).toMatch(/gcloud\s+monitoring\s+policies\s+describe/);
        expect(scriptContent).toMatch(/gcloud\s+monitoring\s+policies\s+list/);
        expect(scriptContent).toMatch(/gcloud\s+(beta\s+)?monitoring\s+channels\s+describe/);

        // Proibição estrita de comandos mutadores
        const mutationPatterns = [
            /gcloud\s+.*policies\s+create/,
            /gcloud\s+.*policies\s+update/,
            /gcloud\s+.*policies\s+delete/,
            /gcloud\s+logging\s+metrics\s+create/,
            /gcloud\s+logging\s+metrics\s+update/,
            /gcloud\s+logging\s+metrics\s+delete/,
            /firebase\s+deploy/,
            /curl\s+.*-X\s+(PATCH|POST|PUT|DELETE)/i,
            /terraform\s+apply/
        ];

        for (const pattern of mutationPatterns) {
            expect(scriptContent).not.toMatch(pattern);
        }
    });

    it('verifyProductionState.sh deve implementar a verificação completa dos 4 contratos (Blockers A, B, C e D)', () => {
        const scriptContent = fs.readFileSync(verifyScript, 'utf8');

        // BLOCKER A: Comparação de remote.filter e m.filter para TODAS as 4 métricas
        expect(scriptContent).toMatch(/normalizeFilter\(remote\.filter\)\s*!==\s*normalizeFilter\(m\.filter\)/);

        // BLOCKER B: Validação de unit da métrica
        expect(scriptContent).toMatch(/isUnitEquivalent\(descriptor\.unit,\s*m\.unit\)/);

        // BLOCKER C: Comparação exata do filtro de backend
        expect(scriptContent).toMatch(/normalizeFilter\(cond\.conditionMatchedLog\.filter\)\s*!==\s*normalizeFilter\(expected\.filter\)/);

        // BLOCKER D: Rejeição estrita de duration ausente ou diferente de zero
        expect(scriptContent).toMatch(/isZeroDuration\(ct\.duration\)/);
    });

    it('verifyProductionState.sh deve ser estritamente FAIL-CLOSED (sem falsos PASS)', () => {
        const scriptContent = fs.readFileSync(verifyScript, 'utf8');

        // Garante tratamento explícito de erro em caso de ausência de gcloud ou falha de auth
        expect(scriptContent).toContain('PRODUCTION_MONITORING_DRIFT_CHECK_UNVERIFIED: gcloud_cli_missing');
        expect(scriptContent).toContain('PRODUCTION_MONITORING_DRIFT_CHECK_UNVERIFIED: api_or_auth_failure');

        // O único PASS deve ser após o bloco de validação de canais e políticas (exatamente 1 ocorrência)
        const passMatches = scriptContent.match(/PRODUCTION_MONITORING_DRIFT_CHECK_PASS/g);
        expect(passMatches).not.toBeNull();
        expect(passMatches.length).toBe(1);

        // Garante que os blocos de erro saem com exit 1
        expect(scriptContent).toMatch(/gcloud_cli_missing[\s\S]*?exit 1/);
        expect(scriptContent).toMatch(/api_or_auth_failure[\s\S]*?exit 1/);
    });

    describe('Testes Comportamentais Unitários dos Helpers de Normalização e Validação', () => {
        it('normalizeFilter: deve colapsar múltiplos espaços e quebras de linha e preservar semântica', () => {
            const rawFilter = 'resource.type="cloud_run_revision"\n   AND   severity="ERROR"\n\tAND jsonPayload.stage="test"';
            const expected = 'resource.type="cloud_run_revision" AND severity="ERROR" AND jsonPayload.stage="test"';
            expect(normalizeFilter(rawFilter)).toBe(expected);

            // Filtros semanticamente distintos devem diferir
            const differentFilter = 'resource.type="cloud_run_revision" AND severity="INFO"';
            expect(normalizeFilter(rawFilter)).not.toBe(normalizeFilter(differentFilter));
        });

        it('isZeroDuration: deve aceitar estritamente "0s", "0.000s", "0.0s" e rejeitar valores ausentes ou > 0', () => {
            // Válidos (zero duration)
            expect(isZeroDuration('0s')).toBe(true);
            expect(isZeroDuration('0.000s')).toBe(true);
            expect(isZeroDuration('0.0s')).toBe(true);
            expect(isZeroDuration(' 0s ')).toBe(true);

            // Inválidos (ausentes, nulos, vazios ou > 0)
            expect(isZeroDuration(undefined)).toBe(false);
            expect(isZeroDuration(null)).toBe(false);
            expect(isZeroDuration('')).toBe(false);
            expect(isZeroDuration('   ')).toBe(false);
            expect(isZeroDuration('60s')).toBe(false);
            expect(isZeroDuration('1s')).toBe(false);
            expect(isZeroDuration('300s')).toBe(false);
            expect(isZeroDuration(0)).toBe(false); // Tipo primitivo number não é duration string formatada
        });

        it('isThresholdEquivalent: deve reconhecer equivalência entre 1 e 1.0, 2 e 2.0, 29 e 29.0', () => {
            expect(isThresholdEquivalent(1, 1.0)).toBe(true);
            expect(isThresholdEquivalent(1, '1.0')).toBe(true);
            expect(isThresholdEquivalent('2.0', 2)).toBe(true);
            expect(isThresholdEquivalent(4, '4')).toBe(true);
            expect(isThresholdEquivalent(29, 29.0)).toBe(true);

            // Valores divergentes
            expect(isThresholdEquivalent(1, 2)).toBe(false);
            expect(isThresholdEquivalent(undefined, 1)).toBe(false);
            expect(isThresholdEquivalent(null, 1)).toBe(false);
            expect(isThresholdEquivalent('abc', 1)).toBe(false);
        });

        it('isUnitEquivalent: deve validar equivalência de unidade "1"', () => {
            expect(isUnitEquivalent('1', '1')).toBe(true);
            expect(isUnitEquivalent('1', ' 1 ')).toBe(true);
            expect(isUnitEquivalent('1', '{items}')).toBe(false);
            expect(isUnitEquivalent('1', undefined)).toBe(false);
        });
    });
});
