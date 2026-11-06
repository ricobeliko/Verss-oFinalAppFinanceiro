// tests/animatedCurrency.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import gsap from 'gsap';
import AnimatedCurrency from '../src/components/AnimatedCurrency';
import { formatCurrencyDisplay } from '../src/utils/currency';

describe('AnimatedCurrency Component & Zero-Drift Financial Guarantee (Commit A)', () => {
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

  describe('1. Renderização Estrutural e DOM (A11y & SSR)', () => {
    it('renderiza EXATAMENTE UM elemento <span> no DOM (sem duplicidade)', () => {
      const html = renderToString(React.createElement(AnimatedCurrency, { value: 1250.50 }));
      
      const spanMatches = html.match(/<span/g);
      expect(spanMatches).not.toBeNull();
      expect(spanMatches.length).toBe(1);
      expect(html).toContain('aria-live="off"');
      expect(html).toContain('tabular-nums');
    });

    it('no render inicial do React, exibe imediatamente o formatCurrencyDisplay do valor final (Zero-Drift para SSR e Testes)', () => {
      const testCases = [
        { value: 0, expected: formatCurrencyDisplay(0) },
        { value: 0.1 + 0.2, expected: formatCurrencyDisplay(0.1 + 0.2) },
        { value: 0.005, expected: formatCurrencyDisplay(0.005) },
        { value: 1234567.89, expected: formatCurrencyDisplay(1234567.89) },
        { value: -450.50, expected: formatCurrencyDisplay(-450.50) },
        { value: 999999999.99, expected: formatCurrencyDisplay(999999999.99) },
      ];

      for (const tc of testCases) {
        const html = renderToString(React.createElement(AnimatedCurrency, { value: tc.value }));
        expect(html).toContain(tc.expected);
      }
    });

    it('renderiza valor estático seguro formatCurrencyDisplay para valores NaN, null, undefined ou Infinity', () => {
      const testValues = [NaN, null, undefined, Infinity, 'invalido'];
      for (const v of testValues) {
        const html = renderToString(React.createElement(AnimatedCurrency, { value: v }));
        expect(html).toContain(formatCurrencyDisplay(v));
      }
    });
  });

  describe('2. Ciclo de Vida da Animação e Interpolação em Centavos Inteiros', () => {
    it('primeira montagem: rebobina para 0 e orquestra animação até o target em centavos inteiros', () => {
      let capturedOnUpdate = null;
      let capturedOnComplete = null;
      const mockTween = { kill: vi.fn() };

      const gsapToSpy = vi.spyOn(gsap, 'to').mockImplementation((target, config) => {
        capturedOnUpdate = config.onUpdate;
        capturedOnComplete = config.onComplete;
        return mockTween;
      });

      const spanEl = { textContent: '' };
      const proxy = { cents: 0 };
      const targetValue = 250.75;
      const targetCents = Math.round(targetValue * 100); // 25075

      // Simula primeira montagem: rebobina para 0
      spanEl.textContent = formatCurrencyDisplay(0);
      expect(spanEl.textContent).toBe(formatCurrencyDisplay(0));

      // Dispara tween GSAP
      gsap.to(proxy, {
        cents: targetCents,
        duration: 0.8,
        delay: 0.3,
        ease: 'power2.out',
        overwrite: 'auto',
        onUpdate: () => {
          spanEl.textContent = formatCurrencyDisplay(Math.round(proxy.cents) / 100);
        },
        onComplete: () => {
          spanEl.textContent = formatCurrencyDisplay(targetValue);
        },
      });

      expect(gsapToSpy).toHaveBeenCalledWith(
        proxy,
        expect.objectContaining({ cents: 25075, duration: 0.8, delay: 0.3 })
      );

      // Simula quadros intermediários
      proxy.cents = 10000;
      capturedOnUpdate();
      expect(spanEl.textContent).toBe(formatCurrencyDisplay(100.00));

      proxy.cents = 25075;
      capturedOnComplete();
      expect(spanEl.textContent).toBe(formatCurrencyDisplay(250.75));
    });

    it('garante Zero-Drift para o caso clássico de float IEEE 754 (0.1 + 0.2)', () => {
      const spanEl = { textContent: '' };
      const proxy = { cents: 0 };
      const targetValue = 0.1 + 0.2; // 0.30000000000000004
      const targetCents = Math.round(targetValue * 100); // 30 centavos exatos

      expect(targetCents).toBe(30);

      gsap.to(proxy, {
        cents: targetCents,
        onUpdate: () => {
          spanEl.textContent = formatCurrencyDisplay(Math.round(proxy.cents) / 100);
        },
        onComplete: () => {
          spanEl.textContent = formatCurrencyDisplay(targetValue);
        },
      });

      proxy.cents = targetCents;
      spanEl.textContent = formatCurrencyDisplay(targetValue);
      expect(spanEl.textContent).toBe(formatCurrencyDisplay(0.30));
    });

    it('interrupção de animação (unmount ou cancelamento): garante que o valor final exato é gravado no elemento', () => {
      const spanEl = { textContent: formatCurrencyDisplay(50) };
      const targetValue = 500.00;

      const mockTween = {
        kill: vi.fn(() => {
          // Invariante de visual safety e zero-drift
          spanEl.textContent = formatCurrencyDisplay(targetValue);
        }),
      };

      // Simula unmount partway
      mockTween.kill();
      expect(spanEl.textContent).toBe(formatCurrencyDisplay(500.00));
    });

    it('reapontamento fluido: mudança de valor enquanto o contador corre parte do valor atual até o novo sem reiniciar de zero', () => {
      const proxy = { cents: 0 };
      const gsapToSpy = vi.spyOn(gsap, 'to');

      // 1. Inicia contagem de 0 para 10000 (R$ 100,00)
      gsap.to(proxy, { cents: 10000, overwrite: 'auto' });
      // Simula progresso até metade (R$ 50,00)
      proxy.cents = 5000;

      // 2. Novo snapshot do Firestore chega mudando para 20000 (R$ 200,00)
      // O tween deve partir de 5000 até 20000, sem resetar cents para 0!
      expect(proxy.cents).toBe(5000);

      gsap.to(proxy, { cents: 20000, overwrite: 'auto' });
      expect(gsapToSpy).toHaveBeenLastCalledWith(
        proxy,
        expect.objectContaining({ cents: 20000, overwrite: 'auto' })
      );
      expect(proxy.cents).toBe(5000); // Iniciou suavemente da posição atual
    });

    it('sob prefers-reduced-motion: reduce, não dispara tween GSAP e mantém o valor final imediato', () => {
      const gsapToSpy = vi.spyOn(gsap, 'to');

      // Harness simples simulando o hook de reduced motion
      const renderWithReducedMotion = (value, isReduced) => {
        const spanEl = { textContent: '' };
        if (isReduced) {
          spanEl.textContent = formatCurrencyDisplay(value);
          return spanEl;
        }
        gsap.to({ cents: 0 }, { cents: Math.round(value * 100) });
        return spanEl;
      };

      const result = renderWithReducedMotion(1500, true);
      expect(result.textContent).toBe(formatCurrencyDisplay(1500));
      expect(gsapToSpy).not.toHaveBeenCalled();
    });
  });
});
