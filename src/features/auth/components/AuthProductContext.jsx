// src/features/auth/components/AuthProductContext.jsx
import React from 'react';
import { FiCreditCard, FiPieChart, FiUsers } from 'react-icons/fi';

/**
 * Painel contextual factual do FinControl para o Auth Desktop.
 * Apresenta estritamente recursos reais e comprovados do produto,
 * sem prova social simulada ou métricas fictícias.
 */
export default function AuthProductContext() {
  const highlights = [
    {
      icon: <FiCreditCard className="w-5 h-5 text-[var(--fc-accent)]" aria-hidden="true" />,
      title: 'Cartões & Faturas',
      description: 'Organize limites, datas de fechamento e vencimento em um único lugar.',
    },
    {
      icon: <FiPieChart className="w-5 h-5 text-[var(--fc-accent)]" aria-hidden="true" />,
      title: 'Compras Parceladas',
      description: 'Acompanhe parcelas com soma exata e precisão matemática em centavos.',
    },
    {
      icon: <FiUsers className="w-5 h-5 text-[var(--fc-accent)]" aria-hidden="true" />,
      title: 'Divisão Compartilhada',
      description: 'Separe compras pessoais e compartilhadas com transparência entre pessoas.',
    },
  ];

  return (
    <div className="hidden lg:flex flex-col justify-between p-8 xl:p-10 rounded-3xl bg-[var(--fc-surface-1)] border border-[var(--fc-border-subtle)] relative overflow-hidden shadow-[var(--fc-shadow-md)]">
      {/* Glow sutil atmosférico */}
      <div
        className="absolute -top-24 -left-24 w-80 h-80 rounded-full bg-[var(--fc-accent)]/10 blur-3xl pointer-events-none"
        aria-hidden="true"
      />

      <div className="relative z-10 space-y-6">
        {/* Brand Header */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[var(--fc-border-default)] bg-[var(--fc-surface-2)] text-[11px] font-semibold text-[var(--fc-accent)]">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--fc-accent)] animate-pulse" />
            FinControl
          </div>
          <h2 className="text-2xl xl:text-3xl font-extrabold tracking-tight text-[var(--fc-text-primary)] leading-snug">
            Controle financeiro de alta precisão.
          </h2>
          <p className="text-sm text-[var(--fc-text-secondary)] leading-relaxed">
            Planejamento estruturado para quem valoriza organização e clareza patrimonial.
          </p>
        </div>

        {/* Feature Highlights */}
        <div className="space-y-4 pt-2">
          {highlights.map((item, idx) => (
            <div
              key={idx}
              className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-[var(--fc-surface-2)]/60 border border-[var(--fc-border-subtle)]"
            >
              <div className="shrink-0 p-2 rounded-xl bg-[var(--fc-accent-soft)] border border-[var(--fc-accent)]/20 mt-0.5">
                {item.icon}
              </div>
              <div className="space-y-0.5">
                <h3 className="text-xs font-bold text-[var(--fc-text-primary)]">
                  {item.title}
                </h3>
                <p className="text-[12px] text-[var(--fc-text-secondary)] leading-relaxed">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer fact */}
      <div className="relative z-10 pt-6 mt-6 border-t border-[var(--fc-border-subtle)] text-[11px] text-[var(--fc-text-muted)] flex items-center">
        <span>Acesso autenticado</span>
      </div>
    </div>
  );
}
