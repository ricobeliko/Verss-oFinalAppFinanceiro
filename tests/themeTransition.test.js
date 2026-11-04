// tests/themeTransition.test.js
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  shouldBypassViewTransition,
  toggleThemeWithTransition,
} from '../src/utils/themeTransition.js';

describe('FinControl — Theme Transition (Circular Reveal & Fallbacks)', () => {
  let mockClasses;
  let mockAnimate;
  let transitionCallbacks;

  beforeEach(() => {
    mockClasses = new Set();
    mockAnimate = vi.fn(() => ({
      finished: Promise.resolve(),
    }));

    globalThis.window = {
      innerWidth: 1280,
      innerHeight: 800,
      matchMedia: vi.fn((query) => ({
        matches: false,
        media: query,
      })),
    };

    globalThis.document = {
      documentElement: {
        classList: {
          add: vi.fn((cls) => mockClasses.add(cls)),
          remove: vi.fn((cls) => mockClasses.delete(cls)),
          contains: vi.fn((cls) => mockClasses.has(cls)),
        },
        animate: mockAnimate,
      },
      startViewTransition: vi.fn((callback) => {
        transitionCallbacks = {
          callback,
          ready: Promise.resolve(),
          finished: Promise.resolve(),
          skipTransition: vi.fn(),
        };
        // Chama callback para atualizar DOM / React
        if (typeof callback === 'function') {
          callback();
        }
        return transitionCallbacks;
      }),
    };
  });

  afterEach(() => {
    delete globalThis.window;
    delete globalThis.document;
    vi.restoreAllMocks();
  });

  describe('shouldBypassViewTransition', () => {
    it('ignora se startViewTransition não existir no document', () => {
      delete globalThis.document.startViewTransition;
      expect(shouldBypassViewTransition()).toBe(true);
    });

    it('ignora se prefers-reduced-motion: reduce estiver ativo', () => {
      globalThis.window.matchMedia = vi.fn((query) => ({
        matches: query.includes('prefers-reduced-motion: reduce'),
      }));
      expect(shouldBypassViewTransition()).toBe(true);
    });

    it('ignora se flag de teste window.__FINCONTROL_TEST_REDUCED_MOTION__ for true', () => {
      globalThis.window.__FINCONTROL_TEST_REDUCED_MOTION__ = true;
      expect(shouldBypassViewTransition()).toBe(true);
    });

    it('ignora em telas mobile (innerWidth < 768)', () => {
      globalThis.window.innerWidth = 767;
      expect(shouldBypassViewTransition()).toBe(true);
    });

    it('ignora em dispositivos com ponteiro grosso (pointer: coarse)', () => {
      globalThis.window.matchMedia = vi.fn((query) => ({
        matches: query.includes('(pointer: coarse)'),
      }));
      expect(shouldBypassViewTransition()).toBe(true);
    });

    it('retorna false (permite animação) em desktop com ponteiro fino e sem reduced-motion', () => {
      expect(shouldBypassViewTransition()).toBe(false);
    });
  });

  describe('toggleThemeWithTransition', () => {
    it('executa troca imediata quando bypass estiver ativo', async () => {
      // Força bypass (mobile)
      globalThis.window.innerWidth = 500;
      const setTheme = vi.fn();
      const applyTheme = vi.fn();

      await toggleThemeWithTransition({
        nextTheme: 'dark',
        setTheme,
        applyTheme,
      });

      expect(setTheme).toHaveBeenCalledWith('dark');
      expect(applyTheme).toHaveBeenCalledWith('dark');
      expect(globalThis.document.startViewTransition).not.toHaveBeenCalled();
      expect(mockClasses.has('fc-theme-switching')).toBe(false);
    });

    it('inicia startViewTransition e dispara animação circular ancorada no elemento de origem', async () => {
      const setTheme = vi.fn();
      const applyTheme = vi.fn();
      const originElement = {
        getBoundingClientRect: () => ({
          left: 100,
          top: 50,
          width: 40,
          height: 40,
        }),
      };

      const promise = toggleThemeWithTransition({
        nextTheme: 'light',
        originElement,
        setTheme,
        applyTheme,
      });

      expect(globalThis.document.startViewTransition).toHaveBeenCalled();
      expect(setTheme).toHaveBeenCalledWith('light');
      expect(applyTheme).toHaveBeenCalledWith('light');

      await promise;

      // Centro do botão: x = 100 + 20 = 120, y = 50 + 20 = 70
      expect(mockAnimate).toHaveBeenCalled();
      const [keyframes, options] = mockAnimate.mock.calls[0];
      expect(keyframes.clipPath[0]).toBe('circle(0px at 120px 70px)');
      expect(keyframes.clipPath[1]).toContain('at 120px 70px');
      expect(options.duration).toBe(600);
      expect(options.pseudoElement).toBe('::view-transition-new(root)');
      expect(mockClasses.has('fc-theme-switching')).toBe(false);
    });

    it('trata cancelamento quando chamada repetida ocorre antes do término da anterior', async () => {
      let resolveFinished;
      const finishedPromise = new Promise((resolve) => {
        resolveFinished = resolve;
      });

      globalThis.document.startViewTransition = vi.fn((callback) => {
        callback();
        return {
          ready: Promise.resolve(),
          finished: finishedPromise,
          skipTransition: vi.fn(),
        };
      });

      const setTheme = vi.fn();
      const applyTheme = vi.fn();

      // Dispara primeira transição
      const p1 = toggleThemeWithTransition({
        nextTheme: 'light',
        setTheme,
        applyTheme,
      });

      // Dispara segunda transição imediatamente (clique rápido)
      await toggleThemeWithTransition({
        nextTheme: 'dark',
        setTheme,
        applyTheme,
      });

      expect(setTheme).toHaveBeenLastCalledWith('dark');
      expect(applyTheme).toHaveBeenLastCalledWith('dark');

      resolveFinished();
      await p1;
    });

    it('trata fallback seguro caso document.startViewTransition dispare exceção', async () => {
      globalThis.document.startViewTransition = vi.fn(() => {
        throw new Error('Transition rejected');
      });

      const setTheme = vi.fn();
      const applyTheme = vi.fn();

      await toggleThemeWithTransition({
        nextTheme: 'light',
        setTheme,
        applyTheme,
      });

      expect(setTheme).toHaveBeenCalledWith('light');
      expect(applyTheme).toHaveBeenCalledWith('light');
      expect(mockClasses.has('fc-theme-switching')).toBe(false);
    });
  });
});
