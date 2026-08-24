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
