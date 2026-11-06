# FinControl — Relatório de Engenharia: Fase 6 (Landing Page Abyss Teal, Copy Honesta e Isolamento DEV)

**Data:** 05/11/2026  
**Branch:** `feat/redesign-fase-6-landing`  
**Base Commit:** `d58dd36` (`feat/redesign-icone`)

---

## 1. Visão Geral e Objetivos da Fase 6

A Fase 6 teve três objetivos arquiteturais e de produto centrais:
1. **Unificação Visual no Design System (Abyss Teal / Crisp Teal):** Eliminação de ~447 cores hexadecimais legadas e hardcoded (preto + dourado) em 13 arquivos de `src/features/landing/**`, migrando 100% da landing para tokens CSS semânticos com suporte dinâmico aos modos Dark (`#04171F`) e Light (`#E6F4F7`).
2. **Copy Honesta e Product Proof (Tolerância Zero para Recursos Fantasma e Falsas Promessas):** Auditoria rigorosa de todas as alegações da Landing e do modal de upsell (`UpgradePrompt.jsx`) contra o código em produção. Remoção total de referências a recursos extintos ("Modo Crise", "Resumo Executivo", "Auditoria Relâmpago", "Metas & Quitação de Dívidas", "Metas por Categoria", "ProSummary", alertas/notificações como benefício). Substituição por recursos factuais e reais do app (projeção de faturas por pessoa, evolução mensal em 6 e 12 meses, exportação de CSV mensal e anual por pessoa, cartões e pessoas ilimitados).
3. **Isolamento Estrito de Sessão de Teste e Mocks (Segurança e Dead-Code Elimination):** Restrição absoluta de todas as variáveis e rotinas de injeção sintética (`__FINCONTROL_E2E_USER__`, `__FINCONTROL_E2E_MOCK_DATA__`, `'fincontrol_e2e_user'`, `'fincontrol_e2e_data'`) ao ambiente `import.meta.env.DEV`. Eliminação comprovada de 100% dessas chaves em compilações de produção (`dist/`).

---

## 2. Auditoria Rigorosa de Promessas e Copy Honesta

### Tabela de Auditoria de Promessas vs Código Real

| Recurso / Afirmação Original | Realidade no Código em Produção | Ação Tomada | Status |
| :--- | :--- | :--- | :--- |
| **"Modo Crise para auditoria e corte de gastos"** (Card Pro) | Removido na Fase 7 por decisão de produto. | Removido da copy. Substituído por evolução mensal (6 e 12m) e projeção por pessoa. | ✅ Corrigido |
| **"Resumo Executivo"** (Benefício anunciado) | Removido na Fase 7 por simplificação de interface. | Removido de todos os componentes da landing e do upsell. | ✅ Corrigido |
| **"Auditoria Relâmpago & Metas de Orçamento"** | Widgets removidos na Fase 7. | Removidos do FeatureGrid e dos cards comparativos. | ✅ Corrigido |
| **"Alertas e notificações por e-mail"** | Sistema de alertas/notificações desativado. | Removido como benefício de produto. | ✅ Corrigido |
| **"Exportação PDF & CSV Limpa ... relatórios consolidados"** | O export de CSV agora é estritamente **por pessoa** (sem consolidado geral). | Ajustado para "Exportação CSV & PDF por Pessoa" (mensal e anual). | ✅ Corrigido |
| **"Inteligência Financeira" / "Controle Inteligente"** | O app faz matemática financeira e contabilidade determinística exata, sem IA generativa aplicada em produção. | Substituído por termos honestos e factuais ("Gestão de Cartões e Compras Compartilhadas"). | ✅ Corrigido |
| **"Limites do Plano Gratuito"** | O código limita o plano Free a até 3 pessoas e 2 cartões. | Explicitado factualmente no card Free: "Até 3 pessoas e até 2 cartões". | ✅ Corrigido |
| **"Dados de Exemplo nos Simuladores"** | Números ilustrativos poderiam parecer métricas de usuário. | Carimbo "Dados de exemplo" inserido visivelmente em todos os widgets interativos. | ✅ Corrigido |

### Lista de Textos Antigos -> Textos Novos

1. **Badge do Hero:**
   - *Antigo:* `• Inteligência Financeira e Compras Compartilhadas`
   - *Novo:* `Controle de Cartões e Compras Compartilhadas`
2. **Subtítulo do Plano Pro (`PricingPlansSection.jsx`):**
   - *Antigo:* `Controle financeiro com gráficos analíticos, receitas e modo crise.`
   - *Novo:* `Pessoas e cartões ilimitados, gráficos analíticos, evolução mensal e projeção por pessoa.`
