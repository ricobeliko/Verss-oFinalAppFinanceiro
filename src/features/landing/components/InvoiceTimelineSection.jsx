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
    <section id="invoices-timeline" className="py-24 bg-[#101217] relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-xs font-semibold text-[#E5B842] uppercase tracking-wider px-3 py-1 rounded-full bg-[#E5B842]/10 border border-[#E5B842]/20">
            Previsibilidade Financeira
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#F9FAFB] mt-4 mb-4 tracking-tight">
            Saiba quanto suas faturas vão cobrar antes mesmo do mês começar
          </h2>
          <p className="text-[#9CA3AF] text-base leading-relaxed">
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
                  ? 'bg-[#1A1D24] border-[#E5B842]/50 shadow-lg shadow-[#E5B842]/10 scale-[1.02]'
                  : 'bg-[#13151A] border-white/5 hover:border-white/15'
              }`}
            >
              <div className="flex items-center justify-between text-xs mb-3">
                <span className="text-[#9CA3AF] font-medium">{m.month} {m.year}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                    idx === 0
                      ? 'bg-[#E5B842]/20 text-[#F5D580]'
                      : 'bg-white/5 text-[#9CA3AF]'
                  }`}
                >
                  {m.status}
                </span>
              </div>

              <div className="text-xl font-extrabold text-[#F9FAFB] mb-2 tracking-tight">
                {m.total}
              </div>

              <div className="text-xs text-[#9CA3AF] flex items-center gap-1.5">
                <FiClock className="w-3.5 h-3.5 text-[#E5B842]" />
                <span>{m.installments} parcelas ativas</span>
              </div>
            </div>
          ))}
        </div>

        {/* The 1 Cent Residual Domain Rule Interactive Showcase */}
        <div className="bg-[#13151A] rounded-2xl border border-white/10 p-6 md:p-8 max-w-3xl mx-auto shadow-2xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl bg-[#E5B842]/15 border border-[#E5B842]/30 flex items-center justify-center text-[#E5B842]">
              <FiCheckCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#F9FAFB]">
                Rigor Matemático: O Princípio de R$ 0,01
              </h3>
              <p className="text-xs text-[#9CA3AF]">
                No FinControl, 1 centavo ainda é dívida. Nenhuma fatura é dada como quitada prematuramente.
              </p>
            </div>
          </div>

          <div className="bg-[#181B22] rounded-xl p-4 border border-white/5 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="text-xs text-[#9CA3AF]">Fatura Exemplo: R$ 100,00</div>
              <div className="text-sm font-semibold text-[#F9FAFB] mt-0.5">
                Valor Pago: {isCentPaid ? 'R$ 100,00' : 'R$ 99,99'} • Saldo Devedor:{' '}
                <span className={isCentPaid ? 'text-[#34D399] font-mono' : 'text-[#F87171] font-mono'}>
                  {isCentPaid ? 'R$ 0,00' : 'R$ 0,01'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold border ${
                  isCentPaid
                    ? 'bg-[#34D399]/15 border-[#34D399]/30 text-[#34D399]'
                    : 'bg-[#FBBF24]/15 border-[#FBBF24]/30 text-[#FBBF24]'
                }`}
              >
                {isCentPaid ? 'Pago Total' : 'Pago Parcial'}
              </span>

              <button
                onClick={() => setIsCentPaid(!isCentPaid)}
                className="px-3 py-1.5 rounded-lg bg-[#222630] hover:bg-[#2A2F3D] text-xs text-[#F5D580] font-medium transition-colors border border-white/10"
              >
                {isCentPaid ? 'Simular saldo de R$ 0,01' : 'Pagar R$ 0,01 restante'}
              </button>
            </div>
          </div>

          <p className="text-xs text-[#9CA3AF] leading-relaxed">
            Esse padrão garante que extratos bancários, adiantamentos e reconciliações financeiras nunca apresentem discrepâncias em relatórios exportados.
          </p>
        </div>

      </div>
    </section>
  );
}
