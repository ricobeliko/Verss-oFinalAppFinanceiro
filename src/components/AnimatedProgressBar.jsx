// src/components/AnimatedProgressBar.jsx
import React, { useRef } from 'react';
import useAnimatedProgressBar from '../hooks/useAnimatedProgressBar';
import { MOTION } from '../design-system/motion';

/**
 * Componente de barra de progresso animada via GPU (scaleX 0 -> 1 com transform-origin: left).
 * Previne reflow e layout shifts, respeita prefers-reduced-motion e limpa estilos inline no término.
 */
export default function AnimatedProgressBar({
  percentage = 0,
  className = '',
  containerClassName = '',
  duration = MOTION.progressBar.duration,
  ease = MOTION.progressBar.ease,
  delay = 0,
  ready = true,
  'aria-label': ariaLabel,
  ...props
}) {
  const barRef = useRef(null);
  useAnimatedProgressBar(barRef, { ready, duration, ease, delay });

  const clampedPercentage = Math.max(0, Math.min(100, Number(percentage) || 0));

  return (
    <div
      className={containerClassName}
      role="progressbar"
      aria-valuenow={Math.round(clampedPercentage)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={ariaLabel}
      {...props}
    >
      <div
        ref={barRef}
        className={className}
        style={{
          width: `${clampedPercentage}%`,
          transformOrigin: 'left center',
        }}
      />
    </div>
  );
}
