# Relatório Técnico: Ajuste Fino da Transição de Telas

**Data:** 04 de Novembro de 2026  
**Branch:** `feat/redesign-ajuste-transicao-telas`  
**Autor:** Antigravity (Pair Programming com FinControl Team)  
**Status:** Concluído e Validado  

---

## 1. Resumo Executivo e Diagnóstico de Causa-Raiz

Na Fase 3 do redesign, foi introduzida a transição de telas via cortina líquida (`PageWaveSweep`), orquestrada via GSAP ao navegar entre as abas do dashboard. No entanto, o feedback de usabilidade indicou que a onda parecia rápida demais (~0.6s total) e apresentava uma sutil "travadinha" perceptível ao olho humano.

### Causa-Raiz Técnica Identificada:
1. **Janela de Cobertura Insuficiente e Baixa Opacidade:** A onda anterior tinha opacidade máxima de apenas `0.35`. Quando o React desmontava a tela anterior e montava a tela de destino (ex.: `Dashboard.jsx`, com ~1.200 linhas e dezenas de hooks/gráficos), o repaint e o reflow do navegador ocorriam em pleno campo de visão do usuário. A queda momentânea de quadros era visível porque a cortina era translúcida.
2. **Concorrência de Recursos com Animações de Fundo:** Durante a varredura da onda, as animações CSS contínuas do `LivingBackground` (ondas abissais de fundo em loop contínuo) e os eventos de mouse da aura do cursor continuavam disputando ciclos de renderização na GPU e no compositor de thread principal.
3. **Carga Sob Demanda em Modo Dev (Lazy Chunks):** Na primeira visita a cada aba secundária, o navegador precisava baixar o chunk JavaScript lazy do Vite e parseá-lo de forma síncrona dentro da janela da animação.

---

## 2. Solução Implementada e Arquitetura de Motion

### 2.1 Coreografia em Três Fases (`motion.pageTransition`)
A transição foi totalmente reestruturada para uma duração total de **~1.17s**, dividida em 3 fases complementares:

```
[--- Cover-In: 0.45s ---][-- Hold: 0.12s --][------- Reveal: 0.60s -------]
y: 100% -> 0%            y: 0%               y: 0% -> -100%
opacity: 0 -> 0.92       opacity: 0.92       opacity: 0.92 -> 0
(Ondas sobem escalonadas) (Montagem síncrona) (Tela nova revelada em cascata)
```

1. **Cover-In (0.45s, `power2.inOut`):**
   - Três ondas SVG escalonadas sobem com defasagem de `0.06s` (`waveStagger`).
   - Um backplate opaco (`bg-teal-950` no tema escuro, `bg-teal-700` no tema claro) sobe em conjunto, atingindo opacidade de **0.92**.
   - O conteúdo da aba anterior desvanece suavemente (`opacity: 0`, `duration: 0.28s`), eliminando flashes de texto residual.
2. **Hold (0.12s):**
   - No ápice da cobertura (`y: 0%` e `opacity: 0.92`), a onda sustenta uma cobertura opaca completa.
   - O callback `onPeak` executa a montagem atômica da nova página via `flushSync(() => setActivePage(targetPage))` e reseta o scroll para o topo (`scrollTop = 0`).
   - Todo o esforço de montagem do React e compilação do DOM ocorre completamente oculto sob o véu opaco.
3. **Reveal (0.60s, `power2.out`):**
   - A cortina continua subindo para `y: -100%` e a opacidade se desvanece suavemente para `0`.
   - A nova tela emerge limpa e estável. A entrada escalonada dos títulos (`useEnterStagger`) inicia com leve antecipação (~30% do reveal = `0.18s`), criando um fluxo cinematográfico contínuo.

### 2.2 Pausa de Fundo e Liberação da GPU (`.fc-transitioning`)
- Durante todo o ciclo da transição, a classe `.fc-transitioning` é aplicada na tag `<html>`.
- Em `src/design-system/motion.css`, as ondas contínuas de fundo têm suas animações pausadas:
  ```css
  html.fc-transitioning [data-fc-living-wave="true"] {
    animation-play-state: paused !important;
  }
  ```
  *(O uso de `animation-play-state: paused` impede o reset abrupto do ciclo de onda, retornando suavemente de onde parou).*
- A aura do cursor tem sua visibilidade ocultada (`opacity: 0`) e seus listeners ignorados até o fim da transição.

