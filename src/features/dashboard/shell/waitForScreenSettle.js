// src/features/dashboard/shell/waitForScreenSettle.js
/**
 * Utilitário para aguardar a estabilização completa da tela montada sob o véu.
 * 
 * Pipeline de assentamento sob o véu ("Montar sob o véu, assentar, só então animar"):
 * 1. Verifica frame a frame (rAF) se a tela recém-montada possui skeletons pendentes.
 * 2. Verifica se os containers de gráficos (Recharts ResponsiveContainer) já foram
 *    medidos pelo ResizeObserver e tiveram seus elementos SVG gerados no DOM.
 * 3. Após a estabilização completa da estrutura e dados sob o véu, executa um duplo rAF
 *    para assegurar que o GPU compositor tenha a tela 100% pronta.
 * 4. Respeita a duração mínima (minHoldMs) antes de resolver a promessa e autorizar
 *    o início do reveal, com timeout de segurança (maxHoldMs).
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

    const checkSettled = () => {
      if (settled) return;

      if (typeof document !== 'undefined') {
        // 1. Aguarda skeletons de carregamento inicial desaparecerem
        const hasSkeleton = document.querySelector('.fc-skeleton, [data-skeleton="true"]');
        if (hasSkeleton) {
          requestAnimationFrame(checkSettled);
          return;
        }

        // 2. Aguarda medição de layout e geração de SVG dos gráficos Recharts
        const chartContainers = document.querySelectorAll('.recharts-responsive-container');
        if (chartContainers.length > 0) {
          let allMeasured = true;
          chartContainers.forEach((container) => {
            if (!container.querySelector('svg')) {
              allMeasured = false;
            }
          });
          if (!allMeasured) {
            requestAnimationFrame(checkSettled);
            return;
          }
        }
      }

      // 3. Tela assentada sob o véu: duplo rAF para flush do pipeline de layout/GPU
      if (typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            clearTimeout(maxTimer);
            finish();
          });
        });
      } else {
        clearTimeout(maxTimer);
        finish();
      }
    };

    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(checkSettled);
    } else {
      setTimeout(finish, minHoldMs);
    }
  });
}
