// tests/theme.test.js
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getInitialTheme, applyTheme } from '../src/utils/theme.js';

describe('FinControl — Theme Engine & Default Dark Policy', () => {
  let mockStorage = {};
  let mockAttributes = {};
  let mockClasses = new Set();
  let mockHeadChildren = [];

  beforeEach(() => {
    mockStorage = {};
    mockAttributes = {};
    mockClasses = new Set();
    mockHeadChildren = [];

    globalThis.window = {
      localStorage: {
        getItem: vi.fn((key) => mockStorage[key] !== undefined ? mockStorage[key] : null),
        setItem: vi.fn((key, val) => { mockStorage[key] = String(val); }),
        removeItem: vi.fn((key) => { delete mockStorage[key]; }),
        clear: vi.fn(() => { mockStorage = {}; })
      }
    };
    globalThis.localStorage = globalThis.window.localStorage;

    globalThis.document = {
      documentElement: {
        setAttribute: vi.fn((name, val) => { mockAttributes[name] = val; }),
        getAttribute: vi.fn((name) => mockAttributes[name] || null),
        removeAttribute: vi.fn((name) => { delete mockAttributes[name]; }),
        classList: {
          add: vi.fn((cls) => { mockClasses.add(cls); }),
          remove: vi.fn((cls) => { mockClasses.delete(cls); }),
          contains: vi.fn((cls) => mockClasses.has(cls))
        }
      },
      querySelector: vi.fn((selector) => {
        return mockHeadChildren.find((el) => el.matchesSelector && el.matchesSelector(selector)) || null;
      }),
      createElement: vi.fn((tag) => {
        const elem = {
          tagName: tag.toUpperCase(),
          name: '',
          content: '',
          setAttribute: vi.fn((k, v) => { elem[k] = v; }),
          getAttribute: vi.fn((k) => elem[k]),
          matchesSelector: (sel) => sel.includes(elem.name)
        };
        return elem;
      }),
      head: {
        appendChild: vi.fn((child) => {
          mockHeadChildren.push(child);
          return child;
        })
      }
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('1. deve retornar padrão "dark" quando localStorage estiver vazio', () => {
    expect(getInitialTheme()).toBe('dark');
  });

  it('2. deve retornar "dark" se o valor armazenado for inválido', () => {
    mockStorage['theme'] = 'invalid-theme';
    expect(getInitialTheme()).toBe('dark');

    mockStorage['theme'] = 'system';
    expect(getInitialTheme()).toBe('dark');

    mockStorage['theme'] = '';
    expect(getInitialTheme()).toBe('dark');
  });

  it('3. deve retornar "dark" se localStorage.getItem lançar erro (SecurityError/QuotaExceeded)', () => {
    globalThis.window.localStorage.getItem = vi.fn(() => {
      throw new Error('localStorage blocked');
    });

    expect(getInitialTheme()).toBe('dark');
  });

  it('4. deve retornar "light" quando o usuário salvou explicitamente "light"', () => {
    mockStorage['theme'] = 'light';
    expect(getInitialTheme()).toBe('light');
  });

  it('5. deve retornar "dark" quando o usuário salvou explicitamente "dark"', () => {
    mockStorage['theme'] = 'dark';
    expect(getInitialTheme()).toBe('dark');
  });

  it('6. applyTheme deve aplicar data-theme e classe dark corretamente no DOM', () => {
    applyTheme('dark');
    expect(globalThis.document.documentElement.setAttribute).toHaveBeenCalledWith('data-theme', 'dark');
    expect(mockClasses.has('dark')).toBe(true);
    expect(mockStorage['theme']).toBe('dark');

    applyTheme('light');
    expect(globalThis.document.documentElement.setAttribute).toHaveBeenCalledWith('data-theme', 'light');
    expect(mockClasses.has('dark')).toBe(false);
    expect(mockStorage['theme']).toBe('light');
  });
});