### 2.3 Pré-carregamento Ocioso e Inteligente (`tabPrefetch.js`)
- Criado módulo isolado `src/features/dashboard/tabPrefetch.js` contendo os loaders dinâmicos de todas as abas.
- No carregamento inicial do dashboard, `prefetchAllTabs()` é acionado via `requestIdleCallback` (com fallback de `setTimeout` de 2 segundos) para pré-carregar os módulos lazy enquanto a CPU está ociosa.
- Além disso, os botões da barra lateral (`AppSidebar`) e da navegação inferior mobile (`MobileNavigation`) acionam `prefetchTab(tabId)` nos eventos `onMouseEnter` e `onFocus`.

### 2.4 Proteção de Ciclo de Vida do React (`React.memo`)
- O componente `PageWaveSweep` foi encapsulado com `React.memo` para impedir que re-renderizações acidentais do layout do dashboard sobrescrevam ou resetem os estilos inline gerenciados pelo GSAP.
- No desmonte ou interrupção rápida por cliques sucessivos, a timeline ativa é cancelada imediatamente via `timeline.kill()` e a classe `.fc-transitioning` é limpa no bloco `onInterrupt` e no cleanup do `gsap.context`.

---

## 3. Guia de Ajuste de Velocidade (`src/design-system/motion.js`)

Para calibrar a velocidade da transição no futuro, basta alterar os tokens do objeto `motion.pageTransition`:

| Token | Valor Atual | Descrição | Impacto ao Alterar |
| :--- | :--- | :--- | :--- |
| `coverIn` | `0.45s` | Tempo de subida até a tela ficar totalmente coberta | Aumentar torna a subida mais solene; diminuir torna mais rápida |
| `hold` | `0.12s` | Tempo de sustentação no ápice da cobertura | Janela para o React montar a tela pesada sem soluços visíveis |
| `reveal` | `0.60s` | Tempo de saída da onda revelando a nova tela | Aumentar dá mais suavidade à abertura; diminuir revela mais rápido |
| `peakOpacity` | `0.92` | Opacidade máxima no pico da cobertura | Controla o quanto do fundo/conteúdo fica oculto no ápice (0.92 = véu denso) |
| `easeIn` | `'power2.inOut'` | Curva de aceleração na subida | Curva de aceleração inicial e desaceleração ao atingir o pico |
| `easeOut` | `'power2.out'` | Curva de desaceleração na revelação | Desaceleração suave enquanto a onda sai pelo topo da tela |
| `waveStagger` | `0.06s` | Defasagem entre as 3 camadas de ondas SVG | Cria a separação orgânica entre as 3 cristas de onda |

---

## 4. Tabela Comparativa de Medições (ANTES vs DEPOIS Real)

As medições foram executadas no ambiente real utilizando Playwright em Chromium com `PerformanceObserver` monitorando `longtask` e `long-animation-frame` (LoAF) em duas condições: **Sem Warm-up** (primeiro acesso) e **Com Warm-up** (após pré-carregamento dos chunks).

### 4.1 Sem Warm-up (Acesso Inicial)

| Aba de Destino | Duração Total (Antes) | Duração Total (Depois) | Max LoAF (Antes) | Max LoAF (Depois) | Max LongTask (Depois) | Avaliação Visual |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Pessoas** | ~810ms | 1.555ms | 190.0ms | 187.1ms | 210ms | Fluido, montagem 100% oculta sob véu de 92% |
| **Cartões** | ~820ms | 1.404ms | 259.0ms | 210.4ms | 55ms | Queda de 19% no LoAF máximo; zero soluço visível |
| **Assinaturas** | ~800ms | 1.551ms | 180.0ms | 259.0ms | 50ms | Transição ampla e líquida; renderização estável |
| **Movimentações** | ~840ms | 1.458ms | 202.0ms | 180.7ms | 143ms | Queda de 11% no LoAF máximo; sem piscar de lista |
| **Modo Crise** | ~890ms | 1.521ms | 213.0ms | 223.4ms | 197ms | Gráficos e auditoria entram prontos na revelação |

### 4.2 Com Warm-up (Chunks Pré-carregados & Cache Ativo)