3. **Item do Plano Pro (`PricingPlansSection.jsx`):**
   - *Antigo:* `Modo Crise para auditoria e corte de gastos`
   - *Novo:* `Projeção de parcelas futuras por pessoa`
4. **Benefício no FeatureGrid (`FeatureGridSection.jsx`):**
   - *Antigo:* `Exportação PDF & CSV Limpa: Gere relatórios consolidados limpos...`
   - *Novo:* `Exportação CSV & PDF por Pessoa: Exporte extratos mensais e anuais detalhados por pessoa...`
5. **Upsell Modal (`UpgradePrompt.jsx`):**
   - *Antigo:* `Gráficos avançados, Modo Crise e projeção financeira completa.`
   - *Novo:* `Gráficos analíticos, evolução mensal de 6 e 12 meses e projeção financeira por pessoa.`
6. **Rodapé (`LandingFooter.jsx`):**
   - *Antigo:* `FinControl • Inteligência Financeira`
   - *Novo:* `FinControl • Gestão de Cartões e Compras Compartilhadas`

---

## 3. Relatório de Features Órfãs em `planEntitlements.js`

Em estrito cumprimento das regras constitucionais de **NÃO alterar contratos de autorização sem migração controlada**, `planEntitlements.js` **NÃO foi modificado** nesta fase. Registra-se abaixo o inventário de chaves que constavam no arquivo e que hoje não possuem interface correspondente no app:

| Chave em `planEntitlements.js` | Status no Frontend | Ação Recomendada Futura |
| :--- | :--- | :--- |
| `crisis_mode` | Sem UI / Removido na Fase 7 | Deprecar em migração controlada de backend |
| `executive_summary` | Sem UI / Removido na Fase 7 | Deprecar em migração controlada de backend |
| `quick_audit` | Sem UI / Removido na Fase 7 | Deprecar em migração controlada de backend |
| `debt_goals` | Sem UI / Removido na Fase 7 | Deprecar em migração controlada de backend |
| `deterministic_insights` | Sem UI / Removido na Fase 7 | Deprecar em migração controlada de backend |
| `category_budgets` | Sem UI / Removido na Fase 7 | Deprecar em migração controlada de backend |

---

## 4. Mapeamento de Cores & Eliminação de Cores Fixas (Hex)

### Tabela de Mapeamento

| Cor Hardcoded Legada | Função Visual | Token Semântico Substituto |
| :--- | :--- | :--- |
| `#0D0E11`, `#0A0B0E`, `#0E1015` | Fundo principal da página | `var(--fc-bg)` |
| `#121419`, `#161920`, `#181B22` | Superfície de cards | `var(--fc-surface-1)` / `fc-glass-card` |
| `#1C2028`, `#1B1F27`, `#262B36` | Superfície secundária / inputs | `var(--fc-surface-2)` |
| `#F9FAFB` | Texto primário de alto contraste | `var(--fc-text-primary)` |
| `#9CA3AF` | Texto secundário legível | `var(--fc-text-secondary)` |
| `#6B7280` | Texto atenuado / legendas | `var(--fc-text-muted)` |
| `#E5B842`, `#F5D580`, `#C99116` | Acentos e realces | `var(--fc-accent)` / `var(--fc-accent-hover)` |
| `#34D399` | Indicadores de sucesso / quitação | `var(--fc-success)` |
| `#F87171` | Indicadores de débito / alerta | `var(--fc-danger)` |
| `#38BDF8` | Indicadores informativos | `var(--fc-info)` |
| `rgba(255, 255, 255, 0.06 - 0.10)` | Bordas sutis de vidro | `var(--fc-border-subtle)` / `var(--fc-border-default)` |

### Contagem de Hex em `src/features/landing/**`
- **Antes da Fase 6:** 447 ocorrências de cores hexadecimais fixas.
- **Depois da Fase 6:** **0 ocorrências** (100% tokens CSS).

---

## 5. Medição de Contraste WCAG AA (Playwright)

Medição executada via script automatizado com Playwright em Chromium (1440x900) nos 14 pares fundamentais de texto e fundo:

