// src/features/landing/components/LivingLedgerStage.jsx
import React, { useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import gsap from 'gsap';
import { FiCreditCard, FiUsers, FiCheckCircle, FiClock, FiShield } from 'react-icons/fi';

/**
 * Central Living Ledger Stage:
 * Multi-plane financial card stack with high depth separation (20-40px forward feel),
 * realistic invoice cycles, shared purchase breakdown, and exact centavos precision.
 */
const LivingLedgerStage = forwardRef(function LivingLedgerStage({ prefersReducedMotion }, ref) {
  const stageRef = useRef(null);
  const backplateRef = useRef(null);
  const cardBackRef = useRef(null);
  const cardMainRef = useRef(null);
  const chipSplitRef = useRef(null);
  const chipMathRef = useRef(null);
  const sheenRef = useRef(null);

  // QuickTo setters refs to avoid reallocations
  const quickSettersRef = useRef(null);

  useEffect(() => {
    if (prefersReducedMotion) return;

    const ctx = gsap.context(() => {
      quickSettersRef.current = {
        cardMainRotX: cardMainRef.current ? gsap.quickTo(cardMainRef.current, 'rotationX', { duration: 0.6, ease: 'power2.out' }) : null,
        cardMainRotY: cardMainRef.current ? gsap.quickTo(cardMainRef.current, 'rotationY', { duration: 0.6, ease: 'power2.out' }) : null,
        cardMainX: cardMainRef.current ? gsap.quickTo(cardMainRef.current, 'x', { duration: 0.6, ease: 'power2.out' }) : null,
        cardMainY: cardMainRef.current ? gsap.quickTo(cardMainRef.current, 'y', { duration: 0.6, ease: 'power2.out' }) : null,

        cardBackRotX: cardBackRef.current ? gsap.quickTo(cardBackRef.current, 'rotationX', { duration: 0.7, ease: 'power2.out' }) : null,
        cardBackRotY: cardBackRef.current ? gsap.quickTo(cardBackRef.current, 'rotationY', { duration: 0.7, ease: 'power2.out' }) : null,
        cardBackX: cardBackRef.current ? gsap.quickTo(cardBackRef.current, 'x', { duration: 0.7, ease: 'power2.out' }) : null,
        cardBackY: cardBackRef.current ? gsap.quickTo(cardBackRef.current, 'y', { duration: 0.7, ease: 'power2.out' }) : null,

        backplateX: backplateRef.current ? gsap.quickTo(backplateRef.current, 'x', { duration: 0.8, ease: 'power2.out' }) : null,
        backplateY: backplateRef.current ? gsap.quickTo(backplateRef.current, 'y', { duration: 0.8, ease: 'power2.out' }) : null,

        chipSplitX: chipSplitRef.current ? gsap.quickTo(chipSplitRef.current, 'x', { duration: 0.5, ease: 'power2.out' }) : null,
        chipSplitY: chipSplitRef.current ? gsap.quickTo(chipSplitRef.current, 'y', { duration: 0.5, ease: 'power2.out' }) : null,

        chipMathX: chipMathRef.current ? gsap.quickTo(chipMathRef.current, 'x', { duration: 0.55, ease: 'power2.out' }) : null,
        chipMathY: chipMathRef.current ? gsap.quickTo(chipMathRef.current, 'y', { duration: 0.55, ease: 'power2.out' }) : null,
      };
    }, stageRef);

    return () => {
      quickSettersRef.current = null;
      ctx.revert();
    };
  }, [prefersReducedMotion]);

  useImperativeHandle(ref, () => ({
    updatePointer(normX, normY) {
      if (prefersReducedMotion || !quickSettersRef.current) return;
      const setters = quickSettersRef.current;

      const tiltX = normY * -5;
      const tiltY = normX * 6;

      if (setters.cardMainRotX) setters.cardMainRotX(tiltX);
      if (setters.cardMainRotY) setters.cardMainRotY(tiltY);
      if (setters.cardMainX) setters.cardMainX(normX * 6);
      if (setters.cardMainY) setters.cardMainY(normY * 5);

      if (setters.cardBackRotX) setters.cardBackRotX(tiltX * 0.75);
      if (setters.cardBackRotY) setters.cardBackRotY(tiltY * 0.75);
      if (setters.cardBackX) setters.cardBackX(normX * 3.5);
      if (setters.cardBackY) setters.cardBackY(normY * 3);

      if (setters.backplateX) setters.backplateX(normX * 2);
      if (setters.backplateY) setters.backplateY(normY * 2);

      if (setters.chipSplitX) setters.chipSplitX(normX * 8);
      if (setters.chipSplitY) setters.chipSplitY(normY * 7);

      if (setters.chipMathX) setters.chipMathX(normX * -8);
      if (setters.chipMathY) setters.chipMathY(normY * -7);

      if (sheenRef.current) {
        const sheenX = (50 + normX * 35).toFixed(1);
        const sheenY = (50 + normY * 35).toFixed(1);
        sheenRef.current.style.background = `radial-gradient(circle at ${sheenX}% ${sheenY}%, rgba(245, 213, 128, 0.10) 0%, transparent 60%)`;
      }
    }
  }), [prefersReducedMotion]);

  return (
    <div
      ref={stageRef}
      className="relative w-full max-w-[560px] mx-auto select-none py-4"
      style={{ perspective: '1400px' }}
    >
      {/* Distant Frosted Backplate (Plane for 20-40px forward separation) */}
      <div
        ref={backplateRef}
        className="absolute -inset-4 md:-inset-6 rounded-3xl bg-gradient-to-b from-white/[0.04] to-transparent border border-white/[0.03] backdrop-blur-[2px] -z-30 pointer-events-none"
      />

      {/* Deep Ambient Shadows */}
      <div className="absolute inset-0 bg-black/80 blur-2xl -z-20 rounded-3xl transform translate-y-8 scale-95" />

      {/* Layer 1: Back Card (Upcoming Cycle Preview) */}
      <div
        ref={cardBackRef}
        className="absolute -top-4 -right-3 md:-right-5 w-[94%] h-[92%] bg-[#121419] rounded-2xl border border-white/[0.06] p-5 shadow-2xl -z-10 opacity-70 transform scale-[0.97] origin-bottom-left transition-all"
      >
        <div className="flex items-center justify-between text-xs text-[#9CA3AF]">
          <span className="flex items-center gap-1.5 font-medium">
            <FiCreditCard className="text-[#E5B842]" /> Fatura Seguinte • Próximo Mês
          </span>
          <span className="text-[#F9FAFB] font-semibold">R$ 2.410,20</span>
        </div>
      </div>

      {/* Layer 2: Main Card (The Living Ledger) */}
      <div
        ref={cardMainRef}
        className="relative bg-[#161920] rounded-2xl border border-white/10 border-t-[#F5D580]/30 p-5 md:p-7 shadow-[0_35px_80px_-15px_rgba(0,0,0,0.95)] overflow-hidden transition-all duration-300 group hover:border-[#E5B842]/40"
      >
        {/* Dynamic Sheen Overlay */}
        <div
          ref={sheenRef}
          className="absolute inset-0 pointer-events-none transition-opacity duration-300"
        />

        {/* Top Header Row */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#262B36] to-[#121419] border border-[#E5B842]/30 flex items-center justify-center text-[#F5D580] shadow-inner">
              <FiCreditCard className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-[#F9FAFB] flex items-center gap-2">
                Cartão Principal
                <span className="w-1.5 h-1.5 rounded-full bg-[#34D399]" />
              </div>
              <p className="text-xs text-[#9CA3AF]">Fechamento dia 25 • Vencimento dia 02</p>
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E5B842]/10 border border-[#E5B842]/30 text-xs text-[#F5D580] font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-[#E5B842] motion-safe:animate-pulse" />
            Fatura Aberta
          </div>
        </div>

        {/* Amount & Progress Section */}
        <div className="mb-6 p-4 rounded-xl bg-[#0E1015]/90 border border-white/5">
          <div className="flex items-baseline justify-between mb-2">
            <div>
              <span className="text-[11px] text-[#9CA3AF] uppercase tracking-wider block font-medium">
                Total Acumulado
              </span>
              <div className="text-2xl md:text-3xl font-bold tracking-tight text-[#F9FAFB] flex items-baseline gap-1">
                <span className="text-lg font-medium text-[#E5B842]">R$</span>
                <span>4.280,50</span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-[#9CA3AF] block">Disponível</span>
              <span className="text-sm font-semibold text-[#34D399]">R$ 5.719,50</span>
            </div>
          </div>

          {/* Limit Bar */}
          <div className="w-full bg-[#1C2028] h-2 rounded-full overflow-hidden flex">
            <div className="bg-gradient-to-r from-[#E5B842] to-[#F5D580] h-full rounded-full w-[42.8%]" />
          </div>
          <div className="flex justify-between text-[10px] text-[#9CA3AF] mt-1.5 font-medium">
            <span>Limite R$ 10.000,00</span>
            <span>42,8% utilizado</span>
          </div>
        </div>

        {/* Transaction Rows (Generic Clean Categories, No Third-Party Brand Claims) */}
        <div className="space-y-2.5">
          <div className="text-xs font-semibold text-[#9CA3AF] tracking-wider uppercase flex items-center justify-between px-1">
            <span>Lançamentos Recentes</span>
            <span className="text-[#E5B842] text-[11px] lowercase">3 itens ativos</span>
          </div>

          {/* Row 1: Shared Purchase */}
          <div className="p-3 rounded-xl bg-[#1B1F27]/90 border border-white/5 hover:border-[#E5B842]/30 transition-colors flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-[#E5B842]/10 border border-[#E5B842]/20 flex items-center justify-center text-[#E5B842] shrink-0">
                <FiUsers className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-[#F9FAFB] truncate">
                  Notebook de Trabalho (04/10)
                </p>
                <p className="text-xs text-[#9CA3AF] truncate flex items-center gap-1.5">
                  <span className="text-[#38BDF8]">Divisão 50%</span> • Lucas deve R$ 575,00
                </p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="text-sm font-semibold text-[#F9FAFB] block">R$ 1.150,00</span>
              <span className="text-[10px] text-[#34D399] font-medium bg-[#34D399]/10 px-1.5 py-0.5 rounded border border-[#34D399]/20">
                Sua parte: R$ 575,00
              </span>
            </div>
          </div>

          {/* Row 2: Standard Expense */}
          <div className="p-3 rounded-xl bg-[#1B1F27]/90 border border-white/5 hover:border-white/10 transition-colors flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-[#9CA3AF] shrink-0">
                <FiCheckCircle className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-[#F9FAFB] truncate">
                  Despesas de Supermercado
                </p>
                <p className="text-xs text-[#9CA3AF]">Alimentação • À vista</p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="text-sm font-semibold text-[#F9FAFB] block">R$ 684,20</span>
              <span className="text-[10px] text-[#9CA3AF]">Compra confirmada</span>
            </div>
          </div>

          {/* Row 3: Subscription */}
          <div className="p-3 rounded-xl bg-[#1B1F27]/90 border border-white/5 hover:border-white/10 transition-colors flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-[#38BDF8]/10 border border-[#38BDF8]/20 flex items-center justify-center text-[#38BDF8] shrink-0">
                <FiClock className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-[#F9FAFB] truncate">
                  Serviços de Streaming
                </p>
                <p className="text-xs text-[#9CA3AF]">Assinatura Recorrente</p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="text-sm font-semibold text-[#F9FAFB] block">R$ 89,80</span>
              <span className="text-[10px] text-[#38BDF8] font-medium">Débito no fechamento</span>
            </div>
          </div>
        </div>
      </div>

      {/* Layer 3: Floating Chip 1 (Shared Debt Resolution - Top Right) */}
      <div
        ref={chipSplitRef}
        className="absolute -top-3 -right-2 md:-right-6 bg-[#181B22]/98 backdrop-blur-md border border-[#E5B842]/40 rounded-xl p-3 shadow-2xl text-xs flex items-center gap-2.5 z-10"
      >
        <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#E5B842] to-[#F5D580] text-[#0D0E11] font-bold flex items-center justify-center text-xs shadow-md">
          L
        </div>
        <div>
          <p className="text-[#F9FAFB] font-semibold text-xs">Lucas deve R$ 575,00</p>
          <p className="text-[10px] text-[#34D399] flex items-center gap-1 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-[#34D399]" />
            Aguardando transferência Pix
          </p>
        </div>
      </div>

      {/* Layer 4: Floating Chip 2 (Exact Math - Bottom Left) */}
      <div
        ref={chipMathRef}
        className="absolute -bottom-3 -left-2 md:-left-6 bg-[#181B22]/98 backdrop-blur-md border border-white/10 rounded-xl p-3 shadow-2xl text-xs flex items-center gap-2.5 z-10"
      >
        <div className="w-7 h-7 rounded-lg bg-[#34D399]/15 border border-[#34D399]/30 text-[#34D399] flex items-center justify-center text-sm shadow-inner">
          <FiShield className="w-4 h-4" />
        </div>
        <div>
          <p className="text-[#F9FAFB] font-semibold text-xs flex items-center gap-1">
            Precisão em cada centavo
            <span className="text-[#34D399] text-[10px]">✓</span>
          </p>
          <p className="text-[10px] text-[#9CA3AF]">
            Sem resíduo de arredondamento: <span className="text-[#F5D580] font-mono">R$ 0,00</span>
          </p>
        </div>
      </div>
    </div>
  );
});

export default LivingLedgerStage;
