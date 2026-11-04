// src/components/AnimatedCurrency.jsx
import React, { useRef, useLayoutEffect, useEffect } from 'react';
import gsap from 'gsap';
import { formatCurrencyDisplay } from '../utils/currency';
import usePrefersReducedMotion from '../hooks/usePrefersReducedMotion';
import { MOTION } from '../design-system/motion';

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/**
 * AnimatedCurrency — Contador animado com garantia de Zero-Drift Financeiro.
 *
 * Características:
 * - Renderiza um ÚNICO elemento <span> com classe tabular-nums e aria-live="off".
 * - O texto inicial renderizado pelo React é sempre formatCurrencyDisplay(valor),
 *   assegurando que SSR, leitores de tela e asserções de teste vejam o valor correto.
 * - Na primeira montagem, rebobina visualmente para 0 antes do paint e conta até o valor.
 * - Se montado durante transição de abas (fc-transitioning), aguarda 'fc:page-reveal-start'
 *   para iniciar a contagem sincronizada com a revelação.
 * - Em mudanças posteriores, anima a partir do valor atual até o novo (reapontamento fluido).
 * - Interpola em centavos inteiros (Math.round) sem acúmulo de drift de ponto flutuante.
 * - Ao término, interrupção ou unmount, grava SEMPRE formatCurrencyDisplay(valor final exato).
 * - Sob prefers-reduced-motion ou valores não numéricos/infinitos, renderiza estático.
 *
 * @param {Object} props
 * @param {number|string} props.value - Valor numérico monetário a exibir.
 * @param {string} [props.className] - Classes CSS adicionais.
 * @param {number} [props.delay] - Atraso inicial em segundos (padrão: 0.3s na 1ª montagem).
 * @param {number} [props.duration] - Duração da animação em segundos (padrão: 0.8s na 1ª montagem, 0.5s em updates).
 */
export default function AnimatedCurrency({ value, className = '', delay, duration }) {
  const spanRef = useRef(null);
  const proxyRef = useRef({ cents: 0 });
  const isFirstMountRef = useRef(true);
  const prevValueRef = useRef(value);
  const prefersReducedMotion = usePrefersReducedMotion();

  const num = Number(value);
  const isInvalid = value === null || value === undefined || isNaN(num) || !Number.isFinite(num);
  const targetCents = isInvalid ? 0 : Math.round(num * 100);

  useIsomorphicLayoutEffect(() => {
    const spanEl = spanRef.current;
    if (!spanEl) return;

    // Caso inválido ou reduced-motion: estático imediato
    if (isInvalid || prefersReducedMotion) {
      proxyRef.current.cents = targetCents;
      spanEl.textContent = formatCurrencyDisplay(value);
      isFirstMountRef.current = false;
      prevValueRef.current = value;
      return;
    }

    const isFirst = isFirstMountRef.current;
    isFirstMountRef.current = false;

    // Se o valor não mudou após a primeira montagem, mantém valor final
    if (!isFirst && prevValueRef.current === value && proxyRef.current.cents === targetCents) {
      spanEl.textContent = formatCurrencyDisplay(value);
      return;
    }
    prevValueRef.current = value;

    // Primeira montagem: rebobina visualmente para 0 antes do paint
    if (isFirst) {
      proxyRef.current.cents = 0;
      spanEl.textContent = formatCurrencyDisplay(0);
    }

    const animDuration = isFirst
      ? (duration !== undefined ? duration : (MOTION?.counter?.duration ?? 0.8))
      : (MOTION?.counter?.updateDuration ?? 0.5);

    const animDelay = isFirst
      ? (delay !== undefined ? delay : (MOTION?.counter?.initialDelay ?? 0.3))
      : 0;

    const ease = MOTION?.counter?.ease ?? 'power2.out';

    let tween = null;
    let onRevealStart = null;
    let fallbackTimer = null;

    const startCountAnimation = () => {
      try {
        tween = gsap.to(proxyRef.current, {
          cents: targetCents,
          duration: animDuration,
          delay: animDelay,
          ease,
          overwrite: 'auto',
          onUpdate: () => {
            if (spanEl) {
              const currentCents = Math.round(proxyRef.current.cents);
              spanEl.textContent = formatCurrencyDisplay(currentCents / 100);
            }
          },
          onComplete: () => {
            if (spanEl) {
              proxyRef.current.cents = targetCents;
              // Invariante de ouro: zero drift matemático
              spanEl.textContent = formatCurrencyDisplay(value);
            }
          },
        });
      } catch (err) {
        console.error('[AnimatedCurrency] Erro na animação do contador:', err);
        if (spanEl) {
          spanEl.textContent = formatCurrencyDisplay(value);
        }
      }
    };

    const isTransitioning = typeof document !== 'undefined' &&
      document.documentElement.classList.contains('fc-transitioning');

    if (isFirst && isTransitioning) {
      onRevealStart = () => {
        if (typeof window !== 'undefined' && onRevealStart) {
          window.removeEventListener('fc:page-reveal-start', onRevealStart);
        }
        if (fallbackTimer) clearTimeout(fallbackTimer);
        startCountAnimation();
      };

      if (typeof window !== 'undefined') {
        window.addEventListener('fc:page-reveal-start', onRevealStart, { once: true });
        fallbackTimer = setTimeout(onRevealStart, 1000);
      }
    } else {
      startCountAnimation();
    }

    return () => {
      if (typeof window !== 'undefined' && onRevealStart) {
        window.removeEventListener('fc:page-reveal-start', onRevealStart);
      }
      if (fallbackTimer) {
        clearTimeout(fallbackTimer);
      }
      if (tween) {
        tween.kill();
      }
      if (spanEl) {
        // Ao desmontar ou ser interrompido, assegura o valor final exato
        spanEl.textContent = formatCurrencyDisplay(value);
      }
    };
  }, [value, targetCents, isInvalid, prefersReducedMotion, delay, duration]);

  return (
    <span
      ref={spanRef}
      className={`tabular-nums ${className}`.trim()}
      aria-live="off"
    >
      {formatCurrencyDisplay(value)}
    </span>
  );
}
