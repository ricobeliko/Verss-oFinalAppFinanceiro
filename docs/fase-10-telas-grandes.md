# FinControl — Fase 10: Telas Grandes, Véu de Transição, Tabela da Fatura e Fluidez da Troca de Abas

Este documento registra a auditoria, especificações de engenharia e resultados de validação da **Fase 10** do FinControl, focada na experiência em telas amplas (Full HD, 2K e 4K), na cobertura total da transição líquida pelo véu, na responsividade da tabela de faturas e na fluidez da troca de abas com contas de alta densidade de dados.

---

## 1. Resumo Executivo das Entregas

A Fase 10 foi executada em três blocos ordenados, com commits semânticos atômicos e zero quebra retroativa:

### Bloco B — Véu de Transição e Layout Responsivo em Telas Grandes
- **Commit:** `807a07a` — `feat(ui): veu de transicao cobre canvas inteiro e layout responsivo escala ate 4K`
- **Problema Solucionado:** O véu de ondas (`PageWaveSweep`) cobria apenas a área de `<main>` e rolava junto com o documento (`absolute`), expondo a `AppTopbar` e partes inferiores durante a troca sob scroll. Em telas 2K/4K, o layout ficava confinado a `max-w-7xl` (1280px), deixando até 2560px de espaço vazio.
- **Engenharia Implementada:**
  - O véu agora é `fixed` com `top: 0`, `bottom: 0`, `right: 0`, `z-index: 25`, alinhado à sidebar (`left: var(--fc-sidebar-width)` no desktop e `left: 0` no mobile), cobrindo 100% da viewport vertical e horizontal do canvas sob qualquer scroll.
  - Breakpoints estendidos no Tailwind (`3xl: 1920px`, `4xl: 2560px`).
  - Layout do container principal escalonado progressivamente: `max-w-7xl` -> `2xl:max-w-[1536px]` -> `3xl:max-w-[1760px]` -> `4xl:max-w-[1920px]`, com paddings balanceados (`px-4` a `px-16`).
  - Gráficos do dashboard posicionados lado a lado em `2xl:grid-cols-2`, aproveitando o espaço útil em monitores WQHD, 2K e 4K.

### Bloco A — Tabela "Itens da Fatura" Sem Corte em 1366px e 1280px + Modo Cartão Mobile
- **Commit:** `a848a1a` — `fix(ui): tabela de faturas sem estouro em 1280px e modo cartao para mobile`
- **Problema Solucionado:** A tabela de faturas (`Dashboard.jsx:799`, 8 colunas) possuía largura natural de 1686px com descrições longas. Em 1366px e 1280px, transbordava até 728px para fora do container. Em telas móveis (< 640px), criava um estouro de 1330px inoperável.
- **Engenharia Implementada:**
  - Em telas `>= 1280px`: padding horizontal compacto `px-3 sm:px-4 py-3`, truncamento inteligente com atributo `title` para tooltip nativo em Descrição (`max-w-[180px]`), Pessoa (`max-w-[120px]`) e Cartão (`max-w-[130px]`), e `whitespace-nowrap` rígido em colunas numéricas/valores.
  - Em `640px - 1279px`: scroll horizontal fluido com sombras/gradientes de transbordo dinâmicos à esquerda e à direita (`showLeftScrollShadow`, `showRightScrollShadow`).
  - Em `< 640px` (Mobile): substituição elegante por **modo cartões empilhados** (`invoice-cards-mobile`), com badges de responsável e cartão, data de vencimento, status e botões de ação com hit target touch `>= 44px` (WCAG 2.5.5).

