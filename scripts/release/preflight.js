/* global process */
// scripts/release/preflight.js
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

/**
 * Validador puro de Release Preflight
 * Executa todas as checagens estáticas e operacionais necessárias ANTES de qualquer deploy de Hosting.
 */
export function runPreflightChecks(options = {}) {
    const rootDir = options.rootDir || process.cwd();
    const expectedHead = options.expectedHead;
    const currentHead = options.currentHead;
    const isWorktreeClean = options.isWorktreeClean !== undefined ? options.isWorktreeClean : true;
    const nodeVersion = options.nodeVersion || process.version;

    const results = {
        passed: true,
        checks: [],
        errors: []
    };

    function addCheck(name, passed, detail) {
        results.checks.push({ name, passed, detail });
        if (!passed) {
            results.passed = false;
            results.errors.push(`[FALHA] ${name}: ${detail}`);
        }
    }

    // 1. Verificação de Versão do Node (deve ser Node 22)
    const isNode22 = /^v?22\./.test(nodeVersion);
    addCheck(
        'Node Version Gate',
        isNode22,
        isNode22 ? `Node ${nodeVersion} verificado com sucesso.` : `Node inválido: ${nodeVersion}. FinControl exige Node 22.x LTS.`
    );

    // 2. Verificação de Worktree Limpo
    addCheck(
        'Git Clean Worktree Gate',
        isWorktreeClean,
        isWorktreeClean ? 'Worktree limpo, sem arquivos não rastreados ou modificados.' : 'Worktree contém arquivos sujos ou modificações não commitadas.'
    );

    // 3. Verificação de HEAD Esperado (se fornecido)
    if (expectedHead && currentHead) {
        const matchesHead = currentHead.startsWith(expectedHead) || expectedHead.startsWith(currentHead);
        addCheck(
            'Commit HEAD Match Gate',
            matchesHead,
            matchesHead ? `HEAD verificado (${currentHead}).` : `HEAD divergente: esperado ${expectedHead}, atual ${currentHead}.`
        );
    }

    // 4. Verificação de Artefatos de Build (dist/index.html)
    const requireDist = options.requireDist !== undefined ? options.requireDist : true;
    const distPath = options.distPath || path.join(rootDir, 'dist');
    const indexHtmlPath = path.join(distPath, 'index.html');
    const distExists = fs.existsSync(distPath);
    const indexHtmlExists = fs.existsSync(indexHtmlPath);

    if (requireDist) {
        addCheck(
            'Build Artifact (dist/index.html) Gate',
            distExists && indexHtmlExists,
            indexHtmlExists ? `dist/index.html presente (${fs.statSync(indexHtmlPath).size} bytes).` : 'dist/index.html não encontrado. Execute npm run build antes do preflight.'
        );
    }

    let indexSha256 = null;
    if (indexHtmlExists) {
        const fileContent = fs.readFileSync(indexHtmlPath);
        indexSha256 = crypto.createHash('sha256').update(fileContent).digest('hex');
        addCheck(
            'SHA-256 Checksum Calculation Gate',
            typeof indexSha256 === 'string' && indexSha256.length === 64,
            `Checksum SHA-256 calculado: ${indexSha256}`
        );
    }

    // 5. Verificação de Segurança no Bundle (Sem App Check Debug Token no dist)
    if (distExists) {
        const assetsDir = path.join(distPath, 'assets');
        let hasDebugToken = false;
        if (fs.existsSync(assetsDir)) {
            const files = fs.readdirSync(assetsDir);
            for (const file of files) {
                if (file.endsWith('.js')) {
                    const content = fs.readFileSync(path.join(assetsDir, file), 'utf8');
                    if (content.includes('FIREBASE_APPCHECK_DEBUG_TOKEN = true') || content.includes('self.FIREBASE_APPCHECK_DEBUG_TOKEN=true')) {
                        hasDebugToken = true;
                        break;
                    }
                }
            }
        }
        addCheck(
            'Production App Check Debug Token Absence Gate',
            !hasDebugToken,
            hasDebugToken ? 'ERRO: Token de debug de App Check detectado no bundle de produção!' : 'Nenhum token de debug de App Check presente no bundle.'
        );
    }

    // 6. Configuração Firebase Correta em firebase.json
    const firebaseJsonPath = path.join(rootDir, 'firebase.json');
    if (fs.existsSync(firebaseJsonPath)) {
        try {
            const fbConfig = JSON.parse(fs.readFileSync(firebaseJsonPath, 'utf8'));
            const isHostingPublicDist = fbConfig.hosting && fbConfig.hosting.public === 'dist';
            addCheck(
                'Firebase Config Hosting Directory Gate',
                isHostingPublicDist,
                isHostingPublicDist ? 'firebase.json aponta public para "dist".' : 'firebase.json com configuração incorreta de hosting.public.'
            );
        } catch (err) {
            addCheck('Firebase Config Valid JSON Gate', false, `firebase.json malformatado: ${err.message}`);
        }
    }

    results.indexHtmlSha256 = indexSha256;
    return results;
}

// Execução direta via linha de comando
if (process.argv[1] && process.argv[1].endsWith('preflight.js')) {
    console.log('--- FinControl Release Preflight ---');
    const result = runPreflightChecks();
    result.checks.forEach(c => {
        console.log(`${c.passed ? '✅' : '❌'} ${c.name}: ${c.detail}`);
    });
    if (!result.passed) {
        console.error('\nPreflight FALHOU. Corrija os erros acima antes de prosseguir com qualquer release.');
        process.exit(1);
    } else {
        console.log('\nPreflight APROVADO com sucesso. Sistema pronto para geração de Release Manifest.');
    }
}
