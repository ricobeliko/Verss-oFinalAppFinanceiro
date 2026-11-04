// src/hooks/useEnterStagger.js
import { useEffect, useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import usePrefersReducedMotion from './usePrefersReducedMotion';
import { MOTION } from '../design-system/motion';

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/**
 * Hook para orquestrar animação escalonada (stagger) de entrada de telas do FinControl.
 * 
 * Regras:
 * - Roda UMA ÚNICA VEZ por montagem e somente quando `ready` for true.
 * - Anima elementos marcados com data-enter="title" (primeiro) e data-enter="item" (em sequência).
 * - Limita os itens animados a `maxItems` (padrão: 8 no desktop, 5 no mobile) para garantir 60fps.
 * - Com `prefers-reduced-motion: reduce`, o conteúdo permanece imediatamente visível sem animação.
 * - Segurança Visual: sempre remove estilos inline de `opacity` e `transform` no término (clearProps)
 *   ou em caso de erro (try/catch), garantindo que nenhum elemento fique invisível.
 * - GSAP executado dentro de `gsap.context()` com `revert()` no unmount.
 * 
 * @param {React.RefObject} scopeRef - Ref do container pai do conteúdo.
 * @param {Object} options
 * @param {boolean} [options.ready=true] - Flag que indica que o carregamento terminou e o conteúdo está pronto.
 * @param {number} [options.maxItems] - Limite de itens a animar em cascata.
 */
export default function useEnterStagger(scopeRef, { ready = true, maxItems } = {}) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const hasAnimatedRef = useRef(false);

  useIsomorphicLayoutEffect(() => {
    // Se o usuário prefere redução de movimento, não inicializa nada e mantém o conteúdo visível
    if (prefersReducedMotion) {
      return;
    }

    // Só dispara se o escopo estiver montado, ainda não animou e os dados estão prontos
    if (!scopeRef?.current || hasAnimatedRef.current || !ready) {
      return;
    }

    hasAnimatedRef.current = true;
    const scopeEl = scopeRef.current;

    const resolvedMax = typeof maxItems === 'number'
      ? maxItems
      : (typeof window !== 'undefined' && window.innerWidth < 768
          ? MOTION.limits.mobile
          : MOTION.limits.desktop);

    let ctx = null;

    try {
      const titleEl = scopeEl.querySelector('[data-enter="title"]');
      const allItems = scopeEl.querySelectorAll('[data-enter="item"]');
      const itemsToAnimate = Array.from(allItems).slice(0, resolvedMax);

      if (!titleEl && itemsToAnimate.length === 0) {
        return;
      }

      ctx = gsap.context(() => {
        // Estado inicial escondido antes do primeiro paint
        if (titleEl) {
          gsap.set(titleEl, { opacity: 0, y: MOTION.title.y });
        }
        if (itemsToAnimate.length > 0) {
          gsap.set(itemsToAnimate, { opacity: 0, y: MOTION.item.y });
        }

        const tl = gsap.timeline({
          onComplete: () => {
            // Limpeza estrita de propriedades inline ao finalizar
            if (titleEl) {
              gsap.set(titleEl, { clearProps: 'transform,opacity' });
            }
            if (itemsToAnimate.length > 0) {
              gsap.set(itemsToAnimate, { clearProps: 'transform,opacity' });
            }
          },
        });

        // 1. Título entra primeiro
        if (titleEl) {
          tl.to(titleEl, {
            opacity: 1,
            y: 0,
            duration: MOTION.title.duration,
            ease: MOTION.title.ease,
            clearProps: 'transform,opacity',
          }, 0);
        }

        // 2. Itens entram em cascata com sobreposição em relação ao título
        if (itemsToAnimate.length > 0) {
          const startTime = titleEl ? MOTION.item.overlap : 0;
          tl.to(itemsToAnimate, {
            opacity: 1,
            y: 0,
            duration: MOTION.item.duration,
            ease: MOTION.item.ease,
            stagger: MOTION.item.stagger,
            clearProps: 'transform,opacity',
          }, startTime);
        }
      }, scopeEl);
    } catch (err) {
      // Segurança visual: se ocorrer qualquer falha no GSAP, limpa estilos imediatamente
      if (scopeEl) {
        const matchingEls = scopeEl.querySelectorAll('[data-enter="title"], [data-enter="item"]');
        matchingEls.forEach((el) => {
          el.style.opacity = '';
          el.style.transform = '';
        });
      }
    }

    return () => {
      if (ctx) {
        ctx.revert();
      }
      // Garante que nenhum elemento permaneça com opacity: 0 ou transform inline no unmount
      if (scopeEl) {
        const matchingEls = scopeEl.querySelectorAll('[data-enter="title"], [data-enter="item"]');
        matchingEls.forEach((el) => {
          el.style.opacity = '';
          el.style.transform = '';
        });
      }
    };
  }, [ready, prefersReducedMotion, maxItems, scopeRef]);
}
