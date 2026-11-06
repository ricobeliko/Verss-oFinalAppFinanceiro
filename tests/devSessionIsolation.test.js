// tests/devSessionIsolation.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setupAuthLifecycle } from '../src/context/authLifecycle';

describe('Isolamento de Segurança: Sessão E2E / Mock Data apenas em DEV', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('deve aceitar e2eSession quando import.meta.env.DEV for true', () => {
    vi.stubEnv('DEV', true);

    const setCurrentUser = vi.fn();
    const setUserProfile = vi.fn();
    const setIsAuthReady = vi.fn();

    const mockSession = {
      uid: 'dev-user-123',
      email: 'dev@test.local',
      name: 'Dev Tester',
      plan: 'pro'
    };

    setupAuthLifecycle({
      setCurrentUser,
      setUserProfile,
      setIsAuthReady,
      e2eSession: mockSession,
    });

    expect(setCurrentUser).toHaveBeenCalledWith(
      expect.objectContaining({
        uid: 'dev-user-123',
        email: 'dev@test.local',
        displayName: 'Dev Tester',
      })
    );
    expect(setUserProfile).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Dev Tester',
        email: 'dev@test.local',
        plan: 'pro',
      })
    );
    expect(setIsAuthReady).toHaveBeenCalledWith(true);
  });

  it('deve IGNORAR e2eSession quando import.meta.env.DEV for false (modo Produção)', () => {
    vi.stubEnv('DEV', false);

    const setCurrentUser = vi.fn();
    const setUserProfile = vi.fn();
    const setIsAuthReady = vi.fn();
    const onAuthChanged = vi.fn(() => vi.fn());

    const mockSession = {
      uid: 'attacker-fake-session',
      email: 'attacker@evil.local',
      name: 'Fake Admin',
      plan: 'pro'
    };

    setupAuthLifecycle({
      setCurrentUser,
      setUserProfile,
      setIsAuthReady,
      onAuthChanged,
      e2eSession: mockSession,
    });

    // Em produção (DEV=false), a sessão mock NUNCA deve ser aplicada diretamente
    expect(setCurrentUser).not.toHaveBeenCalledWith(
      expect.objectContaining({
        uid: 'attacker-fake-session',
      })
    );
    expect(setUserProfile).not.toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Fake Admin',
      })
    );
    // Deve recorrer ao onAuthStateChanged real do Firebase
    expect(onAuthChanged).toHaveBeenCalled();
  });
});
