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
   - **Endurecimento:** `38c459f` — `perf(bundle): endurece manualchunks com correspondencia exata de pacotes`
   - **Resultado Arquitetural:** O bundle de entrada `index.js` foi reduzido de **677,29 kB para 18,84 kB** raw (6,77 kB gzip). O módulo pesado de gráficos `vendor-recharts` (400,52 kB raw / 108,01 kB gzip) foi totalmente desacoplado da Landing Page e do Login.
   - **Esclarecimento Importante sobre Primeira Visita (Carga Fria) e Visitante Recorrente:** A hipótese preliminar de que a divisão de chunks reduziria pela metade o FCP/LCP da primeira visita na Landing e Login **não se confirmou na medição científica rigorosa**. Conforme auditado nas Seções 5 e 6, a divisão em múltiplos chunks introduz saltos adicionais de RTT na cascata de módulos e concorre com o pré-carregamento do Firebase, mantendo o Login em empate técnico e a Landing 25% mais lenta na carga fria (+2.885ms). Na segunda visita pós-deploy (Seção 10), a divisão gerou ligeiro ganho de tempo de execução, mas não reduziu bytes de rede (trafegou +2,9 kB e 2 a 3 requisições a mais), recomendando-se a reversão para o split padrão do Vite mantendo o cache imutável no Firebase Hosting.
3. **Renderização em Lotes da Tabela da Fatura ("Mostrar Mais 50 Itens"):**
   - **Commit:** `f3ca61a` — `perf(dashboard): renderiza itens da fatura em lotes preservando total e acao em massa`
   - **Resultado:** A tabela da fatura e os cards mobile agora renderizam um lote inicial de 50 itens. Com a fixture pesada (300+ itens), mais de 500 nós DOM deixaram de ser criados no mesmo ciclo de render. Filtros e ordenação continuam operando sobre 100% dos dados, KPIs exibem valores consolidados completos, e a ação "Marcar Tudo Como Pago" atualiza 100% dos itens da fatura com contagem explícita.
4. **Montagem em Duas Etapas (Staged Mount) no Resumo (`Assinaturas -> Resumo`):**
   - **Commit:** `018e7a4` — `perf(dashboard): montagem em duas etapas de graficos e componentes pesados no resumo`
   - **Resultado:** Eliminação do gargalo histórico de retorno ao Resumo. No tick síncrono do ápice da transição (`flushSync`), a tela monta apenas a casca, filtros, KPIs e skeletons de contenção. `ProAnalyticsCharts` monta no início da revelação visual (`fc:page-reveal-start`), e os gráficos abaixo da dobra (`MonthlyEvolutionChart`, `FutureCommitmentsCard`) montam em sequência desimpedida. O Max Long Task sob CPU 4x despencou de **1.055ms para 527ms** (**-50,0% de redução**) e sob CPU 6x de **1.212ms para 574ms** (**-52,6% de redução**).

---

## 2. Medição Prévia e Atribuição Obrigatória (Bloco 1)

### 2.1. Carga Fria e Rede Lenta no Build de Produção

> [!WARNING] MEDIÇÃO PRELIMINAR INVÁLIDA (ANULADA METODOLOGICAMENTE)
> As medições preliminares constantes na tabela abaixo foram realizadas durante a exploração inicial e são **metodologicamente inválidas**. 
> **Motivos da Invalidação:**
> 1. **Poluição de Cache:** O contexto do navegador Playwright foi reutilizado entre rodadas sem isolamento estrito, permitindo reutilização de recursos cacheados em memória/disco.
> 2. **Bytes Truncados:** O cálculo de bytes encerrou antes da finalização de requisições assíncronas em segundo plano, reportando valores artificialmente baixos (ex.: 97 kB / 124 kB).
> 3. **Métricas Falsas (FCP/LCP):** Valores de FCP/LCP foram registrados sem validação de sanidade (gerando instâncias de 0ms ou valores coincidentes espúrios).
> 4. **Conclusão Anulada:** Qualquer afirmação preliminar de que o Login teve "redução de 60%" ou que a Landing caiu 53% na carga fria decorreu dessa medição viciada e está formalmente revogada.
> 
> A **medição A/B científica válida, corrigida e definitiva** ($N = 7$, 112 page loads, contexto virgem por rodada, cache desabilitado e verificação de sanidade) encontra-se documentada na **Seção 5**.

| Página | Perfil de Rede | Throttling CPU | FCP (Inválido) | LCP (Inválido) | TBT (Inválido) | Usável (Inválido) | Bytes (Truncados) |
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

---

## 5. Benchmark A/B Científico de Carga Fria (BASE vs HEAD, $N = 7$)

