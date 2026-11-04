// tests/appSidebar.test.js
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import AppSidebar from '../src/features/dashboard/shell/AppSidebar';

describe('AppSidebar — Barra de Navegação Lateral Restaurada (Fase 7.2)', () => {
  const defaultProps = {
    activePage: 'resumo',
    onSelectPage: vi.fn(),
    isCollapsed: false,
    onToggleCollapse: vi.fn(),
    currentUser: { email: 'user@fincontrol.local' },
    isPro: true,
    isTrialActive: false,
    theme: 'dark',
    onToggleTheme: vi.fn(),
    onOpenDeleteModal: vi.fn(),
    onLogout: vi.fn(),
    onLockedFeatureClick: vi.fn(),
    onPrefetch: vi.fn(),
  };

  it('deve renderizar exatamente as 5 abas ativas do produto (sem Modo Crise)', () => {
    const html = renderToString(React.createElement(AppSidebar, defaultProps));

    expect(html).toContain('Resumo');
    expect(html).toContain('Pessoas');
    expect(html).toContain('Cartões');
    expect(html).toContain('Movimentações');
    expect(html).toContain('Assinaturas');

    expect(html).not.toContain('Modo Crise');
    expect(html).not.toContain('Raio-X');
  });

  it('deve marcar aria-current="page" apenas na aba ativa', () => {
    const html = renderToString(React.createElement(AppSidebar, { ...defaultProps, activePage: 'cards' }));

    // Deve ter aria-current="page" no botão de Cartões
    expect(html).toMatch(/aria-current="page"[^>]*aria-label="Cartões"/);
    // Não deve ter aria-current no botão de Resumo
    expect(html).not.toMatch(/aria-current="page"[^>]*aria-label="Resumo"/);
  });

  it('deve conter estrutura acessível com nav aria-label="Navegação principal"', () => {
    const html = renderToString(React.createElement(AppSidebar, defaultProps));

    expect(html).toContain('aria-label="Navegação principal"');
    expect(html).toContain('aria-label="Recolher menu lateral"');
  });

  it('deve adaptar layout e labels quando colapsada', () => {
    const html = renderToString(React.createElement(AppSidebar, { ...defaultProps, isCollapsed: true }));

    expect(html).toContain('w-[72px]');
    expect(html).toContain('aria-label="Expandir menu lateral"');
  });
});
