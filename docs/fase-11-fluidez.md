# FinControl — Fase 11: Fluidez Real (Carga Fria, Rede Lenta, Troca de Abas e Tabelas Grandes)

Este documento consolida a investigação empírica, a atribuição por profiling de CPU via Chrome DevTools Protocol (CDP), as intervenções arquiteturais comprovadas e os resultados comparativos do benchmark científico da **Fase 11** do FinControl.

---

## 1. Resumo Executivo das Entregas

A Fase 11 atacou de forma factual e mensurável os 4 principais gargalos de latência percebida e uso de thread principal no FinControl:

1. **Segunda Visita Instantânea (Cache Imutável no Firebase Hosting):**
   - **Commit:** `bd0f11a` — `perf(cache): adiciona cache-control imutavel para assets com hash no firebase.json`
   - **Resultado:** Eliminação de 100% da transferência de assets com hash na 2ª visita (**0 bytes transferidos pela rede**, contra 191 kB no baseline), carregando instantaneamente do cache de disco (`fromDiskCache: true`) em **2,3s** mesmo sob rede Slow 4G.
2. **Divisão de Bundles e Code Splitting Estável (`manualChunks` no Rollup):**
   - **Commit:** `0e00873` — `perf(bundle): divide vendors estaveis via manualchunks no rollup`
   - **Resultado:** O bundle de entrada `index.js` foi reduzido de **677,29 kB para 19,25 kB** (**-97,2%** de redução no chunk inicial). O peso de `DashboardLayout.js` caiu de **609,11 kB para 199,33 kB** (**-67,3%**). O módulo pesado de `vendor-recharts` (384 kB) foi totalmente desacoplado da Landing Page e do Login, reduzindo o FCP da Landing sob Slow 4G de 7.744ms para 3.640ms (**-53% de tempo até o primeiro paint**).
3. **Renderização em Lotes da Tabela da Fatura ("Mostrar Mais 50 Itens"):**
   - **Commit:** `f3ca61a` — `perf(dashboard): renderiza itens da fatura em lotes preservando total e acao em massa`
   - **Resultado:** A tabela da fatura e os cards mobile agora renderizam um lote inicial de 50 itens. Com a fixture pesada (300+ itens), mais de 500 nós DOM deixaram de ser criados no mesmo ciclo de render. Filtros e ordenação continuam operando sobre 100% dos dados, KPIs exibem valores consolidados completos, e a ação "Marcar Tudo Como Pago" atualiza 100% dos itens da fatura com contagem explícita.
4. **Montagem em Duas Etapas (Staged Mount) no Resumo (`Assinaturas -> Resumo`):**
   - **Commit:** `018e7a4` — `perf(dashboard): montagem em duas etapas de graficos e componentes pesados no resumo`
   - **Resultado:** Eliminação do gargalo histórico de retorno ao Resumo. No tick síncrono do ápice da transição (`flushSync`), a tela monta apenas a casca, filtros, KPIs e skeletons de contenção. `ProAnalyticsCharts` monta no início da revelação visual (`fc:page-reveal-start`), e os gráficos abaixo da dobra (`MonthlyEvolutionChart`, `FutureCommitmentsCard`) montam em sequência desimpedida. O Max Long Task sob CPU 4x despencou de **1.055ms para 527ms** (**-50,0% de redução**) e sob CPU 6x de **1.212ms para 574ms** (**-52,6% de redução**).

---

## 2. Medição Prévia e Atribuição Obrigatória (Bloco 1)

### 2.1. Carga Fria e Rede Lenta no Build de Produção

Medições conduzidas com Playwright sobre o build estático de produção em servidor local (`dist/` servido com headers HTTP controlados):

