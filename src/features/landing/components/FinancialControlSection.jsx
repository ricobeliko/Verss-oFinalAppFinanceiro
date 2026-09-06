// src/features/landing/components/FinancialControlSection.jsx
import React, { useState } from 'react';
import { FiCreditCard, FiCalendar, FiClock, FiCheck, FiArrowUpRight } from 'react-icons/fi';

export default function FinancialControlSection() {
  const [activeTab, setActiveTab] = useState('invoices');

  const cardsData = [
    {
      brand: 'Cartão Principal (Black)',
      type: 'Mastercard Black',
      status: 'Aberta',
      statusColor: 'text-[#F5D580] bg-[#E5B842]/10 border-[#E5B842]/30',
      total: 'R$ 3.840,25',
      dueDate: '05/Mai',
      closeDate: '28/Abr',
      limitUsed: '64%',
    },
    {
      brand: 'Cartão Investimentos (Infinite)',
      type: 'Visa Infinite',
      status: 'Fechada',
      statusColor: 'text-[#34D399] bg-[#34D399]/10 border-[#34D399]/30',
      total: 'R$ 1.290,00',
      dueDate: '10/Mai',
      closeDate: '01/Mai',
      limitUsed: '25%',
    },
    {
      brand: 'Cartão Dia a Dia (Platinum)',
      type: 'Visa Platinum',
      status: 'Futura',
      statusColor: 'text-[#38BDF8] bg-[#38BDF8]/10 border-[#38BDF8]/30',
      total: 'R$ 820,40',
      dueDate: '15/Jun',
      closeDate: '08/Jun',
      limitUsed: '16%',
    },
  ];

  const installmentsData = [
    {
      title: 'Smartphone de Trabalho',
      installments: '07 de 12',
      installment: 'R$ 625,00',
      remaining: 'R$ 3.125,00',
      finishDate: 'Outubro / 2026',
      progress: 58,
    },
    {
      title: 'Revisão Automotiva 40.000km',
      installments: '03 de 06',
      installment: 'R$ 315,00',
      remaining: 'R$ 945,00',
      finishDate: 'Agosto / 2026',
      progress: 50,
    },
    {
      title: 'Curso de Especialização',
      installments: '10 de 10',
      installment: 'R$ 450,00',
      remaining: 'R$ 0,00',
      finishDate: 'Última parcela quitada!',
      progress: 100,
      completed: true,
    },
  ];

  const subscriptionsData = [
    { name: 'Plataforma de Streaming', frequency: 'Recorrente', amount: 'R$ 19,90', card: 'Cartão Black' },
    { name: 'Ferramentas de Produtividade', frequency: 'Recorrente', amount: 'R$ 55,00', card: 'Cartão Infinite' },
    { name: 'Assinatura de Academia', frequency: 'Recorrente', amount: 'R$ 139,90', card: 'Cartão Black' },
    { name: 'Infraestrutura em Nuvem', frequency: 'Variável', amount: 'R$ 42,10', card: 'Cartão Platinum' },
  ];

  return (
    <section className="py-24 bg-gradient-to-b from-[#0E1015] via-[#12141B] to-[#0D0F14] relative overflow-hidden">
      {/* Subtle Radial Atmosphere */}
      <div className="absolute top-1/3 right-10 w-[600px] h-[400px] bg-[#E5B842]/[0.03] rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
          <div>
            <span className="text-xs font-semibold text-[#E5B842] uppercase tracking-wider px-3 py-1 rounded-full bg-[#E5B842]/10 border border-[#E5B842]/20">
              Controle Fiel à Realidade
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#F9FAFB] mt-3 tracking-tight">
              Visão Panorâmica de Todos os Seus Compromissos
            </h2>
            <p className="text-[#9CA3AF] text-sm sm:text-base mt-2 max-w-xl">
              Cada cartão opera com seu próprio ciclo. O FinControl consolida tudo sem misturar datas ou perder o rastro de despesas futuras.
            </p>
          </div>

          {/* Tab Switcher */}
          <div className="inline-flex p-1 rounded-xl bg-[#181B22] border border-white/5 shrink-0 self-start md:self-auto">
            <button
              onClick={() => setActiveTab('invoices')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'invoices'
                  ? 'bg-[#E5B842] text-[#0D0E11] shadow-md font-bold'
                  : 'text-[#9CA3AF] hover:text-[#F9FAFB]'
              }`}
            >
              Faturas por Cartão
            </button>
            <button
              onClick={() => setActiveTab('installments')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'installments'
                  ? 'bg-[#E5B842] text-[#0D0E11] shadow-md font-bold'
                  : 'text-[#9CA3AF] hover:text-[#F9FAFB]'
              }`}
            >
              Parcelamentos
            </button>
            <button
              onClick={() => setActiveTab('subscriptions')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'subscriptions'
                  ? 'bg-[#E5B842] text-[#0D0E11] shadow-md font-bold'
                  : 'text-[#9CA3AF] hover:text-[#F9FAFB]'
              }`}
            >
              Assinaturas
            </button>
          </div>
        </div>

        {/* Tab 1: Invoices */}
        {activeTab === 'invoices' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-300">
            {cardsData.map((c, idx) => (
              <div
                key={idx}
                className="bg-[#13151A] rounded-2xl border border-white/5 p-6 hover:border-white/15 transition-all duration-300 shadow-xl"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-medium text-[#9CA3AF]">{c.type}</span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${c.statusColor}`}>
                    {c.status}
                  </span>
                </div>

                <div className="text-lg font-bold text-[#F9FAFB] mb-1">{c.brand}</div>
                <div className="text-2xl font-extrabold text-[#F9FAFB] mb-5 tracking-tight">
                  {c.total}
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-4 border-t border-white/5 text-[#9CA3AF]">
                  <div>
                    <span className="block text-[10px] uppercase">Fechamento</span>
                    <span className="text-[#F9FAFB] font-medium">{c.closeDate}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase">Vencimento</span>
                    <span className="text-[#F9FAFB] font-medium">{c.dueDate}</span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between text-xs">
                  <span className="text-[#9CA3AF]">Limite Comprometido</span>
                  <span className="font-semibold text-[#F5D580]">{c.limitUsed}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab 2: Installments */}
        {activeTab === 'installments' && (
          <div className="bg-[#13151A] rounded-2xl border border-white/5 overflow-hidden shadow-xl animate-in fade-in duration-300">
            <div className="p-6 divide-y divide-white/5 space-y-4">
              {installmentsData.map((item, idx) => (
                <div key={idx} className="pt-4 first:pt-0 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-[#1A1D24] border border-white/10 flex items-center justify-center text-[#E5B842] shrink-0">
                      <FiCalendar className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-[#F9FAFB] flex items-center gap-2">
                        {item.title}
                        {item.completed && (
                          <span className="text-[10px] bg-[#34D399]/20 text-[#34D399] px-2 py-0.5 rounded-full font-bold">
                            Quitado
                          </span>
                        )}
                      </h4>
                      <p className="text-xs text-[#9CA3AF]">
                        Parcela {item.installments} • Término: {item.finishDate}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 self-end md:self-auto">
                    <div className="text-right">
                      <span className="text-[10px] text-[#9CA3AF] block">Valor da Parcela</span>
                      <span className="text-sm font-bold text-[#F9FAFB]">{item.installment}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-[#9CA3AF] block">Saldo Restante</span>
                      <span className="text-sm font-bold text-[#E5B842]">{item.remaining}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: Subscriptions */}
        {activeTab === 'subscriptions' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in duration-300">
            {subscriptionsData.map((sub, idx) => (
              <div
                key={idx}
                className="p-5 rounded-2xl bg-[#13151A] border border-white/5 hover:border-white/15 transition-all shadow-xl"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-8 h-8 rounded-lg bg-[#38BDF8]/10 border border-[#38BDF8]/20 flex items-center justify-center text-[#38BDF8]">
                    <FiClock className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-semibold text-[#9CA3AF] bg-white/5 px-2 py-0.5 rounded-full">
                    {sub.frequency}
                  </span>
                </div>

                <div className="text-sm font-semibold text-[#F9FAFB] mb-1">{sub.name}</div>
                <div className="text-lg font-bold text-[#34D399] mb-3">{sub.amount}</div>

                <div className="text-[11px] text-[#9CA3AF] pt-3 border-t border-white/5 flex items-center justify-between">
                  <span>Cobrado no:</span>
                  <span className="text-[#F9FAFB] font-medium">{sub.card}</span>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </section>
  );
}