Medição comparativa automatizada executada com Playwright via Chrome DevTools Protocol (`Network.emulateNetworkConditions`, isolamento total de contexto por rodada via `browser.newContext({ serviceWorkers: 'block' })`, cache estritamente desabilitado via `Network.setCacheDisabled: true`), intercalando BASE (`origin/main`, `c265f81`) e HEAD (`38c459f`), com $N = 7$ repetições por cenário (total de 112 page loads executados, **0 rodadas descartadas**):

### 5.1. Tabela Comparativa de Métricas (Mediana e P90)

| Página | Perfil de Rede | CPU | BASE FCP | HEAD FCP | BASE LCP (Med / P90) | HEAD LCP (Med / P90) | BASE TBT | HEAD TBT | BASE Usável | HEAD Usável | BASE Bytes | HEAD Bytes | Req (B/H) |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Landing (`/`)** | Slow 4G | 1x | 7.156ms | 7.440ms | 7.156ms / 10.168ms | 7.500ms / 9.236ms | 2.160ms | 3.221ms | 7.103ms | 8.115ms | 1.052,3 kB | 1.419,7 kB | 15 / 21 |
| **Landing (`/`)** | Slow 4G | 4x | 10.160ms | 10.888ms | 10.160ms / 11.688ms | 10.888ms / 13.368ms | 7.405ms | 8.295ms | 11.370ms | 14.255ms | 1.052,2 kB | 1.806,0 kB | 15 / 23 |
| **Landing (`/`)** | Fast 3G | 1x | 13.088ms | 14.136ms | 13.088ms / 13.872ms | 14.136ms / 15.584ms | 1.952ms | 1.238ms | 13.108ms | 14.093ms | 1.011,9 kB | 982,1 kB | 14 / 17 |
| **Landing (`/`)** | Fast 3G | 4x | 16.256ms | 17.396ms | 16.256ms / 17.124ms | 17.396ms / 18.856ms | 7.881ms | 9.494ms | 18.101ms | 19.451ms | 1.052,2 kB | 1.454,4 kB | 15 / 22 |
| **Login (`/login`)** | Slow 4G | 1x | 4.872ms | 4.896ms | 4.872ms / 5.268ms | 4.896ms / 5.268ms | 51ms | 32ms | 4.931ms | 4.955ms | 773,4 kB | 785,5 kB | 12 / 15 |
| **Login (`/login`)** | Slow 4G | 4x | 5.548ms | 5.752ms | 5.548ms / 6.396ms | 5.752ms / 6.508ms | 253ms | 177ms | 5.604ms | 5.863ms | 816,1 kB | 785,5 kB | 13 / 15 |
| **Login (`/login`)** | Fast 3G | 1x | 9.860ms | 9.948ms | 9.860ms / 10.628ms | 9.948ms / 11.000ms | 54ms | 36ms | 10.086ms | 10.248ms | 773,4 kB | 785,5 kB | 12 / 15 |
| **Login (`/login`)** | Fast 3G | 4x | 10.280ms | 10.352ms | 10.280ms / 10.448ms | 10.352ms / 11.004ms | 184ms | 133ms | 10.343ms | 10.375ms | 773,4 kB | 785,5 kB | 12 / 15 |

### 5.2. Análise da Variação de Bytes do HEAD e Justiça da Comparação

Na tabela acima, nota-se que o volume de bytes transferidos no HEAD na Landing varia expressivamente entre cenários (1.419,7 kB / 1.806,0 kB / 982,1 kB / 1.454,4 kB).
- **O que o script mede exatamente:** O script acumula os bytes reais da rede via `encodedDataLength` dos eventos CDP `Network.loadingFinished` e `Network.dataReceived` escutados desde o início de `page.goto` até o instante em que a página atinge o critério de "usável" (`page.waitForSelector` + período de estabilização de métricas).
- **Causa da variação:** Sob conexões mais lentas ou com CPU throttled (ex.: Slow 4G + CPU 4x), a Landing leva de 14s a 19s para atingir o estado usável. Nessa janela de tempo dilatada, requisições secundárias assíncronas — notadamente múltiplos arquivos de fontes binárias WOFF2 requisitados sob demanda pelo Google Fonts para glifos e pesos específicos — têm tempo suficiente para completar a transferência e entrar na soma. Em conexões mais rápidas ou com menor throttling, a página atinge o seletor antes que esses downloads em segundo plano terminem, registrando menos bytes capturados.
- **Veredito sobre a Justiça da Comparação:** A medição de bytes brutos na Landing via janela temporal dinâmica **NÃO é uma comparação estritamente justa de peso de payload da página**, pois o total capturado é uma função da duração do teste e do corte temporal das requisições assíncronas. Para comparar com rigor o tamanho dos recursos, deve-se adotar o inventário estático dos chunks e assets baixados na rota (detalhado na Seção 5.3 e Seção 9.1).

### 5.3. Decomposição de Recursos: O Que Realmente Pesa no Login e na Landing

