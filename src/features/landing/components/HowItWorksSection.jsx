// src/features/landing/components/HowItWorksSection.jsx
import React from 'react';
import { FiCreditCard, FiUsers, FiPieChart } from 'react-icons/fi';

export default function HowItWorksSection() {
  const steps = [
    {
      number: '01',
      icon: <FiCreditCard className="w-5 h-5 text-[#E5B842]" />,
      title: 'Cadastre seus Cartões & Ciclos',
      desc: 'Informe o dia de fechamento e vencimento de cada cartão. O sistema identifica automaticamente em qual fatura cada despesa deve entrar.',
      accent: 'border-[#E5B842]/30',
      pill: 'Melhor dia de compra calculado',
    },
    {
      number: '02',
      icon: <FiUsers className="w-5 h-5 text-[#38BDF8]" />,
      title: 'Lance Despesas com Divisão Justa',
      desc: 'Comprou algo com alguém? Defina o percentual de cada pessoa ou valor fixo. As frações são calculadas ao centavo sem perda de resíduo.',
      accent: 'border-[#38BDF8]/30',
      pill: 'Precisão em cada centavo',
    },
    {
      number: '03',
      icon: <FiPieChart className="w-5 h-5 text-[#34D399]" />,
      title: 'Acompanhe Reembolsos & Faturas',
      desc: 'Monitore o quanto você realmente deve pagar do seu bolso e quanto amigos ou parceiros precisam te transferir antes do fechamento.',
      accent: 'border-[#34D399]/30',
      pill: 'Cobrança limpa sem atrito',
    },
  ];

  return (
    <section id="how-it-works" className="py-24 scroll-mt-20 bg-[#0D0E11] relative overflow-hidden">
      {/* Background Soft Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-[#E5B842]/5 rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-xs font-semibold text-[#E5B842] uppercase tracking-wider px-3 py-1 rounded-full bg-[#E5B842]/10 border border-[#E5B842]/20">
            Fluxo Transparente
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#F9FAFB] mt-4 mb-4 tracking-tight">
            Como o FinControl simplifica sua vida
          </h2>
          <p className="text-[#9CA3AF] text-base leading-relaxed">
            Elimine planilhas manuais e a confusão de calcular quem deve o quê no fechamento do cartão de crédito.
          </p>
        </div>

        {/* 3 Step Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {steps.map((step, idx) => (
            <div
              key={idx}
              className="relative bg-[#13151A] rounded-2xl border border-white/5 p-7 hover:border-white/15 transition-all duration-300 hover:-translate-y-1 group shadow-xl"
            >
              {/* Top Row: Number & Icon */}
              <div className="flex items-center justify-between mb-6">
                <span className="text-3xl font-black text-white/10 font-mono group-hover:text-[#E5B842]/30 transition-colors">
                  {step.number}
                </span>
                <div className="w-10 h-10 rounded-xl bg-[#1A1D24] border border-white/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  {step.icon}
                </div>
              </div>

              {/* Title & Desc */}
              <h3 className="text-lg font-bold text-[#F9FAFB] mb-3 group-hover:text-[#F5D580] transition-colors">
                {step.title}
              </h3>
              <p className="text-sm text-[#9CA3AF] leading-relaxed mb-6">
                {step.desc}
              </p>

              {/* Pill */}
              <div className="inline-flex items-center gap-1.5 text-xs font-medium text-[#F5D580] bg-[#E5B842]/10 border border-[#E5B842]/20 px-2.5 py-1 rounded-full">
                <span>✓</span>
                <span>{step.pill}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
