/**
 * scripts/generate-icons.mjs
 * 
 * Script one-shot para renderizar o novo SVG da marca FinControl em todas as resoluções
 * necessárias para navegadores, PWA e dispositivos móveis, sem dependências adicionais
 * além do Playwright (já instalado) e APIs nativas do Node.js (fs, path, Buffer).
 * 
 * Saídas geradas em public/:
 * - favicon-16.png (16x16)
 * - favicon-32.png (32x32)
 * - favicon-48.png (48x48)
 * - favicon.ico (empacotamento ICO multi-resolução 16/32/48 em formato PNG)
 * - apple-touch-icon.png (180x180, full-bleed sem cantos arredondados)
 * - icon-192.png (192x192, cantos arredondados)
 * - icon-512.png (512x512, cantos arredondados)
 * - icon-maskable-512.png (512x512, full-bleed com ondas na zona segura de 80%)
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const publicDir = path.resolve(projectRoot, 'public');

// 1. Definições de SVG

// SVG Padrão (cantos arredondados rx=116)
const STANDARD_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#0E2B35"/>
      <stop offset="1" stop-color="#04171F"/>
    </linearGradient>
    <linearGradient id="w" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#5CCCCC"/>
      <stop offset="1" stop-color="#7FE0DC"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="116" fill="url(#bg)"/>
  <g fill="none" stroke="url(#w)" stroke-width="42" stroke-linecap="round">
    <path d="M80 190C140 120 200 120 256 190S372 260 432 190"/>
    <path opacity=".7" d="M80 285C140 215 200 215 256 285S372 355 432 285"/>
    <path opacity=".4" d="M80 380C140 310 200 310 256 380S372 450 432 380"/>
  </g>
</svg>`;

// SVG Full-Bleed para Apple Touch Icon (quadrado sem cantos arredondados)
const FULL_BLEED_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#0E2B35"/>
      <stop offset="1" stop-color="#04171F"/>
    </linearGradient>
    <linearGradient id="w" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#5CCCCC"/>
      <stop offset="1" stop-color="#7FE0DC"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" fill="url(#bg)"/>
  <g fill="none" stroke="url(#w)" stroke-width="42" stroke-linecap="round">
    <path d="M80 190C140 120 200 120 256 190S372 260 432 190"/>
    <path opacity=".7" d="M80 285C140 215 200 215 256 285S372 355 432 285"/>
    <path opacity=".4" d="M80 380C140 310 200 310 256 380S372 450 432 380"/>
  </g>
</svg>`;

// SVG Maskable (Full-Bleed com ondas centralizadas e escalonadas na zona segura de 80%)
const MASKABLE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#0E2B35"/>
      <stop offset="1" stop-color="#04171F"/>
    </linearGradient>
    <linearGradient id="w" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#5CCCCC"/>
      <stop offset="1" stop-color="#7FE0DC"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" fill="url(#bg)"/>
  <g fill="none" stroke="url(#w)" stroke-width="42" stroke-linecap="round" transform="translate(256, 256) scale(0.8) translate(-256, -285)">
    <path d="M80 190C140 120 200 120 256 190S372 260 432 190"/>
    <path opacity=".7" d="M80 285C140 215 200 215 256 285S372 355 432 285"/>
    <path opacity=".4" d="M80 380C140 310 200 310 256 380S372 450 432 380"/>
  </g>
</svg>`;

/**
 * Cria um arquivo ICO válido contendo imagens em PNG com cabeçalho de diretório.
 * @param {Array<{ width: number, height: number, buffer: Buffer }>} images
 * @returns {Buffer}
 */
