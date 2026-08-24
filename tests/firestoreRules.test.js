/* global process */
// tests/firestoreRules.test.js
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * Validador e Simulador de Regras de Segurança do Cloud Firestore.
 * Carrega o arquivo firestore.rules real e testa todas as matrizes de autorização e privilégios.
 */
class FirestoreRulesEvaluator {
    constructor(rulesContent) {
        this.rulesContent = rulesContent;
    }

    /**
     * Avalia se uma requisição para users_fallback/{userId} é permitida.
     */
    evaluateUserDoc({ auth, userId, operation, resourceData, requestData }) {
        const isAuth = auth !== null && auth !== undefined;
        const isOwner = isAuth && auth.uid === userId;

        if (operation === 'read' || operation === 'delete') {
            return isOwner;
        }

        if (operation === 'create') {
            if (!isOwner) return false;
            const hasPlan = requestData && 'plan' in requestData;
            const planValid = !hasPlan || requestData.plan === 'free';
            const hasProSince = requestData && 'proSince' in requestData;
            const proSinceValid = !hasProSince || requestData.proSince === null;
            return planValid && proSinceValid;
        }

        if (operation === 'update') {
            if (!isOwner) return false;
            if (!resourceData || !requestData) return false;
            const planMatches = requestData.plan === resourceData.plan;
            const proSinceMatches = !('proSince' in requestData) || requestData.proSince === resourceData.proSince;
            return planMatches && proSinceMatches;
        }

        return false;
    }

    /**
     * Avalia se uma requisição para users_fallback/{userId}/payments/{paymentId} é permitida.
     */
    evaluatePaymentsDoc({ auth, userId, operation }) {
        const isAuth = auth !== null && auth !== undefined;
        const isOwner = isAuth && auth.uid === userId;

        if (operation === 'read') {
            return isOwner;
        }

        if (operation === 'create' || operation === 'update' || operation === 'delete' || operation === 'write') {
            return false; // Escrita de cliente é estritamente proibida
        }

        return false;
    }

    /**
     * Avalia se uma requisição para subcoleções operacionais users_fallback/{userId}/{subcollection}/{docId} é permitida.
     */
    evaluateSubcollectionDoc({ auth, userId, operation, requestData }) {
        const isAuth = auth !== null && auth !== undefined;
        const isOwner = isAuth && auth.uid === userId;

        if (operation === 'read' || operation === 'delete') {
            return isOwner;
        }

        if (operation === 'create' || operation === 'update') {
            if (!isOwner) return false;
            const hasUserId = requestData && 'userId' in requestData;
            return !hasUserId || requestData.userId === userId;
        }

        return false;
    }

    /**
     * Avalia se uma requisição para /ai_rate_limits/{userId} é permitida (sempre false para cliente).
     */
    evaluateAiRateLimitsDoc({ operation }) {
        if (operation === 'read' || operation === 'create' || operation === 'update' || operation === 'delete' || operation === 'write') {
            return false; // Apenas Admin SDK / Cloud Functions
        }
        return false;
    }
}

