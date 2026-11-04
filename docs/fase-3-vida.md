# Relatório de Engenharia — Fase 3: Telas Vivas (Skeletons, Entrada Escalonada e Troca de Aba com Onda)

**Data:** 04 de Novembro de 2026  
**Branch:** `feat/redesign-fase-3-vida`  
**Base:** `feat/redesign-fase-2-atmosfera` (`0965bfd`)  
**Status:** Concluído com Sucesso — 100% dos testes aprovados, zero regressões financeiras ou visuais.

---

## 1. Resumo Executivo

A Fase 3 do Redesign do FinControl trouxe vida, ritmo cinematográfico e feedback contínuo de carregamento para todo o dashboard, eliminando o comportamento estático e os "piscas" visuais em transições de dados.

### Principais Entregas
1. **Fundações de Motion & Skeleton Primitives:**
   - Criação de tokens centralizados de timing, ease e limites de FPS em `src/design-system/motion.js`.
   - Sistema de esqueleto (`Skeleton` e `SkeletonPage`) com efeito shimmer CSS (`@keyframes fcShimmer`), respeitando `prefers-reduced-motion` e padrões estritos de acessibilidade (`role="status"`, `aria-busy="true"`, zero elementos focáveis).
   - Suíte de demonstração e teste interativo no `DesignSystemLab` (Seção H).

2. **Estados de Carregamento Reais nas Telas:**
   - Adição aditiva da propriedade `isLoading` em todos os hooks de dados (`useCards`, `useClients`, `useLoans`, `useExpenses`, `useSubscriptions`, `usePaidSubscriptions`), sem quebra de retrocompatibilidade.
   - Substituição do `Spinner` opaco genérico por `SkeletonPage` no `Suspense` de rotas secundárias e em todas as 6 telas do dashboard (`Resumo`, `Pessoas`, `Cartões`, `Movimentações`, `Assinaturas` e `Modo Crise`), com marcação `aria-busy` e preservação dos true empty states.

3. **Entrada Escalonada (Stagger) Fluida e Segura:**
   - Implementação do hook customizado `useEnterStagger` em GSAP, orquestrado para executar uma única vez por montagem quando `ready: !isLoading`.
   - Hierarquia cinematográfica: título entra primeiro (`data-enter="title"`, y: 14px, 0.5s) e os cards/blocos principais (`data-enter="item"`, y: 18px, 0.55s) entram em cascata com overlap de 0.25s e stagger de 0.07s.
   - Limitação estrita a 8 itens no desktop e 5 no mobile para preservação de 60fps em hardware de entrada.
   - Remoção de animação redundante `.fc-page-enter` do container `<main>` e de `motion.css`.

4. **Troca de Aba com Cortina Líquida (`PageWaveSweep`) & Navegação Centralizada:**
   - Componente `PageWaveSweep` sobreposto ao `<main>` com SVG vetorial e gradiente suave nas cores da paleta Abyss Teal.
   - Navegação unificada através da função `navigateTo(targetPage)` em `DashboardLayout.jsx`, eliminando chamadas diretas fragmentadas de `setActivePage`.
   - Transição cinematográfica: saída com fade-out da tela anterior (0.14s, y: -6px) enquanto a onda sobe; troca de tela no pico (`y = 0%`); scroll zerado (`scrollTop = 0`); entrada escalonada da nova tela enquanto a onda sai pelo topo.
   - Interrupção limpa (novos cliques matam timelines imediatamente) e bypass síncrono em mobile (`< 768px`) e sob `prefers-reduced-motion`.
   - Anúncio acessível via região `aria-live="polite"` (`.sr-only`) para tecnologias assistivas.

5. **Inviolabilidade da Segurança Visual (Visual Safety):**
   - Garantia matemática e estrutural de que **nenhum elemento fica com `opacity: 0` ou `transform` inline** após a conclusão, interrupção ou erro de qualquer animação, validado por suites automatizadas E2E e testes unitários.

---

## 2. Histórico de Commits