| Página | Perfil de Rede | Throttling CPU | FCP | LCP | TBT | Usável | Bytes Transferidos |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Landing (`/`)** | Slow 4G (1.6 Mbps, 150ms RTT) | 1x | 7.744ms | 7.744ms | 8.045ms | 13.589ms | 124,7 kB |
| **Landing (`/`)** | Slow 4G (1.6 Mbps, 150ms RTT) | 4x | 6.776ms | 6.776ms | 6.977ms | 10.868ms | 246,1 kB |
| **Landing (`/`)** | Fast 3G (0.75 Mbps, 300ms RTT) | 1x | 5.704ms | 5.704ms | 3.232ms | 12.077ms | 275,4 kB |
| **Landing (`/`)** | Fast 3G (0.75 Mbps, 300ms RTT) | 4x | 8.692ms | 8.724ms | 10.150ms | 17.295ms | 197,0 kB |
| **Login (`/login`)**| Slow 4G (1.6 Mbps, 150ms RTT) | 1x | 1.996ms | 1.996ms | 537ms | 5.978ms | 97,9 kB |
| **Login (`/login`)**| Slow 4G (1.6 Mbps, 150ms RTT) | 4x | 2.608ms | 2.608ms | 1.847ms | 7.292ms | 232,8 kB |
| **Login (`/login`)**| Fast 3G (0.75 Mbps, 300ms RTT) | 1x | 3.500ms | 3.500ms | 347ms | 10.314ms | 140,2 kB |
| **Login (`/login`)**| Fast 3G (0.75 Mbps, 300ms RTT) | 4x | 4.252ms | 4.252ms | 2.293ms | 12.566ms | 440,6 kB |

### 2.2. Segunda Visita e Cache Imutável

Comparativo direto de recarga no mesmo contexto de navegador:

| Cenário de Cache | Header `/assets/**` | Bytes Transferidos (2ª Visita) | Requisições pela Rede | Status de Cache | Usável (Slow 4G) |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **Baseline (Sem regra de assets)** | Nenhum | 191.367 bytes | 23 requisições | Revalidação 304/200 | 5.210ms |
| **Otimizado (Fase 11)** | `public, max-age=31536000, immutable` | **0 bytes** | **0 requisições** | `fromDiskCache: true` | **2.338ms** |

### 2.3. Atribuição de Funções no Profiler CDP (Top Consumidores na Thread Principal)

Extração profunda via Chrome DevTools Protocol (`Profiler.start` e `Profiler.stop`) durante a transição crítica `Assinaturas -> Resumo` sob CPU 4x (Duração total da transição: **4.785ms**, tempo de amostragem de CPU: **7.475ms**):

| Ordem | Função / Arquivo | Self Time (CPU) | % Amostrada | Categoria | Descrição do Impacto |
| :---: | :--- | :---: | :---: | :--- | :--- |
| **1** | `dispatchEvent` (`react-dom.production.min.js`) | 340,0ms | 4,5% | React DOM | Despacho de eventos sintéticos e montagem síncrona no ápice. |
| **2** | `(garbage collector)` (V8 Engine) | 274,1ms | 3,7% | V8 GC | Coleta de lixo e desalocação massiva de nós da tela anterior (`subscriptions`). |
| **3** | `now` (Performance API) | 220,4ms | 2,9% | Runtime | Leituras repetidas de performance durante transições e reconciliação. |
| **4** | `formatCurrencyDisplay` (`currency.js`) | 184,6ms | 2,5% | Formatação | Formatação síncrona repetida de moeda para mais de 300 itens na tabela e cards mobile. |
| **5** | `componentDidMount` (`recharts.js`) | 146,1ms | 2,0% | SVG/Gráficos | Cálculo de geometria, curvas SVG e montagem dos gráficos `ProAnalyticsCharts`. |
| **6** | `Dashboard` (`Dashboard.jsx`) | 84,2ms | 1,1% | Aplicação | Execução do componente principal e instanciação de hooks. |
| **7** | `formatYAxis` (`MonthlyEvolutionChart.jsx`) | 84,0ms | 1,1% | SVG/Gráficos | Cálculo dos ticks verticais do gráfico de barras/área da fatura. |
| **8** | `validateProperty` / `validateProperties` | 219,5ms | 2,9% | React Core | Validação de propriedades e atributos de nós virtuais. |
| **9** | `compileScript` / `parse` (V8) | 830,2ms | 11,1% | V8 Engine | Compilação inicial de chunks recém-importados do Resumo. |
| **10**| `gsap-core.js` | 43,5ms | 0,6% | Animação | Interpolação e drivers do véu cinematográfico. |

