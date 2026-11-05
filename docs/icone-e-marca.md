# FinControl — Fase Ícone: Novo Favicon em Ondas, Marca Animada no App e Cache Seguro

**Branch:** `feat/redesign-icone`  
**Base:** `feat/redesign-fase-4b-kpis-evolucao` (`ffa8813`)  
**Data:** 05/11/2026  
**Status:** CONCLUÍDO COM SUCESSO  

---

## 1. Resumo da Fase

A **Fase Ícone** do Redesign do FinControl estabelece a nova identidade visual unificada do sistema através da opção **A (Três Ondas em Teal sobre Quadrado Arredondado Azul-Abissal)**, harmonizando o ícone da aba do navegador, ícones PWA para celulares/desktops, suporte ao ecossistema Apple e a marca viva com micro-animação das ondas dentro da aplicação.

### Princípios Constitucionais Atendidos:
- **Favicon Estático:** O favicon da aba do navegador é 100% estático (favicons animados são considerados má prática de usabilidade e causam consumo desnecessário de CPU no processo do browser).
- **Movimento Exclusivo no App:** As ondas ganham vida apenas dentro da interface (tela de autenticação e hover na sidebar), usando aceleração de hardware nativa (GPU) via CSS `transform: translate3d`.
- **Zero Drift & Sem Dependências:** Os PNGs e o arquivo `.ico` são gerados via script one-shot nativo utilizando o Playwright já existente e manipuladores de `Buffer` do Node.js.
- **Cache Seguro & Versionamento:** Todos os ícones utilizam versionamento via query string (`?v=1`), garantindo que novas versões furem caches antigos sem quebrar a política de segurança CSP ou de cache revalidado de `index.html`.

---

## 2. Inventário de Arquivos do Ícone

| Arquivo | Dimensões | Formato | Finalidade | Tratamento de Borda |
|---|---|---|---|---|
| `public/favicon.svg` | Vetorial (512x512) | SVG Nativo | Navegadores modernos desktop | Cantos arredondados (`rx=116`) |
| `public/favicon-16.png` | 16x16 | PNG | Fallback abas compactas | Cantos arredondados com antialiasing |
| `public/favicon-32.png` | 32x32 | PNG | Padrão abas desktop e favoritos | Cantos arredondados |
| `public/favicon-48.png` | 48x48 | PNG | Barra de tarefas Windows / Bookmarks | Cantos arredondados |
| `public/favicon.ico` | 16, 32 e 48 | ICO Multi-formato | Fallback legado para navegadores/proxies | 3 frames PNG empacotados |
| `public/apple-touch-icon.png` | 180x180 | PNG | iOS Home Screen / Safari Touch | **Full-bleed** (quadrado sem cantos; o iOS arredonda) |
| `public/icon-192.png` | 192x192 | PNG | PWA Android / Chrome Web App | Cantos arredondados |
| `public/icon-512.png` | 512x512 | PNG | PWA Splash Screen de inicialização | Cantos arredondados |
| `public/icon-maskable-512.png` | 512x512 | PNG | PWA Ícone Adaptativo Android | **Full-bleed**, ondas contidas na zona segura central de 80% |
| `public/site.webmanifest` | - | JSON | Manifesto PWA (nome, cores e ícones) | Configuração de tema `#04171F` |

> [!NOTE]
> O arquivo legado `public/favicon.png` (de 1.2 MB) foi removido do repositório por estar obsoleto e não ser mais referenciado em nenhum ponto da aplicação.

---

## 3. Como Regenerar os Ícones

Para recriar todos os arquivos estáticos a partir das definições canônicas de SVG:

```bash
node scripts/generate-icons.mjs
```

