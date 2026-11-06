// e2e/living-background.spec.js
import { test, expect } from '@playwright/test';

test.describe('LivingBackground — Verificação E2E de Atmosfera e Reduced Motion', () => {

  const setupMockSession = async (page) => {
    await page.addInitScript(() => {
      localStorage.setItem('theme', 'dark');
      window.__FINCONTROL_E2E_USER__ = {
        uid: 'e2e-tester-background',
        email: 'tester@fincontrol.local',
        name: 'Tester Background',
        plan: 'pro',
        trialExpiresAt: null,
      };
      window.__FINCONTROL_E2E_MOCK_DATA__ = {
        cards: [{ id: 'card-1', name: 'Nubank Ultravioleta', limit: 8000, color: '#5CCCCC' }],
        clients: [{ id: 'client-1', name: 'Ana Silva', phone: '11988887777' }],
        loans: [],
        expenses: [],
        subscriptions: [],
        incomes: [],
      };
    });
  };

  test('Renderiza fundo vivo com aria-hidden e sem elementos interativos', async ({ page }) => {
    await setupMockSession(page);
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const background = page.locator('[data-testid="living-background"]');
    await expect(background).toBeVisible();
    await expect(background).toHaveAttribute('aria-hidden', 'true');
    await expect(background).toHaveClass(/pointer-events-none/);
  });

  test.describe('Com reducedMotion: "reduce"', () => {
    test('Desativa animações CSS das ondas sob prefers-reduced-motion: reduce', async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await setupMockSession(page);
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // Verifica se as ondas têm animação desativada via CSS
      const waveAnimationNames = await page.evaluate(() => {
        const waves = document.querySelectorAll('.fc-wave-layer-1, .fc-wave-layer-2, .fc-wave-layer-3');
        return Array.from(waves).map((el) => {
          const style = window.getComputedStyle(el);
          return {
            animationName: style.animationName,
            animationPlayState: style.animationPlayState,
          };
        });
      });

      expect(waveAnimationNames.length).toBe(3);
      for (const wave of waveAnimationNames) {
        expect(wave.animationName).toBe('none');
      }

      // Valida via document.getAnimations() que nenhum elemento do fundo está animando
      const backgroundAnimationsCount = await page.evaluate(() => {
        const bgEl = document.querySelector('[data-testid="living-background"]');
        if (!bgEl) return 0;
        const allAnimations = document.getAnimations();
        return allAnimations.filter((anim) => {
          const target = anim.effect && anim.effect.target;
          return target && bgEl.contains(target);
        }).length;
      });

      expect(backgroundAnimationsCount).toBe(0);
    });
  });
});