### Tema Escuro (Abyss Teal)
- **Hero Headline:** 16.68:1 (`#EAF7F7` sobre `#04171F`)
- **Hero Support Copy:** 9.94:1 (`#A9C4C7` sobre `#04171F`)
- **Hero Primary CTA Button:** 9.55:1 (`#04171F` sobre `#5CCCCC`)
- **Hero Secondary CTA Button:** 15.00:1 (`#EAF7F7` sobre `#0A222B`)
- **Feature Card Title:** 15.00:1 (`#EAF7F7` sobre `#0A222B`)
- **Feature Card Description:** 9.94:1 (`#A9C4C7` sobre `#04171F`)
- **Pricing Pro Card Title:** 15.00:1 (`#EAF7F7` sobre `#0A222B`)
- **Pricing Pro Card Price:** 15.00:1 (`#EAF7F7` sobre `#0A222B`)
- **Pricing Pro CTA Button:** 13.52:1 (`#EAF7F7` sobre `#0E2B35`)
- **Final CTA Title:** 15.00:1 (`#EAF7F7` sobre `#0A222B`)
- **Final CTA Description:** 8.94:1 (`#A9C4C7` sobre `#0A222B`)
- **Final CTA Button:** 9.55:1 (`#04171F` sobre `#5CCCCC`)
- **Footer Links:** 8.94:1 (`#A9C4C7` sobre `#0A222B`)
- **Footer Copyright:** 5.78:1 (`#7E9FA3` sobre `#0A222B`) — *Pior índice Dark: 5.78:1 (Aprovado $\ge 4.5:1$)*.

### Tema Claro (Crisp Teal)
- **Hero Headline:** 14.11:1 (`#0B2530` sobre `#E6F4F7`)
- **Hero Support Copy:** 7.20:1 (`#2F5560` sobre `#E6F4F7`)
- **Hero Primary CTA Button:** 4.97:1 (`#FFFFFF` sobre `#047C84`)
- **Hero Secondary CTA Button:** 15.49:1 (`#0B2530` sobre `#F8FDFE`)
- **Feature Card Title:** 15.49:1 (`#0B2530` sobre `#F8FDFE`)
- **Feature Card Description:** 7.20:1 (`#2F5560` sobre `#E6F4F7`)
- **Pricing Pro Card Title:** 15.49:1 (`#0B2530` sobre `#F8FDFE`)
- **Pricing Pro Card Price:** 15.49:1 (`#0B2530` sobre `#F8FDFE`)
- **Pricing Pro CTA Button:** 14.38:1 (`#0B2530` sobre `#E9F6F8`)
- **Final CTA Title:** 15.49:1 (`#0B2530` sobre `#F8FDFE`)
- **Final CTA Description:** 7.91:1 (`#2F5560` sobre `#F8FDFE`)
- **Final CTA Button:** 4.97:1 (`#FFFFFF` sobre `#047C84`)
- **Footer Links:** 7.91:1 (`#2F5560` sobre `#F8FDFE`)
- **Footer Copyright:** 5.31:1 (`#4C6F78` sobre `#F8FDFE`) — *Pior índice Light: 4.97:1 (Aprovado $\ge 4.5:1$)*.

---

## 6. Medições de Performance & Core Web Vitals da Landing

### Tamanho do Bundle (Chunk da Landing e JS Inicial)
- **Chunk da Landing (`LandingPage-*.js`):** 114.84 kB (gzip: 32.01 kB).
- **Variação em relação à base:** $\approx +0.4\%$ (largamente inferior ao teto de $+10\%$).
- **Recharts na Landing:** ZERO imports (isolado estritamente no Dashboard Pro).

### Core Web Vitals (Medição Playwright)
- **Tema Escuro:**
  - **CLS (Cumulative Layout Shift):** `0.0008` (Excelente, meta do Google Core Web Vitals é $< 0.1$).
  - **Long Tasks (> 50ms):** 9 tarefas (total 2051ms em carga inicial do Vite).
- **Tema Claro:**
  - **CLS (Cumulative Layout Shift):** `0.0009` (Excelente, $< 0.1$).
  - **Long Tasks (> 50ms):** 13 tarefas (total 3579ms incluindo a transição de visual lab).

---

## 7. Isolamento de Sessão de Teste & Prova de Dead-Code Elimination em Produção

Foi implementada guarda estrita com `import.meta.env.DEV` em todos os pontos de consumo e restauração de dados de teste:
- `src/components/AccountDeletionModal.jsx`
- `src/components/ErrorBoundary.jsx`
- `src/components/ProAnalyticsCharts.jsx` (`[DEV] Teste Pro ativado localmente`)
- `src/context/AppProvider.jsx` (`setupAuthLifecycle`, `logout`)
- `src/context/authLifecycle.js`

