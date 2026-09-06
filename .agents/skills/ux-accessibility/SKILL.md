---
name: ux-accessibility
description: Especialidade em UX, UI, Design System Carbon Black & Gold e acessibilidade web (A11y/WCAG) no FinControl.
---

# UX & Accessibility Specialist — FinControl

## Missão
Assegurar uma experiência de usuário premium, fluida, intuitiva e acessível para todos os clientes do FinControl, preservando rigorosamente a identidade visual e ergonomia.

## Identidade Visual e Design System
- **Tema Base:** *Carbon Black & Gold* (`bg-carbon-900`, `text-gold`, `text-gold-cream`, `border-carbon-800`, gradientes dourados).
- **Tipografia:** Moderna e legível (Inter / Roboto).
- **Componentes Centrais:**
  - Modais: Backdrop escuro com desfoque (`bg-black/80 backdrop-blur-md`), cantos arredondados (`rounded-3xl`), sombra profunda (`shadow-2xl`).
  - Cards: Efeito visual sutil de cartão de crédito e painéis de dados.
  - Tabelas e Listas: Altamente responsivas, com estados claros de loading (`Spinner`) e empty states descritivos.

## Diretrizes de Acessibilidade (A11y)
1. **Semântica e Modais:**
   - Todo diálogo/modal deve ter `role="dialog"`, `aria-modal="true"`, e ser referenciado por `aria-labelledby`.
2. **Botões com Apenas Ícone:**
   - Qualquer `<button>` que contenha apenas SVG ou ícone deve conter obrigatoriamente `aria-label` descritivo (ex: `aria-label="Editar compra XYZ"` ou `aria-label="Excluir cartão"`).
3. **Formulários e Inputs:**
   - Garantir associação explícita entre `<label htmlFor="id">` e `<input id="id">`.
   - Feedback de validação com contraste adequado (mensagens de erro em `text-rose-400`).
4. **Navegação por Teclado e Foco:**
   - Elementos interativos devem ser acessíveis via Tab e possuir estados visíveis de foco (`focus:ring-2 focus:ring-gold/50`).

## Diretrizes de Conteúdo e Marketing (Product Proof > Social Proof)
- **Proibição Estrita de Métricas e Prova Social Fictícia:**
  - `NO_FAKE_SOCIAL_PROOF=true`
  - `NO_FAKE_REVIEWS=true`
  - `NO_FAKE_USER_COUNTS=true`
  - `NO_FAKE_TESTIMONIALS=true`
  - `NO_FAKE_SECURITY_CLAIMS=true`
- **Itens terminantemente proibidos em Landing, Auth, Dashboard, Marketing, SEO e Social Previews:**
  - Notas ou estrelas fictícias (ex: `4,9/5`, `4.9/5`, avaliações médias inventadas);
  - Contagem de usuários inflada (ex: `50 mil+`, `milhares de clientes`);
  - Expressões como `usuários confiando`, `empresas que usam`;
  - Declarações absolutas de segurança desprovidas de comprovação técnica (ex: `100% seguro`, `100% privado`, `criptografia militar`);
  - Depoimentos ou clientes fictícios;
  - Selos de segurança ou prêmios não comprovados.
- **Product Proof Factual Permitido:**
  - Precisão matemática em centavos inteiros;
  - Compras compartilhadas e divisão por participante;
  - Controle e consolidação de faturas antes do fechamento;
  - Parcelas e assinaturas organizadas;
  - Sem conexão bancária necessária;
  - Dados registrados no FinControl;
  - Acesso autenticado e isolamento estrito por usuário.
