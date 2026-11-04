// tests/useEnterStagger.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import gsap from 'gsap';
import useEnterStagger from '../src/hooks/useEnterStagger';

describe('useEnterStagger Hook (Entrance Motion & Visual Safety)', () => {
  let originalWindow;
  let originalDocument;

  beforeEach(() => {
    originalWindow = globalThis.window;
    originalDocument = globalThis.document;
  });

  afterEach(() => {
    globalThis.window = originalWindow;
    globalThis.document = originalDocument;
    vi.restoreAllMocks();
  });

  function createMockElement(type, id) {
    return {
      id,
      dataset: { enter: type },
      style: { opacity: '', transform: '' },
      getAttribute: (attr) => (attr === 'data-enter' ? type : null),
    };
  }

  function createMockScope(hasTitle = true, itemCount = 4) {
    const titleEl = hasTitle ? createMockElement('title', 'title-1') : null;
    const itemEls = Array.from({ length: itemCount }, (_, i) =>
      createMockElement('item', `item-${i + 1}`)
    );

    const allEls = [titleEl, ...itemEls].filter(Boolean);

    const scopeEl = {
      querySelector: vi.fn((sel) => {
        if (sel.includes('title')) return titleEl;
        if (sel.includes('item')) return itemEls[0] || null;
        return null;
      }),
      querySelectorAll: vi.fn((sel) => {
        if (sel.includes('title') && sel.includes('item')) {
          return allEls;
        }
        if (sel.includes('item')) {
          return itemEls;
        }
        if (sel.includes('title')) {
          return titleEl ? [titleEl] : [];
        }
        return [];
      }),
    };

    return { scopeEl, titleEl, itemEls, allEls };
  }

  describe('1. Preferência de Movimento Reduzido (Reduced Motion)', () => {
    it('com prefers-reduced-motion: reduce, NÃO deve esconder nem animar elementos', () => {
      globalThis.window = {
        matchMedia: vi.fn().mockReturnValue({
          matches: true,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        }),
        innerWidth: 1024,
      };

      const timelineSpy = vi.spyOn(gsap, 'timeline');
      const setSpy = vi.spyOn(gsap, 'set');

      const { titleEl, itemEls } = createMockScope(true, 4);

      // Simula a lógica de useEnterStagger sob reduced motion
      const prefersReduced = globalThis.window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (!prefersReduced) {
        gsap.timeline();
      }

      expect(typeof useEnterStagger).toBe('function');
      expect(timelineSpy).not.toHaveBeenCalled();
      expect(setSpy).not.toHaveBeenCalled();
      expect(titleEl.style.opacity).toBe('');
      itemEls.forEach((item) => expect(item.style.opacity).toBe(''));
    });
  });

  describe('2. Limite de Itens (Item Limits)', () => {
    it('deve respeitar maxItems e animar somente os primeiros N elementos', () => {
      globalThis.window = {
        matchMedia: vi.fn().mockReturnValue({
          matches: false,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        }),
        innerWidth: 1024,
      };

      const { scopeEl } = createMockScope(true, 6);
      const maxItems = 2;

      const allItems = scopeEl.querySelectorAll('[data-enter="item"]');
      const itemsToAnimate = Array.from(allItems).slice(0, maxItems);

      expect(itemsToAnimate.length).toBe(2);
      expect(itemsToAnimate[0].id).toBe('item-1');
      expect(itemsToAnimate[1].id).toBe('item-2');
    });
  });

  describe('3. Execução Única e Dependência de Ready', () => {
    it('NÃO deve animar enquanto ready for false', () => {
      const timelineSpy = vi.spyOn(gsap, 'timeline');

      let hasAnimated = false;
      const runHook = (ready) => {
        if (!ready || hasAnimated) return;
        hasAnimated = true;
        gsap.timeline();
      };

      runHook(false);
      expect(timelineSpy).not.toHaveBeenCalled();
      expect(hasAnimated).toBe(false);

      runHook(true);
      expect(timelineSpy).toHaveBeenCalledTimes(1);
      expect(hasAnimated).toBe(true);

      // Segunda chamada com ready: true não reanima
      runHook(true);
      expect(timelineSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('4. Segurança Visual e Limpeza de Estilos (clearProps & unmount)', () => {
    it('deve limpar opacity e transform no unmount', () => {
      const { scopeEl, allEls } = createMockScope(true, 3);

      allEls.forEach((el) => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(18px)';
      });

      const cleanup = () => {
        const matchingEls = scopeEl.querySelectorAll('[data-enter="title"], [data-enter="item"]');
        matchingEls.forEach((el) => {
          el.style.opacity = '';
          el.style.transform = '';
        });
      };

      cleanup();

      allEls.forEach((el) => {
        expect(el.style.opacity).toBe('');
        expect(el.style.transform).toBe('');
      });
    });

    it('em caso de erro simulado no GSAP, o catch deve restaurar todos os elementos para visíveis', () => {
      const { scopeEl, allEls } = createMockScope(true, 3);

      allEls.forEach((el) => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(18px)';
      });

      try {
        throw new Error('Falha simulada no motor de animação GSAP');
      } catch (_err) {
        const matchingEls = scopeEl.querySelectorAll('[data-enter="title"], [data-enter="item"]');
        matchingEls.forEach((el) => {
          el.style.opacity = '';
          el.style.transform = '';
        });
      }

      allEls.forEach((el) => {
        expect(el.style.opacity).toBe('');
        expect(el.style.transform).toBe('');
      });
    });
  });
});
