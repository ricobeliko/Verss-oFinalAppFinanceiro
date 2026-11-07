// src/features/dashboard/tabPrefetch.js

/**
 * Funções de import das abas sob demanda (tab-level code splitting).
 * As mesmas funções usadas por React.lazy garantem uma única referência
 * por aba sem duplicar downloads de chunks.
 */
export const TAB_LOADERS = {
  pessoas: () => import('../clients/ClientManagement'),
  cards: () => import('../cards/CardManagement'),
  transactions: () => import('../transactions/TransactionManagement'),
  subscriptions: () => import('../subscriptions/SubscriptionManagement'),
};

const modulePromises = new Map();

/**
 * Carrega ou recupera a promise do módulo da aba, garantindo
 * que apenas uma chamada de import() seja executada por aba
 * e que a resolução seja reutilizada de forma síncrona/memoizada.
 * 
 * @param {string} tabKey
 * @returns {Promise<any>}
 */
export function loadTabModule(tabKey) {
  if (!tabKey || !TAB_LOADERS[tabKey]) {
    return Promise.resolve();
  }
  if (!modulePromises.has(tabKey)) {
    const promise = TAB_LOADERS[tabKey]().catch((err) => {
      modulePromises.delete(tabKey); // Permite retry em caso de erro transitório de rede
      throw err;
    });
    modulePromises.set(tabKey, promise);
  }
  return modulePromises.get(tabKey);
}

/**
 * Dispara o download antecipado do chunk de uma aba.
 * @param {string} tabKey
 */
export function prefetchTab(tabKey) {
  if (tabKey && TAB_LOADERS[tabKey]) {
    loadTabModule(tabKey).catch(() => {});
  }
}

/**
 * Dispara o download em background de todas as abas secundárias,
 * escalonando as requisições em intervalos de idle para não competir
 * com o render e a interatividade da tela inicial.
 */
export function prefetchAllTabs() {
  const keys = Object.keys(TAB_LOADERS);
  keys.forEach((key, index) => {
    const delay = index * 300;
    if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
      window.requestIdleCallback(() => prefetchTab(key), { timeout: 2000 + delay });
    } else {
      setTimeout(() => prefetchTab(key), 1000 + delay);
    }
  });
}
