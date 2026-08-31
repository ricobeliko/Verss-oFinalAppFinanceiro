// tests/appCheck.test.js
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

import { initAppCheck, resetAppCheckInstanceForTesting } from '../src/utils/appCheck.js';
import { app, db, auth, getAppFunctions } from '../src/utils/firebase.js';

describe('Firebase App Check Preparation & Web Client Safety (Fase 7.2.4)', () => {
    let mockApp;
    let consoleErrorSpy;
    let consoleWarnSpy;

    beforeEach(() => {
        resetAppCheckInstanceForTesting();
        vi.clearAllMocks();
        mockApp = { name: 'fincontrol-test-app' };

        // Configuração de ambiente global simulado
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

    it('A. App Check inicializa exatamente uma vez (singleton / proteção contra re-render)', () => {
        const options = {
            env: { PROD: true, DEV: false },
            siteKey: 'valid-recaptcha-enterprise-site-key-123',
        };

        const firstCall = initAppCheck(mockApp, options);
        const secondCall = initAppCheck(mockApp, options);

        expect(firstCall).toBeDefined();
        expect(secondCall).toBe(firstCall);
        expect(mocks.initializeAppCheck).toHaveBeenCalledTimes(1);
    });

    it('B. Produção usa ReCaptchaEnterpriseProvider com site key e auto-refresh habilitado', () => {
        const options = {
            env: { PROD: true, DEV: false },
            siteKey: 'prod-enterprise-site-key-xyz',
        };

        const instance = initAppCheck(mockApp, options);

        expect(instance).toBeDefined();
        expect(mocks.ReCaptchaEnterpriseProvider).toHaveBeenCalledWith('prod-enterprise-site-key-xyz');
        expect(mocks.initializeAppCheck).toHaveBeenCalledWith(mockApp, {
            provider: expect.any(Object),
            isTokenAutoRefreshEnabled: true,
        });
    });

    it('C. DEV usa debug provider somente quando explicitamente habilitado via variável/token', () => {
        const options = {
            env: { PROD: false, DEV: true },
            debugToken: 'dev-debug-token-for-testing',
        };

        const instance = initAppCheck(mockApp, options);

        expect(globalThis.window.FIREBASE_APPCHECK_DEBUG_TOKEN).toBe('dev-debug-token-for-testing');
        expect(instance).toBeDefined();
        expect(mocks.initializeAppCheck).toHaveBeenCalledTimes(1);
    });

    it('D. Produção bloqueia/deleta qualquer tentativa de debug token (fail-safe de segurança)', () => {
        globalThis.window.FIREBASE_APPCHECK_DEBUG_TOKEN = 'malicious-debug-token-attempt';

        const options = {
            env: { PROD: true, DEV: false },
            siteKey: 'prod-site-key-secure',
            debugToken: 'debug-token-not-allowed-in-prod',
        };

        const instance = initAppCheck(mockApp, options);

        expect(globalThis.window.FIREBASE_APPCHECK_DEBUG_TOKEN).toBeUndefined();
        expect(consoleErrorSpy).toHaveBeenCalledWith(
            expect.stringContaining('[AppCheck Security]')
        );
        expect(instance).toBeDefined();
    });

    it('E. Missing site key e ausência de debug token falha de forma controlada sem quebrar o app', () => {
        const options = {
            env: { PROD: true, DEV: false },
            siteKey: '',
        };

        const instance = initAppCheck(mockApp, options);

        expect(instance).toBeNull();
        expect(mocks.initializeAppCheck).not.toHaveBeenCalled();
    });

    it('F. Firebase app, auth e db continuam inicializando normalmente e exportados em firebase.js', () => {
        expect(app).toBeDefined();
        expect(db).toBeDefined();
        expect(auth).toBeDefined();
    });

    it('G. Firestore emulator connection funciona sem conflito com App Check', () => {
        expect(db.type).toBe('mock-firestore');
    });

    it('H. Callable client getAppFunctions() carrega a instância sob demanda', async () => {
        const fnInstance = await getAppFunctions();
        expect(fnInstance).toBeDefined();
        expect(fnInstance.type).toBe('mock-functions');
    });

    it('I. Nenhuma informação secreta ou token de debug é exposto nos logs durante inicialização', () => {
        const options = {
            env: { PROD: true, DEV: false },
            siteKey: 'public-site-key-6Lfxxx',
        };

        initAppCheck(mockApp, options);

        const allLogs = [
            ...consoleErrorSpy.mock.calls.flat(),
            ...consoleWarnSpy.mock.calls.flat(),
        ].join(' ');

        expect(allLogs).not.toContain('secret');
        expect(allLogs).not.toContain('MERCADOPAGO_ACCESS_TOKEN');
        expect(allLogs).not.toContain('GEMINI_API_KEY');
    });
});
