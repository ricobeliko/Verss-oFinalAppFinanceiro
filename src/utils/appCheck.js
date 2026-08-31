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
    if (appCheckInstance) {
        return appCheckInstance;
    }

    const env = options.env || import.meta.env || {};
    const isProd = Boolean(env.PROD);
    const isDev = Boolean(env.DEV);
    const siteKey = options.siteKey !== undefined ? options.siteKey : env.VITE_FIREBASE_APPCHECK_SITE_KEY;
    const isDebugEnabled = options.debugFlag !== undefined
        ? Boolean(options.debugFlag)
        : env.VITE_FIREBASE_APPCHECK_DEBUG === 'true';

    // Fail-safe de build de produção: Debug provider é estritamente proibido em produção
    if (isProd) {
        if (window.FIREBASE_APPCHECK_DEBUG_TOKEN !== undefined) {
            console.error('[AppCheck Security] Tentativa de uso de debug token bloqueada em build de produção.');
            delete window.FIREBASE_APPCHECK_DEBUG_TOKEN;
        }
    }

    // Configuração do Debug Provider em ambiente de Desenvolvimento / Localhost
    // Ativa geração automática de debug token pelo Firebase JS SDK sem segredos no bundle
    if (isDev && !isProd && isDebugEnabled) {
        window.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
    }

    const effectiveSiteKey = typeof siteKey === 'string' ? siteKey.trim() : '';
    const hasDebugMode = !isProd && Boolean(window.FIREBASE_APPCHECK_DEBUG_TOKEN);

    // Se estiver em produção e sem site key configurada, emite erro operacional explícito
    if (isProd && !effectiveSiteKey) {
        console.error('[AppCheck] Erro operacional: VITE_FIREBASE_APPCHECK_SITE_KEY não configurada em ambiente de produção.');
        return null;
    }

    // Se nenhuma site key estiver configurada e não houver debug mode em DEV, não tenta inicializar
    if (!effectiveSiteKey && !hasDebugMode) {
        return null;
    }

    try {
        const provider = new ReCaptchaEnterpriseProvider(effectiveSiteKey || 'dev-dummy-site-key');
        appCheckInstance = initializeAppCheck(app, {
            provider,
            isTokenAutoRefreshEnabled: true,
        });
        return appCheckInstance;
    } catch (error) {
        if (isProd) {
            console.error('[AppCheck] Falha na inicialização do Firebase App Check em produção.');
        } else {
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
 * Reseta o singleton do App Check (exclusivo para isolamento de testes unitários).
 */
export function resetAppCheckInstanceForTesting() {
    appCheckInstance = null;
}