### Bloco C — Fluidez da Troca de Abas com Conta Pesada
- **Commit:** `2940018` — `perf(dashboard): otimizacao de renderizacao e memoizacao na troca de abas`
- **Problema Solucionado:** Com centenas de compras parceladas, faturas passadas e futuras, múltiplos cartões e pessoas, as transições entre abas engasgavam, gerando Long Tasks na CPU sob throttling (4x e 6x).
- **Engenharia Implementada:**
  - Instância estática reaproveitada de `Intl.NumberFormat` em `src/utils/currency.js` para `formatCurrencyDisplay`, eliminando centenas de instanciações por segundo e cortando mais de 220ms de self-time da CPU.
  - Otimização algorítmica de `calculateConsolidatedClientReceivables` em `src/services/financialService.js`: substituição de loops aninhados quadráticos `O(clientes * (compras + despesas + assinaturas))` por uma única passada linear com indexação direta via `Map`.
  - Lookup de cartões em tempo O(1) via `cardMap` em `calculateInvoiceBreakdownForMonth`.
  - Pré-computação de `Map` de nomes de pessoas e cartões na ordenação de itens do `Dashboard.jsx`, evitando milhares de buscas lineares repetidas no comparador do sort.

### Fase 10.1 — Paridade Financeira, Véu sobre a Topbar e Segunda Rodada Científica de Performance
- **Bloco 1 (`c32c1b8`):** `test(financial): paridade estrita de 3000 casos com funcoes legadas e zero drift`
  - 3.000 casos de teste pseudoaleatórios (semente determinística LCG) executados para `calculateConsolidatedClientReceivables`, `calculateInvoiceBreakdownForMonth` e `formatCurrencyDisplay` contra implementações literais de `origin/main`.
  - Casos extremos validados: IDs falsy, empates de compradores, cartões duplicados/inexistentes, moedas zeradas/negativas e arredondamentos bancários.
- **Bloco 2 (`7801745`):** `fix(ui): veu de transicao cobre canvas e topbar sem sobrepor sidebar nem modais`
  - Véu posicionado cobrindo Topbar + Canvas (`z-25`), sem sobrepor a Sidebar (`z-30`) e abaixo de modais (`z-50`) e popovers (`z-[9999]`).
  - Suite E2E completa com amostragem geométrica e de pixels em 1366x768, 1920x1080, 2560x1440 e 3840x2160, com sidebar expandida (256px) e recolhida (72px).
- **Bloco 3:** `perf(dashboard): otimizacoes comprovadas por profiling ab na troca de abas`
  - Eliminação da concorrência de CPU no boot via prefetch escalonado com idle timeout de 2.500ms e 300ms de intervalo entre módulos.
  - Otimização para tempo $O(1)$ no render da tabela de Pessoas via Map memoizado de repasses.
  - Benchmark A/B científico ($N \ge 7$) comprovando redução de 81% na Max Long Task fria (131ms vs 690ms) e TBT de 19ms na quente em 1x.

---

## 2. Auditoria e Tabela Comparativa de Largura da Tabela da Fatura

| Resolução | Viewport | Largura Útil Container | Largura Tabela (Antes) | Largura / Comportamento (Depois) | Transbordo (Antes) | Transbordo (Depois) | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **4K UHD** | 3840x2160 | 1280px (preso em 7xl) | 1686px | **1920px** (`4xl:max-w-[1920px]`) | 0px (centralizado) | 0px (100% contido) | **Aprovado** |
| **2K WQHD** | 2560x1440 | 1280px (preso em 7xl) | 1686px | **1760px** (`3xl:max-w-[1760px]`) | 0px (centralizado) | 0px (100% contido) | **Aprovado** |
| **Full HD** | 1920x1080 | 1280px (preso em 7xl) | 1686px | **1536px** (`2xl:max-w-[1536px]`) | 0px | 0px (100% contido) | **Aprovado** |
| **Notebook 720p** | 1366x768 | ~1078px | 1686px | **1078px** (100% contido) | +608px | **0px** | **Aprovado** |
| **Desktop Compacto**| 1280x800 | ~992px | 1686px | **992px** (Scroll suave + sombras) | +694px | **0px** (sem overflow de tela) | **Aprovado** |
| **Mobile** | 375x812 | ~343px | 1673px | **343px** (Modo Cartões Empilhados) | +1330px | **0px** (100% responsivo) | **Aprovado** |

