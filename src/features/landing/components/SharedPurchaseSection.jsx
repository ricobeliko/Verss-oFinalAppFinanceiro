// src/features/landing/components/SharedPurchaseSection.jsx
import React, { useState } from 'react';
import { FiUsers, FiCheck, FiShield } from 'react-icons/fi';

export default function SharedPurchaseSection() {
  const [totalAmount, setTotalAmount] = useState(1000);
  const [peopleCount, setPeopleCount] = useState(3);

  // FinControl exact integer cent split logic
  const calculateExactSplit = (total, count) => {
    const totalCents = Math.round(total * 100);
    const baseCents = Math.floor(totalCents / count);
    const remainder = totalCents % count;

    const shares = [];
    for (let i = 0; i < count; i++) {
      // First 'remainder' people get base + 1 cent
      const cents = i < remainder ? baseCents + 1 : baseCents;
      shares.push((cents / 100).toFixed(2));
    }
    return shares;
  };

  const shares = calculateExactSplit(totalAmount, peopleCount);
  const sumOfShares = shares.reduce((acc, curr) => acc + parseFloat(curr), 0).toFixed(2);
  const drift = (parseFloat(sumOfShares) - totalAmount).toFixed(2);

  const mockNames = ['Você', 'Lucas', 'Mariana', 'Beatriz', 'Felipe'];

  return (
    <section id="shared-purchases" className="py-24 scroll-mt-20 bg-[#0D0E11] relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Column: Explanatory & Math Integrity */}
          <div className="lg:col-span-6">
            <span className="text-xs font-semibold text-[#38BDF8] uppercase tracking-wider px-3 py-1 rounded-full bg-[#38BDF8]/10 border border-[#38BDF8]/20">
              Engenharia de Divisão
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#F9FAFB] mt-4 mb-4 tracking-tight leading-tight">
              Fim das discussões de "quem deve quanto" no final do mês.
            </h2>
            <p className="text-[#9CA3AF] text-base leading-relaxed mb-6">
              Quando você passa uma compra conjunta no seu cartão de crédito (uma viagem, o jantar com amigos, ou uma assinatura compartilhada), o FinControl calcula a fração exata de cada um sem deixar centavos perdidos no limbo.
            </p>

            <div className="space-y-3.5 mb-8">
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-[#34D399]/15 border border-[#34D399]/30 text-[#34D399] flex items-center justify-center shrink-0 mt-0.5">
                  <FiCheck className="w-3 h-3" />
                </div>
                <p className="text-sm text-[#9CA3AF]">
                  <strong className="text-[#F9FAFB]">Precisão em Cada Centavo:</strong> A soma das partes sempre resulta rigorosamente no valor total da transação.
                </p>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-[#E5B842]/15 border border-[#E5B842]/30 text-[#E5B842] flex items-center justify-center shrink-0 mt-0.5">
                  <FiCheck className="w-3 h-3" />
                </div>
                <p className="text-sm text-[#9CA3AF]">
                  <strong className="text-[#F9FAFB]">Controle de Reembolsos:</strong> Saiba quem já fez o Pix e quem ainda está com o pagamento pendente.
                </p>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-[#38BDF8]/15 border border-[#38BDF8]/30 text-[#38BDF8] flex items-center justify-center shrink-0 mt-0.5">
                  <FiCheck className="w-3 h-3" />
                </div>
                <p className="text-sm text-[#9CA3AF]">
                  <strong className="text-[#F9FAFB]">Parcelamentos Compartilhados:</strong> Se a compra for em 10x, o FinControl projeta a cobrança mês a mês para todos.
                </p>
              </div>
            </div>

            <div className="inline-flex items-center gap-2 p-3 rounded-xl bg-[#13151A] border border-white/5 text-xs text-[#9CA3AF]">
              <FiShield className="text-[#E5B842] w-4 h-4 shrink-0" />
              <span>Cálculos realizados com validação exata em centavos no FinControl.</span>
            </div>
          </div>

          {/* Right Column: Live Interactive Split Simulator */}
          <div className="lg:col-span-6 bg-[#13151A] rounded-2xl border border-white/10 p-6 md:p-8 shadow-2xl relative group">
            
            {/* Ambient Background Glow */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-[#E5B842]/5 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#E5B842]/10 border border-[#E5B842]/30 flex items-center justify-center text-[#E5B842]">
                  <FiUsers className="w-4 h-4" />
                </div>
                <span className="text-sm font-bold text-[#F9FAFB]">Simulador de Divisão Exata</span>
              </div>
              <span className="text-[11px] font-semibold text-[#34D399] bg-[#34D399]/10 px-2.5 py-0.5 rounded-full border border-[#34D399]/30">
                Exatidão de Centavos Ativa
              </span>
            </div>

            {/* Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-xs font-medium text-[#9CA3AF] mb-2">
                  Valor Total da Compra (R$)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[#9CA3AF]">
                    R$
                  </span>
                  <input
                    type="number"
                    value={totalAmount}
                    onChange={(e) => setTotalAmount(Math.max(1, Number(e.target.value)))}
                    className="w-full bg-[#181B22] border border-white/10 rounded-xl py-2 pl-9 pr-3 text-sm text-[#F9FAFB] focus:border-[#E5B842] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#9CA3AF] mb-2">
                  Pessoas na Divisão ({peopleCount})
                </label>
                <div className="flex items-center gap-2">
                  {[2, 3, 4, 5].map((cnt) => (
                    <button
                      key={cnt}
                      onClick={() => setPeopleCount(cnt)}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                        peopleCount === cnt
                          ? 'bg-[#E5B842] text-[#0D0E11]'
                          : 'bg-[#181B22] text-[#9CA3AF] hover:text-[#F9FAFB] border border-white/5'
                      }`}
                    >
                      {cnt}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Live Distribution Output */}
            <div className="space-y-2.5 mb-6">
              <div className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider mb-2">
                Resultado por Pessoa:
              </div>
              {shares.map((share, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-xl bg-[#181B22] border border-white/5"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-full bg-white/10 text-xs font-bold text-[#F5D580] flex items-center justify-center">
                      {idx + 1}
                    </div>
                    <span className="text-xs font-medium text-[#F9FAFB]">
                      {mockNames[idx] || `Pessoa ${idx + 1}`}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-[#F9FAFB] font-mono">
                      R$ {share.replace('.', ',')}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Math Audit Box */}
            <div className="p-4 rounded-xl bg-[#0E1015] border border-white/5 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-[#9CA3AF] uppercase block">Soma das Parcelas</span>
                <span className="text-sm font-bold text-[#34D399] font-mono">
                  R$ {sumOfShares.replace('.', ',')}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-[#9CA3AF] uppercase block">Diferença Residual</span>
                <span className="text-sm font-bold text-[#F5D580] font-mono">
                  R$ {drift.replace('.', ',')}
                </span>
              </div>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
}
