// tests/brandIconAndMark.test.js
import { Buffer } from 'node:buffer';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { describe, it, expect } from 'vitest';
import FinControlMark from '../src/components/FinControlMark';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

/**
 * Lê largura e altura do cabeçalho IHDR de um PNG (bytes 16 a 23, big-endian)
 */
function readPngDimensions(filePath) {
  const buf = fs.readFileSync(filePath);
  const signature = buf.subarray(0, 8);
  const pngSig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (!signature.equals(pngSig)) {
    throw new Error(`Arquivo ${filePath} não é um PNG válido.`);
  }
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  return { width, height };
}

/**
 * Lê o diretório de imagens de um arquivo ICO
 */
function readIcoDirectory(filePath) {
  const buf = fs.readFileSync(filePath);
  const reserved = buf.readUInt16LE(0);
  const type = buf.readUInt16LE(2);
  const count = buf.readUInt16LE(4);

  if (reserved !== 0 || type !== 1) {
    throw new Error(`Arquivo ${filePath} não é um ICO válido.`);
  }

  const entries = [];
  for (let i = 0; i < count; i++) {
    const offset = 6 + i * 16;
    let w = buf.readUInt8(offset);
    let h = buf.readUInt8(offset + 1);
    if (w === 0) w = 256;
    if (h === 0) h = 256;
    const bpp = buf.readUInt16LE(offset + 6);
    const size = buf.readUInt32LE(offset + 8);
    const dataOffset = buf.readUInt32LE(offset + 12);
    entries.push({ width: w, height: h, bpp, size, dataOffset });
  }

  return { count, entries };
}