O script [`scripts/generate-icons.mjs`](file:///c:/Users/CyberLiko/projects/app-financeiro/scripts/generate-icons.mjs) executa headless via Playwright, renderiza as variantes do SVG e gera o binário do ICO diretamente em memória sem ferramentas externas como ImageMagick ou Sharp.

---

## 4. Política de Cache e Versionamento (?v=1)

No arquivo [`firebase.json`](file:///c:/Users/CyberLiko/projects/app-financeiro/firebase.json), foram configuradas regras estritas de cabeçalho:

1. **`index.html` e `/`:**
   - `Cache-Control: no-cache, no-store, must-revalidate`
   - O documento principal nunca é retido em caches longos, garantindo que qualquer subida de versão de CSS, JS ou ícones seja capturada no próximo acesso.
2. **Ícones (`**/*.@(ico|svg|png)`) e `site.webmanifest`:**
   - `Cache-Control: public, max-age=31536000, immutable`
   - Podem ser cacheados permanentemente (1 ano) por navegadores e CDNs porque as URLs em `index.html` levam a query string de versão (ex: `/favicon.svg?v=1`).
   - Para atualizações visuais futuras, basta incrementar para `?v=2` em `index.html` e `site.webmanifest`.
3. **Content-Type do Manifest:**
   - Servido explicitamente com `Content-Type: application/manifest+json; charset=utf-8`.
4. **Preservação de Segurança:**
   - A CSP de produção (`default-src 'self'`, `img-src 'self' data: blob: ...`) e os cabeçalhos de segurança (`X-Frame-Options: DENY`, `nosniff`, `HSTS`) foram 100% preservados sem qualquer relaxamento.

---

## 5. Locais de Aplicação da Marca no App

O componente centralizado [`src/components/FinControlMark.jsx`](file:///c:/Users/CyberLiko/projects/app-financeiro/src/components/FinControlMark.jsx) substituiu o logotipo genérico nos seguintes pontos:

1. **Tela de Autenticação (`src/features/auth/AuthScreen.jsx`):**
   - Marca grande em destaque (`size={56}`) centralizada acima do título *FinControl*.
   - Modo `animated={true}` com as três ondas deslizando de forma suave e contínua em loop linear (8.5s, 10.5s e 12.5s) com defasagem orgânica.
2. **Sidebar Desktop (`src/features/dashboard/shell/AppSidebar.jsx`):**
   - Marca em destaque no topo (`size={36}`) no estado expandido e recolhido.
   - Modo `hoverAnimated={true}`: estática por padrão, ativando deslizamento suave das ondas ao passar o cursor pelo bloco da marca (`group-hover/brand`).
   - Acessibilidade: `ariaHidden={true}` no modo expandido (pois o texto "FinControl" está logo ao lado); `aria-label="FinControl"` no modo recolhido (quando o texto está oculto).
3. **Barra Superior Mobile (`src/features/dashboard/shell/AppTopbar.jsx`):**
   - Marca compacta (`size={28}`) ao lado do gatilho do menu hambúrguer com `hoverAnimated={true}`.
4. **Drawer Móvel (`src/features/dashboard/shell/MobileNavigation.jsx`):**
   - Marca no cabeçalho do menu móvel (`size={32}`) ao lado do título com `hoverAnimated={true}`.

---

## 6. Acessibilidade e Prefers-Reduced-Motion

- **SVG Semântico:** Implementa `role="img"` e `aria-label` quando não há texto de apoio; omite atributos de leitura e define `aria-hidden="true"` quando acompanhado do nome em texto.
- **IDs Únicos via `useId()`:** Evita colisões no DOM mesmo com múltiplas marcas na mesma tela.
- **Prefers-Reduced-Motion:**
  Em [`src/design-system/motion.css`](file:///c:/Users/CyberLiko/projects/app-financeiro/src/design-system/motion.css):
  ```css
  @media (prefers-reduced-motion: reduce) {
    .fc-mark-wave,
    .fc-mark-wave-anim-1,
    .fc-mark-wave-anim-2,
    .fc-mark-wave-anim-3,
    .fc-mark-wave-hover-1,
    .fc-mark-wave-hover-2,
    .fc-mark-wave-hover-3 {
      animation: none !important;
      transform: none !important;
      will-change: auto !important;
    }
  }
  ```
  Sob redução de movimento, a marca é renderizada com as ondas perfeitamente estáticas, idêntica ao favicon.