### Prova Obrigatória: `grep` em `dist/` após `npm run build`
```text
=== GREP RESULTS IN DIST/ ===
__FINCONTROL_E2E_USER__: 0 occurrences
__FINCONTROL_E2E_MOCK_DATA__: 0 occurrences
fincontrol_e2e_user: 0 occurrences
fincontrol_e2e_data: 0 occurrences
fincontrol_e2e_plan: 0 occurrences
```
**Resultado:** Zero vazamentos de código de teste ou sessão sintética para o bundle de produção.

---

## 8. Inspeção Visual Honesta dos Screenshots

Foram gerados 16 screenshots capturando Hero, Features, Pricing e Rodapé em Desktop (1440x900) e Mobile (390x844) nos dois temas.

### Avaliação Crítica e Observações de Layout:
1. **Hero & Living Ledger (Desktop):**
   - Camadas translúcidas com profundidade nítida. O card principal flutua com excelente legibilidade e sombras suaves.
   - O carimbo "DADOS DE EXEMPLO" no cabeçalho do cartão principal contextualiza a simulação sem prejudicar o apelo comercial.
2. **Hero & Living Ledger (Mobile):**
   - O stack do Living Ledger empilha verticalmente abaixo do texto do Hero de forma limpa.
   - *Nota de Acabamento:* Em telas ultra-estreitas (< 360px), o chip flutuante "Lucas deve R$ 575,00" pode tangenciar a borda do viewport, mas em 390px mantém margem adequada de respiro.
3. **Seção de Recursos (Features):**
   - Grid de 3 colunas em desktop e 1 coluna em mobile. Ícones em Crisp Teal com contraste $\ge 7:1$.
4. **Tabela de Preços (Pricing):**
   - O card Pro mantém destaque natural com a tag "Acesso Vitalício" em alto contraste (`bg-[var(--fc-accent)] text-[var(--fc-accent-contrast)]`).
   - Os limites do plano gratuito ("Até 3 pessoas e até 2 cartões") estão explícitos, eliminando ambiguidades para o cliente.
5. **Rodapé:**
   - A `FinControlMark` (size 28) com animação suave em hover ancora a marca com solidez.
   - Links de privacidade, termos e login perfeitamente alinhados e acessíveis via teclado.

---

## 9. Quality Gates & Testes Automatizados

- **ESLint:** Executado com `cmd /c npm run lint` $\to$ **0 erros, 0 warnings**.
- **Testes Unitários:** Executados com `cmd /c npm test` $\to$ **655 testes passando** em 17 arquivos.
- **Testes E2E da Landing:** `e2e/landing-and-navigation.spec.js` $\to$ **9 testes passando (100%)** em 52.2s.
- **Compilação de Produção:** `cmd /c npm run build` $\to$ **Concluído com sucesso (built in 26s)**.

---

## 10. Adendo Fase 6.1 — Simulador de Divisão, Auditoria Numérica e Marca Animada

### 10.1. Causa Raiz do Bug do 11000 e Solução de Entrada
- **Causa Raiz:** O simulador anterior utilizava `<input type="number" value={totalAmount} onChange={e => setTotalAmount(Math.max(1, Number(e.target.value)))}>`. Quando o usuário limpava o campo com Backspace, o valor vazio `""` era convertido por `Number("")` em `0`, e `Math.max(1, 0)` forçava imediatamente o estado para `1`. Ao teclar em seguida `"1000"`, o caractere era anexado ao `1`, resultando em `"11000"` (R$ 11.000,00). Além disso, `type="number"` exibia spinners nativos indesejados, colava o prefixo `"R$"` no valor e não permitia formatação brasileira com separadores de milhar e centavos.
- **Solução Arquitetural:**
  - Substituição por `<input type="text" inputMode="decimal" autoComplete="off">` em container unificado com prefixo monetário `R$` e fonte monoespaçada (`font-mono tabular-nums`).
  - Criação do módulo utilitário desacoplado `src/features/landing/lib/splitExactCents.js`.
  - Tratamento de estado vazio (`rawInput === ''` ou centavos inválidos): exibe mensagem orientadora clara "Informe um valor para simular a divisão" e traços de invariante ("—"), sem forçar valor residual arbitrário.
  - Ao perder o foco (`onBlur`), se houver valor válido em centavos, formata como pt-BR limpo (`formatCentsForInput`).

### 10.2. Regras do Parser e Divisão Exata em Centavos
- **Normalização de Entrada (`parseCurrencyToCents`):**
  - Sanitização de caracteres proibidos e limite de 12 dígitos para prevenção de overflow.
  - Suporte resiliente a separador decimal com vírgula (`1234,56`) ou ponto (`1234.56`), e separador de milhar pt-BR (`1.234,56`).
  - Teto de segurança: R$ 1.000.000,00 (`100000000` centavos).
