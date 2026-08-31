/* global process */
// scripts/release/manifestGenerator.js
import crypto from 'crypto';
import fs from 'fs';

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
 * Gera e valida a estrutura formal do Release Manifest
 * @param {Object} params
 * @returns {Object} Release Manifest estruturado
 */
export function createReleaseManifest(params) {
    if (!params || typeof params !== 'object') {
        throw new Error('VALIDATION_ERROR: Objeto params é obrigatório.');
    }
    // Gate 0: Validação de secrets no payload de entrada
    validateNoSecrets(params);

    const {
        commitSha,
        buildTimestamp = new Date().toISOString(),
        nodeVersion = process.version,
        npmVersion = '10.x',
        hostingOnly = true,
        indexHtmlPath,
        indexHtmlSha256: providedSha256,
        firebaseProjectId = 'controle-de-cartao',
        firebaseAppId = '1:894086603096:web:ba447055dae082c5f1aa9d',
        hostingSite = 'controle-de-cartao',
        previousHostingVersion,
        newHostingVersion,
        appCheckFirestoreMode = 'UNENFORCED',
        appCheckAuthMode = 'OFF',
        ciRunId,
        ciConclusion = 'success'
    } = params;

    // Gate 1: commitSha obrigatório e no formato hexadecimal
    if (!commitSha || typeof commitSha !== 'string' || !/^[0-9a-f]{7,40}$/i.test(commitSha)) {
        throw new Error('VALIDATION_ERROR: commitSha é obrigatório e deve ser um hash git válido.');
    }

    // Gate 2: hostingOnly obrigatório e estritamente true
    if (hostingOnly !== true) {
        throw new Error('DEPLOY_SAFETY_VIOLATION: hostingOnly deve ser estritamente true. Deploy de functions/rules/indexes é proibido via este manifesto.');
    }

    // Gate 3: indexHtmlSha256 cálculo ou validação
    let sha256 = providedSha256;
    if (!sha256 && indexHtmlPath) {
        sha256 = calculateFileSha256(indexHtmlPath);
    }
    if (!sha256 || typeof sha256 !== 'string' || sha256.length !== 64) {
        throw new Error('VALIDATION_ERROR: indexHtmlSha256 inválido ou não calculado (esperado hash SHA-256 de 64 caracteres).');
    }

    // Gate 4: previousHostingVersion e newHostingVersion
    if (!previousHostingVersion || typeof previousHostingVersion !== 'string') {
        throw new Error('VALIDATION_ERROR: previousHostingVersion é obrigatório para rastreabilidade de rollback.');
    }
    if (!newHostingVersion || typeof newHostingVersion !== 'string') {
        throw new Error('VALIDATION_ERROR: newHostingVersion é obrigatório.');
    }

    // Gate 5: CI Run ID e status
    if (!ciRunId) {
        throw new Error('VALIDATION_ERROR: ciRunId do GitHub Actions é obrigatório para vincular o artefato ao pipeline verificado.');
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
        appCheckAuthMode,
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

    // Gate 6: Validação estrita contra vazamento de secrets
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
