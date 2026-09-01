/* global process */
// tests/monitoringAsCode.test.js
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('FinControl — Monitoring-as-Code & Signal Validation (Fase 7.8.2 Semantic Correction)', () => {
    const monitoringDir = path.join(process.cwd(), 'monitoring');
    const metricsDir = path.join(monitoringDir, 'metrics');

    const policyFiles = fs.readdirSync(monitoringDir).filter(f => f.endsWith('.json'));
    const metricFiles = fs.existsSync(metricsDir) ? fs.readdirSync(metricsDir).filter(f => f.endsWith('.json')) : [];

    it('(K) todos os arquivos JSON em monitoring/ e monitoring/metrics/ devem possuir sintaxe JSON válida', () => {
        expect(policyFiles.length).toBeGreaterThanOrEqual(5);
        expect(metricFiles.length).toBeGreaterThanOrEqual(4);

        for (const file of policyFiles) {
            const content = fs.readFileSync(path.join(monitoringDir, file), 'utf8');
            expect(() => JSON.parse(content), `Erro de sintaxe no arquivo: ${file}`).not.toThrow();
        }

        for (const file of metricFiles) {
            const content = fs.readFileSync(path.join(metricsDir, file), 'utf8');
            expect(() => JSON.parse(content), `Erro de sintaxe no arquivo de métrica: ${file}`).not.toThrow();
        }
    });

    it('todas as políticas devem possuir displayName único e estruturado', () => {
        const displayNames = new Set();
        for (const file of policyFiles) {
            const policy = JSON.parse(fs.readFileSync(path.join(monitoringDir, file), 'utf8'));
            expect(policy.displayName).toBeDefined();
            expect(typeof policy.displayName).toBe('string');
            expect(displayNames.has(policy.displayName), `displayName duplicado: ${policy.displayName}`).toBe(false);
            displayNames.add(policy.displayName);
        }
    });

    // A. Webhook threshold >= 2 não pode ser LogMatch simples
    it('(A) webhook threshold >= 2 deve ser METRIC_THRESHOLD_AGGREGATED e não LogMatch simples', () => {
        const policy = JSON.parse(fs.readFileSync(path.join(monitoringDir, 'alert-webhook-mp-errors.json'), 'utf8'));
        const condition = policy.conditions[0];

        expect(condition.conditionMatchedLog).toBeUndefined();
        expect(condition.conditionThreshold).toBeDefined();
        expect(condition.conditionThreshold.filter).toContain('webhook_processing_errors_count');
        expect(condition.conditionThreshold.comparison).toBe('COMPARISON_GT');
        expect(condition.conditionThreshold.thresholdValue).toBe(1); // >= 2 falhas
    });

    // B. Preference threshold >= 3 não pode ser LogMatch simples
    it('(B) preference threshold >= 3 deve ser METRIC_THRESHOLD_AGGREGATED e não LogMatch simples', () => {
        const policy = JSON.parse(fs.readFileSync(path.join(monitoringDir, 'alert-preference-mp-errors.json'), 'utf8'));
        const condition = policy.conditions[0];

        expect(condition.conditionMatchedLog).toBeUndefined();
        expect(condition.conditionThreshold).toBeDefined();
        expect(condition.conditionThreshold.filter).toContain('preference_errors_count');
        expect(condition.conditionThreshold.comparison).toBe('COMPARISON_GT');
        expect(condition.conditionThreshold.thresholdValue).toBe(2); // >= 3 falhas
    });

    // C. Frontend crash >= 5 não pode ser LogMatch simples
    it('(C) frontend crash >= 5 deve ser METRIC_THRESHOLD_AGGREGATED e não LogMatch simples', () => {
        const policy = JSON.parse(fs.readFileSync(path.join(monitoringDir, 'alert-frontend-crashes.json'), 'utf8'));
        const condition = policy.conditions[0];

        expect(condition.conditionMatchedLog).toBeUndefined();
        expect(condition.conditionThreshold).toBeDefined();
        expect(condition.conditionThreshold.filter).toContain('frontend_crash_count');
        expect(condition.conditionThreshold.comparison).toBe('COMPARISON_GT');
        expect(condition.conditionThreshold.thresholdValue).toBe(4); // >= 5 crashes
    });

    // D. Rate limit >= 30 não pode ser LogMatch simples
    it('(D) rate limit >= 30 deve ser METRIC_THRESHOLD_AGGREGATED e não LogMatch simples', () => {
        const policy = JSON.parse(fs.readFileSync(path.join(monitoringDir, 'alert-rate-limit-flood.json'), 'utf8'));
        const condition = policy.conditions[0];

        expect(condition.conditionMatchedLog).toBeUndefined();
        expect(condition.conditionThreshold).toBeDefined();
        expect(condition.conditionThreshold.filter).toContain('rate_limit_rejections_count');
        expect(condition.conditionThreshold.comparison).toBe('COMPARISON_GT');
        expect(condition.conditionThreshold.thresholdValue).toBe(29); // >= 30 rejeições
    });

    // E. Delete-account single-event pode usar LogMatch
    it('(E) delete-account single-event deve usar conditionMatchedLog com filtro preciso', () => {
        const policy = JSON.parse(fs.readFileSync(path.join(monitoringDir, 'alert-backend-errors.json'), 'utf8'));
        const condition = policy.conditions[0];

        expect(condition.conditionMatchedLog).toBeDefined();
        expect(condition.conditionMatchedLog.filter).toContain('deleteuseraccount');
        expect(condition.conditionMatchedLog.filter).toContain('reportclienterror');
    });

    // F. Metric threshold referencia métrica esperada
    it('(F) todas as políticas de metric threshold devem referenciar métricas em monitoring/metrics/', () => {
        const metricNames = metricFiles.map(f => {
            const m = JSON.parse(fs.readFileSync(path.join(metricsDir, f), 'utf8'));
            return m.name;
        });

        for (const file of policyFiles) {
            const policy = JSON.parse(fs.readFileSync(path.join(monitoringDir, file), 'utf8'));
            const cond = policy.conditions[0];
            if (cond.conditionThreshold) {
                const hasMatchingMetric = metricNames.some(name => cond.conditionThreshold.filter.includes(name));
                expect(hasMatchingMetric, `Métrica não encontrada para política: ${file}`).toBe(true);
            }
        }
    });

    // G. Janela/alignment corresponde ao desenho operacional (300s)
    it('(G) políticas de metric threshold devem utilizar alignmentPeriod de 300s (5 minutos)', () => {
        for (const file of policyFiles) {
            const policy = JSON.parse(fs.readFileSync(path.join(monitoringDir, file), 'utf8'));
            const cond = policy.conditions[0];
            if (cond.conditionThreshold) {
                expect(cond.conditionThreshold.aggregations).toBeDefined();
                expect(cond.conditionThreshold.aggregations[0].alignmentPeriod).toBe('300s');
                expect(cond.conditionThreshold.aggregations[0].perSeriesAligner).toBe('ALIGN_SUM');
            }
        }
    });

    // H. Nenhuma métrica possui labels high-cardinality
    it('(H) nenhuma métrica deve conter labels de alta cardinalidade (userId, userHash, paymentId)', () => {
        for (const file of metricFiles) {
            const metric = JSON.parse(fs.readFileSync(path.join(metricsDir, file), 'utf8'));
            if (metric.labelExtractors) {
                const labels = Object.keys(metric.labelExtractors);
                expect(labels).not.toContain('userId');
                expect(labels).not.toContain('userHash');
                expect(labels).not.toContain('paymentId');
            }
            if (metric.metricDescriptor && metric.metricDescriptor.labels) {
                expect(metric.metricDescriptor.labels.length).toBe(0);
            }
        }
    });

    // I. Notification channel permanece placeholder
    it('(I) notification channel deve ser estritamente NOTIFICATION_CHANNEL_ID_REQUIRED_AT_DEPLOY_TIME', () => {
        for (const file of policyFiles) {
            const policy = JSON.parse(fs.readFileSync(path.join(monitoringDir, file), 'utf8'));
            expect(policy.notificationChannels).toEqual(['NOTIFICATION_CHANNEL_ID_REQUIRED_AT_DEPLOY_TIME']);
        }
    });

    // J. Templates continuam NOT DEPLOYED
    it('(J) todos os templates de política e métrica devem documentar status NOT DEPLOYED', () => {
        for (const file of policyFiles) {
            const policy = JSON.parse(fs.readFileSync(path.join(monitoringDir, file), 'utf8'));
            expect(policy.documentation.content).toContain('NOT DEPLOYED');
            expect(policy.enabled).toBe(false);
        }

        for (const file of metricFiles) {
            const metric = JSON.parse(fs.readFileSync(path.join(metricsDir, file), 'utf8'));
            expect(metric.description).toContain('NOT DEPLOYED');
        }
    });

    // L. Zero secrets, PII e paths pessoais
    it('(L) nenhum arquivo em monitoring/ deve conter secrets, PII ou caminhos locais file:/// / OneDrive', () => {
        const forbiddenPatterns = [
            /AIza[0-9A-Za-z-_]{35}/,
            /APP_USR-[0-9a-zA-Z_-]+/,
            /-----BEGIN\s+PRIVATE\s+KEY-----/,
            /bearer\s+[A-Za-z0-9-_.]+/i,
            /file:\/\/\//i,
            /C:\/Users/i,
            /OneDrive/i
        ];

        const allFiles = [
            ...policyFiles.map(f => path.join(monitoringDir, f)),
            ...metricFiles.map(f => path.join(metricsDir, f)),
            path.join(monitoringDir, 'README.md')
        ];

        for (const filePath of allFiles) {
            const content = fs.readFileSync(filePath, 'utf8');
            for (const pattern of forbiddenPatterns) {
                expect(content, `Violação de padrão (${pattern}) em ${filePath}`).not.toMatch(pattern);
            }
        }
    });
});