- **Divisão Exata e Zero Drift (`calculateSplitInCents`):**
  - Quociente base: `baseCents = Math.floor(totalCents / people)`.
  - Resto exato: `remainder = totalCents % people`.
  - Distribuição determinística: os primeiros `remainder` participantes recebem `baseCents + 1`, e os demais recebem `baseCents`.
  - Invariante formal garantido: $\sum_{i=1}^n \text{share}_i \equiv \text{totalCents}$, $\Delta \text{drift} = 0$, $\max(\text{share}) - \min(\text{share}) \le 1\text{ centavo}$.
  - Formatação com espaço regular normalizado: substituição do non-breaking space `\u00A0` do `Intl.NumberFormat` por espaço comum `' '` para estabilidade visual e de asserções de teste.

### 10.3. Auditoria de Todos os Números da Landing & Coerência Global
- Criação de `src/features/landing/lib/sampleData.js` como **Fonte Única da Verdade** para todos os números demonstrativos.
- Todas as datas de faturas e cronogramas são geradas dinamicamente a partir do mês corrente (`new Date()`), eliminando referências estáticas datadas.
- **Tabela de Auditoria Global:**

| Arquivo / Seção | Dado / Valor | Significado no Domínio | Relação Matemática & Invariante |
| :--- | :--- | :--- | :--- |
| `sampleData.js` | R$ 10.000,00 (`1000000`¢) | Limite total do Cartão Principal | Limite Total = Limite Utilizado + Limite Disponível |
| `sampleData.js` | R$ 3.840,25 (`384025`¢) | Fatura atual (mês 0) | $\sum$ dos 7 lançamentos do cartão $\equiv$ R$ 3.840,25 |
| `sampleData.js` | R$ 6.159,75 (`615975`¢) | Limite disponível do Cartão | R$ 10.000,00 - R$ 3.840,25 = R$ 6.159,75 (38,4% utilizado) |
| `sampleData.js` | R$ 1.150,00 (`115000`¢) | Parcela 3/10 Notebook Pro | Parcela de compra parcelada |
| `sampleData.js` | R$ 625,00 (`62500`¢) | Parcela 8/12 Smartphone Ultra | Parcela de compra parcelada |
| `sampleData.js` | R$ 315,00 (`31500`¢) | Parcela 2/4 Revisão Automotiva | Parcela de compra parcelada |
| `sampleData.js` | R$ 450,00 (`45000`¢) | Parcela 1/6 Curso Especialização | Parcela de compra parcelada |
| `sampleData.js` | R$ 59,90 (`5990`¢) | Assinatura Streaming 4K | Custo fixo recorrente |
| `sampleData.js` | R$ 139,90 (`13990`¢) | Assinatura Academia | Custo fixo recorrente |
| `sampleData.js` | R$ 1.100,45 (`110045`¢) | Despesa avulsa Supermercado | Gasto avulso do ciclo atual |
| `sampleData.js` | R$ 575,00 (`57500`¢) | Parcela compartilhada Lucas | Exatamente 50% da parcela de R$ 1.150,00 do Notebook |
| `sampleData.js` | R$ 3.840,25 / R$ 2.410,20 / R$ 1.645,30 / R$ 1.075,00 / R$ 625,00 | Linha do tempo de 5 meses | Decrescimento matemático exato conforme parcelas chegam ao fim (mês 4 resta apenas Smartphone R$ 625,00) |
| `PricingPlansSection.jsx` | R$ 0 / Grátis | Plano gratuito | Limites claros: até 3 pessoas, até 2 cartões |
| `PricingPlansSection.jsx` | R$ 29,99 / Vitalício | Plano Pro vitalício | Bate 100% com `functions/index.js:243` (`PRO-LIFETIME-01`) |
| `SharedPurchaseSection.jsx` | R$ 0,01 | Princípio do centavo residual | Regra de integridade do FinControl |

### 10.4. Confirmação do Preço da Cloud Function
- **Arquivo Auditado:** `functions/index.js` (linhas 235–255).
- **Item Configurado no Mercado Pago:**
  - `id`: `"PRO-LIFETIME-01"`
  - `title`: `"FinControl Pro - Acesso Vitalício"`
  - `unit_price`: `29.99`
  - `currency_id`: `"BRL"`
- **Conclusão:** Coerência de 100% entre o valor anunciado na landing (R$ 29,99 em pagamento único) e o backend de processamento de pagamentos.

