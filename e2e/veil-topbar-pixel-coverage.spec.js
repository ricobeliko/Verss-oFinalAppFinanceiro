/* global process */
// e2e/veil-topbar-pixel-coverage.spec.js
import { test, expect } from '@playwright/test';

test.describe('FinControl — Véu de Transição cobrindo Topbar e Canvas (Bloco 2 / Fase 10.1 & 10.3)', () => {
  test.beforeEach(async ({ page }) => {
    if (process.env.THROTTLE_CPU) {
      const client = await page.context().newCDPSession(page);
      await client.send('Emulation.setCPUThrottlingRate', { rate: parseInt(process.env.THROTTLE_CPU, 10) });
    }
  });

  const setupMockSession = async (page, theme = 'dark') => {
    await page.addInitScript(({ t }) => {
      localStorage.setItem('theme', t);

      window.__FINCONTROL_E2E_USER__ = {
        uid: 'veil-tester',
        email: 'veil@fincontrol.local',
        name: 'Tester',
        plan: 'pro',
        budgets: {},
        notificationSettings: { cardDueEnabled: true, cardDueDays: 3 },
        aiPreferences: { optIn: false },
      };
      window.__FINCONTROL_E2E_MOCK_DATA__ = {
        cards: [
          { id: 'card-1', name: 'Nubank Ultravioleta', limit: 8000, color: '#5CCCCC', closingDay: 10, dueDay: 17 },
        ],
        clients: [
          { id: 'client-1', name: 'Ana Oliveira', phone: '11988887777' },
        ],
        loans: [
          { id: 'loan-1', description: 'Compra Fatura', totalValue: 500, installments: [{ value: 500, status: 'Pendente', number: 1 }] },
        ],
        expenses: [],
        subscriptions: [],
      };
    }, { t: theme });
  };

  /**
   * Decodifica um screenshot PNG no navegador via HTML5 Canvas e extrai o pixel [R, G, B, A]
   */
  const getPixel = async (page, buf, x, y) => {
    const base64 = buf.toString('base64');
    return await page.evaluate(async ({ b64, px, py }) => {
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = 'data:image/png;base64,' + b64;
      });
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const data = ctx.getImageData(px, py, 1, 1).data;
      return [data[0], data[1], data[2], data[3]];
    }, { b64: base64, px: x, py: y });
  };

  const colorDiff = (c1, c2) => {
    return Math.abs(c1[0] - c2[0]) + Math.abs(c1[1] - c2[1]) + Math.abs(c1[2] - c2[2]);
  };

  /**
   * Pausa deterministicamente o véu de transição no ápice (pico) de cobertura
   */
  const armPeakFreezer = async (page) => {
    await page.evaluate(() => {
      window.__PEAK_FROZEN__ = false;
      const origAnimate = Element.prototype.animate;
      Element.prototype.animate = function(keyframes) {
        const anim = origAnimate.apply(this, arguments);
        const isSweep = this.hasAttribute && (this.hasAttribute('data-fc-wave-sweep') || this.closest('[data-fc-wave-sweep="true"]'));
        if (isSweep && Array.isArray(keyframes) && keyframes.length >= 2) {
          const k0 = keyframes[0] || {};
          const k1 = keyframes[1] || {};

          // CoverIn: opacity de 0 -> peak (0.92) ou transform de 100% -> 0%
          const isCoverIn = (k0.opacity === 0 && k1.opacity > 0) ||
            (typeof k0.transform === 'string' && k0.transform.includes('100%') && typeof k1.transform === 'string' && k1.transform.includes('0%'));

          // Reveal: opacity de peak -> 0 ou transform de 0% -> -100%
          const isReveal = (k0.opacity > 0 && k1.opacity === 0) ||
            (typeof k0.transform === 'string' && k0.transform.includes('0%') && typeof k1.transform === 'string' && k1.transform.includes('-100%'));

          if (isCoverIn) {
            anim.addEventListener('finish', () => {
              const sweep = document.querySelector('[data-fc-wave-sweep="true"]');
              if (sweep && sweep.getAnimations) {
                sweep.getAnimations({ subtree: true }).forEach(a => a.pause());
              }
              window.__PEAK_FROZEN__ = true;
            });
          }
          if (isReveal) {
            // Se o reveal iniciar antes da amostragem, congela no instante zero (pico exato)
            anim.currentTime = 0;
            anim.pause();
            const sweep = document.querySelector('[data-fc-wave-sweep="true"]');
            if (sweep && sweep.getAnimations) {
              sweep.getAnimations({ subtree: true }).forEach(a => a.pause());
            }
            window.__PEAK_FROZEN__ = true;
          }
        }
        return anim;
      };
    });
  };

  const resolutions = [
    { width: 1366, height: 768, label: 'Notebook 720p' },
    { width: 1920, height: 1080, label: 'Full HD' },
    { width: 2560, height: 1440, label: '2K QHD' },
    { width: 3840, height: 2160, label: '4K UHD' },
  ];

  // =========================================================================
  // BLOCO 1: GEOMETRIA E CONTEXTO DE EMPILHAMENTO (4 Resoluções)
  // =========================================================================
  for (const res of resolutions) {
    test(`Cobertura física e geométrica do Véu em ${res.label} (${res.width}x${res.height}) — Sidebar expandida e recolhida`, async ({ page }) => {
      await page.setViewportSize({ width: res.width, height: res.height });
      await setupMockSession(page, 'dark');
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      const topbar = page.locator('header.sticky');
      const sidebar = page.locator('aside');

      await expect(topbar).toBeVisible();
      await expect(sidebar).toBeVisible();

      // 1. Verificar z-index e hierarquia de contexto de empilhamento
      const zIndexes = await page.evaluate(() => {
        const sweep = document.querySelector('[data-fc-wave-sweep="true"]');
        const aside = document.querySelector('aside');
        const header = document.querySelector('header');
        const scrollContainer = header ? header.parentElement : null;

        const getZ = (el) => (el ? window.getComputedStyle(el).zIndex : null);

        return {
          sweepZ: getZ(sweep),
          asideZ: getZ(aside),
          headerZ: getZ(header),
          scrollContainerZ: getZ(scrollContainer),
        };
      });

      // Véu está acima do scrollContainer (z-10) que encapsula Topbar e Conteúdo
      expect(parseInt(zIndexes.sweepZ, 10)).toBe(25);
      expect(parseInt(zIndexes.asideZ, 10)).toBe(30);
      expect(parseInt(zIndexes.scrollContainerZ, 10)).toBe(10);
      // z-30 (Sidebar) > z-25 (Véu) > z-10 (ScrollContainer com Topbar e Main)
      expect(parseInt(zIndexes.asideZ, 10)).toBeGreaterThan(parseInt(zIndexes.sweepZ, 10));
      expect(parseInt(zIndexes.sweepZ, 10)).toBeGreaterThan(parseInt(zIndexes.scrollContainerZ, 10));

      // 2. Geometria com Sidebar Expandida (256px)
      const expandedGeometry = await page.evaluate(() => {
        const sweep = document.querySelector('[data-fc-wave-sweep="true"]');
        const aside = document.querySelector('aside');
        const header = document.querySelector('header');
        
        const origDisplay = sweep.style.display;
        sweep.style.display = 'block';
        const sweepRect = sweep.getBoundingClientRect();
        const asideRect = aside.getBoundingClientRect();
        const headerRect = header.getBoundingClientRect();
        sweep.style.display = origDisplay;

        return {
          sweepTop: sweepRect.top,
          sweepLeft: sweepRect.left,
          sweepRight: sweepRect.right,
          sweepBottom: sweepRect.bottom,
          asideWidth: asideRect.width,
          headerTop: headerRect.top,
          headerLeft: headerRect.left,
          headerRight: headerRect.right,
          headerBottom: headerRect.bottom,
        };
      });

      // O véu começa no topo exato (top: ~0), alinhado à borda direita da sidebar (left ~ 256)
      expect(expandedGeometry.sweepTop).toBeLessThanOrEqual(5);
      expect(expandedGeometry.sweepLeft).toBeCloseTo(expandedGeometry.asideWidth, -1);
      expect(expandedGeometry.sweepRight).toBe(res.width);
      // A topbar está completamente dentro dos limites horizontais e verticais cobertos pelo véu
      expect(expandedGeometry.headerTop).toBeGreaterThanOrEqual(expandedGeometry.sweepTop);
      expect(expandedGeometry.headerLeft).toBeGreaterThanOrEqual(expandedGeometry.sweepLeft - 2);
      expect(expandedGeometry.headerRight).toBeLessThanOrEqual(expandedGeometry.sweepRight);

      // 3. Recolher Sidebar e verificar adaptação dinâmica
      const collapseBtn = page.getByRole('button', { name: /Recolher menu lateral/i });
      await collapseBtn.click();
      
      // Aguarda a transição CSS de largura estabilizar em ~72px de forma condicional
      await expect(async () => {
        const asideWidth = await page.locator('aside').evaluate((el) => el.getBoundingClientRect().width);
        expect(asideWidth).toBeGreaterThanOrEqual(70);
        expect(asideWidth).toBeLessThanOrEqual(75);
      }).toPass({ timeout: 3000 });

      const collapsedGeometry = await page.evaluate(() => {
        const sweep = document.querySelector('[data-fc-wave-sweep="true"]');
        const aside = document.querySelector('aside');
        const origDisplay = sweep.style.display;
        sweep.style.display = 'block';
        const sweepRect = sweep.getBoundingClientRect();
        const asideRect = aside.getBoundingClientRect();
        sweep.style.display = origDisplay;

        return {
          sweepLeft: sweepRect.left,
          asideWidth: asideRect.width,
        };
      });

      // Sidebar recolhida (~72px) e o véu acompanha dinamicamente
      expect(collapsedGeometry.asideWidth).toBeGreaterThanOrEqual(70);
      expect(collapsedGeometry.asideWidth).toBeLessThanOrEqual(75);
      expect(collapsedGeometry.sweepLeft).toBeGreaterThanOrEqual(70);
      expect(collapsedGeometry.sweepLeft).toBeLessThanOrEqual(75);
    });
  }

  // =========================================================================
  // BLOCO 2: AMOSTRAGEM DETERMINÍSTICA DE PIXELS REAIS NO PICO (Dark e Light)
  // =========================================================================
  for (const theme of ['dark', 'light']) {
    test(`Amostragem de Pixels no Pico da Transição (${theme}) — Topbar e Canvas cobertos, Sidebar NÃO coberta`, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await setupMockSession(page, theme);
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      await expect(page.locator('header.sticky')).toBeVisible();
      await expect(page.locator('aside')).toBeVisible();

      // 1. Tira screenshot de repouso antes de qualquer transição
      const restBuf = await page.screenshot();
      const restTopbar = await getPixel(page, restBuf, 500, 30);
      const restCanvas = await getPixel(page, restBuf, 500, 150);
      const restSidebar = await getPixel(page, restBuf, 100, 300);

      // 2. Prepara congelamento determinístico no pico
      await armPeakFreezer(page);

      // 3. Dispara a transição real clicando na aba Cartões
      const cardsBtn = page.getByRole('button', { name: 'Cartões' }).first();
      await cardsBtn.click();

      // Aguarda o véu atingir o pico congelado (espera condicional sobre flag estável)
      await page.waitForFunction(() => window.__PEAK_FROZEN__ === true, { timeout: 8000 });

      // 4. No estado congelado no pico, tira screenshot e lê os pixels reais nos mesmos pontos
      const peakBuf = await page.screenshot();
      const peakTopbar = await getPixel(page, peakBuf, 500, 30);
      const peakCanvas = await getPixel(page, peakBuf, 500, 150);
      const peakSidebar = await getPixel(page, peakBuf, 100, 300);

      const diffTopbar = colorDiff(restTopbar, peakTopbar);
      const diffCanvas = colorDiff(restCanvas, peakCanvas);
      const diffSidebar = colorDiff(restSidebar, peakSidebar);

      // (a) Topbar e (b) Canvas mudaram substancialmente pela presença do véu de transição
      expect(diffTopbar).toBeGreaterThanOrEqual(25);
      expect(diffCanvas).toBeGreaterThanOrEqual(20);

      // (c) Sidebar NÃO é coberta pelo véu (permanece inalterada em relação ao repouso)
      expect(diffSidebar).toBeLessThanOrEqual(5);

      // Confirma que classe global fc-transitioning e véu com display ativo estavam presentes no pico
      const peakStatus = await page.evaluate(() => {
        const isTrans = document.documentElement.classList.contains('fc-transitioning');
        const sweep = document.querySelector('[data-fc-wave-sweep="true"]');
        const op = parseFloat(window.getComputedStyle(sweep).opacity || '0');
        const display = window.getComputedStyle(sweep).display;
        return { isTrans, op, display };
      });

      expect(peakStatus.isTrans).toBe(true);
      expect(peakStatus.display).toBe('block');
      expect(peakStatus.op).toBeGreaterThanOrEqual(0.85);
    });
  }

  // =========================================================================
  // BLOCO 3: PROVA DE PIXELS QUE MODAIS FICAM ACIMA DO VÉU NO PICO
  // =========================================================================
  test('Amostragem de Pixels no Pico da Transição — Modal aberto antes da transição permanece ACIMA do véu', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await setupMockSession(page, 'dark');
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // 1. Abre a busca global (modal centralizado z-50) antes de iniciar a transição
    const searchBtn = page.getByRole('button', { name: /Buscar no FinControl/i });
    await searchBtn.click();
    await page.waitForSelector('[role="dialog"]', { state: 'visible' });

    // Localiza o centro do modal de busca
    const modalBox = await page.locator('[role="dialog"]').boundingBox();
    expect(modalBox).not.toBeNull();
    const modalCenterX = Math.round(modalBox.x + modalBox.width / 2);
    const modalCenterY = Math.round(modalBox.y + modalBox.height / 2);

    // 2. Screenshot de repouso com o modal aberto
    const restBuf = await page.screenshot();
    const restModalPixel = await getPixel(page, restBuf, modalCenterX, modalCenterY);

    // 3. Prepara o congelamento determinístico no pico
    await armPeakFreezer(page);

    // 4. Dispara a transição de tela em segundo plano
    await page.evaluate(() => {
      const cardsBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Cartões'));
      if (cardsBtn) cardsBtn.click();
    });

    // Aguarda o véu congelar no pico sob o modal
    await page.waitForFunction(() => window.__PEAK_FROZEN__ === true, { timeout: 8000 });

    // 5. Screenshot no pico com o modal aberto
    const peakBuf = await page.screenshot();
    const peakModalPixel = await getPixel(page, peakBuf, modalCenterX, modalCenterY);

    const diffModal = colorDiff(restModalPixel, peakModalPixel);

    // O modal deve permanecer idêntico ao repouso (não foi coberto pelo véu z-25, pois modal é z-50)
    expect(diffModal).toBeLessThanOrEqual(10);

    // Validação formal do z-index do modal
    const searchModalZ = await page.evaluate(() => {
      const modal = document.querySelector('[role="dialog"]');
      return modal ? window.getComputedStyle(modal).zIndex : null;
    });
    expect(parseInt(searchModalZ, 10)).toBeGreaterThan(25);
  });
});
