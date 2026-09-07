// src/design-system/lab/DesignSystemLab.jsx
import React, { useState } from 'react';
import { 
  FiSun, 
  FiMoon, 
  FiArrowRight, 
  FiCheck, 
  FiAlertTriangle, 
  FiAlertCircle, 
  FiInfo, 
  FiSearch, 
  FiTrash2, 
  FiPlus,
  FiExternalLink
} from 'react-icons/fi';
import Button from '../primitives/Button';
import IconButton from '../primitives/IconButton';
import Surface from '../primitives/Surface';
import TextField from '../primitives/TextField';
import Badge from '../primitives/Badge';
import Modal from '../primitives/Modal';

/**
 * FinControl Design System 2.0 — Local Visual Lab (Dev-Only)
 * 
 * Allows the owner to inspect, toggle themes, and interact with all DS2 foundations
 * in an isolated environment without affecting production pages.
 */
export default function DesignSystemLab() {
  const [theme, setTheme] = useState('dark');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [textValue, setTextValue] = useState('Exemplo preenchido');
  const [currencyValue, setCurrencyValue] = useState('1250,50');
  const [errorInputValue, setErrorInputValue] = useState('inválido@');

  return (
    <div
      data-theme={theme}
      className="min-h-screen bg-[var(--fc-bg)] text-[var(--fc-text-primary)] transition-colors duration-200 font-sans selection:bg-[var(--fc-accent-soft)] selection:text-[var(--fc-accent)]"
    >
      {/* =========================================================================
          LAB TOP BAR — Scope-isolated theme toggle
          ========================================================================= */}
      <header className="sticky top-0 z-40 bg-[var(--fc-surface-1)]/90 backdrop-blur-md border-b border-[var(--fc-border-default)] px-4 sm:px-8 py-3.5 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[var(--fc-accent)] to-[var(--fc-accent-hover)] text-[var(--fc-accent-contrast)] font-bold flex items-center justify-center text-sm shadow-md">
              DS
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-[var(--fc-text-primary)]">
                FinControl Design System 2.0
              </h1>
              <p className="text-xs text-[var(--fc-text-secondary)]">
                Foundation & Owner Review Lab (Ambiente Local)
              </p>
            </div>
          </div>

          {/* Theme Switcher Toggle */}
          <div className="flex items-center gap-2 bg-[var(--fc-surface-2)] p-1 rounded-xl border border-[var(--fc-border-default)]">
            <button
              type="button"
              onClick={() => setTheme('dark')}
              aria-pressed={theme === 'dark'}
              className={`min-h-[44px] px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--fc-focus-ring)] ${
                theme === 'dark'
                  ? 'bg-[var(--fc-surface-1)] text-[var(--fc-accent)] shadow-sm'
                  : 'text-[var(--fc-text-secondary)] hover:text-[var(--fc-text-primary)]'
              }`}
            >
              <FiMoon className="w-4 h-4" aria-hidden="true" />
              <span>Escuro (Obsidian)</span>
            </button>

            <button
              type="button"
              onClick={() => setTheme('light')}
              aria-pressed={theme === 'light'}
              className={`min-h-[44px] px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--fc-focus-ring)] ${
                theme === 'light'
                  ? 'bg-[var(--fc-surface-1)] text-[var(--fc-accent)] shadow-sm'
                  : 'text-[var(--fc-text-secondary)] hover:text-[var(--fc-text-primary)]'
              }`}
            >
              <FiSun className="w-4 h-4" aria-hidden="true" />
              <span>Claro (Warm White)</span>
            </button>
          </div>
        </div>
      </header>

      {/* =========================================================================
          LAB CONTENT CONTAINER
          ========================================================================= */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-10 space-y-12">
        
        {/* Intro Notification Banner */}
        <Surface variant="elevated" className="border-l-4 border-l-[var(--fc-accent)]">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--fc-accent)]">
                Stage A — Prova de Conceito Arquitetural
              </span>
              <p className="text-sm text-[var(--fc-text-secondary)] mt-1">
                Este laboratório valida os tokens semânticos e os 6 componentes primitivos fundamentais com conformidade estrita de acessibilidade (touch targets &ge; 44px, contraste, focus rings Champagne Gold e safe motion).
              </p>
            </div>
            <Badge variant="accent" icon={<FiCheck />}>
              Tokens Canônicos Ativos
            </Badge>
          </div>
        </Surface>

        {/* =======================================================================
            SECTION A: COLOR SYSTEM
            ======================================================================= */}
        <section aria-labelledby="sec-colors" className="space-y-4">
          <div className="border-b border-[var(--fc-border-subtle)] pb-2">
            <h2 id="sec-colors" className="text-xl font-bold tracking-tight text-[var(--fc-text-primary)]">
              A. Sistema de Cores Semântico
            </h2>
            <p className="text-xs text-[var(--fc-text-secondary)] mt-0.5">
              Tokens tonais que se adaptam dinamicamente ao modo ativo ({theme.toUpperCase()}).
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
            <div className="p-3.5 rounded-xl border border-[var(--fc-border-default)] bg-[var(--fc-bg)] flex flex-col justify-between h-24">
              <span className="text-xs font-semibold text-[var(--fc-text-primary)]">Background</span>
              <span className="text-[11px] font-mono text-[var(--fc-text-muted)]">--fc-bg</span>
            </div>

            <div className="p-3.5 rounded-xl border border-[var(--fc-border-default)] bg-[var(--fc-surface-1)] flex flex-col justify-between h-24 shadow-sm">
              <span className="text-xs font-semibold text-[var(--fc-text-primary)]">Surface 1</span>
              <span className="text-[11px] font-mono text-[var(--fc-text-muted)]">--fc-surface-1</span>
            </div>

            <div className="p-3.5 rounded-xl border border-[var(--fc-border-default)] bg-[var(--fc-surface-2)] flex flex-col justify-between h-24">
              <span className="text-xs font-semibold text-[var(--fc-text-primary)]">Surface 2</span>
              <span className="text-[11px] font-mono text-[var(--fc-text-muted)]">--fc-surface-2</span>
            </div>

            <div className="p-3.5 rounded-xl border border-[var(--fc-border-default)] bg-[var(--fc-surface-3)] flex flex-col justify-between h-24">
              <span className="text-xs font-semibold text-[var(--fc-text-primary)]">Surface 3</span>
              <span className="text-[11px] font-mono text-[var(--fc-text-muted)]">--fc-surface-3</span>
            </div>

            <div className="p-3.5 rounded-xl border border-[var(--fc-accent)] bg-[var(--fc-accent)] text-[var(--fc-accent-contrast)] flex flex-col justify-between h-24 shadow-md">
              <span className="text-xs font-bold">Accent Gold</span>
              <span className="text-[11px] font-mono opacity-90">--fc-accent</span>
            </div>

            <div className="p-3.5 rounded-xl border border-[var(--fc-accent)]/30 bg-[var(--fc-accent-soft)] text-[var(--fc-accent)] flex flex-col justify-between h-24">
              <span className="text-xs font-semibold">Accent Soft</span>
              <span className="text-[11px] font-mono opacity-90">--fc-accent-soft</span>
            </div>
          </div>

          {/* Status Colors Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 pt-2">
            <div className="p-3 rounded-xl border border-[var(--fc-success)]/30 bg-[var(--fc-success-soft)] text-[var(--fc-success)] flex items-center justify-between">
              <span className="text-xs font-semibold">Success</span>
              <span className="text-[10px] font-mono">--fc-success</span>
            </div>
            <div className="p-3 rounded-xl border border-[var(--fc-warning)]/30 bg-[var(--fc-warning-soft)] text-[var(--fc-warning)] flex items-center justify-between">
              <span className="text-xs font-semibold">Warning</span>
              <span className="text-[10px] font-mono">--fc-warning</span>
            </div>
            <div className="p-3 rounded-xl border border-[var(--fc-danger)]/30 bg-[var(--fc-danger-soft)] text-[var(--fc-danger)] flex items-center justify-between">
              <span className="text-xs font-semibold">Danger</span>
              <span className="text-[10px] font-mono">--fc-danger</span>
            </div>
            <div className="p-3 rounded-xl border border-[var(--fc-info)]/30 bg-[var(--fc-info-soft)] text-[var(--fc-info)] flex items-center justify-between">
              <span className="text-xs font-semibold">Info</span>
              <span className="text-[10px] font-mono">--fc-info</span>
            </div>
          </div>
        </section>

        {/* =======================================================================
            SECTION B: TYPOGRAPHY & FINANCIAL AMOUNTS
            ======================================================================= */}
        <section aria-labelledby="sec-typography" className="space-y-4">
          <div className="border-b border-[var(--fc-border-subtle)] pb-2">
            <h2 id="sec-typography" className="text-xl font-bold tracking-tight text-[var(--fc-text-primary)]">
              B. Tipografia & Números Financeiros
            </h2>
            <p className="text-xs text-[var(--fc-text-secondary)] mt-0.5">
              Alinhamento tabular numérico e hierarquia estrita para valores monetários com precisão em centavos.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Standard Text Hierarchy */}
            <Surface variant="default" className="space-y-3.5">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--fc-text-muted)]">
                Escala de Texto
              </span>
              <div>
                <p className="text-3xl font-extrabold text-[var(--fc-text-primary)] tracking-tight">
                  Título de Página (Display)
                </p>
                <span className="text-[11px] font-mono text-[var(--fc-text-muted)]">text-3xl font-extrabold</span>
              </div>
              <div>
                <p className="text-xl font-bold text-[var(--fc-text-primary)] tracking-tight">
                  Título de Seção (Heading)
                </p>
                <span className="text-[11px] font-mono text-[var(--fc-text-muted)]">text-xl font-bold</span>
              </div>
              <div>
                <p className="text-base text-[var(--fc-text-primary)] leading-relaxed">
                  Texto de corpo padrão para relatórios, faturas e lançamentos operacionais do FinControl.
                </p>
                <span className="text-[11px] font-mono text-[var(--fc-text-muted)]">text-base text-primary</span>
              </div>
              <div>
                <p className="text-sm text-[var(--fc-text-secondary)]">
                  Texto secundário de apoio para status, datas de vencimento e categorias.
                </p>
                <span className="text-[11px] font-mono text-[var(--fc-text-muted)]">text-sm text-secondary</span>
              </div>
            </Surface>

            {/* Financial Amounts Demonstration */}
            <Surface variant="elevated" className="space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--fc-border-subtle)] pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--fc-text-muted)]">
                  Números Financeiros (Tabular Nums)
                </span>
                <span className="text-xs font-mono text-[var(--fc-accent)]">font-mono tabular-nums</span>
              </div>

              <div className="space-y-3">
                <div className="flex items-baseline justify-between p-3 rounded-xl bg-[var(--fc-surface-1)] border border-[var(--fc-border-default)]">
                  <span className="text-sm font-medium text-[var(--fc-text-secondary)]">Total Aberto (Neutro)</span>
                  <span className="text-xl font-bold tabular-nums font-mono text-[var(--fc-text-primary)]">
                    R$ 0,00
                  </span>
                </div>

                <div className="flex items-baseline justify-between p-3 rounded-xl bg-[var(--fc-surface-1)] border border-[var(--fc-border-default)]">
                  <span className="text-sm font-medium text-[var(--fc-text-secondary)]">Valor Pro Canônico</span>
                  <span className="text-xl font-bold tabular-nums font-mono text-[var(--fc-accent)]">
                    R$ 29,99
                  </span>
                </div>

                <div className="flex items-baseline justify-between p-3 rounded-xl bg-[var(--fc-surface-1)] border border-[var(--fc-border-default)]">
                  <span className="text-sm font-medium text-[var(--fc-text-secondary)]">Receita Confirmada</span>
                  <span className="text-xl font-bold tabular-nums font-mono text-[var(--fc-success)]">
                    +R$ 1.234,56
                  </span>
                </div>

                <div className="flex items-baseline justify-between p-3 rounded-xl bg-[var(--fc-surface-1)] border border-[var(--fc-border-default)]">
                  <span className="text-sm font-medium text-[var(--fc-text-secondary)]">Fatura Consolidada</span>
                  <span className="text-xl font-bold tabular-nums font-mono text-[var(--fc-text-primary)]">
                    R$ 12.480,75
                  </span>
                </div>

                <div className="flex items-baseline justify-between p-3 rounded-xl bg-[var(--fc-surface-1)] border border-[var(--fc-border-default)]">
                  <span className="text-sm font-medium text-[var(--fc-text-secondary)]">Despesa (Sinal Negativo)</span>
                  <span className="text-xl font-bold tabular-nums font-mono text-[var(--fc-danger)]">
                    -R$ 450,20
                  </span>
                </div>
              </div>
            </Surface>
          </div>
        </section>

        {/* =======================================================================
            SECTION C: BUTTONS
            ======================================================================= */}
        <section aria-labelledby="sec-buttons" className="space-y-4">
          <div className="border-b border-[var(--fc-border-subtle)] pb-2">
            <h2 id="sec-buttons" className="text-xl font-bold tracking-tight text-[var(--fc-text-primary)]">
              C. Botões & Ações Primárias (Button Primitive)
            </h2>
            <p className="text-xs text-[var(--fc-text-secondary)] mt-0.5">
              Conformidade obrigatória com touch target &ge; 44px, estados de foco acessível e aria-busy em loading.
            </p>
          </div>

          <Surface variant="default" className="space-y-6">
            {/* Variants */}
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--fc-text-muted)] block mb-3">
                Variantes Estilísticas
              </span>
              <div className="flex flex-wrap items-center gap-3.5">
                <Button variant="primary" icon={<FiArrowRight />}>
                  Primary Action
                </Button>
                <Button variant="secondary" icon={<FiPlus />}>
                  Secondary Action
                </Button>
                <Button variant="ghost">
                  Ghost Action
                </Button>
                <Button variant="danger" icon={<FiTrash2 />}>
                  Danger Action
                </Button>
              </div>
            </div>

            {/* Sizes */}
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--fc-text-muted)] block mb-3">
                Tamanhos Padronizados (&ge; 44px)
              </span>
              <div className="flex flex-wrap items-center gap-3.5">
                <Button size="sm" variant="secondary">
                  Tamanho SM (min 44px)
                </Button>
                <Button size="md" variant="secondary">
                  Tamanho MD (min 44px)
                </Button>
                <Button size="lg" variant="secondary">
                  Tamanho LG (min 48px)
                </Button>
              </div>
            </div>

            {/* States */}
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--fc-text-muted)] block mb-3">
                Estados Especiais (Disabled & Loading)
              </span>
              <div className="flex flex-wrap items-center gap-3.5">
                <Button variant="primary" disabled>
                  Desabilitado
                </Button>
                <Button variant="primary" isLoading>
                  Carregando
                </Button>
                <Button variant="secondary" isLoading>
                  Carregando
                </Button>
                <Button variant="danger" disabled>
                  Perigo Desabilitado
                </Button>
              </div>
            </div>

            {/* Icon Buttons */}
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--fc-text-muted)] block mb-3">
                Botões de Ícone Exclusivo (IconButton — Min 44x44)
              </span>
              <div className="flex flex-wrap items-center gap-3.5">
                <IconButton
                  variant="secondary"
                  ariaLabel="Buscar transações"
                  icon={<FiSearch />}
                />
                <IconButton
                  variant="accent"
                  ariaLabel="Adicionar novo lançamento"
                  icon={<FiPlus />}
                />
                <IconButton
                  variant="ghost"
                  ariaLabel="Visualizar link externo"
                  icon={<FiExternalLink />}
                />
                <IconButton
                  variant="danger"
                  ariaLabel="Excluir item selecionado"
                  icon={<FiTrash2 />}
                />
                <IconButton
                  variant="secondary"
                  disabled
                  ariaLabel="Ação bloqueada"
                  icon={<FiSearch />}
                />
              </div>
            </div>
          </Surface>
        </section>

        {/* =======================================================================
            SECTION D: FORM CONTROLS (TEXTFIELD)
            ======================================================================= */}
        <section aria-labelledby="sec-inputs" className="space-y-4">
          <div className="border-b border-[var(--fc-border-subtle)] pb-2">
            <h2 id="sec-inputs" className="text-xl font-bold tracking-tight text-[var(--fc-text-primary)]">
              D. Controles de Formulário (TextField Primitive)
            </h2>
            <p className="text-xs text-[var(--fc-text-secondary)] mt-0.5">
              Associação de erro via aria-describedby, aria-invalid e touch target adequado.
            </p>
          </div>

          <Surface variant="default">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <TextField
                id="tf-default"
                label="Campo Padrão"
                placeholder="Digite uma descrição..."
                helperText="Informação de apoio contextual"
              />

              <TextField
                id="tf-filled"
                label="Campo Preenchido"
                value={textValue}
                onChange={(e) => setTextValue(e.target.value)}
                helperText="Valor editável em tempo real"
              />

              <TextField
                id="tf-currency"
                label="Valor Monetário"
                prefix="R$"
                value={currencyValue}
                onChange={(e) => setCurrencyValue(e.target.value)}
                helperText="Com prefixo seguro sem overlap"
              />

              <TextField
                id="tf-error"
                label="Campo com Erro"
                value={errorInputValue}
                onChange={(e) => setErrorInputValue(e.target.value)}
                error="Formato de e-mail inválido. Utilize um endereço válido."
              />

              <TextField
                id="tf-disabled"
                label="Campo Desabilitado"
                value="Não pode ser alterado"
                disabled
                helperText="Opção bloqueada por política"
              />

              <TextField
                id="tf-required"
                label="Campo Obrigatório"
                placeholder="Preenchimento necessário"
                required
                helperText="Indicado visualmente com asterisco dourado"
              />
            </div>
          </Surface>
        </section>

        {/* =======================================================================
            SECTION E: SURFACES & CARDS
            ======================================================================= */}
        <section aria-labelledby="sec-surfaces" className="space-y-4">
          <div className="border-b border-[var(--fc-border-subtle)] pb-2">
            <h2 id="sec-surfaces" className="text-xl font-bold tracking-tight text-[var(--fc-text-primary)]">
              E. Superfícies & Camadas (Surface Primitive)
            </h2>
            <p className="text-xs text-[var(--fc-text-secondary)] mt-0.5">
              Controle hierárquico de profundidade para evitar sobrecarga de divisões e bordas.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Surface variant="default">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--fc-text-muted)] block mb-1">
                Default Surface
              </span>
              <p className="text-base font-semibold text-[var(--fc-text-primary)] mb-2">
                Camada Base (Surface 1)
              </p>
              <p className="text-xs text-[var(--fc-text-secondary)] leading-relaxed">
                Utilizada para cartões de conteúdo principal, listagens e blocos informativos primários.
              </p>
            </Surface>

            <Surface variant="elevated">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--fc-accent)] block mb-1">
                Elevated Surface
              </span>
              <p className="text-base font-semibold text-[var(--fc-text-primary)] mb-2">
                Camada Elevada (Surface 2)
              </p>
              <p className="text-xs text-[var(--fc-text-secondary)] leading-relaxed">
                Utilizada para resumos, modais, cabeçalhos destacados e painéis que necessitam de elevação visual.
              </p>
            </Surface>

            <Surface
              variant="interactive"
              tabIndex={0}
              role="button"
              onClick={() => alert('Surface interativo clicado com sucesso!')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  alert('Surface interativo ativado via teclado!');
                }
              }}
            >
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--fc-success)] block mb-1">
                Interactive Surface
              </span>
              <p className="text-base font-semibold text-[var(--fc-text-primary)] mb-2">
                Camada Interativa (Hover & Focus)
              </p>
              <p className="text-xs text-[var(--fc-text-secondary)] leading-relaxed">
                Possui elevação suave no hover e indicador de foco coerente via teclado (Pressione Enter/Space).
              </p>
            </Surface>
          </div>
        </section>

        {/* =======================================================================
            SECTION F: BADGES & STATUS PILLS
            ======================================================================= */}
        <section aria-labelledby="sec-badges" className="space-y-4">
          <div className="border-b border-[var(--fc-border-subtle)] pb-2">
            <h2 id="sec-badges" className="text-xl font-bold tracking-tight text-[var(--fc-text-primary)]">
              F. Indicadores de Status (Badge Primitive)
            </h2>
            <p className="text-xs text-[var(--fc-text-secondary)] mt-0.5">
              Pills não-interativos com suporte a ícones, sem confusão com elementos de clique.
            </p>
          </div>

          <Surface variant="default">
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="neutral">
                Neutro
              </Badge>
              <Badge variant="accent" icon={<FiCheck />}>
                Destaque Ouro
              </Badge>
              <Badge variant="success" icon={<FiCheck />}>
                Confirmado / Quitado
              </Badge>
              <Badge variant="warning" icon={<FiAlertTriangle />}>
                Pendente / Atenção
              </Badge>
              <Badge variant="danger" icon={<FiAlertCircle />}>
                Atrasado / Crítico
              </Badge>
              <Badge variant="info" icon={<FiInfo />}>
                Informativo / Recorrente
              </Badge>
            </div>
          </Surface>
        </section>

        {/* =======================================================================
            SECTION G: MODAL PRIMITIVE DEMO
            ======================================================================= */}
        <section aria-labelledby="sec-modal" className="space-y-4">
          <div className="border-b border-[var(--fc-border-subtle)] pb-2">
            <h2 id="sec-modal" className="text-xl font-bold tracking-tight text-[var(--fc-text-primary)]">
              G. Diálogo Acessível (Modal Primitive)
            </h2>
            <p className="text-xs text-[var(--fc-text-secondary)] mt-0.5">
              Gerenciamento de foco completo: bloqueio com Tab/Shift-Tab, fechamento via Escape e restauração de foco ao fechar.
            </p>
          </div>

          <Surface variant="default" className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="text-base font-semibold text-[var(--fc-text-primary)]">
                Demonstração de Modal com Focus Trap
              </p>
              <p className="text-xs text-[var(--fc-text-secondary)] mt-0.5">
                Clique no botão ao lado ou ative via teclado para inspecionar o modal do DS2.
              </p>
            </div>

            <Button
              variant="primary"
              onClick={() => setIsModalOpen(true)}
            >
              Abrir Modal DS2
            </Button>
          </Surface>
        </section>
      </main>

      {/* =========================================================================
          INTERACTIVE MODAL INSTANCE
          ========================================================================= */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Demonstração do Modal DS2"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setIsModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                alert('Ação confirmada dentro do modal DS2!');
                setIsModalOpen(false);
              }}
            >
              Confirmar Operação
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-[var(--fc-text-secondary)] leading-relaxed">
            Este modal implementa o padrão WAI-ARIA com <code className="text-xs font-mono text-[var(--fc-accent)]">role="dialog"</code> e <code className="text-xs font-mono text-[var(--fc-accent)]">aria-modal="true"</code>.
          </p>
          
          <TextField
            id="modal-test-input"
            label="Campo de teste interno"
            placeholder="Pressione Tab para navegar entre os botões..."
          />

          <div className="p-3.5 rounded-xl bg-[var(--fc-surface-2)] border border-[var(--fc-border-default)] text-xs text-[var(--fc-text-muted)]">
            <span className="font-semibold text-[var(--fc-text-primary)]">Dica de Acessibilidade:</span> Pressionar <kbd className="px-1.5 py-0.5 rounded bg-[var(--fc-surface-1)] border border-[var(--fc-border-default)] font-mono text-[10px]">Escape</kbd> fecha este diálogo e devolve o foco imediatamente ao botão de abertura.
          </div>
        </div>
      </Modal>
    </div>
  );
}
