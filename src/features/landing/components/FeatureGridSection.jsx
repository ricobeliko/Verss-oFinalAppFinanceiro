// src/features/landing/components/FeatureGridSection.jsx
import React from 'react';
import { FiLayers, FiUsers, FiTrendingUp, FiClock, FiFileText, FiLock } from 'react-icons/fi';

export default function FeatureGridSection() {
  const features = [
    {
      icon: <FiLayers className="w-6 h-6 text-[var(--fc-accent)]" />,
      title: 'Múltiplos Cartões & Limites',
      desc: 'Controle bandeiras, bancos e limites sem misturar o fechamento de cada instituição financeira.',
      tag: 'Organização',
    },
    {
      icon: <FiUsers className="w-6 h-6 text-[var(--fc-info)]" />,
      title: 'Divisão de Compras Justa',
      desc: 'Rateie despesas compartilhadas entre cônjuges, repúblicas ou amigos com exatidão em cada centavo.',
      tag: 'Compartilhamento',
    },
    {
      icon: <FiTrendingUp className="w-6 h-6 text-[var(--fc-success)]" />,
      title: 'Projeção de Faturas Futuras',
      desc: 'Visualize o comprometimento da sua renda nos próximos meses antes de assumir novas compras parceladas.',
      tag: 'Previsibilidade',
    },
    {
      icon: <FiClock className="w-6 h-6 text-[var(--fc-accent)]" />,
      title: 'Assinaturas & Cobranças Fixas',
      desc: 'Monitore streamings, serviços recorrentes e custos previsíveis para ter controle total do mês.',
      tag: 'Recorrências',
    },
    {
      icon: <FiFileText className="w-6 h-6 text-[var(--fc-info)]" />,
      title: 'Exportação CSV & PDF por Pessoa',
      desc: 'Exporte extratos em CSV (mensal e anual) e relatórios em PDF organizados por pessoa para prestação de contas transparente.',
      tag: 'Relatórios',
    },
    {
      icon: <FiLock className="w-6 h-6 text-[var(--fc-accent)]" />,
      title: 'Total Soberania dos Dados',
      desc: 'Sem conexão bancária invasiva. Seus registros pertencem a você e ficam armazenados com segurança.',
      tag: 'Privacidade',
    },
  ];

  return (
    <section id="features" className="py-24 scroll-mt-20 bg-[var(--fc-bg)] relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Title */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-xs font-semibold text-[var(--fc-accent)] uppercase tracking-wider px-3 py-1 rounded-full bg-[var(--fc-accent-soft)] border border-[var(--fc-accent)]/20">
            Recursos Essenciais
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[var(--fc-text-primary)] mt-4 mb-4 tracking-tight">
            Projetado para quem leva suas finanças a sério
          </h2>
          <p className="text-[var(--fc-text-secondary)] text-base leading-relaxed">
            Ferramentas precisas que atendem desde a rotina diária até o planejamento financeiro anual.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((item, idx) => (
            <div
              key={idx}
              className="bg-[var(--fc-surface-1)] rounded-2xl border border-[var(--fc-border-subtle)] p-7 transition-all duration-300 group flex flex-col justify-between hover:border-[var(--fc-border-strong)] hover:shadow-[var(--fc-shadow-md)]"
            >
              <div>
                <div className="flex items-center justify-between mb-5">
                  <div className="w-12 h-12 rounded-xl bg-[var(--fc-surface-2)] border border-[var(--fc-border-default)] flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    {item.icon}
                  </div>
                  <span className="text-[11px] font-semibold text-[var(--fc-text-secondary)] px-2.5 py-0.5 rounded-full bg-[var(--fc-surface-2)] border border-[var(--fc-border-subtle)]">
                    {item.tag}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-[var(--fc-text-primary)] mb-2.5 group-hover:text-[var(--fc-accent)] transition-colors">
                  {item.title}
                </h3>
                <p className="text-sm text-[var(--fc-text-secondary)] leading-relaxed">
                  {item.desc}
                </p>
              </div>

              <div className="pt-6 mt-6 border-t border-[var(--fc-border-subtle)] flex items-center text-xs text-[var(--fc-accent)] font-semibold opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <span>Saiba mais no app &rarr;</span>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
