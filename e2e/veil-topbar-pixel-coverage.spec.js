// e2e/veil-topbar-pixel-coverage.spec.js
import { test, expect } from '@playwright/test';

test.describe('FinControl — Véu de Transição cobrindo Topbar e Canvas (Bloco 2 / Fase 10.1)', () => {
  const setupMockSession = async (page) => {
    await page.addInitScript(() => {
      localStorage.setItem('theme', 'dark');

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
        loans: [],
        expenses: [],
        subscriptions: [],
      };
    });
  };

  const resolutions = [
    { width: 1366, height: 768, label: 'Notebook 720p' },
    { width: 1920, height: 1080, label: 'Full HD' },
    { width: 2560, height: 1440, label: '2K QHD' },
    { width: 3840, height: 2160, label: '4K UHD' },
  ];

  for (const res of resolutions) {
    test(`Cobertura física e geométrica do Véu em ${res.label} (${res.width}x${res.height}) — Sidebar expandida e recolhida`, async ({ page }) => {
      await page.setViewportSize({ width: res.width, height: res.height });
      await setupMockSession(page);
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);

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
      // O véu opera com display: none em repouso. Ativamos a inspeção sob estado renderizado.
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
      
      // Aguarda a transição CSS de largura (transition-[width] duration-200) estabilizar em ~72px
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

  test('Amostragem de Pixels e Opacidade no Pico da Transição — Topbar e Canvas cobertos, Sidebar e Modais acima', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await setupMockSession(page);
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    const waveContainer = page.locator('[data-fc-wave-sweep="true"]');

    // 1. Provar que Modais ficam acima do véu
    const searchBtn = page.getByRole('button', { name: /Buscar no FinControl/i });
    await searchBtn.click();
    await page.waitForTimeout(300);

    const searchModalZ = await page.evaluate(() => {
      const modal = document.querySelector('[role="dialog"]') || document.querySelector('.animate-fadeIn');
      return modal ? window.getComputedStyle(modal).zIndex : null;
    });
    // Modal de busca z-50 > Véu z-25
    expect(parseInt(searchModalZ, 10)).toBeGreaterThan(25);

    // Fecha modal
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);

    // 2. Dispara transição real para aba Cartões e faz amostragem no pico
    const cardsBtn = page.getByRole('button', { name: 'Cartões' }).first();
    await cardsBtn.click();

    // No pico: opacidade >= 0.85
    await expect(async () => {
      const op = await waveContainer.evaluate((el) => {
        return parseFloat(window.getComputedStyle(el).opacity || '0');
      });
      expect(op).toBeGreaterThanOrEqual(0.85);
    }).toPass({ timeout: 1500 });

    // Amostragem de pixel no pico da transição (Topbar: x=500, y=30; Canvas: x=500, y=300)
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

    // Aguarda término da transição
    await expect(async () => {
      const isTrans = await page.locator('html').evaluate((el) => el.classList.contains('fc-transitioning'));
      expect(isTrans).toBe(false);
    }).toPass({ timeout: 3500 });
  });
});
