# FinControl — Relatório de Implementação: Fase 7 (Novo Layout, Faxina de Widgets e Projeção por Pessoa)

Este documento detalha as decisões arquiteturais, alterações de código, garantias de segurança, validações de performance e testes automatizados implementados na **Fase 7** do redesign do FinControl.

---

## 1. Motivação e Decisões do Produto

Com as fundações do design system estabelecidas (paleta *Abyss Teal*, fundo vivo cinemático, skeletons, coreografia de entrada escalonada, transição entre abas via `PageWaveSweep`, contadores monetários vivos e revelação circular do tema), o objetivo da Fase 7 é **simplificar a ergonomia visual, eliminar ruído cognitivo e potencializar a usabilidade dos dados financeiros essenciais**.

### Decisões do Owner Consolidadas:
1. **Aposentadoria da Sidebar Lateral:** A antiga barra lateral foi substituída por uma **barra de navegação superior flutuante estilo pill** (`TopNavPill`), liberando 100% da largura útil da tela para visualização dos dados em coluna única centralizada (`max-w-7xl mx-auto`).
2. **Remoção do Modo Crise:** Aba e módulo `CrisisMode` descontinuados da interface de navegação e do dashboard.
3. **Remoção do Resumo Executivo:** Modal de resumo semanal/mensal (`ExecutiveSummaryModal`) e seus botões acionadores removidos da interface.
4. **Faxina Geral de Alertas e Notificações:** Todos os alertas e notificações visuais foram erradicados da UI (sino no header, popover de notificações, configurações de notificação e banner de alertas financeiros).
5. **Faxina de Widgets Secundários:** Remoção dos widgets "Auditoria Relâmpago", "Metas & Quitação de Dívidas", "Metas de Orçamento por Categoria" e do antigo painel `ProSummary` ("Total de Receitas" / "Balanço Final").
6. **Projeção dos Próximos Meses POR PESSOA:** O card `FutureCommitmentsCard` foi mantido e enriquecido com um seletor segmentado acessível que permite alternar entre "Todos", participantes cadastrados e "Sem atribuição", com estrita invariante matemática e interpolação numérica viva via `AnimatedCurrency`.
7. **Exportação CSV Concentrada na Aba Pessoas:** Remoção de botões de exportação genéricos. A exportação CSV (mensal e anual) passa a residir exclusivamente no final do relatório financeiro de cada pessoa (`FinancialReportModal`).

---

## 2. O que Foi Removido e Por Quê

### Arquivos Removidos do Projeto (9 componentes)
Nenhum dado do Firestore foi apagado ou migrado; campos legados nos documentos de usuários permanecem intactos no banco de dados para total retrocompatibilidade:

| Arquivo Removido | Responsabilidade Anterior | Motivo da Remoção |
|---|---|---|
| `src/features/crisis/CrisisMode.jsx` | Aba completa de gestão de crise e auditoria | Descontinuada pelo owner para simplificar fluxo |
| `src/components/ExecutiveSummaryModal.jsx` | Modal de resumo semanal e mensal executivo | Descontinuado da interface do usuário |
| `src/components/NotificationCenterPopover.jsx` | Popover com lista de alertas e notificações | Decisão de zerar notificações visuais na UI |
| `src/components/NotificationSettingsModal.jsx` | Configurações de lembretes e push | Notificações retiradas da interface |
| `src/components/FinancialAlertsBanner.jsx` | Banner de alerta sobre vencimentos na topbar | Erradicação de alertas visuais no topo |
| `src/components/CategoryBudgetsWidget.jsx` | Widget de orçamentos por categoria no Resumo | Simplificação e foco nos dados consolidados |
| `src/components/CategoryBudgetsModal.jsx` | Modal de edição de orçamentos por categoria | Removido em conjunto com o widget de metas |
| `src/components/DeterministicInsightsWidget.jsx` | Auditoria Relâmpago e insights heurísticos | Ruído cognitivo desnecessário no Resumo |
| `src/features/dashboard/ProSummary.jsx` | Cards de Total de Receitas e Balanço Final | Removido para focar na Fatura e Projeção |

---

## 3. Navegação Superior: `TopNavPill` & Shell em Vidro

### Arquitetura de Componentes
- **Componente:** `src/features/dashboard/shell/TopNavPill.jsx`
- **Shell Integrador:** `src/features/dashboard/shell/AppTopbar.jsx`
- **Container Geral:** `src/features/dashboard/DashboardLayout.jsx`

