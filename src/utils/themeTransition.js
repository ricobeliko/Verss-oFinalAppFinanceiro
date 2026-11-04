// src/utils/themeTransition.js
import { flushSync } from 'react-dom';
import { applyTheme as defaultApplyTheme } from './theme';

let activeTransition = null;

/**
 * Determina se a transição de revelação circular via View Transition API deve ser ignorada.
 * Condições de bypass (troca imediata):
 * 1. Ambiente sem document/window (SSR)
 * 2. Navegador sem suporte a document.startViewTransition
 * 3. Usuário com prefers-reduced-motion: reduce
 * 4. Largura de tela < 768px (mobile)
 * 5. Dispositivo com ponteiro primário grosso (touch / coarse)
 */
export function shouldBypassViewTransition() {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return true;
  }

  // 1. startViewTransition não suportada
  if (typeof document.startViewTransition !== 'function') {
    return true;
  }

  // 2. prefers-reduced-motion
  const hasReducedMotion =
    (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) ||
    window.__FINCONTROL_TEST_REDUCED_MOTION__ === true;
  if (hasReducedMotion) {
    return true;
  }

  // 3. Mobile / viewport estreita (< 768px)
  if (typeof window.innerWidth === 'number' && window.innerWidth < 768) {
    return true;
  }

  // 4. Ponteiro grosso (touchscreen / coarse)
  if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) {
    return true;
  }

  return false;
}

/**
 * Executa a troca de tema imediata (síncrona).
 */
function executeImmediate({ nextTheme, applyTheme, setTheme }) {
  if (typeof setTheme === 'function') {
    setTheme(nextTheme);
  }
  const applyFn = typeof applyTheme === 'function' ? applyTheme : defaultApplyTheme;
  applyFn(nextTheme);
}

/**
 * Alterna o tema da aplicação com efeito de revelação circular (circular reveal)
 * ancorado no centro geométrico do elemento de origem (botão clicado ou ativado via teclado).
 * 
 * @param {Object} params
 * @param {'dark' | 'light'} params.nextTheme - O tema de destino.
 * @param {HTMLElement|null} [params.originElement] - Elemento que disparou a troca.
 * @param {Function} [params.applyTheme] - Função para aplicar classes/meta tags no DOM.
 * @param {Function} params.setTheme - Dispatcher de estado do React.
 * @returns {Promise<void>}
 */
export function toggleThemeWithTransition({
  nextTheme,
  originElement = null,
  applyTheme = defaultApplyTheme,
  setTheme,
}) {
  // Se já há uma transição em andamento (cliques repetidos/rápidos), interrompe imediatamente e troca direto
  if (activeTransition) {
    try {
      if (typeof activeTransition.skipTransition === 'function') {
        activeTransition.skipTransition();
      }
    } catch (_e) {
      // Ignora se já finalizou
    }
    activeTransition = null;
    if (typeof document !== 'undefined') {
      document.documentElement.classList.remove('fc-theme-switching');
    }
    executeImmediate({ nextTheme, applyTheme, setTheme });
    return Promise.resolve();
  }

  // Fallback para troca imediata
  if (shouldBypassViewTransition()) {
    executeImmediate({ nextTheme, applyTheme, setTheme });
    return Promise.resolve();
  }

  // Calcula o centro do círculo de revelação ancorado no elemento de origem
  let x = window.innerWidth / 2;
  let y = 0;

  if (originElement && typeof originElement.getBoundingClientRect === 'function') {
    const rect = originElement.getBoundingClientRect();
    if (rect.width > 0 || rect.height > 0 || rect.top > 0 || rect.left > 0) {
      x = rect.left + rect.width / 2;
      y = rect.top + rect.height / 2;
    }
  }

  // Raio até o canto mais distante da janela para cobertura completa
  const maxDistanceX = Math.max(x, window.innerWidth - x);
  const maxDistanceY = Math.max(y, window.innerHeight - y);
  const endRadius = Math.hypot(maxDistanceX, maxDistanceY);

  const root = document.documentElement;
  root.classList.add('fc-theme-switching');

  let transition;
  try {
    transition = document.startViewTransition(() => {
      flushSync(() => {
        if (typeof setTheme === 'function') {
          setTheme(nextTheme);
        }
      });
      const applyFn = typeof applyTheme === 'function' ? applyTheme : defaultApplyTheme;
      applyFn(nextTheme);
    });

    activeTransition = transition;
  } catch (_err) {
    // Falha ao iniciar transição: fallback seguro
    root.classList.remove('fc-theme-switching');
    executeImmediate({ nextTheme, applyTheme, setTheme });
    return Promise.resolve();
  }

  // Animação da revelação por clipPath quando o snapshot estiver pronto
  if (transition && transition.ready && typeof transition.ready.then === 'function') {
    transition.ready
      .then(() => {
        if (typeof root.animate === 'function') {
          const animation = root.animate(
            {
              clipPath: [
                `circle(0px at ${Math.round(x)}px ${Math.round(y)}px)`,
                `circle(${Math.round(endRadius)}px at ${Math.round(x)}px ${Math.round(y)}px)`,
              ],
            },
            {
              duration: 600,
              easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
              pseudoElement: '::view-transition-new(root)',
            }
          );
          return animation.finished;
        }
      })
      .catch(() => {
        // Se a transição for pulada via skipTransition ou cancelada
      });
  }

  // Limpeza garantida ao término
  if (transition && transition.finished && typeof transition.finished.finally === 'function') {
    return transition.finished.finally(() => {
      if (activeTransition === transition) {
        activeTransition = null;
      }
      root.classList.remove('fc-theme-switching');
    });
  } else {
    // Fallback caso finished não seja uma promise completa
    root.classList.remove('fc-theme-switching');
    activeTransition = null;
    return Promise.resolve();
  }
}
