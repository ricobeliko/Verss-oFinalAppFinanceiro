// src/features/dashboard/shell/PageWaveSweep.jsx
import React, { forwardRef, useImperativeHandle, useRef, useEffect } from 'react';
import gsap from 'gsap';
import usePrefersReducedMotion from '../../../hooks/usePrefersReducedMotion';
import { MOTION } from '../../../design-system/motion';
import { waitForScreenSettle } from './waitForScreenSettle';

function dispatchRevealEvent(eventName) {
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(new CustomEvent(eventName));
    } catch (_err) {
      // Ignora falha de despacho em ambientes restritos
    }
  }
}

/**
 * PageWaveSweep — Cortina líquida em multicamadas para transição entre abas.
 * 
 * Pipeline "Montar sob o véu, assentar, só então animar":
 * 1. CoverIn: a cortina de ondas sobe até cobrir a tela (opacity: 0 -> peakOpacity 0.92, y: 100% -> 0%).
 *    Roda prioritariamente via Web Animations API (WAAPI) no compositor de GPU.
 * 2. Antes do Pico: aguarda o coverIn E a resolução do módulo lazy da nova aba em paralelo.
 * 3. No Pico: flushSync da nova tela sob o véu de 92% de opacidade (sem Suspense fallback durante reveal).
 * 4. Assentar (Hold): aguarda dois frames (rAF duplo) e layout inicial estabilizado sob o véu.
 * 5. Início do Reveal: dispara o evento 'fc:page-reveal-start' para liberar useEnterStagger e contadores.
 * 6. Reveal: a cortina sai pelo topo da tela (y: 0% -> -100%, opacity: 0.92 -> 0) de forma fluida.
 * 7. Fim Barato: o cleanup final (.fc-transitioning, display: none) roda um frame depois do término,
 *    evitando gargalos no último frame da animação.
 */
