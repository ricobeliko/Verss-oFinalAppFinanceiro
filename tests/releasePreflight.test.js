/* global process */
// tests/releasePreflight.test.js
import { describe, it, expect, afterEach } from 'vitest';
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

describe('FinControl — Release & Staging Readiness (Fase 7.7.1 Final Fail-Closed Gate)', () => {

    const validManifestParams = {
        commitSha: '4d2118ce3ffface662a29a9e74aaba571a534c0b',
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
        ciRunId: '33450366622',
        ciConclusion: 'success'
    };

    afterEach(() => {
        delete process.env.FINCONTROL_ALLOW_NODE_VERSION;
    });

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

        // D. ciConclusion ausente => FAIL
        it('(D) deve rejeitar manifesto se ciConclusion estiver ausente', () => {
            expect(() => createReleaseManifest({
                ...validManifestParams,
                ciConclusion: undefined
            })).toThrow(/ciConclusion é obrigatório/);
        });

        // E. ciConclusion=failure => FAIL
        it('(E) deve rejeitar manifesto se ciConclusion for "failure"', () => {
            expect(() => createReleaseManifest({
                ...validManifestParams,
                ciConclusion: 'failure'
            })).toThrow(/ciConclusion deve ser estritamente "success"/);
        });

        // F. ciConclusion=cancelled => FAIL
        it('(F) deve rejeitar manifesto se ciConclusion for "cancelled"', () => {
            expect(() => createReleaseManifest({
                ...validManifestParams,
                ciConclusion: 'cancelled'
            })).toThrow(/ciConclusion deve ser estritamente "success"/);
        });

        // G. ciConclusion=success => PASS
        it('(G) deve aceitar manifesto quando ciConclusion for "success"', () => {
            const manifest = createReleaseManifest({
                ...validManifestParams,
                ciConclusion: 'success'
            });
            expect(manifest.ciConclusion).toBe('success');
        });

        // H. appCheckFirestoreMode ausente => FAIL
        it('(H) deve rejeitar manifesto se appCheckFirestoreMode estiver ausente', () => {
            expect(() => createReleaseManifest({
                ...validManifestParams,
                appCheckFirestoreMode: undefined
            })).toThrow(/appCheckFirestoreMode é obrigatório/);
        });

        // I. appCheckFirestoreMode inválido => FAIL
        it('(I) deve rejeitar manifesto se appCheckFirestoreMode for inválido', () => {
            expect(() => createReleaseManifest({
                ...validManifestParams,
                appCheckFirestoreMode: 'INVALID_MODE'
            })).toThrow(/appCheckFirestoreMode inválido/);
        });

        // J. UNENFORCED => PASS
        it('(J) deve aceitar appCheckFirestoreMode="UNENFORCED"', () => {
            const manifest = createReleaseManifest({
                ...validManifestParams,
                appCheckFirestoreMode: 'UNENFORCED'
            });
            expect(manifest.appCheckFirestoreMode).toBe('UNENFORCED');
        });

        // K. ENFORCED => PASS
        it('(K) deve aceitar appCheckFirestoreMode="ENFORCED"', () => {
            const manifest = createReleaseManifest({
                ...validManifestParams,
                appCheckFirestoreMode: 'ENFORCED'
            });
            expect(manifest.appCheckFirestoreMode).toBe('ENFORCED');
        });

        // L. appCheckAuthMode ausente => FAIL
        it('(L) deve rejeitar manifesto se appCheckAuthMode estiver ausente', () => {
            expect(() => createReleaseManifest({
                ...validManifestParams,
                appCheckAuthMode: undefined
            })).toThrow(/appCheckAuthMode é obrigatório/);
        });

        // M. OFF/UNSET => normaliza OFF e PASS
        it('(M) deve normalizar "OFF/UNSET" e "UNSET" para "OFF"', () => {
            const manifest1 = createReleaseManifest({
                ...validManifestParams,
                appCheckAuthMode: 'OFF/UNSET'
            });
            expect(manifest1.appCheckAuthMode).toBe('OFF');

            const manifest2 = createReleaseManifest({
                ...validManifestParams,
                appCheckAuthMode: 'UNSET'
            });
            expect(manifest2.appCheckAuthMode).toBe('OFF');
        });

        // N. OFF => PASS
        it('(N) deve aceitar appCheckAuthMode="OFF"', () => {
            const manifest = createReleaseManifest({
                ...validManifestParams,
                appCheckAuthMode: 'OFF'
            });
            expect(manifest.appCheckAuthMode).toBe('OFF');
        });

        // O. ENFORCED => PASS
        it('(O) deve aceitar appCheckAuthMode="ENFORCED"', () => {
            const manifest = createReleaseManifest({
                ...validManifestParams,
                appCheckAuthMode: 'ENFORCED'
            });
            expect(manifest.appCheckAuthMode).toBe('ENFORCED');
        });

        // P. modo Auth desconhecido => FAIL
        it('(P) deve falhar e lançar erro se appCheckAuthMode for desconhecido', () => {
            expect(() => createReleaseManifest({
                ...validManifestParams,
                appCheckAuthMode: 'CUSTOM_UNSUPPORTED'
            })).toThrow(/appCheckAuthMode inválido ou desconhecido/);

            expect(() => normalizeAppCheckAuthMode('SOME_UNKNOWN_MODE'))
                .toThrow(/appCheckAuthMode inválido ou desconhecido/);
        });

        it('deve aceitar commitSha de exatamente 40 caracteres hexadecimais', () => {
            const manifest = createReleaseManifest({
                ...validManifestParams,
                commitSha: '559be31c7a20011e3224985d6eaaa335771681ab'
            });
            expect(manifest.commitSha).toBe('559be31c7a20011e3224985d6eaaa335771681ab');
        });

        it('deve rejeitar commitSha curto (39), longo (41) ou não-hexadecimal', () => {
            expect(() => createReleaseManifest({
                ...validManifestParams,
                commitSha: '559be31c7a20011e3224985d6eaaa335771681a'
            })).toThrow(/commitSha é obrigatório e deve ter exatamente 40 caracteres/);

            expect(() => createReleaseManifest({
                ...validManifestParams,
                commitSha: '559be31c7a20011e3224985d6eaaa335771681abc0'
            })).toThrow(/commitSha é obrigatório e deve ter exatamente 40 caracteres/);

            expect(() => createReleaseManifest({
                ...validManifestParams,
                commitSha: '559be31'
            })).toThrow(/commitSha é obrigatório e deve ter exatamente 40 caracteres/);

            expect(() => createReleaseManifest({
                ...validManifestParams,
                commitSha: '559be31c7a20011e3224985d6eaaa335771681zz'
            })).toThrow(/commitSha é obrigatório e deve ter exatamente 40 caracteres/);
        });

        it('deve bloquear e lançar erro se detectar API Keys ou Secrets no payload, mas permitir App ID canônico', () => {
            expect(() => validateNoSecrets({ appId: CANONICAL_FIREBASE_APP_ID })).not.toThrow();

            expect(() => createReleaseManifest({
                ...validManifestParams,
                leakedKey: 'AIzaSyA_example_fake_api_key_35_chars_long'
            })).toThrow(/SECURITY_GATE_VIOLATION/);

            expect(() => createReleaseManifest({
                ...validManifestParams,
                mpSecret: 'APP_USR-1234567890-abcdef-123456'
            })).toThrow(/SECURITY_GATE_VIOLATION/);
        });

        it('deve rejeitar tentativa de deploy com hostingOnly = false (Gate de Segurança)', () => {
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
    });

    describe('Release Preflight Validator & Git/Bundle Gates', () => {
        const fullValidSha = '4d2118ce3ffface662a29a9e74aaba571a534c0b';

        // A. Node 22 => PASS
        it('(A) deve passar quando nodeVersion for Node 22.x', () => {
            const result = runPreflightChecks({
                nodeVersion: 'v22.18.0',
                isWorktreeClean: true,
                requireDist: false,
                currentHead: fullValidSha,
                expectedHead: fullValidSha
            });

            expect(result.passed).toBe(true);
            expect(result.errors.length).toBe(0);
        });

        // B. Node 24 => FAIL
        it('(B) deve falhar estritamente se nodeVersion for Node 24.x', () => {
            const result = runPreflightChecks({
                nodeVersion: 'v24.19.0',
                isWorktreeClean: true,
                requireDist: false,
                currentHead: fullValidSha,
                expectedHead: fullValidSha
            });

            expect(result.passed).toBe(false);
            expect(result.errors.some(e => e.includes('NODE_22'))).toBe(true);
        });

        // C. FINCONTROL_ALLOW_NODE_VERSION=true NÃO pode mudar B
        it('(C) FINCONTROL_ALLOW_NODE_VERSION=true NÃO deve fazer bypass e Node 24 continua falhando', () => {
            process.env.FINCONTROL_ALLOW_NODE_VERSION = 'true';
            const result = runPreflightChecks({
                nodeVersion: 'v24.19.0',
                isWorktreeClean: true,
                requireDist: false,
                currentHead: fullValidSha,
                expectedHead: fullValidSha
            });

            expect(result.passed).toBe(false);
            expect(result.errors.some(e => e.includes('NODE_22'))).toBe(true);
        });

        it('deve falhar se o worktree não estiver limpo (DIRTY_WORKTREE)', () => {
            const result = runPreflightChecks({
                nodeVersion: 'v22.18.0',
                isWorktreeClean: false,
                requireDist: false
            });

            expect(result.passed).toBe(false);
            expect(result.errors.some(e => e.includes('WORKTREE_CLEAN'))).toBe(true);
        });

        it('deve falhar se currentHead for diferente de expectedHead', () => {
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

        it('deve falhar se origin/main divergir de expectedHead', () => {
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

        it('deve passar quando currentHead == origin/main == expectedHead com ambiente limpo', () => {
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

        it('deve ter requireDist = true como padrão operacional fail-closed', () => {
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

        it('deve falhar se dist/index.html estiver ausente com requireDist=true', () => {
            const result = runPreflightChecks({
                nodeVersion: 'v22.18.0',
                isWorktreeClean: true,
                requireDist: true,
                distPath: path.join(process.cwd(), 'non-existent-dist-dir-test-k')
            });

            expect(result.passed).toBe(false);
            expect(result.errors.some(e => e.includes('DIST_PRESENT'))).toBe(true);
        });

        it('deve rejeitar bundle contendo configurações de teste sintéticas / demo', () => {
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
