// src/features/landing/components/SharedPurchaseSection.jsx
import React, { useState, useId } from 'react';
import { FiUsers, FiCheck, FiShield } from 'react-icons/fi';
import {
  parseCurrencyToCents,
  splitExactCents,
  formatCentsDisplay,
  formatCentsForInput,
  MAX_INPUT_LENGTH,
} from '../lib/splitExactCents';

export default function SharedPurchaseSection() {
  const [inputValue, setInputValue] = useState('1.000,00');
  const [peopleCount, setPeopleCount] = useState(3);

  const inputId = useId();
  const helpId = useId();

  const totalCents = parseCurrencyToCents(inputValue);
  const splitResult = totalCents !== null ? splitExactCents(totalCents, peopleCount) : null;

  const handleChange = (e) => {
    const val = e.target.value;
    if (val.length <= MAX_INPUT_LENGTH) {
      setInputValue(val);
    }
  };

  const handleBlur = () => {
    if (totalCents !== null) {
      setInputValue(formatCentsForInput(totalCents));
    }
  };

  const mockNames = ['Você', 'Lucas', 'Mariana', 'Beatriz', 'Felipe'];

  return (
    <section id="shared-purchases" className="py-24 scroll-mt-20 bg-[var(--fc-bg)] relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Column: Explanatory & Math Integrity */}
          <div className="lg:col-span-6">
            <span className="text-xs font-semibold text-[var(--fc-accent)] uppercase tracking-wider px-3 py-1 rounded-full bg-[var(--fc-accent-soft)] border border-[var(--fc-accent)]/20">
              Engenharia de Divisão
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[var(--fc-text-primary)] mt-4 mb-4 tracking-tight leading-tight">
              Fim das discussões de "quem deve quanto" no final do mês.
            </h2>
            <p className="text-[var(--fc-text-secondary)] text-base leading-relaxed mb-6">
              Quando você passa uma compra conjunta no seu cartão de crédito (uma viagem, o jantar com amigos, ou uma assinatura compartilhada), o FinControl calcula a fração exata de cada um sem deixar centavos perdidos no limbo.
            </p>

            <div className="space-y-3.5 mb-8">
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-[var(--fc-success-soft)] border border-[var(--fc-success)]/30 text-[var(--fc-success)] flex items-center justify-center shrink-0 mt-0.5">
                  <FiCheck className="w-3 h-3" />
                </div>
                <p className="text-sm text-[var(--fc-text-secondary)]">
                  <strong className="text-[var(--fc-text-primary)]">Precisão em Cada Centavo:</strong> A soma das partes sempre resulta rigorosamente no valor total da transação.
                </p>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-[var(--fc-accent-soft)] border border-[var(--fc-accent)]/30 text-[var(--fc-accent)] flex items-center justify-center shrink-0 mt-0.5">
                  <FiCheck className="w-3 h-3" />
                </div>
                <p className="text-sm text-[var(--fc-text-secondary)]">
                  <strong className="text-[var(--fc-text-primary)]">Controle de Reembolsos:</strong> Saiba quem já fez o Pix e quem ainda está com o pagamento pendente.
                </p>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-[var(--fc-info-soft)] border border-[var(--fc-info)]/30 text-[var(--fc-info)] flex items-center justify-center shrink-0 mt-0.5">
                  <FiCheck className="w-3 h-3" />
                </div>
                <p className="text-sm text-[var(--fc-text-secondary)]">
                  <strong className="text-[var(--fc-text-primary)]">Parcelamentos Compartilhados:</strong> Se a compra for parcelada, o FinControl projeta a cobrança mês a mês para todos.
                </p>
              </div>
            </div>

            <div className="inline-flex items-center gap-2 p-3 rounded-xl bg-[var(--fc-surface-1)] border border-[var(--fc-border-subtle)] text-xs text-[var(--fc-text-secondary)]">
              <FiShield className="text-[var(--fc-accent)] w-4 h-4 shrink-0" />
              <span>Cálculos realizados com validação exata em centavos no FinControl.</span>
            </div>
          </div>

          {/* Right Column: Live Interactive Split Simulator */}
          <div className="lg:col-span-6 fc-glass-card rounded-2xl border border-[var(--fc-border-default)] p-6 md:p-8 shadow-[var(--fc-shadow-lg)] relative group">
            
            {/* Ambient Background Glow */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-[var(--fc-glow-cool)] rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-center justify-between mb-6 pb-4 border-b border-[var(--fc-border-subtle)]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[var(--fc-accent-soft)] border border-[var(--fc-accent)]/30 flex items-center justify-center text-[var(--fc-accent)]">
                  <FiUsers className="w-4 h-4" />
                </div>
                <span className="text-sm font-bold text-[var(--fc-text-primary)]">Simulador de Divisão Exata</span>
                <span className="text-[10px] font-medium text-[var(--fc-text-muted)] px-1.5 py-0.5 rounded bg-[var(--fc-surface-2)]">
                  Dados de exemplo
                </span>
              </div>
              <span className="text-[11px] font-semibold text-[var(--fc-success)] bg-[var(--fc-success-soft)] px-2.5 py-0.5 rounded-full border border-[var(--fc-success)]/30">
                Exatidão Ativa
              </span>
            </div>

            {/* Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div>
                <label
                  htmlFor={inputId}
                  className="block text-xs font-medium text-[var(--fc-text-secondary)] mb-2"
                >
                  Valor Total da Compra (R$)
                </label>
                <div className="relative flex items-center bg-[var(--fc-surface-2)] border border-[var(--fc-border-default)] rounded-xl focus-within:border-[var(--fc-accent)] focus-within:ring-1 focus-within:ring-[var(--fc-accent)] transition-colors">
                  <span className="pl-3 pr-1 text-xs font-medium text-[var(--fc-text-muted)] select-none">
                    R$
                  </span>
                  <input
                    id={inputId}
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    value={inputValue}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder="1.000,00"
                    aria-describedby={helpId}
                    className="w-full bg-transparent border-0 py-2.5 pr-3 text-sm text-[var(--fc-text-primary)] focus:outline-none tabular-nums"
                  />
                </div>
                <span id={helpId} className="sr-only">
                  Digite o valor total em reais para calcular a divisão exata em centavos
                </span>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--fc-text-secondary)] mb-2">
                  Pessoas na Divisão ({peopleCount})
                </label>
                <div
                  role="group"
                  aria-label="Pessoas na divisão"
                  className="flex items-center gap-2"
                >
                  {[2, 3, 4, 5].map((cnt) => (
                    <button
                      key={cnt}
                      type="button"
                      onClick={() => setPeopleCount(cnt)}
                      aria-pressed={peopleCount === cnt}
                      aria-label={`${cnt} pessoas`}
                      className={`min-h-[44px] min-w-[44px] flex-1 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                        peopleCount === cnt
                          ? 'bg-[var(--fc-accent)] text-[var(--fc-accent-contrast)] shadow-sm'
                          : 'bg-[var(--fc-surface-2)] text-[var(--fc-text-secondary)] hover:text-[var(--fc-text-primary)] border border-[var(--fc-border-subtle)]'
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
              <div className="text-xs font-semibold text-[var(--fc-text-secondary)] uppercase tracking-wider mb-2">
                Resultado por Pessoa:
              </div>
              <div aria-live="polite" className="space-y-2.5">
                {splitResult ? (
                  splitResult.sharesCents.map((shareCents, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 rounded-xl bg-[var(--fc-surface-2)] border border-[var(--fc-border-subtle)]"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-6 h-6 rounded-full bg-[var(--fc-accent-soft)] text-xs font-bold text-[var(--fc-accent)] flex items-center justify-center">
                          {idx + 1}
                        </div>
                        <span className="text-xs font-medium text-[var(--fc-text-primary)]">
                          {mockNames[idx] || `Pessoa ${idx + 1}`}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold text-[var(--fc-text-primary)] font-mono tabular-nums">
                          {formatCentsDisplay(shareCents)}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  Array.from({ length: peopleCount }).map((_, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 rounded-xl bg-[var(--fc-surface-2)] border border-[var(--fc-border-subtle)] opacity-70"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-6 h-6 rounded-full bg-[var(--fc-surface-1)] text-xs font-bold text-[var(--fc-text-muted)] flex items-center justify-center">
                          {idx + 1}
                        </div>
                        <span className="text-xs font-medium text-[var(--fc-text-muted)]">
                          {mockNames[idx] || `Pessoa ${idx + 1}`}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-medium text-[var(--fc-text-muted)] italic">
                          Informe um valor
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Math Audit Box */}
            <div className="p-4 rounded-xl bg-[var(--fc-surface-2)] border border-[var(--fc-border-subtle)] flex items-center justify-between">
              <div>
                <span className="text-[10px] text-[var(--fc-text-muted)] uppercase block">Soma das Parcelas</span>
                <span className="text-sm font-bold text-[var(--fc-success)] font-mono tabular-nums">
                  {splitResult ? formatCentsDisplay(splitResult.sumCents) : '—'}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-[var(--fc-text-muted)] uppercase block">Diferença Residual</span>
                <span className="text-sm font-bold text-[var(--fc-accent)] font-mono tabular-nums">
                  {splitResult ? formatCentsDisplay(splitResult.driftCents) : '—'}
                </span>
              </div>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
}
