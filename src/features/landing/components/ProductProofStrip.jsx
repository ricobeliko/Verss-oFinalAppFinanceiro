// src/features/landing/components/ProductProofStrip.jsx
import React from 'react';
import { FiCheckCircle, FiUsers, FiCreditCard, FiCalendar, FiLock, FiShield } from 'react-icons/fi';

export default function ProductProofStrip() {
  const proofItems = [
    {
      icon: <FiCheckCircle className="text-[#34D399] w-4 h-4 shrink-0" />,
      title: 'Precisão em Centavos',
      desc: 'Soma de parcelas bate exatamente ao centavo, sem sobras.',
    },
    {
      icon: <FiUsers className="text-[#E5B842] w-4 h-4 shrink-0" />,
      title: 'Compras Compartilhadas',
      desc: 'Divisão de gastos com acompanhamento de quem já pagou.',
    },
    {
      icon: <FiCreditCard className="text-[#38BDF8] w-4 h-4 shrink-0" />,
      title: 'Controle de Faturas',
      desc: 'Ciclos de melhor dia de compra, fechamento e vencimento.',
    },
    {
      icon: <FiCalendar className="text-[#F5D580] w-4 h-4 shrink-0" />,
      title: 'Parcelas & Projeção',
      desc: 'Visão de comprometimento futuro mês a mês.',
    },
    {
      icon: <FiLock className="text-[#34D399] w-4 h-4 shrink-0" />,
      title: 'Acesso Autenticado',
      desc: 'Armazenamento isolado e dados protegidos por usuário.',
    },
    {
      icon: <FiShield className="text-[#E5B842] w-4 h-4 shrink-0" />,
      title: 'Sem Senhas Bancárias',
      desc: 'Sem conexão bancária necessária. Total soberania dos dados.',
    },
  ];

  return (
    <div className="relative border-y border-white/5 bg-[#101217]/90 backdrop-blur-md py-6 z-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 md:gap-6">
          {proofItems.map((item, idx) => (
            <div
              key={idx}
              className="flex flex-col gap-1 p-2 rounded-xl hover:bg-white/[0.02] transition-colors"
            >
              <div className="flex items-center gap-2">
                {item.icon}
                <span className="text-xs font-semibold text-[#F9FAFB] tracking-tight">
                  {item.title}
                </span>
              </div>
              <p className="text-[11px] text-[#9CA3AF] leading-relaxed pl-6">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
