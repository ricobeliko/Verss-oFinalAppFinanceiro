// src/features/landing/components/SharedPurchaseSection.jsx
import React, { useState, useId } from 'react';
import { FiUsers, FiCheck, FiShield, FiAlertCircle } from 'react-icons/fi';
import {
  parseCurrencyToCents,
  splitSharedPurchaseTwoPeople,
  formatCentsDisplay,
  formatCentsForInput,
  MAX_INPUT_LENGTH,
} from '../lib/splitExactCents';

export default function SharedPurchaseSection() {
  const [totalInput, setTotalInput] = useState('1.000,00');
  const [splitMode, setSplitMode] = useState('half'); // 'half' | 'custom'
  const [person1Input, setPerson1Input] = useState('500,00');
  const [installments, setInstallments] = useState(1);

  const totalInputId = useId();
  const person1InputId = useId();
  const totalHelpId = useId();
  const person1HelpId = useId();

  const totalCents = parseCurrencyToCents(totalInput);
  const person1Cents = splitMode === 'custom' ? parseCurrencyToCents(person1Input) : null;

  const result = totalCents !== null
    ? splitSharedPurchaseTwoPeople({
        totalCents,
        mode: splitMode,
        person1CentsInput: person1Cents,
        installmentsCount: installments,
      })
    : null;

  const handleTotalChange = (e) => {
    const val = e.target.value;
    if (val.length <= MAX_INPUT_LENGTH) {
      setTotalInput(val);
    }
  };

  const handleTotalBlur = () => {
    if (totalCents !== null) {
      setTotalInput(formatCentsForInput(totalCents));
    }
  };

  const handlePerson1Change = (e) => {
    const val = e.target.value;
    if (val.length <= MAX_INPUT_LENGTH) {
      setPerson1Input(val);
    }
  };

  const handlePerson1Blur = () => {
    if (person1Cents !== null) {
      setPerson1Input(formatCentsForInput(person1Cents));
    }
  };

  const installmentOptions = [1, 2, 3, 6, 10, 12];

  return (
    <section id="shared-purchases" className="py-24 scroll-mt-20 bg-[var(--fc-bg)] relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Column: Product Proof & App-identical Rule */}
          <div className="lg:col-span-6">
            <span className="text-xs font-semibold text-[var(--fc-accent)] uppercase tracking-wider px-3 py-1 rounded-full bg-[var(--fc-accent-soft)] border border-[var(--fc-accent)]/20">
              Compra Compartilhada Fiel ao App
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[var(--fc-text-primary)] mt-4 mb-4 tracking-tight leading-tight">
              Divisão exata entre duas pessoas com cálculo de parcelas sem centavos perdidos.
            </h2>
            <p className="text-[var(--fc-text-secondary)] text-base leading-relaxed mb-6">
              No FinControl, uma compra compartilhada divide o valor total entre duas pessoas: você define a fração da primeira pessoa (ou divide meio a meio) e a segunda pessoa fica com o complemento exato.
            </p>

            <div className="space-y-3.5 mb-8">
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-[var(--fc-success-soft)] border border-[var(--fc-success)]/30 text-[var(--fc-success)] flex items-center justify-center shrink-0 mt-0.5">
                  <FiCheck className="w-3 h-3" />
                </div>
                <p className="text-sm text-[var(--fc-text-secondary)]">
                  <strong className="text-[var(--fc-text-primary)]">Complemento Rigoroso:</strong> O valor da Pessoa 2 é rigorosamente o total menos a Pessoa 1 em centavos inteiros.
                </p>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-[var(--fc-accent-soft)] border border-[var(--fc-accent)]/30 text-[var(--fc-accent)] flex items-center justify-center shrink-0 mt-0.5">
                  <FiCheck className="w-3 h-3" />
                </div>
                <p className="text-sm text-[var(--fc-text-secondary)]">
                  <strong className="text-[var(--fc-text-primary)]">Resíduo na Última Parcela:</strong> Quando a divisão do parcelamento gera resto, o centavo residual é absorvido na última parcela.
                </p>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-[var(--fc-info-soft)] border border-[var(--fc-info)]/30 text-[var(--fc-info)] flex items-center justify-center shrink-0 mt-0.5">
                  <FiCheck className="w-3 h-3" />
                </div>
                <p className="text-sm text-[var(--fc-text-secondary)]">
                  <strong className="text-[var(--fc-text-primary)]">Zero Drift Financeiro:</strong> A soma das parcelas de cada pessoa fecha 100% com o total da transação.
                </p>
              </div>
            </div>

            <div className="inline-flex items-center gap-2 p-3 rounded-xl bg-[var(--fc-surface-1)] border border-[var(--fc-border-subtle)] text-xs text-[var(--fc-text-secondary)]">
              <FiShield className="text-[var(--fc-accent)] w-4 h-4 shrink-0" />
              <span>Mesma regra de divisão usada no FinControl: a segunda pessoa fica sempre com o valor restante exato, e o centavo residual vai para a última parcela.</span>
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
                <span className="text-sm font-bold text-[var(--fc-text-primary)]">Simulador de Compra Compartilhada</span>
                <span className="text-[10px] font-medium text-[var(--fc-text-muted)] px-1.5 py-0.5 rounded bg-[var(--fc-surface-2)]">
                  Dados de exemplo
                </span>
              </div>
              <span className="text-[11px] font-semibold text-[var(--fc-success)] bg-[var(--fc-success-soft)] px-2.5 py-0.5 rounded-full border border-[var(--fc-success)]/30">
                2 Pessoas
              </span>
            </div>

            {/* Total Input & Mode Switch */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label
                  htmlFor={totalInputId}
                  className="block text-xs font-medium text-[var(--fc-text-secondary)] mb-2"
                >
                  Valor Total da Compra (R$)
                </label>
                <div className="relative flex items-center bg-[var(--fc-surface-2)] border border-[var(--fc-border-default)] rounded-xl focus-within:border-[var(--fc-accent)] focus-within:ring-1 focus-within:ring-[var(--fc-accent)] transition-colors">
                  <span className="pl-3 pr-1 text-xs font-medium text-[var(--fc-text-muted)] select-none">
                    R$
                  </span>
                  <input
                    id={totalInputId}
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    value={totalInput}
                    onChange={handleTotalChange}
                    onBlur={handleTotalBlur}
                    placeholder="1.000,00"
                    aria-describedby={totalHelpId}
                    className="w-full bg-transparent border-0 py-2.5 pr-3 text-sm text-[var(--fc-text-primary)] focus:outline-none tabular-nums"
                  />
                </div>
                <span id={totalHelpId} className="sr-only">
                  Digite o valor total em reais para calcular a divisão entre duas pessoas
                </span>
              </div>

              <div>
                <span className="block text-xs font-medium text-[var(--fc-text-secondary)] mb-2">
                  Modo de Rateio
                </span>
                <div
                  role="group"
                  aria-label="Modo de divisão entre duas pessoas"
                  className="flex items-center gap-2"
                >
                  <button
                    type="button"
                    onClick={() => setSplitMode('half')}
                    aria-pressed={splitMode === 'half'}
                    className={`min-h-[44px] flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                      splitMode === 'half'
                        ? 'bg-[var(--fc-accent)] text-[var(--fc-accent-contrast)] shadow-sm'
                        : 'bg-[var(--fc-surface-2)] text-[var(--fc-text-secondary)] hover:text-[var(--fc-text-primary)] border border-[var(--fc-border-subtle)]'
                    }`}
                  >
                    Meio a meio
                  </button>
                  <button
                    type="button"
                    onClick={() => setSplitMode('custom')}
                    aria-pressed={splitMode === 'custom'}
                    className={`min-h-[44px] flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                      splitMode === 'custom'
                        ? 'bg-[var(--fc-accent)] text-[var(--fc-accent-contrast)] shadow-sm'
                        : 'bg-[var(--fc-surface-2)] text-[var(--fc-text-secondary)] hover:text-[var(--fc-text-primary)] border border-[var(--fc-border-subtle)]'
                    }`}
                  >
                    Definir Pessoa 1
                  </button>
                </div>
              </div>
            </div>

            {/* Custom Person 1 Input Field (When mode === 'custom') */}
            {splitMode === 'custom' && (
              <div className="mb-4 animate-in fade-in duration-200">
                <label
                  htmlFor={person1InputId}
                  className="block text-xs font-medium text-[var(--fc-text-secondary)] mb-2"
                >
                  Valor da Pessoa 1 (Você)
                </label>
                <div className="relative flex items-center bg-[var(--fc-surface-2)] border border-[var(--fc-border-default)] rounded-xl focus-within:border-[var(--fc-accent)] focus-within:ring-1 focus-within:ring-[var(--fc-accent)] transition-colors">
                  <span className="pl-3 pr-1 text-xs font-medium text-[var(--fc-text-muted)] select-none">
                    R$
                  </span>
                  <input
                    id={person1InputId}
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    value={person1Input}
                    onChange={handlePerson1Change}
                    onBlur={handlePerson1Blur}
                    placeholder="500,00"
                    aria-describedby={person1HelpId}
                    className="w-full bg-transparent border-0 py-2.5 pr-3 text-sm text-[var(--fc-text-primary)] focus:outline-none tabular-nums"
                  />
                </div>
                <span id={person1HelpId} className="sr-only">
                  Digite a parte da Pessoa 1; a Pessoa 2 receberá o valor restante exato
                </span>
              </div>
            )}

            {/* Installments Selector */}
            <div className="mb-6">
              <span className="block text-xs font-medium text-[var(--fc-text-secondary)] mb-2">
                Parcelas da Compra ({installments}x)
              </span>
              <div
                role="group"
                aria-label="Número de parcelas"
                className="grid grid-cols-3 sm:grid-cols-6 gap-2"
              >
                {installmentOptions.map((cnt) => (
                  <button
                    key={cnt}
                    type="button"
                    onClick={() => setInstallments(cnt)}
                    aria-pressed={installments === cnt}
                    aria-label={`${cnt} parcelas`}
                    className={`min-h-[44px] min-w-[44px] py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                      installments === cnt
                        ? 'bg-[var(--fc-accent)] text-[var(--fc-accent-contrast)] shadow-sm'
                        : 'bg-[var(--fc-surface-2)] text-[var(--fc-text-secondary)] hover:text-[var(--fc-text-primary)] border border-[var(--fc-border-subtle)]'
                    }`}
                  >
                    {cnt}x
                  </button>
                ))}
              </div>
            </div>

            {/* Error Message if Person 1 > Total */}
            {result?.error && (
              <div className="mb-4 p-3 rounded-xl bg-[var(--fc-danger-soft)] border border-[var(--fc-danger)]/30 text-xs text-[var(--fc-danger)] flex items-center gap-2">
                <FiAlertCircle className="w-4 h-4 shrink-0" />
                <span>{result.error}</span>
              </div>
            )}

            {/* Results Output */}
            <div className="space-y-2.5 mb-6">
              <div className="text-xs font-semibold text-[var(--fc-text-secondary)] uppercase tracking-wider mb-2">
                Resultado por Pessoa:
              </div>
              <div aria-live="polite" className="space-y-2.5">
                {result && !result.error ? (
                  [result.person1, result.person2].map((person, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl bg-[var(--fc-surface-2)] border border-[var(--fc-border-subtle)] flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-[var(--fc-accent-soft)] text-xs font-bold text-[var(--fc-accent)] flex items-center justify-center shrink-0">
                          {idx + 1}
                        </div>
                        <div>
                          <span className="text-xs font-semibold text-[var(--fc-text-primary)] block">
                            {person.name}
                          </span>
                          <span className="text-[11px] text-[var(--fc-text-secondary)] tabular-nums">
                            {person.plan.summaryText}
                          </span>
                        </div>
                      </div>
                      <div className="text-right self-end sm:self-auto">
                        <span className="text-sm font-bold text-[var(--fc-text-primary)] tabular-nums">
                          {person.display}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-4 rounded-xl bg-[var(--fc-surface-2)] border border-[var(--fc-border-subtle)] text-center text-xs text-[var(--fc-text-muted)] italic">
                    {result?.error ? 'Corrija o valor acima para ver o resultado' : 'Informe um valor para simular a divisão'}
                  </div>
                )}
              </div>
            </div>

            {/* Math Audit Box */}
            <div className="p-4 rounded-xl bg-[var(--fc-surface-2)] border border-[var(--fc-border-subtle)] flex items-center justify-between">
              <div>
                <span className="text-[10px] text-[var(--fc-text-muted)] uppercase block">Soma das Partes</span>
                <span className="text-sm font-bold text-[var(--fc-success)] tabular-nums">
                  {result && !result.error ? formatCentsDisplay(result.sumCents) : '—'}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-[var(--fc-text-muted)] uppercase block">Diferença Residual</span>
                <span className="text-sm font-bold text-[var(--fc-accent)] tabular-nums">
                  {result && !result.error ? formatCentsDisplay(result.driftCents) : '—'}
                </span>
              </div>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
}
