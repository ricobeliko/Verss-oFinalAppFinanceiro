# Notas de Release — Redesign do FinControl

**Versão / Etapa:** Fechamento do Redesign (Abyss Teal & Crisp Teal)  
**Branch:** `feat/redesign-fase-9-controles`  
**Base:** `origin/main`  
**Status:** Rascunho / Aguardando Validação do Proprietário  

---

## 1. Resumo do que Mudou para o Usuário

O FinControl recebeu uma evolução visual e funcional completa, tornando a experiência mais cinematográfica, consistente e fluida, sem abrir mão da precisão matemática e da estabilidade de produção:

1. **Nova Identidade Visual (*Abyss Teal* & *Crisp Teal*):**
   - **Dark Mode (Padrão):** Fundo profundo azul-abissal (`#04171F` / `#0E2B35`), superfícies translúcidas com efeito vidro e detalhes em turquesa/teal luminoso (`#5CCCCC` / `#7FE0DC`).
   - **Light Mode:** Paleta limpa e contrastante (*Crisp Teal*) sem ilhas escuras, com tipografia legível e tokens consistentes.
2. **App Shell & Sidebar de Vidro:**
   - Navegação modernizada com sidebar translúcida, recolhimento suave, visual ativo destacado e navegação móvel adaptada.
   - Transição suave entre abas (*PageWaveSweep*) com motion contínuo operando 100% via transform/opacity na GPU, e suporte total a `prefers-reduced-motion`.
3. **Novos KPIs Financeiros e Gráficos de Evolução:**
   - Cards de indicadores unificados: Fatura Atual, Total Pago, Próxima Fatura e Limite Total Comprometido.
   - Gráfico de Evolução Mensal com cálculo consolidado em centavos inteiros (zero drift) e sincronização exata com o filtro de cartões.
4. **Rosca Interativa com Centro Dinâmico ("Gastos por Pessoa"):**
   - Rosca refinada com visual de anel contínuo, centro dinâmico que exibe valor e elipse de texto segura, e legenda empilhada que nunca quebra valores ou percentuais.
5. **Projeção e Exportação por Pessoa:**
   - Detalhamento de compromissos futuros filtrável por pessoa ou despesas próprias.
   - Exportação CSV focada por pessoa na aba Pessoas, facilitando a prestação de contas e divisões compartilhadas.
6. **Controles Próprios com a Identidade do App:**
   - `Select`, `MonthPicker` e `DatePicker` desenvolvidos internamente com a estética do FinControl, eliminando os popups cinzas e quadrados nativos do navegador.
7. **Marca Animada e Novos Favicons:**
   - Logotipo oficial com 3 ondas fluidas animadas no cabeçalho e login.
   - Conjunto completo de ícones estáticos para navegador e PWA (`favicon.svg`, `favicon-32.png`, `apple-touch-icon.png`, `site.webmanifest`).
8. **Nova Landing Page:**
   - Design moderno alinhado à paleta Abyss Teal, texto honesto baseado exclusivamente em *Product Proof* (sem depoimentos falsos ou métricas inventadas), simulador de divisão matemática exata e redução de mais de 27% no peso do bundle.

---

## 2. Funcionalidades Removidas

Para simplificar a manutenção e focar o app nas dores reais (cartões de crédito, parcelas e divisões com pessoas), recursos legados com pouca tração foram descontinuados:

| Funcionalidade Removida | Onde Ficava | Os Dados Continuam no Firestore? | Substituto / Onde Consultar |
| :--- | :--- | :--- | :--- |
| **Modo Crise** | Aba/Modal lateral de emergência (`src/features/crisis/CrisisMode.jsx`) | **Sim** (não gravava coleção própria; lia despesas e cartões em runtime) | Gestão normal de parcelas e cartões no Dashboard e Faturas. |
| **Resumo Executivo** | Modal acessível por botão no Dashboard (`src/components/ExecutiveSummaryModal.jsx`) | **Sim** (não gravava dados no Firestore; métricas puramente calculadas em memória) | Novos KPIs do Dashboard e Gráfico de Evolução Mensal. |
| **Alertas & Notificações** | Sininho no Topbar e banner no Dashboard (`FinancialAlertsBanner.jsx`, `NotificationCenterPopover.jsx`, `NotificationSettingsModal.jsx`) | **Sim** (o objeto `notificationSettings` no documento do usuário em `users/{uid}` foi preservado 100% intacto, sem exclusões ou migrações) | Indicadores visuais diretos nos cartões e status de faturas (pendente, pago, atrasado). |
| **Metas de Orçamento por Categoria** | Widget e Modal no Dashboard (`src/components/CategoryBudgetsWidget.jsx`, `src/components/CategoryBudgetsModal.jsx`) | **Sim** (o objeto `budgets` no documento do usuário em `users/{uid}` foi preservado 100% intacto, sem alterações de schema) | Sem substituto direto (análise agora é focada em gastos por pessoa e fechamento de fatura). |
| **Metas & Quitação de Dívidas** | Widget no Dashboard na grade de inteligência Pro (`src/features/dashboard/Dashboard.jsx`) | **Sim** (não gravava campos isolados como `debtGoals` no usuário; lia diretamente o array `installments` de `loans`. Todas as compras e parcelas continuam 100% íntegras no Firestore) | Sem substituto direto como widget isolado no Dashboard; a consulta de parcelas restantes e término é feita diretamente na listagem de compras da fatura e na aba Movimentações. |
| **Auditoria Relâmpago** | Widget no Dashboard na grade de inteligência Pro (`src/features/dashboard/Dashboard.jsx`) | **Sim** (não gravava dados; compilava em memória o custo mensal de `subscriptions` ativas) | Aba dedicada "Assinaturas" e novos KPIs unificados de fatura do Dashboard. |
| **Insights Determinísticos** | Widget de dicas automatizadas no Dashboard (`src/components/DeterministicInsightsWidget.jsx`) | **Sim** (processamento puramente em memória; nenhum dado persistido) | Sem substituto. |
| **Total Receitas / Balanço Geral no Dashboard** | Cards superiores de receita e saldo no Dashboard (`src/features/dashboard/ProSummary.jsx`) | **Sim** (a coleção `incomes` e todos os lançamentos continuam 100% intactos no Firestore) | Aba "Movimentações" dedicada ao histórico e cadastro de receitas e despesas avulsas. |
| **Exportação CSV Geral no Dashboard** | Botão de download no topo do Dashboard (`src/features/dashboard/Dashboard.jsx`) | **Sim** (todos os lançamentos permanecem intactos) | Exportação CSV individual e anual na aba "Pessoas" (`FinancialReportModal.jsx`), focada em prestação de contas. |

> [!NOTE]
> **Garantia de Preservação de Dados:** Nenhuma rotina de exclusão ou migração destrutiva foi executada no Firestore. Os schemas de usuário, cartões, compras, parcelas, receitas e transações continuam 100% retrocompatíveis.

---

## 3. O que NÃO Mudou

- **Regras de Segurança (`firestore.rules`):** Zero alterações. A autorização por usuário e isolamento de coleções permanecem inalterados.
- **Cloud Functions (`functions/`):** Zero alterações nas rotinas de backend e webhooks de pagamento.
- **Planos e Entitlements (`planEntitlements.js`):** Regras de acesso Pro/Free intactas.
- **Lógica Financeira (`src/services/financialService.js`):** A integridade matemática de centavos inteiros foi estritamente preservada. Foram adicionadas apenas 6 novas funções utilitárias puras:
  1. `filterCommitmentsForPerson`: filtra compras e assinaturas para uma pessoa específica ('all', 'unassigned' ou ID) com segurança contra referências órfãs (`tests/futureCommitmentsByPerson.test.js`).
  2. `calculateFutureCommitmentsForPerson`: calcula projeção financeira dos próximos meses em centavos inteiros (`tests/futureCommitmentsByPerson.test.js`).
  3. `shiftMonth`: utilitário matemático puro para avançar/recuar meses (`YYYY-MM`) com delta inteiro sem desvio de timezone (`tests/monthlySeries.test.js`).
  4. `calculateInvoiceBreakdownForMonth`: consolidação rigorosa de parcelas, despesas avulsas e assinaturas para o fechamento/vencimento mensal (`tests/monthlySeries.test.js`).
  5. `calculateMonthlySeries`: série histórica de 6 meses garantindo paridade exata com os KPIs do Dashboard (`tests/monthlySeries.test.js`).
  6. `calculatePersonSpendingBreakdown`: divisão de gastos por pessoa na fatura com algoritmo de Largest Remainder (Hamilton) garantindo soma de 100% exata (`tests/proAnalyticsCharts.test.js`).