| Commit | Tipo | Mensagem | Arquivos Modificados / Criados |
| :--- | :--- | :--- | :--- |
| `1758e97` | `feat` | `feat(design-system): fundações de motion de entrada e Skeleton` | `src/design-system/motion.js`, `src/design-system/motion.css`, `src/hooks/useEnterStagger.js`, `src/design-system/primitives/Skeleton.jsx`, `src/design-system/index.js`, `src/design-system/lab/DesignSystemLab.jsx`, `tests/skeleton.test.js`, `tests/useEnterStagger.test.js` |
| `2d5b843` | `feat` | `feat(dashboard): skeletons de carregamento nas telas` | `src/hooks/useCards.js`, `src/hooks/useClients.js`, `src/hooks/useExpenses.js`, `src/hooks/useIncomes.js`, `src/hooks/useLoans.js`, `src/hooks/useSubscriptions.js`, `src/hooks/usePaidSubscriptions.js`, `src/features/dashboard/DashboardLayout.jsx`, `src/features/dashboard/Dashboard.jsx`, `src/features/clients/ClientManagement.jsx`, `src/features/cards/CardManagement.jsx`, `src/features/transactions/TransactionManagement.jsx`, `src/features/subscriptions/SubscriptionManagement.jsx`, `src/features/crisis/CrisisMode.jsx`, `tests/tabLoadingStates.test.js` |
| `229d806` | `feat` | `feat(dashboard): entrada escalonada em todas as telas` | `src/design-system/motion.css`, `src/features/dashboard/DashboardLayout.jsx`, `src/features/dashboard/Dashboard.jsx`, `src/features/clients/ClientManagement.jsx`, `src/features/cards/CardManagement.jsx`, `src/features/transactions/TransactionManagement.jsx`, `src/features/subscriptions/SubscriptionManagement.jsx`, `src/features/crisis/CrisisMode.jsx`, `e2e/screen-enter.spec.js` |
| `26fe0a6` | `feat` | `feat(dashboard): troca de aba com onda e navegação centralizada` | `src/features/dashboard/DashboardLayout.jsx`, `src/features/dashboard/shell/PageWaveSweep.jsx`, `tests/pageTransition.test.js`, `e2e/screen-enter.spec.js` |

---

## 3. Catálogo de Componentes de Carregamento

| Componente | Variante | Propósito | Onde Foi Aplicado | Acessibilidade (A11y) |
| :--- | :--- | :--- | :--- | :--- |
| `Skeleton` | `block` | Placeholder retangular para containers e cards | Utilizado na composição de `SkeletonPage` e no `DesignSystemLab` | `aria-hidden="true"` |
| `Skeleton` | `text` | Placeholder para linhas de texto, títulos e subtítulos | Utilizado em cabeçalhos do `SkeletonPage` e tabelas de carga | `aria-hidden="true"` |
| `Skeleton` | `circle` | Placeholder circular para avatares e ícones | Utilizado em cabeçalhos de perfil e KPIs | `aria-hidden="true"` |
| `Skeleton` | `card` | Superfície com borda suave simulando cards de dashboard | Utilizado em grids de KPIs e listas | `aria-hidden="true"` |
| `SkeletonPage` | Composição completa | Layout estruturado com header, grid de 4 KPIs e container de tabela | Renderizado enquanto `isLoading` for `true` em `Dashboard`, `ClientManagement`, `CardManagement`, `TransactionManagement`, `SubscriptionManagement`, `CrisisMode` e no fallback do `Suspense` em `DashboardLayout` | `role="status"`, `aria-busy="true"`, texto oculto `"Carregando dados da tela..."`, zero elementos interativos focáveis |

---

## 4. Matriz de Orquestração de Motion

| Animação | Componente / Elemento | Trigger | Duração | Easing | Propriedades Animadas | Mecanismo de Limpeza (Visual Safety) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Shimmer** | `.fc-skeleton-shimmer` | Montagem do Skeleton | `1.4s` (infinito) | Linear | `background-position` | Desativado (`animation: none`) sob `prefers-reduced-motion` |
| **Title Entrance** | `[data-enter="title"]` | Montagem da tela com `ready: true` | `0.50s` | `power3.out` | `opacity: 0 -> 1`, `y: 14px -> 0` | `clearProps: 'transform,opacity'` no completion callback |
| **Items Stagger** | `[data-enter="item"]` | `0.25s` após o início do título | `0.55s` (stagger `0.07s`) | `power3.out` | `opacity: 0 -> 1`, `y: 18px -> 0` | `clearProps: 'transform,opacity'` no completion callback e em `catch` |
| **Page Exit** | Container de conteúdo em `DashboardLayout` | Chamada de `navigateTo(target)` | `0.14s` | `power2.in` | `opacity: 1 -> 0`, `y: 0 -> -6px` | Resetado no pico (`onPeak`) com `clearProps: 'transform,opacity'` |
| **Wave Rise (Peak)** | `PageWaveSweep` (cobre a tela) | Início da transição de aba | `0.27s` (45% do ciclo) | `power2.inOut` | `y: 100% -> 0%` | Aciona `onPeak()`: atualiza `activePage`, zera scroll e anuncia tela |
| **Wave Exit** | `PageWaveSweep` (sai pelo topo) | Imediatamente após `onPeak()` | `0.33s` (55% do ciclo) | `power2.out` | `y: 0% -> -100%` | `display: none` + `clearProps: 'transform,opacity'` no término |

