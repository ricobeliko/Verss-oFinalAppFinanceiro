// src/hooks/usePrefersReducedMotion.js
import { useState, useEffect } from 'react';

/**
 * Hook reativo para detectar a preferência do sistema por redução de movimento.
 * 
 * @returns {boolean} true se o usuário prefere redução de movimento, false caso contrário.
 */
export default function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) {
      return false;
    }
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) {
      return;
    }

    const mediaQueryList = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updatePreference = (event) => {
      setPrefersReducedMotion(event.matches);
    };

    // Moderno addEventListener com fallback para addListener
    if (mediaQueryList.addEventListener) {
      mediaQueryList.addEventListener('change', updatePreference);
    } else if (mediaQueryList.addListener) {
      mediaQueryList.addListener(updatePreference);
    }

    return () => {
      if (mediaQueryList.removeEventListener) {
        mediaQueryList.removeEventListener('change', updatePreference);
      } else if (mediaQueryList.removeListener) {
        mediaQueryList.removeListener(updatePreference);
      }
    };
  }, []);

  return prefersReducedMotion;
}
