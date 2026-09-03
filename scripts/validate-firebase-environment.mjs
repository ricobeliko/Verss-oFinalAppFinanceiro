// scripts/validate-firebase-environment.mjs
/**
 * @fileoverview FinControl — Environment Validation & Build Guard
 *
 * Garante que builds e execuções respeitem os contratos rígidos de isolamento:
 * 1. Production: estritamente restrito a 'controle-de-cartao' com emuladores desligados.
 * 2. Staging: proibido apontar para 'controle-de-cartao' ou 'demo-fincontrol-e2e' (Fail-Closed).
 * 3. Local/CI: demo-fincontrol-e2e requer emuladores expressamente habilitados.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const CANONICAL_PRODUCTION_PROJECT_ID = 'controle-de-cartao';
export const CANONICAL_DEMO_PROJECT_ID = 'demo-fincontrol-e2e';

/**
 * Realiza o parsing de arquivos simples .env (formato CHAVE=VALOR).
 * @param {string} filePath
 * @returns {Record<string, string>}
 */
export function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }
  const content = fs.readFileSync(filePath, 'utf8');
  const result = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      result[key] = val;
    }
  }
  return result;
}

/**
 * Resolve as variáveis de configuração de ambiente para o modo alvo.
 * Prioridade:
 * 1. process.env
 * 2. .env.[mode].local
 * 3. .env.[mode]
 * 4. .env.local
 * 5. .env
 *
 * @param {string} environment
 * @param {string} [rootDir=process.cwd()]
 * @returns {{ projectId: string, useEmulator: boolean }}
 */
export function resolveEnvironmentConfig(environment, rootDir = process.cwd()) {
  const env = (environment || '').trim().toLowerCase();

  const envFiles = [
    path.join(rootDir, '.env'),
    path.join(rootDir, '.env.local'),
    path.join(rootDir, `.env.${env}`),
    path.join(rootDir, `.env.${env}.local`),
  ];

  const merged = {};
  for (const file of envFiles) {
    Object.assign(merged, parseEnvFile(file));
  }

  const projectId =
    process.env.VITE_FIREBASE_PROJECT_ID ||
    merged.VITE_FIREBASE_PROJECT_ID ||
    '';

  const rawEmulator =
    process.env.VITE_USE_FIREBASE_EMULATOR !== undefined
      ? process.env.VITE_USE_FIREBASE_EMULATOR
      : merged.VITE_USE_FIREBASE_EMULATOR;

  const useEmulator = rawEmulator === true || rawEmulator === 'true';

  return { projectId: projectId.trim(), useEmulator };
}

/**
 * Valida a integridade do ambiente Firebase contra as invariantes de isolamento.
 *
 * @param {Object} params
 * @param {string} params.environment - 'production' | 'staging' | 'local' | 'test' | 'ci'
 * @param {string} params.projectId - Identificador do projeto Firebase
 * @param {boolean|string} [params.useEmulator=false] - Se emuladores locais estão ativos
 * @returns {{ isValid: boolean, error?: string, environment?: string, projectId?: string, useEmulator?: boolean }}
 */
export function validateFirebaseEnvironment({
  environment,
  projectId,
  useEmulator = false,
}) {
  const env = (environment || '').trim().toLowerCase();
  const proj = (projectId || '').trim();
  const isEmulator = useEmulator === true || useEmulator === 'true';

  if (!env) {
    return {
      isValid: false,
      error: 'Environment validation failed: Environment name is required.',
    };
  }

  // 1. INVARIANT — PRODUCTION
  if (env === 'production') {
    if (!proj) {
      return {
        isValid: false,
        error: 'Production build blocked: Firebase project ID cannot be empty.',
      };
    }
    if (proj !== CANONICAL_PRODUCTION_PROJECT_ID) {
      return {
        isValid: false,
        error: `Production build blocked: Firebase project "${proj}" does not match the canonical production project "${CANONICAL_PRODUCTION_PROJECT_ID}".`,
      };
    }
    if (isEmulator) {
      return {
        isValid: false,
        error: 'Production build blocked: Firebase emulators cannot be enabled in production environment.',
      };
    }
    return {
      isValid: true,
      environment: 'production',
      projectId: proj,
      useEmulator: false,
    };
  }

  // 2. INVARIANT — STAGING
  if (env === 'staging') {
    if (!proj) {
      return {
        isValid: false,
        error: 'Staging build blocked: Firebase project ID cannot be empty.',
      };
    }
    if (proj === CANONICAL_PRODUCTION_PROJECT_ID) {
      return {
        isValid: false,
        error: `Staging build blocked: Staging environment is configured to point to PRODUCTION project "${CANONICAL_PRODUCTION_PROJECT_ID}". Staging must use a strictly isolated project.`,
      };
    }
    if (proj === CANONICAL_DEMO_PROJECT_ID) {
      return {
        isValid: false,
        error: `Staging build blocked: Staging environment cannot point to local demo project "${CANONICAL_DEMO_PROJECT_ID}". Staging requires an isolated cloud project.`,
      };
    }
    if (isEmulator) {
      return {
        isValid: false,
        error: 'Staging build blocked: Firebase emulators cannot be enabled in staging build.',
      };
    }
    return {
      isValid: true,
      environment: 'staging',
      projectId: proj,
      useEmulator: false,
    };
  }

  // 3. INVARIANT — LOCAL / CI / TEST
  if (env === 'local' || env === 'test' || env === 'ci') {
    if (proj === CANONICAL_DEMO_PROJECT_ID && !isEmulator) {
      return {
        isValid: false,
        error: `Local environment blocked: Demo project "${CANONICAL_DEMO_PROJECT_ID}" requires VITE_USE_FIREBASE_EMULATOR=true.`,
      };
    }
    return {
      isValid: true,
      environment: env,
      projectId: proj,
      useEmulator: isEmulator,
    };
  }

  return {
    isValid: false,
    error: `Environment validation failed: Unknown environment "${environment}". Must be one of: production, staging, local, test, ci.`,
  };
}

/**
 * Ponto de entrada CLI para validação antes de builds ou inicializações.
 */
export function runCli(argv = process.argv) {
  const targetEnv = argv[2];
  if (!targetEnv) {
    console.error('ERRO: Informe o ambiente desejado: production, staging, local, test ou ci.');
    console.error('Uso: node scripts/validate-firebase-environment.mjs <environment>');
    process.exit(1);
  }

  const { projectId, useEmulator } = resolveEnvironmentConfig(targetEnv);
  const result = validateFirebaseEnvironment({
    environment: targetEnv,
    projectId,
    useEmulator,
  });

  if (!result.isValid) {
    console.error('\n=============================================================');
    console.error('⛔ SEGURANÇA FINCONTROL: FALHA DE VALIDAÇÃO DE AMBIENTE');
    console.error('=============================================================');
    console.error(result.error);
    console.error(`Ambiente Alvo : ${targetEnv}`);
    console.error(`Projeto Lido  : ${projectId || '[VAZIO]'}`);
    console.error(`Emulador      : ${useEmulator}`);
    console.error('=============================================================\n');
    process.exit(1);
  }

  console.log(`[EnvironmentGuard] ✓ Ambiente "${result.environment}" validado com sucesso. Project ID: "${result.projectId}", Emuladores: ${result.useEmulator}.`);
}

// Execução direta via terminal
const isDirectExecution =
  process.argv[1] &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isDirectExecution) {
  runCli();
}
