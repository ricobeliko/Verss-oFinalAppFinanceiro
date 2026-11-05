// src/features/landing/components/LivingLedgerStage.jsx
import React, { useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import gsap from 'gsap';
import { FiCreditCard, FiUsers, FiCheckCircle, FiClock, FiShield } from 'react-icons/fi';
import { sampleData } from '../lib/sampleData';
import { formatCentsDisplay } from '../lib/splitExactCents';

/**
 * Central Living Ledger Stage:
 * Multi-plane financial card stack with high depth separation (20-40px forward feel),
 * realistic invoice cycles, shared purchase breakdown, and exact centavos precision.
 */
const LivingLedgerStage = forwardRef(function LivingLedgerStage({ prefersReducedMotion }, ref) {
  const { cardPrincipal, installments, subscriptions } = sampleData;
  const sharedNotebook = installments[0];
  const groceryTx = cardPrincipal.transactions.find((tx) => tx.id === 'tx-mercado');
  const streamingSub = subscriptions[0];

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
        sheenRef.current.style.background = `radial-gradient(circle at ${sheenX}% ${sheenY}%, var(--fc-accent-soft) 0%, transparent 60%)`;
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
        className="absolute -inset-4 md:-inset-6 rounded-3xl bg-[var(--fc-surface-1)]/40 border border-[var(--fc-border-subtle)] backdrop-blur-[2px] -z-30 pointer-events-none"
      />

      {/* Deep Ambient Shadows */}
      <div className="absolute inset-0 bg-black/40 blur-2xl -z-20 rounded-3xl transform translate-y-8 scale-95" />

      {/* Layer 1: Back Card (Upcoming Cycle Preview) */}
      <div
        ref={cardBackRef}
        className="absolute -top-4 -right-3 md:-right-5 w-[94%] h-[92%] bg-[var(--fc-surface-2)] rounded-2xl border border-[var(--fc-border-subtle)] p-5 shadow-2xl -z-10 opacity-70 transform scale-[0.97] origin-bottom-left transition-all"
      >
        <div className="flex items-center justify-between text-xs text-[var(--fc-text-secondary)]">
          <span className="flex items-center gap-1.5 font-medium">
            <FiCreditCard className="text-[var(--fc-accent)]" /> Fatura Seguinte • Próximo Mês
          </span>
          <span className="text-[var(--fc-text-primary)] font-semibold">{cardPrincipal.nextCycleTotalDisplay}</span>
        </div>
      </div>

      {/* Layer 2: Main Card (The Living Ledger) */}
      <div
        ref={cardMainRef}
        className="relative fc-glass-card rounded-2xl border border-[var(--fc-border-default)] p-5 md:p-7 shadow-[0_35px_80px_-15px_rgba(0,0,0,0.5)] overflow-hidden transition-all duration-300 group hover:border-[var(--fc-border-strong)]"
      >
        {/* Dynamic Sheen Overlay */}
        <div
          ref={sheenRef}
          className="absolute inset-0 pointer-events-none transition-opacity duration-300"
        />

        {/* Top Header Row */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--fc-surface-2)] border border-[var(--fc-border-default)] flex items-center justify-center text-[var(--fc-accent)] shadow-inner">
              <FiCreditCard className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-[var(--fc-text-primary)] flex items-center gap-2">
                {cardPrincipal.brand}
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--fc-success)]" />
                <span className="text-[10px] font-normal uppercase tracking-wider text-[var(--fc-text-muted)] bg-[var(--fc-surface-2)] border border-[var(--fc-border-subtle)] px-1.5 py-0.5 rounded">
                  Dados de exemplo
                </span>
              </div>
              <p className="text-xs text-[var(--fc-text-secondary)]">
                Fechamento dia {cardPrincipal.closeDayNumber} • Vencimento dia {cardPrincipal.dueDayNumber < 10 ? `0${cardPrincipal.dueDayNumber}` : cardPrincipal.dueDayNumber}
              </p>
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--fc-accent-subtle)] border border-[var(--fc-border-default)] text-xs text-[var(--fc-accent)] font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--fc-accent)] motion-safe:animate-pulse" />
            Fatura Aberta
          </div>
        </div>

        {/* Amount & Progress Section */}
        <div className="mb-6 p-4 rounded-xl bg-[var(--fc-surface-2)] border border-[var(--fc-border-subtle)]">
          <div className="flex items-baseline justify-between mb-2">
            <div>
              <span className="text-[11px] text-[var(--fc-text-secondary)] uppercase tracking-wider block font-medium">
                Total Acumulado
              </span>
              <div className="text-2xl md:text-3xl font-bold tracking-tight text-[var(--fc-text-primary)] flex items-baseline gap-1">
                <span className="text-lg font-medium text-[var(--fc-accent)]">R$</span>
                <span>{cardPrincipal.totalDisplay.replace('R$ ', '')}</span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-[var(--fc-text-secondary)] block">Disponível</span>
              <span className="text-sm font-semibold text-[var(--fc-success)]">{cardPrincipal.availableDisplay}</span>
            </div>
          </div>

          {/* Limit Bar */}
          <div className="w-full bg-[var(--fc-surface-3)] h-2 rounded-full overflow-hidden flex">
            <div
              className="bg-[var(--fc-accent)] h-full rounded-full transition-all"
              style={{ width: `${cardPrincipal.limitUsedPercentage.toFixed(1)}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-[var(--fc-text-secondary)] mt-1.5 font-medium">
            <span>Limite {cardPrincipal.limitDisplay}</span>
            <span>{cardPrincipal.limitUsed} utilizado</span>
          </div>
        </div>

        {/* Transaction Rows (Generic Clean Categories, No Third-Party Brand Claims) */}
        <div className="space-y-2.5">
          <div className="text-xs font-semibold text-[var(--fc-text-secondary)] tracking-wider uppercase flex items-center justify-between px-1">
            <span>Lançamentos Recentes</span>
            <span className="text-[var(--fc-accent)] text-[11px] lowercase">3 itens ativos</span>
          </div>

          {/* Row 1: Shared Purchase */}
          <div className="p-3 rounded-xl bg-[var(--fc-surface-2)] border border-[var(--fc-border-subtle)] hover:border-[var(--fc-border-default)] transition-colors flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-[var(--fc-accent-subtle)] border border-[var(--fc-border-subtle)] flex items-center justify-center text-[var(--fc-accent)] shrink-0">
                <FiUsers className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-[var(--fc-text-primary)] truncate">
                  {sharedNotebook.title} ({sharedNotebook.installments})
                </p>
                <p className="text-xs text-[var(--fc-text-secondary)] truncate flex items-center gap-1.5">
                  <span className="text-[var(--fc-info)]">Divisão 50%</span> • {sharedNotebook.debtorName} deve {sharedNotebook.debtorShareDisplay}
                </p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="text-sm font-semibold text-[var(--fc-text-primary)] block">{sharedNotebook.installment}</span>
              <span className="text-[10px] text-[var(--fc-success)] font-medium bg-[var(--fc-success-subtle)] px-1.5 py-0.5 rounded border border-[var(--fc-border-subtle)]">
                Sua parte: {sharedNotebook.debtorShareDisplay}
              </span>
            </div>
          </div>

          {/* Row 2: Standard Expense */}
          <div className="p-3 rounded-xl bg-[var(--fc-surface-2)] border border-[var(--fc-border-subtle)] hover:border-[var(--fc-border-default)] transition-colors flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-[var(--fc-surface-3)] border border-[var(--fc-border-subtle)] flex items-center justify-center text-[var(--fc-text-secondary)] shrink-0">
                <FiCheckCircle className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-[var(--fc-text-primary)] truncate">
                  {groceryTx.name}
                </p>
                <p className="text-xs text-[var(--fc-text-secondary)]">{groceryTx.category}</p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="text-sm font-semibold text-[var(--fc-text-primary)] block">
                {formatCentsDisplay(groceryTx.amountCents)}
              </span>
              <span className="text-[10px] text-[var(--fc-text-secondary)]">Compra confirmada</span>
            </div>
          </div>

          {/* Row 3: Subscription */}
          <div className="p-3 rounded-xl bg-[var(--fc-surface-2)] border border-[var(--fc-border-subtle)] hover:border-[var(--fc-border-default)] transition-colors flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-[var(--fc-info-subtle)] border border-[var(--fc-border-subtle)] flex items-center justify-center text-[var(--fc-info)] shrink-0">
                <FiClock className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-[var(--fc-text-primary)] truncate">
                  {streamingSub.name}
                </p>
                <p className="text-xs text-[var(--fc-text-secondary)]">{streamingSub.frequency}</p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="text-sm font-semibold text-[var(--fc-text-primary)] block">{streamingSub.amount}</span>
              <span className="text-[10px] text-[var(--fc-info)] font-medium">Débito no fechamento</span>
            </div>
          </div>
        </div>
      </div>

      {/* Layer 3: Floating Chip 1 (Shared Debt Resolution - Top Right) */}
      <div
        ref={chipSplitRef}
        className="absolute -top-3 -right-2 md:-right-6 bg-[var(--fc-surface-1)] backdrop-blur-md border border-[var(--fc-border-default)] rounded-xl p-3 shadow-2xl text-xs flex items-center gap-2.5 z-10"
      >
        <div className="w-7 h-7 rounded-full bg-[var(--fc-accent)] text-[var(--fc-accent-contrast)] font-bold flex items-center justify-center text-xs shadow-md">
          {sharedNotebook.debtorName[0]}
        </div>
        <div>
          <p className="text-[var(--fc-text-primary)] font-semibold text-xs">{sharedNotebook.debtorName} deve {sharedNotebook.debtorShareDisplay}</p>
          <p className="text-[10px] text-[var(--fc-success)] flex items-center gap-1 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--fc-success)]" />
            Aguardando transferência Pix
          </p>
        </div>
      </div>

      {/* Layer 4: Floating Chip 2 (Exact Math - Bottom Left) */}
      <div
        ref={chipMathRef}
        className="absolute -bottom-3 -left-2 md:-left-6 bg-[var(--fc-surface-1)] backdrop-blur-md border border-[var(--fc-border-default)] rounded-xl p-3 shadow-2xl text-xs flex items-center gap-2.5 z-10"
      >
        <div className="w-7 h-7 rounded-lg bg-[var(--fc-success-subtle)] border border-[var(--fc-border-subtle)] text-[var(--fc-success)] flex items-center justify-center text-sm shadow-inner">
          <FiShield className="w-4 h-4" />
        </div>
        <div>
          <p className="text-[var(--fc-text-primary)] font-semibold text-xs flex items-center gap-1">
            Precisão em cada centavo
            <span className="text-[var(--fc-success)] text-[10px]">✓</span>
          </p>
          <p className="text-[10px] text-[var(--fc-text-secondary)]">
            Sem resíduo de arredondamento: <span className="text-[var(--fc-accent)] font-mono">R$ 0,00</span>
          </p>
        </div>
      </div>
    </div>
  );
});

export default LivingLedgerStage;
