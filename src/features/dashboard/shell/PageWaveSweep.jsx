// src/features/dashboard/shell/PageWaveSweep.jsx
import React, { forwardRef, useImperativeHandle, useRef, useEffect } from 'react';
import gsap from 'gsap';
import usePrefersReducedMotion from '../../../hooks/usePrefersReducedMotion';
import { MOTION } from '../../../design-system/motion';

/**
 * PageWaveSweep — Cortina líquida em multicamadas para transição entre abas.
 * 
 * 3 Ondas SVG sobrepostas com atraso de fase (~60ms) varrem a tela de baixo para cima:
 * 1. coverIn: a opacidade sobe para peakOpacity (~0.92) e as ondas sobem (y: 100% -> 0%).
 * 2. hold: momento de cobertura total em que o callback onPeak() sincroniza o novo componente
 *    através de flushSync sem qualquer vazamento de conteúdo da aba anterior.
 * 3. reveal: as ondas saem pelo topo (y: 0% -> -100%) e a opacidade desce para 0, revelando a nova tela.
 * 
 * Regras:
 * - Sob prefers-reduced-motion ou em mobile (< 768px): transição instantânea sem animação.
 * - Visual Safety: clearProps executado ao final ou em erro; nenhum elemento preso com opacity: 0.
 * - Interrupção limpa: novos cliques matam imediatamente a animação em andamento e limpam o DOM.
 */