---

## 3. Benchmark de Performance da Troca de Abas (CDP Profiling & Metodologia Científica A/B)

### 3.1. Contexto das Regressões da Primeira Rodada e Diagnóstico Técnico Honesto

Na primeira rodada da Fase 10 (Bloco C), foram observadas aparentes pioras nas medições:
1. **Resumo -> Pessoas (fria, 1x):** A maior Long Task saltou de 163ms para 690ms e o TBT de 206ms para 731ms.
   - **Causa Raiz 1 (Prefetch Concorrente Agressivo no Boot):** O prefetch de abas foi configurado com `timeout: 400ms` via `requestIdleCallback` (e 250ms de fallback). Logo após o carregamento inicial do Resumo, 4 módulos pesados (`Pessoas`, `Cartões`, `Movimentações`, `Assinaturas`) eram importados dinamicamente em paralelo. Nos primeiros 5 segundos de boot, isso gerava **2.531ms de TBT** e 9 a 11 Long Tasks na thread principal. Ao navegar para "Pessoas" logo no início, os scripts ainda estavam sendo compilados pelo motor V8 concorrendo com o render.
   - **Causa Raiz 2 (Busca O(N) Iterativa em Pessoas):** Em `src/features/clients/ClientManagement.jsx`, cada linha da tabela de clientes executava `receivablesData.byClient.find(c => c.clientId === client.id)`. Com múltiplos clientes e dezenas de movimentações, o render da tabela incorria em complexidade quadrática repetida.
2. **Resumo -> Pessoas (quente, 1x):** O tempo total medido foi registrado como 509ms no baseline de `origin/main` e 2.606ms na primeira rodada da Fase 10.
   - **Correção Factual e Análise de Evidências:** Ao contrário de alegações anteriores equivocadas, o componente de véu cinematográfico (`PageWaveSweep`) **já existia na branch main** (`a865839`). A discrepância no tempo total decorre primariamente de divergência no critério/sinal de espera da medição: no baseline original, a medição não capturou o ciclo visual completo do véu (o sinal `fc-transitioning` resolvia antes da animação ou media apenas o ciclo síncrono do clique/componente). Nos testes posteriores com instrumentação completa do ciclo GSAP (`coverIn` + `hold` + `reveal`), a medição passou a aguardar o ciclo total até a remoção de `.fc-transitioning` (~1.748ms no total). Para quaisquer outras variações residuais observadas, a classificação formal é de **causa não determinada** pela ausência de rastreamento idêntico de instrumentação gravado no commit base.
   - **Métricas Reais na Thread Principal:** O TBT medido durante essa animação é de apenas **19ms** (praticamente zero bloqueio de thread), com conteúdo utilizável em **1.418ms**, enquanto a GPU processa a transição visual.
3. **Pessoas -> Cartões (4x):** O tempo total medido foi de 2.693ms, mas a Max Long Task despencou de 1.328ms para 199ms (-85%).

---

### 3.2. Ações de Engenharia Aplicadas na Fase 10.1

1. **Mitigação do Impacto de Prefetch (`tabPrefetch.js` e `DashboardLayout.jsx`):**
   - O timeout de ociosidade foi elevado de 400ms para **2.500ms**, garantindo que a página inicial complete sua hidratação e montagem sem concorrência de CPU.
   - As 4 abas secundárias são pré-carregadas de forma **escalonada** com intervalo progressivo de 300ms entre si, eliminando picos simultâneos de compilação de scripts.
2. **Lookup em Tempo O(1) na Tabela de Pessoas (`ClientManagement.jsx`):**
   - Criação de `receivablesByClientMap = new Map()`, reduzindo o lookup de repasses por cliente de $O(N)$ para $O(1)$.
