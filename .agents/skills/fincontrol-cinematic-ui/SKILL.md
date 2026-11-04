---
name: fincontrol-cinematic-ui
description: Especialidade em design cinematográfico, motion systems com GSAP, profundidade em camadas, iluminação e micro-interações do FinControl.
---

# FinControl Cinematic UI — Diretrizes de Engenharia Visual

Esta skill documenta a linguagem de design visual cinematográfica, composição em camadas e o sistema de motion responsivo do FinControl.

---

## 1. Princípios de Design

- **DESIGN_PRINCIPLE:** *Premium financial software, not generic admin dashboard*.
- **MOTION_PRINCIPLE:** *Alive, layered, responsive, purposeful*.
- **PRODUCT_PROOF_ONLY:** Toda comunicação visual e textual apoia-se em fatos matemáticos e operacionais comprováveis. Proibida qualquer métrica ou prova social fictícia (`NO_FAKE_SOCIAL_PROOF=true`).
- **ACCESSIBILITY_FIRST:** Total conformidade com `prefers-reduced-motion: reduce`, touch targets >= 44px e navegação via teclado.

---

## 2. Paletas de Cores & Tokens de Tema

> [!NOTE]
> A identidade visual principal do FinControl (App, Dashboard, Auth e Primitivas) adota a paleta **Abyss Teal** com o tema escuro como padrão desde o primeiro paint. A **Landing Page** permanece temporariamente em *Champagne Gold* por isolamento estético até a **Fase 6** do redesign.

### Modo Escuro — Padrão do Sistema (Abyss Teal)
- **Background Primário (`--fc-bg`):** `#04171F`
- **Background Sutil (`--fc-bg-subtle`):** `#061D26`
- **Superfície 1 (`--fc-surface-1`):** `#0A222B`
- **Superfície 2 (`--fc-surface-2`):** `#0E2B35`
- **Superfície 3 (`--fc-surface-3`):** `#133641`
- **Texto Principal (`--fc-text-primary`):** `#EAF7F7`
- **Texto Secundário (`--fc-text-secondary`):** `#A9C4C7`
- **Texto Muted (`--fc-text-muted`):** `#7E9FA3`
- **Texto Inverso (`--fc-text-inverse`):** `#04171F`
- **Acento Primário Aqua (`--fc-accent`):** `#5CCCCC`
- **Acento Hover (`--fc-accent-hover`):** `#7FE0DC`
- **Acento Soft (`--fc-accent-soft`):** `rgba(92, 204, 204, 0.14)`
- **Acento Contraste (`--fc-accent-contrast`):** `#04171F`
- **Glow Frio (`--fc-glow-cool`):** `rgba(92, 204, 204, 0.16)`
- **Glow Quente Ambiente (`--fc-glow-warm`):** `rgba(214, 150, 80, 0.12)`
- **Bordas Translúcidas:** `rgba(140, 220, 225, 0.07)` (sutil) / `rgba(140, 220, 225, 0.12)` (default) / `rgba(140, 220, 225, 0.24)` (forte)

### Modo Claro — Opção Alternativa (Crisp Teal)
- **Background Primário (`--fc-bg`):** `#E6F4F7`
- **Background Sutil (`--fc-bg-subtle`):** `#EEF8FA`
- **Superfície 1 (`--fc-surface-1`):** `#F8FDFE`
- **Superfície 2 (`--fc-surface-2`):** `#E9F6F8`
- **Superfície 3 (`--fc-surface-3`):** `#D4EBF0`
- **Texto Principal (`--fc-text-primary`):** `#0B2530`
- **Texto Secundário (`--fc-text-secondary`):** `#2F5560`
- **Texto Muted (`--fc-text-muted`):** `#4C6F78`
- **Texto Inverso (`--fc-text-inverse`):** `#FFFFFF`
- **Acento Primário Deep Teal (`--fc-accent`):** `#047C84`
- **Acento Hover (`--fc-accent-hover`):** `#036A71`
- **Acento Soft (`--fc-accent-soft`):** `rgba(4, 124, 132, 0.10)`
- **Acento Contraste (`--fc-accent-contrast`):** `#FFFFFF`
- **Glow Frio (`--fc-glow-cool`):** `rgba(4, 124, 132, 0.10)`
- **Glow Quente Ambiente (`--fc-glow-warm`):** `rgba(246, 190, 120, 0.30)`
- **Bordas Translúcidas:** `rgba(8, 60, 72, 0.08)` (sutil) / `rgba(8, 60, 72, 0.14)` (default) / `rgba(8, 60, 72, 0.26)` (forte)