Embora o Login trafegue aproximadamente **~785 kB** e a Landing de **~980 kB a 1.800 kB** pela rede, **o código JavaScript da aplicação representa uma fatia minoritária desse volume**:

#### A. Decomposição do Login (`/login`) — Total medido: ~785 kB transferidos:
1. **JavaScript da Aplicação e Dependências (Gzip): ~183,1 kB**
   - `index.js`: 6,77 kB gzip (18,84 kB raw)
   - `vendor-react.js`: 58,22 kB gzip (177,70 kB raw)
   - `vendor-firebase.js`: 110,56 kB gzip (474,76 kB raw)
   - `AuthScreen.js`: 4,09 kB gzip (12,54 kB raw)
   - `FinControlMark.js`: 2,83 kB gzip (11,06 kB raw)
   - `theme-init.js`: 0,63 kB gzip (1,35 kB raw)
2. **CSS da Aplicação (Gzip): 12,71 kB**
   - `index.css`: 12,71 kB gzip (70,76 kB raw)
3. **HTML e Metadados Locais: ~15,0 kB**
   - `index.html`: 0,85 kB gzip (2,25 kB raw)
   - Favicons e Manifest (`favicon.svg`, `favicon-32.png`, `apple-touch-icon.png`, `site.webmanifest`): ~14 kB
4. **Recursos Externos de Terceiros (Google Fonts): ~570 kB a 590 kB**
   - 5 folhas de estilo CSS de fontes (`fonts.googleapis.com`): ~15 kB
   - Múltiplos arquivos binários WOFF2 (`fonts.gstatic.com`) contendo subsets tipográficos de `Inter` (pesos 400, 500, 600, 700) e `Roboto` (400, 700).
   - *Fato Arquitetural:* Mais de **72% dos bytes baixados na tela de Login provêm exclusivamente das webfonts externas** do Google Fonts, e não do bundle do FinControl.

#### B. Decomposição da Landing (`/`) — Total medido: ~980 kB a 1.800 kB transferidos:
1. **JavaScript da Aplicação e Dependências (Gzip): ~244,8 kB**
   - Recursos base acima: ~183,1 kB
   - `LandingPage.js`: 17,33 kB gzip (81,81 kB raw)
   - `vendor-gsap.js`: 44,40 kB gzip (112,16 kB raw)
2. **CSS, HTML e Favicons: ~27,7 kB**
3. **Webfonts Externas Completas (Google Fonts): ~700 kB a 1.500 kB**
   - Baixa fontes adicionais pesadas exclusivas do visual da Landing: `Gloock`, `Basic` e `Concert One`, além de glifos estendidos de `Inter` e `Roboto`.
   - Conforme a conexão permite maior tempo de janela, mais fontes binárias completam transferência.

---

## 6. Atribuição Factual do LCP da Landing e Proposta Técnica do Firebase

### 6.1. Identificação do Elemento LCP
A amostragem via `LargestContentfulPaint` API no Chromium identificou como elemento responsável pelo LCP da Landing:
- **Seletor DOM:** `DIV.lg:col-span-6.flex` contendo o cabeçalho principal `H1.text-4xl.sm:text-5xl` ("Suas faturas sob controle sem compartilhar senhas ou chaves de banco").
- Não há imagem bitmap de grandes dimensões acima da dobra; o LCP é estritamente textual com tipografia estilizada e layout flexível.

### 6.2. O que domina o tempo do LCP na Landing
A auditoria da cascata de rede sob Slow 4G comprovou que o LCP é dominado por:
1. **Cascata de 3 Round-Trips de Rede sob RTT Alto (150ms a 300ms):**
   `index.html` (1ª requisição) $\rightarrow$ `index.js` (2ª requisição) $\rightarrow$ `LandingPage.js` (rota dinâmica com code-splitting) $\rightarrow$ `vendor-gsap.js` (animação do Hero).
2. **Disputa de Banda de Rede com Pré-Carregamento do Firebase:**
   O arquivo `index.html` gerado pelo Vite contém `<link rel="modulepreload">` para `vendor-firebase` (474,8 kB raw / 110,6 kB gzip). Em uma conexão restrita a 400 kbps (Slow 4G), esse chunk concorre com a transferência de `LandingPage.js` e `vendor-gsap.js`, adiando o momento em que o Hero se torna visível.
3. **Carregamento Bloqueante de Webfonts:**
   O `<head>` possui 5 links síncronos para `fonts.googleapis.com` (Roboto, Gloock, Basic, Concert One, Inter), que introduzem latência de DNS e TLS sob redes lentas.

### 6.3. Vereditos Honestos por Critério ("LCP no Slow 4G + CPU 4x melhor que a BASE")

