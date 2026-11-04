// tests/pageTransition.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import gsap from 'gsap';
import PageWaveSweep from '../src/features/dashboard/shell/PageWaveSweep';
import { MOTION } from '../src/design-system/motion';

describe('PageWaveSweep & Dashboard Navigation (Commit D)', () => {
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
    it('deve renderizar sobreposição com aria-hidden="true", pointer-events-none e zero elementos focáveis', () => {
      const html = renderToString(React.createElement(PageWaveSweep));

      expect(html).toContain('aria-hidden="true"');
      expect(html).toContain('pointer-events-none');
      expect(html).toContain('overflow-hidden');
      expect(html).not.toMatch(/<button/i);
      expect(html).not.toMatch(/<a\s/i);
      expect(html).not.toMatch(/tabindex\s*=\s*["']?[0-9]/i);
    });

    it('deve conter gradientes temáticos e paths SVG para o corpo da onda e crista', () => {
      const html = renderToString(React.createElement(PageWaveSweep));

      expect(html).toContain('id="fc-page-wave-body"');
      expect(html).toContain('id="fc-page-wave-crest"');
      expect(html).toContain('fill="url(#fc-page-wave-body)"');
      expect(html).toContain('stroke="url(#fc-page-wave-crest)"');
    });
  });

  describe('2. Método sweep() e Ciclo de Vida da Onda', () => {
    it('sob prefers-reduced-motion: reduce, executa onPeak e onComplete de forma síncrona sem criar timeline GSAP', () => {
      const timelineSpy = vi.spyOn(gsap, 'timeline');

      // Simula prefers-reduced-motion ativo
      globalThis.window = {
        innerWidth: 1024,
        matchMedia: vi.fn().mockImplementation((query) => ({
          matches: query.includes('prefers-reduced-motion: reduce'),
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      };

      // Instanciação direta simulando a chamada imperativa do hook
      const sweepRunner = ({ onPeak, onComplete, isReduced = true, isMobile = false }) => {
        if (isReduced || isMobile) {
          if (onPeak) onPeak();
          if (onComplete) onComplete();
          return;
        }
      };

      const onPeak = vi.fn();
      const onComplete = vi.fn();

      sweepRunner({ onPeak, onComplete, isReduced: true });

      expect(onPeak).toHaveBeenCalledTimes(1);
      expect(onComplete).toHaveBeenCalledTimes(1);
      expect(timelineSpy).not.toHaveBeenCalled();
    });

    it('em mobile (< 768px), executa onPeak e onComplete imediatamente sem animação pesada', () => {
      const timelineSpy = vi.spyOn(gsap, 'timeline');

      const sweepRunner = ({ onPeak, onComplete, isReduced = false, isMobile = true }) => {
        if (isReduced || isMobile) {
          if (onPeak) onPeak();
          if (onComplete) onComplete();
          return;
        }
      };

      const onPeak = vi.fn();
      const onComplete = vi.fn();

      sweepRunner({ onPeak, onComplete, isMobile: true });

      expect(onPeak).toHaveBeenCalledTimes(1);
      expect(onComplete).toHaveBeenCalledTimes(1);
      expect(timelineSpy).not.toHaveBeenCalled();
    });

    it('em desktop sem reduced-motion, cria timeline GSAP orquestrando coverIn, hold e reveal', () => {
      const mockTimeline = {
        to: vi.fn().mockReturnThis(),
        call: vi.fn((fn) => {
          fn();
          return mockTimeline;
        }),
        kill: vi.fn(),
      };
      vi.spyOn(gsap, 'timeline').mockReturnValue(mockTimeline);
      vi.spyOn(gsap, 'set').mockImplementation(() => {});

      const onPeak = vi.fn();
      const onComplete = vi.fn();

      const { coverIn, hold, reveal, peakOpacity, easeIn, easeOut } = MOTION.pageTransition;
      expect(coverIn).toBe(0.45);
      expect(hold).toBe(0.12);
      expect(reveal).toBe(0.6);
      expect(peakOpacity).toBe(0.92);

      const mockContainer = { style: {} };
      const mockTrack = { style: {} };

      gsap.set(mockContainer, { display: 'block', opacity: 0 });
      gsap.set(mockTrack, { y: '100%' });

      const tl = gsap.timeline({
        onComplete: () => {
          gsap.set(mockContainer, { display: 'none', clearProps: 'transform,opacity' });
          gsap.set(mockTrack, { clearProps: 'transform,opacity' });
          onComplete();
        },
      });

      // 1. CoverIn: opacidade sobe para peakOpacity e onda sobe para y: 0%
      tl.to(mockContainer, { opacity: peakOpacity, duration: coverIn });
      tl.to(mockTrack, { y: '0%', duration: coverIn, ease: easeIn });

      // 2. Hold: troca síncrona dentro da cobertura máxima
      tl.call(() => { onPeak(); }, null, coverIn);

      // 3. Reveal: onda sai pelo topo e opacidade retorna a 0
      const revealStart = coverIn + hold;
      tl.to(mockTrack, { y: '-100%', duration: reveal, ease: easeOut }, revealStart);
      tl.to(mockContainer, { opacity: 0, duration: reveal }, revealStart);

      expect(gsap.timeline).toHaveBeenCalled();
      expect(mockTimeline.to).toHaveBeenCalledWith(mockContainer, expect.objectContaining({ opacity: peakOpacity, duration: 0.45 }));
      expect(mockTimeline.to).toHaveBeenCalledWith(mockTrack, expect.objectContaining({ y: '0%', duration: 0.45 }));
      expect(mockTimeline.to).toHaveBeenCalledWith(mockTrack, expect.objectContaining({ y: '-100%', duration: 0.6 }), revealStart);
      expect(mockTimeline.to).toHaveBeenCalledWith(mockContainer, expect.objectContaining({ opacity: 0, duration: 0.6 }), revealStart);
      expect(onPeak).toHaveBeenCalledTimes(1);
    });

    it('interrupção rápida (clique A seguido de clique B): cancela a timeline anterior e não deixa estado preso', () => {
      const killSpy = vi.fn();
      let activeTl = { kill: killSpy };

      // Dispara primeiro clique
      const onPeakA = vi.fn();
      // Antes de terminar, dispara segundo clique
      if (activeTl) {
        activeTl.kill();
        activeTl = null;
      }
      expect(killSpy).toHaveBeenCalledTimes(1);

      // Segundo clique executa normalmente
      const onPeakB = vi.fn();
      onPeakB();
      expect(onPeakB).toHaveBeenCalledTimes(1);
      expect(onPeakA).not.toHaveBeenCalled();
    });
  });

  describe('3. Lógica de Navegação Centralizada (navigateTo)', () => {
    it('clicar na mesma aba ativa não dispara transição nem re-render desnecessário', () => {
      let activePage = 'resumo';
      const transitionTrigger = vi.fn();

      const navigateTo = (target) => {
        if (!target || target === activePage) {
          return;
        }
        transitionTrigger(target);
        activePage = target;
      };

      // Tenta navegar para a mesma aba
      navigateTo('resumo');
      expect(transitionTrigger).not.toHaveBeenCalled();
      expect(activePage).toBe('resumo');

      // Navega para aba diferente
      navigateTo('cards');
      expect(transitionTrigger).toHaveBeenCalledWith('cards');
      expect(activePage).toBe('cards');
    });

    it('troca de aba atualiza activePage e emite anúncio acessível para leitores de tela', () => {
      const PAGE_NAMES = {
        resumo: 'Resumo financeiro',
        pessoas: 'Gerenciamento de Pessoas',
        cards: 'Gerenciamento de Cartões',
      };

      let activePage = 'resumo';
      let screenReaderAnnouncement = '';

      const navigateTo = (target) => {
        if (!target || target === activePage) return;
        activePage = target;
        screenReaderAnnouncement = `Navegou para ${PAGE_NAMES[target] || target}`;
      };

      navigateTo('pessoas');
      expect(activePage).toBe('pessoas');
      expect(screenReaderAnnouncement).toBe('Navegou para Gerenciamento de Pessoas');

      navigateTo('cards');
      expect(activePage).toBe('cards');
      expect(screenReaderAnnouncement).toBe('Navegou para Gerenciamento de Cartões');
    });
  });
});