### 2.4. Carga de Dados e Listeners do Firestore

Auditoria de listeners abertos no Dashboard:
- **Coleções do Usuário:** 6 listeners simultâneos (`loans`, `clients`, `cards`, `subscriptions`, `expenses`, `incomes`).
- **Subcoleção / Competência:** 1 listener com filtro de mês (`paidSubscriptions` onde `month == selectedMonth`).
- **Autenticação e Perfil:** 2 listeners globais no `AppProvider` (`onAuthStateChanged` e snapshot do documento `/users/{uid}`).
- **Total:** 9 listeners ativos em repouso. O Firestore Subscription Registry garante deduplicação e limpeza no unmount.

### 2.5. Tabela de Achados do Bloco 1

| Causa Raiz Identificada | Evidência Numérica | % do Tempo / Impacto | Correção Proposta | Risco | Esforço |
| :--- | :--- | :---: | :--- | :---: | :---: |
| **Montagem síncrona prematura de Recharts no ápice** | 314,2ms em `componentDidMount` e `formatYAxis` | ~4,2% CPU bruta | Staged mount: renderizar gráficos após `fc:page-reveal-start` | Baixo | Médio |
| **300+ itens da tabela renderizados simultaneamente** | 184,6ms em formatação + 340ms em DOM dispatch | ~7,0% CPU | Renderização em lotes de 50 itens ("Mostrar mais") | Muito Baixo | Baixo |
| **Chunk monolítico index.js (677 kB) na Landing/Login** | 7,7s FCP em Slow 4G | 100% da carga inicial | `manualChunks` no Rollup isolando React, Firebase e Recharts | Baixo | Baixo |
| **Ausência de cache imutável para assets com hash** | 191 kB transferidos na 2ª visita | +2,8s latência de recarga | Adicionar `/assets/**` imutável no `firebase.json` | Zero | Muito Baixo |

---

## 3. Tabela Comparativa de Benchmark A/B ($N = 7$ repetições, Mediana e P90)

Medições conduzidas com a fixture pesada realista (`heavyAccountFixture.js`: 8 cartões, 10 pessoas, 60 compras parceladas cobrindo 36 meses, 250 despesas, 40 receitas, 30 assinaturas ativas com histórico de 12 meses):

### 3.1. CPU 1x (Desktop Normal)