### 10.5. Grep de Números Hardcoded: Antes vs Depois
- **Antes (Fase 6):** 34 ocorrências de valores monetários fixos espalhados sem centralização por 4 arquivos de componentes (`LivingLedgerStage.jsx`, `FinancialControlSection.jsx`, `InvoiceTimelineSection.jsx`, `SharedPurchaseSection.jsx`). Datas estáticas fixadas em Maio/2026.
- **Depois (Fase 6.1):** 0 valores fictícios hardcoded nos componentes. Todos os dados derivam de `sampleData.js` com centavos inteiros e datas relativas dinâmicas. Restam apenas os preços comerciais canônicos do plano Pro (R$ 29,99), do plano Grátis (R$ 0) e o nome do princípio matemático ("O Princípio de R$ 0,01").

### 10.6. Marca Animada Contínua e Métricas de Performance
- `LandingHeader.jsx` e `LandingFooter.jsx` atualizados com `animated={true}` em `<FinControlMark />`.
- As ondas em CSS utilizam exclusivamente `transform: translate3d(...)` acelerado por GPU com `will-change: transform`.
- **Métricas no Chrome Headless (Playwright via Vite Preview de Produção):**
  - **Long Tasks em repouso (janela de 5 segundos contínuos):** **0** (zero).
  - **Cumulative Layout Shift (CLS) em repouso:** **0** (zero).
  - **Acessibilidade:** Suporte rigoroso a `prefers-reduced-motion: reduce`, desativando qualquer animação quando solicitado pelo sistema operacional.

### 10.7. Inspeção Visual das Provas (28 Screenshots em `public/screenshots-fase-6-1/`)
- **Simulador:**
  - `sim-2p-1000.png`: R$ 1.000,00 dividido por 2 $\to$ R$ 500,00 para cada, soma R$ 1.000,00, diferença residual R$ 0,00.
  - `sim-3p-1000.png`: R$ 1.000,00 dividido por 3 $\to$ P1: R$ 333,34, P2: R$ 333,33, P3: R$ 333,33. Soma R$ 1.000,00, diferença R$ 0,00.
  - `sim-5p-1234-56.png`: R$ 1.234,56 dividido por 5 $\to$ P1: R$ 246,92, P2: R$ 246,91, P3: R$ 246,91, P4: R$ 246,91, P5: R$ 246,91. Soma R$ 1.234,56, diferença R$ 0,00.
  - `sim-empty.png`: Estado vazio exibindo aviso explicativo limpo e traços `—` no invariante.
- **Ajuste Fino Realizado:**
  - Em telas mobile (`390x844`), a pílula secundária "Fatura Aberta" no header do cartão foi ocultada em viewports menores que `sm` (`hidden sm:inline-flex`), garantindo respiração perfeita sem colisão com o chip flutuante "Lucas deve R$ 575,00".
  - Ajuste de concordância gramatical em `InvoiceTimelineSection.jsx` para "1 parcela ativa" no singular quando aplicável.

---

## 11. Adendo Fase 6.2 — Limpeza de Screenshots, Fonte Única Derivada e Simulador Fiel ao App

