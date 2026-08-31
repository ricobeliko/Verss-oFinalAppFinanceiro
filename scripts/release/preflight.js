/* global process */
// scripts/release/preflight.js
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execSync } from 'child_process';

/**
 * Padrões sintéticos e de teste que JAMAIS podem estar presentes no bundle final de produção
 */
const FORBIDDEN_DEMO_PATTERNS = [
    'demo-e2e-api-key',
    'demo-e2e.firebaseapp.com',
    'demo-fincontrol-e2e',
    'demo-e2e.appspot.com',
    '1:1234567890:web:demo12345'
];

/**
 * Validador puro de Release Preflight
 * Executa todas as checagens estáticas e operacionais necessárias ANTES de qualquer deploy de Hosting.
 * @param {Object} options
 * @returns {Object} resultado detalhado do preflight
 */
export function runPreflightChecks(options = {}) {
    const rootDir = options.rootDir || process.cwd();
    const expectedHead = options.expectedHead;
    const currentHead = options.currentHead;
    const originMainHead = options.originMainHead;
    const isWorktreeClean = options.isWorktreeClean !== undefined ? options.isWorktreeClean : false;
    const nodeVersion = options.nodeVersion || process.version;
    const requireDist = options.requireDist !== undefined ? options.requireDist : true;
    const distPath = options.distPath || path.join(rootDir, 'dist');

    const results = {
        passed: true,
        checks: [],
        errors: []
    };

    function addCheck(code, name, passed, detail) {
        results.checks.push({ code, name, passed, detail });
        if (!passed) {
            results.passed = false;
            results.errors.push(`[FALHA] ${code} - ${name}: ${detail}`);
        }
    }

    // 1. NODE_22: Verificação de Versão do Node (deve ser Node 22)
    const isNode22 = /^v?22\./.test(nodeVersion) || process.env.FINCONTROL_ALLOW_NODE_VERSION === 'true';
    addCheck(
        'NODE_22',
        'Node 22 LTS Gate',
        isNode22,
        isNode22 ? `Node ${nodeVersion} verificado com sucesso.` : `Node inválido: ${nodeVersion}. FinControl exige Node 22.x LTS.`
    );

    // 2. WORKTREE_CLEAN: Verificação de Worktree Limpo
    addCheck(
        'WORKTREE_CLEAN',
        'Git Clean Worktree Gate',
        isWorktreeClean,
        isWorktreeClean ? 'Worktree limpo, sem arquivos não rastreados ou modificados.' : 'Worktree contém arquivos sujos ou modificações não commitadas (DIRTY_WORKTREE).'
    );

    // 3. HEAD_MATCH: Verificação de HEAD Esperado (exatamente 40 hex chars e igualdade exata)
    if (expectedHead !== undefined) {
        const isExpected40Hex = typeof expectedHead === 'string' && /^[0-9a-f]{40}$/i.test(expectedHead);
        const isCurrent40Hex = typeof currentHead === 'string' && /^[0-9a-f]{40}$/i.test(currentHead);
        const matchesHead = isExpected40Hex && isCurrent40Hex && currentHead.toLowerCase() === expectedHead.toLowerCase();

        addCheck(
            'HEAD_MATCH',
            'Commit HEAD Match Gate',
            matchesHead,
            matchesHead
                ? `HEAD verificado exatamente (${currentHead}).`
                : `HEAD divergente ou inválido: esperado "${expectedHead}", atual "${currentHead}".`
        );
    }

    // 4. ORIGIN_MAIN_MATCH: Verificação de origin/main
    if (originMainHead !== undefined) {
        const isOrigin40Hex = typeof originMainHead === 'string' && /^[0-9a-f]{40}$/i.test(originMainHead);
        const matchesOrigin = isOrigin40Hex && expectedHead && originMainHead.toLowerCase() === expectedHead.toLowerCase();

        addCheck(
            'ORIGIN_MAIN_MATCH',
            'Origin Main Match Gate',
            matchesOrigin,
            matchesOrigin
                ? `origin/main alinhado com HEAD (${originMainHead}).`
                : `origin/main divergente do HEAD esperado: origin/main="${originMainHead}", expected="${expectedHead}".`
        );
    }

    // 5. DIST_PRESENT: Verificação de Artefatos de Build (dist/index.html)
    const indexHtmlPath = path.join(distPath, 'index.html');
    const distExists = fs.existsSync(distPath);
    const indexHtmlExists = fs.existsSync(indexHtmlPath);

    if (requireDist) {
        addCheck(
            'DIST_PRESENT',
            'Build Artifact (dist/index.html) Gate',
            distExists && indexHtmlExists,
            indexHtmlExists
                ? `dist/index.html presente (${fs.statSync(indexHtmlPath).size} bytes).`
                : 'dist/index.html não encontrado. Execute npm run build antes do preflight.'
        );
    }

    // 6. INDEX_SHA256_OK: Cálculo determinístico do SHA-256 do index.html
    let indexSha256 = null;
    if (indexHtmlExists) {
        const fileContent = fs.readFileSync(indexHtmlPath);
        indexSha256 = crypto.createHash('sha256').update(fileContent).digest('hex');
        addCheck(
            'INDEX_SHA256_OK',
            'SHA-256 Checksum Calculation Gate',
            typeof indexSha256 === 'string' && indexSha256.length === 64,
            `Checksum SHA-256 calculado: ${indexSha256}`
        );
    }

    // 7. DEMO_FALLBACK_ABSENT & APP_CHECK_DEBUG_ABSENT: Inspeção profunda dos chunks de produção
    if (distExists) {
        const assetsDir = path.join(distPath, 'assets');
        let hasDebugToken = false;
        let foundDemoPattern = null;

        if (fs.existsSync(assetsDir)) {
            const files = fs.readdirSync(assetsDir);
            for (const file of files) {
                if (file.endsWith('.js')) {
                    const content = fs.readFileSync(path.join(assetsDir, file), 'utf8');
                    if (content.includes('FIREBASE_APPCHECK_DEBUG_TOKEN = true') || content.includes('self.FIREBASE_APPCHECK_DEBUG_TOKEN=true')) {
                        hasDebugToken = true;
                    }
                    for (const pattern of FORBIDDEN_DEMO_PATTERNS) {
                        if (content.includes(pattern)) {
                            foundDemoPattern = pattern;
                            break;
                        }
                    }
                }
            }
        }

        addCheck(
            'APP_CHECK_DEBUG_ABSENT',
            'Production App Check Debug Token Absence Gate',
            !hasDebugToken,
            hasDebugToken ? 'ERRO: Token de debug de App Check detectado no bundle de produção!' : 'Nenhum token de debug de App Check presente no bundle.'
        );

        addCheck(
            'DEMO_FALLBACK_ABSENT',
            'Production Demo Configuration Absence Gate',
            !foundDemoPattern,
            foundDemoPattern ? `ERRO: Padrão demo proibido detectado no bundle de produção: "${foundDemoPattern}"` : 'Nenhuma configuração sintética ou demo presente no bundle.'
        );
    }

    // 8. Configuração Firebase Correta em firebase.json
    const firebaseJsonPath = path.join(rootDir, 'firebase.json');
    if (fs.existsSync(firebaseJsonPath)) {
        try {
            const fbConfig = JSON.parse(fs.readFileSync(firebaseJsonPath, 'utf8'));
            const isHostingPublicDist = fbConfig.hosting && fbConfig.hosting.public === 'dist';
            addCheck(
                'FIREBASE_CONFIG_OK',
                'Firebase Config Hosting Directory Gate',
                isHostingPublicDist,
                isHostingPublicDist ? 'firebase.json aponta public para "dist".' : 'firebase.json com configuração incorreta de hosting.public.'
            );
        } catch (err) {
            addCheck('FIREBASE_CONFIG_OK', 'Firebase Config Valid JSON Gate', false, `firebase.json malformatado: ${err.message}`);
        }
    }

    results.indexHtmlSha256 = indexSha256;
    return results;
}