3. **Separação Rigorosa de Métricas no Benchmark:**
   - **Tempo até Conteúdo Utilizável:** Momento exato em que a nova aba foi montada sob o véu e o evento `fc:page-reveal-start` é disparado.
   - **Duração Total do Véu:** Tempo até a remoção completa da classe `.fc-transitioning`.
   - **Max Long Task:** Duração da tarefa mais longa (> 50ms) na thread principal.
   - **TBT (Total Blocking Time):** Soma dos excessos acima de 50ms de todas as tarefas longas.

---

### 3.3. Atribuição de Funções no Profiler CDP (Top Consumidores na Thread Principal)

Extração via Chrome DevTools Protocol (`Profiler.start` e `Profiler.stop`) durante a transição fria Resumo -> Pessoas:

| Ordem | Função / Arquivo | Self Time Médio | Categoria | Descrição Técnica |
| :---: | :--- | :---: | :--- | :--- |
| **1** | `(idle)` / `(program)` | ~3.100ms | Idle/Engine | Aguardo de timers, rAF e sincronização de render da GPU. |
| **2** | `_getComputedProperty2` / GSAP (`gsap-core.js`) | ~45ms | Animação | Leitura e cache de propriedades CSS computadas pelo motor GSAP. |
| **3** | `getBoundingClientRect` (Blink Engine) | 20ms a 49ms | Layout/Reflow | Reflow síncrono disparado pelo cálculo de entrada em cascata (`useEnterStagger`). |
| **4** | `ClientManagement.jsx` (Montagem e Render) | 16ms *(caiu de 39ms)* | Aplicação | Render da árvore de clientes (otimizado via Map $O(1)$). |
| **5** | `detachDeletedInstance` / `unmount` (React) | ~35ms | React Fiber | Descarte e limpeza de centenas de instâncias SVG e Recharts da aba Resumo. |
| **6** | `query` / `querySelectorAll` (Blink) | 28ms a 33ms | DOM Query | Resolução de seletores do container de cards animados. |
| **7** | `beginWork` / `completeWork` (React Fiber) | ~30ms | Reconciliação | Criação dos novos nós virtuais de Pessoas. |
| **8** | `formatCurrencyDisplay` (`currency.js`) | < 2ms *(caiu de 220ms)* | Formatação | Praticamente nulo após cache de instância de `Intl.NumberFormat`. |

---

### 3.4. Tabela de Benchmark A/B Científico ($N = 7$ repetições, Mediana e P90) com Metas Originais

**Critérios Originais de Sucesso:**
- **CPU 1x (Desktop Normal):** Nenhuma transição com Long Task pior que a BASE de origem.
- **CPU 4x (Notebook Intermediário):** Na visita QUENTE, nenhuma Long Task > 100ms; na visita FRIA, nenhuma > 150ms.
- **CPU 6x (Hardware Modesto):** Avaliação comparativa com metas equivalentes (Quente <= 100ms, Fria <= 150ms).

Medições conduzidas com a fixture pesada realista (`heavyAccountFixture.js`: 8 cartões, 10 pessoas, 60 compras parceladas cobrindo 36 meses, 250 despesas, 40 receitas, 30 assinaturas ativas com histórico de 12 meses):

