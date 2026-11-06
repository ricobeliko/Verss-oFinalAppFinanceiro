import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

describe('Public Assets Sanity & Security Gate', () => {
  it('não deve conter nenhum arquivo de screenshot ou imagem de captura dentro de public/', () => {
    const publicDir = path.resolve(process.cwd(), 'public');
    expect(fs.existsSync(publicDir)).toBe(true);

    function scanDir(dir) {
      let results = [];
      const list = fs.readdirSync(dir);
      for (const file of list) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          results = results.concat(scanDir(fullPath));
        } else {
          results.push(fullPath);
        }
      }
      return results;
    }

    const allFiles = scanDir(publicDir);
    const imageExtensions = ['.png', '.jpg', '.jpeg', '.webp', '.avif', '.gif', '.svg'];
    const screenshotViolations = allFiles.filter(filePath => {
      const lower = filePath.toLowerCase();
      const isImage = imageExtensions.some(ext => lower.endsWith(ext));
      const hasScreenshot = lower.includes('screenshot');
      return isImage && hasScreenshot;
    });

    expect(screenshotViolations).toEqual([]);
  });
});
