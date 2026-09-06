// src/features/landing/components/PricingPlansSection.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { FiCheck, FiArrowRight } from 'react-icons/fi';

/**
 * PricingPlansSection — Canonical Pricing:
 * - Gratuito: R$ 0 (Para sempre)
 * - FinControl Pro: R$ 29,99 (Pagamento único • Acesso vitalício)
 * SKU: PRO-LIFETIME-01
 */
export default function PricingPlansSection() {
  return (
    <section id="pricing" className="py-24 scroll-mt-20 bg-gradient-to-b from-[#0E1015] via-[#101217] to-[#0D0E11] relative overflow-hidden">
      {/* Background Subtle Diffuse Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-[#E5B842]/[0.04] rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-xs font-semibold text-[#E5B842] uppercase tracking-wider px-3 py-1 rounded-full bg-[#E5B842]/10 border border-[#E5B842]/20">
            Preço Justo e Transparente
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#F9FAFB] mt-4 mb-4 tracking-tight">
            Simples e definitivo
          </h2>
          <p className="text-[#9CA3AF] text-base leading-relaxed">
            Comece no plano gratuito ou desbloqueie o FinControl Pro com pagamento único e acesso vitalício.
          </p>
        </div>

        {/* 2 Canonical Cards Grid: Gratuito (~45%) + FinControl Pro (~55%) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center max-w-5xl mx-auto">
          
          {/* Card 1: Gratuito (lg:col-span-5 ~ 42-45%) */}
          <div className="lg:col-span-5 rounded-2xl p-7 sm:p-8 bg-[#13151A] border border-white/5 hover:border-white/15 flex flex-col justify-between transition-all duration-300 shadow-xl">
            <div>
              <div className="mb-6">
                <h3 className="text-xl font-bold text-[#F9FAFB] mb-1">Gratuito</h3>
                <p className="text-xs text-[#9CA3AF] min-h-[32px]">
                  O essencial para organizar cartões, faturas e compras compartilhadas.
                </p>
              </div>

              <div className="mb-6 pb-6 border-b border-white/5">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl sm:text-4xl font-extrabold text-[#F9FAFB]">R$ 0</span>
                  <span className="text-xs text-[#9CA3AF] font-medium">Para sempre</span>
                </div>
                <p className="text-xs text-[#9CA3AF] mt-1.5">
                  Sem taxas ocultas e sem necessidade de cartão de crédito.
                </p>
              </div>

              <div className="space-y-3 mb-8">
                <div className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider">
                  Recursos inclusos:
                </div>
                <div className="flex items-start gap-2.5 text-xs sm:text-sm text-[#9CA3AF]">
                  <FiCheck className="w-4 h-4 text-[#34D399] shrink-0 mt-0.5" />
                  <span>Cadastro de pessoas e divisão de compras</span>
                </div>
                <div className="flex items-start gap-2.5 text-xs sm:text-sm text-[#9CA3AF]">
                  <FiCheck className="w-4 h-4 text-[#34D399] shrink-0 mt-0.5" />
                  <span>Gestão de cartões de crédito e faturas</span>
                </div>
                <div className="flex items-start gap-2.5 text-xs sm:text-sm text-[#9CA3AF]">
                  <FiCheck className="w-4 h-4 text-[#34D399] shrink-0 mt-0.5" />
                  <span>Controle de datas de fechamento e vencimento</span>
                </div>
                <div className="flex items-start gap-2.5 text-xs sm:text-sm text-[#9CA3AF]">
                  <FiCheck className="w-4 h-4 text-[#34D399] shrink-0 mt-0.5" />
                  <span>Registro de compras e parcelamentos no cartão</span>
                </div>
                <div className="flex items-start gap-2.5 text-xs sm:text-sm text-[#9CA3AF]">
                  <FiCheck className="w-4 h-4 text-[#34D399] shrink-0 mt-0.5" />
                  <span>Acesso seguro autenticado por usuário</span>
                </div>
              </div>
            </div>

            <Link
              to="/login?mode=register"
              className="w-full py-3 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all bg-[#1A1D24] text-[#F9FAFB] hover:bg-[#222630] border border-white/10 hover:border-white/20"
            >
              <span>Começar gratuitamente</span>
              <FiArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Card 2: FinControl Pro (lg:col-span-7 ~ 55-58%) */}
          <div className="lg:col-span-7 rounded-2xl p-8 sm:p-9 bg-[#181B22] border-2 border-[#E5B842] shadow-[0_0_50px_rgba(229,184,66,0.12)] flex flex-col justify-between relative transition-all duration-300 lg:-translate-y-2">
            {/* Badge */}
            <div className="absolute -top-3.5 left-8 bg-gradient-to-r from-[#E5B842] to-[#F5D580] text-[#0D0E11] text-xs font-extrabold px-3.5 py-1 rounded-full uppercase tracking-wider shadow-md">
              Acesso Vitalício
            </div>

            <div>
              <div className="mb-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-bold text-[#F9FAFB] mb-1">FinControl Pro</h3>
                  <span className="text-[11px] font-semibold text-[#E5B842] bg-[#E5B842]/10 border border-[#E5B842]/20 px-2.5 py-0.5 rounded-full">
                    pagamento único
                  </span>
                </div>
                <p className="text-xs text-[#9CA3AF]">
                  Controle financeiro com gráficos analíticos, receitas e modo crise.
                </p>
              </div>

              <div className="mb-6 pb-6 border-b border-white/10">
                <div className="flex items-baseline gap-2.5">
                  <span className="text-4xl sm:text-5xl font-extrabold text-[#F9FAFB] tracking-tight">R$ 29,99</span>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-[#F5D580] uppercase tracking-wide">pagamento único</span>
                    <span className="text-[11px] text-[#9CA3AF]">acesso vitalício</span>
                  </div>
                </div>
                <p className="text-xs text-[#9CA3AF] mt-2">
                  Pagamento único. Acesso vitalício.
                </p>
              </div>

              <div className="space-y-3.5 mb-8">
                <div className="text-xs font-semibold text-[#E5B842] uppercase tracking-wider">
                  Tudo do Gratuito, mais:
                </div>
                <div className="flex items-start gap-2.5 text-xs sm:text-sm text-[#F9FAFB]">
                  <FiCheck className="w-4 h-4 text-[#34D399] shrink-0 mt-0.5" />
                  <span>Tudo incluído no plano Gratuito</span>
                </div>
                <div className="flex items-start gap-2.5 text-xs sm:text-sm text-[#F9FAFB]">
                  <FiCheck className="w-4 h-4 text-[#34D399] shrink-0 mt-0.5" />
                  <span>Registro de receitas e balanço mensal</span>
                </div>
                <div className="flex items-start gap-2.5 text-xs sm:text-sm text-[#F9FAFB]">
                  <FiCheck className="w-4 h-4 text-[#34D399] shrink-0 mt-0.5" />
                  <span>Registro de despesas avulsas por categoria</span>
                </div>
                <div className="flex items-start gap-2.5 text-xs sm:text-sm text-[#F9FAFB]">
                  <FiCheck className="w-4 h-4 text-[#34D399] shrink-0 mt-0.5" />
                  <span>Gráficos analíticos por pessoa e categoria</span>
                </div>
                <div className="flex items-start gap-2.5 text-xs sm:text-sm text-[#F9FAFB]">
                  <FiCheck className="w-4 h-4 text-[#34D399] shrink-0 mt-0.5" />
                  <span>Modo Crise para auditoria e corte de gastos</span>
                </div>
              </div>
            </div>

            <Link
              to="/login?mode=register"
              className="w-full py-3.5 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all bg-gradient-to-r from-[#E5B842] via-[#F5D580] to-[#E5B842] text-[#0D0E11] hover:shadow-lg hover:shadow-[#E5B842]/30 hover:scale-[1.01]"
            >
              <span>Desbloquear FinControl Pro</span>
              <FiArrowRight className="w-4 h-4" />
            </Link>
          </div>

        </div>

      </div>
    </section>
  );
}