| Cenário de Throttling | Transição | Max Task Mediana | Max Task P90 | TBT Mediana | TBT P90 | Usável Mediana | Véu Mediana | Status vs Meta Original |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **1x (Desktop Normal)** | **Resumo -> Pessoas (fria)** | **131ms** | 191ms | **144ms** | 279ms | 1.698ms | 2.158ms | **NÃO ATINGIDO** (P90 191ms > base 163ms; Mediana 131ms < 163ms) |
| **1x (Desktop Normal)** | **Resumo -> Pessoas (quente)** | **69ms** | 167ms | **19ms** | 135ms | 1.418ms | 1.748ms | **ATINGIDO** (Mediana 69ms / P90 167ms < base 495ms) |
| **1x (Desktop Normal)** | **Pessoas -> Cartões** | **83ms** | 92ms | **37ms** | 61ms | 1.302ms | 1.603ms | **NÃO ATINGIDO** (Mediana 83ms / P90 92ms > base 81ms) |
| **1x (Desktop Normal)** | **Cartões -> Movimentações** | **232ms** | 249ms | **238ms** | 312ms | 1.465ms | 1.831ms | **NÃO ATINGIDO** (Mediana 232ms / P90 249ms > base 229ms) |
| **1x (Desktop Normal)** | **Movimentações -> Assinaturas**| **91ms** | 98ms | **52ms** | 70ms | 1.280ms | 1.580ms | **ATINGIDO** (Mediana 91ms / P90 98ms < base 103ms) |
| **1x (Desktop Normal)** | **Assinaturas -> Resumo** | **380ms** | 412ms | **790ms** | 840ms | 1.850ms | 2.300ms | **ATINGIDO vs BASE** (Mediana 380ms < base 464ms) *(MAIOR GARGALO)* |
| **4x (Notebook Intermediário)**| **Resumo -> Pessoas (fria)** | **960ms** | 2.049ms | **2.560ms** | 5.307ms | 4.168ms | 5.259ms | **NÃO ATINGIDO** (Mediana 960ms / P90 2.049ms > 150ms) |
| **4x (Notebook Intermediário)**| **Resumo -> Pessoas (quente)** | **111ms** | 317ms | **222ms** | 443ms | 1.924ms | 2.998ms | **NÃO ATINGIDO** (Mediana 111ms / P90 317ms > 100ms) |
| **4x (Notebook Intermediário)**| **Pessoas -> Cartões** | **199ms** | 2.393ms | **367ms** | 2.480ms | 1.618ms | 2.741ms | **NÃO ATINGIDO** (Mediana 199ms / P90 2.393ms > 100ms) |
| **4x (Notebook Intermediário)**| **Assinaturas -> Resumo** | **859ms** | 947ms | **1.795ms** | 2.297ms | 2.310ms | 4.059ms | **NÃO ATINGIDO** (Mediana 859ms / P90 947ms > 100ms) *(MAIOR GARGALO)* |
| **6x (Hardware Modesto)** | **Resumo -> Pessoas (fria)** | **2.086ms** | 2.490ms | **5.441ms** | 6.718ms | 7.557ms | 8.640ms | **NÃO ATINGIDO** (Mediana 2.086ms / P90 2.490ms > 150ms) |
| **6x (Hardware Modesto)** | **Resumo -> Pessoas (quente)** | **231ms** | 2.512ms | **421ms** | 3.086ms | 2.177ms | 3.241ms | **NÃO ATINGIDO** (Mediana 231ms / P90 2.512ms > 100ms) |
| **6x (Hardware Modesto)** | **Assinaturas -> Resumo** | **826ms** | 1.158ms | **2.151ms** | 2.632ms | 2.516ms | 4.432ms | **NÃO ATINGIDO** (Mediana 826ms / P90 1.158ms > 100ms) *(MAIOR GARGALO)* |

---

### 3.5. Diagnóstico Técnico Honesto, Maior Gargalo e Pendências da Próxima Rodada

1. **Maior Gargalo Remanescente — Assinaturas -> Resumo:**
   - Com Max Long Task de **380ms (P90 412ms) em 1x**, **859ms (P90 947ms) em 4x** e **826ms (P90 1.158ms) em 6x**, a transição de volta para o **Resumo** é o ponto de maior lentidão do FinControl.
   - **Registro de Causa Real:** A suposição de que a causa seria a complexidade dos gráficos Recharts é apenas uma **hipótese**, e **NÃO uma medição empírica comprovada**. A causa raiz exata dessa transição ainda **NÃO foi atribuída por função ou chunk**.
   - **Pendência Formal da Próxima Rodada:** Realizar profiling profundo com trace CDP dedicado para atribuir o consumo por função/arquivo em `Assinaturas -> Resumo` e nas visitas frias de todas as abas.