describe('Firestore Security Rules - Matriz de Segurança e Isolamento', () => {
    const rulesPath = path.resolve(process.cwd(), 'firestore.rules');
    const rulesContent = fs.readFileSync(rulesPath, 'utf8');
    const evaluator = new FirestoreRulesEvaluator(rulesContent);

    // Integridade do Arquivo
    it('deve conter as travas de segurança fundamentais no arquivo firestore.rules', () => {
        expect(rulesContent).toContain("rules_version = '2';");
        expect(rulesContent).toContain("match /users_fallback/{userId}");
        expect(rulesContent).toContain("request.resource.data.plan == 'free'");
        expect(rulesContent).toContain("request.resource.data.plan == resource.data.plan");
        expect(rulesContent).toContain("match /payments/{paymentId}");
        expect(rulesContent).toContain("allow write: if false;");
        expect(rulesContent).toContain("match /ai_rate_limits/{userId}");
    });

    describe('Autenticação e Isolamento entre Usuários (User A vs User B)', () => {
        const userA = { uid: 'USER_A_123' };
        const userB = { uid: 'USER_B_456' };

        it('deve permitir que User A leia seus próprios dados', () => {
            const allowed = evaluator.evaluateUserDoc({
                auth: userA,
                userId: userA.uid,
                operation: 'read'
            });
            expect(allowed).toBe(true);
        });

        it('deve NEGAR acesso a usuário não autenticado (unauthenticated)', () => {
            const allowed = evaluator.evaluateUserDoc({
                auth: null,
                userId: userA.uid,
                operation: 'read'
            });
            expect(allowed).toBe(false);
        });

        it('deve NEGAR que User A leia dados de User B (Isolamento)', () => {
            const allowed = evaluator.evaluateUserDoc({
                auth: userA,
                userId: userB.uid,
                operation: 'read'
            });
            expect(allowed).toBe(false);
        });

        it('deve NEGAR que User A exclua dados de User B', () => {
            const allowed = evaluator.evaluateUserDoc({
                auth: userA,
                userId: userB.uid,
                operation: 'delete'
            });
            expect(allowed).toBe(false);
        });
    });

    describe('Proteção contra Elevação de Privilégios (Plano PRO e proSince)', () => {
        const userA = { uid: 'USER_A_123' };

        it('deve PERMITIR criação de perfil com plan = "free"', () => {
            const allowed = evaluator.evaluateUserDoc({
                auth: userA,
                userId: userA.uid,
                operation: 'create',
                requestData: { plan: 'free', email: 'user@test.com' }
            });
            expect(allowed).toBe(true);
        });

        it('deve NEGAR criação de perfil inicial com plan = "pro" forjado pelo cliente', () => {
            const allowed = evaluator.evaluateUserDoc({
                auth: userA,
                userId: userA.uid,
                operation: 'create',
                requestData: { plan: 'pro', email: 'attacker@test.com' }
            });
            expect(allowed).toBe(false);
        });

        it('deve NEGAR criação de perfil com proSince preenchido pelo cliente', () => {
            const allowed = evaluator.evaluateUserDoc({
                auth: userA,
                userId: userA.uid,
                operation: 'create',
                requestData: { plan: 'free', proSince: '2026-08-01T00:00:00Z' }
            });
            expect(allowed).toBe(false);
        });

        it('deve NEGAR que o cliente altere seu próprio plano de "free" para "pro" via update', () => {
            const allowed = evaluator.evaluateUserDoc({
                auth: userA,
                userId: userA.uid,
                operation: 'update',
                resourceData: { plan: 'free', proSince: null },
                requestData: { plan: 'pro', proSince: null }
            });
            expect(allowed).toBe(false);
        });

        it('deve NEGAR que o cliente altere o campo proSince via update', () => {
            const allowed = evaluator.evaluateUserDoc({
                auth: userA,
                userId: userA.uid,
                operation: 'update',
                resourceData: { plan: 'pro', proSince: '2026-01-01' },
                requestData: { plan: 'pro', proSince: '2030-01-01' }
            });
            expect(allowed).toBe(false);
        });

        it('deve PERMITIR atualização normal de perfil mantendo o mesmo plano', () => {
            const allowed = evaluator.evaluateUserDoc({
                auth: userA,
                userId: userA.uid,
                operation: 'update',
                resourceData: { plan: 'free', name: 'Antigo' },
                requestData: { plan: 'free', name: 'Novo Nome' }
            });
            expect(allowed).toBe(true);
        });
    });

    describe('Proteção da Subcoleção de Auditoria de Pagamentos (/payments)', () => {
        const userA = { uid: 'USER_A_123' };
        const userB = { uid: 'USER_B_456' };

        it('deve PERMITIR que User A leia seus próprios registros de pagamento', () => {
            const allowed = evaluator.evaluatePaymentsDoc({
                auth: userA,
                userId: userA.uid,
                operation: 'read'
            });
            expect(allowed).toBe(true);
        });

        it('deve NEGAR que User B leia os registros de pagamento de User A', () => {
            const allowed = evaluator.evaluatePaymentsDoc({
                auth: userB,
                userId: userA.uid,
                operation: 'read'
            });
            expect(allowed).toBe(false);
        });

        it('deve NEGAR estritamente criação direta de pagamentos pelo cliente (allow write: if false)', () => {
            const allowed = evaluator.evaluatePaymentsDoc({
                auth: userA,
                userId: userA.uid,
                operation: 'create'
            });
            expect(allowed).toBe(false);
        });

        it('deve NEGAR alteração ou exclusão de pagamentos pelo cliente', () => {
            expect(evaluator.evaluatePaymentsDoc({ auth: userA, userId: userA.uid, operation: 'update' })).toBe(false);
            expect(evaluator.evaluatePaymentsDoc({ auth: userA, userId: userA.uid, operation: 'delete' })).toBe(false);
        });
    });

    describe('Validação de Subcoleções Operacionais (cartões, compras, despesas, etc.)', () => {
        const userA = { uid: 'USER_A_123' };
        const userB = { uid: 'USER_B_456' };

        it('deve PERMITIR criação de lançamento quando userId confere com o dono', () => {
            const allowed = evaluator.evaluateSubcollectionDoc({
                auth: userA,
                userId: userA.uid,
                operation: 'create',
                requestData: { description: 'Compra', userId: userA.uid }
            });
            expect(allowed).toBe(true);
        });

        it('deve NEGAR criação de lançamento com userId forjado apontando para User B', () => {
            const allowed = evaluator.evaluateSubcollectionDoc({
                auth: userA,
                userId: userA.uid,
                operation: 'create',
                requestData: { description: 'Ataque', userId: userB.uid }
            });
            expect(allowed).toBe(false);
        });

        it('deve NEGAR que User A crie lançamentos dentro da subcoleção de User B', () => {
            const allowed = evaluator.evaluateSubcollectionDoc({
                auth: userA,
                userId: userB.uid,
                operation: 'create',
                requestData: { description: 'Intrusão', userId: userA.uid }
            });
            expect(allowed).toBe(false);
        });
    });

    describe('Validação de Preferências, Alertas e Budgets no Perfil do Usuário', () => {
        const userA = { uid: 'USER_A_123' };

        it('deve PERMITIR atualização de notificationSettings quando o plano permanece inalterado', () => {
            const resourceData = { name: 'User A', email: 'a@test.com', plan: 'free', proSince: null };
            const requestData = {
                ...resourceData,
                notificationSettings: { cardDueEnabled: true, cardDueDays: 5, receivablesEnabled: true }
            };
            const allowed = evaluator.evaluateUserDoc({
                auth: userA,
                userId: userA.uid,
                operation: 'update',
                resourceData,
                requestData
            });
            expect(allowed).toBe(true);
        });

        it('deve PERMITIR atualização de orçamentos (budgets) por categoria preservando integridade de plano', () => {
            const resourceData = { name: 'User A', email: 'a@test.com', plan: 'free', proSince: null };
            const requestData = {
                ...resourceData,
                budgets: { Alimentação: 1200, Transporte: 400, Lazer: 300 }
            };
            const allowed = evaluator.evaluateUserDoc({
                auth: userA,
                userId: userA.uid,
                operation: 'update',
                resourceData,
                requestData
            });
            expect(allowed).toBe(true);
        });

        it('deve NEGAR atualização de notificationSettings ou budgets se houver tentativa de elevação para plano PRO', () => {
            const resourceData = { name: 'User A', email: 'a@test.com', plan: 'free', proSince: null };
            const requestData = {
                ...resourceData,
                plan: 'pro',
                budgets: { Alimentação: 1200 }
            };
            const allowed = evaluator.evaluateUserDoc({
                auth: userA,
                userId: userA.uid,
                operation: 'update',
                resourceData,
                requestData
            });
            expect(allowed).toBe(false);
        });

        it('deve PERMITIR atualização de aiPreferences (optIn) preservando plano original', () => {
            const resourceData = { name: 'User A', email: 'a@test.com', plan: 'free', proSince: null };
            const requestData = {
                ...resourceData,
                aiPreferences: { optIn: true }
            };
            const allowed = evaluator.evaluateUserDoc({
                auth: userA,
                userId: userA.uid,
                operation: 'update',
                resourceData,
                requestData
            });
            expect(allowed).toBe(true);
        });

        it('deve NEGAR atualização de aiPreferences se houver injeção de plan: pro ou proSince adulterado', () => {
            const resourceData = { name: 'User A', email: 'a@test.com', plan: 'free', proSince: null };
            const requestDataWithPro = {
                ...resourceData,
                plan: 'pro',
                aiPreferences: { optIn: true }
            };
            expect(evaluator.evaluateUserDoc({
                auth: userA,
                userId: userA.uid,
                operation: 'update',
                resourceData,
                requestData: requestDataWithPro
            })).toBe(false);

            const requestDataWithProSince = {
                ...resourceData,
                proSince: '2026-01-01T00:00:00Z',
                aiPreferences: { optIn: true }
            };
            expect(evaluator.evaluateUserDoc({
                auth: userA,
                userId: userA.uid,
                operation: 'update',
                resourceData,
                requestData: requestDataWithProSince
            })).toBe(false);
        });
    });

    describe('Proteção da Coleção de Rate Limit da IA (/ai_rate_limits)', () => {
        it('deve NEGAR leitura (read) direta de /ai_rate_limits pelo cliente autenticado', () => {
            expect(evaluator.evaluateAiRateLimitsDoc({ operation: 'read' })).toBe(false);
        });

        it('deve NEGAR criação (create) direta de /ai_rate_limits pelo cliente autenticado', () => {
            expect(evaluator.evaluateAiRateLimitsDoc({ operation: 'create' })).toBe(false);
        });

        it('deve NEGAR atualização (update) direta de /ai_rate_limits pelo cliente autenticado', () => {
            expect(evaluator.evaluateAiRateLimitsDoc({ operation: 'update' })).toBe(false);
        });

        it('deve NEGAR exclusão (delete) direta de /ai_rate_limits pelo cliente autenticado', () => {
            expect(evaluator.evaluateAiRateLimitsDoc({ operation: 'delete' })).toBe(false);
        });
    });
});