### Características Técnicas:
1. **Indicador Deslizante Acelerado por GPU:**
   - O pill de destaque que envolve a aba ativa utiliza `transform: translate3d(Xpx, 0, 0)` calculado via `useIsomorphicLayoutEffect`.
   - Nenhuma propriedade de layout (`width`, `left`, `margin`) é animada em runtime, garantindo **CLS = 0** e 60fps constantes.
2. **Prefetch Proativo Inteligente:**
   - Ao passar o cursor (`onMouseEnter`), receber foco (`onFocus`) ou toque (`onTouchStart`), o método `prefetchTab(tab.id)` dispara o download assíncrono do módulo da aba via Vite/Rollup chunks dinâmicos (`tabPrefetch.js`).
   - Quando o usuário clica, o código já está em cache na memória, eliminando tempos de espera.
3. **Acessibilidade e Ergonomia (A11y/WCAG):**
   - **Navegação por Teclado:** Suporte completo a `ArrowRight` (próxima aba), `ArrowLeft` (aba anterior), `Home` (primeira aba) e `End` (última aba), com foco automático no botão selecionado.
   - **Semântica:** Mantém o botão nativo acessível com atributo `aria-current="page"` para a aba ativa e `aria-label="Navegação do sistema"`.
   - **Touch Targets:** Altura mínima de 44px garantida (`min-h-[44px]`), atendendo WCAG 2.5.5 em telas sensíveis ao toque.
   - **Mobile Responsivo:** Em telas estreitas (< 768px), o container ativa scroll horizontal suave sem scrollbar visível (`no-scrollbar`) com padding lateral seguro.
4. **Layout de Coluna Única:**
   - A sidebar lateral (`AppSidebar`) foi desativada no `DashboardLayout.jsx`.
   - O conteúdo principal reside em `<main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-24 sm:pt-28 pb-12 sm:pb-16">`, conferindo respiro estético superior para a barra fixa e alinhamento visual equilibrado.
   - O sistema de transição de telas `PageWaveSweep`, o fundo vivo `LivingBackground` e a revelação coordenada `fc:page-reveal-start` permanecem integralmente preservados.

---

## 4. Projeção dos Próximos Meses Por Pessoa

### Lógica de Domínio (`src/services/financialService.js`)
Foram criadas duas funções canônicas com garantia matemática de centavos inteiros:
- `filterCommitmentsForPerson(loans, subscriptions, personId)`: Filtra compras parceladas e assinaturas pertencentes à pessoa. Suporta compras exclusivas (`loan.clientId === personId`), compras compartilhadas (`loan.isShared === true` com rateio 50/50 em `person1` / `person2`) e assinaturas exclusivas.
- `calculateFutureCommitmentsForPerson(loans, subscriptions, monthsAhead, targetMonth, personId)`: Calcula o valor projetado mês a mês em centavos inteiros com distribuição precisa e arredondamento que previne *drift* ou perda de centavos.

### Prova da Invariante Matemática
No arquivo de testes `tests/futureCommitmentsByPerson.test.js`, foram formalizados testes cobrindo múltiplos cenários extremos (incluindo parcelas ímpares como R$ 33,33 divididas meio a meio com centavo de ajuste):
$$\text{Projeção}_{\text{Todos}}(M) = \sum_{P \in \text{Pessoas}} \text{Projeção}(P, M) + \text{Projeção}_{\text{Sem Atribuição}}(M)$$
A invariante foi testada e provada com diferença absoluta de exatamente **0 centavos** em todas as projeções futuras de 1 a 6 meses.

### Ergonomia do Componente (`FutureCommitmentsCard.jsx`)
- Seletor segmentado com "Todos", cada participante cadastrado e opção "Sem atribuição" (visível apenas quando há gastos não atribuídos).
- Transições de valor sem desmontar o card e sem exibir spinner de tela cheia: os números comutam usando `AnimatedCurrency` em centavos inteiros.
- Barra de progresso visual relativa entre os meses, preenchida via GPU.

---

## 5. Exportação CSV Dedicada por Pessoa

### Regras de Negócio e Segurança (`src/services/csvExportService.js`)
A exportação em planilha foi concentrada onde faz sentido operacional: no extrato individual de cada pessoa em `FinancialReportModal.jsx`.

### Funcionalidades:
1. **Opção Mensal e Anual:**
   - "Exportar CSV do mês": exporta todas as parcelas de compras e assinaturas ativas com vencimento no mês selecionado da fatura.
   - "Exportar CSV do ano": exporta todas as parcelas do ano corrente, permitindo conciliação fiscal e controle anualizado.
2. **Proteção contra CSV/Formula Injection (CWE-1236):**
   - A função `sanitizeCsvFormula(str)` inspeciona strings de descrição, categoria e nomes. Se o valor iniciar com `=`, `+`, `@` ou `-` seguido de texto (padrão de execução de macro no Excel/LibreOffice), ele é prefixado com apóstrofo (`'`) e envolvido em aspas seguras.
