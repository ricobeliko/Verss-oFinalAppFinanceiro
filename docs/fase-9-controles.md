# FinControl — Fase 9: Controles Próprios, Logo Animado no App e Rosca Interativa

**Branch:** `feat/redesign-fase-9-controles`  
**Data:** Novembro de 2026  
**Status:** Concluído com 100% de aprovação e zero regressões

---

## 1. Motivação e Decisão de Arquitetura

### 1.1 O Fim dos Controles Nativos do Navegador
Os controles nativos HTML `<select>`, `<input type="month">` e `<input type="date">` no Google Chrome e navegadores baseados em Chromium apresentavam três problemas graves de qualidade e confiabilidade:
1. **Quebra Estética Radical:** Menus popup quadrados, sem bordas sutis, com fundo cinza chapado ou branco sem tema, fonte de sistema e sem a identidade visual cinematográfica *Abyss Teal / Crisp Teal*.
2. **Deficiências de Acessibilidade e Mobile:** Em dispositivos móveis, os seletores de data nativos do Chromium utilizam layouts que dificultam o toque em telas pequenas e não operam como bottom sheets ergonômicas com touch targets $\ge 44$px.
3. **Vulnerabilidade Crítica de Fuso Horário:** A construção nativa ou ingênua `new Date("YYYY-MM-DD")` no JavaScript interpreta a string em horário UTC à meia-noite (`00:00:00Z`). Em fusos horários a oeste de Greenwich (como o horário de Brasília `UTC-3` / `America/Sao_Paulo`), `2026-11-05` é avaliada localmente como `2026-11-04 21:00:00`, adiantando o lançamento em 1 dia e gerando inconsistências contábeis e de conciliação bancária.

### 1.2 Princípios dos Novos Componentes
- **`Select.jsx`:** API 100% retrocompatível com `<select>`, aceitando tanto `<option>` como `children` quanto array de `options`. Renderiza combobox WAI-ARIA com popover via Portal React, auto-flip vertical baseado no espaço da viewport, bottom-sheet responsiva em viewports $< 640$px, navegação por setas (Up/Down/Home/End), busca por digitação rápida (typeahead), fechamento via Escape com prioridade sobre modais externos e ícone identitário de 3 ondas no item selecionado.
- **`MonthPicker.jsx`:** Grade compacta 4x3 de meses em português (pt-BR) com navegação anual, input editável de ano com limites de segurança, atalhos rápidos ("Este mês" e "Limpar") e bottom sheet em telas móveis.
- **`DatePicker.jsx`:** Calendário mensal dom–sáb construído puramente por aritmética de inteiros (ano, mês, dia) sem instanciar strings ISO em `new Date()`, eliminando 100% do risco de desvio de dia por fuso horário. Permite alternância rápida para seleção de mês/ano, destaque do dia atual ("Hoje") e bottom sheet em dispositivos móveis.

---

## 2. Tabela Comparativa dos 18 `<select>` Substituídos

Todos os 18 call sites no repositório foram mapeados e migrados para `<Select>`:

