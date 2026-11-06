// src/features/landing/components/FinancialControlSection.jsx
import React, { useState } from 'react';
import { FiCalendar, FiClock } from 'react-icons/fi';
import { sampleData } from '../lib/sampleData';

export default function FinancialControlSection() {
  const [activeTab, setActiveTab] = useState('invoices');
  const { cards: cardsData, installments: installmentsData, subscriptions: subscriptionsData } = sampleData;

  return (
    <section className="py-24 bg-[var(--fc-bg)] relative overflow-hidden">
      {/* Subtle Radial Atmosphere */}
      <div className="absolute top-1/3 right-10 w-[600px] h-[400px] bg-[var(--fc-glow-cool)] rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-semibold text-[var(--fc-accent)] uppercase tracking-wider px-3 py-1 rounded-full bg-[var(--fc-accent-soft)] border border-[var(--fc-accent)]/20">
                Controle Fiel à Realidade
              </span>
              <span className="text-[10px] font-medium text-[var(--fc-text-muted)] px-2 py-0.5 rounded-md bg-[var(--fc-surface-2)] border border-[var(--fc-border-subtle)]">
                Dados de exemplo
              </span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[var(--fc-text-primary)] mt-3 tracking-tight">
              Visão Panorâmica de Todos os Seus Compromissos
            </h2>
            <p className="text-[var(--fc-text-secondary)] text-sm sm:text-base mt-2 max-w-xl">
              Cada cartão opera com seu próprio ciclo. O FinControl consolida tudo sem misturar datas ou perder o rastro de despesas futuras.
            </p>
          </div>

          {/* Tab Switcher */}
          <div className="inline-flex p-1 rounded-xl bg-[var(--fc-surface-2)] border border-[var(--fc-border-subtle)] shrink-0 self-start md:self-auto">
            <button
              type="button"
              onClick={() => setActiveTab('invoices')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'invoices'
                  ? 'bg-[var(--fc-accent)] text-[var(--fc-accent-contrast)] shadow-sm font-bold'
                  : 'text-[var(--fc-text-secondary)] hover:text-[var(--fc-text-primary)]'
              }`}
            >
              Faturas por Cartão
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('installments')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'installments'
                  ? 'bg-[var(--fc-accent)] text-[var(--fc-accent-contrast)] shadow-sm font-bold'
                  : 'text-[var(--fc-text-secondary)] hover:text-[var(--fc-text-primary)]'
              }`}
            >
              Parcelamentos
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('subscriptions')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'subscriptions'
                  ? 'bg-[var(--fc-accent)] text-[var(--fc-accent-contrast)] shadow-sm font-bold'
                  : 'text-[var(--fc-text-secondary)] hover:text-[var(--fc-text-primary)]'
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
                className="fc-glass-card rounded-2xl border border-[var(--fc-border-subtle)] p-6 hover:border-[var(--fc-border-strong)] transition-all duration-300 shadow-[var(--fc-shadow-md)]"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-medium text-[var(--fc-text-secondary)]">{c.type}</span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${c.statusColor}`}>
                    {c.status}
                  </span>
                </div>

                <div className="text-lg font-bold text-[var(--fc-text-primary)] mb-1">{c.brand}</div>
                <div className="text-2xl font-extrabold text-[var(--fc-text-primary)] mb-5 tracking-tight">
                  {c.totalDisplay}
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-4 border-t border-[var(--fc-border-subtle)] text-[var(--fc-text-secondary)]">
                  <div>
                    <span className="block text-[10px] uppercase text-[var(--fc-text-muted)]">Fechamento</span>
                    <span className="text-[var(--fc-text-primary)] font-medium">{c.closeDate}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase text-[var(--fc-text-muted)]">Vencimento</span>
                    <span className="text-[var(--fc-text-primary)] font-medium">{c.dueDate}</span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-[var(--fc-border-subtle)] flex items-center justify-between text-xs">
                  <span className="text-[var(--fc-text-secondary)]">Limite Comprometido</span>
                  <span className="font-semibold text-[var(--fc-accent)]">{c.limitUsed}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab 2: Installments */}
        {activeTab === 'installments' && (
          <div className="fc-glass-card rounded-2xl border border-[var(--fc-border-subtle)] overflow-hidden shadow-[var(--fc-shadow-md)] animate-in fade-in duration-300">
            <div className="p-6 divide-y divide-[var(--fc-border-subtle)] space-y-4">
              {installmentsData.map((item, idx) => (
                <div key={idx} className="pt-4 first:pt-0 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-[var(--fc-surface-2)] border border-[var(--fc-border-default)] flex items-center justify-center text-[var(--fc-accent)] shrink-0">
                      <FiCalendar className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-[var(--fc-text-primary)] flex items-center gap-2">
                        {item.title}
                        {item.completed && (
                          <span className="text-[10px] bg-[var(--fc-success-soft)] text-[var(--fc-success)] px-2 py-0.5 rounded-full font-bold">
                            Quitado
                          </span>
                        )}
                      </h4>
                      <p className="text-xs text-[var(--fc-text-secondary)]">
                        Parcela {item.installments} • Término: {item.finishDate}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 self-end md:self-auto">
                    <div className="text-right">
                      <span className="text-[10px] text-[var(--fc-text-muted)] block">Valor da Parcela</span>
                      <span className="text-sm font-bold text-[var(--fc-text-primary)]">{item.installment}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-[var(--fc-text-muted)] block">Saldo Restante</span>
                      <span className="text-sm font-bold text-[var(--fc-accent)]">{item.remaining}</span>
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
                className="p-5 rounded-2xl fc-glass-card border border-[var(--fc-border-subtle)] hover:border-[var(--fc-border-strong)] transition-all shadow-[var(--fc-shadow-md)]"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-8 h-8 rounded-lg bg-[var(--fc-info-soft)] border border-[var(--fc-info)]/20 flex items-center justify-center text-[var(--fc-info)]">
                    <FiClock className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-semibold text-[var(--fc-text-secondary)] bg-[var(--fc-surface-2)] px-2 py-0.5 rounded-full">
                    {sub.frequency}
                  </span>
                </div>

                <div className="text-sm font-semibold text-[var(--fc-text-primary)] mb-1">{sub.name}</div>
                <div className="text-lg font-bold text-[var(--fc-text-primary)] mb-3">{sub.amount}</div>

                <div className="text-[11px] text-[var(--fc-text-secondary)] pt-3 border-t border-[var(--fc-border-subtle)] flex items-center justify-between">
                  <span>Cobrado no:</span>
                  <span className="text-[var(--fc-text-primary)] font-medium">{sub.card}</span>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </section>
  );
}
