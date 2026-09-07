// tests/authJourneyAndRecentAuth.test.js
import { describe, it, expect, vi } from 'vitest';
import { mapAuthError } from '../src/features/auth/authErrorMap';
import {
  executeAccountDeletion,
  mapAccountDeletionError,
} from '../src/features/auth/accountDeletionFlow';

describe('FinControl — Auth Journey & Recent-Auth Contract (Fase 8.6 — PR #32)', () => {

  describe('1. Error Mapping & User Enumeration Defense (Auth)', () => {
    it('deve retornar mensagem neutra para credenciais inválidas, usuário não encontrado ou senha errada (proteção contra enumeração)', () => {
      const neutralMessage = 'E-mail ou senha inválidos.';
      expect(mapAuthError({ code: 'auth/invalid-credential' })).toBe(neutralMessage);
      expect(mapAuthError({ code: 'auth/user-not-found' })).toBe(neutralMessage);
      expect(mapAuthError({ code: 'auth/wrong-password' })).toBe(neutralMessage);
    });

    it('deve mapear erros conhecidos de cadastro e rede de forma clara e segura', () => {
      expect(mapAuthError({ code: 'auth/email-already-in-use' })).toBe('Este e-mail já está em uso. Tente fazer login.');
      expect(mapAuthError({ code: 'auth/invalid-email' })).toBe('Formato de e-mail inválido.');
      expect(mapAuthError({ code: 'auth/weak-password' })).toBe('A senha deve ter no mínimo 8 caracteres.');
      expect(mapAuthError({ code: 'auth/too-many-requests' })).toBe('Muitas tentativas consecutivas. Aguarde alguns instantes e tente novamente.');
      expect(mapAuthError({ code: 'auth/network-request-failed' })).toBe('Falha de conexão com a rede. Verifique sua internet e tente novamente.');
    });

    it('deve retornar fallback padrão para erros desconhecidos sem vazar detalhes técnicos', () => {
      const fallback = mapAuthError({ code: 'auth/internal-error', message: 'internal detail' });
      expect(fallback).toBe('Ocorreu um erro na autenticação. Tente novamente.');
      expect(fallback).not.toContain('internal detail');
    });
  });

  describe('2. Account Deletion Error Mapping & Raw Error Suppression', () => {
    it('deve mapear erros conhecidos de credencial e recente autenticação para mensagens seguras', () => {
      expect(mapAccountDeletionError({ code: 'auth/wrong-password' })).toBe('Senha incorreta. Tente novamente.');
      expect(mapAccountDeletionError({ code: 'auth/invalid-credential' })).toBe('Senha incorreta. Tente novamente.');
      expect(
        mapAccountDeletionError({
          code: 'functions/failed-precondition',
          details: { reason: 'recent-auth-required' },
        })
      ).toBe('Não foi possível atualizar sua autenticação. Entre novamente e tente de novo.');
      expect(mapAccountDeletionError({ code: 'auth/too-many-requests' })).toBe(
        'Muitas tentativas consecutivas. Aguarde alguns instantes e tente novamente.'
      );
      expect(mapAccountDeletionError({ code: 'auth/network-request-failed' })).toBe(
        'Falha de conexão com a rede. Verifique sua internet e tente novamente.'
      );
      expect(mapAccountDeletionError({ code: 'functions/unavailable' })).toBe(
        'Serviço temporariamente indisponível. Tente novamente mais tarde.'
      );
      expect(mapAccountDeletionError({ code: 'auth/missing-password' })).toBe(
        'Por favor, informe a sua senha atual.'
      );
      expect(mapAccountDeletionError({ code: 'auth/invalid-session' })).toBe(
        'Sessão inválida. Faça login novamente para prosseguir.'
      );
    });

    it('NUNCA deve exibir raw error.message ou error.stack para erro desconhecido (SECRET_INTERNAL_DETAIL)', () => {
      const internalError = {
        code: 'unknown/internal-failure',
        message: 'SECRET_INTERNAL_DETAIL: database connection refused at 10.0.0.1',
        stack: 'Error: SECRET_INTERNAL_DETAIL at Server.run (/app/secret.js:42)',
      };

      const mapped = mapAccountDeletionError(internalError);

      expect(mapped).toBe('Não foi possível excluir sua conta. Tente novamente.');
      expect(mapped).not.toContain('SECRET_INTERNAL_DETAIL');
      expect(mapped).not.toContain('database connection refused');
      expect(mapped).not.toContain('/app/secret.js');
    });
  });

  describe('3. Real Recent-Auth Deletion Orchestration (accountDeletionFlow)', () => {
    it('deve executar a sequência canônica real: reauthenticateWithCredential → getIdToken(true) → delete callable', async () => {
      const executionTrace = [];

      const reauthMock = vi.fn().mockImplementation(async (user, credential) => {
        executionTrace.push('reauthenticate');
        expect(credential).toBeDefined();
      });

      const getIdTokenMock = vi.fn().mockImplementation(async (forceRefresh) => {
        executionTrace.push('getIdToken');
        expect(forceRefresh).toBe(true);
        return 'fresh-refreshed-token';
      });

      const deleteCallableMock = vi.fn().mockImplementation(async () => {
        executionTrace.push('deleteCallable');
        return { data: { success: true } };
      });

      const currentUser = {
        uid: 'user-lgpd-real-123',
        email: 'cliente.real@fincontrol.com',
        getIdToken: getIdTokenMock,
      };

      const result = await executeAccountDeletion({
        currentUser,
        password: 'SenhaSegura123',
        reauthenticateFn: reauthMock,
        getCallableFn: async () => deleteCallableMock,
      });

      expect(result.success).toBe(true);
      expect(executionTrace).toEqual(['reauthenticate', 'getIdToken', 'deleteCallable']);
      expect(reauthMock).toHaveBeenCalledTimes(1);
      expect(getIdTokenMock).toHaveBeenCalledWith(true);
      expect(deleteCallableMock).toHaveBeenCalledTimes(1);
    });

    it('deve falhar fechado se currentUser for nulo (sem reauth e sem delete)', async () => {
      const reauthMock = vi.fn();
      const deleteCallableMock = vi.fn();

      await expect(
        executeAccountDeletion({
          currentUser: null,
          password: 'SenhaSegura123',
          reauthenticateFn: reauthMock,
          getCallableFn: async () => deleteCallableMock,
        })
      ).rejects.toThrow('Sessão inválida. Faça login novamente para prosseguir.');

      expect(reauthMock).not.toHaveBeenCalled();
      expect(deleteCallableMock).not.toHaveBeenCalled();
    });

    it('deve falhar fechado se currentUser.email estiver ausente (sem reauth e sem delete)', async () => {
      const reauthMock = vi.fn();
      const deleteCallableMock = vi.fn();

      await expect(
        executeAccountDeletion({
          currentUser: { uid: 'no-email-user', email: '' },
          password: 'SenhaSegura123',
          reauthenticateFn: reauthMock,
          getCallableFn: async () => deleteCallableMock,
        })
      ).rejects.toThrow('Sessão inválida. Faça login novamente para prosseguir.');

      expect(reauthMock).not.toHaveBeenCalled();
      expect(deleteCallableMock).not.toHaveBeenCalled();
    });

    it('deve falhar fechado se senha for vazia ou somente espaços (sem reauth e sem delete)', async () => {
      const reauthMock = vi.fn();
      const deleteCallableMock = vi.fn();
      const currentUser = { uid: 'user-1', email: 'user@fincontrol.com', getIdToken: vi.fn() };

      await expect(
        executeAccountDeletion({
          currentUser,
          password: '',
          reauthenticateFn: reauthMock,
          getCallableFn: async () => deleteCallableMock,
        })
      ).rejects.toThrow('Por favor, informe a sua senha atual.');

      await expect(
        executeAccountDeletion({
          currentUser,
          password: '    ',
          reauthenticateFn: reauthMock,
          getCallableFn: async () => deleteCallableMock,
        })
      ).rejects.toThrow('Por favor, informe a sua senha atual.');

      expect(reauthMock).not.toHaveBeenCalled();
      expect(deleteCallableMock).not.toHaveBeenCalled();
    });

    it('deve interromper o fluxo se a reautenticação falhar (sem renovação de token e sem delete)', async () => {
      const reauthMock = vi.fn().mockRejectedValue({ code: 'auth/wrong-password' });
      const getIdTokenMock = vi.fn();
      const deleteCallableMock = vi.fn();

      const currentUser = {
        uid: 'user-fail-reauth',
        email: 'user@fincontrol.com',
        getIdToken: getIdTokenMock,
      };

      await expect(
        executeAccountDeletion({
          currentUser,
          password: 'senha-errada',
          reauthenticateFn: reauthMock,
          getCallableFn: async () => deleteCallableMock,
        })
      ).rejects.toMatchObject({ code: 'auth/wrong-password' });

      expect(reauthMock).toHaveBeenCalledTimes(1);
      expect(getIdTokenMock).not.toHaveBeenCalled();
      expect(deleteCallableMock).not.toHaveBeenCalled();
    });

    it('deve interromper o fluxo se a renovação de ID Token falhar (sem chamar delete)', async () => {
      const reauthMock = vi.fn().mockResolvedValue(true);
      const getIdTokenMock = vi.fn().mockRejectedValue(new Error('Falha de rede ao renovar token'));
      const deleteCallableMock = vi.fn();

      const currentUser = {
        uid: 'user-fail-token',
        email: 'user@fincontrol.com',
        getIdToken: getIdTokenMock,
      };

      await expect(
        executeAccountDeletion({
          currentUser,
          password: 'senhaCorreta123',
          reauthenticateFn: reauthMock,
          getCallableFn: async () => deleteCallableMock,
        })
      ).rejects.toThrow('Falha de rede ao renovar token');

      expect(reauthMock).toHaveBeenCalledTimes(1);
      expect(getIdTokenMock).toHaveBeenCalledWith(true);
      expect(deleteCallableMock).not.toHaveBeenCalled();
    });

    it('deve propagar erro de forma controlada se a callable de exclusão falhar', async () => {
      const reauthMock = vi.fn().mockResolvedValue(true);
      const getIdTokenMock = vi.fn().mockResolvedValue('token-ok');
      const deleteCallableMock = vi.fn().mockRejectedValue({
        code: 'functions/internal',
        message: 'Internal error in Cloud Function',
      });

      const currentUser = {
        uid: 'user-callable-fail',
        email: 'user@fincontrol.com',
        getIdToken: getIdTokenMock,
      };

      await expect(
        executeAccountDeletion({
          currentUser,
          password: 'senhaCorreta123',
          reauthenticateFn: reauthMock,
          getCallableFn: async () => deleteCallableMock,
        })
      ).rejects.toMatchObject({ code: 'functions/internal' });

      expect(reauthMock).toHaveBeenCalledTimes(1);
      expect(getIdTokenMock).toHaveBeenCalledWith(true);
      expect(deleteCallableMock).toHaveBeenCalledTimes(1);
    });
  });

});