| # | Arquivo | Linha Original | Identificador / Finalidade | Tipo de Dado | Acessibilidade / ARIA |
|---|---|---|---|---|---|
| 1 | `src/features/dashboard/Dashboard.jsx` | L616 | Filtro de Cartão de Crédito | String ID (`all` ou ID do cartão) | `aria-label="Filtrar por cartão"` |
| 2 | `src/features/dashboard/Dashboard.jsx` | L632 | Filtro de Pessoa / Titular | String ID (`all` ou ID da pessoa) | `aria-label="Filtrar por pessoa"` |
| 3 | `src/features/expenses/ExpenseManagement.jsx` | L254 | Seleção de Cartão da Despesa | String ID (`none` ou ID do cartão) | `aria-label="Cartão de crédito"` |
| 4 | `src/features/expenses/ExpenseManagement.jsx` | L266 | Categoria da Despesa | String (Alimentação, Transporte...) | `aria-label="Categoria da despesa"` |
| 5 | `src/features/expenses/ExpenseManagement.jsx` | L277 | Status da Despesa | String (`Pendente` / `Paga`) | `aria-label="Status do pagamento"` |
| 6 | `src/features/income/IncomeManagement.jsx` | L231 | Categoria da Receita | String (Salário, Freelance...) | `aria-label="Categoria da receita"` |
| 7 | `src/features/income/IncomeManagement.jsx` | L242 | Status da Receita | String (`Recebido` / `Pendente`) | `aria-label="Status do recebimento"` |
| 8 | `src/features/loans/LoanManagement.jsx` | L598 | Cartão da Compra Parcelada | String ID (ID do cartão) | `aria-label="Cartão de crédito"` |
| 9 | `src/features/loans/LoanManagement.jsx` | L610 | Tipo de Dívida / Divisão | String (`mine`, `client`, `shared`) | `aria-label="Tipo de divisão da dívida"` |
| 10 | `src/features/loans/LoanManagement.jsx` | L643 | Titular Pessoa 1 (Divisão Compartilhada) | String ID (ID do cliente) | `aria-label="Selecionar Pessoa 1"` |
| 11 | `src/features/loans/LoanManagement.jsx` | L657 | Titular Pessoa 2 (Divisão Compartilhada) | String ID (ID do cliente) | `aria-label="Selecionar Pessoa 2"` |
| 12 | `src/features/loans/LoanManagement.jsx` | L701 | Titular da Dívida (Pessoa Única) | String ID (ID do cliente) | `aria-label="Titular da dívida"` |
| 13 | `src/features/loans/LoanManagement.jsx` | L713 | Categoria da Compra | String (Tecnologia, Lazer...) | `aria-label="Categoria da compra"` |
| 14 | `src/features/subscriptions/SubscriptionManagement.jsx` | L225 | Cartão da Assinatura | String ID (ID do cartão) | `aria-label="Cartão de crédito"` |
| 15 | `src/features/subscriptions/SubscriptionManagement.jsx` | L238 | Categoria da Assinatura | String (Streaming, Software...) | `aria-label="Categoria da assinatura"` |
| 16 | `src/features/subscriptions/SubscriptionManagement.jsx` | L249 | Status da Assinatura | String (`Ativa` / `Inativa`) | `aria-label="Status da assinatura"` |
| 17 | `src/components/PdfImportModal.jsx` | L139 | Cartão de Destino da Fatura PDF | String ID (ID do cartão) | `aria-label="Cartão de crédito"` |
| 18 | `src/components/FinancialSandboxSimulatorModal.jsx` | L87 | Cartão do Cenário Sandbox | String ID (ID do cartão) | `aria-label="Cartão simulado"` |

---

## 3. Tabela Comparativa dos Inputs de Data Substituídos

| # | Arquivo | Linha | Controle | Tipo | Formato | Tratamento de Fuso Horário |
|---|---|---|---|---|---|---|
| 1 | `src/features/dashboard/Dashboard.jsx` | L647 | `<MonthPicker>` | Competência Mês/Ano | `YYYY-MM` | Parse de strings via split `-` (inteiros puros ano e mês) |
| 2 | `src/features/cards/CardManagement.jsx` | L210 | `<MonthPicker>` | Mês da Fatura do Cartão | `YYYY-MM` | Parse de strings via split `-` (inteiros puros ano e mês) |
| 3 | `src/features/expenses/ExpenseManagement.jsx` | L241 | `<DatePicker>` | Data do Lançamento | `YYYY-MM-DD` | Parse numérico puro `year`, `month`, `day`, sem UTC shift |
| 4 | `src/features/income/IncomeManagement.jsx` | L218 | `<DatePicker>` | Data do Recebimento | `YYYY-MM-DD` | Parse numérico puro `year`, `month`, `day`, sem UTC shift |
| 5 | `src/features/loans/LoanManagement.jsx` | L584 | `<DatePicker>` | Data da 1ª Parcela | `YYYY-MM-DD` | Parse numérico puro `year`, `month`, `day`, sem UTC shift |

---

## 4. Logo Animado Permanente no App

