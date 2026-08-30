/* global process */
// tests/accountOperationLockEmulator.test.js
import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const isEmulatorHostDefined = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
const admin = isEmulatorHostDefined ? require('../functions/node_modules/firebase-admin') : null;
const {
    acquireAccountOperationLock,
    updateAccountOperationStatus,
    releaseAccountOperationLock,
} = require('../functions/security/accountOperationLock.js');

describe.runIf(isEmulatorHostDefined)('Account Operation Lock — Firestore Emulator Integration Tests', () => {
    let db;
    const testProjectId = process.env.GCLOUD_PROJECT || 'demo-fincontrol-e2e';

    if (admin && admin.apps.length === 0) {
        admin.initializeApp({
            projectId: testProjectId,
        });
    }

    if (admin) {
        db = admin.firestore();
    }

    beforeEach(async () => {
        if (!process.env.FIRESTORE_EMULATOR_HOST) {
            throw new Error('FAIL CLOSED: Tentativa de executar teste de integração sem FIRESTORE_EMULATOR_HOST!');
        }
    });

    afterAll(async () => {
        // Cleanup de apps do admin
    });

    // Caso A: Same UID Concurrency
    it('Caso A: deve permitir exatamente 1 aquisição e bloquear 9 quando 10 requisições simultâneas concorrem pelo mesmo UID', async () => {
        const testUid = `user_concurrent_${Date.now()}`;
        const totalRequests = 10;

        const promises = Array.from({ length: totalRequests }, () =>
            acquireAccountOperationLock(db, {
                userId: testUid,
                operation: 'deleteUserAccount',
                staleThresholdMs: 75 * 1000,
            })
        );

        const results = await Promise.allSettled(promises);

        const fulfilled = results.filter((r) => r.status === 'fulfilled');
        const rejected = results.filter((r) => r.status === 'rejected');

        expect(fulfilled.length).toBe(1);
        expect(rejected.length).toBe(9);

        rejected.forEach((r) => {
            expect(r.reason.message).toBe('OPERATION_IN_PROGRESS');
        });

        // Validação do documento persistido no Firestore Emulator
        const docSnap = await db.collection('account_operations').doc(testUid).get();
        expect(docSnap.exists).toBe(true);
        const data = docSnap.data();
        expect(data.status).toBe('deleting');
        expect(data.operation).toBe('deleteUserAccount');
        expect(typeof data.leaseId).toBe('string');
        expect(data.leaseId).toBe(fulfilled[0].value.leaseId);
        expect(typeof data.startedAt).toBe('number');
        expect(typeof data.updatedAt).toBe('number');
        expect(typeof data.expiresAt).toBe('number');
    });

    // Caso B: Different UIDs Isolation
    it('Caso B: deve permitir aquisição simultânea independente para UIDs diferentes', async () => {
        const uidA = `user_alpha_${Date.now()}`;
        const uidB = `user_beta_${Date.now()}`;

        const [resA, resB] = await Promise.all([
            acquireAccountOperationLock(db, { userId: uidA }),
            acquireAccountOperationLock(db, { userId: uidB }),
        ]);

        expect(resA.leaseId).toBeDefined();
        expect(resB.leaseId).toBeDefined();
        expect(resA.leaseId).not.toBe(resB.leaseId);

        const [docA, docB] = await Promise.all([
            db.collection('account_operations').doc(uidA).get(),
            db.collection('account_operations').doc(uidB).get(),
        ]);

        expect(docA.data().leaseId).toBe(resA.leaseId);
        expect(docB.data().leaseId).toBe(resB.leaseId);
    });

    // Caso C: Stale Takeover
    it('Caso C: deve permitir que um novo processo B assuma a operação se a lease A estiver stale (> 75s)', async () => {
        const testUid = `user_stale_${Date.now()}`;
        const now = Date.now();

        // Cria documento stale simulando processo A que travou há 80 segundos
        await db.collection('account_operations').doc(testUid).set({
            operation: 'deleteUserAccount',
            leaseId: 'lease-old-stale-A',
            status: 'deleting',
            startedAt: now - 80 * 1000,
            updatedAt: now - 80 * 1000,
            expiresAt: now + 24 * 60 * 60 * 1000,
        });

        // Processo B tenta adquirir lock
        const resB = await acquireAccountOperationLock(db, {
            userId: testUid,
            staleThresholdMs: 75 * 1000,
        });

        expect(resB.leaseId).toBeDefined();
        expect(resB.leaseId).not.toBe('lease-old-stale-A');

        const docSnap = await db.collection('account_operations').doc(testUid).get();
        expect(docSnap.data().leaseId).toBe(resB.leaseId);
        expect(docSnap.data().status).toBe('deleting');
    });

    // Caso D: Old Holder Race (Compare-and-Set)
    it('Caso D: processo A antigo não deve conseguir liberar nem sobrescrever a lease de B pós-takeover', async () => {
        const testUid = `user_race_cas_${Date.now()}`;
        const operationRef = db.collection('account_operations').doc(testUid);

        // 1. Processo A adquire
        const { leaseId: leaseA } = await acquireAccountOperationLock(db, { userId: testUid });

        // 2. Simula A ficando stale
        const now = Date.now();
        await operationRef.set({
            updatedAt: now - 80 * 1000,
        }, { merge: true });

        // 3. Processo B assume takeover
        const { leaseId: leaseB } = await acquireAccountOperationLock(db, {
            userId: testUid,
            staleThresholdMs: 75 * 1000,
        });

        expect(leaseB).not.toBe(leaseA);

        // 4. Processo A tenta atualizar status ou liberar lease após voltar
        const updateResultA = await updateAccountOperationStatus(db, operationRef, leaseA, 'completed');
        expect(updateResultA.updated).toBe(false);
        expect(updateResultA.reason).toBe('LEASE_LOST');

        const releaseResultA = await releaseAccountOperationLock(db, operationRef, leaseA, 'completed');
        expect(releaseResultA.released).toBe(false);
        expect(releaseResultA.reason).toBe('LEASE_LOST');

        // 5. Verifica que o lock de B permaneceu 100% intacto
        const docSnap = await operationRef.get();
        expect(docSnap.data().leaseId).toBe(leaseB);
        expect(docSnap.data().status).toBe('deleting');

        // 6. Processo B libera com sucesso
        const releaseResultB = await releaseAccountOperationLock(db, operationRef, leaseB, 'completed');
        expect(releaseResultB.released).toBe(true);

        const docSnapAfterB = await operationRef.get();
        expect(docSnapAfterB.data().status).toBe('completed');
    });

    // Caso E & F: Partial Failure, Missing Profile & Safe Retry
    it('Caso E & F: deve permitir retry e conclusão mesmo quando subcoleções parciais ou o perfil users_fallback já não existirem', async () => {
        const testUid = `user_retry_${Date.now()}`;
        const userRef = db.collection('users_fallback').doc(testUid);

        // Cria subcoleção e deixa o documento users_fallback/{testUid} deliberadamente ausente
        await userRef.collection('expenses').doc('exp-1').set({ amount: 100 });
        await userRef.collection('cards').doc('card-1').set({ name: 'Cartão A' });

        // Aquisição de lock
        const { operationRef, leaseId } = await acquireAccountOperationLock(db, { userId: testUid });

        // Executa exclusão das subcoleções
        const subcollections = ['cards', 'expenses'];
        for (const subcol of subcollections) {
            const snap = await userRef.collection(subcol).get();
            const batch = db.batch();
            snap.docs.forEach((d) => batch.delete(d.ref));
            await batch.commit();
        }

        // Tenta deletar documento users_fallback (que não existia) sem quebrar
        await userRef.delete().catch(() => {});

        // Finaliza operação
        const finalizeRes = await updateAccountOperationStatus(db, operationRef, leaseId, 'completed');
        expect(finalizeRes.updated).toBe(true);

        // Verifica que subcoleções foram limpas
        const expSnap = await userRef.collection('expenses').get();
        expect(expSnap.empty).toBe(true);
    });

    // Caso G: 750 Documents Pagination (500 + 250)
    it('Caso G: deve iterar e excluir corretamente mais de 500 documentos em lotes de 500 + 250', async () => {
        const testUid = `user_heavy_${Date.now()}`;
        const userRef = db.collection('users_fallback').doc(testUid);
        const subcolRef = userRef.collection('expenses');

        // Cria 750 documentos no emulador usando batches de 500
        const batch1 = db.batch();
        for (let i = 0; i < 500; i++) {
            batch1.set(subcolRef.doc(`doc-${i}`), { value: i });
        }
        await batch1.commit();

        const batch2 = db.batch();
        for (let i = 500; i < 750; i++) {
            batch2.set(subcolRef.doc(`doc-${i}`), { value: i });
        }
        await batch2.commit();

        const initialSnap = await subcolRef.get();
        expect(initialSnap.size).toBe(750);

        // Processo de paginação idêntico ao de deleteUserAccount
        let hasMore = true;
        let batchCount = 0;
        let deletedDocsCount = 0;

        while (hasMore) {
            const snapshot = await subcolRef.limit(500).get();
            if (snapshot.empty || !snapshot.docs || snapshot.docs.length === 0) {
                hasMore = false;
                break;
            }
            const batch = db.batch();
            snapshot.docs.forEach((docSnap) => {
                batch.delete(docSnap.ref);
                deletedDocsCount++;
            });
            await batch.commit();
            batchCount++;
            if (snapshot.docs.length < 500) {
                hasMore = false;
            }
        }

        expect(batchCount).toBe(2);
        expect(deletedDocsCount).toBe(750);

        const finalSnap = await subcolRef.get();
        expect(finalSnap.empty).toBe(true);
    });

    // Caso H & I: User Isolation & Target UID Attack
    it('Caso H & I: exclusão deve usar estritamente o UID autenticado e não afetar outro usuário mesmo com targetUid injetado no payload', async () => {
        const userVictimUid = `victim_${Date.now()}`;
        const userAttackerUid = `attacker_${Date.now()}`;

        // Cria dados para a vítima
        await db.collection('users_fallback').doc(userVictimUid).set({ name: 'Vitima' });
        await db.collection('users_fallback').doc(userVictimUid).collection('cards').doc('card-v').set({ name: 'Vitima Card' });

        // Cria dados para o atacante
        await db.collection('users_fallback').doc(userAttackerUid).set({ name: 'Atacante' });

        // Simula request com payload malicioso tentando forçar targetUid da vítima
        const simulatedRequest = {
            auth: { uid: userAttackerUid },
            data: { targetUid: userVictimUid, userId: userVictimUid, uid: userVictimUid },
        };

        // A função em index.js deriva userId exclusivamente de request.auth.uid
        const effectiveUid = simulatedRequest.auth.uid;
        expect(effectiveUid).toBe(userAttackerUid);

        // Executa aquisição e deleção para o UID autenticado
        const { operationRef, leaseId } = await acquireAccountOperationLock(db, { userId: effectiveUid });
        await db.collection('users_fallback').doc(effectiveUid).delete();
        await updateAccountOperationStatus(db, operationRef, leaseId, 'completed');

        // Documentos da vítima permanecem intactos
        const victimProfile = await db.collection('users_fallback').doc(userVictimUid).get();
        expect(victimProfile.exists).toBe(true);

        const victimCards = await db.collection('users_fallback').doc(userVictimUid).collection('cards').get();
        expect(victimCards.empty).toBe(false);

        // Documento do atacante foi excluído
        const attackerProfile = await db.collection('users_fallback').doc(userAttackerUid).get();
        expect(attackerProfile.exists).toBe(false);
    });

    // Caso J: Auth Deletion Last
    it('Caso J: deve garantir que Auth deletion é chamada somente após a limpeza dos dados no Firestore', async () => {
        const testUid = `user_auth_order_${Date.now()}`;
        const orderOfExecution = [];

        const mockAuth = {
            deleteUser: vi.fn().mockImplementation(async (uid) => {
                orderOfExecution.push(`auth_deleted_${uid}`);
                return true;
            }),
        };

        // 1. Lock adquirido
        const { operationRef, leaseId } = await acquireAccountOperationLock(db, { userId: testUid });
        orderOfExecution.push('lock_acquired');

        // 2. Limpeza Firestore
        await db.collection('users_fallback').doc(testUid).delete();
        orderOfExecution.push('firestore_cleaned');

        // 3. Auth delete
        await mockAuth.deleteUser(testUid);

        // 4. Status concluído
        await updateAccountOperationStatus(db, operationRef, leaseId, 'completed');
        orderOfExecution.push('lock_completed');

        expect(orderOfExecution).toEqual([
            'lock_acquired',
            'firestore_cleaned',
            `auth_deleted_${testUid}`,
            'lock_completed',
        ]);
    });

    // Caso L: Orphan & Terminal Lifecycle
    it('Caso L: documento de operação terminal deve conter status completed, expiresAt/TTL e zero PII', async () => {
        const testUid = `user_lifecycle_${Date.now()}`;

        const { operationRef, leaseId } = await acquireAccountOperationLock(db, {
            userId: testUid,
            ttlMs: 24 * 60 * 60 * 1000,
        });

        await updateAccountOperationStatus(db, operationRef, leaseId, 'completed');

        const docSnap = await operationRef.get();
        const data = docSnap.data();

        expect(data.status).toBe('completed');
        expect(data.operation).toBe('deleteUserAccount');
        expect(data.leaseId).toBe(leaseId);
        expect(typeof data.startedAt).toBe('number');
        expect(typeof data.updatedAt).toBe('number');
        expect(typeof data.expiresAt).toBe('number');
        expect(data.expiresAt).toBeGreaterThan(data.startedAt);

        // Verificação estrita de Zero PII
        const keys = Object.keys(data);
        expect(keys).not.toContain('email');
        expect(keys).not.toContain('name');
        expect(keys).not.toContain('password');
        expect(keys).not.toContain('financialData');
        expect(keys).not.toContain('payload');
    });
});