const PageWaveSweep = React.memo(forwardRef(function PageWaveSweep(props, ref) {
  const waveContainerRef = useRef(null);
  const track1Ref = useRef(null);
  const track2Ref = useRef(null);
  const track3Ref = useRef(null);
  const timelineRef = useRef(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  // Cleanup de timelines no unmount
  useEffect(() => {
    const container = waveContainerRef.current;
    const tracks = [track1Ref.current, track2Ref.current, track3Ref.current].filter(Boolean);
    return () => {
      if (typeof document !== 'undefined') {
        document.documentElement.classList.remove('fc-transitioning');
      }
      if (timelineRef.current) {
        timelineRef.current.kill();
        timelineRef.current = null;
      }
      if (container) {
        gsap.set(container, { display: 'none', clearProps: 'transform,opacity' });
      }
      if (tracks.length > 0) {
        gsap.set(tracks, { clearProps: 'transform,opacity,will-change' });
      }
    };
  }, []);

  useImperativeHandle(ref, () => ({
    sweep({ onPeak, onComplete } = {}) {
      const isReduced = prefersReducedMotion;
      const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

      // Caminho rápido para acessibilidade e mobile
      if (isReduced || isMobile) {
        if (typeof document !== 'undefined') {
          document.documentElement.classList.remove('fc-transitioning');
        }
        if (timelineRef.current) {
          timelineRef.current.kill();
          timelineRef.current = null;
        }
        if (waveContainerRef.current) {
          gsap.set(waveContainerRef.current, { display: 'none', clearProps: 'transform,opacity' });
        }
        if (typeof onPeak === 'function') onPeak();
        if (typeof onComplete === 'function') onComplete();
        return;
      }

      const container = waveContainerRef.current;
      const track1 = track1Ref.current;
      const track2 = track2Ref.current;
      const track3 = track3Ref.current;

      if (!container || !track1) {
        if (typeof onPeak === 'function') onPeak();
        if (typeof onComplete === 'function') onComplete();
        return;
      }

      // Interrupção: mata animação anterior imediatamente
      if (timelineRef.current) {
        timelineRef.current.kill();
        timelineRef.current = null;
      }
      if (typeof document !== 'undefined') {
        document.documentElement.classList.remove('fc-transitioning');
      }

      try {
        const {
          coverIn = 0.45,
          hold = 0.12,
          reveal = 0.6,
          peakOpacity = 0.92,
          easeIn = 'power2.inOut',
          easeOut = 'power2.out',
          waveStagger = 0.06,
        } = MOTION?.pageTransition || {};

        const tracks = [track1, track2, track3].filter(Boolean);

        if (typeof document !== 'undefined') {
          document.documentElement.classList.add('fc-transitioning');
        }

        // Estado inicial
        gsap.set(container, { display: 'block', opacity: 0 });
        gsap.set(tracks, { y: '100%', willChange: 'transform' });

        const tl = gsap.timeline({
          onComplete: () => {
            if (typeof document !== 'undefined') {
              document.documentElement.classList.remove('fc-transitioning');
            }
            gsap.set(container, { display: 'none', clearProps: 'transform,opacity' });
            gsap.set(tracks, { clearProps: 'transform,opacity,will-change' });
            timelineRef.current = null;
            if (typeof onComplete === 'function') onComplete();
          },
        });

        timelineRef.current = tl;

        // 1. CoverIn: opacidade sobe para peakOpacity e ondas sobem com stagger de profundidade
        tl.to(container, {
          opacity: peakOpacity,
          duration: coverIn,
          ease: 'power1.inOut',
        }, 0);

        tl.to(track1, {
          y: '0%',
          duration: coverIn,
          ease: easeIn,
        }, 0);

        if (track2) {
          tl.to(track2, {
            y: '0%',
            duration: coverIn,
            ease: easeIn,
          }, waveStagger);
        }

        if (track3) {
          tl.to(track3, {
            y: '0%',
            duration: coverIn,
            ease: easeIn,
          }, waveStagger * 1.5);
        }

        // 2. Hold: troca síncrona do componente sob cobertura quase total
        tl.call(() => {
          if (typeof onPeak === 'function') {
            try {
              onPeak();
            } catch (err) {
              console.error('[PageWaveSweep] Erro no callback onPeak:', err);
            }
          }
        }, null, coverIn);

        // 3. Reveal: ondas saem pelo topo e opacidade desce para 0
        const revealStart = coverIn + hold;

        tl.to(track1, {
          y: '-100%',
          duration: reveal,
          ease: easeOut,
        }, revealStart);

        if (track2) {
          tl.to(track2, {
            y: '-100%',
            duration: reveal,
            ease: easeOut,
          }, revealStart + waveStagger * 0.5);
        }

        if (track3) {
          tl.to(track3, {
            y: '-100%',
            duration: reveal,
            ease: easeOut,
          }, revealStart + waveStagger);
        }

        tl.to(container, {
          opacity: 0,
          duration: reveal,
          ease: 'power1.inOut',
        }, revealStart);

      } catch (err) {
        console.error('[PageWaveSweep] Erro ao disparar animação sweep:', err);
        if (typeof document !== 'undefined') {
          document.documentElement.classList.remove('fc-transitioning');
        }
        if (container) {
          gsap.set(container, { display: 'none', clearProps: 'transform,opacity' });
        }
        const tracks = [track1, track2, track3].filter(Boolean);
        if (tracks.length > 0) {
          gsap.set(tracks, { clearProps: 'transform,opacity,will-change' });
        }
        if (typeof onPeak === 'function') onPeak();
        if (typeof onComplete === 'function') onComplete();
      }
    },
    cancel() {
      if (typeof document !== 'undefined') {
        document.documentElement.classList.remove('fc-transitioning');
      }
      if (timelineRef.current) {
        timelineRef.current.kill();
        timelineRef.current = null;
      }
      if (waveContainerRef.current) {
        gsap.set(waveContainerRef.current, { display: 'none', clearProps: 'transform,opacity' });
      }
      const tracks = [track1Ref.current, track2Ref.current, track3Ref.current].filter(Boolean);
      if (tracks.length > 0) {
        gsap.set(tracks, { clearProps: 'transform,opacity,will-change' });
      }
    },
  }));

  return (
    <div
      ref={waveContainerRef}
      data-fc-wave-sweep="true"
      className="absolute inset-0 z-20 pointer-events-none overflow-hidden"
      aria-hidden="true"
      style={{ display: 'none' }}
    >
      {/* Camada 1: Base sólida opaca + Onda Primária (impede vazamento visual no pico) */}
      <div
        ref={track1Ref}
        className="absolute inset-0 w-full h-[115%] -top-[7%] pointer-events-none will-change-transform"
      >
        <svg
          viewBox="0 0 1440 900"
          preserveAspectRatio="none"
          className="w-full h-full drop-shadow-[0_10px_30px_var(--fc-glow-cool)]"
        >
          <defs>
            <linearGradient id="fc-page-wave-body" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--fc-surface-2)" stopOpacity="0.96" />
              <stop offset="15%" stopColor="var(--fc-surface-1)" stopOpacity="0.99" />
              <stop offset="50%" stopColor="var(--fc-bg-subtle)" stopOpacity="1.0" />
              <stop offset="100%" stopColor="var(--fc-bg)" stopOpacity="1.0" />
            </linearGradient>
            <linearGradient id="fc-page-wave-crest" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="var(--fc-glow-cool)" stopOpacity="0.1" />
              <stop offset="35%" stopColor="var(--fc-accent)" stopOpacity="0.95" />
              <stop offset="65%" stopColor="var(--fc-glow-cool)" stopOpacity="0.8" />
              <stop offset="100%" stopColor="var(--fc-glow-cool)" stopOpacity="0.1" />
            </linearGradient>
          </defs>

          {/* Corpo opaco da onda cobrindo 100% da área inferior */}
          <path
            d="M 0,90 Q 360,170 720,80 T 1440,100 L 1440,900 L 0,900 Z"
            fill="url(#fc-page-wave-body)"
          />

          {/* Crista 1 iluminada */}
          <path
            d="M 0,90 Q 360,170 720,80 T 1440,100"
            fill="none"
            stroke="url(#fc-page-wave-crest)"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
        </svg>
      </div>

      {/* Camada 2: Onda Intermediária de Profundidade (Atraso de ~60ms) */}
      <div
        ref={track2Ref}
        className="absolute inset-0 w-full h-[115%] -top-[7%] pointer-events-none will-change-transform opacity-75"
      >
        <svg
          viewBox="0 0 1440 900"
          preserveAspectRatio="none"
          className="w-full h-full"
        >
          <defs>
            <linearGradient id="fc-page-wave-depth" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--fc-accent)" stopOpacity="0.25" />
              <stop offset="40%" stopColor="var(--fc-surface-2)" stopOpacity="0.60" />
              <stop offset="100%" stopColor="var(--fc-bg)" stopOpacity="0.85" />
            </linearGradient>
          </defs>

          <path
            d="M 0,130 Q 390,50 780,140 T 1440,90 L 1440,900 L 0,900 Z"
            fill="url(#fc-page-wave-depth)"
          />
          <path
            d="M 0,130 Q 390,50 780,140 T 1440,90"
            fill="none"
            stroke="var(--fc-accent)"
            strokeWidth="2"
            strokeDasharray="6 4"
            strokeLinecap="round"
          />
        </svg>
      </div>

      {/* Camada 3: Crista de Brilho em Destaque (Atraso de ~90ms) */}
      <div
        ref={track3Ref}
        className="absolute inset-0 w-full h-[115%] -top-[7%] pointer-events-none will-change-transform"
      >
        <svg
          viewBox="0 0 1440 900"
          preserveAspectRatio="none"
          className="w-full h-full"
        >
          <path
            d="M 0,75 Q 340,150 680,65 T 1440,85"
            fill="none"
            stroke="var(--fc-glow-cool)"
            strokeWidth="2.5"
            strokeLinecap="round"
            className="drop-shadow-[0_0_12px_var(--fc-accent)]"
          />
        </svg>
      </div>
    </div>
  );
}));

export default PageWaveSweep;