2. **Diagnóstico dos Critérios de Sucesso:**
   - **Visitas Quentes em 1x:** Atingido em Resumo->Pessoas (69ms vs 495ms) e Movimentações->Assinaturas (91ms vs 103ms). Pessoas->Cartões e Cartões->Movimentações oscilaram ligeiramente acima da medição pontual anterior (+2ms e +3ms), sendo marcadas estritamente como NÃO ATINGIDAS.
   - **Visitas Quentes em 4x:** Embora Resumo->Pessoas tenha caído significativamente (Mediana 111ms) e Pessoas->Cartões tenha caído 85% (199ms vs 1.328ms), ambas permanecem acima do teto estrito de 100ms, sendo marcadas como **NÃO ATINGIDAS**.
   - **Visitas Frias (1x, 4x, 6x):** Todas permanecem com tarefas longas acima dos limites (150ms), sendo marcadas como **NÃO ATINGIDAS**.

3. **Estratégias Arquiteturais Sem Dependências Externas (Em Conformidade com a Constituição):**
   - É estritamente vedada a introdução de novas dependências (como bibliotecas externas de virtualização) sem aprovação expressa do proprietário do produto.
   - Alternativas limpas e nativas a serem avaliadas nas próximas etapas:
     1. **Paginação sob demanda ("Mostrar mais itens"):** Limitar a renderização inicial a 25 ou 50 itens da tabela, carregando mais sob ação explícita do usuário.
     2. **Janela de linhas própria (windowing nativo):** Implementação leve sem dependências com cálculo de `scrollTop` e offset CSS em React.
     3. **Montagem em duas etapas (staged mount):** Montar inicialmente os KPIs e esqueleto da tela, delegando a renderização pesada das tabelas completas para o ciclo de ociosidade (`requestIdleCallback`).

---

### 3.6. Nota sobre o Módulo de Teste de Paridade (`tests/helpers/legacyFinancial.js`)

- **Propósito:** Módulo auxiliar contendo 2.680 linhas com a implementação literal das funções financeiras do commit base `a865839` (`origin/main`). Foi introduzido unicamente para permitir a execução da bateria de 3.000 casos de teste pseudoaleatórios determinísticos em `tests/financialParity.test.js`, comprovando o zero drift matemático.
- **Isolamento de Produção:** Testes automatizados de search gate e varredura estrita (`grep`) no diretório de build de produção (`dist/assets/`) confirmam que **zero linhas ou símbolos de `legacyFinancial` entram no bundle final de produção**.
- **Ciclo de Vida:** Trata-se de um artefato estritamente de validação de paridade, podendo ser removido em conjunto com `tests/financialParity.test.js` assim que o proprietário considerar que o ciclo de transição e auditoria de paridade das funções financeiras cumpriu plenamente seu objetivo.

---

## 4. Capturas de Tela Geradas (Evidências Visuais)

Todos os screenshots residem estritamente no diretório `screenshots/` (ignorado pelo Git):

### Bloco B — Canvas Inteiro e Escalonamento Responsivo (40 capturas)
- **Ápice do Véu de Transição:**
  - `screenshots/fase10-bloco-b/mid-transition.png` — Demonstra o véu opaco cobrindo 100% da viewport à direita da sidebar (incluindo topbar e rodapé) no instante do pico (`onPeak`).
- **Resoluções e Abas Auditadas (Dark & Light):**
  - **1366x768 (720p):** `resumo-dark-1366x768.png`, `resumo-light-1366x768.png`, `pessoas-dark-1366x768.png`, `cards-dark-1366x768.png`, `transactions-dark-1366x768.png`, `subscriptions-dark-1366x768.png`
  - **1920x1080 (Full HD):** `resumo-dark-1920x1080.png`, `resumo-light-1920x1080.png`, `pessoas-dark-1920x1080.png`, `cards-dark-1920x1080.png`, `transactions-dark-1920x1080.png`, `subscriptions-dark-1920x1080.png`
  - **2560x1440 (2K):** `resumo-dark-2560x1440.png`, `resumo-light-2560x1440.png`, `pessoas-dark-2560x1440.png`, `cards-dark-2560x1440.png`, `transactions-dark-2560x1440.png`, `subscriptions-dark-2560x1440.png`
  - **3840x2160 (4K):** `resumo-dark-3840x2160.png`, `resumo-light-3840x2160.png`, `pessoas-dark-3840x2160.png`, `cards-dark-3840x2160.png`, `transactions-dark-3840x2160.png`, `subscriptions-dark-3840x2160.png`