|---|---|---|
| **Layer 0** | Atmosphere / Deep Background | Vinheta perimetral escura, radial glow difuso, grid sutil e linhas de profundidade em SVG. Parallax sutil (1-2px) via `gsap.quickTo`. |
| **Layer 1** | Typography / Headline & CTA | Headline, subheadline e botões com entrada escalonada fluida (stagger). Deslocamento sutil no scroll. |
| **Layer 2** | Structural Light & Haze | Haze luminoso difuso posicionado atrás do produto e linhas estruturais vetoriais. Parallax intermediário (2-4px). |
| **Layer 3** | Living Ledger Stage | Card principal com multi-plano financeiro, backplate translúcido e prévia do próximo ciclo. 3D tilt responsivo suave e reflexo luminoso (sheen). |
| **Layer 4** | Product Proof Chips | Chips flutuantes factuais de resolução de dívidas compartilhadas e cálculo matemático exato com micro-parallax (6-9px). |
| **Layer 5** | Cursor Aura (Spotlight) | Aura luminosa sutil (320px) em Champagne Gold seguindo o ponteiro do mouse diretamente via `gsap.quickTo`. Desativada em touch/coarse. |

---

## 4. Diretrizes do Sistema de Motion com GSAP

1. **Zero Continuous Idle RAF Loop:** Proibido manter `requestAnimationFrame` rodando em loop permanente quando não há interação do usuário.
2. **Interpolações com `gsap.quickTo()`:** Para pointer tracking, utilizar setters diretos de alta performance vinculados ao evento `pointermove`, sem re-renderização de estado React a cada movimento.
3. **React Context Cleanup:** Todas as instâncias, timelines e tweens devem ser criadas dentro de `gsap.context()` e limpas no retorno do `useEffect`:
   ```javascript
   useEffect(() => {
     const ctx = gsap.context(() => {
       // animações e quickTo
     }, containerRef);
     return () => ctx.revert();
   }, []);
   ```
4. **ScrollTrigger:** Para animações associadas ao scroll, garantir scroll nativo (sem bibliotecas invasivas como Lenis) e efetuar o cleanup automático no unmount.
5. **Touch & Mobile:** Em dispositivos com `pointer: coarse`, desabilitar o tracking contínuo do ponteiro para economizar processamento e bateria.
6. **Prefers-Reduced-Motion:** Respeitar integralmente `prefers-reduced-motion: reduce`, desabilitando transformações tridimensionais, flutuações e parallaxes contínuos.

---

## 5. Mascote da Marca — Fin (Governança & Escopo)

- **STATUS NA LANDING:** `LANDING_FIN=false`.
  - Fin **NÃO** faz parte da Landing Page oficial.
  - **NÃO** usar Fin no Hero.
  - **NÃO** usar eye tracking do Fin na Landing.
  - **NÃO** usar speech bubble do Fin na Landing.
  - **NÃO** reintroduzir o mascote na Landing sem nova aprovação explícita do owner.
- **Escopo Futuro Autorizado:**
  - Onboarding de novos usuários no produto.
  - Empty states em telas internas do app.
  - Ajuda contextual (*contextual help*) em módulos internos.
- **Papel Geral:** `BRAND_VISUAL_ASSISTANT`. Elemento de guia e apoio narrativo em módulos internos. Nunca deve simular chatbot, inteligência artificial autônoma ou feature paga.

---

## 6. Referências de Inspiração

- **Originkit:** Padrões de fluid trails, reactive lines, interactive grid e magnetic hover.
- **Skiper UI / Cult UI:** Componentes de micro-interações elegantes e expandable card primitives.
- **GetLayers / Curated.design / 60fps.design:** Composição cinematográfica, hierarquia de profundidade 3D em fintechs e timing refinado de transições.
- **Lamp Login Concept:** Iluminação como elemento vivo de interface que responde à proximidade do usuário.
