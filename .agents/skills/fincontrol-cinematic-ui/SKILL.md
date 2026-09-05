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

### Modo Escuro (Obsidian & Champagne Gold)
- **Background Primário:** `#0D0E11`
- **Background Secundário:** `#13151A`
- **Superfície Card / Stage:** `#1A1D24`
- **Superfície Elevada:** `#222630`
- **Texto Principal:** `#F9FAFB`
- **Texto Secundário:** `#9CA3AF`
- **Acento Primário (Champagne Gold):** `#E5B842`
- **Acento Suave:** `#F5D580`
- **Bordas Translúcidas:** `rgba(255, 255, 255, 0.08)`

### Modo Claro (Warm White & Refined Gold)
- **Background Primário:** `#FAFAF8`
- **Background Secundário:** `#F4F3EF`
- **Superfície Card / Stage:** `#FFFFFF`
- **Superfície Elevada:** `#F7F7F5`
- **Texto Principal:** `#15171B`
- **Texto Secundário:** `#5F6670`
- **Acento Primário (Refined Gold):** `#C99116`
- **Acento Suave:** `#E5B842`
- **Bordas Translúcidas:** `rgba(20, 24, 30, 0.10)`

---

## 3. Arquitetura de Cena em Camadas (Layer Hierarchy)

O palco do Hero não é uma composição estática dividida em duas colunas, mas sim uma **cena tridimensional integrada**:

| Camada | Nome | Descrição & Comportamento |
|---|---|---|
| **Layer 0** | Atmosphere / Background | Vinheta perimetral, radial glow central, grid sutil e linhas de profundidade em SVG. Parallax suave (2-4px). |
| **Layer 1** | Typography / Copy | Headline e subheadline com máscara de reveal na entrada. Deslocamento sutil no scroll. |
| **Layer 2** | Golden Trails / Light Lines | Trajetórias curvas douradas conectando o mascote Fin aos elementos do produto. Parallax intermediário (4-7px). |
| **Layer 3** | Fin (Visual Mascot) | Personagem SVG articulado de 130-160px. Cabeça e olhar reagem ao cursor via `gsap.quickTo`. Celebração comemorativa em pagamentos. |
| **Layer 4** | Living Ledger & Stack Layers | Card principal com duas camadas falsas em pilha (`stack-layer-1` e `stack-layer-2`) ao fundo. 3D tilt responsivo (até 3deg) e reflexo luminoso na superfície. |
| **Layer 5** | Floating Product Proof | Chips flutuantes com ícones e microcopy factual (*Gaste junto*, *Dados protegidos*, *Amigos e viagens*) com profundidade parallax (7-12px). |
| **Layer 6** | Cursor Aura (Spotlight) | Aura luminosa sutil (250-320px) seguindo o cursor com `gsap.quickTo`. Baixa opacidade. Zero alteração do cursor nativo do SO. |

---

## 4. Diretrizes do Sistema de Motion com GSAP

1. **Zero Continuous Idle RAF Loop:** Proibido manter `requestAnimationFrame` rodando em loop permanente quando não há interação do usuário.
2. **Interpolações com `gsap.quickTo()`:** Para pointer tracking, utilizar setters de alta performance vinculados ao evento `pointermove` com throttle/dampening natural.
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
5. **Touch & Mobile:** Em dispositivos com `pointer: coarse`, desabilitar o tracking contínuo do mouse para economizar processamento e bateria.
6. **Prefers-Reduced-Motion:** Respeitar integralmente `prefers-reduced-motion: reduce`, desabilitando transformações tridimensionais, flutuações e parallaxes contínuos.

---

## 5. Mascote da Marca — Fin

- **Papel:** `BRAND_VISUAL_ASSISTANT`. Elemento de marca, guia contextual e apoio narrativo.
- **Proibições:** Não deve simular chatbot, conselheiro financeiro, inteligência artificial autônoma ou feature paga.
- **Expressões:**
  - `IDLE`: Flutuação suave e calma.
  - `LOOK_AT_CURSOR`: Cabeça e pupilas acompanham sutilmente a posição do ponteiro no Hero.
  - `CELEBRATE_PAYMENT`: Micro-inclinação, ampliação momentânea do halo dourado e spark sutil quando um recebível é quitado.
- **Speech Bubble:** Balão flutuante compacto e discreto com mensagem factual (*"Acompanhe sua fatura organizada! ✨"* ou *"Cada centavo no lugar certo."*), posicionado para nunca sobrepor valores financeiros ou títulos.

---

## 6. Referências de Inspiração

- **Originkit:** Padrões de fluid trails, reactive lines, interactive grid e magnetic hover.
- **Skiper UI / Cult UI:** Componentes de micro-interações elegantes e expandable card primitives.
- **GetLayers / Curated.design / 60fps.design:** Composição cinematográfica, hierarquia de profundidade 3D em fintechs e timing refinado de transições.
- **Lamp Login Concept:** Iluminação como elemento vivo de interface que responde à proximidade do usuário.