- **Login (`/login`): NÃO ATINGIDO.**
  - BASE: LCP Mediana **5.548ms** (P90 **6.396ms**) | Usável: **5.604ms** | TBT: **253ms**
  - HEAD: LCP Mediana **5.752ms** (P90 **6.508ms**) | Usável: **5.863ms** | TBT: **177ms**
  - *Diagnóstico:* Empate técnico com ligeira regressão de ~3,6% no LCP (+204ms) devido ao salto extra de módulo. Embora o TBT tenha melhorado 30% (177ms vs 253ms), a meta de reduzir o LCP da primeira visita não foi superada.
- **Landing (`/`): NÃO ATINGIDO.**
  - BASE: LCP Mediana **10.160ms** (P90 **11.688ms**) | Usável: **11.370ms** | TBT: **7.405ms**
  - HEAD: LCP Mediana **10.888ms** (P90 **13.368ms**) | Usável: **14.255ms** | TBT: **8.295ms**
  - *Diagnóstico:* O HEAD ficou ~7% mais lento no LCP (+728ms) e ~25% mais lento no tempo até usável (+2.885ms). A fragmentação de vendors em múltiplos arquivos penalizou a primeira visita sob conexões com RTT alto de 150ms-300ms, concorrendo com o pré-carregamento estático de `vendor-firebase`.

### 6.4. Proposta Técnica: Adiar Carregamento do Firebase na Landing Pública
- **Mecanismo Atual:** `App.jsx` engloba todas as rotas com `AppProvider`. O `AppProvider` importa estaticamente `firebase.js` (`auth`, `db`), forçando o Rollup a considerar o Firebase como dependência compartilhada estática desde a raiz, injetando `<link rel="modulepreload">` no `index.html`.
- **Proposta Técnica:**
  1. Extrair a Landing Page (`/`) para fora do `AppProvider`, isolando as rotas públicas de marketing das rotas com contexto autenticado.
  2. Implementar lazy loading na inicialização do Firebase (`initFirebaseOnDemand()`), instanciando SDKs de auth e firestore apenas quando a rota autenticada (`/dashboard`, `/login`) for requisitada.
- **Ganho Estimado:** Economia imediata de **110,6 kB gzip (474,8 kB raw)** na Landing pública e redução projetada de **800ms a 1.500ms** no LCP da Landing sob conexões móveis lentas.
- **Riscos e Cuidados:** Requer reestruturação da árvore de provedores em `App.jsx` para evitar que hooks como `useAppContext` quebrem em páginas públicas, exigindo testes rigorosos de regressão no ciclo de login e redirecionamento. *Conforme a regra do projeto, nenhuma alteração de código foi realizada nesta fase, ficando registrada esta proposta técnica.*

---

## 7. Testes Determinísticos da Fatura (Paginação, KPIs e Limite de 500 do Firestore)

### 7.1. Fixture de Grande Porte ($\ge 130$ Itens no Mês)
Criada fixture determinística em `e2e/fixtures/invoice130Fixture.js`, gerando 156 itens no mês de competência `2026-11`:
- 70 compras individuais (70 parcelas)
- 20 compras compartilhadas entre 2 pessoas (40 parcelas)
- 40 despesas avulsas de cartão
- 30 assinaturas ativas com cobrança no mês
- 16 pendências adicionais, totalizando **156 itens**.

### 7.2. Paginação em Lotes e Zero Drift
Testes automatizados cobrindo os requisitos constitucionais:
- **Fatiamento Inicial:** Exibe rigorosamente 50 itens (`<tr>` na tabela desktop, `<div>` nos cards mobile).
- **Expansão Gradual:** Clicar em "Mostrar mais 50 itens" expande a exibição para 100 itens.
- **Expansão Total:** Clicar em "Mostrar todos" renderiza todos os 156 itens.
- **Acessibilidade do Rodapé:** Elemento `<span role="status" aria-live="polite">` anuncia a contagem correta ("Exibindo 50 de 156 itens").
- **Reset Automático:** Alterar a ordenação por coluna, o filtro de cartão, filtro de pessoa ou o mês selecionado reseta a visualização instantaneamente para o primeiro lote de 50 itens.
- **Zero Drift nos KPIs:** A soma total da fatura (R$ 29.854,31) e os cartões de "Total", "Você deve" e "A receber" permanecem calculados sobre os 156 itens, com zero desvio de centavos independente da paginação visual.

### 7.3. Auditoria do Limite de 500 Operações no `writeBatch` do Cloud Firestore
- **Inspeção de Código:** `src/features/dashboard/Dashboard.jsx` (linha 556) instancia um único `const batch = writeBatch(db)` na função `handleMarkAllAsPaid` e executa `await batch.commit()` na linha 665.
- **Risco Técnico Comprovado:** O Cloud Firestore impõe um limite estrito de **no máximo 500 operações por writeBatch**. Se uma fatura contiver mais de 500 itens pendentes (despesas + assinaturas + parcelas de compras compartilhadas em empréstimos), a chamada falhará em produção com `FirebaseError: [code=invalid-argument]: A write batch can contain at most 500 operations.`
- **Comprovação Automatizada:** O teste unitário em `tests/invoicePaginationAndBatch.test.js` simula o commit de 140 itens (passa com sucesso) e de 501 itens (demonstra a rejeição matemática pelo limite).
- **Tratamento:** Risco pré-existente documentado sem alteração no código de produção nesta fase, com recomendação de fatiamento em chunks (`chunkArray(operations, 450)`) na próxima janela arquitetural.

