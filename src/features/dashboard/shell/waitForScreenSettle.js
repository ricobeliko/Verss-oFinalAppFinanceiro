// src/features/dashboard/shell/waitForScreenSettle.js
/**
 * Utilitário para aguardar a estabilização completa da tela montada sob o véu.
 * Utiliza requestIdleCallback para aguardar que o scheduler do React (performWorkUntilDeadline)
 * processe todos os useEffects pendentes (ex: carregamento de dados em hooks e remoção de skeletons),
 * seguido de requestAnimationFrame para garantir que a renderização pesada ocorra enquanto
 * a tela está 100% oculta sob o véu.
 * Inclui fallback resiliente via setTimeout para ambientes sem suporte a requestIdleCallback (ex: Safari).
 * Respeita o tempo mínimo configurado em motion.pageTransition.hold e impõe timeout de segurança.
 *
 * @param {number} minHoldMs - Duração mínima de espera em ms (padrão 120ms).
 * @param {number} maxHoldMs - Timeout máximo de segurança em ms (padrão 600ms).
 * @returns {Promise<void>}
 */
export function waitForScreenSettle(minHoldMs = 120, maxHoldMs = 600) {
  return new Promise((resolve) => {
    const startTime = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    let settled = false;

    const finish = () => {
      if (settled) return;
      settled = true;
      const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
      const elapsed = now - startTime;
      if (elapsed < minHoldMs) {
        setTimeout(resolve, minHoldMs - elapsed);
      } else {
        resolve();
      }
    };

    const maxTimer = setTimeout(finish, maxHoldMs);

    // Permite que o scheduler do React drene a fila de trabalho antes de iniciar o reveal
    if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
      window.requestIdleCallback(() => {
        if (typeof requestAnimationFrame === 'function') {
          requestAnimationFrame(() => {
            clearTimeout(maxTimer);
            finish();
          });
        } else {
          clearTimeout(maxTimer);
          finish();
        }
      }, { timeout: Math.min(maxHoldMs, 250) });
    } else {
      // Fallback para Safari / navegadores sem requestIdleCallback
      setTimeout(() => {
        if (typeof requestAnimationFrame === 'function') {
          requestAnimationFrame(() => {
            clearTimeout(maxTimer);
            finish();
          });
        } else {
          clearTimeout(maxTimer);
          finish();
        }
      }, 50);
    }
  });
}
