// src/features/landing/components/InvoiceTimelineSection.jsx
import React, { useState } from 'react';
import { FiClock, FiCheckCircle } from 'react-icons/fi';

export default function InvoiceTimelineSection() {
  const [isCentPaid, setIsCentPaid] = useState(false);

  const months = [
    { month: 'Maio', year: '2026', total: 'R$ 3.840,25', installments: 8, status: 'Atual' },
    { month: 'Junho', year: '2026', total: 'R$ 2.410,20', installments: 6, status: 'Previsto' },
    { month: 'Julho', year: '2026', total: 'R$ 1.890,50', installments: 5, status: 'Previsto' },
    { month: 'Agosto', year: '2026', total: 'R$ 1.250,00', installments: 3, status: 'Previsto' },
    { month: 'Setembro', year: '2026', total: 'R$ 625,00', installments: 1, status: 'Final' },
  ];

  return (
    <section id="invoices-timeline" className="py-24 bg-[var(--fc-bg)] relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="flex items-center justify-center gap-2 mb-3">
            <span className="text-xs font-semibold text-[var(--fc-accent)] uppercase tracking-wider px-3 py-1 rounded-full bg-[var(--fc-accent-soft)] border border-[var(--fc-accent)]/20">
              Previsibilidade Financeira
            </span>
            <span className="text-[10px] font-medium text-[var(--fc-text-muted)] px-2 py-0.5 rounded-md bg-[var(--fc-surface-2)] border border-[var(--fc-border-subtle)]">
              Dados de exemplo
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[var(--fc-text-primary)] mt-2 mb-4 tracking-tight">
            Saiba quanto suas faturas vão cobrar antes mesmo do mês começar
          </h2>
          <p className="text-[var(--fc-text-secondary)] text-base leading-relaxed">
            Todas as compras parceladas e assinaturas futuras são projetadas mês a mês, sem surpresas no limite do cartão.
          </p>
        </div>

        {/* 5-Month Timeline Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-16">
          {months.map((m, idx) => (
            <div
              key={idx}
              className={`p-5 rounded-2xl border transition-all duration-300 ${
                idx === 0
                  ? 'bg-[var(--fc-surface-2)] border-[var(--fc-accent)] shadow-[var(--fc-shadow-md)] scale-[1.02]'
                  : 'bg-[var(--fc-surface-1)] border-[var(--fc-border-subtle)] hover:border-[var(--fc-border-strong)]'
              }`}
            >
              <div className="flex items-center justify-between text-xs mb-3">
                <span className="text-[var(--fc-text-secondary)] font-medium">{m.month} {m.year}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                    idx === 0
                      ? 'bg-[var(--fc-accent-soft)] text-[var(--fc-accent)]'
                      : 'bg-[var(--fc-surface-3)] text-[var(--fc-text-secondary)]'
                  }`}
                >
                  {m.status}
                </span>
              </div>

              <div className="text-xl font-extrabold text-[var(--fc-text-primary)] mb-2 tracking-tight">
                {m.total}
              </div>

              <div className="text-xs text-[var(--fc-text-secondary)] flex items-center gap-1.5">
                <FiClock className="w-3.5 h-3.5 text-[var(--fc-accent)]" />
                <span>{m.installments} parcelas ativas</span>
              </div>
            </div>
          ))}
        </div>

        {/* The 1 Cent Residual Domain Rule Interactive Showcase */}
        <div className="fc-glass-card rounded-2xl border border-[var(--fc-border-default)] p-6 md:p-8 max-w-3xl mx-auto shadow-[var(--fc-shadow-lg)]">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl bg-[var(--fc-accent-soft)] border border-[var(--fc-accent)]/30 flex items-center justify-center text-[var(--fc-accent)]">
              <FiCheckCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-[var(--fc-text-primary)]">
                  Rigor Matemático: O Princípio de R$ 0,01
                </h3>
                <span className="text-[10px] font-medium text-[var(--fc-text-muted)] px-1.5 py-0.5 rounded bg-[var(--fc-surface-2)]">
                  Dados de exemplo
                </span>
              </div>
              <p className="text-xs text-[var(--fc-text-secondary)]">
                No FinControl, 1 centavo ainda é dívida. Nenhuma fatura é dada como quitada prematuramente.
              </p>
            </div>
          </div>

          <div className="bg-[var(--fc-surface-2)] rounded-xl p-4 border border-[var(--fc-border-subtle)] mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="text-xs text-[var(--fc-text-secondary)]">Fatura Exemplo: R$ 100,00</div>
              <div className="text-sm font-semibold text-[var(--fc-text-primary)] mt-0.5">
                Valor Pago: {isCentPaid ? 'R$ 100,00' : 'R$ 99,99'} • Saldo Devedor:{' '}
                <span className={isCentPaid ? 'text-[var(--fc-success)] font-mono' : 'text-[var(--fc-danger)] font-mono'}>
                  {isCentPaid ? 'R$ 0,00' : 'R$ 0,01'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold border ${
                  isCentPaid
                    ? 'bg-[var(--fc-success-soft)] border-[var(--fc-success)]/30 text-[var(--fc-success)]'
                    : 'bg-[var(--fc-warning-soft)] border-[var(--fc-warning)]/30 text-[var(--fc-warning)]'
                }`}
              >
                {isCentPaid ? 'Pago Total' : 'Pago Parcial'}
              </span>

              <button
                type="button"
                onClick={() => setIsCentPaid(!isCentPaid)}
                className="px-3 py-1.5 rounded-lg bg-[var(--fc-surface-1)] hover:bg-[var(--fc-surface-3)] text-xs text-[var(--fc-accent)] font-medium transition-colors border border-[var(--fc-border-default)] cursor-pointer"
              >
                {isCentPaid ? 'Simular saldo de R$ 0,01' : 'Pagar R$ 0,01 restante'}
              </button>
            </div>
          </div>

          <p className="text-xs text-[var(--fc-text-secondary)] leading-relaxed">
            Esse padrão garante que extratos bancários, adiantamentos e reconciliações financeiras nunca apresentem discrepâncias em relatórios exportados.
          </p>
        </div>

      </div>
    </section>
  );
}
