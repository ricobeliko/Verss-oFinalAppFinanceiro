// tests/skeleton.test.js
import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import Skeleton, { SkeletonPage } from '../src/design-system/primitives/Skeleton';

describe('Skeleton Primitive & SkeletonPage (A11y & Visual Consistency)', () => {
  describe('1. Variantes Básicas do Skeleton', () => {
    it('deve renderizar a variante block por padrão com shimmer', () => {
      const html = renderToString(React.createElement(Skeleton, { className: 'h-24 w-full' }));
      expect(html).toContain('fc-skeleton-shimmer');
      expect(html).toContain('rounded-xl');
      expect(html).toContain('bg-[var(--fc-surface-2)]');
      expect(html).toContain('h-24');
      expect(html).toContain('aria-hidden="true"');
    });

    it('deve renderizar a variante text com altura de linha tipográfica', () => {
      const html = renderToString(React.createElement(Skeleton, { variant: 'text', className: 'w-48' }));
      expect(html).toContain('h-4');
      expect(html).toContain('w-48');
      expect(html).toContain('fc-skeleton-shimmer');
      expect(html).toContain('aria-hidden="true"');
    });

    it('deve renderizar a variante circle com rounded-full', () => {
      const html = renderToString(React.createElement(Skeleton, { variant: 'circle', className: 'w-10 h-10' }));
      expect(html).toContain('rounded-full');
      expect(html).toContain('shrink-0');
      expect(html).toContain('w-10');
      expect(html).toContain('h-10');
      expect(html).toContain('aria-hidden="true"');
    });

    it('deve renderizar a variante card com superfície e sub-esqueletos internos', () => {
      const html = renderToString(React.createElement(Skeleton, { variant: 'card' }));
      expect(html).toContain('rounded-xl');
      expect(html).toContain('bg-[var(--fc-surface-1)]');
      expect(html).toContain('border-[var(--fc-border-subtle)]');
      expect(html).toContain('fc-skeleton-shimmer');
      expect(html).toContain('aria-hidden="true"');
    });

    it('deve permitir desativar o shimmer explicitamente com shimmer={false}', () => {
      const html = renderToString(React.createElement(Skeleton, { shimmer: false }));
      expect(html).not.toContain('fc-skeleton-shimmer');
    });
  });

  describe('2. Acessibilidade e Estrutura do SkeletonPage', () => {
    it('deve possuir role="status", aria-busy="true" e mensagem acessível para leitores de tela', () => {
      const html = renderToString(React.createElement(SkeletonPage));
      expect(html).toContain('role="status"');
      expect(html).toContain('aria-busy="true"');
      expect(html).toContain('sr-only');
      expect(html).toContain('Carregando…');
    });

    it('NÃO deve conter nenhum elemento interativo ou focável', () => {
      const html = renderToString(React.createElement(SkeletonPage));
      expect(html).not.toMatch(/<button/i);
      expect(html).not.toMatch(/<a\s/i);
      expect(html).not.toMatch(/<input/i);
      expect(html).not.toMatch(/<select/i);
      expect(html).not.toMatch(/<textarea/i);
      expect(html).not.toMatch(/tabindex\s*=\s*["']?[0-9]/i);
    });

    it('deve renderizar estrutura completa: cabeçalho, 4 cards de KPIs, 2 blocos largos e lista', () => {
      const html = renderToString(React.createElement(SkeletonPage));
      // Grid de 4 cards
      expect(html).toContain('lg:grid-cols-4');
      // Grid de 2 blocos largos
      expect(html).toContain('lg:grid-cols-2');
      // Superfícies de suporte
      expect(html).toContain('bg-[var(--fc-surface-1)]');
    });

    it('deve exportar SkeletonPage também como propriedade estática Skeleton.Page', () => {
      expect(Skeleton.Page).toBe(SkeletonPage);
    });
  });
});
