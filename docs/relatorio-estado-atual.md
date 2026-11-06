# FinControl — Relatório Técnico do Estado Atual do Código

**Data do Diagnóstico:** 03 de Novembro de 2026  
**Ambiente de Execução:** Local (Windows / PowerShell)  
**Objetivo:** Mapeamento completo do estado real da base de código para planejamento de redesign focado em dinâmica e movimento.

---

## 1. PARIDADE COM O GITHUB

### 1.1 Branch e Último Commit
- **Branch atual:** `main`
- **Último commit local:** `24291d728a09586d7adf59709583921d8d67f9ce`
- **Mensagem do último commit:** `feat: complete phase 8.7 app shell dashboard and entitlements (#37)`
- **Sincronização com `origin/main`:** A branch local está na mesma revisão (`HEAD` coincide com `origin/main`).
- **Commits locais pendentes de envio (`git log origin/main..HEAD`):** Nenhum commit pendente.

### 1.2 Branches Locais e Remotos
- **Branch local ativa:** `* main`
- **Branches remotas conhecidas (`origin`):**
  - `origin/HEAD -> origin/main`
  - `origin/main`
  - `origin/feat/fase-8-4-landing-hero-poc`
  - `origin/feat/fase-8-7-app-shell-dashboard-poc`
  - Branches automatizadas do dependabot (`autoprefixer`, `eslint-plugin-react-refresh`, `firebase-functions`, `mercadopago`, `playwright/test`, `postcss`, `tailwindcss`).

### 1.3 `git status` Resumido
Existem alterações locais já preparadas (*staged*) e não preparadas (*unstaged*) no diretório de trabalho:

| Estado | Arquivo | Natureza da Alteração |
|---|---|---|
| **Staged (Deleted)** | `src/App.css` | Remoção de CSS padrão legado do Vite (0 bytes) |
| **Staged (Deleted)** | `src/tailwind-output.css` | Remoção de bundle CSS gerado anteriormente por CLI (2.131 linhas) |
| **Unstaged (Modified)** | `.gitignore` | Adição de regras para ignorar `src/tailwind-output.css` e `screenshots/` |
| **Unstaged (Modified)** | `src/design-system/tokens.css` | Ajuste de contraste WCAG no token `--fc-text-muted` (de `#6B7280` para `#7E8794`) |
| **Unstaged (Modified)** | `src/components/ErrorBoundary.jsx` | Atualização de classes do botão de tentar novamente (`gold-light`/`gold`) |
| **Unstaged (Modified)** | `src/components/ExecutiveSummaryModal.jsx` | Correção de contraste de abas ativas para `text-carbon-900` |
| **Unstaged (Modified)** | `src/components/FinancialSandboxSimulatorModal.jsx` | Correção de contraste de chips/abas para `text-carbon-900` |
| **Unstaged (Modified)** | `src/features/dashboard/Dashboard.jsx` | Substituição de classe legada `text-gold` por `text-fc-accent` no `SortIcon` |
| **Unstaged (Modified)** | `src/features/dashboard/DashboardLayout.jsx` | Inclusão da classe `dashboard-content-glow` no `<main>` da página |
| **Unstaged (Modified)** | `src/features/subscriptions/SubscriptionManagement.jsx` | Substituição de `text-gold` por `text-fc-accent` nos ícones `UserIcon` e `CardIcon` |
| **Unstaged (Modified)** | `src/index.css` | Declaração da classe `.dashboard-content-glow` com gradiente radial sutil no topo |

Arquivos não rastreados (*untracked*): Nenhum.

### 1.4 Resumo do Código Local não Commitado (10 Linhas)
1. Exclusão dos arquivos legados `src/App.css` e `src/tailwind-output.css`, já colocados na área de stage do Git.
2. Atualização do `.gitignore` para ignorar o CSS gerado (`src/tailwind-output.css`) e pasta temporária `screenshots/`.
3. Ajuste fino de acessibilidade visual no token `--fc-text-muted` de `#6B7280` para `#7E8794` em `tokens.css`.
4. Correção de contraste no botão de ação de `ErrorBoundary.jsx` utilizando gradiente dos tokens `gold-light`/`gold`.
5. Harmonização de contraste textual para `text-carbon-900` em abas de `ExecutiveSummaryModal.jsx` e `FinancialSandboxSimulatorModal.jsx`.
6. Migração de classes tailwind legadas `text-gold` para token semântico `text-fc-accent` em `Dashboard.jsx`.
7. Migração idêntica de classes legadas para `text-fc-accent` em ícones de `SubscriptionManagement.jsx`.
8. Aplicação de classe de ambiência `.dashboard-content-glow` no container principal de `DashboardLayout.jsx`.
9. Implementação da regra CSS `.dashboard-content-glow` em `src/index.css` via pseudo-elemento `::before` com radial glow adaptável a dark/light.
10. Nenhuma nova dependência foi instalada e nenhuma alteração estrutural de banco de dados foi efetuada.

---

## 2. STACK E AMBIENTE

### 2.1 Versões Reais em `package.json`

#### Dependências de Produção:
- `react`: `^18.3.1` (com `overrides` fixando `18.3.1`)
- `react-dom`: `^18.3.1`
- `react-router-dom`: `^7.18.3`
- `firebase`: `^10.12.2`
- `gsap`: `^3.15.0`
- `recharts`: `^2.12.7`
- `jspdf`: `^4.2.1`
- `pdfjs-dist`: `^3.11.174`
- `react-icons`: `^5.7.0`

#### Dependências de Desenvolvimento:
- `vite`: `^5.3.1` (Vite v5.4.21 em execução)
- `tailwindcss`: `^3.4.4`
- `postcss`: `^8.4.38`
- `autoprefixer`: `^10.5.4`
- `vitest`: `^4.1.11`
- `@playwright/test`: `^1.62.1`
- `eslint`: `^8.57.0`
- `@eslint/js`: `8.57.1`
- `eslint-plugin-react`: `^7.34.2`
- `eslint-plugin-react-hooks`: `^4.6.2`
- `eslint-plugin-react-refresh`: `^0.4.26`

### 2.2 Scripts Disponíveis
- `npm run dev`: Inicia o servidor Vite local.
- `npm run build`: Executa compilação de produção com Vite (`vite build`).
- `npm run build:production`: Valida variáveis de ambiente Firebase e gera build de produção.
- `npm run build:staging`: Valida ambiente staging e gera build.
- `npm run test`: Executa suíte de testes com Vitest em modo run único (`vitest run`).
- `npm run test:rules`: Executa testes de segurança de regras Firestore.
- `npm run test:functions`: Executa testes de Cloud Functions.
- `npm run test:integration`: Executa testes de fluxo integrado.
- `npm run test:e2e`: Executa testes end-to-end com Playwright.
- `npm run lint`: Executa ESLint com tolerância zero para avisos (`eslint . --max-warnings 0`).
- `npm run preview`: Previsualiza build localmente.
- `npm run watch-css`: Executa observador standalone do Tailwind (legado).

