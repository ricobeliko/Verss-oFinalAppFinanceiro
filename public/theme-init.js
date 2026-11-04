// public/theme-init.js
// Executa de forma síncrona no <head> antes do primeiro paint e antes do React montar.
// Garante o tema escuro como padrão canônico e evita qualquer flash de tela clara.
(function() {
  try {
    var stored = localStorage.getItem('theme');
    var theme = (stored === 'light' || stored === 'dark') ? stored : 'dark';
    var root = document.documentElement;
    root.setAttribute('data-theme', theme);
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    var colorSchemeMeta = document.querySelector('meta[name="color-scheme"]');
    if (!colorSchemeMeta) {
      colorSchemeMeta = document.createElement('meta');
      colorSchemeMeta.name = 'color-scheme';
      document.head.appendChild(colorSchemeMeta);
    }
    colorSchemeMeta.content = theme;

    var themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (!themeColorMeta) {
      themeColorMeta = document.createElement('meta');
      themeColorMeta.name = 'theme-color';
      document.head.appendChild(themeColorMeta);
    }
    themeColorMeta.content = theme === 'dark' ? '#04171F' : '#E6F4F7';
  } catch (e) {
    var fallbackRoot = document.documentElement;
    fallbackRoot.setAttribute('data-theme', 'dark');
    fallbackRoot.classList.add('dark');
  }
})();
