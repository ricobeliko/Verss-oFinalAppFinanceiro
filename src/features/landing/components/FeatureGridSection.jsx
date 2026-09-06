// src/features/landing/components/FeatureGridSection.jsx
import React from 'react';
import { FiLayers, FiUsers, FiTrendingUp, FiClock, FiFileText, FiLock } from 'react-icons/fi';

export default function FeatureGridSection() {
  const features = [
    {
      icon: <FiLayers className="w-6 h-6 text-[#E5B842]" />,
      title: 'Múltiplos Cartões & Limites',
      desc: 'Controle bandeiras, bancos e limites sem misturar o fechamento de cada instituição financeira.',
      tag: 'Organização',
      hoverGlow: 'hover:shadow-[0_0_30px_rgba(229,184,66,0.15)] hover:border-[#E5B842]/40',
    },
    {
      icon: <FiUsers className="w-6 h-6 text-[#38BDF8]" />,
      title: 'Divisão de Compras Justa',
      desc: 'Rateie despesas compartilhadas entre cônjuges, repúblicas ou amigos com exatidão em cada centavo.',
      tag: 'Compartilhamento',
      hoverGlow: 'hover:shadow-[0_0_30px_rgba(56,189,248,0.15)] hover:border-[#38BDF8]/40',
    },
    {
      icon: <FiTrendingUp className="w-6 h-6 text-[#34D399]" />,
      title: 'Projeção de Faturas Futuras',
      desc: 'Visualize o comprometimento da sua renda nos próximos meses antes de assumir novas compras parceladas.',
      tag: 'Previsibilidade',
      hoverGlow: 'hover:shadow-[0_0_30px_rgba(52,211,153,0.15)] hover:border-[#34D399]/40',
    },
    {
      icon: <FiClock className="w-6 h-6 text-[#F5D580]" />,
      title: 'Assinaturas & Cobranças Fixas',
      desc: 'Monitore streamings, serviços recorrentes e custos previsíveis para ter controle total do mês.',
      tag: 'Recorrências',
      hoverGlow: 'hover:shadow-[0_0_30px_rgba(245,213,128,0.15)] hover:border-[#F5D580]/40',
    },
    {
      icon: <FiFileText className="w-6 h-6 text-[#A78BFA]" />,
      title: 'Exportação PDF & CSV Limpa',
      desc: 'Gere extratos organizados de faturas e relatórios consolidados a qualquer momento com um clique.',
      tag: 'Relatórios',
      hoverGlow: 'hover:shadow-[0_0_30px_rgba(167,139,250,0.15)] hover:border-[#A78BFA]/40',
    },
    {
      icon: <FiLock className="w-6 h-6 text-[#F87171]" />,
      title: 'Total Soberania dos Dados',
      desc: 'Sem conexão bancária invasiva. Seus registros pertencem a você e ficam armazenados com segurança.',
      tag: 'Privacidade',
      hoverGlow: 'hover:shadow-[0_0_30px_rgba(248,113,113,0.15)] hover:border-[#F87171]/40',
    },
  ];

  return (
    <section id="features" className="py-24 scroll-mt-20 bg-[#0D0E11] relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Title */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-xs font-semibold text-[#E5B842] uppercase tracking-wider px-3 py-1 rounded-full bg-[#E5B842]/10 border border-[#E5B842]/20">
            Recursos Essenciais
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#F9FAFB] mt-4 mb-4 tracking-tight">
            Projetado para quem leva suas finanças a sério
          </h2>
          <p className="text-[#9CA3AF] text-base leading-relaxed">
            Ferramentas precisas que atendem desde a rotina diária até o planejamento financeiro anual.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((item, idx) => (
            <div
              key={idx}
              className={`bg-[#13151A] rounded-2xl border border-white/5 p-7 transition-all duration-300 group flex flex-col justify-between ${item.hoverGlow}`}
            >
              <div>
                <div className="flex items-center justify-between mb-5">
                  <div className="w-12 h-12 rounded-xl bg-[#1A1D24] border border-white/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    {item.icon}
                  </div>
                  <span className="text-[11px] font-semibold text-[#9CA3AF] px-2.5 py-0.5 rounded-full bg-white/5 border border-white/5">
                    {item.tag}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-[#F9FAFB] mb-2.5 group-hover:text-[#F5D580] transition-colors">
                  {item.title}
                </h3>
                <p className="text-sm text-[#9CA3AF] leading-relaxed">
                  {item.desc}
                </p>
              </div>

              <div className="pt-6 mt-6 border-t border-white/5 flex items-center text-xs text-[#E5B842] font-semibold opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <span>Saiba mais no app &rarr;</span>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