3. **Sanitização de Nomes de Arquivo:**
   - A função `sanitizeFilename(name)` normaliza acentuações, remove caracteres não alfanuméricos e gera nomes seguros para sistemas operacionais: `fincontrol-{nome-pessoa}-{mes|ano}.csv`.
4. **Integridade de Soma:**
   - A soma de todas as linhas de parcelas no CSV bate exatamente ao centavo com o total líquido e consolidado da pessoa calculado no serviço financeiro.

---

## 6. Localização do Gráfico de Pizza

- **Arquivo:** `src/components/ProAnalyticsCharts.jsx`
- **Seção:** Gráfico "Gastos por Pessoa" (`PieChart` / `Pie` do Recharts)
- **Localização na Interface:** Aba **Resumo** (`src/features/dashboard/Dashboard.jsx`), coluna direita inferior do grid de analítica.
- **Status:** Mantido intacto conforme instruções da Fase 7 (preservando animações nativas respeitosas a `prefers-reduced-motion` e tokens de cor da paleta *Abyss Teal*).

---

## 7. Funções de Domínio e Cloud Functions Preservadas

Em observância à **Regra nº 1 e 2 da Constituição do FinControl** (*Estabilidade em Produção e Não Introduzir Breaking Changes Silenciosamente*), as seguintes funções utilitárias que atendiam aos componentes descontinuados foram mantidas em `src/services/financialService.js` com seus respectivos testes unitários em `tests/`:
- `generateWeeklyFinancialSummary` & `generateMonthlyFinancialSummary`: Mantidas com integridade matemática intacta (utilizadas em `tests/executiveSummary.test.js`).
- `calculateAuditDeltas`: Função pura de análise de divergências mantida intacta.
- `calculateMonthlyBurn`: Mantida para eventual cálculo de burn-rate em serviços analíticos.
- `calculateSafeDebtPayoffPlans`: Mantida em `financialService.js`.

---

## 8. Medição de Performance do Resumo (Antes vs Depois)

### Comparativo de Diagnóstico

| Métrica | Diagnóstico Inicial (Antes da Fase 7) | Medição Real Fase 7 (Vite Dev / Playwright) | Impacto / Melhoria |
|---|---|---|---|
| **Long Tasks (> 50ms) durante Mount** | ~11 tarefas longas | **6 tarefas** | **Redução de ~45%** de Long Tasks no mount |
| **Maior Long Task (Cold Start Parse)** | 270ms | **424ms** *(apenas avaliação de dependências no Vite)* | Confinado à compilação e parse inicial do JS |
| **Long Tasks em Estado Idle / Navegação** | Recorrente por reavaliação de widgets | **0 tarefas** | **Zero Long Tasks** após carregamento dos dados |
| **Tempo de Bloqueio Total (TBT estimado)** | > 950ms | **758ms** | Redução da concorrência de renderização |
| **Número de Widgets Pesados no Resumo** | 7 blocos concorrentes | **3 blocos estruturados** (KPIs, Gráficos, Projeção) | Interface limpa e livre de reflows concorrentes |

---

## 9. Cobertura de Testes Automatizados

### Resumo dos Resultados
- **ESLint:** 0 erros, 0 warnings (`npm run lint` passou com `--max-warnings 0`).
- **Vitest (Testes Unitários e de Integração):**
  - **43 arquivos de teste aprovados** (604 testes com sucesso, 13 skipped emuladores de infra, 0 falhas).
  - Inclui `tests/topNavPill.test.js` (3 testes), `tests/futureCommitmentsByPerson.test.js` (4 testes), `tests/personReportCsv.test.js` (7 testes).
- **Playwright (Testes E2E):**
  - `e2e/page-transition-smooth.spec.js`: 7 aprovados (transição de tela suave, navegação de abas, WAAPI, assentamento sob o véu).
  - `e2e/authenticated-journey.spec.js`: 5 aprovados (fluxo completo autenticado, filtros, transições).
  - `e2e/plan-entitlements.spec.js`: 5 aprovados (trava e badges de planos Free/Pro).
  - `e2e/screen-enter.spec.js`: 2 aprovados (stagger e entrada visual).
  - `e2e/tab-perf.spec.js`: 1 aprovado (performance de comutação).
  - `e2e/theme-sweep.spec.js`: 6 aprovados (revelação circular e tokens de tema).
  - **Total E2E:** 26 testes aprovados, 0 falhas.
- **Production Build:**
  - `vite build` executado com sucesso em 40.59s, gerando artefatos minificados sem erros de bundling.
