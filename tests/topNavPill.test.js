// tests/topNavPill.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import TopNavPill from '../src/features/dashboard/shell/TopNavPill';

describe('TopNavPill — Barra de Navegação Superior (Commit B)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('deve renderizar os 5 itens de navegação canônicos com acessibilidade completa', () => {
    const html = renderToString(
      React.createElement(TopNavPill, {
        activePage: 'resumo',
        onSelectPage: () => {},
        onPrefetch: () => {},
      })
    );

    // Navegação e roles semânticas
    expect(html).toContain('aria-label="Navegação principal"');
    expect(html).toContain('role="tablist"');

    // 5 abas obrigatórias da Fase 7
    expect(html).toContain('Resumo');
    expect(html).toContain('Pessoas');
    expect(html).toContain('Cartões');
    expect(html).toContain('Movimentações');
    expect(html).toContain('Assinaturas');

    // Nenhuma menção a Modo Crise
    expect(html).not.toContain('Modo Crise');
    expect(html).not.toContain('Crise');
  });

  it('deve marcar aria-current="page" estritamente na aba ativa', () => {
    const html = renderToString(
      React.createElement(TopNavPill, {
        activePage: 'cards',
        onSelectPage: () => {},
        onPrefetch: () => {},
      })
    );

    expect(html).toMatch(/id="nav-tab-cards"[^>]*aria-current="page"/);

    // Aba inativa não deve ter aria-current
    expect(html).not.toMatch(/id="nav-tab-resumo"[^>]*aria-current="page"/);
  });

  it('todos os botões de aba devem ter min-h-[44px] e min-w-[44px] para conformidade A11y', () => {
    const html = renderToString(
      React.createElement(TopNavPill, {
        activePage: 'pessoas',
        onSelectPage: () => {},
        onPrefetch: () => {},
      })
    );

    expect(html).toContain('min-h-[44px]');
    expect(html).toContain('min-w-[44px]');
  });
});