export function createIcoFromPngs(images) {
  const numImages = images.length;
  const headerSize = 6;
  const dirEntrySize = 16;
  const dirSize = headerSize + numImages * dirEntrySize;

  let totalSize = dirSize;
  for (const img of images) {
    totalSize += img.buffer.length;
  }

  const icoBuffer = Buffer.alloc(totalSize);

  // Header ICO: Reserved(2), Type(2, 1=ICO), Count(2)
  icoBuffer.writeUInt16LE(0, 0);
  icoBuffer.writeUInt16LE(1, 2);
  icoBuffer.writeUInt16LE(numImages, 4);

  let dataOffset = dirSize;
  for (let i = 0; i < numImages; i++) {
    const { width, height, buffer } = images[i];
    const entryOffset = headerSize + i * dirEntrySize;

    icoBuffer.writeUInt8(width >= 256 ? 0 : width, entryOffset);
    icoBuffer.writeUInt8(height >= 256 ? 0 : height, entryOffset + 1);
    icoBuffer.writeUInt8(0, entryOffset + 2); // 0 = sem paleta
    icoBuffer.writeUInt8(0, entryOffset + 3); // reservado
    icoBuffer.writeUInt16LE(1, entryOffset + 4); // planos de cor
    icoBuffer.writeUInt16LE(32, entryOffset + 6); // 32 bits (RGBA)
    icoBuffer.writeUInt32LE(buffer.length, entryOffset + 8); // tamanho dos bytes
    icoBuffer.writeUInt32LE(dataOffset, entryOffset + 12); // offset no arquivo

    buffer.copy(icoBuffer, dataOffset);
    dataOffset += buffer.length;
  }

  return icoBuffer;
}

export async function generateAllIcons() {
  console.log('Iniciando geração de ícones FinControl...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  /**
   * Renderiza SVG no tamanho especificado e captura PNG sem fundo extra.
   */
  async function renderSvgToPng(svgStr, size) {
    await page.setViewportSize({ width: size, height: size });
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: ${size}px; height: ${size}px; overflow: hidden; background: transparent; }
    svg { display: block; width: 100%; height: 100%; }
  </style>
</head>
<body>
  ${svgStr}
</body>
</html>`;
    await page.setContent(html);
    return await page.screenshot({ omitBackground: true, type: 'png' });
  }

  // 1. Salva favicon.svg canônico
  fs.writeFileSync(path.join(publicDir, 'favicon.svg'), STANDARD_SVG.trim(), 'utf8');
  console.log('✔ public/favicon.svg');

  // 2. Renderiza PNGs padrão
  const p16 = await renderSvgToPng(STANDARD_SVG, 16);
  fs.writeFileSync(path.join(publicDir, 'favicon-16.png'), p16);
  console.log('✔ public/favicon-16.png (16x16)');

  const p32 = await renderSvgToPng(STANDARD_SVG, 32);
  fs.writeFileSync(path.join(publicDir, 'favicon-32.png'), p32);
  console.log('✔ public/favicon-32.png (32x32)');

  const p48 = await renderSvgToPng(STANDARD_SVG, 48);
  fs.writeFileSync(path.join(publicDir, 'favicon-48.png'), p48);
  console.log('✔ public/favicon-48.png (48x48)');

  const p192 = await renderSvgToPng(STANDARD_SVG, 192);
  fs.writeFileSync(path.join(publicDir, 'icon-192.png'), p192);
  console.log('✔ public/icon-192.png (192x192)');

  const p512 = await renderSvgToPng(STANDARD_SVG, 512);
  fs.writeFileSync(path.join(publicDir, 'icon-512.png'), p512);
  console.log('✔ public/icon-512.png (512x512)');

  // 3. Apple Touch Icon 180x180 (Full-Bleed, sem cantos arredondados)
  const p180 = await renderSvgToPng(FULL_BLEED_SVG, 180);
  fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), p180);
  console.log('✔ public/apple-touch-icon.png (180x180 full-bleed)');

  // 4. Icon Maskable 512x512 (Full-Bleed, ondas na zona segura de 80%)
  const pMaskable512 = await renderSvgToPng(MASKABLE_SVG, 512);
  fs.writeFileSync(path.join(publicDir, 'icon-maskable-512.png'), pMaskable512);
  console.log('✔ public/icon-maskable-512.png (512x512 maskable safe-zone)');

  // 5. Empacotamento ICO (16, 32, 48)
  const icoBuffer = createIcoFromPngs([
    { width: 16, height: 16, buffer: p16 },
    { width: 32, height: 32, buffer: p32 },
    { width: 48, height: 48, buffer: p48 },
  ]);
  fs.writeFileSync(path.join(publicDir, 'favicon.ico'), icoBuffer);
  console.log('✔ public/favicon.ico (multi-resolução 16/32/48)');

  await browser.close();
  console.log('Todos os ícones foram gerados com sucesso!');
}

// Execução direta via CLI
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  generateAllIcons().catch((err) => {
    console.error('Erro gerando ícones:', err);
    process.exit(1);
  });
}
