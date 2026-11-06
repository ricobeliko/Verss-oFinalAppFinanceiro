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
| **Modo Crise** | Aba/Modal lateral de emergência financeira | Sim (apenas lia despesas e cartões em runtime) | Gestão normal de parcelas e cartões no Dashboard e Faturas. |
| **Resumo Executivo** | Modal acessível pelo Dashboard | Sim (não gravava dados; apenas compilava métricas) | Novos KPIs do Dashboard e Gráfico de Evolução Mensal. |
| **Alertas & Notificações** | Sininho e banner de notificações no Dashboard | Sim (`notificationSettings` preservado no documento do usuário) | Indicadores visuais diretos nos cartões e status de faturas. |
| **Metas de Orçamento por Categoria** | Widget e Modal no Dashboard | Sim (objeto `budgets` no documento do usuário preservado intacto) | Visualização de Gastos por Pessoa na fatura e no Dashboard. |
| **Auditoria Relâmpago / Insights Determinísticos** | Widget informativo no Dashboard | Sim (processamento puramente em memória) | KPIs analíticos e visão unificada de faturas. |
| **Total Receitas / Balanço Geral no Dashboard** | Cards superiores de receita e saldo | Sim (coleção `incomes` e aba Movimentações intactas) | Aba "Movimentações" dedicada a receitas e despesas avulsas. |
| **Exportação CSV Geral no Dashboard** | Botão de exportar no topo do Dashboard | Sim (lançamentos preservados) | Exportação CSV individual e anual na aba "Pessoas". |

> [!NOTE]
> **Garantia de Preservação de Dados:** Nenhuma rotina de exclusão ou migração destrutiva foi executada no Firestore. Os schemas de usuário, cartões, compras e transações continuam 100% retrocompatíveis.

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
> Siga rigorosamente este roteiro numerado. O deploy só deve ser executado para o **Hosting**.

1. [ ] **Backup de Segurança:** Confirmar backup recente do Firestore (conforme `docs/disaster-recovery.md`).
2. [ ] **CI Verde no GitHub:** Aguardar todas as checks automatizadas da PR passarem (Lint, Testes Vitest, Build).
3. [ ] **Revisão Visual em Homologação:** Acessar a aplicação com a conta real (apenas para navegação visual, sem lançar dados críticos).
4. [ ] **Merge Manual da PR:** Fazer o merge da PR na branch `main` via GitHub (Create a merge commit).
5. [ ] **Puxar `main` Atualizada Localmente:**
   ```powershell
   git checkout main
   git pull origin main
   ```
6. [ ] **Conferir Variáveis de Ambiente de Produção:**
   - Verificar se o arquivo `.env.production` local existe e contém `VITE_FIREBASE_APPCHECK_SITE_KEY` e demais chaves `VITE_FIREBASE_*` preenchidas.
7. [ ] **Executar o Preflight Operacional:**
   ```powershell
   npm ci
   npm run build
   node scripts/release/preflight.js --expected-head $(git rev-parse HEAD)
   ```
   *(Todos os gates operacionais devem retornar verde).*
8. [ ] **Deploy Exclusivo de Hosting:**
   ```powershell
   firebase deploy --only hosting --project controle-de-cartao
   ```
   > [!CAUTION]
   > NUNCA execute `firebase deploy` sem `--only hosting`. Deploy de rules, functions ou indexes está restrito e desnecessário nesta etapa.
9. [ ] **Teste de Fumaça Pós-Deploy:**
   - Carregar a Landing (`/`) e testar o simulador de divisão.
   - Verificar o favicon da aba do navegador.
   - Fazer login na conta real.
   - Navegar pelo Dashboard, verificar KPIs, filtros de cartões, rosca de pessoas e gráfico de evolução.
   - Abrir os seletores próprios (`MonthPicker` e `Select`) e constatar ausência de popups nativos cinzas.
10. [ ] **Aviso aos Usuários:** Publicar comunicado amigável sobre a nova interface.

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
