// tests/tabLoadingStates.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';

// MockAppContext
vi.mock('../src/context/AppContext', () => ({
  useAppContext: () => ({
    userId: 'test-user-123',
    db: {},
    isAuthReady: true,
    isPro: true,
    isTrialActive: false,
    getUserCollectionPathSegments: () => ['users'],
    showToast: vi.fn(),
    handleUpgradeClick: vi.fn(),
    activateFreeTrial: vi.fn(),
  }),
}));

// We selectively mock hooks for testing loading vs empty states
let mockClientsHook = { clients: [], loading: false, isLoading: false };
let mockCardsHook = { cards: [], loading: false, isLoading: false };
let mockLoansHook = { loans: [], loading: false, isLoading: false };
let mockExpensesHook = { expenses: [], loading: false, isLoading: false };
let mockSubsHook = { subscriptions: [], loading: false, isLoading: false };
let mockPaidSubsHook = { paidSubscriptions: [], loading: false, isLoading: false };

vi.mock('../src/hooks/useClients', () => ({
  useClients: () => mockClientsHook,
}));

vi.mock('../src/hooks/useCards', () => ({
  useCards: () => mockCardsHook,
}));

vi.mock('../src/hooks/useLoans', () => ({
  useLoans: () => mockLoansHook,
}));

vi.mock('../src/hooks/useExpenses', () => ({
  useExpenses: () => mockExpensesHook,
}));

vi.mock('../src/hooks/useSubscriptions', () => ({
  useSubscriptions: () => mockSubsHook,
}));

vi.mock('../src/hooks/usePaidSubscriptions', () => ({
  usePaidSubscriptions: () => mockPaidSubsHook,
}));

import ClientManagement from '../src/features/clients/ClientManagement';
import CardManagement from '../src/features/cards/CardManagement';
import SubscriptionManagement from '../src/features/subscriptions/SubscriptionManagement';
import CrisisMode from '../src/features/crisis/CrisisMode';

describe('Tab Loading States & True Empty States (Commit B)', () => {
  beforeEach(() => {
    mockClientsHook = { clients: [], loading: false, isLoading: false };
    mockCardsHook = { cards: [], loading: false, isLoading: false };
    mockLoansHook = { loans: [], loading: false, isLoading: false };
    mockExpensesHook = { expenses: [], loading: false, isLoading: false };
    mockSubsHook = { subscriptions: [], loading: false, isLoading: false };
    mockPaidSubsHook = { paidSubscriptions: [], loading: false, isLoading: false };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('1. Pessoas (ClientManagement)', () => {
    it('quando isLoading=true, deve renderizar SkeletonPage com role="status" e aria-busy="true"', () => {
      mockClientsHook = { clients: [], loading: true, isLoading: true };

      const html = renderToString(React.createElement(ClientManagement));
      expect(html).toContain('role="status"');
      expect(html).toContain('aria-busy="true"');
      expect(html).toContain('Carregando…');
      expect(html).not.toContain('Nenhuma pessoa cadastrada ainda');
    });

    it('quando isLoading=false e lista vazia, deve renderizar o empty state verdadeiro', () => {
      mockClientsHook = { clients: [], loading: false, isLoading: false };

      const html = renderToString(React.createElement(ClientManagement));
      expect(html).toContain('Nenhuma pessoa cadastrada ainda');
      expect(html).toContain('aria-busy="false"');
    });
  });

  describe('2. Cartões (CardManagement)', () => {
    it('quando isLoading=true, deve renderizar SkeletonPage', () => {
      mockCardsHook = { cards: [], loading: true, isLoading: true };

      const html = renderToString(React.createElement(CardManagement));
      expect(html).toContain('role="status"');
      expect(html).toContain('aria-busy="true"');
      expect(html).toContain('Carregando…');
      expect(html).not.toContain('Nenhum cartão cadastrado ainda');
    });

    it('quando isLoading=false e lista vazia, deve renderizar o empty state verdadeiro', () => {
      mockCardsHook = { cards: [], loading: false, isLoading: false };

      const html = renderToString(React.createElement(CardManagement));
      expect(html).toContain('Nenhum cartão cadastrado ainda');
      expect(html).toContain('aria-busy="false"');
    });
  });

  describe('3. Assinaturas (SubscriptionManagement)', () => {
    it('quando isLoading=true, deve renderizar SkeletonPage', () => {
      mockSubsHook = { subscriptions: [], loading: true, isLoading: true };

      const html = renderToString(React.createElement(SubscriptionManagement));
      expect(html).toContain('role="status"');
      expect(html).toContain('aria-busy="true"');
      expect(html).toContain('Carregando…');
      expect(html).not.toContain('Nenhuma assinatura cadastrada');
    });

    it('quando isLoading=false e lista vazia, deve renderizar o empty state verdadeiro', () => {
      mockSubsHook = { subscriptions: [], loading: false, isLoading: false };

      const html = renderToString(React.createElement(SubscriptionManagement));
      expect(html).toContain('Nenhuma assinatura cadastrada');
      expect(html).toContain('aria-busy="false"');
    });
  });

  describe('4. Modo Crise (CrisisMode)', () => {
    it('quando isLoading=true, deve renderizar SkeletonPage', () => {
      mockLoansHook = { loans: [], loading: true, isLoading: true };

      const html = renderToString(React.createElement(CrisisMode, { selectedMonth: '2026-11' }));
      expect(html).toContain('role="status"');
      expect(html).toContain('aria-busy="true"');
      expect(html).toContain('Carregando…');
    });

    it('quando isLoading=false, deve renderizar a tela carregada', () => {
      mockLoansHook = { loans: [], loading: false, isLoading: false };

      const html = renderToString(React.createElement(CrisisMode, { selectedMonth: '2026-11' }));
      expect(html).toContain('Modo Crise &amp; Raio-X Financeiro');
      expect(html).toContain('aria-busy="false"');
    });
  });
});
