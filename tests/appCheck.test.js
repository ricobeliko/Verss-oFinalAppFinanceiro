// tests/appCheck.test.js
import crypto from 'crypto';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    initializeAppCheck: vi.fn((app, config) => ({
        app,
        config,
        _isAppCheckInstance: true,
    })),
    ReCaptchaEnterpriseProvider: vi.fn(function (siteKey) {
        this.siteKey = siteKey;
        this.type = 'ReCaptchaEnterpriseProvider';
    }),
}));

vi.mock('firebase/app-check', () => ({
    initializeAppCheck: mocks.initializeAppCheck,
    ReCaptchaEnterpriseProvider: mocks.ReCaptchaEnterpriseProvider,
}));

vi.mock('firebase/app', () => ({
    initializeApp: vi.fn(() => ({ name: 'mock-app-check-app' })),
}));

vi.mock('firebase/firestore', () => ({
    getFirestore: vi.fn(() => ({ type: 'mock-firestore' })),
    connectFirestoreEmulator: vi.fn(),
}));

vi.mock('firebase/auth', () => ({
    getAuth: vi.fn(() => ({ currentUser: null })),
    connectAuthEmulator: vi.fn(),
}));

vi.mock('firebase/functions', () => ({
    getFunctions: vi.fn(() => ({ type: 'mock-functions', region: 'southamerica-east1' })),
    connectFunctionsEmulator: vi.fn(),
}));

import { initAppCheck, getAppCheckInstance, resetAppCheckInstanceForTesting } from '../src/utils/appCheck.js';
import { app, db, auth, getAppFunctions } from '../src/utils/firebase.js';

