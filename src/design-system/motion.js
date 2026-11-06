// src/design-system/motion.js
/**
 * FinControl Design System 2.0 — Motion Configuration
 * Centralized motion tokens for page transitions, stagger entrances, and timings.
 */

export const MOTION = {
  // Title entrance motion (first element to enter)
  title: {
    y: 14,
    duration: 0.5,
    ease: 'power3.out',
  },
  // Item entrance motion (cascading cards/KPIs/blocks)
  item: {
    y: 18,
    duration: 0.55,
    ease: 'power3.out',
    stagger: 0.07,
    overlap: 0.25, // Starts 0.25s after title starts
  },
  // Page exit motion
  pageExit: {
    duration: 0.14,
    ease: 'power2.in',
    y: -6,
  },
  // Item limits for staggered animations (preserves 60fps on low-end/mobile)
  limits: {
    desktop: 8,
    mobile: 5,
  },
  // Wave sweep page transition (Commit D & Ajuste Fino)
  // Para acelerar ou desacelerar a transição global de abas:
  // - Mais rápido (~0.8s total): coverIn: 0.32, hold: 0.08, reveal: 0.40
  // - Mais suave/lento (~1.5s total): coverIn: 0.55, hold: 0.15, reveal: 0.80
  // - Padrão atual (~1.17s total): coverIn: 0.45, hold: 0.12, reveal: 0.60
  pageTransition: {
    coverIn: 0.45,
    hold: 0.12,
    reveal: 0.6,
    peakOpacity: 0.92,
    easeIn: 'power2.inOut',
    easeOut: 'power2.out',
    waveStagger: 0.06,
  },
  waveSweep: {
    duration: 1.17,
    maxOpacity: 0.92,
    maxTotalDuration: 1.25,
  },
  // Skeleton shimmer duration
  shimmer: {
    duration: 1.4,
  },
  // Counter animation (Commit A)
  counter: {
    duration: 0.8,
    updateDuration: 0.5,
    ease: 'power2.out',
    initialDelay: 0.3,
  },
  // Progress bar animation (Commit C)
  progressBar: {
    duration: 0.8,
    ease: 'power3.out',
  },
  // Chart animations (Commit C)
  charts: {
    duration: 900,
    easing: 'ease-out',
    delay: 300,
  },
};