---

## 5. Medições de Performance & Recursos

### Comparativo de Bundles de Produção (Vite Build)
| Bundle / Chunk | Fase 2 (Atmosfera) | Fase 3 (Telas Vivas) | Variação Líquida | Análise de Impacto |
| :--- | :--- | :--- | :--- | :--- |
| **`DashboardLayout-*.js`** | 584.97 kB (gzip 153.69 kB) | 592.83 kB (gzip 155.88 kB) | +7.86 kB (+2.19 kB gzip) | Mínimo impacto para incorporar `PageWaveSweep`, transições GSAP, live region e centralização |
| **`index-*.css`** | 76.67 kB (gzip 13.48 kB) | 77.19 kB (gzip 13.57 kB) | +0.52 kB (+0.09 kB gzip) | Adição do shimmer CSS para os Skeletons e remoção do CSS legado `.fc-page-enter` |
| **`index-*.js` (Vendor/Core)** | 677.71 kB (gzip 177.32 kB) | 677.71 kB (gzip 177.31 kB) | -0.01 kB gzip | Zero impacto em dependências externas ou módulos essenciais |
| **Chuncks Secundários (Tabs)** | ~8 kB a 225 kB | ~8 kB a 225 kB | Neutro | Code splitting em nível de abas preservado integralmente |

### Verificação de Loops e Concorrência na Main Thread
- **Loops Ociosos de `requestAnimationFrame`:** `0` (Zero). Confirmado com busca estrita `git grep -n "requestAnimationFrame" src/`. O tracking do ponteiro utiliza event listeners passivos com `gsap.quickTo`, e o shimmer é 100% offloaded para a engine de CSS do navegador.
- **Medição de Long Tasks (> 50ms):**
  - Avaliado através de teste automatizado Playwright (`e2e/tab-perf.spec.js`) com `PerformanceObserver('longtask')` registrando a execução durante 5 trocas consecutivas de abas.
  - **Tarefas Longas Durante Transições:** Exatamente **4 tarefas**, todas inferiores a 98ms, correspondentes unicamente à compilação/transformação on-demand de módulos JSX pelo Vite dev server.
  - Durante o playback da animação da onda e da entrada em cascata: **Zero long tasks** induzidas por layout thrashing ou recalcs desnecessários.
- **Permanent `will-change`:** `0` (Zero). A classe `will-change-transform` é aplicada exclusivamente na trilha da onda enquanto ativa, sendo ocultada com `display: none` e desarmada em repouso.

---

## 6. Matriz de Segurança Visual (Visual Safety Matrix)

| Teste de Segurança Visual | Condição Testada | Resultado | Garantia de Engenharia |
| :--- | :--- | :--- | :--- |
| **Opacidade Residual Inline** | Todas as 6 abas após transição completa | **Zero elementos com `opacity: 0`** | `clearProps: 'opacity'` obrigatório em completion callbacks |
| **Transform Residual Inline** | Elementos marcados com `data-enter` | **Zero transforms residuais** | `clearProps: 'transform'` garante que coordenadas retornem ao layout estático |
| **Interrupção de Transição** | Clique rápido alternado entre abas | **Zero quebras / Zero congelamentos** | `timeline.kill()` cancela a timeline anterior e reinicia do ponto inicial |
| **`prefers-reduced-motion`** | Emulação de `reduced-motion: reduce` | **Conteúdo 100% visível na hora** | Bypass síncrono imediato de `onPeak` e `onComplete` sem criar timelines GSAP |
| **Navegação Mobile (< 768px)** | Viewport móvel sem animações pesadas | **Transição síncrona sem onda** | Desativação automática da cortina para economia de recursos e foco na agilidade |
| **Fallback de Exceção (Try/Catch)** | Falha em render ou callback de animação | **Nenhum elemento preso no limbo** | Bloco `catch` aciona `clearProps` preventivo e invoca `onPeak` de fallback |

---

## 7. Status e Cobertura de Testes

### 1. Testes Unitários e de Integração (Vitest)
- **Comando:** `npm test`
- **Total de Suítes:** 36 passadas | 2 ignoradas (emuladores de infraestrutura) | 0 falhas.
- **Total de Testes:** **566 testes aprovados** | 13 ignorados | 0 falhas.
- **Tempo Médio de Execução:** ~30 a 35 segundos.

