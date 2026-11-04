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
  crisis: () => import('../crisis/CrisisMode'),
};

const prefetchedTabs = new Set();

/**
 * Dispara o download antecipado do chunk de uma aba.
 * @param {string} tabKey
 */
export function prefetchTab(tabKey) {
  if (tabKey && TAB_LOADERS[tabKey] && !prefetchedTabs.has(tabKey)) {
    prefetchedTabs.add(tabKey);
    try {
      TAB_LOADERS[tabKey]();
    } catch (_err) {
      // Falha silenciosa de prefetch não afeta o fluxo normal
    }
  }
}

/**
 * Dispara o download em background de todas as abas secundárias.
 */
export function prefetchAllTabs() {
  Object.keys(TAB_LOADERS).forEach((key) => {
    prefetchTab(key);
  });
}