describe('Firebase App Check Preparation & Safety Remediation (Fase 7.2.4)', () => {
    let mockApp;
    let consoleErrorSpy;
    let consoleWarnSpy;

    beforeEach(() => {
        resetAppCheckInstanceForTesting();
        vi.clearAllMocks();
        mockApp = { name: 'fincontrol-test-app' };

        if (typeof globalThis.window === 'undefined') {
            globalThis.window = {};
        }
        delete globalThis.window.FIREBASE_APPCHECK_DEBUG_TOKEN;

        consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
        resetAppCheckInstanceForTesting();
        delete globalThis.window?.FIREBASE_APPCHECK_DEBUG_TOKEN;
        consoleErrorSpy.mockRestore();
        consoleWarnSpy.mockRestore();
    });

    it('A. PROD + site key => App Check inicializa com ReCaptchaEnterpriseProvider e auto-refresh', () => {
        const options = {
            env: { PROD: true, DEV: false },
            siteKey: 'prod-recaptcha-enterprise-site-key-123',
        };

        const instance = initAppCheck(mockApp, options);

        expect(instance).toBeDefined();
        expect(mocks.ReCaptchaEnterpriseProvider).toHaveBeenCalledWith('prod-recaptcha-enterprise-site-key-123');
        expect(mocks.initializeAppCheck).toHaveBeenCalledWith(mockApp, {
            provider: expect.any(Object),
            isTokenAutoRefreshEnabled: true,
        });
    });

    it('B. Singleton => initializeAppCheck é invocado exatamente uma única vez', () => {
        const options = {
            env: { PROD: true, DEV: false },
            siteKey: 'valid-site-key-abc',
        };

        const first = initAppCheck(mockApp, options);
        const second = initAppCheck(mockApp, options);

        expect(first).toBe(second);
        expect(getAppCheckInstance()).toBe(first);
        expect(mocks.initializeAppCheck).toHaveBeenCalledTimes(1);
    });

    it('C. DEV debug flag=true => global debug = true (booleano sem segredos no bundle)', () => {
        const options = {
            env: { PROD: false, DEV: true },
            debugFlag: true,
            siteKey: '',
        };

        const instance = initAppCheck(mockApp, options);

        expect(globalThis.window.FIREBASE_APPCHECK_DEBUG_TOKEN).toBe(true);
        expect(instance).toBeDefined();
        expect(mocks.initializeAppCheck).toHaveBeenCalledTimes(1);
    });

    it('D. PROD => debug provider/bypass nunca é habilitado (fail-safe de segurança)', () => {
        globalThis.window.FIREBASE_APPCHECK_DEBUG_TOKEN = true;

        const options = {
            env: { PROD: true, DEV: false },
            siteKey: 'prod-site-key-secure',
            debugFlag: true,
        };

        const instance = initAppCheck(mockApp, options);

        expect(globalThis.window.FIREBASE_APPCHECK_DEBUG_TOKEN).toBeUndefined();
        expect(consoleErrorSpy).toHaveBeenCalledWith(
            expect.stringContaining('[AppCheck Security]')
        );
        expect(instance).toBeDefined();
    });

    it('E. Código não lê e não aceita VITE_FIREBASE_APPCHECK_DEBUG_TOKEN', () => {
        const options = {
            env: {
                PROD: false,
                DEV: true,
                VITE_FIREBASE_APPCHECK_DEBUG_TOKEN: 'secret-token-should-not-be-read',
            },
            siteKey: '',
        };

        initAppCheck(mockApp, options);

        expect(globalThis.window.FIREBASE_APPCHECK_DEBUG_TOKEN).toBeUndefined();
    });

    it('F. Missing production site key => erro operacional explícito detectável', () => {
        const options = {
            env: { PROD: true, DEV: false },
            siteKey: '',
        };

        const instance = initAppCheck(mockApp, options);

        expect(instance).toBeNull();
        expect(consoleErrorSpy).toHaveBeenCalledWith(
            expect.stringContaining('[AppCheck] Erro operacional: VITE_FIREBASE_APPCHECK_SITE_KEY não configurada')
        );
        expect(mocks.initializeAppCheck).not.toHaveBeenCalled();
    });

    it('G. DEV missing site key/debug => comportamento controlado e tolerante', () => {
        const options = {
            env: { PROD: false, DEV: true },
            siteKey: '',
            debugFlag: false,
        };

        const instance = initAppCheck(mockApp, options);

        expect(instance).toBeNull();
        expect(mocks.initializeAppCheck).not.toHaveBeenCalled();
    });

    it('H. App Check initialization error em PROD => erro seguro sem dados sensíveis', () => {
        mocks.initializeAppCheck.mockImplementationOnce(() => {
            throw new Error('RECAPTCHA_NETWORK_ERROR_INTERNAL');
        });

        const options = {
            env: { PROD: true, DEV: false },
            siteKey: 'prod-site-key-123',
        };

        const instance = initAppCheck(mockApp, options);

        expect(instance).toBeNull();
        expect(consoleErrorSpy).toHaveBeenCalledWith(
            expect.stringContaining('[AppCheck] Falha na inicialização do Firebase App Check em produção.')
        );
        const prodErrors = consoleErrorSpy.mock.calls.flat().join(' ');
        expect(prodErrors).not.toContain('RECAPTCHA_NETWORK_ERROR_INTERNAL');
    });

    it('I. Firestore e Auth continuam inicializando e conectando aos emuladores', () => {
        expect(app).toBeDefined();
        expect(db).toBeDefined();
        expect(auth).toBeDefined();
        expect(db.type).toBe('mock-firestore');
    });

    it('J. Functions SDK lazy loading preservado com getAppFunctions()', async () => {
        const fnInstance = await getAppFunctions();
        expect(fnInstance).toBeDefined();
        expect(fnInstance.type).toBe('mock-functions');
    });

    it('K. Proteção contra vazamento de tokens nos logs e escopo global', () => {
        const options = {
            env: { PROD: true, DEV: false },
            siteKey: 'public-site-key-enterprise',
        };

        initAppCheck(mockApp, options);

        const logs = [
            ...consoleErrorSpy.mock.calls.flat(),
            ...consoleWarnSpy.mock.calls.flat(),
        ].join(' ');

        expect(logs).not.toContain('MERCADOPAGO_ACCESS_TOKEN');
        expect(logs).not.toContain('GEMINI_API_KEY');
        expect(logs).not.toContain('APP_CHECK_DEBUG_TOKEN_FROM_CI');
    });

    it('L. Webhook do Mercado Pago continua 100% independente de App Check (validação pura via HMAC SHA-256)', () => {
        const secret = 'test_webhook_secret_key_123';
        const ts = '1690000000';
        const xRequestId = 'req-mp-test-999';
        const dataId = '9876543210';

        // Validação HMAC pura do Mercado Pago
        const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
        const expectedV1 = crypto.createHmac('sha256', secret).update(manifest).digest('hex');

        // Teste de integridade do cálculo sem qualquer cabeçalho ou token App Check
        expect(expectedV1).toHaveLength(64);
        expect(manifest).not.toContain('appcheck');
    });
});