---

## 4. Riscos Conhecidos e Pontos de Atenção

1. **Chaves Pro Obsoletas no Config:** `planEntitlements.js` ainda lista 6 chaves de features descontinuadas (ex: `crisisMode`, `executiveSummary`). Não causam qualquer efeito colateral e serão higienizadas em migração controlada futura.
2. **Pessoas Excluídas na Rosca:** Compras associadas a pessoas deletadas anteriormente caem preventivamente no agrupamento "Minhas despesas", garantindo que a soma financeira nunca divirja.
3. **Transições de Tela:** O *PageWaveSweep* foi validado via Playwright e WAAPI/GSAP; a percepção subjetiva de fluidez final deve ser conferida a olho pelo proprietário no teste de fumaça.
4. **Long Tasks na Landing Page:**
   - O carregamento inicial apresenta tarefas longas (~700–850 ms) no primeiro frame.
   - **Diagnóstico:** Trata-se do tempo de parse e compilação inicial do bundle Javascript pelo motor V8, somado à hidratação do React e instanciação do Firebase. A medição em `origin/main` revelou exatamente o mesmo comportamento (828–1145 ms), comprovando que **não houve regressão introduzida pelo redesign**.
   - Na página de `/login`, o carregamento é limpo (apenas 2 tarefas de ~80 ms).
   - O scroll programático rápido na Landing ativa os cálculos do ScrollTrigger; no uso humano real, o scroll é suave e progressivo.

---

## 5. Plano de Rollback

Caso seja identificado qualquer comportamento anômalo pós-deploy, o procedimento de reversão é 100% seguro:

1. **Rollback Imediato de Hosting (Sem tocar no Git):**
   - **Opção A (Firebase Console):** Acessar *Firebase Console > Hosting > Histórico de versões* e clicar em "Reverter" para a versão anterior. A troca entra em vigor em menos de 1 minuto mundialmente.
   - **Opção B (CLI):** Executar `firebase hosting:clone <site-id>:previous <site-id>:live` ou re-publicar o commit anterior de `main`.
2. **Reversão no Repositório Git:**
   - `git checkout main`
   - `git revert -m 1 <MERGE_COMMIT_SHA>`
   - `git push origin main`
3. **Segurança dos Dados:**
   - Nenhuma alteração de schema ou escrita no Firestore foi feita neste release. Os dados em produção são 100% compatíveis tanto com a versão antiga quanto com a nova.
4. **Comportamento de Cache:**
   - O arquivo `index.html` possui header `Cache-Control: no-cache, no-store, must-revalidate`. Qualquer rollback é refletido instantaneamente para novos acessos e recargas.
   - Ícones e assets estáticos utilizam fingerprinting de hash (`/assets/*-[hash].js`), eliminando risco de assets obsoletos.

---

## 6. Checklist de Deploy para o Proprietário

> [!IMPORTANT]
> Siga rigorosamente este roteiro numerado. O release preflight só aprovará após o merge em `main` e o deploy só deve ser executado para o **Hosting**.

