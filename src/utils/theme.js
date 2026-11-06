// src/utils/theme.js

/**
 * Recupera o tema inicial do FinControl ('dark' ou 'light').
 * Por padrão estrito do sistema, o tema escuro (Abyss Teal) é retornado para novos usuários,
 * caso o valor seja inválido ou caso ocorra exceção ao ler o localStorage.
 * 
 * @returns {'dark' | 'light'}
 */
export function getInitialTheme() {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return 'dark';
    }
    const stored = window.localStorage.getItem('theme');
    if (stored === 'light' || stored === 'dark') {
      return stored;
    }
    return 'dark';
  } catch (_err) {
    return 'dark';
  }
}

/**
 * Aplica o tema no elemento <html> (data-theme e classe .dark) e atualiza meta tags.
 * Salva a preferência no localStorage de forma segura.
 * 
 * @param {'dark' | 'light'} theme
 */
export function applyTheme(theme) {
  const safeTheme = theme === 'light' ? 'light' : 'dark';

  if (typeof document !== 'undefined') {
    const root = document.documentElement;
    root.setAttribute('data-theme', safeTheme);
    if (safeTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    let colorSchemeMeta = document.querySelector('meta[name="color-scheme"]');
    if (!colorSchemeMeta) {
      colorSchemeMeta = document.createElement('meta');
      colorSchemeMeta.name = 'color-scheme';
      document.head.appendChild(colorSchemeMeta);
    }
    colorSchemeMeta.content = safeTheme;

    let themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (!themeColorMeta) {
      themeColorMeta = document.createElement('meta');
      themeColorMeta.name = 'theme-color';
      document.head.appendChild(themeColorMeta);
    }
    themeColorMeta.content = safeTheme === 'dark' ? '#04171F' : '#E6F4F7';
  }

  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem('theme', safeTheme);
    }
  } catch (_err) {
    // Falha silenciosa para contextos restritos (ex: cookies/storage desativados)
  }
}
