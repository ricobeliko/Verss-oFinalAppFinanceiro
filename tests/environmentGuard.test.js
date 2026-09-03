// tests/environmentGuard.test.js
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import {
  validateFirebaseEnvironment,
  resolveEnvironmentConfig,
  parseEnvFile,
  CANONICAL_PRODUCTION_PROJECT_ID,
  CANONICAL_DEMO_PROJECT_ID,
} from '../scripts/validate-firebase-environment.mjs';

describe('Environment Build Guard & Isolation Invariants (Fase 8.2)', () => {
  describe('Invariante 1: Production Environment', () => {
    it('A. Production correto: controle-de-cartao com emulador desligado -> PASS', () => {
      const result = validateFirebaseEnvironment({
        environment: 'production',
        projectId: 'controle-de-cartao',
        useEmulator: false,
      });

      expect(result.isValid).toBe(true);
      expect(result.environment).toBe('production');
      expect(result.projectId).toBe('controle-de-cartao');
      expect(result.useEmulator).toBe(false);
      expect(result.error).toBeUndefined();
    });

    it('B. Production apontando staging: fincontrol-staging -> FAIL CLOSED (BLOCK)', () => {
      const result = validateFirebaseEnvironment({
        environment: 'production',
        projectId: 'fincontrol-staging',
        useEmulator: false,
      });

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Production build blocked:');
      expect(result.error).toContain('does not match the canonical production project');
    });

    it('C. Production apontando demo: demo-fincontrol-e2e -> FAIL CLOSED (BLOCK)', () => {
      const result = validateFirebaseEnvironment({
        environment: 'production',
        projectId: 'demo-fincontrol-e2e',
        useEmulator: false,
      });

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Production build blocked:');
      expect(result.error).toContain('does not match the canonical production project');
    });

    it('D. Production com emuladores ativados (useEmulator: true) -> FAIL CLOSED (BLOCK)', () => {
      const result = validateFirebaseEnvironment({
        environment: 'production',
        projectId: 'controle-de-cartao',
        useEmulator: true,
      });

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Firebase emulators cannot be enabled in production environment');
    });

    it('E. Production com projectId vazio -> FAIL CLOSED (BLOCK)', () => {
      const result = validateFirebaseEnvironment({
        environment: 'production',
        projectId: '',
        useEmulator: false,
      });

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Firebase project ID cannot be empty');
    });
  });

  describe('Invariante 2: Staging Environment', () => {
    it('F. Staging correto: fincontrol-staging (ou projeto isolado) com emulador desligado -> PASS', () => {
      const result = validateFirebaseEnvironment({
        environment: 'staging',
        projectId: 'fincontrol-staging',
        useEmulator: false,
      });

      expect(result.isValid).toBe(true);
      expect(result.environment).toBe('staging');
      expect(result.projectId).toBe('fincontrol-staging');
      expect(result.useEmulator).toBe(false);
    });

    it('G. Staging apontando PRODUÇÃO: controle-de-cartao -> FAIL CLOSED (CRITICAL BLOCK)', () => {
      const result = validateFirebaseEnvironment({
        environment: 'staging',
        projectId: 'controle-de-cartao',
        useEmulator: false,
      });

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Staging build blocked:');
      expect(result.error).toContain('Staging environment is configured to point to PRODUCTION project');
      expect(result.error).toContain('Staging must use a strictly isolated project');
    });

    it('H. Staging apontando DEMO: demo-fincontrol-e2e -> FAIL CLOSED (BLOCK)', () => {
      const result = validateFirebaseEnvironment({
        environment: 'staging',
        projectId: 'demo-fincontrol-e2e',
        useEmulator: false,
      });

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Staging build blocked:');
      expect(result.error).toContain('Staging environment cannot point to local demo project');
    });

    it('I. Staging com emuladores ativados (useEmulator: true) -> FAIL CLOSED (BLOCK)', () => {
      const result = validateFirebaseEnvironment({
        environment: 'staging',
        projectId: 'fincontrol-staging',
        useEmulator: true,
      });

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Firebase emulators cannot be enabled in staging build');
    });

    it('J. Staging com projectId vazio -> FAIL CLOSED (BLOCK)', () => {
      const result = validateFirebaseEnvironment({
        environment: 'staging',
        projectId: '',
        useEmulator: false,
      });

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Firebase project ID cannot be empty');
    });
  });

  describe('Invariante 3: Local / CI / Test Environment', () => {
    it('K. Local emulator: demo-fincontrol-e2e com useEmulator: true -> PASS', () => {
      const result = validateFirebaseEnvironment({
        environment: 'local',
        projectId: 'demo-fincontrol-e2e',
        useEmulator: true,
      });

      expect(result.isValid).toBe(true);
      expect(result.environment).toBe('local');
      expect(result.projectId).toBe('demo-fincontrol-e2e');
      expect(result.useEmulator).toBe(true);
    });

    it('L. Local com demo-fincontrol-e2e mas sem emulador (useEmulator: false) -> FAIL CLOSED (BLOCK)', () => {
      const result = validateFirebaseEnvironment({
        environment: 'local',
        projectId: 'demo-fincontrol-e2e',
        useEmulator: false,
      });

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('requires VITE_USE_FIREBASE_EMULATOR=true');
    });

    it('M. Test / CI environment com emuladores -> PASS', () => {
      const resultCI = validateFirebaseEnvironment({
        environment: 'ci',
        projectId: 'demo-fincontrol-e2e',
        useEmulator: true,
      });
      expect(resultCI.isValid).toBe(true);

      const resultTest = validateFirebaseEnvironment({
        environment: 'test',
        projectId: 'demo-fincontrol-e2e',
        useEmulator: true,
      });
      expect(resultTest.isValid).toBe(true);
    });
  });

  describe('Casos de Borda e Validação Geral', () => {
    it('N. Ambiente desconhecido -> FAIL CLOSED', () => {
      const result = validateFirebaseEnvironment({
        environment: 'invalid_env',
        projectId: 'controle-de-cartao',
      });

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Unknown environment "invalid_env"');
    });

    it('O. Ambiente vazio -> FAIL CLOSED', () => {
      const result = validateFirebaseEnvironment({
        environment: '',
        projectId: 'controle-de-cartao',
      });

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Environment name is required');
    });

    it('P. Constantes canônicas expostas corretamente', () => {
      expect(CANONICAL_PRODUCTION_PROJECT_ID).toBe('controle-de-cartao');
      expect(CANONICAL_DEMO_PROJECT_ID).toBe('demo-fincontrol-e2e');
    });
  });

  describe('Resolução de Configuração e Parser de Arquivos .env', () => {
    let tempDir;

    beforeEach(() => {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fincontrol-env-test-'));
    });

    afterEach(() => {
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it('Q. parseEnvFile faz parsing correto de chaves, aspas e comentários', () => {
      const envPath = path.join(tempDir, '.env');
      fs.writeFileSync(
        envPath,
        `
# Comentário
VITE_FIREBASE_PROJECT_ID=test-project
VITE_USE_FIREBASE_EMULATOR="false"
VITE_FIREBASE_API_KEY='single-quote-key'
EMPTY_VAL=
        `
      );

      const parsed = parseEnvFile(envPath);
      expect(parsed.VITE_FIREBASE_PROJECT_ID).toBe('test-project');
      expect(parsed.VITE_USE_FIREBASE_EMULATOR).toBe('false');
      expect(parsed.VITE_FIREBASE_API_KEY).toBe('single-quote-key');
      expect(parsed.EMPTY_VAL).toBe('');
    });

    it('R. resolveEnvironmentConfig respeita hierarquia de arquivos e process.env', () => {
      const prodEnvPath = path.join(tempDir, '.env.production');
      fs.writeFileSync(
        prodEnvPath,
        `
VITE_FIREBASE_PROJECT_ID=controle-de-cartao
VITE_USE_FIREBASE_EMULATOR=false
        `
      );

      const resolved = resolveEnvironmentConfig('production', tempDir);
      expect(resolved.projectId).toBe('controle-de-cartao');
      expect(resolved.useEmulator).toBe(false);
    });
  });
});