### 11.1. Remoção de Screenshots Indevidos de `public/`
- **Diagnóstico:** 28 imagens de screenshot (totalizando **2.360.662 bytes / ~2,25 MB**) haviam sido gravadas em `public/screenshots-fase-6-1/`. Como a pasta `public/` é copiada integralmente para a raiz do Hosting no build de produção, essas imagens seriam publicadas desnecessariamente.
- **Ações Corretivas Executadas:**
  1. Remoção imediata via `git rm -r public/screenshots-fase-6-1/`.
  2. Adição da regra de proteção `public/screenshots*/` no [`.gitignore`](file:///c:/Users/CyberLiko/projects/app-financeiro/.gitignore).
  3. Criação do teste unitário de segurança [`tests/publicAssetsSanity.test.js`](file:///c:/Users/CyberLiko/projects/app-financeiro/tests/publicAssetsSanity.test.js), que escaneia recursivamente `public/` e falha se qualquer arquivo contiver `'screenshot'` no nome ou caminho.
  4. Redirecionamento de todos os scripts de captura e testes visuais para a pasta local [`screenshots/`](file:///c:/Users/CyberLiko/projects/app-financeiro/screenshots/), devidamente ignorada pelo Git.
  - *Nota de Histórico:* As imagens permanecem nos commits anteriores da branch (`7bf55ce` e antecessores) ocupando 2,25 MB no histórico git local, sem reescrita destrutiva nem force-push. O diretório `dist/` gerado no build final contém **0 imagens de screenshot**.

### 11.2. Fonte Única de Verdade 100% Derivada (`sampleData.js`)
O arquivo [`sampleData.js`](file:///c:/Users/CyberLiko/projects/app-financeiro/src/features/landing/lib/sampleData.js) foi completamente reestruturado para eliminar qualquer valor calculado ou total digitado à mão:
- **Modelo Base Bruto (`RAW_SAMPLE_MODEL`):** Contém estritamente inteiros e centavos: limites dos 3 cartões, compras parceladas (valor da parcela, parcela atual, total de parcelas, flag compartilhada e cota em centavos), assinaturas (valor em centavos) e uma despesa avulsa no mês atual.
- **Funções Puras de Derivação:**
  - `calculateMonthInvoice(cardId, monthOffset, rawModel)`: projeta a fatura exata para qualquer mês relativo.
  - `calculateCardUsedPercent(totalCents, limitCents)`: calcula a porcentagem com aritmética inteira pura a 1 casa decimal (arredondamento determinístico).
  - Totais, disponíveis, percentuais, saldo devedor restante, meses de término, contagem de lançamentos e status (`Atual`, `Previsto`, `Final`) são 100% computados.
- **Ajuste de Coerência da Janela de 5 Meses:**
  - O parcelamento do `Notebook de Trabalho` foi ajustado para `07 de 10` (encerrando no Mês 3).
  - O `Smartphone de Trabalho` opera em `08 de 12` (encerrando no Mês 4).
  - No Mês 4, vence a 12ª e última parcela do Smartphone, que é a última parcela de todas as compras ativas no Cartão Principal, atribuindo legitimamente o status `"Final"` ao 5º mês da timeline.

### 11.3. Tabela de Auditoria REAL (Mês a Mês — Cartão Principal)
Tabela gerada diretamente a partir da execução do modelo (`getSampleData(new Date(2026, 10, 5))`):

| Mês Relativo | Nome / Ano | Status | Parcelas Ativas | Assinaturas | Avulsas | Total da Fatura | Contagem de Lançamentos | Detalhamento |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **Mês 0** | Novembro 2026 | **Atual** | 4 (R$ 2.540,00) | 2 (R$ 199,80) | 1 (R$ 1.100,45) | **R$ 3.840,25** | **7 lançamentos** | 4 parcelas + 2 assinaturas + 1 avulsa |
| **Mês 1** | Dezembro 2026 | **Previsto** | 3 (R$ 2.090,00) | 2 (R$ 199,80) | 0 (R$ 0,00) | **R$ 2.289,80** | **5 lançamentos** | 3 parcelas + 2 assinaturas |
| **Mês 2** | Janeiro 2027 | **Previsto** | 3 (R$ 2.090,00) | 2 (R$ 199,80) | 0 (R$ 0,00) | **R$ 2.289,80** | **5 lançamentos** | 3 parcelas + 2 assinaturas |
| **Mês 3** | Fevereiro 2027 | **Previsto** | 2 (R$ 1.775,00) | 2 (R$ 199,80) | 0 (R$ 0,00) | **R$ 1.974,80** | **4 lançamentos** | 2 parcelas + 2 assinaturas |
| **Mês 4** | Março 2027 | **Final** | 1 (R$ 625,00) | 2 (R$ 199,80) | 0 (R$ 0,00) | **R$ 824,80** | **3 lançamentos** | 1 parcela + 2 assinaturas |

- **Coerência Entre Seções:** A fatura atual (`R$ 3.840,25`) e a fatura seguinte (`R$ 2.289,80`) coincidem 100% entre [`LivingLedgerStage`](file:///c:/Users/CyberLiko/projects/app-financeiro/src/features/landing/components/LivingLedgerStage.jsx), [`FinancialControlSection`](file:///c:/Users/CyberLiko/projects/app-financeiro/src/features/landing/components/FinancialControlSection.jsx) e [`InvoiceTimelineSection`](file:///c:/Users/CyberLiko/projects/app-financeiro/src/features/landing/components/InvoiceTimelineSection.jsx).

### 11.4. Grep de Literais Monetários e Percentuais
```bash
$ git grep "R\$" src/features/landing/lib/sampleData.js src/features/landing/components/LivingLedgerStage.jsx src/features/landing/components/FinancialControlSection.jsx src/features/landing/components/InvoiceTimelineSection.jsx
src/features/landing/components/InvoiceTimelineSection.jsx:  Rigor Matemático: O Princípio de R$ 0,01
src/features/landing/components/LivingLedgerStage.jsx:        Sem resíduo de arredondamento: R$ 0,00
src/features/landing/lib/sampleData.js:                      freeDisplay: 'R$ 0',
src/features/landing/lib/sampleData.js:                      proDisplay: 'R$ 29,99'
```
**Resultado:** Zero literais monetários digitados além do nome da regra conceitual, do resíduo nulo de arredondamento e dos preços canônicos oficiais.

### 11.5. Simulador Fiel ao App Real
- **Alinhamento com o App de Produção:**
  - No app ([`LoanManagement.jsx`](file:///c:/Users/CyberLiko/projects/app-financeiro/src/features/loans/LoanManagement.jsx#L142-L143)), uma compra compartilhada ocorre entre **duas pessoas**: a Pessoa 1 define sua cota (ou divide 50/50) e a Pessoa 2 recebe o complemento exato (`total - pessoa1`).
  - As parcelas seguem a regra canônica de [`financialService.js:calculateInstallments`](file:///c:/Users/CyberLiko/projects/app-financeiro/src/services/financialService.js#L52-L85), onde as primeiras $N-1$ parcelas recebem `floor(total / N)` e a **última parcela absorve a diferença inteira de centavos residuais**.
- **Regras Implementadas no Simulador:**
  - Suporte a modo `"Meio a meio"` (`floor(total / 2)`) e `"Definir Pessoa 1"`.
  - Se Pessoa 1 for maior que o total, exibe erro claro sem produzir valores negativos.
  - Seleção de parcelas entre `1x, 2x, 3x, 6x, 10x, 12x` com botões acessíveis ($\ge 44$px).
  - Exibição detalhada de parcelas por pessoa (ex.: `"2 × R$ 166,66 + última R$ 166,68"`).
  - Auditoria matemática com soma das partes e diferença residual estritamente nula (`R$ 0,00`).
- **Prova de Paridade Matemática Exaustiva:**
  - O teste [`tests/splitExactCents.test.js`](file:///c:/Users/CyberLiko/projects/app-financeiro/tests/splitExactCents.test.js) executou uma varredura cruzada de **60.000 casos** (valores de 1 a 5.000 centavos para parcelas de 1 a 12), comparando a função `calculateAppInstallments` diretamente com `calculateInstallments` do `financialService.js`.
  - **Resultado:** 100% de paridade em todos os 60.000 cenários, com **0 divergências**.

### 11.6. Inspeção Visual das Provas em `screenshots/`
Foram capturados 20 screenshots em Desktop (1440x900) e Mobile (390x844) nos temas escuro e claro:
1. `desktop-dark-sim-half-1000-01-3x.png`: Divisão de R$ 1.000,01 em 2 pessoas (P1: R$ 500,00, P2: R$ 500,01) com 3 parcelas (P1: 2 × R$ 166,66 + última R$ 166,68; P2: 3 × R$ 166,67). Soma R$ 1.000,01, diferença R$ 0,00.
2. `desktop-dark-sim-custom-p1.png`: Divisão customizada com Pessoa 1 = R$ 400,00 e Pessoa 2 = R$ 600,01. Parcelas perfeitamente decompostas.
3. `desktop-dark-sim-error-p1-gt-total.png`: Mensagem de validação amigável em vermelho suave quando Pessoa 1 excede o total, sem números negativos nos cards.
4. `desktop-dark-sim-empty.png`: Estado vazio exibindo aviso e traços de invariante limpos.
5. `desktop-dark-timeline-coerente.png`: Ribbon de 5 meses com contagem de lançamentos e detalhamento explícito (parcelas + assinaturas + avulsas).
- **Achados e Observações Críticas de Layout:**
  - *Viewport Mobile (390x844):* Ao rolar a página até a timeline ou o simulador, a barra de navegação superior fixa (`position: fixed`) sobrepõe sutilmente a primeira linha de texto do cabeçalho da seção quando o scroll é ancorado no topo exato do elemento. No uso interativo real do usuário (com scroll contínuo), o comportamento é natural, mas na captura estática de elemento (`element.screenshot()`), a barra fixa aparece sobreposta.
  - *Card Estreito no Mobile:* No primeiro card da timeline (Novembro 2026), o texto de detalhamento `"4 parcelas + 2 assinaturas + 1 avulsa"` é truncado com reticências (`truncate`) devido à largura reduzida da coluna dupla no mobile, mantendo o layout limpo sem quebrar a altura dos cards vizinhos.
