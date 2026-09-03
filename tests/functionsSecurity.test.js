import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import admin from '../functions/node_modules/firebase-admin';
import accountOperationLock from '../functions/security/accountOperationLock.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Importa funções e helpers do index.js
import {
    validateRecentAuthentication,
    BoundedClientErrorRateLimiter,
    isClientErrorReportAllowed,
    MAX_AUTH_AGE_SECONDS,
    MAX_TRACKED_ERROR_IDENTIFIERS,
    sanitizeErrorMessage,
    deleteUserAccount,
} from '../functions/index.js';

describe('FinControl — First Callables Code Hardening (Fase 8.2 Change Set 6)', () => {

    describe('deleteUserAccount — Recent Auth Policy & Zero Side Effects', () => {
        let firestoreSpy;
        let authSpy;
        let lockSpy;

        beforeEach(() => {
            vi.restoreAllMocks();
            firestoreSpy = vi.spyOn(admin, 'firestore');
            authSpy = vi.spyOn(admin, 'auth');
            lockSpy = vi.spyOn(accountOperationLock, 'acquireAccountOperationLock');
        });

        afterEach(() => {
            vi.restoreAllMocks();
        });

        it('deve rejeitar se auth estiver ausente', () => {
            const res = validateRecentAuthentication(null);
            expect(res.valid).toBe(false);
            expect(res.reason).toBe('unauthenticated');
        });

        it('deve rejeitar se auth_time estiver ausente no token', () => {
            const res = validateRecentAuthentication({ token: {} });
            expect(res.valid).toBe(false);
            expect(res.reason).toBe('missing_auth_time');
        });

        it('deve rejeitar se auth_time for inválido (NaN, string não numérica ou zero/negativo)', () => {
            expect(validateRecentAuthentication({ token: { auth_time: 'not-a-number' } }).reason).toBe('invalid_auth_time');
            expect(validateRecentAuthentication({ token: { auth_time: 0 } }).reason).toBe('invalid_auth_time');
            expect(validateRecentAuthentication({ token: { auth_time: -50 } }).reason).toBe('invalid_auth_time');
        });

        it('deve rejeitar se auth_time for no futuro além da tolerância defensiva (60s)', () => {
            const nowMs = 1700000000000;
            const nowSec = Math.floor(nowMs / 1000);
            // Futuro dentro da tolerância (+30s) => aceita
            const withinTolerance = validateRecentAuthentication({ token: { auth_time: nowSec + 30 } }, 300, 60, nowMs);
            expect(withinTolerance.valid).toBe(true);

            // Futuro além da tolerância (+65s) => rejeita
            const beyondTolerance = validateRecentAuthentication({ token: { auth_time: nowSec + 65 } }, 300, 60, nowMs);
            expect(beyondTolerance.valid).toBe(false);
            expect(beyondTolerance.reason).toBe('future_auth_time');
        });

        it('deve rejeitar se a autenticação for antiga/expirada (> MAX_AUTH_AGE_SECONDS)', () => {
            const nowMs = 1700000000000;
            const nowSec = Math.floor(nowMs / 1000);
            // 301 segundos atrás com limite de 300s
            const staleRes = validateRecentAuthentication({ token: { auth_time: nowSec - 301 } }, 300, 60, nowMs);
            expect(staleRes.valid).toBe(false);
            expect(staleRes.reason).toBe('stale_auth');
            expect(staleRes.ageSeconds).toBe(301);
        });

        it('deve testar com exatidão a boundary da política de recent auth (300s vs 301s)', () => {
            const nowMs = 1700000000000;
            const nowSec = Math.floor(nowMs / 1000);

            // Boundary exata: 300s => válido
            const atLimit = validateRecentAuthentication({ token: { auth_time: nowSec - 300 } }, 300, 60, nowMs);
            expect(atLimit.valid).toBe(true);
            expect(atLimit.ageSeconds).toBe(300);

            // 1 segundo além: 301s => inválido
            const beyondLimit = validateRecentAuthentication({ token: { auth_time: nowSec - 301 } }, 300, 60, nowMs);
            expect(beyondLimit.valid).toBe(false);
            expect(beyondLimit.reason).toBe('stale_auth');
        });

        it('NÃO deve rejeitar usuário apenas por email_verified ser falso se auth_time for recente', () => {
            const nowMs = 1700000000000;
            const nowSec = Math.floor(nowMs / 1000);
            const res = validateRecentAuthentication({
                token: {
                    auth_time: nowSec - 60,
                    email_verified: false,
                }
            }, 300, 60, nowMs);

            expect(res.valid).toBe(true);
            expect(res.ageSeconds).toBe(60);
        });

        it('CASO A — auth_time ausente: rejeita e assegura ZERO side effects na infraestrutura', async () => {
            const request = {
                auth: {
                    uid: 'user-missing-auth-time',
                    token: {} // Sem auth_time
                }
            };

            await expect(deleteUserAccount.run(request))
                .rejects.toThrow('Esta operação requer autenticação recente');

            expect(firestoreSpy).not.toHaveBeenCalled();
            expect(authSpy).not.toHaveBeenCalled();
            expect(lockSpy).not.toHaveBeenCalled();
        });

        it('CASO B — auth_time stale (> 300s): rejeita e assegura ZERO side effects na infraestrutura', async () => {
            const nowSec = Math.floor(Date.now() / 1000);
            const request = {
                auth: {
                    uid: 'user-stale-auth',
                    token: { auth_time: nowSec - 600 } // 10 minutos atrás
                }
            };

            await expect(deleteUserAccount.run(request))
                .rejects.toThrow('Esta operação requer autenticação recente');

            expect(firestoreSpy).not.toHaveBeenCalled();
            expect(authSpy).not.toHaveBeenCalled();
            expect(lockSpy).not.toHaveBeenCalled();
        });

        it('CASO C — requisição sem autenticação: rejeita com unauthenticated e ZERO side effects', async () => {
            const request = { auth: null };

            await expect(deleteUserAccount.run(request))
                .rejects.toThrow('Você precisa estar autenticado para excluir sua conta.');

            expect(firestoreSpy).not.toHaveBeenCalled();
            expect(authSpy).not.toHaveBeenCalled();
            expect(lockSpy).not.toHaveBeenCalled();
        });

        it('CASO D — auth_time recente (60s): gate de autenticação recente passa com sucesso', () => {
            const nowMs = 1700000000000;
            const nowSec = Math.floor(nowMs / 1000);
            const recentAuth = {
                token: {
                    auth_time: nowSec - 60,
                    email_verified: false
                }
            };

            const result = validateRecentAuthentication(recentAuth, 300, 60, nowMs);
            expect(result.valid).toBe(true);
            expect(result.ageSeconds).toBe(60);
        });

        it('ASSERTION ESTRUTURAL: validateRecentAuthentication é invocado antes de qualquer acesso ao Firestore, Lock ou Auth', () => {
            const sourcePath = path.resolve(__dirname, '../functions/index.js');
            const sourceCode = fs.readFileSync(sourcePath, 'utf8');

            const deleteFnStart = sourceCode.indexOf('exports.deleteUserAccount = onCall(');
            expect(deleteFnStart).toBeGreaterThan(-1);

            const recentAuthIdx = sourceCode.indexOf('validateRecentAuthentication(request.auth)', deleteFnStart);
            const firestoreIdx = sourceCode.indexOf('admin.firestore()', deleteFnStart);
            const lockIdx = sourceCode.indexOf('accountOperationLock.acquireAccountOperationLock(', deleteFnStart);
            const authDeleteIdx = sourceCode.indexOf('admin.auth().deleteUser(', deleteFnStart);

            expect(recentAuthIdx).toBeGreaterThan(-1);
            expect(firestoreIdx).toBeGreaterThan(-1);
            expect(lockIdx).toBeGreaterThan(-1);
            expect(authDeleteIdx).toBeGreaterThan(-1);

            // Prova matemática/estrutural: o gate de recent auth ocorre antes de qualquer infraestrutura
            expect(recentAuthIdx).toBeLessThan(firestoreIdx);
            expect(recentAuthIdx).toBeLessThan(lockIdx);
            expect(recentAuthIdx).toBeLessThan(authDeleteIdx);
        });
    });

    describe('reportClientError — Bounded In-Memory Rate Limiting', () => {
        let limiter;

        beforeEach(() => {
            limiter = new BoundedClientErrorRateLimiter({
                windowMs: 60000,
                maxPerWindow: 10,
                maxTracked: 5, // Limite reduzido para testes determinísticos de capacidade
            });
        });

        it('deve permitir até 10 requisições por minuto para o mesmo identificador', () => {
            const now = 1000000;
            for (let i = 1; i <= 10; i++) {
                expect(limiter.isAllowed('client-ip-1', now + i)).toBe(true);
            }
            // 11ª tentativa na mesma janela deve ser throttled
            expect(limiter.isAllowed('client-ip-1', now + 11)).toBe(false);
        });

        it('deve recuperar cota após a janela temporal de 60 segundos deslizar', () => {
            const now = 1000000;
            for (let i = 1; i <= 10; i++) {
                limiter.isAllowed('client-ip-1', now);
            }
            expect(limiter.isAllowed('client-ip-1', now + 1000)).toBe(false);

            // 61 segundos depois: requisições anteriores expiraram da janela deslizante
            expect(limiter.isAllowed('client-ip-1', now + 61000)).toBe(true);
        });

        it('deve limitar estritamente o tamanho do mapa (bounded capacity <= maxTracked)', () => {
            const now = 1000000;
            // Insere 10 identificadores distintos em um limitador com capacidade máxima 5
            for (let i = 1; i <= 10; i++) {
                limiter.isAllowed(`client-${i}`, now + i);
                expect(limiter.size).toBeLessThanOrEqual(5);
            }
            expect(limiter.size).toBe(5);
        });

        it('deve realizar evicção determinística O(1) do identificador mais antigo (LRU)', () => {
            const now = 1000000;
            // Preenche com 5 identificadores: 1, 2, 3, 4, 5
            limiter.isAllowed('id-1', now + 1);
            limiter.isAllowed('id-2', now + 2);
            limiter.isAllowed('id-3', now + 3);
            limiter.isAllowed('id-4', now + 4);
            limiter.isAllowed('id-5', now + 5);

            expect([...limiter.limits.keys()]).toEqual(['id-1', 'id-2', 'id-3', 'id-4', 'id-5']);

            // Acessa id-1 novamente -> id-1 move-se para o final do LRU
            limiter.isAllowed('id-1', now + 6);
            expect([...limiter.limits.keys()]).toEqual(['id-2', 'id-3', 'id-4', 'id-5', 'id-1']);

            // Insere id-6 -> id-2 (mais antigo) deve ser evictado
            limiter.isAllowed('id-6', now + 7);
            expect(limiter.size).toBe(5);
            expect([...limiter.limits.keys()]).toEqual(['id-3', 'id-4', 'id-5', 'id-1', 'id-6']);
        });

        it('deve purgar entradas inativas/expiradas antes de forçar evicção de entradas ativas', () => {
            const now = 1000000;
            // id-old foi inserido em now. id-2 foi inserido em now + 30000 (40s atrás relativo a now + 70000).
            limiter.isAllowed('id-old', now);
            limiter.isAllowed('id-2', now + 30000);
            limiter.isAllowed('id-3', now + 40000);

            // 70 segundos após 'now' (id-old expirou há 70s; id-2 e id-3 ainda estão dentro da janela de 60s):
            limiter.cleanup(now + 70000);
            expect(limiter.limits.has('id-old')).toBe(false);
            expect(limiter.limits.has('id-2')).toBe(true);
            expect(limiter.limits.has('id-3')).toBe(true);
        });

        it('helper global isClientErrorReportAllowed deve funcionar sob defaults canônicos', () => {
            expect(typeof isClientErrorReportAllowed).toBe('function');
            expect(isClientErrorReportAllowed('global-test-id')).toBe(true);
            expect(MAX_TRACKED_ERROR_IDENTIFIERS).toBe(1000);
            expect(MAX_AUTH_AGE_SECONDS).toBe(300);
        });

        it('sanitização de mensagens de erro deve proteger PII e tokens', () => {
            expect(sanitizeErrorMessage('Erro com email user@example.com no login'))
                .toBe('Erro com email [EMAIL_REDACTED] no login');
            expect(sanitizeErrorMessage('Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.token'))
                .toBe('Bearer [TOKEN_REDACTED]');
            expect(sanitizeErrorMessage('Cartao 4532 1122 3344 5566 invalido'))
                .toBe('Cartao [CARD_REDACTED] invalido');
        });
    });

    describe('Configuração Estrutural & App Check Assertions', () => {
        const sourcePath = path.resolve(__dirname, '../functions/index.js');
        const sourceCode = fs.readFileSync(sourcePath, 'utf8');

        it('deleteUserAccount deve ter enforceAppCheck: true estruturalmente configurado', () => {
            expect(sourceCode).toMatch(
                /exports\.deleteUserAccount\s*=\s*onCall\(\s*\{[\s\S]*?enforceAppCheck:\s*true/
            );
        });

        it('deleteUserAccount NÃO deve ter consumeAppCheckToken ativado (replay protection deferred)', () => {
            const match = sourceCode.match(/exports\.deleteUserAccount\s*=\s*onCall\(\s*\{([\s\S]*?)\},\s*async/);
            expect(match).not.toBeNull();
            expect(match[1]).not.toContain('consumeAppCheckToken');
        });

        it('reportClientError deve ter enforceAppCheck: true estruturalmente configurado', () => {
            expect(sourceCode).toMatch(
                /exports\.reportClientError\s*=\s*onCall\(\s*\{[\s\S]*?enforceAppCheck:\s*true/
            );
        });

        it('reportClientError NÃO deve ter consumeAppCheckToken ativado', () => {
            const match = sourceCode.match(/exports\.reportClientError\s*=\s*onCall\(\s*\{([\s\S]*?)\},\s*async/);
            expect(match).not.toBeNull();
            expect(match[1]).not.toContain('consumeAppCheckToken');
        });

        it('funções de Mercado Pago e Gemini NÃO devem ter sido modificadas', () => {
            // createMercadoPagoPreference
            expect(sourceCode).toMatch(
                /exports\.createMercadoPagoPreference\s*=\s*onCall\(\s*\{[\s\S]*?maxInstances:\s*3/
            );
            // paymentWebhookMercadoPago
            expect(sourceCode).toMatch(
                /exports\.paymentWebhookMercadoPago\s*=\s*onRequest\(\s*\{[\s\S]*?maxInstances:\s*3/
            );
            // generateAiMonthlyBriefing
            expect(sourceCode).toMatch(
                /exports\.generateAiMonthlyBriefing\s*=\s*onCall\(\s*\{[\s\S]*?maxInstances:\s*2/
            );
        });
    });
});
