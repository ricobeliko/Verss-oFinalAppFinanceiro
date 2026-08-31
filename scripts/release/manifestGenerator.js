/* global process */
// scripts/release/manifestGenerator.js
import crypto from 'crypto';
import fs from 'fs';

export const CANONICAL_FIREBASE_APP_ID = '1:364725310124:web:0786258bdcb752d5d70509';
export const CANONICAL_FIREBASE_PROJECT_ID = 'controle-de-cartao';
export const CANONICAL_HOSTING_SITE = 'controle-de-cartao';

/**
 * Padrões de detecção de secrets/credenciais proibidos no manifesto
 */
const FORBIDDEN_SECRET_PATTERNS = [
    /AIza[0-9A-Za-z-_]{35}/, // Google / Firebase API Key completa
    /APP_USR-[0-9a-zA-Z_-]+/, // Mercado Pago Access Token
    /Bearer\s+[A-Za-z0-9-_.]+/i,
    /-----BEGIN\s+PRIVATE\s+KEY-----/,
    /eyJ[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*/, // JWT
];

/**
 * Calcula o SHA-256 de um arquivo de forma determinística
 * @param {string} filePath
 * @returns {string} hash sha256 em hexadecimal
 */
export function calculateFileSha256(filePath) {
    if (!fs.existsSync(filePath)) {
        throw new Error(`ARQUIVO_NAO_ENCONTRADO: ${filePath}`);
    }
    const fileBuffer = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(fileBuffer).digest('hex');
}

/**
 * Valida se um objeto contém valores sensíveis/secrets
 * @param {Object} data
 */
export function validateNoSecrets(data) {
    const serialized = JSON.stringify(data);
    for (const pattern of FORBIDDEN_SECRET_PATTERNS) {
        if (pattern.test(serialized)) {
            throw new Error(`SECURITY_GATE_VIOLATION: Detectado possível secret ou credencial sensível no payload do manifesto (${pattern})`);
        }
    }
}

/**
 * Normaliza o modo de autenticação do App Check (ex: OFF/UNSET -> OFF)
 * Lança erro explícito em caso de modo ausente ou desconhecido.
 * @param {string} mode
 * @returns {string} modo normalizado
 */
export function normalizeAppCheckAuthMode(mode) {
    if (!mode || typeof mode !== 'string') {
        throw new Error('VALIDATION_ERROR: appCheckAuthMode é obrigatório.');
    }
    if (mode === 'OFF/UNSET' || mode === 'OFF' || mode === 'UNSET') {
        return 'OFF';
    }
    if (mode === 'ENFORCED') {
        return 'ENFORCED';
    }
    throw new Error(`VALIDATION_ERROR: appCheckAuthMode inválido ou desconhecido: "${mode}". Modos permitidos: OFF/UNSET, OFF, UNSET, ENFORCED.`);
}

/**
 * Gera e valida a estrutura formal do Release Manifest (Fail-Closed)
 * @param {Object} params
 * @returns {Object} Release Manifest estruturado
 */
export function createReleaseManifest(params) {
    if (!params || typeof params !== 'object') {
        throw new Error('VALIDATION_ERROR: Objeto params é obrigatório.');
    }

    // Gate 0: Validação estrita de secrets no payload de entrada
    validateNoSecrets(params);

    const {
        commitSha,
        buildTimestamp = new Date().toISOString(),
        nodeVersion = process.version,
        npmVersion = '10.x',
        hostingOnly = true,
        indexHtmlPath,
        indexHtmlSha256: providedSha256,
        firebaseProjectId,
        firebaseAppId,
        hostingSite,
        previousHostingVersion,
        newHostingVersion,
        appCheckFirestoreMode,
        appCheckAuthMode,
        ciRunId,
        ciConclusion
    } = params;

    // Gate 1: commitSha obrigatório e exatamente 40 caracteres hexadecimais
    if (!commitSha || typeof commitSha !== 'string' || !/^[0-9a-f]{40}$/.test(commitSha)) {
        throw new Error('VALIDATION_ERROR: commitSha é obrigatório e deve ter exatamente 40 caracteres hexadecimais.');
    }

    // Gate 2: hostingOnly obrigatório e estritamente true
    if (hostingOnly !== true) {
        throw new Error('DEPLOY_SAFETY_VIOLATION: hostingOnly deve ser estritamente true. Deploy de functions/rules/indexes é proibido via este manifesto.');
    }

    // Gate 3: firebaseAppId obrigatório e estritamente canônico
    if (!firebaseAppId || typeof firebaseAppId !== 'string') {
        throw new Error('VALIDATION_ERROR: firebaseAppId é obrigatório.');
    }
    if (firebaseAppId !== CANONICAL_FIREBASE_APP_ID) {
        throw new Error(`VALIDATION_ERROR: firebaseAppId incorreto para o ambiente de produção (esperado ${CANONICAL_FIREBASE_APP_ID}, recebido ${firebaseAppId}).`);
    }

    // Gate 4: firebaseProjectId obrigatório e estritamente canônico
    if (!firebaseProjectId || typeof firebaseProjectId !== 'string') {
        throw new Error('VALIDATION_ERROR: firebaseProjectId é obrigatório.');
    }
    if (firebaseProjectId !== CANONICAL_FIREBASE_PROJECT_ID) {
        throw new Error(`VALIDATION_ERROR: firebaseProjectId inválido (esperado ${CANONICAL_FIREBASE_PROJECT_ID}, recebido ${firebaseProjectId}).`);
    }

    // Gate 5: hostingSite obrigatório e estritamente canônico
    if (!hostingSite || typeof hostingSite !== 'string') {
        throw new Error('VALIDATION_ERROR: hostingSite é obrigatório.');
    }
    if (hostingSite !== CANONICAL_HOSTING_SITE) {
        throw new Error(`VALIDATION_ERROR: hostingSite inválido (esperado ${CANONICAL_HOSTING_SITE}, recebido ${hostingSite}).`);
    }

    // Gate 6: indexHtmlSha256 cálculo ou validação estrita (64 hex chars)
    let sha256 = providedSha256;
    if (!sha256 && indexHtmlPath) {
        sha256 = calculateFileSha256(indexHtmlPath);
    }
    if (!sha256 || typeof sha256 !== 'string' || !/^[0-9a-f]{64}$/.test(sha256)) {
        throw new Error('VALIDATION_ERROR: indexHtmlSha256 inválido ou não calculado (esperado hash SHA-256 de 64 caracteres hexadecimais).');
    }

    // Gate 7: previousHostingVersion e newHostingVersion
    if (!previousHostingVersion || typeof previousHostingVersion !== 'string') {
        throw new Error('VALIDATION_ERROR: previousHostingVersion é obrigatório para rastreabilidade de rollback.');
    }
    if (!newHostingVersion || typeof newHostingVersion !== 'string') {
        throw new Error('VALIDATION_ERROR: newHostingVersion é obrigatório.');
    }

    // Gate 8: appCheckFirestoreMode obrigatório e validado
    if (!appCheckFirestoreMode || typeof appCheckFirestoreMode !== 'string') {
        throw new Error('VALIDATION_ERROR: appCheckFirestoreMode é obrigatório.');
    }
    if (appCheckFirestoreMode !== 'UNENFORCED' && appCheckFirestoreMode !== 'ENFORCED') {
        throw new Error(`VALIDATION_ERROR: appCheckFirestoreMode inválido: "${appCheckFirestoreMode}". Modos permitidos: UNENFORCED, ENFORCED.`);
    }

    // Gate 9: appCheckAuthMode obrigatório e normalizado
    const normalizedAuthMode = normalizeAppCheckAuthMode(appCheckAuthMode);

    // Gate 10: CI Run ID obrigatório
    if (!ciRunId) {
        throw new Error('VALIDATION_ERROR: ciRunId do GitHub Actions é obrigatório para vincular o artefato ao pipeline verificado.');
    }

    // Gate 11: CI Conclusion obrigatório e estritamente 'success'
    if (!ciConclusion || typeof ciConclusion !== 'string') {
        throw new Error('VALIDATION_ERROR: ciConclusion é obrigatório.');
    }
    if (ciConclusion !== 'success') {
        throw new Error(`VALIDATION_ERROR: ciConclusion deve ser estritamente "success" (recebido: "${ciConclusion}"). Deploy bloqueado.`);
    }

    const manifest = {
        manifestVersion: '1.0.0',
        commitSha,
        buildTimestamp,
        nodeVersion,
        npmVersion,
        hostingOnly: true,
        indexHtmlSha256: sha256,
        firebaseProjectId,
        firebaseAppId,
        hostingSite,
        previousHostingVersion,
        newHostingVersion,
        appCheckFirestoreMode,
        appCheckAuthMode: normalizedAuthMode,
        ciRunId: String(ciRunId),
        ciConclusion,
        securityGates: {
            functionsBlocked: true,
            firestoreRulesBlocked: true,
            firestoreIndexesBlocked: true,
            demoFallbackForbidden: true,
            appCheckDebugForbidden: true
        }
    };

    // Gate 12: Validação final contra vazamento de dados sensíveis
    validateNoSecrets(manifest);

    return manifest;
}

/**
 * Converte o Release Manifest para formato Markdown de documentação operacional
 * @param {Object} manifest
 * @returns {string} Markdown formatado
 */
export function formatManifestMarkdown(manifest) {
    return `# Release Manifest — ${manifest.newHostingVersion}

- **Commit SHA:** \`${manifest.commitSha}\`
- **Data do Build:** \`${manifest.buildTimestamp}\`
- **Ambiente Node:** \`${manifest.nodeVersion}\` (npm \`${manifest.npmVersion}\`)
- **Hosting Only:** \`${manifest.hostingOnly}\`
- **SHA-256 (dist/index.html):** \`${manifest.indexHtmlSha256}\`
- **Projeto Firebase:** \`${manifest.firebaseProjectId}\`
- **Firebase Web App ID:** \`${manifest.firebaseAppId}\`
- **Hosting Site:** \`${manifest.hostingSite}\`
- **Versão Anterior (Rollback Target):** \`${manifest.previousHostingVersion}\`
- **Nova Versão Live:** \`${manifest.newHostingVersion}\`
- **App Check Firestore:** \`${manifest.appCheckFirestoreMode}\`
- **App Check Auth:** \`${manifest.appCheckAuthMode}\`
- **CI Run ID:** [${manifest.ciRunId}](https://github.com/ricobeliko/Verss-oFinalAppFinanceiro/actions/runs/${manifest.ciRunId}) (\`${manifest.ciConclusion}\`)

### Gates de Segurança Ativos
- Functions Deploy: 🔒 **BLOCKED**
- Rules Deploy: 🔒 **BLOCKED**
- Indexes Deploy: 🔒 **BLOCKED (DRIFT DRILL RECONCILIATION PENDING)**
- PII / Secrets Leak Prevention: ✅ **VERIFIED**
`;
}
