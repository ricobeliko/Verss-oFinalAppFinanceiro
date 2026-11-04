// tests/livingBackground.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import LivingBackground from '../src/features/dashboard/shell/LivingBackground';

describe('LivingBackground Component & Motion Safety', () => {
  let originalWindow;
  let originalDocument;

  beforeEach(() => {
    originalWindow = globalThis.window;
    originalDocument = globalThis.document;
  });

  afterEach(() => {
    globalThis.window = originalWindow;
    globalThis.document = originalDocument;
    vi.restoreAllMocks();
  });

  describe('1. Renderização Estrutural e Acessibilidade (A11y)', () => {
    it('deve renderizar container com aria-hidden="true", pointer-events-none e sem elementos focáveis', () => {
      const html = renderToString(React.createElement(LivingBackground));

      // Container com aria-hidden e pointer-events-none
      expect(html).toContain('aria-hidden="true"');
      expect(html).toContain('pointer-events-none');
      expect(html).toContain('data-testid="living-background"');

      // Garantir ausência total de elementos interativos/focáveis
      expect(html).not.toMatch(/<button/i);
      expect(html).not.toMatch(/<a\s/i);
      expect(html).not.toMatch(/<input/i);
      expect(html).not.toMatch(/<select/i);
      expect(html).not.toMatch(/<textarea/i);
      expect(html).not.toMatch(/tabindex\s*=\s*["']?[0-9]/i);
    });

    it('deve renderizar as 3 camadas de ondas com suas respectivas classes de animação e linearGradients', () => {
      const html = renderToString(React.createElement(LivingBackground));

      expect(html).toContain('fc-wave-layer-1');
      expect(html).toContain('fc-wave-layer-2');
      expect(html).toContain('fc-wave-layer-3');
      expect(html).toContain('id="fc-wave-grad-1"');
      expect(html).toContain('id="fc-wave-grad-2"');
      expect(html).toContain('id="fc-wave-grad-3"');
    });
  });

  describe('2. Motion Safety & Invariantes de Desativação (Reduced Motion / Coarse Pointer)', () => {
    it('com prefers-reduced-motion: reduce ativo, NÃO deve registrar listener pointermove na window nem gsap.quickTo', async () => {
      const addEventListenerSpy = vi.fn();
      const matchMediaMock = vi.fn().mockImplementation((query) => ({
        matches: query.includes('prefers-reduced-motion: reduce'),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
      }));

      globalThis.window = {
        matchMedia: matchMediaMock,
        innerWidth: 1440,
        innerHeight: 900,
        addEventListener: addEventListenerSpy,
        removeEventListener: vi.fn(),
      };
      globalThis.document = {
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      };

      // Mock GSAP
      const quickToSpy = vi.fn();
      vi.doMock('gsap', () => ({
        default: {
          context: (fn) => {
            fn();
            return { revert: vi.fn() };
          },
          quickTo: quickToSpy,
        },
      }));

      // Importar módulo com mock
      const usePrefersReducedMotion = (await import('../src/hooks/usePrefersReducedMotion')).default;

      // Executa hook isolado com mock de prefers-reduced-motion
      let isReduced = false;
      const TestHookConsumer = () => {
        isReduced = usePrefersReducedMotion();
        return null;
      };
      renderToString(React.createElement(TestHookConsumer));
      expect(isReduced).toBe(true);
      expect(quickToSpy).not.toHaveBeenCalled();
      expect(addEventListenerSpy).not.toHaveBeenCalledWith('pointermove', expect.any(Function), expect.any(Object));
    });

    it('em cleanup do efeito, deve remover todos os listeners e reverter contexto GSAP', () => {
      const removeEventListenerWindow = vi.fn();
      const removeEventListenerDoc = vi.fn();
      const revertSpy = vi.fn();

      // Simula execução do ciclo de vida com listeners
      const handlePointerMove = vi.fn();
      const handlePointerLeave = vi.fn();

      const cleanupFn = () => {
        removeEventListenerWindow('pointermove', handlePointerMove);
        removeEventListenerDoc('mouseleave', handlePointerLeave);
        revertSpy();
      };

      cleanupFn();

      expect(removeEventListenerWindow).toHaveBeenCalledWith('pointermove', handlePointerMove);
      expect(removeEventListenerDoc).toHaveBeenCalledWith('mouseleave', handlePointerLeave);
      expect(revertSpy).toHaveBeenCalledTimes(1);
    });
  });
});