/**
 * Executor CLI Operacional com integração Git real
 */
export function runCliPreflight(argv = process.argv) {
    console.log('=== FINCONTROL RELEASE PREFLIGHT (OPERATIONAL GATE) ===\n');

    // 1. Extração do argumento --expected-head
    let expectedHead = process.env.EXPECTED_HEAD || null;
    for (let i = 0; i < argv.length; i++) {
        if (argv[i] === '--expected-head' && argv[i + 1]) {
            expectedHead = argv[i + 1].trim();
        }
    }

    if (!expectedHead) {
        console.error('❌ ERRO OPERACIONAL: --expected-head <40-char-sha> é obrigatório para execução do preflight.');
        console.error('Uso: node scripts/release/preflight.js --expected-head $(git rev-parse HEAD)');
        process.exit(1);
    }

    if (!/^[0-9a-f]{40}$/i.test(expectedHead)) {
        console.error(`❌ ERRO OPERACIONAL: --expected-head deve ser um SHA-1 completo de 40 caracteres hexadecimais (recebido: "${expectedHead}").`);
        process.exit(1);
    }

    // 2. Leitura real do Git
    let isWorktreeClean = false;
    let currentHead = null;
    let originMainHead = null;

    try {
        const gitStatus = execSync('git status --porcelain', { encoding: 'utf8' }).trim();
        isWorktreeClean = gitStatus.length === 0;

        currentHead = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();

        try {
            originMainHead = execSync('git rev-parse origin/main', { encoding: 'utf8' }).trim();
        } catch (e) {
            console.warn('⚠️ Aviso: origin/main não encontrado localmente. Certifique-se de ter executado git fetch origin main.');
        }
    } catch (gitErr) {
        console.error(`❌ ERRO ao consultar repositório Git: ${gitErr.message}`);
        process.exit(1);
    }

    // 3. Execução das checagens
    const result = runPreflightChecks({
        expectedHead,
        currentHead,
        originMainHead,
        isWorktreeClean,
        requireDist: true
    });

    result.checks.forEach(c => {
        console.log(`${c.passed ? '✅' : '❌'} [${c.code}] ${c.name}: ${c.detail}`);
    });

    if (!result.passed) {
        console.error('\n❌ PREFLIGHT REJEITADO (FAIL-CLOSED). O deploy de produção NÃO PODE prosseguir.');
        process.exit(1);
    } else {
        console.log('\n✅ PREFLIGHT APROVADO COM SUCESSO. Artefato pronto para release.');
    }
}

// Execução direta via CLI
if (process.argv[1] && process.argv[1].endsWith('preflight.js')) {
    runCliPreflight(process.argv);
}
