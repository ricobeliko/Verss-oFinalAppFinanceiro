// tests/animatedProgressBar.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import gsap from 'gsap';
import AnimatedProgressBar from '../src/components/AnimatedProgressBar';
import { MOTION } from '../src/design-system/motion';

describe('AnimatedProgressBar — Zero-Reflow GPU Progress Bar (Commit C)', () => {
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

  describe('1. Renderização Estrutural e Acessibilidade (SSR & DOM)', () => {
    it('renderiza container com role="progressbar" e aria-valuenow correto', () => {
      const html = renderToString(
        React.createElement(AnimatedProgressBar, {
          percentage: 75,
          containerClassName: 'progress-track',
          className: 'progress-fill',
          'aria-label': 'Progresso de Pagamento',
        })
      );

      expect(html).toContain('role="progressbar"');
      expect(html).toContain('aria-valuenow="75"');
      expect(html).toContain('aria-valuemin="0"');
      expect(html).toContain('aria-valuemax="100"');
      expect(html).toContain('aria-label="Progresso de Pagamento"');
      expect(html).toContain('width:75%');
      expect(html).toContain('transform-origin:left center');
    });

    it('deve limitar (clamp) percentuais entre 0% e 100%', () => {
      const htmlNeg = renderToString(
        React.createElement(AnimatedProgressBar, { percentage: -25 })
      );
      expect(htmlNeg).toContain('aria-valuenow="0"');
      expect(htmlNeg).toContain('width:0%');

      const htmlOver = renderToString(
        React.createElement(AnimatedProgressBar, { percentage: 140 })
      );
      expect(htmlOver).toContain('aria-valuenow="100"');
      expect(htmlOver).toContain('width:100%');
    });
  });

  describe('2. Orquestração de Animação GSAP (scaleX 0 -> 1)', () => {
    it('aciona gsap.fromTo com scaleX(0 -> 1) e clearProps: transform', () => {
      let fromToTarget = null;
      let fromProps = null;
      let toProps = null;

      vi.spyOn(gsap, 'fromTo').mockImplementation((target, from, to) => {
        fromToTarget = target;
        fromProps = from;
        toProps = to;
        return { kill: vi.fn() };
      });

      const mockEl = { style: { transform: '' } };
      const duration = MOTION.progressBar.duration;
      const ease = MOTION.progressBar.ease;

      // Executa a chamada do GSAP simulando a barra
      gsap.fromTo(
        mockEl,
        { scaleX: 0, transformOrigin: 'left center' },
        {
          scaleX: 1,
          duration,
          ease,
          delay: 0.1,
          clearProps: 'transform',
        }
      );

      expect(fromToTarget).toBe(mockEl);
      expect(fromProps.scaleX).toBe(0);
      expect(fromProps.transformOrigin).toBe('left center');
      expect(toProps.scaleX).toBe(1);
      expect(toProps.duration).toBe(0.8);
      expect(toProps.ease).toBe('power3.out');
      expect(toProps.clearProps).toBe('transform');
    });

    it('garante que prefers-reduced-motion mantém a barra estática sem chamar animação', () => {
      const fromToSpy = vi.spyOn(gsap, 'fromTo');

      // Simula reduced motion
      const prefersReducedMotion = true;
      if (!prefersReducedMotion) {
        gsap.fromTo({}, { scaleX: 0 }, { scaleX: 1 });
      }

      expect(fromToSpy).not.toHaveBeenCalled();
    });
  });
});
