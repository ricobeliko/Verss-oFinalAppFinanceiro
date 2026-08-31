/* global process */
// tests/releasePreflight.test.js
import { describe, it, expect } from 'vitest';
import path from 'path';
import fs from 'fs';
import {
    createReleaseManifest,
    formatManifestMarkdown,
    validateNoSecrets,
    normalizeAppCheckAuthMode,
    CANONICAL_FIREBASE_APP_ID,
    CANONICAL_FIREBASE_PROJECT_ID,
    CANONICAL_HOSTING_SITE
} from '../scripts/release/manifestGenerator.js';
import { runPreflightChecks } from '../scripts/release/preflight.js';

describe('FinControl — Release & Staging Readiness (Fase 7.7.1 Operational Gate Correction)', () => {

    const validManifestParams = {
        commitSha: '2e8a90d52cb374d543f99351bb52352e405ffe10',
        buildTimestamp: '2026-08-31T20:00:00.000Z',
        nodeVersion: 'v22.18.0',
        npmVersion: '10.8.2',
        hostingOnly: true,
        indexHtmlSha256: '1d3238d5420086587b1c116d1e9e87bc324aefc0cd266a46d873a150346ec89c',
        firebaseProjectId: CANONICAL_FIREBASE_PROJECT_ID,
        firebaseAppId: CANONICAL_FIREBASE_APP_ID,
        hostingSite: CANONICAL_HOSTING_SITE,
        previousHostingVersion: 'sites/controle-de-cartao/versions/665a043bb8d750ad',
        newHostingVersion: 'sites/controle-de-cartao/versions/fe669241db09ec67',
        appCheckFirestoreMode: 'UNENFORCED',
        appCheckAuthMode: 'OFF/UNSET',
        ciRunId: '33386898691',
        ciConclusion: 'success'
    };

    describe('Release Manifest Generator & Fail-Closed Contracts', () => {

        // A. App ID correto => PASS
        it('(A) deve gerar manifesto válido com Firebase App ID canônico', () => {
            const manifest = createReleaseManifest(validManifestParams);
            expect(manifest.firebaseAppId).toBe('1:364725310124:web:0786258bdcb752d5d70509');
            expect(manifest.appCheckAuthMode).toBe('OFF');
            expect(manifest.hostingOnly).toBe(true);

            const md = formatManifestMarkdown(manifest);
            expect(md).toContain('1:364725310124:web:0786258bdcb752d5d70509');
            expect(md).toContain(validManifestParams.commitSha);
        });

        // B. App ID incorreto => FAIL
        it('(B) deve rejeitar Firebase App ID incorreto ou de outro ambiente', () => {
            expect(() => createReleaseManifest({
                ...validManifestParams,
                firebaseAppId: '1:894086603096:web:ba447055dae082c5f1aa9d'
            })).toThrow(/firebaseAppId incorreto para o ambiente de produção/);
        });

        // C. App ID ausente => FAIL
        it('(C) deve rejeitar manifesto se firebaseAppId estiver ausente (fail-closed)', () => {
            expect(() => createReleaseManifest({
                ...validManifestParams,
                firebaseAppId: undefined
            })).toThrow(/firebaseAppId é obrigatório/);
        });

        // D. SHA 40 chars => PASS
        it('(D) deve aceitar commitSha de exatamente 40 caracteres hexadecimais', () => {
            const manifest = createReleaseManifest({
                ...validManifestParams,
                commitSha: '559be31c7a20011e3224985d6eaaa335771681ab'
            });
            expect(manifest.commitSha).toBe('559be31c7a20011e3224985d6eaaa335771681ab');
        });

        // E. SHA curto / longo / não-hex => FAIL
        it('(E) deve rejeitar commitSha curto (39), longo (41) ou não-hexadecimal', () => {
            // 39 chars
            expect(() => createReleaseManifest({
                ...validManifestParams,
                commitSha: '559be31c7a20011e3224985d6eaaa335771681a'
            })).toThrow(/commitSha é obrigatório e deve ter exatamente 40 caracteres/);

            // 41 chars
            expect(() => createReleaseManifest({
                ...validManifestParams,
                commitSha: '559be31c7a20011e3224985d6eaaa335771681abc0'
            })).toThrow(/commitSha é obrigatório e deve ter exatamente 40 caracteres/);

            // SHA curto de 7 chars (proibido para release final)
            expect(() => createReleaseManifest({
                ...validManifestParams,
                commitSha: '559be31'
            })).toThrow(/commitSha é obrigatório e deve ter exatamente 40 caracteres/);

            // Caracteres não-hexadecimais
            expect(() => createReleaseManifest({
                ...validManifestParams,
                commitSha: '559be31c7a20011e3224985d6eaaa335771681zz'
            })).toThrow(/commitSha é obrigatório e deve ter exatamente 40 caracteres/);
        });

        // M. Manifesto com secret-like field => FAIL & App ID não é classificado como secret
        it('(M) deve bloquear e lançar erro se detectar API Keys ou Secrets no payload, mas permitir App ID canônico', () => {
            // App ID canônico não é secret
            expect(() => validateNoSecrets({ appId: CANONICAL_FIREBASE_APP_ID })).not.toThrow();

            // API key detectada
            expect(() => createReleaseManifest({
                ...validManifestParams,
                leakedKey: 'AIzaSyA_example_fake_api_key_35_chars_long'
            })).toThrow(/SECURITY_GATE_VIOLATION/);

            // Mercado Pago token detectado
            expect(() => createReleaseManifest({
                ...validManifestParams,
                mpSecret: 'APP_USR-1234567890-abcdef-123456'
            })).toThrow(/SECURITY_GATE_VIOLATION/);
        });

        // N. hostingOnly=false => FAIL
        it('(N) deve rejeitar tentativa de deploy com hostingOnly = false (Gate de Segurança)', () => {
            expect(() => createReleaseManifest({
                ...validManifestParams,
                hostingOnly: false
            })).toThrow(/DEPLOY_SAFETY_VIOLATION/);
        });

        it('deve rejeitar firebaseProjectId ou hostingSite divergentes de controle-de-cartao', () => {
            expect(() => createReleaseManifest({
                ...validManifestParams,
                firebaseProjectId: 'outro-projeto'
            })).toThrow(/firebaseProjectId inválido/);

            expect(() => createReleaseManifest({
                ...validManifestParams,
                hostingSite: 'outro-site'
            })).toThrow(/hostingSite inválido/);
        });

        it('deve normalizar o modo de autenticação do App Check', () => {
            expect(normalizeAppCheckAuthMode('OFF/UNSET')).toBe('OFF');
            expect(normalizeAppCheckAuthMode('UNSET')).toBe('OFF');
            expect(normalizeAppCheckAuthMode('OFF')).toBe('OFF');
            expect(normalizeAppCheckAuthMode('ENFORCED')).toBe('ENFORCED');
        });
    });

    describe('Release Preflight Validator & Git/Bundle Gates', () => {
        const fullValidSha = '2e8a90d52cb374d543f99351bb52352e405ffe10';

        // F. worktree dirty => FAIL
        it('(F) deve falhar se o worktree não estiver limpo (DIRTY_WORKTREE)', () => {
            const result = runPreflightChecks({
                nodeVersion: 'v22.18.0',
                isWorktreeClean: false,
                requireDist: false
            });

            expect(result.passed).toBe(false);
            expect(result.errors.some(e => e.includes('WORKTREE_CLEAN'))).toBe(true);
        });

        // G. currentHead != expectedHead => FAIL
        it('(G) deve falhar se currentHead for diferente de expectedHead', () => {
            const result = runPreflightChecks({
                nodeVersion: 'v22.18.0',
                isWorktreeClean: true,
                requireDist: false,
                currentHead: '1111111111111111111111111111111111111111',
                expectedHead: '2222222222222222222222222222222222222222'
            });

            expect(result.passed).toBe(false);
            expect(result.errors.some(e => e.includes('HEAD_MATCH'))).toBe(true);
        });

        // H. origin/main != expectedHead => FAIL
        it('(H) deve falhar se origin/main divergir de expectedHead', () => {
            const result = runPreflightChecks({
                nodeVersion: 'v22.18.0',
                isWorktreeClean: true,
                requireDist: false,
                currentHead: fullValidSha,
                expectedHead: fullValidSha,
                originMainHead: '3333333333333333333333333333333333333333'
            });

            expect(result.passed).toBe(false);
            expect(result.errors.some(e => e.includes('ORIGIN_MAIN_MATCH'))).toBe(true);
        });

        // I. currentHead == origin/main == expectedHead => PASS
        it('(I) deve passar quando currentHead == origin/main == expectedHead com ambiente limpo', () => {
            const result = runPreflightChecks({
                nodeVersion: 'v22.18.0',
                isWorktreeClean: true,
                requireDist: false,
                currentHead: fullValidSha,
                expectedHead: fullValidSha,
                originMainHead: fullValidSha
            });

            expect(result.passed).toBe(true);
            expect(result.errors.length).toBe(0);
        });

        // J. requireDist default operacional => true
        it('(J) deve ter requireDist = true como padrão operacional fail-closed', () => {
            // Se chamar sem requireDist e dist não existir em um path inexistente -> deve falhar
            const result = runPreflightChecks({
                nodeVersion: 'v22.18.0',
                isWorktreeClean: true,
                currentHead: fullValidSha,
                expectedHead: fullValidSha,
                distPath: path.join(process.cwd(), 'non-existent-dist-dir-test-j')
            });

            expect(result.passed).toBe(false);
            expect(result.errors.some(e => e.includes('DIST_PRESENT'))).toBe(true);
        });

        // K. dist ausente => FAIL
        it('(K) deve falhar se dist/index.html estiver ausente com requireDist=true', () => {
            const result = runPreflightChecks({
                nodeVersion: 'v22.18.0',
                isWorktreeClean: true,
                requireDist: true,
                distPath: path.join(process.cwd(), 'non-existent-dist-dir-test-k')
            });

            expect(result.passed).toBe(false);
            expect(result.errors.some(e => e.includes('DIST_PRESENT'))).toBe(true);
        });

        // L. demo config no bundle => FAIL
        it('(L) deve rejeitar bundle contendo configurações de teste sintéticas / demo', () => {
            const tempDist = path.join(process.cwd(), 'scratch', 'test-demo-dist');
            const tempAssets = path.join(tempDist, 'assets');
            fs.mkdirSync(tempAssets, { recursive: true });
            fs.writeFileSync(path.join(tempDist, 'index.html'), '<html><body>FinControl</body></html>');
            fs.writeFileSync(path.join(tempAssets, 'chunk-e2e.js'), 'const apiKey = "demo-e2e-api-key";');

            try {
                const result = runPreflightChecks({
                    nodeVersion: 'v22.18.0',
                    isWorktreeClean: true,
                    requireDist: true,
                    distPath: tempDist,
                    currentHead: fullValidSha,
                    expectedHead: fullValidSha
                });

                expect(result.passed).toBe(false);
                expect(result.errors.some(e => e.includes('DEMO_FALLBACK_ABSENT'))).toBe(true);
            } finally {
                fs.rmSync(tempDist, { recursive: true, force: true });
            }
        });
    });
});