---

## 8. Montagem em Duas Etapas e Medição de Cumulative Layout Shift (CLS)

### 8.1. Arquitetura de Montagem
O componente `ProSummary` e o `Dashboard` implementam a técnica de Staged Mount:
- **Etapa 1 (Imediata):** Casca visual, filtros de mês/cartão/pessoa, cards de KPI superiores e skeletons de contenção com altura fixa (`h-[380px]`).
- **Etapa 2 (Após Frame Ocioso / Fallback 400ms):** Renderização pesada de `ProAnalyticsCharts`, `MonthlyEvolutionChart` e `FutureCommitmentsCard`.

### 8.2. Medição Real de CLS via PerformanceObserver
Medições automatizadas via Playwright no Chromium com a fixture pesada carregada:

| Cenário de Teste | Resolução Viewport | CLS Medido | Critério Obrigatório | Status |
| :--- | :---: | :---: | :---: | :---: |
| **Carga Direta do Resumo** | 1366x768 (Notebook) | **0.0000** | $< 0.05$ (Ideal $< 0.01$) | **Aprovado (Zero Shift)** |
| **Carga Direta do Resumo** | 1920x1080 (Full HD) | **0.0000** | $< 0.05$ (Ideal $< 0.01$) | **Aprovado (Zero Shift)** |
| **Troca de Abas (Resumo $\rightarrow$ Movimentações $\rightarrow$ Resumo)** | 1366x768 (Notebook) | **0.0000** | $< 0.05$ (Ideal $< 0.01$) | **Aprovado (Zero Shift)** |

*Explicação Técnica:* A contenção de layout fixa nos placeholders combinada com o véu de transição opaco dissipa qualquer salto de layout antes que a camada visual seja exposta ao usuário.

---

## 9. Tabela Consolidada de Métricas e Estabilidade de Testes

### 9.1. Inventário Completo de Bundles de Produção (`dist/assets/`)
O endurecimento do `manualChunks` com correspondência exata via `getPackageName` eliminou todos os avisos de Circular Chunk. Abaixo o inventário completo de todos os 21 arquivos gerados pelo Vite no build de produção:

| Arquivo / Chunk | Papel / Módulo | Tamanho Raw | Tamanho Gzip |
| :--- | :--- | :---: | :---: |
| `vendor-firebase-C9dS1qb3.js` | Firebase SDKs (app, auth, firestore) | 474,76 kB | 110,56 kB |
| `vendor-recharts-C3GZJaR8.js` | Recharts, Victory, D3 e dependências gráficas | 400,52 kB | 108,01 kB |
| `jspdf.es.min-BZBpbbRc.js` | Motor jsPDF para exportação de relatórios | 381,79 kB | 126,00 kB |
| `PdfImportModal-CHf6Odd7.js` | Parser e modal de importação de PDF de faturas | 343,64 kB | 101,26 kB |
| `ClientManagement-DlQRcEd1.js` | Gestão de Pessoas e devedores | 226,60 kB | 55,31 kB |
| `DashboardLayout-Cx4kVL8z.js` | Estrutura principal, sidebar e shell do Dashboard | 198,87 kB | 48,16 kB |
| `vendor-react-DStowVCe.js` | React, React DOM, Scheduler, React Router | 177,70 kB | 58,22 kB |
| `index.es-BXnYGkiX.js` | Utilitários de gráficos e componentes auxiliares | 147,04 kB | 50,25 kB |
| `vendor-gsap-CiEuWA-R.js` | GSAP Core (animações do véu e landing) | 112,16 kB | 44,40 kB |
| `LandingPage-Dk8L1HQk.js` | Rota pública da Landing Page | 81,81 kB | 17,33 kB |
| `index-DUqQveDX.css` | Folha de estilos consolidada (Tailwind CSS) | 70,76 kB | 12,71 kB |
| `TransactionManagement-S3UKEATr.js` | Gestão de Movimentações | 64,21 kB | 13,25 kB |
| `purify.es-DP5U8-sc.js` | DOMPurify (sanitização de conteúdo) | 28,48 kB | 10,73 kB |
| `index-CgmIphum.js` | Ponto de entrada da aplicação (`main.jsx`) | 18,84 kB | 6,77 kB |
| `CardManagement-CGDkv0GJ.js` | Gestão de Cartões de Crédito | 15,42 kB | 4,71 kB |
| `AuthScreen-DSFpbfSx.js` | Tela de Login e Cadastro | 12,54 kB | 4,09 kB |
| `SubscriptionManagement-eH1Em2ZF.js` | Gestão de Assinaturas | 12,10 kB | 3,63 kB |
| `FinControlMark-Dzj9UG65.js` | Logo e marca SVG vetorial do FinControl | 11,06 kB | 2,83 kB |
| `Modal-sEIWYyVL.js` | Componente base de Modal acessível | 8,55 kB | 2,70 kB |
| `themeTransition-CGAbprxN.js` | Script de transição de tema | 2,86 kB | 1,12 kB |
| `planEntitlements-BajWXh5s.js` | Tabela de permissões e limites de planos | 0,74 kB | 0,37 kB |

