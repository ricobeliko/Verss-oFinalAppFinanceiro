/* global process */
// tests/rateLimitEmulator.test.js
import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const admin = require('../functions/node_modules/firebase-admin');
import { reserveApiActionAttempt, releaseApiActionInFlight } from '../functions/security/rateLimit.js';

const isEmulatorHostDefined = Boolean(process.env.FIRESTORE_EMULATOR_HOST);

describe.runIf(isEmulatorHostDefined)('FIRESTORE_EMULATOR_INTEGRATION — Real Firestore Emulator Concurrency Gate', () => {
    let db;

    beforeEach(async () => {
        // Guard estrito de produção: Abortar imediatamente se apontar para produção real
        if (!process.env.FIRESTORE_EMULATOR_HOST) {
            throw new Error("PRODUÇÃO PROTEGIDA: FIRESTORE_EMULATOR_HOST não definido. Abortando teste de emulador.");
        }

        if (admin.apps.length === 0) {
            admin.initializeApp({
                projectId: process.env.GCLOUD_PROJECT || 'demo-fincontrol-e2e'
            });
        }
        db = admin.firestore();

        // Limpeza de documentos de teste sintéticos no emulador
        const testUids = [
            'emulator-same-uid',
            'emulator-race-victim',
            'emulator-hard-limit',
            'emulator-burst-100'
        ];

        for (const uid of testUids) {
            await db.collection('api_rate_limits').doc(`${uid}_createMercadoPagoPreference`).delete().catch(() => {});
        }
    });

    afterAll(async () => {
        if (db) {
            const testUids = [
                'emulator-same-uid',
                'emulator-race-victim',
                'emulator-hard-limit',
                'emulator-burst-100'
            ];

            for (const uid of testUids) {
                await db.collection('api_rate_limits').doc(`${uid}_createMercadoPagoPreference`).delete().catch(() => {});
            }
        }
    });

    it('PASSO 5, 6, 7: Concorrência Same UID com 10 transações reais no Emulator -> 1 lease adquirida, 9 bloqueadas, liberação com Compare-and-Set', async () => {
        const uid = 'emulator-same-uid';
        const now = 1725000000000;

        // Dispara 10 reservas simultâneas reais contra o Firestore Emulator
        const promises = Array.from({ length: 10 }, () =>
            reserveApiActionAttempt(db, {
                userId: uid,
                action: 'createMercadoPagoPreference',
                cooldownMs: 15 * 1000,
                hourlyLimit: 5,
                staleInFlightMs: 75 * 1000,
                now,
            })
        );
        const allSettledPromise = Promise.allSettled(promises);
        const results = await allSettledPromise;

        const fulfilled = results.filter(r => r.status === 'fulfilled');
        const rejected = results.filter(r => r.status === 'rejected');

        expect(fulfilled.length).toBe(1);
        expect(rejected.length).toBe(9);

        const winningLease = fulfilled[0].value;
        expect(winningLease.leaseId).toBeDefined();

        // PASSO 6: Validar documento real no Firestore Emulator
        const docRef = db.collection('api_rate_limits').doc(`${uid}_createMercadoPagoPreference`);
        const docSnap = await docRef.get();
        expect(docSnap.exists).toBe(true);
        const data = docSnap.data();
        expect(data.inFlight).toBe(true);
        expect(data.leaseId).toBe(winningLease.leaseId);
        expect(data.requestTimestamps.length).toBe(1); // Apenas 1 quota consumida!

        // PASSO 7: Release com Compare-and-Set
        const releaseResult = await releaseApiActionInFlight(db, docRef, winningLease.leaseId);
        expect(releaseResult.released).toBe(true);

        const afterReleaseSnap = await docRef.get();
        expect(afterReleaseSnap.data().inFlight).toBe(false);
        expect(afterReleaseSnap.data().leaseId).toBe(null);
    });

    it('PASSO 8: Old Holder Race Real no Firestore Emulator -> A não consegue liberar lease de B', async () => {
        const uid = 'emulator-race-victim';
        const t0 = 1725000000000;

        // 1. A adquire lease-A em t0
        const resA = await reserveApiActionAttempt(db, { userId: uid, now: t0 });
        const leaseA = resA.leaseId;

        // 2. B adquire lease-B após stale timeout (t = t0 + 80s > 75s)
        const tStale = t0 + 80000;
        const resB = await reserveApiActionAttempt(db, { userId: uid, now: tStale });
        const leaseB = resB.leaseId;
        expect(leaseB).not.toBe(leaseA);

        // 3. A tenta liberar usando lease-A antigo
        const releaseA = await releaseApiActionInFlight(db, resA.rateLimitRef, leaseA);
        expect(releaseA.released).toBe(false);

        // 4. B continua protegido no emulador
        let docSnap = await resB.rateLimitRef.get();
        expect(docSnap.data().inFlight).toBe(true);
        expect(docSnap.data().leaseId).toBe(leaseB);

        // 5. B libera com lease-B
        const releaseB = await releaseApiActionInFlight(db, resB.rateLimitRef, leaseB);
        expect(releaseB.released).toBe(true);

        docSnap = await resB.rateLimitRef.get();
        expect(docSnap.data().inFlight).toBe(false);
        expect(docSnap.data().leaseId).toBe(null);
    });

    it('PASSO 9: Hard Limit Real no Firestore Emulator -> 5 permitidas, 6ª bloqueada com HOURLY_LIMIT_EXCEEDED', async () => {
        const uid = 'emulator-hard-limit';
        const baseTime = 1725000000000;

        for (let i = 0; i < 5; i++) {
            const now = baseTime + (i * 20000);
            const res = await reserveApiActionAttempt(db, { userId: uid, now });
            await releaseApiActionInFlight(db, res.rateLimitRef, res.leaseId);
        }

        // 6ª tentativa aos 120s dentro da janela de 1h
        await expect(reserveApiActionAttempt(db, { userId: uid, now: baseTime + 120000 }))
            .rejects.toThrow('HOURLY_LIMIT_EXCEEDED');

        const doc = await db.collection('api_rate_limits').doc(`${uid}_createMercadoPagoPreference`).get();
        expect(doc.data().requestTimestamps.length).toBe(5);
    });

    it('PASSO 10: 100 Requisições Concorrentes Reais no Firestore Emulator -> Exatamente 1 lease adquirida, 99 bloqueadas', async () => {
        const uid = 'emulator-burst-100';
        const now = 1725000000000;

        const promises = Array.from({ length: 100 }, () =>
            reserveApiActionAttempt(db, {
                userId: uid,
                now,
            })
        );
        const allSettledPromise = Promise.allSettled(promises);
        const results = await allSettledPromise;

        const fulfilled = results.filter(r => r.status === 'fulfilled');
        const rejected = results.filter(r => r.status === 'rejected');

        expect(fulfilled.length).toBe(1);
        expect(rejected.length).toBe(99);

        // Limpeza final
        const docRef = db.collection('api_rate_limits').doc(`${uid}_createMercadoPagoPreference`);
        await releaseApiActionInFlight(db, docRef, fulfilled[0].value.leaseId);
    });
});