1. [ ] **Backup de Segurança:** Confirmar backup recente do Firestore (conforme `docs/disaster-recovery.md`).
2. [ ] **CI Verde no GitHub:** Aguardar todas as checks automatizadas da PR passarem (Lint, Testes Vitest, Build).
3. [ ] **Revisão Visual em Homologação:** Acessar a aplicação com a conta real (apenas para navegação visual, sem lançar dados críticos).
4. [ ] **Merge Manual da PR:** Fazer o merge da PR na branch `main` via GitHub (*Create a merge commit*).
5. [ ] **Puxar `main` Atualizada Localmente:**
   ```powershell
   git checkout main
   git pull origin main
   ```
6. [ ] **Configurar Ambiente Node 22 LTS:**
   - O Release Preflight reprova versões fora do Node 22 (como Node 24).
   - Use o `nvm-windows` para alternar:
     ```powershell
     nvm use 22
     node -v  # Deve retornar v22.x.x
     ```
7. [ ] **Criar Arquivo `.env.production`:**
   - Crie o arquivo `.env.production` localmente a partir de `.env.production.example`.
   - Preencha com os valores reais das credenciais públicas do Firebase Web SDK do projeto `controle-de-cartao` e a chave `VITE_FIREBASE_APPCHECK_SITE_KEY`.
   - > [!CAUTION]
     > NUNCA faça commit de arquivos `.env` ou `.env.production`.
8. [ ] **Instalar Dependências Limpas e Compilar:**
   ```powershell
   npm ci
   npm run build
   ```
9. [ ] **Executar o Release Preflight Operacional:**
   ```powershell
   node scripts/release/preflight.js --expected-head $(git rev-parse HEAD)
   ```
   - Conferir que **TODOS** os gates retornam verde (inclusive `NODE_22`, `HEAD_MATCH`, `ORIGIN_MAIN_MATCH`, `DIST_PRESENT` e `DEMO_FALLBACK_ABSENT`).
   - Conferir que o erro de `"demo-e2e-api-key"` desapareceu graças ao `.env.production`.
10. [ ] **Deploy Exclusivo de Hosting:**
   ```powershell
   firebase deploy --only hosting --project controle-de-cartao
   ```
   > [!CAUTION]
   > NUNCA execute `firebase deploy` sem `--only hosting`. Deploy de rules, functions ou indexes está bloqueado e desnecessário nesta etapa.
11. [ ] **Teste de Fumaça Pós-Deploy:**
   - Carregar a Landing (`/`) e testar o simulador de divisão.
   - Verificar o favicon da aba do navegador.
   - Fazer login na conta real.
   - Navegar pelo Dashboard, verificar KPIs, filtros de cartões, rosca de pessoas e gráfico de evolução.
   - Abrir os seletores próprios (`MonthPicker` e `Select`) e constatar ausência de popups nativos cinzas.
12. [ ] **Aviso aos Usuários:** Publicar comunicado amigável sobre a nova interface.

---

## 7. Comunicação Sugerida aos Usuários

> **O FinControl está de cara nova! ✨**  
>  
> Modernizamos toda a interface do aplicativo para oferecer uma experiência mais elegante, rápida e focada no que realmente importa: o controle das suas faturas, compras parceladas e divisões de despesas.  
>  
> **O que há de novo:**  
> - **Visual Abyss Teal:** Novo tema escuro padrão mais sofisticado e tema claro aprimorado.  
> - **Filtros e Controles Próprios:** Calendários e seletores redesenhados na identidade do app.  
> - **Gráficos e Projeções:** Nova rosca interativa de gastos por pessoa e gráfico de evolução mensal.  
> - **Divisão Precisa:** Relatórios em CSV individuais para prestação de contas com quem divide compras com você.  
> - **Mais Foco:** Removemos ferramentas antigas pouco utilizadas (como Modo Crise e alertas antigos) para deixar o sistema mais rápido e direto ao ponto.  
>  
> Seus cartões, faturas, compras e histórico continuam exatamente onde estavam, com a precisão de sempre. Esperamos que aproveite!
