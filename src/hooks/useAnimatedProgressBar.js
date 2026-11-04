// src/hooks/useAnimatedProgressBar.js
import { useEffect, useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import usePrefersReducedMotion from './usePrefersReducedMotion';
import { MOTION } from '../design-system/motion';

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/**
 * Hook para animar barras de progresso no FinControl sem causar layout shift/reflow.
 * 
 * Princípios:
 * - O React calcula e define a propriedade CSS `width` final.
 * - Este hook NÃO altera `width` a 60fps; anima `scaleX(0 -> 1)` no GPU com `transform-origin: left`.
 * - Se montado sob transição de abas (fc-transitioning), aguarda 'fc:page-reveal-start'.
 * - Ao término da animação, aplica `clearProps: 'transform'` para devolver o elemento ao DOM limpo.
 * - Respeita `prefers-reduced-motion: reduce` (permanece estático em scaleX 1).
 * - Executa GSAP dentro de `gsap.context()` com `revert()` no unmount.
 * 
 * @param {React.RefObject} barRef - Ref do elemento da barra interna.
 * @param {Object} options
 * @param {boolean} [options.ready=true] - Se a animação pode iniciar.
 * @param {number} [options.duration] - Duração da animação em segundos (padrão: 0.8s).
 * @param {string} [options.ease] - Curva de aceleração GSAP (padrão: 'power3.out').
 * @param {number} [options.delay=0] - Atraso para início em segundos.
 */
export default function useAnimatedProgressBar(barRef, {
  ready = true,
  duration = MOTION.progressBar.duration,
  ease = MOTION.progressBar.ease,
  delay = 0,
} = {}) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const hasAnimatedRef = useRef(false);

  useIsomorphicLayoutEffect(() => {
    if (prefersReducedMotion || !ready || !barRef?.current) {
      return;
    }

    // Só anima a entrada inicial uma vez; mudanças subsequentes de valor usam transição CSS nativa do React
    if (hasAnimatedRef.current) {
      return;
    }

    const el = barRef.current;
    let ctx = null;
    let fallbackTimer = null;

    const startBarAnimation = () => {
      if (hasAnimatedRef.current || !barRef?.current) return;
      hasAnimatedRef.current = true;
      try {
        ctx = gsap.context(() => {
          gsap.fromTo(
            el,
            { scaleX: 0, transformOrigin: 'left center' },
            {
              scaleX: 1,
              duration,
              ease,
              delay,
              clearProps: 'transform',
            }
          );
        });
      } catch {
        // Segurança visual: se falhar o GSAP, remove qualquer transform residual
        if (el) {
          el.style.transform = '';
        }
      }
    };

    const isTransitioning = typeof document !== 'undefined' &&
      document.documentElement.classList.contains('fc-transitioning');

    let onRelease = null;

    if (isTransitioning) {
      // Oculta escala durante a subida e assentamento sob o véu
      el.style.transform = 'scaleX(0)';
      el.style.transformOrigin = 'left center';

      onRelease = () => {
        if (typeof window !== 'undefined' && onRelease) {
          window.removeEventListener('fc:page-reveal-start', onRelease);
          window.removeEventListener('fc:page-reveal-cancel', onRelease);
        }
        if (fallbackTimer) {
          clearTimeout(fallbackTimer);
          fallbackTimer = null;
        }
        startBarAnimation();
      };

      if (typeof window !== 'undefined') {
        window.addEventListener('fc:page-reveal-start', onRelease, { once: true });
        window.addEventListener('fc:page-reveal-cancel', onRelease, { once: true });
        // Timeout de resiliência: se nenhum evento disparar em 1500ms, libera a barra sozinho
        fallbackTimer = setTimeout(onRelease, 1500);
      }
    } else {
      startBarAnimation();
    }

    return () => {
      if (typeof window !== 'undefined' && onRelease) {
        window.removeEventListener('fc:page-reveal-start', onRelease);
        window.removeEventListener('fc:page-reveal-cancel', onRelease);
      }
      if (fallbackTimer) {
        clearTimeout(fallbackTimer);
        fallbackTimer = null;
      }
      if (ctx) ctx.revert();
      if (el) {
        el.style.transform = '';
      }
    };
  }, [ready, prefersReducedMotion, duration, ease, delay, barRef]);
}