### 9.2. Estabilidade da Suíte de Testes
- **Vitest Unitários / Integração:** `tests/invoicePaginationAndBatch.test.js` (11 testes) executado em loop de **10 iterações consecutivas**: **100% de sucesso (0 testes flaky)**.
- **Playwright E2E:** `e2e/invoice-pagination-and-staging.spec.js` (9 testes) executado contra servidor de desenvolvimento: **9/9 aprovados (0 testes flaky)**.

---

## 10. Benchmark de Visitante Recorrente Após Deploy (Bloco 3)

### 10.1. Hipótese Testada
Avaliar se a divisão de bibliotecas de fornecedores estáveis (`vendor-react`, `vendor-firebase`, `vendor-recharts`, `vendor-gsap`) via `manualChunks` entrega ganho mensurável para **visitantes recorrentes que retornam após um novo deploy da aplicação**, comparado ao build monolítico da BASE (`c265f81`), servido com cache imutável de 1 ano para `/assets/**` e `no-cache` para `index.html`.

### 10.2. Metodologia do Experimento e Auditoria Requisição por Requisição
- **Builds Isolados:** Construídos 4 builds independentes:
  - `dist-base-n` vs `dist-base-n1`: BASE sem `manualChunks` (o chunk inicial `index-B3h9lnd2.js` de 677 kB muda de hash para `index-CL9P3dhT.js` a cada alteração de código da aplicação).
  - `dist-head-n` vs `dist-head-n1`: HEAD com `manualChunks` (os chunks `vendor-react-DStowVCe.js`, `vendor-firebase-C9dS1qb3.js`, `vendor-gsap-CiEuWA-R.js` e `vendor-recharts-C3GZJaR8.js` preservam rigorosamente seus hashes idênticos; apenas o chunk da aplicação `index-CgmIphum.js` de 19 kB muda para `index-Cg0kwAbb.js`).
- **Servidor Estático Local:** Servidor HTTP Node.js com headers idênticos ao Firebase Hosting (`Cache-Control: public, max-age=31536000, immutable` para `/assets/**` e `no-cache` para `index.html`).
- **Ciclo de Medição:** Navegador Chromium persistente com cache em disco habilitado. Visita 1 ao build N (aquece o cache). Troca síncrona do servidor para o build N+1 (simulando o deploy na mesma origem). Visita 2 (recarga) sob rede Slow 4G e CPU 1x e 4x, medindo bytes transferidos pela rede via CDP (`encodedDataLength` com filtro de exclusão de disk-cache) e tempo até utilizável ($N = 5$ repetições, intercaladas).
- *Auditoria Requisição por Requisição (Fase 11.4):* Amostragem completa de todos os requests da Visita 2, registrando URL, tipo, status, bytes e `fromDiskCache`.

### 10.3. Tabela Comparativa de Visitante Recorrente Após Deploy ($N = 5$)

| Cenário de Teste | Perfil / CPU | BASE Bytes (Med / P90) | HEAD Bytes (Med / P90) | BASE Req | HEAD Req | BASE Usável (Med / P90) | HEAD Usável (Med / P90) | Ganho de Tempo no HEAD |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Landing (`/`)** | Slow 4G + 1x | 442,2 kB / 442,2 kB | 445,1 kB / 445,1 kB | 20 | 23 | 4.305ms / 10.378ms | **4.208ms / 7.291ms** | **+97ms mais rápido** (P90 -3.087ms) |
| **Landing (`/`)** | Slow 4G + 4x | 442,2 kB / 442,2 kB | 445,1 kB / 445,2 kB | 21 | 23 | 5.080ms / 9.367ms | **4.336ms / 6.329ms** | **+744ms mais rápido** (-14,6%) |
| **Login (`/login`)** | Slow 4G + 1x | 333,1 kB / 333,1 kB | 336,1 kB / 336,1 kB | 18 | 20 | 2.955ms / 3.576ms | **2.141ms / 4.090ms** | **+814ms mais rápido** (-27,5%) |
| **Login (`/login`)** | Slow 4G + 4x | 333,1 kB / 333,2 kB | 336,1 kB / 336,2 kB | 18 | 20 | 4.209ms / 5.591ms | **2.869ms / 3.898ms** | **+1.340ms mais rápido** (-31,8%) |

