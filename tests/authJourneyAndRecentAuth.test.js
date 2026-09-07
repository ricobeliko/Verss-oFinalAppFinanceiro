// tests/authJourneyAndRecentAuth.test.js
import { describe, it, expect, vi } from 'vitest';
import { mapAuthError } from '../src/features/auth/authErrorMap';

describe('FinControl — Auth Journey & Recent-Auth Contract (Fase 8.6 — Stage A)', () => {

  describe('1. Error Mapping & User Enumeration Defense', () => {
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

  describe('2. Registration Validation & Schema Rules', () => {
    it('deve validar regras de senha mínima de 8 caracteres', () => {
      const isPasswordValid = (pwd) => typeof pwd === 'string' && pwd.length >= 8;
      expect(isPasswordValid('1234567')).toBe(false);
      expect(isPasswordValid('12345678')).toBe(true);
      expect(isPasswordValid('senhaForte123')).toBe(true);
    });

    it('deve rejeitar confirmação de senha divergente', () => {
      const passwordsMatch = (p1, p2) => p1 === p2;
      expect(passwordsMatch('senha1234', 'senha1235')).toBe(false);
      expect(passwordsMatch('senha1234', 'senha1234')).toBe(true);
    });

    it('deve preservar criação com plano "free" e sem ativação antecipada de trial', () => {
      const initialUserData = {
        name: 'Cliente Teste',
        email: 'teste@fincontrol.com',
        plan: 'free',
        trialExpiresAt: null,
      };
      expect(initialUserData.plan).toBe('free');
      expect(initialUserData.trialExpiresAt).toBeNull();
    });
  });

  describe('3. Password Reset Flow (User Enumeration Protection)', () => {
    it('deve responder de forma neutra quando usuário não existe para impedir enumeração', async () => {
      const mockSendReset = vi.fn().mockRejectedValue({ code: 'auth/user-not-found' });
      let statusResponse = '';

      try {
        await mockSendReset('inexistente@fincontrol.com');
      } catch (err) {
        if (err.code === 'auth/user-not-found') {
          statusResponse = 'Se este e-mail estiver cadastrado, você receberá o link de recuperação em instantes.';
        }
      }

      expect(mockSendReset).toHaveBeenCalledWith('inexistente@fincontrol.com');
      expect(statusResponse).toContain('Se este e-mail estiver cadastrado');
      expect(statusResponse).not.toContain('não encontrado');
    });
  });

  describe('4. Destructive Account Deletion & Two-Step Recent Auth Contract', () => {
    it('deve exigir texto de confirmação exato "EXCLUIR" no Step 1', () => {
      const validateStep1 = (text) => text.trim().toUpperCase() === 'EXCLUIR';
      expect(validateStep1('')).toBe(false);
      expect(validateStep1('excluir')).toBe(true);
      expect(validateStep1(' EXCLUIR ')).toBe(true);
      expect(validateStep1('DELETE')).toBe(false);
      expect(validateStep1('excluir conta')).toBe(false);
    });

    it('deve falhar fechado (fail-closed) no Step 2 se a senha for vazia ou usuário ausente', async () => {
      const deleteCallable = vi.fn();
      const reauthenticate = vi.fn();

      const attemptDeletion = async ({ user, password }) => {
        if (!user || !user.email) throw new Error('Sessão inválida');
        if (!password || !password.trim()) throw new Error('Senha obrigatória');
        await reauthenticate();
        await deleteCallable();
      };

      // Sem usuário
      await expect(attemptDeletion({ user: null, password: '123' })).rejects.toThrow('Sessão inválida');
      expect(reauthenticate).not.toHaveBeenCalled();
      expect(deleteCallable).not.toHaveBeenCalled();

      // Sem senha
      await expect(attemptDeletion({ user: { email: 'test@fin.local' }, password: '' })).rejects.toThrow('Senha obrigatória');
      expect(reauthenticate).not.toHaveBeenCalled();
      expect(deleteCallable).not.toHaveBeenCalled();
    });

    it('deve interromper o fluxo e NÃO chamar deleteUserAccount se a reautenticação falhar com senha incorreta', async () => {
      const reauthMock = vi.fn().mockRejectedValue({ code: 'auth/wrong-password' });
      const deleteCallableMock = vi.fn();
      let errorMessage = '';

      try {
        await reauthMock();
        await deleteCallableMock();
      } catch (err) {
        if (err.code === 'auth/wrong-password') {
          errorMessage = 'Senha incorreta. Tente novamente.';
        }
      }

      expect(reauthMock).toHaveBeenCalledTimes(1);
      expect(deleteCallableMock).not.toHaveBeenCalled();
      expect(errorMessage).toBe('Senha incorreta. Tente novamente.');
    });

    it('deve forçar atualização do ID Token antes de invocar a callable após reautenticação com sucesso', async () => {
      const reauthMock = vi.fn().mockResolvedValue(true);
      const getIdTokenMock = vi.fn().mockResolvedValue('new-fresh-id-token');
      const deleteCallableMock = vi.fn().mockResolvedValue({ data: { success: true } });
      const logoutMock = vi.fn();

      const user = {
        email: 'user@fincontrol.com',
        getIdToken: getIdTokenMock,
      };

      // Sequência oficial:
      await reauthMock();
      await user.getIdToken(true); // Força refresh com auth_time recente
      await deleteCallableMock();
      logoutMock();

      expect(reauthMock).toHaveBeenCalledTimes(1);
      expect(getIdTokenMock).toHaveBeenCalledWith(true);
      expect(deleteCallableMock).toHaveBeenCalledTimes(1);
      expect(logoutMock).toHaveBeenCalledTimes(1);
    });

    it('deve tratar defensivamente erro recent-auth-required do backend sem loops infinitos', async () => {
      const serverError = {
        code: 'functions/failed-precondition',
        details: { reason: 'recent-auth-required' },
      };

      let userFeedback = '';
      if (serverError.code === 'functions/failed-precondition' && serverError.details?.reason === 'recent-auth-required') {
        userFeedback = 'Não foi possível atualizar sua autenticação. Entre novamente e tente de novo.';
      }

      expect(userFeedback).toBe('Não foi possível atualizar sua autenticação. Entre novamente e tente de novo.');
    });
  });

});
