# FinControl — Constituição de Engenharia

Este documento define os princípios fundamentais e permanentes que regem o desenvolvimento, manutenção e evolução do FinControl.

---

## Princípios Constitucionais do FinControl

1. **FinControl está em produção:** Existem clientes ativos e movimentações financeiras reais. Qualquer alteração deve respeitar a estabilidade do sistema.
2. **Preservação de dados é prioridade absoluta:** Nunca realizar alterações destrutivas de schema no Firestore sem compatibilidade retroativa.
3. **Segurança antes de conveniência:** A segurança reside em `firestore.rules` e `functions/index.js`, nunca confiando no frontend.
4. **Integridade financeira antes de estética:** Centavos inteiros, soma exata de parcelas (zero drift) e validação matemática são inegociáveis.
5. **Não confiar no frontend para autorização:** Nenhuma atribuição de plano ou leitura cruzada de usuários é confiada a chamadas do cliente.
6. **Não alterar schema sem estratégia:** Toda evolução de modelo de documento deve ser incremental e segura.
7. **Não instalar dependências sem necessidade:** Manter o bundle enxuto e evitar vulnerabilidades de terceiros.
8. **Não introduzir breaking changes silenciosamente:** Toda mudança de contrato de API ou serviço deve ser validada.
9. **Não duplicar lógica financeira:** Cálculos monetários e parcelamentos pertencem exclusivamente a `src/services/financialService.js`.
10. **Preferir mudanças pequenas e verificáveis:** Trabalhar sempre em lotes controlados com commits e diffs limpos.
11. **Testar mudanças financeiras:** Toda alteração de cálculo exige teste correspondente em `tests/financialService.test.js`.
12. **Medir mudanças de performance:** Medir bundle e tempo de render antes e depois de alterações.
13. **Reutilizar componentes antes de criar novos:** Fortalecer o Design System existente (*Carbon Black & Gold*).
14. **Não transformar o projeto em overengineering:** Manter a stack simples (React, Vite, Tailwind, Firebase). Não adicionar Redux, CQRS ou padrões desnecessários.
15. **Executar validações após mudanças significativas:** Sempre validar o ciclo `npm test` -> `npm run lint` -> `npm run build`.
16. **Product Proof antes de Social Proof (Tolerância Zero para Métricas Falsas):** Proibido criar ou exibir prova social fictícia (avaliações falsas, contagem de usuários inflada, 4.9/5, 50 mil+, depoimentos fictícios, "100% seguro", "100% privado", empresas/clientes fictícios, selos ou prêmios não comprovados). Toda comunicação deve basear-se exclusivamente em Product Proof factual (precisão em centavos, compras compartilhadas, controle de faturas, parcelas e assinaturas organizadas, sem conexão bancária necessária, dados registrados no FinControl, acesso autenticado). Válido para Landing, Auth, Dashboard, Marketing, SEO e Social Preview.

---

## Especialidades Principais (Skills)
As diretrizes operacionais detalhadas estão organizadas nas 8 Skills em `.agents/skills/`:
- `security-engineer`
- `financial-domain`
- `ux-accessibility`
- `qa-test-engineer`
- `performance-engineer`
- `sre-observability`
- `firestore-architect`
- `code-review-refactoring`
