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
  // Wave sweep page transition (Commit D)
  waveSweep: {
    duration: 0.6,
    maxOpacity: 0.35,
    maxTotalDuration: 0.65, // Max total perceived transition <= 650ms
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
