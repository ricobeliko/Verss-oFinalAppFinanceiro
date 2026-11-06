// src/features/landing/components/FinalCtaSection.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { FiArrowRight, FiShield, FiCheckCircle } from 'react-icons/fi';

export default function FinalCtaSection() {
  return (
    <section id="final-cta" className="py-24 bg-[var(--fc-bg)] relative overflow-hidden">
      {/* Ambient Lighting */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-[var(--fc-glow-cool)] blur-3xl rounded-full pointer-events-none -z-10" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-[var(--fc-surface-1)] rounded-3xl border border-[var(--fc-border-default)] p-8 sm:p-14 text-center shadow-[var(--fc-shadow-lg)] relative">
          
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[var(--fc-accent-soft)] border border-[var(--fc-accent)]/20 text-xs font-semibold text-[var(--fc-accent)] mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--fc-success)]" />
            <span>Comece gratuitamente hoje</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-extrabold text-[var(--fc-text-primary)] tracking-tight mb-5 leading-tight">
            Pronto para assumir o controle absoluto do seu cartão e das suas contas?
          </h2>

          <p className="text-base sm:text-lg text-[var(--fc-text-secondary)] max-w-2xl mx-auto mb-8 leading-relaxed">
            Elimine as surpresas da fatura e a incerteza de quem deve o que. Comece a usar o FinControl em menos de 2 minutos.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
            <Link
              to="/login?mode=register"
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-[var(--fc-accent)] hover:bg-[var(--fc-accent-hover)] text-[var(--fc-accent-contrast)] font-bold text-base flex items-center justify-center gap-2 shadow-xl shadow-[var(--fc-accent)]/20 hover:scale-105 transition-all duration-300"
            >
              <span>Criar Conta Gratuita</span>
              <FiArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-[var(--fc-text-secondary)]">
            <span className="flex items-center gap-1.5">
              <FiCheckCircle className="text-[var(--fc-success)] w-3.5 h-3.5" />
              Sem cartão de crédito para testar
            </span>
            <span className="flex items-center gap-1.5">
              <FiShield className="text-[var(--fc-accent)] w-3.5 h-3.5" />
              Sem necessidade de senha bancária
            </span>
          </div>

        </div>
      </div>
    </section>
  );
}
