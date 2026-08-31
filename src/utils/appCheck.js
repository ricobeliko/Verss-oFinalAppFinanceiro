// src/utils/appCheck.js

import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';

let appCheckInstance = null;

/**
 * Inicializa o Firebase App Check para o app Web FinControl.
 * Opera em modo de observação / atestação sem enforcement bloqueante nesta fase.
 *
 * @param {import('firebase/app').FirebaseApp} app Instância do Firebase App
 * @param {Object} [options={}] Opções para testes ou injeção de dependências
 * @returns {Object|null} Instância do App Check ou null se não aplicável/desabilitado
 */
export function initAppCheck(app, options = {}) {
    if (typeof window === 'undefined' || !app) {
        return null;
    }

    // Proteção contra dupla inicialização (singleton determinístico)
    if (appCheckInstance && !options.forceReinit) {
        return appCheckInstance;
    }

    const env = options.env || import.meta.env || {};
    const isProd = Boolean(env.PROD);
    const isDev = Boolean(env.DEV);
    const siteKey = options.siteKey || env.VITE_FIREBASE_APPCHECK_SITE_KEY;
    const debugTokenEnv = options.debugToken || env.VITE_FIREBASE_APPCHECK_DEBUG_TOKEN;

    // Fail-safe de build de produção: Debug tokens são ESTRITAMENTE PROIBIDOS em produção
    if (isProd) {
        if (debugTokenEnv || window.FIREBASE_APPCHECK_DEBUG_TOKEN) {
            console.error('[AppCheck Security] Tentativa de uso de debug token bloqueada em build de produção.');
            delete window.FIREBASE_APPCHECK_DEBUG_TOKEN;
        }
    }

    // Configuração do Debug Provider em ambiente de Desenvolvimento / CI
    if (isDev && !isProd) {
        if (debugTokenEnv) {
            window.FIREBASE_APPCHECK_DEBUG_TOKEN = debugTokenEnv;
        }
    }

    const effectiveSiteKey = typeof siteKey === 'string' ? siteKey.trim() : '';
    const hasDebugToken = !isProd && window.FIREBASE_APPCHECK_DEBUG_TOKEN !== undefined;

    // Se nenhuma site key estiver configurada e não houver debug token em DEV,
    // não tenta inicializar com provider inválido para não quebrar a inicialização do app.
    if (!effectiveSiteKey && !hasDebugToken) {
        return null;
    }

    try {
        const provider = new ReCaptchaEnterpriseProvider(effectiveSiteKey || 'dummy-site-key-for-dev');
        appCheckInstance = initializeAppCheck(app, {
            provider,
            isTokenAutoRefreshEnabled: true,
        });
        return appCheckInstance;
    } catch (error) {
        if (isDev) {
            console.warn('[AppCheck] Inicialização em modo tolerante:', error.message);
        }
        return null;
    }
}

/**
 * Retorna a instância ativa do App Check se já inicializada.
 */
export function getAppCheckInstance() {
    return appCheckInstance;
}

/**
 * Reseta o singleton do App Check (exclusivo para testes automatizados).
 */
export function resetAppCheckInstanceForTesting() {
    appCheckInstance = null;
}