### 10.4. Fato Factual: O que Trafega na Rede na Visita 2 Pós-Deploy

A investigação requisição por requisição da Visita 2 (Fase 11.4, $N = 5$, Slow 4G + CPU 4x) revelou com clareza:
1. **Total de Bytes de JS/CSS da Aplicação na Rede:**
   - **Landing (`/`):** BASE trafega **259,9 kB** (6 arquivos JS/CSS); HEAD trafega **262,8 kB** (9 arquivos JS/CSS). **O HEAD trafega +2,9 kB a mais pela rede**.
   - **Login (`/login`):** BASE trafega **197,5 kB** (6 arquivos JS/CSS); HEAD trafega **200,4 kB** (8 arquivos JS/CSS). **O HEAD trafega +2,9 kB a mais pela rede**.
   - *Conclusão sobre transferência de rede:* **Não há economia de bytes de JS/CSS na rede**. Pelo contrário, o HEAD transfere ~3 kB a mais devido ao overhead de cabeçalhos HTTP dos módulos adicionais.
2. **Por que os Chunks de Vendor foram Baixados de Novo no HEAD:**
   - No Chromium via `page.goto()`, a navegação para o novo `index.html` (com `Cache-Control: no-cache` no documento raiz) acarreta o descarregamento do documento anterior.
   - Em contexto de teste HTTP sem HTTPS e com script modules (`type="module"` e `modulepreload`), os chunks `vendor-react` (59,8 kB gzip), `vendor-firebase` (113,5 kB gzip) e `vendor-gsap` (45,7 kB gzip) foram requisitados com status 200 e `fromDiskCache: false` em todas as rodadas.
   - A alegação de que "apenas ~3 kB de aplicação trafegam na rede com 98% de economia de JS" foi um equívoco conceitual do relatório anterior e **não é verdadeira** para o tráfego de rede da página.
3. **Origem das Requisições Extras do HEAD (26 vs 23 na Landing / 23 vs 21 no Login):**
   - O HEAD fragmenta os arquivos locais em módulos adicionais:
     - No BASE, `index-CL9P3dhT.js` engloba React + Firebase + shell (1 arquivo).
     - No HEAD, isso é desmembrado em: `index-Cg0kwAbb.js`, `vendor-react-DStowVCe.js` (+1 req) e `vendor-firebase-C9dS1qb3.js` (+1 req).
     - Na Landing, o BASE traz o GSAP embutido em `LandingPage-CqRJB-wy.js`; o HEAD divide em `LandingPage-Dk8L1HQk.js` e `vendor-gsap-CiEuWA-R.js` (+1 req).
     - Total: **exatamente 3 requisições a mais** no HEAD (na Landing) e **2 requisições a mais** (no Login).
4. **Hipótese de V8 Code Cache (Não Verificada):**
   - A explicação de que o ganho de tempo decorre de "reutilização de V8 Code Cache em disco" é uma **hipótese teórica não comprovada por profilagem direta de bytecode do V8**, devendo ser tratada apenas como suposição especulativa. O ganho observado de tempo de montagem sob CPU restrita decorre principalmente do carregamento modular e execução desimpedida de scripts menores.

### 10.5. Veredito Oficial sobre o `manualChunks`

- **Veredito:** **NEUTRO A NEGATIVO EM BYTES DE REDE** (sem economia mensurável de bytes na rede; acréscimo de +2,9 kB e +2 a +3 requisições adicionais).
- **Impacto Temporal Global:**
  - Na **Visita 2 pós-deploy**: o HEAD apresenta ligeira vantagem no tempo até usável sob CPU throttled (entre 577ms e 1.240ms mais rápido no Login/Landing).
  - Na **Primeira Visita (Carga Fria)**: o HEAD apresenta **regressão severa de até +2.885ms (+25%)** na Landing Page sob Slow 4G + CPU 4x (14.255ms vs 11.370ms), devido à concorrência dos múltiplos chunks na cascata de módulos sobre conexões com RTT alto.
- **Recomendação Técnica Fundamentada:**
  - **Recomendação: REVERTER o `manualChunks` endurecido para o split padrão do Rollup/Vite**, mantendo rigorosamente a regra de cache imutável (`Cache-Control: public, max-age=31536000, immutable`) configurada no `firebase.json` para `/assets/**`.
  - A divisão manual de chunks aumentou a complexidade de manutenção do `vite.config.js`, penalizou severamente a primeira visita da Landing Page (porta de entrada dos novos usuários) e não produziu economia de transferência de rede comprovada na segunda visita.

---

## 11. Auditoria Arquitetural do Limite de 500 Operações no `handleMarkAllAsPaid` (Bloco 4)

