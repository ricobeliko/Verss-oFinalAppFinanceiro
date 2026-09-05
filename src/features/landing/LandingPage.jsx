// src/pages/LandingPage.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

// --- Ícones embutidos como componentes React ---

const MenuIcon = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>
);

const XIcon = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
);

const FinControlLogo = ({ className }) => (
  <svg className={className} width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const FeatureIcon = ({ children }) => (
  <div className="bg-gold/10 text-gold rounded-2xl h-14 w-14 flex items-center justify-center mb-4 mx-auto border border-gold/20 shadow-lg shadow-gold/10">
    {children}
  </div>
);

const ChartIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>;
const CreditCardIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>;
const UsersIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
const CheckIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>;

// --- Componente Principal da Landing Page ---

export default function LandingPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [demoCarlosPaid, setDemoCarlosPaid] = useState(false);

  const navigate = useNavigate();
  const handleLoginClick = () => navigate('/login');
  const handleRegisterClick = () => navigate('/login');
  const handleUpgrade = () => navigate('/login');

  return (
    <div className="bg-[#0D0E11] text-[#F9FAFB] font-sans antialiased selection:bg-[#E5B842] selection:text-[#0D0E11] min-h-screen">
      {/* 1. Header Refinado (The Architectural Ledger — 64px, Obsidian + Champagne Gold) */}
      <header className="sticky top-0 left-0 right-0 z-50 bg-[#0D0E11]/90 backdrop-blur-md border-b border-white/[0.06] transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Logo FinControl */}
            <div className="flex items-center gap-3">
              <a href="/" className="flex items-center gap-2.5 group rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5B842]">
                <div className="w-8 h-8 rounded-lg bg-[#1A1D24] border border-[#E5B842]/30 flex items-center justify-center text-[#E5B842] shadow-sm transition-colors group-hover:border-[#E5B842]">
                  <FinControlLogo className="text-[#E5B842]" />
                </div>
                <span className="text-xl font-bold tracking-tight text-[#F9FAFB]">
                  Fin<span className="text-[#E5B842]">Control</span>
                </span>
              </a>
            </div>

            {/* Navegação Desktop */}
            <nav aria-label="Navegação principal" className="hidden md:flex items-center gap-8">
              <a href="#como-funciona" className="text-sm font-medium text-[#9CA3AF] hover:text-[#F9FAFB] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5B842] rounded px-1">
                Como funciona
              </a>
              <a href="#features" className="text-sm font-medium text-[#9CA3AF] hover:text-[#F9FAFB] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5B842] rounded px-1">
                Recursos
              </a>
              <a href="#pricing" className="text-sm font-medium text-[#9CA3AF] hover:text-[#F9FAFB] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5B842] rounded px-1">
                Planos
              </a>
            </nav>

            {/* Ações Desktop */}
            <div className="hidden md:flex items-center gap-3">
              <button
                onClick={handleLoginClick}
                className="px-4 py-2 text-sm font-medium text-[#9CA3AF] hover:text-[#F9FAFB] hover:bg-white/[0.04] rounded-lg transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5B842]"
              >
                Entrar
              </button>
              <button
                onClick={handleRegisterClick}
                className="px-4 py-2 text-sm font-semibold text-[#0D0E11] bg-[#E5B842] hover:bg-[#F5D580] rounded-lg shadow-sm transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#E5B842] focus-visible:ring-offset-[#0D0E11]"
              >
                Criar conta gratuita
              </button>
            </div>

            {/* Toggle Mobile Menu (Touch target >= 44px) */}
            <div className="md:hidden flex items-center">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                aria-label={isMenuOpen ? "Fechar menu de navegação" : "Abrir menu de navegação"}
                aria-expanded={isMenuOpen}
                aria-controls="mobile-nav-menu"
                className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg bg-[#1A1D24] text-[#9CA3AF] hover:text-[#F9FAFB] border border-white/[0.08] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5B842]"
              >
                {isMenuOpen ? <XIcon className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Menu Mobile */}
        {isMenuOpen && (
          <div
            id="mobile-nav-menu"
            className="md:hidden bg-[#0D0E11] border-b border-white/[0.08] px-4 pt-3 pb-6 space-y-3 animate-fadeIn"
          >
            <a
              href="#como-funciona"
              onClick={() => setIsMenuOpen(false)}
              className="block min-h-[44px] px-4 py-3 rounded-lg text-base font-medium text-[#9CA3AF] hover:bg-[#1A1D24] hover:text-[#F9FAFB] transition-colors"
            >
              Como funciona
            </a>
            <a
              href="#features"
              onClick={() => setIsMenuOpen(false)}
              className="block min-h-[44px] px-4 py-3 rounded-lg text-base font-medium text-[#9CA3AF] hover:bg-[#1A1D24] hover:text-[#F9FAFB] transition-colors"
            >
              Recursos
            </a>
            <a
              href="#pricing"
              onClick={() => setIsMenuOpen(false)}
              className="block min-h-[44px] px-4 py-3 rounded-lg text-base font-medium text-[#9CA3AF] hover:bg-[#1A1D24] hover:text-[#F9FAFB] transition-colors"
            >
              Planos
            </a>
            <div className="pt-3 border-t border-white/[0.06] space-y-2">
              <button
                onClick={handleRegisterClick}
                className="block w-full min-h-[44px] text-center px-4 py-3 text-base font-semibold text-[#0D0E11] bg-[#E5B842] hover:bg-[#F5D580] rounded-lg shadow-sm transition-colors cursor-pointer"
              >
                Criar conta gratuita
              </button>
              <button
                onClick={handleLoginClick}
                className="block w-full min-h-[44px] text-center px-4 py-3 text-base font-medium text-[#9CA3AF] bg-[#1A1D24] hover:bg-[#222630] hover:text-[#F9FAFB] rounded-lg border border-white/[0.08] transition-colors cursor-pointer"
              >
                Entrar na conta
              </button>
            </div>
          </div>
        )}
      </header>

      <main>
        {/* 2. Seção Hero (The Split & Ledger Stage) */}
        <section className="relative pt-12 pb-16 md:pt-20 md:pb-24 overflow-hidden bg-[#0D0E11]">
          {/* Sombra de profundidade suave e sutil */}
          <div className="absolute top-0 right-1/4 w-[500px] h-[350px] bg-[#E5B842]/[0.03] blur-[140px] rounded-full pointer-events-none"></div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
              {/* Coluna Esquerda: Proposta de Valor e CTAs */}
              <div className="lg:col-span-6 xl:col-span-6 text-left">
                {/* Badge Factual */}
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#1A1D24] border border-[#E5B842]/30 text-[#E5B842] text-xs font-semibold tracking-wide mb-6">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#E5B842] animate-pulse motion-reduce:animate-none"></span>
                  Software financeiro para cartões e compras compartilhadas
                </div>

                {/* Headline Principal */}
                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-[2.85rem] font-bold tracking-tight text-[#F9FAFB] leading-[1.15]">
                  Suas faturas sob controle.
                  <span className="block text-[#E5B842] mt-1">Suas compras compartilhadas resolvidas.</span>
                </h1>

                {/* Subheadline Clara */}
                <p className="mt-5 text-base sm:text-lg text-[#9CA3AF] leading-relaxed max-w-xl">
                  Saiba exatamente o valor da sua fatura antes do fechamento e controle quem te deve cada centavo com precisão.
                </p>

                {/* Grupo de Ações (CTAs) */}
                <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5">
                  <button
                    onClick={handleRegisterClick}
                    className="px-6 py-3.5 text-sm font-semibold text-[#0D0E11] bg-[#E5B842] hover:bg-[#F5D580] rounded-lg shadow-sm transition-all cursor-pointer text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#E5B842] focus-visible:ring-offset-[#0D0E11]"
                  >
                    Criar conta gratuita
                  </button>
                  <a
                    href="#como-funciona"
                    className="px-6 py-3.5 text-sm font-medium text-[#F9FAFB] bg-[#1A1D24] hover:bg-[#222630] border border-white/[0.08] hover:border-white/[0.15] rounded-lg transition-colors text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5B842]"
                  >
                    Ver como funciona
                  </a>
                </div>

                {/* Microcopy Factual */}
                <div className="mt-8 pt-6 border-t border-white/[0.06] flex flex-wrap items-center gap-y-2 gap-x-6 text-xs text-[#6B7280]">
                  <span className="flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-[#E5B842]"></span>
                    Integridade matemática em centavos
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-[#E5B842]"></span>
                    Sem conexão bancária necessária
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-[#E5B842]"></span>
                    Acesso autenticado
                  </span>
                </div>
              </div>

              {/* Coluna Direita: Living Ledger POC (Mock Funcional Sintético) */}
              <div className="lg:col-span-6 xl:col-span-6">
                <div className="bg-[#13151A] border border-white/[0.08] rounded-2xl p-5 sm:p-6 shadow-2xl shadow-black/80 relative overflow-hidden">
                  {/* Linha de reflexo superior sutil */}
                  <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#E5B842]/25 to-transparent pointer-events-none"></div>

                  {/* Widget do Cartão Fictício */}
                  <div className="bg-[#1A1D24] border border-white/[0.06] rounded-xl p-4 sm:p-5 relative">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold uppercase tracking-wider text-[#9CA3AF]">FinControl Platinum</span>
                          <span className="text-[11px] font-mono text-[#6B7280]">•••• 4821</span>
                        </div>
                        <div className="mt-2 text-2xl sm:text-3xl font-bold text-[#F9FAFB] tracking-tight tabular-nums">
                          R$ 1.284,60
                        </div>
                        <div className="text-xs text-[#9CA3AF] mt-0.5">Sua responsabilidade nesta fatura</div>
                      </div>

                      {/* Chip Metálico Fictício */}
                      <div className="w-9 h-7 rounded-md bg-[#222630] border border-[#E5B842]/30 flex items-center justify-center text-[#E5B842]/70 shrink-0">
                        <CreditCardIcon />
                      </div>
                    </div>

                    {/* Ciclo do Cartão */}
                    <div className="mt-4 pt-3 border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#222630] text-[#9CA3AF] border border-white/[0.05]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#E5B842]"></span>
                        Fechamento em 3 dias · Vencimento 10/10
                      </div>
                      <span className="text-[11px] text-[#6B7280]">Ciclo ativo · Registrado no FinControl</span>
                    </div>
                  </div>

                  {/* Cabeçalho do Extrato / Living Ledger */}
                  <div className="mt-5 mb-3 flex items-center justify-between text-xs text-[#9CA3AF]">
                    <span className="font-semibold uppercase tracking-wider text-[11px] text-[#9CA3AF]">Lançamentos & Compras Compartilhadas</span>
                    <span className="text-[11px] text-[#6B7280]">Demonstração Interativa</span>
                  </div>

                  {/* Linhas do Razão Financeiro (Living Ledger) */}
                  <div className="space-y-2.5">
                    {/* Linha 1: Compra Compartilhada com Baixa Interativa */}
                    <div className="bg-[#1A1D24]/70 border border-white/[0.05] hover:border-white/[0.1] rounded-xl p-3.5 transition-colors">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-[#222630] border border-white/[0.06] flex items-center justify-center text-[#E5B842] shrink-0">
                            <UsersIcon />
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-[#F9FAFB] truncate">Jantar de aniversário</div>
                            <div className="text-xs text-[#9CA3AF] flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                              <span>Sua parte: <strong className="text-gray-200 tabular-nums font-semibold">R$ 150,00</strong></span>
                              <span>·</span>
                              <span>Carlos: <strong className="text-gray-200 tabular-nums font-semibold">R$ 150,00</strong></span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5 shrink-0 text-right">
                          <div>
                            <span className="block text-sm font-bold text-[#F9FAFB] tabular-nums">R$ 300,00</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setDemoCarlosPaid(prev => !prev)}
                            title="Clique para alternar o status demonstrativo da cota de Carlos"
                            aria-label={demoCarlosPaid ? "Cota de Carlos marcada como paga. Clique para simular pendência." : "Cota de Carlos pendente. Clique para simular quitação."}
                            className={`px-2.5 py-1 rounded-md text-xs font-semibold border transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5B842] ${
                              demoCarlosPaid
                                ? 'bg-[#34D399]/10 text-[#34D399] border-[#34D399]/30 hover:bg-[#34D399]/20'
                                : 'bg-[#FBBF24]/10 text-[#FBBF24] border-[#FBBF24]/30 hover:bg-[#FBBF24]/20'
                            }`}
                          >
                            {demoCarlosPaid ? 'Pago Total' : 'Pendente'}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Linha 2: Parcela com 1 Centavo Residual (Regra Canônica Aprovada) */}
                    <div className="bg-[#1A1D24]/70 border border-white/[0.05] rounded-xl p-3.5">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-[#222630] border border-white/[0.06] flex items-center justify-center text-[#9CA3AF] shrink-0">
                            <CreditCardIcon />
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-[#F9FAFB] truncate">Notebook (Parcela 03/10)</div>
                            <div className="text-xs text-[#9CA3AF] flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                              <span>R$ 99,99 pago</span>
                              <span>·</span>
                              <span className="text-[#FBBF24] font-medium">R$ 0,01 restante</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5 shrink-0 text-right">
                          <div>
                            <span className="block text-sm font-bold text-[#F9FAFB] tabular-nums">R$ 100,00</span>
                          </div>
                          <span
                            className="px-2.5 py-1 rounded-md text-xs font-semibold bg-[#FBBF24]/10 text-[#FBBF24] border border-[#FBBF24]/30"
                            title="Regra de integridade: R$ 0,01 restante continua sendo dívida ativa"
                          >
                            Pago Parcial
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Linha 3: Assinatura Recorrente */}
                    <div className="bg-[#1A1D24]/70 border border-white/[0.05] rounded-xl p-3.5">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-[#222630] border border-white/[0.06] flex items-center justify-center text-[#9CA3AF] shrink-0">
                            <ChartIcon />
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-[#F9FAFB] truncate">Assinatura de Software</div>
                            <div className="text-xs text-[#6B7280] mt-0.5">Despesa fixa mensal</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5 shrink-0 text-right">
                          <div>
                            <span className="block text-sm font-bold text-[#F9FAFB] tabular-nums">R$ 59,90</span>
                          </div>
                          <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-[#34D399]/10 text-[#34D399] border border-[#34D399]/30">
                            Pago Total
                          </span>
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* Barra de Status Consolidado do Mock */}
                  <div className="mt-4 pt-3.5 border-t border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 text-[#9CA3AF]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#34D399]"></span>
                      <span>A receber de terceiros:</span>
                      <span className="font-bold text-[#F9FAFB] tabular-nums">
                        {demoCarlosPaid ? 'R$ 0,00' : 'R$ 150,00'}
                      </span>
                    </div>
                    <span className="text-[11px] text-[#6B7280]">
                      {demoCarlosPaid ? 'Todas as cotas de terceiros quitadas' : '1 cota pendente identificada'}
                    </span>
                  </div>

                </div>
              </div>

            </div>
          </div>
        </section>

        {/* Ponto de ancoragem para o CTA secundário "Ver como funciona" */}
        <div id="como-funciona" className="scroll-mt-16"></div>

        {/* Seção de Recursos (Preservada temporariamente para validação isolada do Hero) */}
        <section id="features" className="py-20 md:py-32 bg-carbon-900/50 border-t border-carbon-800">
                    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl md:text-4xl font-black text-gold-cream">Tudo o que você precisa em um só lugar</h2>
                            <p className="mt-3 text-base md:text-lg text-gray-400">Ferramentas de alta precisão para descomplicar sua vida financeira.</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div className="bg-carbon-900 border border-carbon-800 p-8 rounded-3xl shadow-xl transition-all duration-300 hover:-translate-y-1 hover:border-gold/30 text-center">
                                <FeatureIcon><CreditCardIcon /></FeatureIcon>
                                <h3 className="text-xl font-bold mb-3 text-gold-cream">Gestão de Faturas</h3>
                                <p className="text-sm text-gray-400 leading-relaxed">Saiba exatamente o valor da sua fatura antes dela fechar. Adicione compras, despesas avulsas e assinaturas com total fluidez.</p>
                            </div>
                            <div className="bg-carbon-900 border border-carbon-800 p-8 rounded-3xl shadow-xl transition-all duration-300 hover:-translate-y-1 hover:border-gold/30 text-center">
                                <FeatureIcon><UsersIcon /></FeatureIcon>
                                <h3 className="text-xl font-bold mb-3 text-gold-cream">Compras Compartilhadas</h3>
                                <p className="text-sm text-gray-400 leading-relaxed">Dividiu uma compra? Registre o valor de cada pessoa e controle rigorosamente quem te deve o quê, parcela por parcela.</p>
                            </div>
                            <div className="bg-carbon-900 border border-carbon-800 p-8 rounded-3xl shadow-xl transition-all duration-300 hover:-translate-y-1 hover:border-gold/30 text-center">
                                <FeatureIcon><ChartIcon /></FeatureIcon>
                                <h3 className="text-xl font-bold mb-3 text-gold-cream">Relatórios Visuais</h3>
                                <p className="text-sm text-gray-400 leading-relaxed">Com os recursos Pro, visualize gráficos dinâmicos que mostram para onde seu dinheiro está indo e tome decisões mais assertivas.</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Seção de Preços */}
                <section id="pricing" className="py-20 md:py-32 border-t border-carbon-800">
                    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl md:text-4xl font-black text-gold-cream">Um plano para cada necessidade</h2>
                            <p className="mt-3 text-base md:text-lg text-gray-400">Comece de graça e evolua para a elite quando estiver pronto.</p>
                        </div>
                        <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
                            
                            {/* Plano Free */}
                            <div className="bg-carbon-900 border border-carbon-800 rounded-3xl p-8 sm:p-10 flex flex-col shadow-2xl">
                                <h3 className="text-2xl font-black text-gold-cream">Standard</h3>
                                <p className="mt-3 text-sm text-gray-400">O essencial para começar a organizar suas finanças hoje mesmo.</p>
                                <div className="mt-6">
                                    <span className="text-4xl font-black text-gold-cream">R$0</span>
                                    <span className="text-sm font-medium text-gray-500"> /mês</span>
                                </div>
                                <ul className="mt-8 space-y-4 text-gray-300 text-sm flex-1">
                                    <li className="flex items-start"><span className="text-gold mt-0.5 mr-3 flex-shrink-0"><CheckIcon /></span><span>Gerenciamento de Pessoas</span></li>
                                    <li className="flex items-start"><span className="text-gold mt-0.5 mr-3 flex-shrink-0"><CheckIcon /></span><span>Gerenciamento de Cartões</span></li>
                                    <li className="flex items-start"><span className="text-gold mt-0.5 mr-3 flex-shrink-0"><CheckIcon /></span><span>Registro de Compras</span></li>
                                </ul>
                                <div className="mt-8">
                                    <button onClick={handleRegisterClick} className="w-full px-6 py-3.5 text-sm font-bold text-gold bg-gold/10 border border-gold/20 hover:bg-gold/20 rounded-2xl transition cursor-pointer">Comece Grátis</button>
                                </div>
                            </div>

                            {/* Plano Pro */}
                            <div className="bg-gradient-to-b from-carbon-900 to-carbon-800 border-2 border-gold rounded-3xl p-8 sm:p-10 flex flex-col relative shadow-2xl shadow-gold/10">
                                <div className="absolute top-0 -translate-y-1/2 left-1/2 -translate-x-1/2">
                                    <span className="px-4 py-1 text-xs font-black tracking-widest text-carbon-900 bg-gradient-to-r from-gold-light to-gold rounded-full shadow-md">BLACK PRO</span>
                                </div>
                                <h3 className="text-2xl font-black text-gold-cream">Pro / Black</h3>
                                <p className="mt-3 text-sm text-gray-400">Desbloqueie todo o potencial com recursos analíticos avançados e exclusivas ferramentas de IA.</p>
                                
                                <div className="mt-6">
                                    <span className="text-4xl font-black text-gold">R$29,99</span>
                                    <span className="text-sm font-medium text-gray-400"> (Pagamento Único)</span>
                                </div>
                                
                                <ul className="mt-8 space-y-4 text-gray-300 text-sm flex-1">
                                    <li className="flex items-start"><span className="text-gold mt-0.5 mr-3 flex-shrink-0"><CheckIcon /></span><span className="font-semibold text-gold-cream">Acesso Vitalício a tudo do plano Standard, e mais:</span></li>
                                    <li className="flex items-start"><span className="text-gold mt-0.5 mr-3 flex-shrink-0"><CheckIcon /></span><span>Registro de Receitas e Despesas Avulsas</span></li>
                                    <li className="flex items-start"><span className="text-gold mt-0.5 mr-3 flex-shrink-0"><CheckIcon /></span><span>Relatórios e Gráficos Pro Analytics</span></li>
                                    <li className="flex items-start"><span className="text-gold mt-0.5 mr-3 flex-shrink-0"><CheckIcon /></span><span>Acesso Completo ao Modo Crise & Auditoria</span></li>
                                </ul>
                                
                                <div className="mt-8">
                                    <button onClick={handleUpgrade} className="w-full px-6 py-3.5 text-sm font-black text-carbon-900 bg-gradient-to-r from-gold-light to-gold hover:opacity-90 rounded-2xl shadow-lg shadow-gold/20 transition cursor-pointer">Tornar-se Black Pro</button>
                                </div>
                            </div>

                        </div>
                    </div>
                </section>
            </main>

            {/* Rodapé */}
            <footer className="bg-carbon-900 border-t border-carbon-800 py-10">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center text-xs text-gray-500">
                    <p>&copy; {new Date().getFullYear()} FinControl. Todos os direitos reservados.</p>
                </div>
            </footer>
        </div>
    );
}