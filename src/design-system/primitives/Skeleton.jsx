// src/design-system/primitives/Skeleton.jsx
import React from 'react';

/**
 * Skeleton — Primitivo de carregamento visual adaptado aos tokens do FinControl DS2.
 * 
 * Variantes suportadas:
 * - 'block': Bloco retangular padrão para imagens, cards ou áreas de gráficos.
 * - 'text': Barra horizontal fina imitando linhas tipográficas.
 * - 'circle': Círculo para avatares, ícones ou badges.
 * - 'card': Superfície de cartão com cabeçalho e corpo simulados.
 * 
 * Acessibilidade:
 * - Não contém nenhum elemento interativo ou focável.
 * - Shimmer executado via CSS puro transform (desativado automaticamente com reduced-motion).
 */
export default function Skeleton({
  variant = 'block',
  width,
  height,
  className = '',
  shimmer = true,
  style = {},
  ...props
}) {
  const shimmerClass = shimmer ? 'fc-skeleton-shimmer' : '';
  const inlineStyles = {
    ...(width ? { width } : {}),
    ...(height ? { height } : {}),
    ...style,
  };

  switch (variant) {
    case 'text':
      return (
        <div
          aria-hidden="true"
          className={`h-4 rounded bg-[var(--fc-surface-2)] ${shimmerClass} ${className}`}
          style={inlineStyles}
          {...props}
        />
      );

    case 'circle':
      return (
        <div
          aria-hidden="true"
          className={`rounded-full bg-[var(--fc-surface-2)] shrink-0 ${shimmerClass} ${className}`}
          style={inlineStyles}
          {...props}
        />
      );

    case 'card':
      return (
        <div
          aria-hidden="true"
          className={`rounded-xl p-5 border border-[var(--fc-border-subtle)] bg-[var(--fc-surface-1)] space-y-4 ${shimmerClass} ${className}`}
          style={inlineStyles}
          {...props}
        >
          <div className="flex items-center justify-between">
            <div className="h-4 w-28 rounded bg-[var(--fc-surface-2)]" />
            <div className="w-8 h-8 rounded-lg bg-[var(--fc-surface-2)]" />
          </div>
          <div className="h-7 w-36 rounded-md bg-[var(--fc-surface-2)]" />
          <div className="h-3 w-20 rounded bg-[var(--fc-surface-2)]" />
        </div>
      );

    case 'block':
    default:
      return (
        <div
          aria-hidden="true"
          className={`rounded-xl bg-[var(--fc-surface-2)] ${shimmerClass} ${className}`}
          style={inlineStyles}
          {...props}
        />
      );
  }
}

/**
 * SkeletonPage — Esqueleto de página completa para transições de tela e Suspense fallbacks.
 * 
 * Estrutura:
 * - Título da página
 * - Grade com 4 cartões de KPIs / métricas
 * - 2 blocos largos de gráficos ou tabelas
 * - Linhas de listagem
 * 
 * Acessibilidade:
 * - Possui role="status" e aria-busy="true"
 * - Texto acessível oculto visualmente ("Carregando conteúdo…") para leitores de tela
 * - Zero elementos focáveis
 */
export function SkeletonPage({ className = '', titleWidth = 'w-48' }) {
  return (
    <div
      role="status"
      aria-busy="true"
      className={`w-full space-y-6 animate-pulse-none ${className}`}
    >
      <span className="sr-only">Carregando…</span>

      {/* Cabeçalho / Título */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton variant="block" className={`h-8 ${titleWidth} rounded-lg`} />
          <Skeleton variant="text" className="w-64 h-3.5" />
        </div>
        <Skeleton variant="block" className="h-10 w-32 rounded-xl" />
      </div>

      {/* Grid de 4 Cards de Métricas / KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Skeleton variant="card" />
        <Skeleton variant="card" />
        <Skeleton variant="card" />
        <Skeleton variant="card" />
      </div>

      {/* 2 Blocos Largos (ex: gráficos ou visões consolidadas) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl p-5 border border-[var(--fc-border-subtle)] bg-[var(--fc-surface-1)] space-y-4 fc-skeleton-shimmer">
          <div className="flex items-center justify-between">
            <Skeleton variant="text" className="w-36 h-5" />
            <Skeleton variant="block" className="w-20 h-6 rounded-md" />
          </div>
          <Skeleton variant="block" className="w-full h-56 rounded-lg" />
        </div>

        <div className="rounded-xl p-5 border border-[var(--fc-border-subtle)] bg-[var(--fc-surface-1)] space-y-4 fc-skeleton-shimmer">
          <div className="flex items-center justify-between">
            <Skeleton variant="text" className="w-40 h-5" />
            <Skeleton variant="block" className="w-20 h-6 rounded-md" />
          </div>
          <Skeleton variant="block" className="w-full h-56 rounded-lg" />
        </div>
      </div>

      {/* Linhas de Listagem (ex: movimentações ou parcelas) */}
      <div className="rounded-xl p-5 border border-[var(--fc-border-subtle)] bg-[var(--fc-surface-1)] space-y-3 fc-skeleton-shimmer">
        <div className="flex items-center justify-between pb-2 border-b border-[var(--fc-border-subtle)]">
          <Skeleton variant="text" className="w-32 h-4" />
          <Skeleton variant="text" className="w-16 h-4" />
        </div>
        <div className="space-y-2.5 pt-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Skeleton variant="circle" className="w-9 h-9" />
              <div className="space-y-1.5">
                <Skeleton variant="text" className="w-44 h-3.5" />
                <Skeleton variant="text" className="w-24 h-2.5" />
              </div>
            </div>
            <Skeleton variant="text" className="w-20 h-4" />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Skeleton variant="circle" className="w-9 h-9" />
              <div className="space-y-1.5">
                <Skeleton variant="text" className="w-36 h-3.5" />
                <Skeleton variant="text" className="w-20 h-2.5" />
              </div>
            </div>
            <Skeleton variant="text" className="w-20 h-4" />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Skeleton variant="circle" className="w-9 h-9" />
              <div className="space-y-1.5">
                <Skeleton variant="text" className="w-48 h-3.5" />
                <Skeleton variant="text" className="w-28 h-2.5" />
              </div>
            </div>
            <Skeleton variant="text" className="w-20 h-4" />
          </div>
        </div>
      </div>
    </div>
  );
}

Skeleton.Page = SkeletonPage;