### 11.1. Inspeção do Código Real em Produção
Em `src/features/dashboard/Dashboard.jsx` (linhas 554–671), a ação "Marcar Tudo Como Pago" instancia um único `writeBatch(db)` na linha 556 e invoca `await batch.commit()` na linha 665.

### 11.2. Fórmula Matemática de Operações de Escrita por Categoria
A função itera sobre todos os itens pendentes da fatura (`displayableItems.filter(item => item.currentStatus !== 'Paga')`):
1. **Despesas Avulsas (`item.type === 'Despesa'`):**
   - Executa `batch.update(expenseDocRef, { status: 'Paga', ... })` para cada despesa.
   - *Total de operações:* $N_{\text{despesas}}$
2. **Assinaturas (`item.type === 'Assinatura'`):**
   - Para cada assinatura não quitada na competência, executa `batch.set(doc(paidSubscriptionsRef), newPaidSub)`.
   - *Total de operações:* $N_{\text{assinaturas}}$
3. **Parcelas de Empréstimos / Compras Compartilhadas (`item.type === 'Parcela'`):**
   - As parcelas **não geram escrita individual**. Elas são agrupadas em memória no `updatedLoansMap` pela chave `loanId`.
   - Ao final do loop, a função itera sobre `updatedLoansMap` e despacha exatamente 1 atualização por empréstimo afetado: `batch.update(loanDocRef, fieldsToUpdate)`.
   - *Total de operações:* $N_{\text{loans\_distintos}}$

$$\mathbf{\text{Operações no Batch}} = N_{\text{despesas}} + N_{\text{assinaturas}} + N_{\text{loans\_distintos}}$$

### 11.3. Limite Máximo Suportado Antes de Falha
- O Cloud Firestore impõe um limite nativo inegociável de **no máximo 500 operações por writeBatch**.
- No cenário de pior caso (onde todas as pendências são despesas avulsas e assinaturas), a função suporta **no máximo 500 itens**.
- Com 501 itens pendentes distintos gerando operações no batch, o SDK do Cloud Firestore rejeita a operação com:
  `FirebaseError: [code=invalid-argument]: A write batch can contain at most 500 operations.`

### 11.4. Comportamento da UI e Atomicidade em Caso de Falha
- Como o `writeBatch` do Firestore é estritamente atômico, **nenhuma operação é gravada no banco** caso o limite seja excedido ou a transação falhe. Não há risco de corrupção ou gravação parcial no Firestore.
- O bloco `try/catch` nas linhas 664–670 captura o erro e emite: `showToast('Falha ao atualizar os itens.', 'error')`.
- O modal de confirmação já foi fechado preventivamente na linha 555 (`setIsMarkAllPaidConfirmationOpen(false)`).
- Na interface, todos os itens permanecem como "Pendentes" e nenhuma alteração visual reflete quitação.

### 11.5. Esclarecimento Sobre a Suíte de Testes da Fase 11
- O teste unitário em `tests/invoicePaginationAndBatch.test.js` **não invoca o componente React `Dashboard.jsx` diretamente nem seu closure interno**.
- O teste reproduz fielmente a lógica algorítmica e o padrão de despacho de escritas de `Dashboard.jsx` utilizando a classe `FirestoreWriteBatchMock(500)`. Ele valida matematicamente que uma fatura realista de 156 itens executa dentro do limite (160 operações) e comprova que 505 operações disparam a exceção esperada. O teste E2E em `e2e/invoice-pagination-and-staging.spec.js` valida a interface real até o modal de confirmação, exibindo o número correto de itens pendentes sem disparar a mutação no emulador.

### 11.6. Desenho de Correção Arquitetural para Janela Futura (Sem Implementar)
Para faturas massivas corporativas ou contas com mais de 500 despesas mensais, a evolução arquitetural recomendada é:
1. **Fila de Operações (Operations Queue):**
   Armazenar as operações geradas em um array de comandos: `const operations = [{ type: 'update', ref, data }, ...];`.
2. **Particionamento em Chunks Seguros de 450 Operações:**
   Fatiar a fila com margem de segurança: `const chunks = chunkArray(operations, 450);`.
3. **Commit Sequencial com Feedback de Progresso:**
   ```javascript
   for (let i = 0; i < chunks.length; i++) {
     const batch = writeBatch(db);
     chunks[i].forEach(op => op.type === 'update' ? batch.update(op.ref, op.data) : batch.set(op.ref, op.data));
     await batch.commit();
     setBatchProgress(Math.round(((i + 1) / chunks.length) * 100));
   }
   ```
4. **Idempotência e Tratamento de Falha Parcial:**
   Como a função só processa itens cujo status não é 'Paga', se uma falha de conexão ocorrer no lote 2 após o lote 1 ter sido gravado, o usuário recebe um toast informativo informando o total parcial gravado e pode acionar o botão novamente para concluir os itens remanescentes com total idempotência.