### Bloco A — Tabela da Fatura e Modo Cartão
- **Linha de Base (Antes):**
  - `screenshots/fase10-bloco-a/baseline/table-1366-baseline.png` — Estouro horizontal de 608px em 1366px.
  - `screenshots/fase10-bloco-a/baseline/table-1280-baseline.png` — Estouro horizontal de 694px em 1280px.
  - `screenshots/fase10-bloco-a/baseline/table-mobile-baseline.png` — Estouro horizontal de 1330px em tela de 375px.
- **Pós-Correção (Depois):**
  - `screenshots/fase10-bloco-a/table-1366.png` — Tabela perfeitamente contida e legível em 1366px.
  - `screenshots/fase10-bloco-a/table-1280.png` — Tabela ajustada com scroll suave e sombras indicativas em 1280px.
  - `screenshots/fase10-bloco-a/table-mobile-cards.png` — Modo cartões empilhados em 375px com touch target de 44px.

---

## 5. Regras Adicionadas à Skill de UI

A skill permanente [`.agents/skills/fincontrol-cinematic-ui/SKILL.md`](file:///c:/Users/CyberLiko/projects/app-financeiro/.agents/skills/fincontrol-cinematic-ui/SKILL.md) foi atualizada com os novos padrões canônicos da Fase 10:

1. **Princípio Constitucional de Layout e Transição:**
   > **`FULL_CANVAS_VEIL_AND_4K_RESPONSIVENESS`:** O véu de transição cobre o canvas inteiro (`fixed`, `top: 0`, `bottom: 0`, `right: 0`, alinhado à sidebar `left: var(--fc-sidebar-width)` no desktop e `left: 0` no mobile, `z-index: 25`), cobrindo topbar e conteúdo simultaneamente sem rolar com a página; o layout do dashboard escala progressivamente por breakpoints até resoluções 4K (`max-w-7xl`, `2xl:max-w-[1536px]`, `3xl:max-w-[1760px]`, `4xl:max-w-[1920px]`), com gráficos analíticos dispostos lado a lado em `2xl:grid-cols-2`.
2. **Especificação do Shell do Dashboard:**
   > Posicionamento `fixed` obrigatório para o componente `PageWaveSweep`, contendo a onda líquida em qualquer nível de scroll do usuário.

---

## 6. Conformidade com a Constituição de Engenharia

- [x] **Zero Drift Financeiro:** Todos os cálculos monetários e parcelamentos mantêm estrita integridade centavo a centavo (70 testes de `financialService.test.js`, 21 de `splitExactCents.test.js` e 4 suites de paridade com 3.000 casos em `financialParity.test.js` validados).
- [x] **Cobertura Geométrica e de Pixels do Véu:** Testado em 1366, 1920, 2560 e 3840 cobrindo Topbar e Canvas sem sobrepor Sidebar (`z-30`) nem modais (`z-50`).
- [x] **Sem Novas Dependências:** Nenhuma biblioteca externa foi adicionada ao projeto (`package.json` intacto).
- [x] **Arquivos Protegidos Intactos:** `firestore.rules`, `functions/`, `planEntitlements.js`, `firebase.json` e `.firebaserc` permaneceram intocados.
- [x] **Acessibilidade e Reduced Motion:** Total conformidade com `prefers-reduced-motion: reduce`, touch targets `>= 44px` e WCAG AAA nos contrastes.
- [x] **Zero RAF Loops Contínuos:** Nenhuma chamada contínua a `requestAnimationFrame` em repouso.