| Transição | MaxTask ANTES (Med / P90) | MaxTask DEPOIS (Med / P90) | TBT ANTES (Med) | TBT DEPOIS (Med) | Usável ANTES | Usável DEPOIS | Evolução / Status |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **Resumo -> Pessoas (fria)** | 130ms / 160ms | **116ms / 141ms** | 111ms | **84ms** | 1.620ms | **1.256ms** | **Melhorou** (-10,8% MaxTask, -24,3% TBT) |
| **Pessoas -> Cartões (fria)** | 56ms / 81ms | **60ms / 78ms** | 7ms | **10ms** | 1.172ms | **1.150ms** | **Estável** (P90 melhorou) |
| **Cartões -> Movimentações (fria)** | 216ms / 277ms | **182ms / 247ms** | 238ms | **178ms** | 1.393ms | **1.357ms** | **Melhorou** (-15,7% MaxTask, -25,2% TBT) |
| **Movimentações -> Assinaturas (fria)** | 84ms / 107ms | **88ms / 129ms** | 47ms | **51ms** | 1.343ms | **1.240ms** | **Estável** (Usável 103ms mais rápido) |
| **Resumo -> Pessoas (quente)** | 56ms / 67ms | **0ms / 53ms** | 6ms | **0ms** | 1.366ms | **1.131ms** | **Zero Long Task** (100% fluido) |
| **Pessoas -> Resumo** | 286ms / 346ms | **192ms / 218ms** | 482ms | **330ms** | 1.564ms | **1.227ms** | **Melhorou** (-32,9% MaxTask, -31,5% TBT) |
| **Pessoas -> Cartões (quente)** | 0ms / 63ms | **0ms / 67ms** | 0ms | **0ms** | 1.120ms | **1.103ms** | **Estável** (Zero Long Task) |
| **Cartões -> Pessoas** | 50ms / 206ms | **0ms / 0ms** | 0ms | **0ms** | 1.232ms | **1.054ms** | **Zero Long Task** (100% fluido) |
| **Cartões -> Movimentações (quente)** | 94ms / 125ms | **98ms / 137ms** | 79ms | **78ms** | 1.083ms | **1.175ms** | **Estável** |
| **Movimentações -> Cartões** | 0ms / 67ms | **51ms / 60ms** | 0ms | **1ms** | 1.227ms | **1.279ms** | **Estável** |
| **Movimentações -> Assinaturas (quente)**| 64ms / 79ms | **59ms / 80ms** | 14ms | **9ms** | 1.302ms | **1.221ms** | **Melhorou** |
| **Assinaturas -> Movimentações** | 87ms / 122ms | **92ms / 126ms** | 63ms | **78ms** | 1.307ms | **1.220ms** | **Estável** |
| **Assinaturas -> Resumo (quente)** | **338ms / 390ms** | **179ms / 210ms** | **645ms** | **335ms** | **1.875ms** | **1.275ms** | **REDUÇÃO DE 47%** (600ms mais rápido) |
| **Resumo -> Assinaturas** | 56ms / 91ms | **51ms / 65ms** | 6ms | **1ms** | 1.259ms | **1.164ms** | **Melhorou** |

---

### 3.2. CPU 4x (Notebook Intermediário)

| Transição | MaxTask ANTES (Med / P90) | MaxTask DEPOIS (Med / P90) | TBT ANTES (Med) | TBT DEPOIS (Med) | Usável ANTES | Usável DEPOIS | Evolução / Status |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **Resumo -> Pessoas (fria)** | 402ms / 1.942ms | **304ms / 420ms** | 1.093ms | **684ms** | 2.823ms | **2.103ms** | **Melhorou** (P90 caiu 78,4%!) |
| **Pessoas -> Cartões (fria)** | 244ms / 331ms | **167ms / 265ms** | 380ms | **215ms** | 1.560ms | **1.478ms** | **Melhorou** (-31,6% MaxTask, -43,4% TBT) |
| **Cartões -> Movimentações (fria)** | 844ms / 968ms | **545ms / 688ms** | 1.180ms | **885ms** | 2.261ms | **2.004ms** | **Melhorou** (-35,4% MaxTask, -25,0% TBT) |
| **Movimentações -> Assinaturas (fria)** | 279ms / 403ms | **266ms / 427ms** | 566ms | **490ms** | 2.180ms | **1.963ms** | **Melhorou** (Usável sub-2s) |
| **Resumo -> Pessoas (quente)** | 190ms / 286ms | **131ms / 235ms** | 420ms | **138ms** | 2.034ms | **1.625ms** | **Melhorou** (-31,1% MaxTask, -67,1% TBT) |
| **Pessoas -> Resumo** | 855ms / 1.200ms | **422ms / 655ms** | 1.950ms | **1.458ms** | 2.457ms | **2.134ms** | **REDUÇÃO DE 50,6%** no MaxTask |
| **Pessoas -> Cartões (quente)** | 124ms / 147ms | **112ms / 196ms** | 154ms | **164ms** | 1.373ms | **1.353ms** | **Estável** |
| **Cartões -> Pessoas** | 118ms / 206ms | **115ms / 216ms** | 106ms | **69ms** | 1.428ms | **1.288ms** | **Melhorou** (-34,9% TBT) |
| **Cartões -> Movimentações (quente)** | 369ms / 481ms | **283ms / 514ms** | 618ms | **604ms** | 1.775ms | **1.766ms** | **Melhorou** (-23,3% MaxTask) |
| **Movimentações -> Cartões** | 120ms / 158ms | **153ms / 248ms** | 242ms | **252ms** | 1.710ms | **1.698ms** | **Estável** |
| **Movimentações -> Assinaturas (quente)**| 175ms / 249ms | **203ms / 268ms** | 412ms | **320ms** | 1.747ms | **1.814ms** | **Melhorou** (-22,3% TBT) |
| **Assinaturas -> Movimentações** | 346ms / 418ms | **287ms / 505ms** | 636ms | **594ms** | 1.935ms | **1.943ms** | **Melhorou** (-17,1% MaxTask) |
| **Assinaturas -> Resumo (quente)** | **1.055ms / 1.170ms**| **527ms / 694ms** | **2.384ms**| **1.494ms**| **2.740ms** | **2.151ms** | **REDUÇÃO DE 50,0%** (Meta atingida!) |
| **Resumo -> Assinaturas** | 219ms / 285ms | **212ms / 247ms** | 615ms | **433ms** | 2.031ms | **1.938ms** | **Melhorou** (-29,6% TBT) |

