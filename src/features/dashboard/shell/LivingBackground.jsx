// src/features/dashboard/shell/LivingBackground.jsx
import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import usePrefersReducedMotion from '../../../hooks/usePrefersReducedMotion';

/**
 * LivingBackground — Fundo vivo em camadas cinemáticas para o Shell do FinControl.
 * 
 * Camadas (de trás para frente):
 * 1. Base com gradiente e vinheta perimetral (--fc-atmos-vignette).
 * 2. Glow quente ambiente no canto superior direito (--fc-glow-warm) com micro-parallax inverso (±10px).
 * 3. Glow frio difuso (--fc-glow-cool) no topo esquerdo e na base.
 * 4. 3 SVGs periódicos de ondas suaves na parte inferior com loop sem emenda via transform: translate3d.
 * 5. Aura do cursor (360px) com tracking elástico via gsap.quickTo.
 * 
 * Regras de Motion & Acessibilidade:
 * - Totalmente aria-hidden="true" e pointer-events-none (sem foco nem anúncio em screen readers).
 * - Zero loops de requestAnimationFrame ociosos.
 * - Desativação imediata em prefers-reduced-motion: reduce, (pointer: coarse) ou largura < 768px.
 */
export default function LivingBackground() {
  const containerRef = useRef(null);
  const auraRef = useRef(null);
  const warmGlowRef = useRef(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    // Não inicializa motion interativo se prefers-reduced-motion estiver ativo
    if (prefersReducedMotion) return;
    if (typeof window === 'undefined') return;

    // Não inicializa em dispositivos touch (coarse pointer) ou telas estreitas (< 768px)
    const isCoarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    const isSmallScreen = window.innerWidth < 768;
    if (isCoarse || isSmallScreen) return;

    const ctx = gsap.context(() => {
      if (!auraRef.current || !warmGlowRef.current) return;

      const setAuraX = gsap.quickTo(auraRef.current, 'x', { duration: 0.6, ease: 'power3.out' });
      const setAuraY = gsap.quickTo(auraRef.current, 'y', { duration: 0.6, ease: 'power3.out' });
      const setAuraOpacity = gsap.quickTo(auraRef.current, 'opacity', { duration: 0.4, ease: 'power2.out' });

      const setGlowX = gsap.quickTo(warmGlowRef.current, 'x', { duration: 0.8, ease: 'power3.out' });
      const setGlowY = gsap.quickTo(warmGlowRef.current, 'y', { duration: 0.8, ease: 'power3.out' });

      const handlePointerMove = (e) => {
        setAuraX(e.clientX);
        setAuraY(e.clientY);
        setAuraOpacity(1);

        // Deslocamento de parallax inverso suave (máximo ±10px)
        const normX = (e.clientX / window.innerWidth - 0.5) * 2;
        const normY = (e.clientY / window.innerHeight - 0.5) * 2;
        setGlowX(-normX * 10);
        setGlowY(-normY * 10);
      };

      const handlePointerLeave = () => {
        setAuraOpacity(0);
        setGlowX(0);
        setGlowY(0);
      };

      window.addEventListener('pointermove', handlePointerMove, { passive: true });
      document.addEventListener('mouseleave', handlePointerLeave, { passive: true });

      return () => {
        window.removeEventListener('pointermove', handlePointerMove);
        document.removeEventListener('mouseleave', handlePointerLeave);
      };
    }, containerRef);

    return () => {
      ctx.revert();
    };
  }, [prefersReducedMotion]);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-0 pointer-events-none overflow-hidden select-none"
      aria-hidden="true"
      style={{ background: 'var(--fc-bg)' }}
      data-testid="living-background"
    >
      {/* Camada 1: Vinheta perimetral de profundidade */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle at 50% 50%, transparent 55%, var(--fc-atmos-vignette) 100%)',
        }}
      />

      {/* Camada 2: Glow quente ambiente no canto superior direito com micro-parallax */}
      <div
        ref={warmGlowRef}
        className="absolute -top-[12%] -right-[10%] w-[60vw] h-[60vw] max-w-[850px] max-h-[850px] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, var(--fc-glow-warm) 0%, transparent 68%)',
          willChange: 'transform',
        }}
      />

      {/* Camada 3: Glow frio difuso (topo esquerdo e base) */}
      <div
        className="absolute top-0 left-0 w-[50vw] h-[50vw] max-w-[700px] max-h-[700px] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle at 25% 25%, var(--fc-glow-cool) 0%, transparent 70%)',
        }}
      />
      <div
        className="absolute bottom-0 left-[15%] right-[15%] h-[35vh] max-h-[380px] pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 50% 100%, var(--fc-glow-cool) 0%, transparent 70%)',
        }}
      />

      {/* Camada 4: Ondas periódicas no rodapé com gradiente vertical e esmaecimento superior */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[38vh] min-h-[240px] max-h-[440px] pointer-events-none overflow-hidden"
        style={{
          WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, rgba(0, 0, 0, 0.4) 25%, black 60%)',
          maskImage: 'linear-gradient(to bottom, transparent 0%, rgba(0, 0, 0, 0.4) 25%, black 60%)',
        }}
      >
        {/* Onda 1: período 720 (2 ciclos em 1440, 4 ciclos em 2880), duração 70s */}
        <svg
          className="fc-wave-layer-1 absolute bottom-0 left-0 h-full w-[200%]"
          viewBox="0 0 2880 320"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="fc-wave-grad-1" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="var(--fc-wave-fill)" />
              <stop offset="100%" stopColor="transparent" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d="M 0 140 C 131 95, 229 95, 360 140 C 491 185, 589 185, 720 140 C 851 95, 949 95, 1080 140 C 1211 185, 1309 185, 1440 140 C 1571 95, 1669 95, 1800 140 C 1931 185, 2029 185, 2160 140 C 2291 95, 2389 95, 2520 140 C 2651 185, 2749 185, 2880 140 L 2880 320 L 0 320 Z"
            fill="url(#fc-wave-grad-1)"
            stroke="var(--fc-wave-1)"
            strokeWidth="1.5"
          />
        </svg>

        {/* Onda 2: período 480 (3 ciclos em 1440, 6 ciclos em 2880), duração 95s */}
        <svg
          className="fc-wave-layer-2 absolute bottom-0 left-0 h-full w-[200%]"
          viewBox="0 0 2880 320"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="fc-wave-grad-2" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="var(--fc-wave-fill)" />
              <stop offset="100%" stopColor="transparent" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d="M 0 175 C 87 140, 153 140, 240 175 C 327 210, 393 210, 480 175 C 567 140, 633 140, 720 175 C 807 210, 873 210, 960 175 C 1047 140, 1113 140, 1200 175 C 1287 210, 1353 210, 1440 175 C 1527 140, 1593 140, 1680 175 C 1767 210, 1833 210, 1920 175 C 2007 140, 2073 140, 2160 175 C 2247 210, 2313 210, 2400 175 C 2487 140, 2553 140, 2640 175 C 2727 210, 2793 210, 2880 175 L 2880 320 L 0 320 Z"
            fill="url(#fc-wave-grad-2)"
            stroke="var(--fc-wave-2)"
            strokeWidth="1.25"
          />
        </svg>

        {/* Onda 3: período 1440 (1 ciclo em 1440, 2 ciclos em 2880), duração 120s */}
        <svg
          className="fc-wave-layer-3 absolute bottom-0 left-0 h-full w-[200%]"
          viewBox="0 0 2880 320"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="fc-wave-grad-3" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="var(--fc-wave-fill)" />
              <stop offset="100%" stopColor="transparent" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d="M 0 200 C 262 145, 458 145, 720 200 C 982 255, 1178 255, 1440 200 C 1702 145, 1898 145, 2160 200 C 2422 255, 2618 255, 2880 200 L 2880 320 L 0 320 Z"
            fill="url(#fc-wave-grad-3)"
            stroke="var(--fc-wave-3)"
            strokeWidth="1.25"
          />
        </svg>
      </div>

      {/* Camada 5: Aura do cursor (360px) com tracking elástico */}
      <div
        ref={auraRef}
        className="pointer-events-none fixed top-0 left-0 w-[360px] h-[360px] -ml-[180px] -mt-[180px] rounded-full"
        style={{
          background: 'radial-gradient(circle, var(--fc-glow-cool) 0%, transparent 68%)',
          opacity: 0,
          willChange: 'transform, opacity',
        }}
      />
    </div>
  );
}
