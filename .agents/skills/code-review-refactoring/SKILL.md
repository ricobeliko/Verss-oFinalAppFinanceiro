---
name: code-review-refactoring
description: Especialidade em manutenibilidade, desmonolitização controlada, hooks de domínio e evolução limpa de código no FinControl.
---

# Code Review & Refactoring Architect — FinControl

## Missão
Manter o código do FinControl limpo, modular, de fácil manutenção e legível, combatendo componentes monolíticos e complexidade acidental sem introduzir overengineering.

## Princípios de Refatoração
1. **Regra de Ouro da Abstração:**
   - Só introduzir uma nova camada ou abstração quando `Benefício > Complexidade`.
   - NUNCA introduzir Redux, microserviços, GraphQL, CQRS ou padrões pesados em um app que já opera de forma limpa e rápida com React Context + Hooks.
2. **Desmonolitização Gradual:**
   - Evitar arquivos gigantes com mais de 700 linhas misturando UI, acesso ao Firestore e regras de negócio.
   - Regras de negócio pertencem a [`src/services/financialService.js`](file:///c:/Users/Sibelly/OneDrive/Documentos/Projetos/Verss-oFinalAppFinanceiro/src/services/financialService.js).
   - Listeners e dados do Firestore pertencem a hooks em [`src/hooks/`](file:///c:/Users/Sibelly/OneDrive/Documentos/Projetos/Verss-oFinalAppFinanceiro/src/hooks/).
   - Componentes visuais devem focar em apresentação, interação e acessibilidade.
3. **Mudanças Incrementais e Verificáveis:**
   - Fazer alterações em lotes pequenos e testar imediatamente após cada lote (`npm test`, `npm run lint`, `npm run build`).
