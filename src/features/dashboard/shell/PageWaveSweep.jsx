// src/features/dashboard/shell/PageWaveSweep.jsx
import React, { forwardRef, useImperativeHandle, useRef, useEffect } from 'react';
import gsap from 'gsap';
import usePrefersReducedMotion from '../../../hooks/usePrefersReducedMotion';
import { MOTION } from '../../../design-system/motion';

/**
 * PageWaveSweep — Cortina líquida translúcida para transição entre abas.
 * 
 * Uma onda horizontal varre a tela de baixo para cima (y: 100% -> 0% -> -100%),
 * realizando a troca do conteúdo no pico (y = 0%) sob cobertura suave.
 * 
 * Regras:
 * - Sob prefers-reduced-motion ou em mobile (< 768px): transição instantânea sem animação.
 * - Visual Safety: clearProps executado ao final ou em erro; nenhum elemento preso com opacity: 0.
 * - Interrupção limpa: novos cliques matam imediatamente a animação em andamento.
 */
const PageWaveSweep = forwardRef(function PageWaveSweep(props, ref) {
  const waveContainerRef = useRef(null);
  const waveTrackRef = useRef(null);
  const timelineRef = useRef(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  // Cleanup de timelines no unmount
  useEffect(() => {
    const waveTrackEl = waveTrackRef.current;
    return () => {
      if (timelineRef.current) {
        timelineRef.current.kill();
        timelineRef.current = null;
      }
      if (waveTrackEl) {
        gsap.set(waveTrackEl, { display: 'none', clearProps: 'transform,opacity' });
      }
    };
  }, []);

  useImperativeHandle(ref, () => ({
    sweep({ onPeak, onComplete } = {}) {
      const isReduced = prefersReducedMotion;
      const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

      // Caminho rápido para acessibilidade e mobile
      if (isReduced || isMobile) {
        if (timelineRef.current) {
          timelineRef.current.kill();
          timelineRef.current = null;
        }
        if (waveTrackRef.current) {
          gsap.set(waveTrackRef.current, { display: 'none', clearProps: 'transform,opacity' });
        }
        if (typeof onPeak === 'function') onPeak();
        if (typeof onComplete === 'function') onComplete();
        return;
      }

      const waveTrack = waveTrackRef.current;
      if (!waveTrack) {
        if (typeof onPeak === 'function') onPeak();
        if (typeof onComplete === 'function') onComplete();
        return;
      }

      // Interrupção: mata animação anterior imediatamente
      if (timelineRef.current) {
        timelineRef.current.kill();
        timelineRef.current = null;
      }

      try {
        // Inicializa estado da onda
        gsap.set(waveTrack, { display: 'block', y: '100%', opacity: 1 });

        const duration = MOTION?.waveSweep?.duration || 0.6;
        const peakDuration = duration * 0.45;
        const exitDuration = duration * 0.55;

        const tl = gsap.timeline({
          onComplete: () => {
            gsap.set(waveTrack, { display: 'none', clearProps: 'transform,opacity' });
            timelineRef.current = null;
            if (typeof onComplete === 'function') onComplete();
          },
        });

        timelineRef.current = tl;

        // 1. Sobe cobrindo a tela (y: 100% -> 0%)
        tl.to(waveTrack, {
          y: '0%',
          duration: peakDuration,
          ease: 'power2.inOut',
        });

        // 2. Chama onPeak no topo da onda
        tl.call(() => {
          if (typeof onPeak === 'function') {
            try {
              onPeak();
            } catch (err) {
              console.error('[PageWaveSweep] Erro no callback onPeak:', err);
            }
          }
        });

        // 3. Sai pelo topo da tela (y: 0% -> -100%)
        tl.to(waveTrack, {
          y: '-100%',
          duration: exitDuration,
          ease: 'power2.out',
        });
      } catch (err) {
        console.error('[PageWaveSweep] Erro ao disparar animação sweep:', err);
        if (waveTrack) {
          gsap.set(waveTrack, { display: 'none', clearProps: 'transform,opacity' });
        }
        if (typeof onPeak === 'function') onPeak();
        if (typeof onComplete === 'function') onComplete();
      }
    },
    cancel() {
      if (timelineRef.current) {
        timelineRef.current.kill();
        timelineRef.current = null;
      }
      if (waveTrackRef.current) {
        gsap.set(waveTrackRef.current, { display: 'none', clearProps: 'transform,opacity' });
      }
    },
  }));

  return (
    <div
      ref={waveContainerRef}
      className="absolute inset-0 z-20 pointer-events-none overflow-hidden"
      aria-hidden="true"
    >
      <div
        ref={waveTrackRef}
        className="absolute inset-0 w-full h-[115%] -top-[7%] pointer-events-none will-change-transform"
        style={{ display: 'none' }}
      >
        <svg
          viewBox="0 0 1440 900"
          preserveAspectRatio="none"
          className="w-full h-full drop-shadow-[0_10px_25px_var(--fc-glow-cool)]"
        >
          <defs>
            <linearGradient id="fc-page-wave-body" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--fc-glow-cool)" stopOpacity="0.45" />
              <stop offset="12%" stopColor="var(--fc-accent)" stopOpacity="0.32" />
              <stop offset="45%" stopColor="var(--fc-surface-1)" stopOpacity="0.85" />
              <stop offset="100%" stopColor="var(--fc-bg)" stopOpacity="0.95" />
            </linearGradient>
            <linearGradient id="fc-page-wave-crest" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="var(--fc-glow-cool)" stopOpacity="0.1" />
              <stop offset="40%" stopColor="var(--fc-accent)" stopOpacity="0.9" />
              <stop offset="70%" stopColor="var(--fc-glow-cool)" stopOpacity="0.75" />
              <stop offset="100%" stopColor="var(--fc-glow-cool)" stopOpacity="0.1" />
            </linearGradient>
          </defs>

          {/* Corpo da onda cobrindo a área até a base */}
          <path
            d="M 0,90 Q 360,160 720,80 T 1440,100 L 1440,900 L 0,900 Z"
            fill="url(#fc-page-wave-body)"
          />

          {/* Crista iluminada da onda */}
          <path
            d="M 0,90 Q 360,160 720,80 T 1440,100"
            fill="none"
            stroke="url(#fc-page-wave-crest)"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
        </svg>
      </div>
    </div>
  );
});

export default PageWaveSweep;