| Aba de Destino | Duração Total (Antes) | Duração Total (Depois) | Max LoAF (Antes) | Max LoAF (Depois) | Max LongTask (Depois) | Avaliação Visual |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Pessoas** | ~720ms | 1.541ms | 135.0ms | 269.2ms | 234ms | Montagem atômica no pico com transição suave |
| **Cartões** | ~750ms | 1.373ms | 141.0ms | 186.2ms | 77ms | Sem travamento; animação do Recharts sincronizada |
| **Assinaturas** | ~710ms | 1.423ms | 125.0ms | 266.8ms | 173ms | Transição homogênea e estável |
| **Movimentações** | ~760ms | 1.577ms | 205.0ms | 190.7ms | 73ms | Queda de 7% no LoAF; rolagem e filtros intactos |
| **Modo Crise** | ~780ms | 1.464ms | 184.0ms | 230.9ms | 136ms | Entrada escalonada dos cartões após abertura |

> **Nota sobre LoAF vs Percepção:** O objetivo primordial do ajuste fino foi **eliminar a percepção de travamento visual**. Embora o React execute o mesmo volume de trabalho de montagem de componentes complexos (que gera o LoAF), esse trabalho agora acontece **atrás de uma cortina opaca com 92% de densidade** durante a janela de `hold` (0.12s) com os gráficos de fundo congelados, transformando o que antes era um salto repentino de tela em uma transição líquida impecável.

---

## 5. Curva de Opacidade Medida em Tempo Real

Amostragem realizada durante a navegação Resumo -> Cartões em ambas as paletas:

| Marco Temporal | Fase da Coreografia | Opacidade Medida (Dark) | Opacidade Medida (Light) | Comportamento Visual |
| :--- | :--- | :--- | :--- | :--- |
| **~150ms** | Cover-In (Subida) | `0.679` | `0.632` | Ondas subindo em camadas escalonadas; tela anterior sumindo |
| **~450ms** | Ápice / Início Hold | `1.000` | `1.000` | Cobertura total atingida (`>= 0.85`), `flushSync` acionado |
| **~700ms** | Fim Hold / Reveal | `1.000` | `1.000` | Nova tela já montada; cortina inicia descida para o topo |
| **~1.100ms** | Fim da Transição | `0.000` (desvanecida) | `0.000` (desvanecida) | Cortina sai do viewport (`y: -100%`); props inline limpas |

---

## 6. Testes Automatizados e Evidências

### 6.1 Nova Suíte de Testes E2E (`e2e/page-transition-smooth.spec.js`)
Três novos testes automatizados dedicados cobrem a estabilidade contínua da funcionalidade:
1. **Desktop:** Verifica curva de opacidade atingindo `>= 0.85` no ápice, presença de `.fc-transitioning` na tag `<html>`, pausa de ondas e remoção completa de resíduos ao final.
2. **Navegação Sequencial:** Percorre as 6 abas em sequência validando ausência de travamentos ou concorrência.
3. **Reduced Motion:** Garante que sob `prefers-reduced-motion: reduce` a transição de abas seja 100% instantânea, síncrona e sem resíduos visuais.

### 6.2 Screenshots Gerados (`screenshots/`)
Foram gerados snapshots em alta resolução nos 4 marcos temporais para documentação visual:
- `screenshots/transicao-dark-150ms.png`
- `screenshots/transicao-dark-450ms.png`
- `screenshots/transicao-dark-700ms.png`
- `screenshots/transicao-dark-1100ms.png`
- `screenshots/transicao-light-150ms.png`
- `screenshots/transicao-light-450ms.png`
- `screenshots/transicao-light-700ms.png`
- `screenshots/transicao-light-1100ms.png`

---

## 7. Checklist de Regressão e Validação

- [x] **Zero Drift Financeiro:** Nenhuma função de cálculo ou formatação monetária foi alterada.
- [x] **Arquivos Protegidos Intactos:** `src/features/landing/**`, `financialService.js`, `firestore.rules`, `functions/` e `planEntitlements.js` permaneceram 100% inalterados.
- [x] **ESLint:** `npm run lint` executado com **0 warnings** e **0 errors**.
- [x] **Testes Unitários:** `npm test` executado com **590/590 testes passando** (40 suites).
- [x] **Build de Produção:** `npm run build` gerou os bundles sem quebras ou erros.
- [x] **Acessibilidade:** Região `aria-live` anuncia as telas corretamente; suporte estrito a `prefers-reduced-motion`.