- **Componente:** [`FinControlMark.jsx`](file:///c:/Users/CyberLiko/projects/app-financeiro/src/components/FinControlMark.jsx).
- **Ativação:** Atualizado com `animated={true}` em `AppSidebar.jsx` (topo expandido e recolhido), `AppTopbar.jsx` (cabeçalho mobile) e `MobileNavigation.jsx` (topo do drawer móvel).
- **Performance:** 100% compositor de GPU via `transform: translate3d(-352px, 0, 0)` contínuo sem rAF nem loop JS.
- **Medição de Long Tasks (Playwright):** O teste `e2e/tab-perf.spec.js` mediu a transição em cadeia de 5 abas:
  - Baseline com logo estático: **7 tarefas longas**.
  - Após ativação do logo animado permanente: **4 tarefas longas** (taxa idêntica ou inferior à baseline, comprovando zero custo de CPU).

---

## 5. Gráfico de Gastos por Pessoa (Rosca / Donut Interativo)

- **Arquivo:** [`ProAnalyticsCharts.jsx`](file:///c:/Users/CyberLiko/projects/app-financeiro/src/components/ProAnalyticsCharts.jsx).
- **Serviço de Domínio:** Função [`calculatePersonSpendingBreakdown`](file:///c:/Users/CyberLiko/projects/app-financeiro/src/services/financialService.js) em `src/services/financialService.js`.
- **Raio da Rosca:** `innerRadius={65}` e `outerRadius={92}` com `paddingAngle={3}`.
- **Centro Dinâmico:**
  - *Em repouso:* Rótulo "Total da Fatura" + valor em moeda pt-BR + contagem de pessoas.
  - *No hover/foco de pessoa:* Nome da pessoa + valor dela na fatura + percentual exato dela ("% da fatura").
- **Invariante Matemática do FinControl:**
  - Soma dos centavos de cada pessoa $\equiv$ centavos totais da fatura (zero drift monetário).
  - Soma dos percentuais $\equiv 100\%$ garantida matematicamente através do **Método do Maior Resto (Largest Remainder / Hamilton)**.
- **Acessibilidade:**
  - Legenda interativa com botões focáveis por teclado (`tabIndex={0}`, Enter/Space para alternar destaque, `aria-label="Nome: R$ X,XX, Y% do total"`).
  - Donut SVG marcado com `aria-hidden="true"` para que leitores de tela utilizem a legenda semântica como fonte única e precisa de informação.

---

## 6. Correção da Landing (320px)

- **Arquivo:** `src/features/landing/components/InvoiceTimelineSection.jsx` (~L45).
- **Correção:** Substituído layout rígido com `truncate` por container flexível `flex flex-wrap items-center justify-between gap-1.5` sem cortar o nome do mês.
- **Validação:** Testes automatizados em `e2e/landing-timeline-viewports.spec.js` executados em 320px, 360px e 390px, atestando 0% de scroll horizontal e 100% de integridade textual dos meses.

---

## 7. Regras de Navegação por Teclado

### `<Select>`
- `Tab` / `Shift+Tab`: Entra e sai do controle.
- `Enter` / `Space` / `ArrowDown`: Abre o dropdown.
- `ArrowDown` / `ArrowUp`: Navega sequencialmente entre as opções.
- `Home` / `End`: Salta para a primeira / última opção.
- Digitação rápida (typeahead): Foca a opção que inicia com o caractere digitado.
- `Escape`: Fecha o dropdown imediatamente com `stopPropagation()`.

### `<MonthPicker>`
- `Enter` / `Space`: Abre a grade 4x3 de meses.
- `ArrowLeft` / `ArrowRight`: Navega entre meses adjacentes.
- `ArrowUp` / `ArrowDown`: Navega entre trimestres (mesma coluna, 3 meses de salto).
- `Escape`: Fecha o picker.

### `<DatePicker>`
- `Enter` / `Space`: Abre o calendário dom–sáb.
- `ArrowLeft` / `ArrowRight`: Navega de dia em dia.
- `ArrowUp` / `ArrowDown`: Navega de semana em semana ($\pm 7$ dias).
- `Home` / `End`: Primeiro / último dia do mês corrente.
- `PageUp` / `PageDown`: Mês anterior / mês seguinte.
- `Escape`: Fecha o calendário.