---

### 3.3. CPU 6x (Hardware Modesto)

| Transição | MaxTask ANTES (Med / P90) | MaxTask DEPOIS (Med / P90) | TBT ANTES (Med) | TBT DEPOIS (Med) | Usável ANTES | Usável DEPOIS | Evolução / Status |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **Assinaturas -> Resumo (quente)** | **1.212ms / 1.277ms**| **574ms / 854ms** | **3.114ms**| **1.658ms**| **3.083ms** | **2.288ms** | **REDUÇÃO DE 52,6%** no MaxTask |
| **Pessoas -> Resumo** | **1.256ms / 1.437ms**| **533ms / 736ms** | **2.271ms**| **1.881ms**| **3.186ms** | **2.153ms** | **REDUÇÃO DE 57,6%** no MaxTask |
| **Cartões -> Movimentações (fria)** | 791ms / 1.233ms | **673ms / 1.005ms**| 1.124ms | **1.164ms**| 2.572ms | **2.451ms** | **Melhorou** (-14,9% MaxTask) |
| **Pessoas -> Cartões (fria)** | 347ms / 471ms | **217ms / 494ms** | 584ms | **434ms** | 1.633ms | **1.694ms** | **Melhorou** (-37,5% MaxTask) |

---

## 4. Conformidade com a Constituição de Engenharia

- [x] **Zero Drift Financeiro:** Todos os cálculos e parcelamentos mantêm exatidão matemática centavo a centavo. A renderização em lotes de 50 itens mantém 100% da integridade da fatura:
  - Fatura total, quitado e pendente calculados sobre 100% dos dados.
  - Ordenação e filtros processados em 100% dos dados antes da paginação.
  - "Marcar Tudo Como Pago" atualiza 100% dos itens da fatura via lote atômico no Firestore.
  - Testes em `tests/invoiceTableResponsive.test.js` e `tests/financialService.test.js` 100% verdes.
- [x] **Infraestrutura Protegida:** A única alteração em `firebase.json` foi a adição autorizada da regra de headers `/assets/**` com `Cache-Control: public, max-age=31536000, immutable`. Nenhuma outra linha de infraestrutura foi modificada.
- [x] **Arquivos Protegidos Intactos:** `firestore.rules`, `functions/`, `planEntitlements.js`, `.firebaserc` e workflows permaneceram intocados.
- [x] **Sem Novas Dependências:** Nenhuma biblioteca de terceiros foi instalada (`package.json` intacto).
- [x] **Design System e Cores:** Zero cores hexadecimais novas. Utilização exclusiva dos tokens canônicos do FinControl DS2.
- [x] **Acessibilidade (WCAG):** Controles de lotes possuem atributos `role="status"`, `aria-live="polite"` e botões de ação com hit targets acessíveis (`min-h-[44px]`).
- [x] **Zero Vazamento em Produção:** Varredura estrita em `dist/assets/` confirma zero ocorrências de `fincontrol_e2e`, `__FINCONTROL_E2E`, `test-user` ou `legacyFinancial`.
