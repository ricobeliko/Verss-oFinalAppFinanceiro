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

---

## 7. Atmosfera do Dashboard (Living Background & Glass Shell)

A experiência interna do FinControl emprega um **fundo vivo em camadas cinemáticas** e um shell translúcido em vidro, criando profundidade atmosférica sem comprometer a leitura ou a performance.

### Localização & Integração
- **Componente:** [`src/features/dashboard/shell/LivingBackground.jsx`](file:///c:/Users/CyberLiko/projects/app-financeiro/src/features/dashboard/shell/LivingBackground.jsx).
- **Ponto de Injeção:** Renderizado em [`DashboardLayout.jsx`](file:///c:/Users/CyberLiko/projects/app-financeiro/src/features/dashboard/DashboardLayout.jsx) como camada absoluta fixa (`fixed inset-0 z-0 pointer-events-none`) atrás do layout e do canvas principal.

### Arquitetura das 5 Camadas
1. **Camada 1 — Base & Vinheta:** Fundo sólido do tema (`--fc-bg`) com gradiente radial de vinheta perimetral (`--fc-atmos-vignette`) para foco central.
2. **Camada 2 — Glow Quente Ambiente (Top-Right):** Radial grande difuso (`--fc-glow-warm`) no canto superior direito com micro-parallax elástico inverso de até ±10px via `gsap.quickTo`.
3. **Camada 3 — Glow Frio Difuso:** Radial difuso (`--fc-glow-cool`) no topo esquerdo e elipse suave na base inferior.
4. **Camada 4 — Ondas Periódicas no Rodapé:** 3 camadas SVG periódicas com curvas cúbicas suaves, stroke fino (`--fc-wave-1`, `--fc-wave-2`, `--fc-wave-3`) e preenchimento vertical sutil (`--fc-wave-fill`). Repetição periódica calculada para loop sem emenda (`translateX(-50%)`) com durações de 70s, 95s e 120s alternadas. Borda superior esmaecida via `mask-image`.
5. **Camada 5 — Aura do Cursor:** Círculo radial de 360px com `--fc-glow-cool` que segue o ponteiro com amortecimento elástico (`gsap.quickTo` duração 0.6s, `power3.out`), desvanecendo para opacidade 0 ao sair da janela.

### Shell & Cards em Vidro (Glass Surface)
- **Topbar & Sidebar (`.fc-glass-shell`):** Fundo translúcido com token (`color-mix(in srgb, var(--fc-bg-subtle) 75%, transparent)`), `backdrop-filter: blur(12px)` e borda `var(--fc-border-subtle)`. Suporte a fallback sólido para navegadores sem backdrop-filter.
- **Cards do Dashboard (`.fc-glass-card`):** Leve translucidez com token (`color-mix(in srgb, var(--fc-surface-1) 85%, transparent)`) e borda `var(--fc-border-default)`, **sem blur** para prevenir sobrecarga de renderização na GPU.
- **Modais e Popovers:** Permanecem 100% opacos para isolamento cognitivo e máximo contraste em ações críticas.

### Regras de Desativação e Acessibilidade (A11y & Motion Safety)
- **`prefers-reduced-motion: reduce`:** O hook `usePrefersReducedMotion` desativa imediatamente o GSAP, os listeners de ponteiro e o tracking da aura. No CSS, as animações de onda são canceladas (`animation: none !important`).
- **Touch / Mobile (`pointer: coarse` ou tela < 768px):** Aura e parallax desativados para economia de bateria e processamento; ondas permanecem estáticas.
- **Acessibilidade:** O container possui `aria-hidden="true"`, `pointer-events-none` e zero elementos focáveis ou anunciáveis por leitores de tela.


---

## 8. Motion de Página (Page Transitions, Stagger & Skeletons)

A experiência de navegação do FinControl é fluida, escalonada e orquestrada para garantir transições suaves entre telas, sem piscar de listas vazias e sem deixar elementos invisíveis.

### Arquitetura de Componentes & Hooks
1. **`useEnterStagger(scopeRef, { ready, maxItems })`:**
   - **Propósito:** Entrada escalonada de elementos na tela após o término do carregamento (`ready: !isLoading`).
   - **Hierarquia:** Anima primeiro `data-enter="title"` (y: 14px, 0.5s) e, com overlap de 0.25s, anima em cascata os blocos `data-enter="item"` (y: 18px, 0.55s, stagger: 0.07s).
   - **Limites de Itens:** Para proteger os 60fps em dispositivos de baixo custo, limita no máximo a 8 itens no desktop e 5 no mobile.
   - **Container-level:** Longas tabelas e listas possuem o atributo `data-enter="item"` no elemento container (wrapper da tabela), jamais em cada linha individual.

2. **`PageWaveSweep` (Shell):**
   - **Propósito:** Cortina líquida translúcida de onda que varre a tela de baixo para cima (`y: 100% -> 0% -> -100%`) em ~0.6s durante a troca de abas no dashboard.
   - **Pico (`onPeak`):** No momento em que a onda atinge o meio da tela cobrindo o conteúdo (`y = 0%`), dispara a troca de `activePage`, zera o scroll da área de conteúdo (`scrollTop = 0`) e anuncia a nova tela via leitor de tela.
   - **Interrupção:** Cliques rápidos em outras abas matam imediatamente a timeline anterior via `kill()` e reiniciam o ciclo sem acúmulo de fila.
   - **Acessibilidade & Mobile:** Sob `prefers-reduced-motion: reduce` ou largura de tela `< 768px`, a transição é executada de forma síncrona e instantânea, sem disparar a timeline GSAP.

3. **`Skeleton` e `SkeletonPage`:**
   - **Propósito:** Feedback visual imediato durante o carregamento de dados em hooks do Firestore.
   - **Variantes:** `block`, `text`, `circle`, `card` e a composição de tela cheia `SkeletonPage`.
   - **Acessibilidade:** `SkeletonPage` possui `role="status"`, `aria-busy="true"` e texto acessível oculto ("Carregando dados da tela..."), com zero elementos interativos focáveis.
   - **Efeito Shimmer:** Animação CSS suave de 1.4s através do token `@keyframes fcShimmer`, desativada sob `prefers-reduced-motion`.

### Tempos Canônicos & Eases (`src/design-system/motion.js`)
- `title`: `y: 14px`, `duration: 0.5s`, `ease: 'power3.out'`
- `item`: `y: 18px`, `duration: 0.55s`, `ease: 'power3.out'`, `stagger: 0.07s`, `overlap: 0.25s`
- `pageExit`: `y: -6px`, `duration: 0.14s`, `ease: 'power2.in'`
- `waveSweep`: `duration: 0.6s`, `maxOpacity: 0.35`, `maxTotalDuration: 0.65s`
- `shimmer`: `duration: 1.4s`

### Padrão Inviolável de Segurança Visual (Visual Safety)
- **Zero Opacity Residual:** É estritamente proibido que qualquer elemento termine uma animação ou seja desmontado com `opacity: 0` inline ou `transform` resídual.
- **`clearProps` Obrigatório:** Toda timeline GSAP (de entrada ou de saída) e blocos `try/catch` devem invocar `gsap.set(el, { clearProps: 'transform,opacity' })` ao final.
- **Zero Permanent `will-change`:** Propriedades de otimização de renderização (`will-change: transform`) são desativadas ou removidas no repouso para evitar consumo desnecessário de memória de textura na GPU.
- **Anúncio de Tela (A11y):** Região `aria-live="polite"` (`aria-atomic="true"` e `.sr-only`) presente no shell do dashboard que anuncia "Navegou para [Nome da Aba]" a cada troca concluída.
