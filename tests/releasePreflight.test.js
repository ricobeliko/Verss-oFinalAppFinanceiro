// tests/releasePreflight.test.js
import { describe, it, expect } from 'vitest';
import { createReleaseManifest, formatManifestMarkdown } from '../scripts/release/manifestGenerator.js';
import { runPreflightChecks } from '../scripts/release/preflight.js';

describe('FinControl — Release & Staging Readiness (Fase 7.7.1)', () => {

    describe('Release Manifest Generator', () => {
        const validParams = {
            commitSha: '559be31c7a20011e3224985d6eaaa335771681ab',
            buildTimestamp: '2026-08-31T08:00:00.000Z',
            nodeVersion: 'v22.18.0',
            npmVersion: '10.8.2',
            hostingOnly: true,
            indexHtmlSha256: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
            firebaseProjectId: 'controle-de-cartao',
            firebaseAppId: '1:894086603096:web:ba447055dae082c5f1aa9d',
            hostingSite: 'controle-de-cartao',
            previousHostingVersion: 'sites/controle-de-cartao/versions/665a043bb8d750ad',
            newHostingVersion: 'sites/controle-de-cartao/versions/fe669241db09ec67',
            appCheckFirestoreMode: 'UNENFORCED',
            appCheckAuthMode: 'OFF',
            ciRunId: '33377084665',
            ciConclusion: 'success'
        };

        it('deve gerar manifest completo e válido com parâmetros conformes', () => {
            const manifest = createReleaseManifest(validParams);
            expect(manifest.commitSha).toBe(validParams.commitSha);
            expect(manifest.hostingOnly).toBe(true);
            expect(manifest.indexHtmlSha256).toBe(validParams.indexHtmlSha256);
            expect(manifest.securityGates.functionsBlocked).toBe(true);
            expect(manifest.securityGates.firestoreIndexesBlocked).toBe(true);

            const markdown = formatManifestMarkdown(manifest);
            expect(markdown).toContain('Release Manifest');
            expect(markdown).toContain(validParams.commitSha);
            expect(markdown).toContain(validParams.indexHtmlSha256);
            expect(markdown).toContain('BLOCKED (DRIFT DRILL RECONCILIATION PENDING)');
        });

        it('deve rejeitar commitSha inválido ou ausente', () => {
            expect(() => createReleaseManifest({ ...validParams, commitSha: '' }))
                .toThrow(/commitSha é obrigatório/);

            expect(() => createReleaseManifest({ ...validParams, commitSha: 'not-a-sha-xyz!' }))
                .toThrow(/commitSha é obrigatório/);
        });

        it('deve rejeitar tentativa de deploy com hostingOnly = false (Gate de Segurança)', () => {
            expect(() => createReleaseManifest({ ...validParams, hostingOnly: false }))
                .toThrow(/DEPLOY_SAFETY_VIOLATION/);
        });

        it('deve rejeitar falta de previousHostingVersion ou newHostingVersion para garantir rastreabilidade de rollback', () => {
            expect(() => createReleaseManifest({ ...validParams, previousHostingVersion: null }))
                .toThrow(/previousHostingVersion é obrigatório/);

            expect(() => createReleaseManifest({ ...validParams, newHostingVersion: '' }))
                .toThrow(/newHostingVersion é obrigatório/);
        });

        it('deve rejeitar falta de ciRunId para garantir rastreabilidade com GitHub Actions', () => {
            expect(() => createReleaseManifest({ ...validParams, ciRunId: null }))
                .toThrow(/ciRunId do GitHub Actions é obrigatório/);
        });

        it('deve bloquear e lançar erro se detectar API Keys ou Secrets no payload do manifesto', () => {
            const secretLeakParams = {
                ...validParams,
                leakedApiKey: 'AIzaSyA_example_fake_api_key_35_chars_long'
            };
            expect(() => createReleaseManifest(secretLeakParams))
                .toThrow(/SECURITY_GATE_VIOLATION/);

            const mpTokenLeakParams = {
                ...validParams,
                mpSecret: 'APP_USR-1234567890-abcdef-123456'
            };
            expect(() => createReleaseManifest(mpTokenLeakParams))
                .toThrow(/SECURITY_GATE_VIOLATION/);
        });
    });

    describe('Release Preflight Validator', () => {
        it('deve passar em todas as checagens com ambiente saudável e Node 22', () => {
            const result = runPreflightChecks({
                nodeVersion: 'v22.18.0',
                isWorktreeClean: true,
                currentHead: '559be31c7a20011e3224985d6eaaa335771681ab',
                expectedHead: '559be31c7a20011e3224985d6eaaa335771681ab'
            });

            expect(result.passed).toBe(true);
            expect(result.errors.length).toBe(0);
            expect(result.indexHtmlSha256).toBeDefined();
            expect(result.indexHtmlSha256.length).toBe(64);
        });

        it('deve falhar se a versão do Node não for 22.x', () => {
            const result = runPreflightChecks({
                nodeVersion: 'v20.11.0',
                isWorktreeClean: true
            });

            expect(result.passed).toBe(false);
            expect(result.errors.some(e => e.includes('Node inválido'))).toBe(true);
        });

        it('deve falhar se o worktree não estiver limpo', () => {
            const result = runPreflightChecks({
                nodeVersion: 'v22.18.0',
                isWorktreeClean: false
            });

            expect(result.passed).toBe(false);
            expect(result.errors.some(e => e.includes('Worktree contém arquivos sujos'))).toBe(true);
        });

        it('deve falhar se o HEAD atual divergir do esperado', () => {
            const result = runPreflightChecks({
                nodeVersion: 'v22.18.0',
                isWorktreeClean: true,
                currentHead: '1111111111111111111111111111111111111111',
                expectedHead: '2222222222222222222222222222222222222222'
            });

            expect(result.passed).toBe(false);
            expect(result.errors.some(e => e.includes('HEAD divergente'))).toBe(true);
        });
    });
});
