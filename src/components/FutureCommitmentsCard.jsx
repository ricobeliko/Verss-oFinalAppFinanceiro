// src/components/FutureCommitmentsCard.jsx
import React, { useState, useMemo } from 'react';
import { formatCurrencyDisplay } from '../utils/currency';
import AnimatedCurrency from './AnimatedCurrency';
import {
  calculateDebtReliefTimeline,
  calculateFutureCommitmentsForPerson,
  filterCommitmentsForPerson,
} from '../services/financialService';

/**
 * Card de Projeção de Compromissos Futuros e Curva de Descompressão por Pessoa.
 *
 * @param {Object} props
 * @param {Array<Object>} props.loans - Compras parceladas
 * @param {Array<Object>} props.subscriptions - Assinaturas ativas
 * @param {string} props.selectedMonth - Mês de competência selecionado 'YYYY-MM'
 * @param {Array<Object>} [props.clients=[]] - Lista de pessoas cadastradas
 * @param {string} [props.selectedClientName=''] - Nome de cliente opcional (retrocompatibilidade)
 */
export default function FutureCommitmentsCard({
  loans = [],
  subscriptions = [],
  selectedMonth,
  clients = [],
  selectedClientName = '',
}) {
  const [selectedPersonId, setSelectedPersonId] = useState('all');

  // Determina lista de pessoas com compromissos para exibir no seletor
  const peopleOptions = useMemo(() => {
    const list = [{ id: 'all', label: 'Todos' }];

    if (Array.isArray(clients) && clients.length > 0) {
      clients.forEach((client) => {
        if (client && client.id) {
          list.push({ id: client.id, label: client.name || 'Pessoa' });
        }
      });
    }

    // Verifica se existem compromissos sem vínculo com pessoa
    const { loans: unassignedLoans, subscriptions: unassignedSubs } = filterCommitmentsForPerson({
      loans,
      subscriptions,
      personId: 'unassigned',
      knownClientIds: clients,
    });

    if (unassignedLoans.length > 0 || unassignedSubs.length > 0) {
      list.push({ id: 'unassigned', label: 'Sem atribuição' });
    }

    return list;
  }, [clients, loans, subscriptions]);

  // Nome selecionado dinamicamente
  const activePersonLabel = useMemo(() => {
    if (selectedPersonId === 'all') return selectedClientName || '';
    const match = peopleOptions.find((p) => p.id === selectedPersonId);
    return match ? match.label : '';
  }, [selectedPersonId, selectedClientName, peopleOptions]);

  // Filtra compras para a pessoa ativa (para cálculo de alívio)
  const { loans: activeLoans } = useMemo(() => {
    return filterCommitmentsForPerson({
      knownClientIds: clients,
      loans,
      subscriptions,
      personId: selectedPersonId,
    });
  }, [loans, subscriptions, selectedPersonId, clients]);

  // Projeção dos próximos 4 meses
  const projection = useMemo(() => {
    return calculateFutureCommitmentsForPerson({
      knownClientIds: clients,
      loans,
      subscriptions,
      startMonth: selectedMonth,
      monthsCount: 4,
      personId: selectedPersonId,
    });
  }, [loans, subscriptions, selectedMonth, selectedPersonId, clients]);

  // Curva de descompressão financeira (alívio com fim de parcelas)
  const relief = useMemo(() => {
    return calculateDebtReliefTimeline({
      loans: activeLoans,
      startMonth: selectedMonth,
      monthsCount: 4,
    });
  }, [activeLoans, selectedMonth]);

  // Máximo comprometido para cálculo relativo da barra visual
  const maxCommitment = useMemo(() => {
    if (!projection || projection.length === 0) return 1;
    const max = Math.max(...projection.map((p) => p.totalCommitted || 0));
    return max > 0 ? max : 1;
  }, [projection]);

  if (!selectedMonth || projection.length === 0) return null;

  return (
    <div
      data-enter="item"
      className="bg-[var(--fc-surface-1)] border border-[var(--fc-border-default)] p-6 rounded-3xl shadow-[var(--fc-shadow-md)] space-y-5 animate-fadeIn"
    >
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--fc-border-subtle)] pb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[var(--fc-accent-soft)] text-[var(--fc-accent)] flex items-center justify-center font-bold text-lg border border-[var(--fc-accent)]/20 shrink-0">
            🔮
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-[var(--fc-text-primary)] tracking-tight">
                Projeção dos Próximos Meses
              </h3>
              {activePersonLabel && activePersonLabel !== 'Todos' && (
                <span className="px-2 py-0.5 rounded-full bg-[var(--fc-accent-soft)] text-[var(--fc-accent)] text-[11px] font-semibold border border-[var(--fc-accent)]/20">
                  {activePersonLabel}
                </span>
              )}
            </div>
            <p className="text-xs text-[var(--fc-text-secondary)]">
              {activePersonLabel && activePersonLabel !== 'Todos'
                ? `Compromissos atribuídos a ${activePersonLabel} (Parcelas + Assinaturas)`
                : 'Compromissos contratuais já registrados (Parcelas + Assinaturas)'}
            </p>
          </div>
        </div>

        {relief.totalLoansEnding > 0 && (
          <div className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1 bg-[var(--fc-success-soft)] border border-[var(--fc-success)]/20 text-[var(--fc-success)] text-xs font-semibold rounded-xl">
            <span>↓</span>
            <span>
              {relief.totalLoansEnding}{' '}
              {relief.totalLoansEnding === 1 ? 'compra encerra' : 'compras encerram'} (-
              {formatCurrencyDisplay(relief.totalMonthlyRelief)}/mês)
            </span>
          </div>
        )}
      </div>

      {/* Seletor Segmentado de Pessoas (Acessível com Rolagem Horizontal Suave) */}
      {peopleOptions.length > 1 && (
        <div
          role="group"
          aria-label="Filtrar projeção por pessoa"
          className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1"
        >
          {peopleOptions.map((person) => {
            const isSelected = selectedPersonId === person.id;
            return (
              <button
                key={person.id}
                type="button"
                aria-pressed={isSelected}
                aria-label={`Filtrar projeção para ${person.label}`}
                onClick={() => setSelectedPersonId(person.id)}
                className={`min-h-[36px] px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer whitespace-nowrap select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--fc-focus-ring)] ${
                  isSelected
                    ? 'bg-[var(--fc-accent-soft)] text-[var(--fc-accent)] border border-[var(--fc-accent)]/40 shadow-sm'
                    : 'bg-[var(--fc-surface-2)] text-[var(--fc-text-secondary)] hover:text-[var(--fc-text-primary)] hover:bg-[var(--fc-surface-3)] border border-[var(--fc-border-subtle)]'
                }`}
              >
                {person.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Grid dos Meses Projetados com Contadores Vivos Zero-Drift */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {projection.map((item, index) => {
          const isCurrent = index === 0;
          const barPct = Math.min(
            100,
            Math.max(4, Math.round(((item.totalCommitted || 0) / maxCommitment) * 100))
          );

          return (
            <div
              key={item.month}
              className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                isCurrent
                  ? 'bg-[var(--fc-accent-soft)] border-[var(--fc-accent)]/40 shadow-[var(--fc-shadow-sm)]'
                  : 'bg-[var(--fc-surface-2)] border-[var(--fc-border-subtle)] hover:border-[var(--fc-border-default)]'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`text-xs font-bold uppercase tracking-wider ${
                      isCurrent ? 'text-[var(--fc-accent)]' : 'text-[var(--fc-text-secondary)]'
                    }`}
                  >
                    {item.label}
                  </span>
                  {isCurrent && (
                    <span className="text-[10px] uppercase font-extrabold bg-[var(--fc-accent)]/20 text-[var(--fc-accent)] px-1.5 py-0.5 rounded-md">
                      Atual
                    </span>
                  )}
                </div>

                <div className="text-lg font-black tracking-tight text-[var(--fc-text-primary)] mt-1">
                  <AnimatedCurrency value={item.totalCommitted} />
                </div>

                {/* Barra de Progresso Visual de Descompressão */}
                <div className="w-full bg-[var(--fc-surface-3)] h-1.5 rounded-full overflow-hidden mt-2.5">
                  <div
                    className="bg-[var(--fc-accent)] h-full rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${barPct}%` }}
                    aria-hidden="true"
                  />
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-[var(--fc-border-subtle)] text-[11px] space-y-1">
                <div className="flex justify-between text-[var(--fc-text-secondary)]">
                  <span>Parcelas:</span>
                  <span className="text-[var(--fc-text-primary)] font-mono">
                    <AnimatedCurrency value={item.installmentsTotal} />
                  </span>
                </div>
                {item.subscriptionsTotal > 0 && (
                  <div className="flex justify-between text-[var(--fc-text-secondary)]">
                    <span>Fixos:</span>
                    <span className="text-[var(--fc-text-primary)] font-mono">
                      <AnimatedCurrency value={item.subscriptionsTotal} />
                    </span>
                  </div>
                )}
                {item.endingLoansCount > 0 && (
                  <div className="text-[10px] text-[var(--fc-success)] font-medium pt-1">
                    🎉 {item.endingLoansCount}{' '}
                    {item.endingLoansCount === 1 ? 'finaliza' : 'finalizam'}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
