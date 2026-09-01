/* global process */
// tests/monitoringAsCode.test.js
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('FinControl — Monitoring-as-Code & Alert Policy Templates (Fase 7.8.2)', () => {
    const monitoringDir = path.join(process.cwd(), 'monitoring');
    const jsonFiles = fs.readdirSync(monitoringDir).filter(f => f.endsWith('.json'));

    it('deve existir pelo menos um template de alerta em monitoring/', () => {
        expect(jsonFiles.length).toBeGreaterThanOrEqual(3);
    });

    it('todos os arquivos JSON em monitoring/ devem ser JSONs válidos', () => {
        for (const file of jsonFiles) {
            const filePath = path.join(monitoringDir, file);
            const content = fs.readFileSync(filePath, 'utf8');
            expect(() => JSON.parse(content), `Erro de sintaxe no arquivo: ${file}`).not.toThrow();
        }
    });

    it('todas as políticas devem possuir displayName único e estruturado', () => {
        const displayNames = new Set();
        for (const file of jsonFiles) {
            const filePath = path.join(monitoringDir, file);
            const policy = JSON.parse(fs.readFileSync(filePath, 'utf8'));

            expect(policy.displayName).toBeDefined();
            expect(typeof policy.displayName).toBe('string');
            expect(policy.displayName.length).toBeGreaterThan(5);

            expect(displayNames.has(policy.displayName), `displayName duplicado: ${policy.displayName}`).toBe(false);
            displayNames.add(policy.displayName);
        }
    });

    it('todos os templates devem ter conditions válidas com filtros de log não vazios', () => {
        for (const file of jsonFiles) {
            const filePath = path.join(monitoringDir, file);
            const policy = JSON.parse(fs.readFileSync(filePath, 'utf8'));

            expect(Array.isArray(policy.conditions)).toBe(true);
            expect(policy.conditions.length).toBeGreaterThanOrEqual(1);

            for (const cond of policy.conditions) {
                expect(cond.displayName).toBeDefined();
                expect(cond.conditionMatchedLog).toBeDefined();
                expect(cond.conditionMatchedLog.filter).toBeDefined();
                expect(cond.conditionMatchedLog.filter.length).toBeGreaterThan(10);
            }
        }
    });

    it('todos os templates devem usar o placeholder explícito de canal de notificação e NÃO hard-code de canal', () => {
        for (const file of jsonFiles) {
            const filePath = path.join(monitoringDir, file);
            const policy = JSON.parse(fs.readFileSync(filePath, 'utf8'));

            expect(Array.isArray(policy.notificationChannels)).toBe(true);
            expect(policy.notificationChannels).toContain('NOTIFICATION_CHANNEL_ID_REQUIRED_AT_DEPLOY_TIME');

            // Nenhum ID hard-coded numérico de canal
            for (const channel of policy.notificationChannels) {
                expect(channel).not.toMatch(/projects\/.*\/notificationChannels\/\d+/);
                expect(channel).not.toBe('CHANNEL_RESOURCE_NAME');
            }
        }
    });

    it('todos os templates devem documentar o status NOT DEPLOYED ou PROPOSED no corpo da documentação', () => {
        for (const file of jsonFiles) {
            const filePath = path.join(monitoringDir, file);
            const policy = JSON.parse(fs.readFileSync(filePath, 'utf8'));

            expect(policy.documentation).toBeDefined();
            expect(policy.documentation.content).toBeDefined();
            expect(policy.documentation.content).toMatch(/NOT DEPLOYED|PROPOSED/);
        }
    });

    it('nenhum template de monitoramento deve conter secrets, chaves de API, tokens ou PII', () => {
        const forbiddenPatterns = [
            /AIza[0-9A-Za-z-_]{35}/,
            /APP_USR-[0-9a-zA-Z_-]+/,
            /-----BEGIN\s+PRIVATE\s+KEY-----/,
            /bearer\s+[A-Za-z0-9-_.]+/i,
            /[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/
        ];

        for (const file of jsonFiles) {
            const filePath = path.join(monitoringDir, file);
            const content = fs.readFileSync(filePath, 'utf8');

            for (const pattern of forbiddenPatterns) {
                expect(content).not.toMatch(pattern);
            }
        }
    });
});