describe('Fase Ícone — Validação de Favicons, Manifest e Marca FinControl', () => {

  it('1. index.html referencia todos os ícones e o manifest com a query de versão ?v=1', () => {
    const indexPath = path.join(projectRoot, 'index.html');
    const indexContent = fs.readFileSync(indexPath, 'utf8');

    // SVG
    expect(indexContent).toMatch(/<link\s+rel="icon"\s+type="image\/svg\+xml"\s+sizes="any"\s+href="\/favicon\.svg\?v=1"/);

    // PNG 32 e 16
    expect(indexContent).toMatch(/<link\s+rel="icon"\s+type="image\/png"\s+sizes="32x32"\s+href="\/favicon-32\.png\?v=1"/);
    expect(indexContent).toMatch(/<link\s+rel="icon"\s+type="image\/png"\s+sizes="16x16"\s+href="\/favicon-16\.png\?v=1"/);

    // ICO
    expect(indexContent).toMatch(/<link\s+rel="shortcut icon"\s+href="\/favicon\.ico\?v=1"/);
    expect(indexContent).toMatch(/<link\s+rel="icon"\s+type="image\/x-icon"\s+sizes="48x48"\s+href="\/favicon\.ico\?v=1"/);

    // Apple touch icon
    expect(indexContent).toMatch(/<link\s+rel="apple-touch-icon"\s+sizes="180x180"\s+href="\/apple-touch-icon\.png\?v=1"/);

    // Manifest
    expect(indexContent).toMatch(/<link\s+rel="manifest"\s+href="\/site\.webmanifest\?v=1"/);

    // Não deve conter referência a /favicon.png antigo
    expect(indexContent).not.toContain('href="/favicon.png"');
  });

  it('2. Todos os arquivos de ícones existem em public/ com as dimensões exatas', () => {
    const publicDir = path.join(projectRoot, 'public');

    // PNGs
    expect(readPngDimensions(path.join(publicDir, 'favicon-16.png'))).toEqual({ width: 16, height: 16 });
    expect(readPngDimensions(path.join(publicDir, 'favicon-32.png'))).toEqual({ width: 32, height: 32 });
    expect(readPngDimensions(path.join(publicDir, 'favicon-48.png'))).toEqual({ width: 48, height: 48 });
    expect(readPngDimensions(path.join(publicDir, 'apple-touch-icon.png'))).toEqual({ width: 180, height: 180 });
    expect(readPngDimensions(path.join(publicDir, 'icon-192.png'))).toEqual({ width: 192, height: 192 });
    expect(readPngDimensions(path.join(publicDir, 'icon-512.png'))).toEqual({ width: 512, height: 512 });
    expect(readPngDimensions(path.join(publicDir, 'icon-maskable-512.png'))).toEqual({ width: 512, height: 512 });

    // ICO com 3 resoluções (16, 32, 48)
    const ico = readIcoDirectory(path.join(publicDir, 'favicon.ico'));
    expect(ico.count).toBe(3);
    expect(ico.entries.map((e) => ({ width: e.width, height: e.height }))).toEqual([
      { width: 16, height: 16 },
      { width: 32, height: 32 },
      { width: 48, height: 48 },
    ]);

    // SVG canônico
    const svgContent = fs.readFileSync(path.join(publicDir, 'favicon.svg'), 'utf8');
    expect(svgContent).toContain('viewBox="0 0 512 512"');
    expect(svgContent).toContain('<path d="M80 190C140 120 200 120 256 190S372 260 432 190"');
  });

  it('3. site.webmanifest é JSON válido com propriedades PWA e ícones versionados (?v=1)', () => {
    const manifestPath = path.join(projectRoot, 'public', 'site.webmanifest');
    const content = fs.readFileSync(manifestPath, 'utf8');
    const manifest = JSON.parse(content);

    expect(manifest.name).toBe('FinControl');
    expect(manifest.short_name).toBe('FinControl');
    expect(manifest.start_url).toBe('/');
    expect(manifest.display).toBe('standalone');
    expect(manifest.background_color).toBe('#04171F');
    expect(manifest.theme_color).toBe('#04171F');

    expect(manifest.icons).toHaveLength(3);
    expect(manifest.icons).toContainEqual({
      src: '/icon-192.png?v=1',
      sizes: '192x192',
      type: 'image/png',
    });
    expect(manifest.icons).toContainEqual({
      src: '/icon-512.png?v=1',
      sizes: '512x512',
      type: 'image/png',
    });
    expect(manifest.icons).toContainEqual({
      src: '/icon-maskable-512.png?v=1',
      sizes: '512x512',
      type: 'image/png',
      purpose: 'maskable',
    });
  });

  it('4. FinControlMark renderiza SVG inline, gera IDs únicos e respeita acessibilidade', () => {
    // Renderiza duas marcas no mesmo container para testar unicidade de IDs do useId
    const tree = renderToString(
      React.createElement(
        'div',
        null,
        React.createElement(FinControlMark, { size: 48, ariaLabel: 'Marca Principal' }),
        React.createElement(FinControlMark, { size: 32, ariaHidden: true, animated: true })
      )
    );

    // Deve conter dois SVGs
    const svgMatches = tree.match(/<svg[^>]*>/g);
    expect(svgMatches).toHaveLength(2);

    // Instância 1: acessível como imagem
    expect(svgMatches[0]).toContain('role="img"');
    expect(svgMatches[0]).toContain('aria-label="Marca Principal"');
    expect(svgMatches[0]).toContain('width="48"');
    expect(svgMatches[0]).toContain('height="48"');
    expect(tree).toContain('<title>Marca Principal</title>');

    // Instância 2: decorativa (ao lado de texto)
    expect(svgMatches[1]).toContain('aria-hidden="true"');
    expect(svgMatches[1]).not.toContain('role="img"');
    expect(svgMatches[1]).toContain('width="32"');
    expect(svgMatches[1]).toContain('height="32"');

    // IDs de gradientes e clipPath devem ser únicos entre instâncias
    const bgMatches = Array.from(tree.matchAll(/id="(fc-mark-bg-[^"]+)"/g)).map((m) => m[1]);
    expect(bgMatches).toHaveLength(2);
    expect(bgMatches[0]).not.toBe(bgMatches[1]);

    const clipMatches = Array.from(tree.matchAll(/id="(fc-mark-clip-[^"]+)"/g)).map((m) => m[1]);
    expect(clipMatches).toHaveLength(2);
    expect(clipMatches[0]).not.toBe(clipMatches[1]);

    // Animação ativa na instância 2 (animated=true)
    expect(tree).toContain('fc-mark-wave-anim-1');
    expect(tree).toContain('fc-mark-wave-anim-2');
    expect(tree).toContain('fc-mark-wave-anim-3');
  });

  it('5. Regras de motion.css garantem que prefers-reduced-motion neutraliza animações da marca', () => {
    const motionCssPath = path.join(projectRoot, 'src', 'design-system', 'motion.css');
    const css = fs.readFileSync(motionCssPath, 'utf8');

    expect(css).toContain('@keyframes fcMarkWaveSlide');
    expect(css).toContain('transform: translate3d(-352px, 0, 0)');
    expect(css).toContain('transform: translate3d(0, 0, 0)');

    // Seção prefers-reduced-motion com a regra da marca
    expect(css).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*?\.fc-mark-wave-anim-1[\s\S]*?animation:\s*none\s*!important/);
    expect(css).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*?\.fc-mark-wave-anim-1[\s\S]*?transform:\s*none\s*!important/);
  });

  it('6. LandingHeader e LandingFooter utilizam FinControlMark com animated={true}', () => {
    const headerPath = path.join(projectRoot, 'src', 'features', 'landing', 'components', 'LandingHeader.jsx');
    const footerPath = path.join(projectRoot, 'src', 'features', 'landing', 'components', 'LandingFooter.jsx');

    const headerContent = fs.readFileSync(headerPath, 'utf8');
    const footerContent = fs.readFileSync(footerPath, 'utf8');

    expect(headerContent).toContain('animated={true}');
    expect(headerContent).not.toContain('hoverAnimated={true}');

    expect(footerContent).toContain('animated={true}');
    expect(footerContent).not.toContain('hoverAnimated={true}');
  });
});