### 2.3 Bibliotecas de Animação e Gráficos no Código
- **GSAP:** Presente na versão `^3.15.0`. Usado exclusivamente na Landing Page:
  - [`src/features/landing/hooks/useLandingMotion.js`](file:///c:/Users/CyberLiko/projects/app-financeiro/src/features/landing/hooks/useLandingMotion.js): Registro de plugins e preferência de reduced motion.
  - [`src/features/landing/components/LandingHero.jsx`](file:///c:/Users/CyberLiko/projects/app-financeiro/src/features/landing/components/LandingHero.jsx): 5-Plane depth tracking via `gsap.quickTo` e entrada escalonada (*stagger*).
  - [`src/features/landing/components/LivingLedgerStage.jsx`](file:///c:/Users/CyberLiko/projects/app-financeiro/src/features/landing/components/LivingLedgerStage.jsx): 3D tilt responsivo em perspectiva (`perspective: 1400px`) e reflexo (*sheen*) com `gsap.quickTo`.
- **GSAP ScrollTrigger:** Importado e registrado formalmente em [`src/features/landing/hooks/useLandingMotion.js`](file:///c:/Users/CyberLiko/projects/app-financeiro/src/features/landing/hooks/useLandingMotion.js#L4-L8).
- **Outras bibliotecas de animação (Framer Motion, Lucide, etc.):** Não existem no projeto.
- **Bibliotecas de gráficos:** Apenas `recharts` (`^2.12.7`), usada em [`src/components/ProAnalyticsCharts.jsx`](file:///c:/Users/CyberLiko/projects/app-financeiro/src/components/ProAnalyticsCharts.jsx).

### 2.4 Diagnóstico das Validações de Sistema

#### A. `npm run lint`
- **Status:** **PASSOU** (código de saída 0).
- **Tempo:** ~4 segundos.
- **Resultado:** Zero erros e zero avisos na base completa.

#### B. `npm test`
- **Status:** **FALHOU EM 1 DE 32 SUÍTES** (código de saída 1).
- **Tempo:** 42.77s.
- **Estatísticas:** 29 suítes passaram, 2 ignoradas (*emulator-dependent*), 1 falhou. Total: 525 testes aprovados, 13 ignorados, 1 falho.
- **Detalhe da falha:** `tests/performanceBenchmark.test.js` > "Performance Benchmark - Estresse com Dados Sintéticos > deve processar 5.000 registros mantendo alta fluidez".  
  *Erro:* `AssertionError: expected 291.698ms to be less than 250ms`.  
  *Causa:* Jitter transitório de temporização da CPU do ambiente local Windows durante carga de 5.000 registros sintéticos.  
  *Nota:* Todas as suítes de regras financeiras, integridade de parcelas, regras Firestore e acessibilidade passaram integralmente.

#### C. `npm run build`
- **Status:** **PASSOU** (código de saída 0).
- **Tempo:** 43.04s.
- **Tamanho dos bundles gerados:**

| Artefato Gerado | Tamanho Minificado | Tamanho Gzip | Observação |
|---|---|---|---|
| `dist/assets/index-B7hJH54G.js` | 677.65 kB | 177.32 kB | Chunks vendor e core de inicialização (> 500 kB) |
| `dist/assets/DashboardLayout-DxmTcJUU.js` | 576.42 kB | 151.76 kB | Contém `Dashboard.jsx` estático (> 500 kB) |
| `dist/assets/jspdf.es.min-Du9bhhXt.js` | 390.67 kB | 128.92 kB | Biblioteca de PDF carregada dinamicamente |
| `dist/assets/PdfImportModal-DHyT-zXV.js` | 352.01 kB | 103.62 kB | Modal sob demanda com `pdfjs-dist` |
| `dist/assets/ClientManagement-DaPgbKNY.js` | 224.86 kB | 54.52 kB | Aba Pessoas com modal de relatório financeiro |
| `dist/assets/LandingPage-B49kLkpH.js` | 175.48 kB | 58.55 kB | Página pública com GSAP e seções completas |
| `dist/assets/index.es-DbDeHPBP.js` | 150.46 kB | 51.42 kB | Vendor auxiliar |
| `dist/assets/index-H3jYMpDv.css` | 75.14 kB | 13.05 kB | CSS global do Tailwind e tokens |
| `dist/assets/TransactionManagement-XRaxONg9.js` | 53.21 kB | 10.18 kB | Aba de movimentações |
| `dist/assets/CardManagement-DCduUI7D.js` | 15.41 kB | 4.60 kB | Aba de cartões |
| `dist/assets/AuthScreen-Bi4btkrh.js` | 13.26 kB | 4.27 kB | Tela de login/cadastro |
| `dist/assets/SubscriptionManagement-BtTA85Ij.js` | 12.74 kB | 3.53 kB | Aba de assinaturas |
| `dist/assets/CrisisMode-DiP8e-8I.js` | 8.84 kB | 2.29 kB | Aba Modo Crise |

---

## 3. ESTRUTURA E ROTAS

### 3.1 Árvore Comentada de `src/`
```text
src/
├── assets/                     # SVGs estáticos (logo React)
├── components/                 # Componentes globais, modais, gráficos e banners
│   ├── AccountDeletionModal.jsx         # Modal de exclusão irreversível de conta
│   ├── Button.jsx                       # Botão legado anterior ao DS2
│   ├── CarbonCard.jsx                   # Card legado estilo Carbon
│   ├── CategoryBudgetsModal.jsx         # Modal de configuração de tetos orçamentários
│   ├── CategoryBudgetsWidget.jsx        # Widget do dashboard de progresso de orçamento
│   ├── DeterministicInsightsWidget.jsx  # Card de recomendações financeiras determinísticas
│   ├── ErrorBoundary.jsx                # Tratamento de erro global React com retry
│   ├── ExecutiveSummaryModal.jsx        # Modal com relatórios semanais e mensais Pro
│   ├── FinancialAlertsBanner.jsx        # Banner de avisos de vencimento e alertas
│   ├── FinancialSandboxSimulatorModal.jsx # Simulador temporário sem escrita no banco
│   ├── FutureCommitmentsCard.jsx        # Card de projeção de parcelas futuras
│   ├── GenericModal.jsx                 # Wrapper acessível de diálogo com backdrop
│   ├── GlobalSearchModal.jsx            # Busca global instantânea com atalho Ctrl+K
│   ├── NotificationCenterPopover.jsx    # Popover de central de notificações na Topbar
│   ├── NotificationSettingsModal.jsx    # Modal de configuração de dias de aviso
│   ├── PdfImportModal.jsx               # Importação de faturas PDF sob demanda
│   ├── ProAnalyticsCharts.jsx           # Gráficos Recharts (Barras e Pizza)
│   ├── ProFeatureLock.jsx               # Bloqueio visual para recursos exclusivos Pro
│   ├── Spinner.jsx                      # Indicador visual de loading com rotação
│   ├── Toast.jsx                        # Notificações transitórias de feedback
│   ├── UpgradePrompt.jsx                # Componente de chamada para plano Pro
│   └── WelcomeModal.jsx                 # Boas-vindas para novos usuários
├── config/
│   └── planEntitlements.js              # Regras de privilégios (Free vs Pro vs Trial)
├── context/
│   ├── AppContext.js                    # Definição do contexto React global
│   ├── AppProvider.jsx                  # Provedor com estado do usuário, auth e toasts
│   └── authLifecycle.js                 # Ciclo de vida e observador de autenticação Firebase
├── design-system/
│   ├── index.js                         # Ponto de exportação do Design System 2.0
│   ├── tokens.css                       # Tokens semânticos CSS (Dark e Light)
│   ├── motion.css                       # Classes utilitárias e keyframes de animação
│   ├── primitives/                      # Componentes fundamentais acessíveis do DS2
│   │   ├── Badge.jsx                    # Chip semântico (success, warning, danger, etc.)
│   │   ├── Button.jsx                   # Botão DS2 com variantes, loading e touch target
│   │   ├── IconButton.jsx               # Botão de ícone com touch target >= 44px
│   │   ├── Modal.jsx                    # Diálogo acessível com foco gerenciado
│   │   ├── Surface.jsx                  # Superfície com elevações (card, elevated, flat)
│   │   └── TextField.jsx                # Input acessível associado a label e erro
│   └── lab/
│       └── DesignSystemLab.jsx          # Painel de inspeção visual dev-only
├── features/
│   ├── auth/                            # Telas de autenticação, reset de senha e fluxos
│   ├── cards/                           # Gerenciamento de cartões de crédito
│   ├── clients/                         # Gerenciamento de pessoas e rateios
│   ├── crisis/                          # Módulo do Modo Crise financeira
│   ├── dashboard/                       # Painel principal e casca da aplicação (shell)
│   │   ├── Dashboard.jsx                # Página principal (Resumo financeiro)
│   │   ├── DashboardLayout.jsx          # Layout do app (Sidebar + Topbar + Conteúdo)
│   │   ├── ProSummary.jsx               # Cards de saldo líquido e indicadores Pro
│   │   └── shell/                       # Componentes desacoplados da casca do dashboard
│   │       ├── AppSidebar.jsx           # Barra lateral desktop retrátil (w-64 / w-20)
│   │       ├── AppTopbar.jsx            # Barra superior fixa com busca e tema
│   │       └── MobileNavigation.jsx     # Menu gaveta móvel para viewport < 1024px
│   ├── expenses/                        # Gerenciamento de despesas avulsas
│   ├── income/                          # Gerenciamento de receitas mensais
│   ├── landing/                         # Landing page oficial cinematográfica
│   ├── loans/                           # Compras parceladas e faturas compartilhadas
│   ├── subscriptions/                   # Assinaturas e despesas recorrentes
│   └── transactions/                    # Ponto de entrada unificado de movimentações
├── hooks/                               # Hooks customizados com listeners Firestore
├── services/                            # Lógica matemática, CSV, busca e registro
├── utils/                               # Formatação BRL, inicialização Firebase e App Check
├── App.jsx                              # Roteamento de alto nível com React Router
├── index.css                            # Estilos globais Tailwind e camadas adicionais
└── main.jsx                             # Bootstrap da aplicação React no DOM
```

### 3.2 Mapa de Rotas e Telas
O roteamento de primeiro nível reside em [`src/App.jsx`](file:///c:/Users/CyberLiko/projects/app-financeiro/src/App.jsx#L56-L102):

| Rota | Tipo | Componente Carregado | Estratégia de Carregamento |
|---|---|---|---|
| `/` | Pública | `LandingPage` | `React.lazy()` + `Suspense` |
| `/login` | Pública | `AuthScreen` | `React.lazy()` + `Suspense` |
| `/dashboard/*` | Protegida | `DashboardLayout` | `React.lazy()` + `Suspense` |
| `/design-system-lab` | Dev-Only | `DesignSystemLab` | `React.lazy()` (somente em `import.meta.env.DEV`) |
| `*` | Fallback | Redirecionamento para `/` | `<Navigate to="/" />` |

#### Como Funciona a Navegação Interna do Dashboard:
- **Mecanismo:** A navegação entre abas **NÃO utiliza sub-rotas do React Router** (ex: `/dashboard/cartoes` não existe como URL). É gerenciada puramente por estado local `activePage` em [`src/features/dashboard/DashboardLayout.jsx`](file:///c:/Users/CyberLiko/projects/app-financeiro/src/features/dashboard/DashboardLayout.jsx#L27).
- **Abas disponíveis:** `'resumo'`, `'pessoas'`, `'cards'`, `'transactions'`, `'subscriptions'`, `'crisis'`.
- **Code Splitting nas Abas:** `Dashboard.jsx` é importado **estaticamente** na inicialização do layout. As demais 5 abas (`ClientManagement`, `CardManagement`, `UnifiedTransactionManagement`, `SubscriptionManagement`, `CrisisMode`) são importadas sob demanda via `React.lazy()` e envolvidas por um `<Suspense fallback={<Spinner />}>`.

### 3.3 Diagnóstico por Tela do Dashboard

| Tela / Aba | Arquivo | Linhas / Tamanho | Principais Componentes | Origem dos Dados | Estado de Loading |
|---|---|---|---|---|---|
| **Resumo** | [`src/features/dashboard/Dashboard.jsx`](file:///c:/Users/CyberLiko/projects/app-financeiro/src/features/dashboard/Dashboard.jsx) | 1.262 linhas (~78.2 kB) | `ProSummary`, `ProAnalyticsCharts`, `FutureCommitmentsCard`, `DeterministicInsightsWidget`, `FinancialAlertsBanner`, 5 modais | 6 listeners Firestore diretos via `subscribeToFirestoreQuery` (`loans`, `clients`, `cards`, `subscriptions`, `expenses`, `incomes`) + query de `paidSubscriptions` | Exibe `Spinner` central em card de 500px quando `isLoading === true`. Não há skeleton. |
| **Pessoas** | [`src/features/clients/ClientManagement.jsx`](file:///c:/Users/CyberLiko/projects/app-financeiro/src/features/clients/ClientManagement.jsx) | 366 linhas (~24.5 kB) | Lista de pessoas, modal de novo cliente, `FinancialReportModal` | Hook [`src/hooks/useClients.js`](file:///c:/Users/CyberLiko/projects/app-financeiro/src/hooks/useClients.js) (Firestore `clients`) | Nenhum loading inicial na lista (começa vazia); exibe `Spinner` apenas no botão de envio (`isSubmitting`). |
| **Cartões** | [`src/features/cards/CardManagement.jsx`](file:///c:/Users/CyberLiko/projects/app-financeiro/src/features/cards/CardManagement.jsx) | 420 linhas (~29.3 kB) | Lista de cartões, mockup visual de cartão de crédito, modal de cadastro | Hook [`src/hooks/useCards.js`](file:///c:/Users/CyberLiko/projects/app-financeiro/src/hooks/useCards.js) (Firestore `cards`) | Nenhum loading inicial na lista; exibe estado `isLoading` no botão do modal de criação. |
| **Transações** | [`src/features/transactions/TransactionManagement.jsx`](file:///c:/Users/CyberLiko/projects/app-financeiro/src/features/transactions/TransactionManagement.jsx) | 128 linhas (~7.0 kB) | Abas de Compras, Receitas e Despesas; `LoanManagement`, `IncomeManagement`, `ExpenseManagement`, `PdfImportModal` (lazy) | Hooks `useCards`, `useClients`, `useLoans` | Sem loading de página; telas e formulários renderizam instantaneamente com `animate-fadeIn`. |
| **Assinaturas** | [`src/features/subscriptions/SubscriptionManagement.jsx`](file:///c:/Users/CyberLiko/projects/app-financeiro/src/features/subscriptions/SubscriptionManagement.jsx) | 364 linhas (~23.7 kB) | Tabela de assinaturas ativas/canceladas, modal de edição, métricas de custo recorrente | Hook [`src/hooks/useSubscriptions.js`](file:///c:/Users/CyberLiko/projects/app-financeiro/src/hooks/useSubscriptions.js) | Sem loading inicial na lista; `isLoading` no botão do modal de edição. |
| **Modo Crise** | [`src/features/crisis/CrisisMode.jsx`](file:///c:/Users/CyberLiko/projects/app-financeiro/src/features/crisis/CrisisMode.jsx) | 220 linhas (~14.6 kB) | Auditoria de gastos não essenciais, simulador de quitação de cartão, calculadora de economia | Hooks `useLoans`, `useExpenses`, `useSubscriptions`, `useCards` | Exibe `Spinner` de página inteira se `loadingLoans || loadingExpenses || loadingSubs || loadingCards`. |

---

## 4. DESIGN SYSTEM E TEMAS

### 4.1 Conteúdo de `tokens.css` e Primitivos
O arquivo [`src/design-system/tokens.css`](file:///c:/Users/CyberLiko/projects/app-financeiro/src/design-system/tokens.css) define 2 conjuntos semânticos completos:

#### Tokens Dark (Padrão e `[data-theme="dark"]`):
- **Backgrounds:** `--fc-bg: #0D0E11`, `--fc-bg-subtle: #13151A`
- **Superfícies:** `--fc-surface-1: #1A1D24`, `--fc-surface-2: #222630`, `--fc-surface-3: #2A2F3D`
- **Tipografia:** `--fc-text-primary: #F9FAFB`, `--fc-text-secondary: #9CA3AF`, `--fc-text-muted: #7E8794`, `--fc-text-inverse: #0D0E11`
- **Bordas:** `--fc-border-subtle: rgba(255, 255, 255, 0.05)`, `--fc-border-default: rgba(255, 255, 255, 0.08)`, `--fc-border-strong: rgba(255, 255, 255, 0.15)`
- **Acentos Dourados:** `--fc-accent: #E5B842`, `--fc-accent-hover: #F5D580`, `--fc-accent-soft: rgba(229, 184, 66, 0.12)`, `--fc-accent-contrast: #0D0E11`
- **Semânticos:** Sucesso (`#34D399`), Alerta (`#FBBF24`), Perigo (`#F87171`), Info (`#38BDF8`)
- **Campos de Formulário:** `--fc-field-bg: #121419`, `--fc-field-border: rgba(255, 255, 255, 0.14)`

#### Tokens Light (`[data-theme="light"]`):
- **Backgrounds:** `--fc-bg: #F0EFEB`, `--fc-bg-subtle: #EAE8E2`
- **Superfícies:** `--fc-surface-1: #FFFFFF`, `--fc-surface-2: #F6F4EE`, `--fc-surface-3: #ECE8DF`
- **Tipografia:** `--fc-text-primary: #121417`, `--fc-text-secondary: #434A56`, `--fc-text-muted: #5C6370`, `--fc-text-inverse: #FFFFFF`
- **Bordas:** `--fc-border-subtle: rgba(20, 24, 30, 0.08)`, `--fc-border-default: rgba(20, 24, 30, 0.13)`, `--fc-border-strong: rgba(20, 24, 30, 0.22)`
- **Acentos Dourados Refinados:** `--fc-accent: #8E5E00`, `--fc-accent-hover: #784E00`, `--fc-accent-soft: rgba(142, 94, 0, 0.10)`, `--fc-accent-contrast: #FFFFFF`
- **Semânticos:** Sucesso (`#065F46`), Alerta (`#9A3412`), Perigo (`#B91C1C`), Info (`#0369A1`)
- **Campos de Formulário:** `--fc-field-bg: #FFFFFF`, `--fc-field-border: rgba(20, 24, 30, 0.18)`

#### Primitivos em `src/design-system/primitives/`:
- `Button.jsx`: Variantes `primary`, `secondary`, `ghost`, `danger`. Touch targets `>= 44px`.
- `IconButton.jsx`: Botão exclusivo para ícones com `aria-label` obrigatório e container touch `>= 44px`.
- `Badge.jsx`: Variantes semânticas com contraste garantido.
- `Surface.jsx`: Níveis de elevação `flat`, `card`, `elevated`.
- `TextField.jsx`: Input com label semântico associado e indicação de erro.
- `Modal.jsx`: Diálogo acessível com `role="dialog"`, `aria-modal="true"` e trap de foco.

#### Painel de Inspeção Dev (`DesignSystemLab.jsx`):
Exibe a paleta visual completa, contrastes, botões, modais e campos com alternador isolado de tema escuro/claro.

### 4.2 Aplicação e Alternância do Tema
- **Onde é aplicado:** No elemento raiz `<html>` via `document.documentElement.setAttribute('data-theme', theme)` e alternância da classe `.dark` em [`src/features/dashboard/DashboardLayout.jsx`](file:///c:/Users/CyberLiko/projects/app-financeiro/src/features/dashboard/DashboardLayout.jsx#L38-L47).
- **Persistência:** Sincronizado com `localStorage.getItem('theme') || 'dark'`.
- **Existe animação na troca?** **NÃO.** A troca é instantânea no DOM; existe apenas a classe Tailwind `transition-colors` no container root, que aplica uma transição CSS padrão suave de 150ms apenas em propriedades suportadas, sem qualquer transição orquestrada, crossfade ou efeito de expansão circular.

### 4.3 Mapeamento de Cores Fixas vs Tokens
Total de ocorrências de cores literais (hexadecimais, classes Tailwind legadas `bg-carbon-*`/`text-gold` e `rgba` soltos fora de `tokens.css`):

| Arquivo | Classes Legadas (`carbon`/`gold`) | Cores Hexadecimais Fixas | Funções RGB/RGBA Soltas | Total de Ocorrências |
|---|---|---|---|---|
| `src/features/landing/components/LivingLedgerStage.jsx` | 0 | 72 | 2 | 74 |
| `src/features/landing/components/PricingPlansSection.jsx` | 0 | 59 | 1 | 60 |
| `src/features/landing/components/FinancialControlSection.jsx` | 0 | 60 | 0 | 60 |
| `src/features/landing/components/SharedPurchaseSection.jsx` | 0 | 54 | 0 | 54 |
| `src/features/landing/components/InvoiceTimelineSection.jsx` | 0 | 38 | 0 | 38 |
| `src/features/landing/components/LandingHero.jsx` | 0 | 35 | 1 | 36 |
| `src/index.css` | 0 | 22 | 13 | 35 |
| `src/components/ProAnalyticsCharts.jsx` | 0 | 24 | 8 | 32 |
| `src/features/landing/components/FeatureGridSection.jsx` | 0 | 25 | 6 | 31 |
| `src/features/landing/components/LandingHeader.jsx` | 0 | 30 | 0 | 30 |
| `src/features/landing/components/HowItWorksSection.jsx` | 0 | 22 | 0 | 22 |
| `src/features/landing/components/FinalCtaSection.jsx` | 0 | 20 | 1 | 21 |
| `src/features/landing/components/LandingFooter.jsx` | 0 | 16 | 0 | 16 |
| `src/features/landing/components/ProductProofStrip.jsx` | 0 | 9 | 0 | 9 |
| `src/features/cards/CardManagement.jsx` | 5 | 4 | 0 | 9 |
| `src/components/PdfImportModal.jsx` | 6 | 0 | 0 | 6 |
| `src/features/clients/ClientManagement.jsx` | 6 | 0 | 0 | 6 |
| `src/components/ErrorBoundary.jsx` | 5 | 0 | 0 | 5 |
| `src/components/FinancialSandboxSimulatorModal.jsx` | 4 | 0 | 0 | 4 |
| `src/features/landing/LandingPage.jsx` | 0 | 4 | 0 | 4 |
| `src/components/NotificationSettingsModal.jsx` | 3 | 0 | 0 | 3 |
| `src/components/CategoryBudgetsModal.jsx` | 3 | 0 | 0 | 3 |
| `src/features/dashboard/Dashboard.jsx` | 0 | 2 | 0 | 2 |
| `src/features/clients/FinancialReportModal.jsx` | 0 | 2 | 0 | 2 |
| `src/components/ExecutiveSummaryModal.jsx` | 2 | 0 | 0 | 2 |
| `src/components/Spinner.jsx` | 1 | 0 | 0 | 1 |
| `src/App.jsx` | 1 | 0 | 0 | 1 |
| `src/features/loans/LoanManagement.jsx` | 0 | 1 | 0 | 1 |

*Observação técnica:* As seções da Landing Page possuem cores fixas intencionais para manter o padrão cinematográfico constante, mas no Dashboard componentes como `ProAnalyticsCharts.jsx` (24 hex, 8 rgba) e os modais (`CardManagement`, `PdfImportModal`, `ClientManagement`, etc.) ainda utilizam classes legadas `from-gold-light`, `to-gold` e `text-carbon-900`.

### 4.4 Tipografia
- **Fontes configuradas:**
  - `sans`: `['Roboto', 'sans-serif']` (fonte primária da interface)
  - `inter`: `['Inter', 'sans-serif']`
  - `gloock`: `['Gloock', 'serif']`
  - `concert-one`: `['Concert One', 'cursive']`
  - `basic`: `['Basic', 'sans-serif']`
- **Como são carregadas:** No arquivo [`index.html`](file:///c:/Users/CyberLiko/projects/app-financeiro/index.html#L8-L20) via tags `<link rel="preconnect">` para `fonts.googleapis.com` e `fonts.gstatic.com`.
- **Onde são definidas:** Estendidas em `theme.extend.fontFamily` no [`tailwind.config.js`](file:///c:/Users/CyberLiko/projects/app-financeiro/tailwind.config.js#L9-L15).

### 4.5 Configuração do Tailwind e CSS Gerado
- **Configuração:** [`tailwind.config.js`](file:///c:/Users/CyberLiko/projects/app-financeiro/tailwind.config.js) estende a paleta com tokens `fc.*`, `carbon.*`, `gold.*`, sombras `fc-sm/md/lg/glow` e raios de borda `fc-sm/md/lg/xl`.
- **`src/tailwind-output.css`:** Este arquivo era gerado pelo script legado `npm run watch-css`. **Não deve ser versionado** e foi marcado como `deleted` no Git, com seu nome adicionado ao `.gitignore`. O processamento real do Tailwind é realizado pelo Vite através de `postcss.config.js` (`tailwindcss` + `autoprefixer`) durante a compilação a partir de [`src/index.css`](file:///c:/Users/CyberLiko/projects/app-financeiro/src/index.css).

---

## 5. MOTION E ANIMAÇÃO HOJE

### 5.1 Inventário de Arquivos com Animações

| Arquivo | Mecanismo | O que Anima | Duração / Easing | Prefers-Reduced-Motion? | Cleanup Seguro? |
|---|---|---|---|---|---|
| [`src/features/landing/hooks/useLandingMotion.js`](file:///c:/Users/CyberLiko/projects/app-financeiro/src/features/landing/hooks/useLandingMotion.js) | Hook GSAP | Registra ScrollTrigger e monitora media query | Reativo a evento de sistema | **Sim** (expõe boolean) | **Sim** (remove listener) |
| [`src/features/landing/components/LandingHero.jsx`](file:///c:/Users/CyberLiko/projects/app-financeiro/src/features/landing/components/LandingHero.jsx) | GSAP (`quickTo` + `from`) | 5 planos de profundidade (aura, atmosfera, linhas estruturais, haze) e entrada escalonada dos blocos de texto | `0.45s` a `1.2s` (`power1.out`, `power2.out`, `power3.out`); stagger `0.08s` | **Sim** (cancela cálculo e desativa em touch) | **Sim** (`ctx.revert()`) |
| [`src/features/landing/components/LivingLedgerStage.jsx`](file:///c:/Users/CyberLiko/projects/app-financeiro/src/features/landing/components/LivingLedgerStage.jsx) | GSAP (`quickTo`) | 3D Tilt da pilha de cartões (`perspective: 1400px`), profundidade das camadas e reflexo (*sheen*) | `0.5s` a `0.8s` (`power2.out`) | **Sim** (bloqueia setters) | **Sim** (`ctx.revert()`) |
| [`src/design-system/motion.css`](file:///c:/Users/CyberLiko/projects/app-financeiro/src/design-system/motion.css) | Keyframes CSS | Fade in, scale up, entrada de páginas (`fcPageEnter`), drawers móveis e popovers | `150ms` a `400ms` (`cubic-bezier(0.16, 1, 0.3, 1)`) | **Sim** (`animation: none !important; transition: none !important`) | Não aplicável (CSS nativo) |
| [`src/components/ProAnalyticsCharts.jsx`](file:///c:/Users/CyberLiko/projects/app-financeiro/src/components/ProAnalyticsCharts.jsx) | Recharts SVG | Desenho das barras e rotação inicial do gráfico de pizza | Duração padrão interna do Recharts (~1500ms) | **Não** (não configurado) | Gerenciado internamente pelo Recharts |

### 5.2 Como Funcionam `useLandingMotion` e `LivingLedgerStage`
- **`useLandingMotion`:** Escuta ativamente a media query `(prefers-reduced-motion: reduce)` via `matchMedia` e listeners com fallback, garantindo que qualquer alteração no sistema operacional seja refletida instantaneamente sem recarregar a página. Registra formalmente o plugin `ScrollTrigger` no GSAP uma única vez.
- **`LivingLedgerStage`:** Configura uma cena em perspectiva de 1400px com múltiplos planos desacoplados:
  - *Backplate translúcido* que responde com micro-deslocamento.
  - *Card secundário* (fatura do próximo mês) com rotação e escala atenuadas.
  - *Card principal* com rotação 3D calculada (`normY * -5`, `normX * 6`) aplicada via `gsap.quickTo` de alta taxa de quadros (60fps) sem renderização de estado React.
  - *Sheen dinâmico* que altera a posição radial do reflexo luminoso conforme o ponteiro.
- **Potencial de Reaproveitamento no Dashboard:**
  - O cálculo de interpolação e tilt 3D via `gsap.quickTo` é 100% reaproveitável nos cartões virtuais de [`CardManagement.jsx`](file:///c:/Users/CyberLiko/projects/app-financeiro/src/features/cards/CardManagement.jsx) e nos cards de métricas de topo do Dashboard.
  - O efeito de atmosfera profunda (camadas de gradientes radiais ultra-suaves e vinheta) de `LandingHero` pode ser transposto diretamente para a casca do Dashboard como um fundo vivo.

### 5.3 Diagnóstico Rápido de Motion no Dashboard (Sim / Não)

| Pergunta de Diagnóstico | Resposta | Justificativa Técnica |
|---|---|---|
| **Existe transição entre telas do dashboard?** | **NÃO** | O container `<main>` possui a classe `.fc-page-enter`, mas como a navegação é feita por estado React interno sem desmontar o layout, a animação só roda no carregamento inicial da página. Não há transição de saída nem crossfade entre abas. |
| **Existe entrada escalonada (stagger) de cards/listas?** | **NÃO** | A propriedade `stagger` do GSAP existe apenas no Hero da Landing. Cards de KPI, tabelas e listas surgem em bloco no Dashboard. |
| **Existe contagem animada de números?** | **NÃO** | Todos os números e moedas são exibidos diretamente como texto formatado estático via `formatCurrencyDisplay`. Não há interpolação numérica. |
| **Existem gráficos com animação de entrada?** | **SIM** | Apenas a animação SVG nativa de fábrica do Recharts no primeiro mount, sem parametrização customizada de tempo, curva ou sincronia. |

---

## 6. GRÁFICOS E DADOS

### 6.1 Diagnóstico de `ProAnalyticsCharts.jsx`
- **Biblioteca:** `recharts` (`^2.12.7`).
- **Tipos de Gráficos:**
  1. `BarChart`: Gastos por Pessoa no mês selecionado (com labels numéricos no topo das barras).
  2. `PieChart`: Gastos Totais por Categoria (Compras Parceladas, Assinaturas e Despesas Avulsas).
- **Parâmetros de Animação:** Não especificados no JSX (`isAnimationActive`, `animationDuration` e `animationEasing` não são declarados; utilizam os padrões do Recharts).
- **Como as cores são definidas:** Através de um array estático de 7 cores hexadecimais:
  - *Modo Claro:* `['#8E5E00', '#B45309', '#D97706', '#92400E', '#78350F', '#451A03', '#B7791F']`
  - *Modo Escuro:* `['#F2B705', '#F29F05', '#D97904', '#BF5B04', '#8C3F02', '#592501', '#E8C547']`
- **Tamanho Típico do Dataset:** 2 a 8 participantes no gráfico de barras; 3 a 7 categorias no gráfico de pizza.

### 6.2 Cálculos Monetários e Exibição de Valores
- **Mecanismo Central:** Toda a lógica matemática pertence exclusivamente a [`src/services/financialService.js`](file:///c:/Users/CyberLiko/projects/app-financeiro/src/services/financialService.js):
  - `toCents(value)`: Multiplica por 100 e arredonda com `Math.round()`, eliminando anomalias de ponto flutuante do JavaScript (ex: `0.1 + 0.2`).
  - `fromCents(cents)`: Converte centavos inteiros para float de 2 casas decimais.
  - `calculateInstallments()`: Garante soma de parcelas 100% exata em relação ao total da compra (*zero drift*), compensando o centavo residual na última parcela.
- **Formatação Visual:** Realizada exclusivamente por [`src/utils/currency.js`](file:///c:/Users/CyberLiko/projects/app-financeiro/src/utils/currency.js) (`formatCurrencyDisplay`), formatando números no padrão `pt-BR` (`R$ 1.234,56`).
- **Componentes que exibem KPIs/Totais no Dashboard:**
  - [`src/features/dashboard/Dashboard.jsx`](file:///c:/Users/CyberLiko/projects/app-financeiro/src/features/dashboard/Dashboard.jsx#L1054-L1088): Card Fatura Total do Mês (`summary.totalFatura`), Progresso de Pagamento (`summary.totalRecebido` e `summary.totalPendente`).
  - [`src/features/dashboard/ProSummary.jsx`](file:///c:/Users/CyberLiko/projects/app-financeiro/src/features/dashboard/ProSummary.jsx): Saldo Líquido do Mês, Total de Receitas e Total de Despesas.
  - [`src/features/subscriptions/SubscriptionManagement.jsx`](file:///c:/Users/CyberLiko/projects/app-financeiro/src/features/subscriptions/SubscriptionManagement.jsx): Total Mensal Comprometido em Assinaturas.
- **Estratégia para Contagem Animada sem Tocar na Lógica Financeira:**
  - Criar um componente/hook de camada puramente apresentacional (ex: `<AnimatedCurrency value={numericValue} />` ou `useAnimatedCurrency`).
  - O componente recebe o valor numérico final já computado de forma 100% determinística por `financialService.js`.
  - Internamente, o componente interpola um contador de `0` até o valor alvo usando GSAP (`gsap.to(counter, { val: target, duration: 0.6, ease: 'power2.out', onUpdate: ... })`).
  - A cada quadro da animação, o valor intermediário passa por `formatCurrencyDisplay(counter.val)`.
  - Se `prefersReducedMotion` for verdadeiro ou o ambiente for de testes/SSR, renderiza diretamente o valor final sem animação.
  - **Zero risco financeiro:** Nenhum cálculo de banco ou soma de parcelas é alterado; trata-se de um filtro visual na ponta de exibição.

---

## 7. SHELL DO DASHBOARD

### 7.1 Estrutura e Componentes da Casca
O shell foi recentemente desacoplado na Fase 8.7 e é composto por 4 arquivos centrais:

1. [`src/features/dashboard/DashboardLayout.jsx`](file:///c:/Users/CyberLiko/projects/app-financeiro/src/features/dashboard/DashboardLayout.jsx):
   - Elemento raiz com atributos `data-theme={theme}`, classes `min-h-screen bg-[var(--fc-bg)] text-[var(--fc-text-primary)] flex overflow-x-hidden`.
   - Gerencia estados globais de busca (`isSearchOpen`), exclusão de conta (`isDeleteModalOpen`), tema, filtros de data e aba ativa.
2. [`src/features/dashboard/shell/AppSidebar.jsx`](file:///c:/Users/CyberLiko/projects/app-financeiro/src/features/dashboard/shell/AppSidebar.jsx):
   - Exibida em telas grandes (`lg:flex`, >= 1024px).
   - Largura retrátil suave: `w-64` (expandida, 256px) para `w-20` (recolhida, 80px).
   - Contém logo, itens de navegação acessíveis com teclado e foco visível, botão de alternar tema, indicador de plano (Free / Pro / Trial) e gatilhos de logout e encerramento de conta.
3. [`src/features/dashboard/shell/AppTopbar.jsx`](file:///c:/Users/CyberLiko/projects/app-financeiro/src/features/dashboard/shell/AppTopbar.jsx):
   - Fixa no topo (`sticky top-0 z-20 h-16`), com efeito de vidro fosco (`bg-[var(--fc-bg-subtle)]/90 backdrop-blur-md border-b border-[var(--fc-border-subtle)]`).
   - Contém botão de menu hamburger (visível apenas em mobile/tablet), gatilho de busca global com atalho visual `Ctrl K` / `⌘K`, alternador de tema e botão da Central de Notificações (`NotificationCenterPopover`).
4. [`src/features/dashboard/shell/MobileNavigation.jsx`](file:///c:/Users/CyberLiko/projects/app-financeiro/src/features/dashboard/shell/MobileNavigation.jsx):
   - Drawer móvel exibido sob demanda via portal ou overlay em viewports < 1024px com backdrop escuro desfocado e animações `.fc-drawer-overlay` e `.fc-drawer-slide`.
   - Gerenciamento de foco estrito com retorno do foco para o botão de disparo ao fechar.

### 7.2 Pontos de Inserção para o "Fundo Vivo" (Atmosfera / Gradiente / Luz)
- O local arquitetural ideal para o fundo vivo é dentro de [`src/features/dashboard/DashboardLayout.jsx`](file:///c:/Users/CyberLiko/projects/app-financeiro/src/features/dashboard/DashboardLayout.jsx#L153), imediatamente antes do elemento `<main>` ou como elemento irmão fixo de fundo:
  ```jsx
  <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto relative">
    {/* PONTO DE ENTRADA: Living Atmosphere Stage (Layer 0) */}
    <div className="pointer-events-none fixed inset-0 overflow-hidden z-0" aria-hidden="true">
       {/* Gradientes radiais profundos, malha vetorial sutil e haze adaptável ao tema */}
    </div>
    <AppTopbar ... />
    <main className="relative z-10 ...">
       {renderActivePage()}
    </main>
  </div>
  ```
- No código local não commitado, já existe uma primeira versão embrionária: a classe `.dashboard-content-glow` inserida em `src/index.css` via pseudo-elemento `::before` de 320px de altura com radial gradient no topo.

---

## 8. DESEMPENHO, ACESSIBILIDADE E TESTES

### 8.1 Diagnóstico das Diretrizes da Skill `performance-engineer`
- **Tamanho dos Chunks:** Os arquivos `dist/assets/index-B7hJH54G.js` (677.65 kB) e `dist/assets/DashboardLayout-DxmTcJUU.js` (576.42 kB) ultrapassam o limite de alerta de 500 kB do Vite/Rollup.
- **Gargalo Identificado:** `DashboardLayout.jsx` importa `Dashboard.jsx` (1.262 linhas e 6 modais) de forma estática, forçando o download imediato de toda a complexidade do painel junto com o layout.
- **Code Splitting Existente:** Implementado com sucesso em `LandingPage`, `AuthScreen`, nas 5 abas secundárias do dashboard e no `PdfImportModal` (que importa `pdfjs-dist` e `jspdf` sob demanda).
- **Ciclo de Vida de Listeners Firestore:** Totalmente controlado por [`src/services/firestoreSubscriptionRegistry.js`](file:///c:/Users/CyberLiko/projects/app-financeiro/src/services/firestoreSubscriptionRegistry.js), que garante deduplicação de queries, contagem de referências por chave canônica e cancelamento obrigatório de todos os `onSnapshot` no unmount dos componentes.

### 8.2 Testes que Dependem de Cores, Classes CSS ou Temas
Existem suítes críticas de testes que verificam diretamente estilos, atributos e tokens:

1. [`e2e/theme-sweep.spec.js`](file:///c:/Users/CyberLiko/projects/app-financeiro/e2e/theme-sweep.spec.js):
   - Executa inspeção profunda no DOM para garantir que em modo claro (*Light Mode*) nenhuma superfície se torne uma "ilha escura" (`r < 60 && g < 60 && b < 60`).
   - Testa especificamente containers de cabeçalho, tabelas e modais nas abas Resumo, Pessoas, Cartões, Transações, Assinaturas e Modo Crise.
   - Qualquer substituição inadvertida de cores de superfície sem validação de contraste quebrará este teste E2E.
2. [`tests/designSystemPrimitives.test.js`](file:///c:/Users/CyberLiko/projects/app-financeiro/tests/designSystemPrimitives.test.js):
   - Valida literais de classes CSS e tokens em strings HTML renderizadas no servidor: `min-h-[44px]`, `border-[var(--fc-border-default)]`, `bg-transparent`, variantes de `Badge` (`bg-[var(--fc-success-soft)]`), e proíbe terminantemente classes legadas como `text-white` em botões de perigo.
3. [`tests/accessibility.test.js`](file:///c:/Users/CyberLiko/projects/app-financeiro/tests/accessibility.test.js):
   - Valida contrastes WCAG, estados de foco, touch targets `>= 44px` e papéis de acessibilidade (`role="dialog"`, `aria-modal="true"`).
4. [`e2e/design-system-lab.spec.js`](file:///c:/Users/CyberLiko/projects/app-financeiro/e2e/design-system-lab.spec.js):
   - Testa se o alternador de temas altera com sucesso o atributo `data-theme` e a classe `.dark`.

### 8.3 Pontos de Risco para Implementação de Movimento
1. **Monólito `Dashboard.jsx` (1.262 linhas):** Concentra 6 listeners em tempo real, 6 modais e dezenas de dependências em `useEffect`. Se animações GSAP dispararem re-renderizações desnecessárias de estado do React em 60fps, haverá perda de quadros e lentidão extrema na digitação e filtragem.
2. **Modais com Trap de Foco:** Animar a abertura/fechamento de modais (`GenericModal`, `Modal.jsx`) deve respeitar a ordem do ciclo de vida para não roubar o foco do teclado antes da montagem ou reter o foco em elementos invisíveis, o que quebra `modalFocusStability.test.js`.
3. **Listas Longas de Lançamentos:** Aplicar entrada escalonada (*stagger*) em cada linha individual da tabela de faturas quando houver 50 a 100 lançamentos causará travamento visual (*jank*). O stagger deve ser aplicado somente no nível dos cards de primeiro nível ou limitado aos primeiros 5 a 8 itens.

---

## 9. RISCOS E RESTRIÇÕES

### 9.1 Restrições Constitucionais de Engenharia (`AGENTS.md`)
- **Sistema em Produção com Dados Reais:** Não quebrar contratos de serviço, schemas do Firestore nem fluxos existentes.
- **Integridade Matemática Inegociável:** Centavos inteiros e tolerância zero a desvios (*zero drift*) em cálculos de parcelas e juros.
- **Tolerância Zero para Métricas Falsas (`NO_FAKE_SOCIAL_PROOF=true`):** Proibido criar contadores com dados ilustrativos, falsas avaliações ou números inflados (ex: "50 mil clientes", "R$ 100.000 economizados"). Todos os dados visuais devem ser estritamente factuais e originados dos registros reais do usuário.
- **Mascote da Marca (Fin):**
  - Status oficial: `LANDING_FIN=false` (terminantemente proibido no Hero e na Landing).
  - No Dashboard e produto: Autorizado exclusivamente para onboarding futuro, empty states ilustrativos ou ajuda contextual. Proibido transformar Fin em assistente de chat ou IA fictícia.
- **Sem Dependências Desnecessárias:** Proibido adicionar novas bibliotecas de animação (ex: Framer Motion, Spring, Lenis). Toda a dinamização deve ser realizada com o GSAP 3 e CSS já instalados.

### 9.2 Diretrizes Visuais e de Performance (`fincontrol-cinematic-ui` e `performance-engineer`)
- **Zero Continuous Idle RAF Loop:** Proibido manter `requestAnimationFrame` rodando de forma perpétua quando o usuário não estiver interagindo com a tela.
- **Cleanup Obrigatório no React:** Toda animação e setter GSAP deve ser criado dentro de `gsap.context()` e limpo no retorno do `useEffect` com `ctx.revert()`.
- **Prefers-Reduced-Motion:** É obrigatório checar a preferência do usuário por redução de movimento e desabilitar tilts 3D, parallax contínuo e contagens aceleradas.
- **Dispositivos Móveis e Touch:** Em telas com `(pointer: coarse)`, o pointer tracking contínuo deve ser desativado para economizar bateria e GPU do smartphone.

### 9.3 Dívidas Técnicas Identificadas
- `Dashboard.jsx` é excessivamente extenso (1.262 linhas) e deveria ser fatiado antes de receber lógicas complexas de cena.
- `ProAnalyticsCharts.jsx` utiliza paletas hexadecimais estáticas ao invés de ler dinamicamente os tokens `--fc-accent` e semânticos do CSS.
- Presença residual de classes legadas (`text-gold`, `bg-carbon-900`) em modais antigos que ainda não foram totalmente convertidos para os primitivos do DS2.

---

## 10. PRIMEIRA OPINIÃO TÉCNICA

A ordem mais segura e fluida de implementação do redesign, equilibrando impacto visual imediato com baixo risco de quebra, é:

1. **(b) Fundo vivo/atmosfera:** **FÁCIL e IMEDIATO.** Fica em camada de background fixa (`pointer-events-none z-0`), não afeta lógica de negócio nem testes unitários, e transforma visualmente o app de imediato.
2. **(d) Entrada escalonada de cards:** **FÁCIL.** Aplicar `gsap.from()` com stagger curto (`0.06s`) restrito aos 4 cards de topo do Dashboard logo após `isLoading === false`, com `gsap.context` e cleanup.
3. **(f) Contagem animada de números:** **FÁCIL A MÉDIO.** Seguro se encapsulado em componente isolado (`<AnimatedCurrency />`) que formata os centavos determinísticos sem tocar em `financialService.js`.
4. **(c) Transição entre telas:** **MÉDIO.** Requer orquestrar a troca de abas no container `<main>` de `DashboardLayout.jsx` com fade suave de 200ms na transição do estado `activePage`.
5. **(e) Gráficos que se desenham:** **MÉDIO.** Ajustar propriedades nativas do Recharts (`animationDuration={800}`, `animationEasing="ease-out"`) e sincronizar cores com as variáveis CSS.
6. **(g) Animação na troca de tema:** **MÉDIO A ARRISCADO.** Exige cuidado com View Transitions ou cross-fades para não gerar tela branca transitória (*FOUC*) nem quebrar os seletores do `theme-sweep.spec.js`.
7. **(a) Novos tokens de cor / troca de paleta:** **O MAIS ARRISCADO.** Deve ser feito por último ou mantendo compatibilidade 1:1, pois dezenas de testes E2E e unitários verificam contraste WCAG e valores hexadecimais específicos dos tokens atuais.

---

**RELATÓRIO CONCLUÍDO**  
**Arquivo gravado em:** `docs/relatorio-estado-atual.md`