const PageWaveSweep = React.memo(forwardRef(function PageWaveSweep(props, ref) {
  const waveContainerRef = useRef(null);
  const track1Ref = useRef(null);
  const track2Ref = useRef(null);
  const track3Ref = useRef(null);
  const activeAnimationsRef = useRef([]);
  const timelineRef = useRef(null);
  const isTransitioningRef = useRef(false);
  const prefersReducedMotion = usePrefersReducedMotion();

  const cancelActiveAnimations = () => {
    const wasTransitioning = isTransitioningRef.current;
    isTransitioningRef.current = false;
    if (activeAnimationsRef.current.length > 0) {
      activeAnimationsRef.current.forEach((anim) => {
        try {
          anim.cancel();
        } catch (_err) {
          // Ignora cancelamento de animação já finalizada
        }
      });
      activeAnimationsRef.current = [];
    }
    if (timelineRef.current) {
      try {
        timelineRef.current.kill();
      } catch (_err) {
        // Ignora cancelamento de timeline já finalizada
      }
      timelineRef.current = null;
    }
    if (typeof document !== 'undefined') {
      document.documentElement.classList.remove('fc-transitioning');
    }
    if (waveContainerRef.current) {
      waveContainerRef.current.style.display = 'none';
      waveContainerRef.current.style.opacity = '';
    }
    const tracks = [track1Ref.current, track2Ref.current, track3Ref.current].filter(Boolean);
    tracks.forEach((t) => {
      t.style.transform = '';
      t.style.willChange = '';
    });
    if (wasTransitioning) {
      dispatchRevealEvent('fc:page-reveal-cancel');
    }
  };

  // Cleanup de animações no unmount
  useEffect(() => {
    return () => {
      cancelActiveAnimations();
      dispatchRevealEvent('fc:page-reveal-cancel');
    };
  }, []);

  useImperativeHandle(ref, () => ({
    async sweep({ waitFor, onPeak, onComplete } = {}) {
      const isReduced = prefersReducedMotion;
      const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

      // Caminho rápido para acessibilidade e mobile (troca imediata sem travar)
      if (isReduced || isMobile) {
        cancelActiveAnimations();
        dispatchRevealEvent('fc:page-reveal-start');
        if (typeof onPeak === 'function') {
          try { onPeak(); } catch (e) { console.error(e); }
        }
        if (typeof onComplete === 'function') {
          try { onComplete(); } catch (e) { console.error(e); }
        }
        return;
      }

      const container = waveContainerRef.current;
      const track1 = track1Ref.current;
      const track2 = track2Ref.current;
      const track3 = track3Ref.current;

      if (!container || !track1) {
        dispatchRevealEvent('fc:page-reveal-start');
        if (typeof onPeak === 'function') {
          try { onPeak(); } catch (e) { console.error(e); }
        }
        if (typeof onComplete === 'function') {
          try { onComplete(); } catch (e) { console.error(e); }
        }
        return;
      }

      // Interrupção limpa de qualquer transição anterior em andamento
      cancelActiveAnimations();
      isTransitioningRef.current = true;

      const {
        coverIn = 0.45,
        hold = 0.12,
        reveal = 0.6,
        peakOpacity = 0.92,
        waveStagger = 0.06,
      } = MOTION?.pageTransition || {};

      const tracks = [track1, track2, track3].filter(Boolean);

      if (typeof document !== 'undefined') {
        document.documentElement.classList.add('fc-transitioning');
      }

      // Estado inicial antes da subida
      container.style.display = 'block';
      container.style.opacity = '0';
      tracks.forEach((t) => {
        t.style.transform = 'translateY(100%)';
        t.style.willChange = 'transform';
      });

      const hasWAAPI = typeof Element !== 'undefined' &&
        typeof Element.prototype.animate === 'function' &&
        typeof track1.animate === 'function';

      if (hasWAAPI) {
        try {
          // =========================================================================
          // FASE 1: COVER-IN (Web Animations API - GPU Composited)
          // =========================================================================
          const animContainerCover = container.animate(
            [{ opacity: 0 }, { opacity: peakOpacity }],
            { duration: coverIn * 1000, fill: 'both', easing: 'ease-in-out' }
          );

          const animTrack1Cover = track1.animate(
            [{ transform: 'translateY(100%)' }, { transform: 'translateY(0%)' }],
            { duration: coverIn * 1000, fill: 'both', easing: 'cubic-bezier(0.45, 0, 0.55, 1)' }
          );

          const animTrack2Cover = track2 ? track2.animate(
            [{ transform: 'translateY(100%)' }, { transform: 'translateY(0%)' }],
            { duration: coverIn * 1000, delay: waveStagger * 1000, fill: 'both', easing: 'cubic-bezier(0.45, 0, 0.55, 1)' }
          ) : null;

          const animTrack3Cover = track3 ? track3.animate(
            [{ transform: 'translateY(100%)' }, { transform: 'translateY(0%)' }],
            { duration: coverIn * 1000, delay: waveStagger * 1500, fill: 'both', easing: 'cubic-bezier(0.45, 0, 0.55, 1)' }
          ) : null;

          activeAnimationsRef.current = [animContainerCover, animTrack1Cover, animTrack2Cover, animTrack3Cover].filter(Boolean);

          // Aguarda o término da subida do véu E o carregamento do módulo da aba em paralelo
          const moduleWait = waitFor ? Promise.resolve(waitFor).catch(() => {}) : Promise.resolve();
          await Promise.all([
            animTrack1Cover.finished,
            animContainerCover.finished,
            moduleWait,
          ]);

          if (!isTransitioningRef.current) return;

          // =========================================================================
          // FASE 2: NO PICO (Hold & Sincronização Síncrona da Nova Tela)
          // =========================================================================
          container.style.opacity = String(peakOpacity);
          tracks.forEach((t) => {
            t.style.transform = 'translateY(0%)';
          });

          if (typeof onPeak === 'function') {
            try {
              onPeak();
            } catch (peakErr) {
              console.error('[PageWaveSweep] Erro capturado em onPeak:', peakErr);
              cancelActiveAnimations();
              dispatchRevealEvent('fc:page-reveal-cancel');
              if (typeof onComplete === 'function') {
                try { onComplete(); } catch (_err) { /* noop */ }
              }
              return;
            }
          }

          // =========================================================================
          // FASE 3: ASSENTAR SOB O VÉU (Aguardar Estabilização e Layout)
          // =========================================================================
          await waitForScreenSettle(hold * 1000, 600);
          if (!isTransitioningRef.current) return;

          // Dispara evento global autorizando a inicialização das animações de entrada
          dispatchRevealEvent('fc:page-reveal-start');

          // =========================================================================
          // FASE 4: REVEAL (Descida do Véu e Saída Suave)
          // =========================================================================
          const animContainerReveal = container.animate(
            [{ opacity: peakOpacity }, { opacity: 0 }],
            { duration: reveal * 1000, fill: 'both', easing: 'ease-in-out' }
          );

          const animTrack1Reveal = track1.animate(
            [{ transform: 'translateY(0%)' }, { transform: 'translateY(-100%)' }],
            { duration: reveal * 1000, fill: 'both', easing: 'cubic-bezier(0, 0, 0.2, 1)' }
          );

          const animTrack2Reveal = track2 ? track2.animate(
            [{ transform: 'translateY(0%)' }, { transform: 'translateY(-100%)' }],
            { duration: reveal * 1000, delay: waveStagger * 500, fill: 'both', easing: 'cubic-bezier(0, 0, 0.2, 1)' }
          ) : null;

          const animTrack3Reveal = track3 ? track3.animate(
            [{ transform: 'translateY(0%)' }, { transform: 'translateY(-100%)' }],
            { duration: reveal * 1000, delay: waveStagger * 1000, fill: 'both', easing: 'cubic-bezier(0, 0, 0.2, 1)' }
          ) : null;

          activeAnimationsRef.current = [animContainerReveal, animTrack1Reveal, animTrack2Reveal, animTrack3Reveal].filter(Boolean);

          await Promise.all([
            animTrack1Reveal.finished,
            animContainerReveal.finished,
          ]);

          if (!isTransitioningRef.current) return;

          // =========================================================================
          // FASE 5: FIM BARATO (Execução 1 frame depois para liberar GPU)
          // =========================================================================
          if (typeof requestAnimationFrame === 'function') {
            requestAnimationFrame(() => {
              if (typeof document !== 'undefined') {
                document.documentElement.classList.remove('fc-transitioning');
              }
              tracks.forEach((t) => {
                t.style.willChange = '';
              });
              isTransitioningRef.current = false;
              activeAnimationsRef.current = [];
              if (typeof onComplete === 'function') onComplete();

              // Ocultação da camada grande postergada para não competir com o frame de chegada
              if (container) {
                container.style.opacity = '0';
              }
              setTimeout(() => {
                if (container && !isTransitioningRef.current) {
                  container.style.display = 'none';
                  container.style.opacity = '';
                }
                tracks.forEach((t) => {
                  t.style.transform = '';
                });
              }, 100);
            });
          } else {
            if (typeof document !== 'undefined') {
              document.documentElement.classList.remove('fc-transitioning');
            }
            if (container) {
              container.style.display = 'none';
              container.style.opacity = '';
            }
            tracks.forEach((t) => {
              t.style.transform = '';
              t.style.willChange = '';
            });
            isTransitioningRef.current = false;
            activeAnimationsRef.current = [];
            if (typeof onComplete === 'function') onComplete();
          }

        } catch (err) {
          console.warn('[PageWaveSweep] WAAPI transição abortada ou com erro:', err);
          cancelActiveAnimations();
          dispatchRevealEvent('fc:page-reveal-cancel');
          if (typeof onPeak === 'function') {
            try { onPeak(); } catch (_err) { /* noop */ }
          }
          if (typeof onComplete === 'function') {
            try { onComplete(); } catch (_err) { /* noop */ }
          }
        }

      } else {
        // Fallback robusto para GSAP caso WAAPI não esteja disponível no ambiente
        try {
          gsap.set(container, { display: 'block', opacity: 0 });
          gsap.set(tracks, { y: '100%', willChange: 'transform' });

          const tl = gsap.timeline({
            onComplete: () => {
              if (typeof requestAnimationFrame === 'function') {
                requestAnimationFrame(() => {
                  if (typeof document !== 'undefined') {
                    document.documentElement.classList.remove('fc-transitioning');
                  }
                  gsap.set(container, { display: 'none', clearProps: 'transform,opacity' });
                  gsap.set(tracks, { clearProps: 'transform,opacity,will-change' });
                  timelineRef.current = null;
                  isTransitioningRef.current = false;
                  if (typeof onComplete === 'function') onComplete();
                });
              } else {
                if (typeof document !== 'undefined') {
                  document.documentElement.classList.remove('fc-transitioning');
                }
                gsap.set(container, { display: 'none', clearProps: 'transform,opacity' });
                gsap.set(tracks, { clearProps: 'transform,opacity,will-change' });
                timelineRef.current = null;
                isTransitioningRef.current = false;
                if (typeof onComplete === 'function') onComplete();
              }
            },
          });

          timelineRef.current = tl;

          tl.to(container, {
            opacity: peakOpacity,
            duration: coverIn,
            ease: 'power1.inOut',
          }, 0);

          tl.to(track1, {
            y: '0%',
            duration: coverIn,
            ease: 'power2.inOut',
          }, 0);

          if (track2) {
            tl.to(track2, {
              y: '0%',
              duration: coverIn,
              ease: 'power2.inOut',
            }, waveStagger);
          }

          if (track3) {
            tl.to(track3, {
              y: '0%',
              duration: coverIn,
              ease: 'power2.inOut',
            }, waveStagger * 1.5);
          }

          tl.call(() => {
            if (typeof onPeak === 'function') {
              try { onPeak(); } catch (e) { console.error('[PageWaveSweep] Erro em onPeak (GSAP):', e); }
            }
            dispatchRevealEvent('fc:page-reveal-start');
          }, null, coverIn);

          const revealStart = coverIn + hold;

          tl.to(track1, {
            y: '-100%',
            duration: reveal,
            ease: 'power2.out',
          }, revealStart);

          if (track2) {
            tl.to(track2, {
              y: '-100%',
              duration: reveal,
              ease: 'power2.out',
            }, revealStart + waveStagger * 0.5);
          }

          if (track3) {
            tl.to(track3, {
              y: '-100%',
              duration: reveal,
              ease: 'power2.out',
            }, revealStart + waveStagger);
          }

          tl.to(container, {
            opacity: 0,
            duration: reveal,
            ease: 'power1.inOut',
          }, revealStart);

        } catch (err) {
          console.error('[PageWaveSweep] Erro GSAP sweep fallback:', err);
          cancelActiveAnimations();
          dispatchRevealEvent('fc:page-reveal-cancel');
          if (typeof onPeak === 'function') {
            try { onPeak(); } catch (_err) { /* noop */ }
          }
          if (typeof onComplete === 'function') {
            try { onComplete(); } catch (_err) { /* noop */ }
          }
        }
      }
    },
    cancel() {
      cancelActiveAnimations();
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
      {/* Camada 1: Base sólida do tema + Onda Primária (impede vazamento visual no pico) */}
      <div
        ref={track1Ref}
        className="absolute inset-0 w-full h-[115%] -top-[7%] pointer-events-none will-change-transform"
      >
        <svg
          viewBox="0 0 1440 900"
          preserveAspectRatio="none"
          className="w-full h-full"
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

          {/* Corpo da onda preenchido com tokens dinâmicos do tema */}
          <path
            d="M 0,90 Q 360,170 720,80 T 1440,100 L 1440,900 L 0,900 Z"
            fill="url(#fc-page-wave-body)"
          />

          {/* Crista 1 iluminada com gradiente do tema */}
          <path
            d="M 0,90 Q 360,170 720,80 T 1440,100"
            fill="none"
            stroke="url(#fc-page-wave-crest)"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
        </svg>
      </div>

      {/* Camada 2: Onda Intermediária de Profundidade */}
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

      {/* Camada 3: Crista de Brilho em Destaque */}
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
            className="opacity-90"
          />
        </svg>
      </div>
    </div>
  );
}));

export default PageWaveSweep;