#### Novas Suítes Desenvolvidas na Fase 3:
1. `tests/skeleton.test.js` (9 testes aprovados):
   - Renderização correta de todas as variantes (`block`, `text`, `circle`, `card`).
   - Propriedades de acessibilidade de `SkeletonPage` (`role="status"`, `aria-busy="true"`, ausência de elementos focáveis).
   - Efeito shimmer condicionado à ausência de `prefers-reduced-motion`.
2. `tests/useEnterStagger.test.js` (5 testes aprovados):
   - Orquestração de entrada de título seguida de itens com overlap.
   - Limite estrito de itens (`maxItems`) para preservação de 60fps.
   - Chamada obrigatória de `clearProps` em sucesso e erro.
   - Comportamento de bypass sob `prefers-reduced-motion`.
3. `tests/tabLoadingStates.test.js` (8 testes aprovados):
   - Exibição de `SkeletonPage` em cada tela enquanto os hooks estão carregando (`isLoading: true`).
   - Atributo `aria-busy` condicional nas cascas das telas.
   - Preservação de true empty states quando o carregamento termina com arrays vazios.
4. `tests/pageTransition.test.js` (8 testes aprovados):
   - Execução do método `sweep()` e chamada precisa de `onPeak` no meio da transição.
   - Clicar na mesma aba ativa ignora a navegação e evita re-renders.
   - Interrupção rápida com cancelamento de timeline sem travar estados.
   - Bypass síncrono em `prefers-reduced-motion` e mobile.

### 2. Qualidade e Análise Estática (ESLint)
- **Comando:** `npm run lint` (`eslint . --max-warnings 0`)
- **Resultado:** **0 erros, 0 avisos** (Zero Warnings Policy estritamente cumprida).

### 3. Testes End-to-End em Navegador Real (Playwright)
- **`e2e/screen-enter.spec.js`:** 2 testes aprovados (22.0s). Validação de entrada escalonada, ausência de opacidade ou transform residual em todas as 6 abas, e visualização imediata sob reduced motion.
- **`e2e/theme-sweep.spec.js`:** 7 testes aprovados (43.9s). Varredura de temas Light e Dark em todas as telas sem conflitos visuais ou regressões.
- **`e2e/living-background.spec.js`:** 2 testes aprovados (12.5s). Atmosfera em camadas e ausência de elementos interativos no background.
- **`e2e/design-system-lab.spec.js`:** 4 testes aprovados (17.4s). Validação de primitivas, foco acessível, modal trap e responsividade.
- **`e2e/tab-perf.spec.js`:** 1 teste aprovado (14.4s). Medição de long tasks e fluidez durante a navegação entre abas.

---

## 8. Atualização das Diretrizes de Engenharia (.agents/skills)

A skill [`fincontrol-cinematic-ui`](file:///c:/Users/CyberLiko/projects/app-financeiro/.agents/skills/fincontrol-cinematic-ui/SKILL.md) foi expandida com a seção **8. Motion de Página (Page Transitions, Stagger & Skeletons)**, estabelecendo como norma arquitetural do projeto:
- O contrato de uso do hook `useEnterStagger(scopeRef, { ready, maxItems })`.
- A arquitetura da cortina translúcida `PageWaveSweep` e do método imperativo `sweep({ onPeak, onComplete })`.
- Os tempos canônicos unificados em `src/design-system/motion.js`.
- O padrão obrigatório de segurança visual com `clearProps: 'transform,opacity'`.
- As diretrizes de acessibilidade com anúncio de tela via região `aria-live="polite"`.

---

## 9. Próximos Passos (Fase 4 do Redesign)

Com a fundação de telas vivas e a transição líquida estabelecida, o projeto está pronto para a **Fase 4: Gráficos Vivos e Contadores Numéricos**:
1. **Contadores Numéricos Cinemáticos (`CountUp` / `NumberRoll`):**
   - Animação de números monetários (centavos inteiros) do saldo, faturas e limites no paint inicial, com amortecimento easing `power2.out` (~0.8s).
   - Zero drift matemático: garantia de que o valor final exibido corresponde exatamente ao centavo real calculado em `financialService.js`.
2. **Gráficos com Entrada Vetorial Dinâmica:**
   - Orquestração de desenho de linha e elevação de barras em gráficos de despesas por categoria e evolução mensal, sincronizados com a entrada escalonada da tela.
3. **Micro-interações de Dados:**
   - Feedback háptico/visual sutil ao filtrar meses ou alterar visões de cartões.
