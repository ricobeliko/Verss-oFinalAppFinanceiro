// tests/landingAndUpsellCopy.test.js
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getFilesRecursively(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getFilesRecursively(fullPath));
    } else if (file.endsWith('.jsx') || file.endsWith('.js')) {
      results.push(fullPath);
    }
  });
  return results;
}

describe('Auditoria de Copy e Promessas Honestos: Landing Page e Upsell', () => {
  const landingDir = path.resolve(__dirname, '../src/features/landing');
  const upgradePromptPath = path.resolve(__dirname, '../src/components/UpgradePrompt.jsx');

  const filesToScan = [...getFilesRecursively(landingDir), upgradePromptPath];

  const forbiddenTerms = [
    { pattern: /Modo Crise/i, name: 'Modo Crise' },
    { pattern: /Resumo Executivo/i, name: 'Resumo Executivo' },
    { pattern: /Auditoria Rel[âa]mpago/i, name: 'Auditoria Relâmpago' },
    { pattern: /Metas & Quita[çc][ãa]o/i, name: 'Metas & Quitação' },
    { pattern: /Or[çc]amento por Categoria/i, name: 'Orçamento por Categoria' },
    { pattern: /Intelig[êe]ncia Financeira/i, name: 'Inteligência Financeira' },
    { pattern: /alertas e notifica[çc][õo]es|notifica[çc][õo]es por e-mail|alertas de vencimento/i, name: 'Alertas/Notificações como Benefício' }
  ];

  it('não deve conter nenhum recurso removido do app na Landing ou no UpgradePrompt', () => {
    const violations = [];

    filesToScan.forEach(filePath => {
      const content = fs.readFileSync(filePath, 'utf-8');
      const relPath = path.relative(path.resolve(__dirname, '..'), filePath);

      forbiddenTerms.forEach(({ pattern, name }) => {
        if (pattern.test(content)) {
          violations.push({ file: relPath, term: name });
        }
      });
    });

    expect(
      violations,
      `Termos proibidos encontrados em arquivos de produção: ${JSON.stringify(violations, null, 2)}`
    ).toHaveLength(0);
  });

  it('o plano Pro na landing deve prometer recursos reais existentes no app', () => {
    const pricingFile = path.resolve(__dirname, '../src/features/landing/components/PricingPlansSection.jsx');
    const content = fs.readFileSync(pricingFile, 'utf-8');

    // Deve conter recursos reais
    expect(content).toMatch(/pessoas e cart[õo]es ilimitados/i);
    expect(content).toMatch(/evolu[çc][ãa]o mensal/i);
    expect(content).toMatch(/proje[çc][ãa]o.*por pessoa/i);
    expect(content).toMatch(/exporta[çc][ãa]o.*csv.*por pessoa/i);
  });

  it('o plano Gratuito na landing deve explicitar os limites factuais', () => {
    const pricingFile = path.resolve(__dirname, '../src/features/landing/components/PricingPlansSection.jsx');
    const content = fs.readFileSync(pricingFile, 'utf-8');

    expect(content).toMatch(/at[ée] 3 pessoas/i);
    expect(content).toMatch(/at[ée] 2 cart[õo]es/i);
  });

  it('não deve conter jargão técnico ou nomes internos de arquivos/funções nos textos visíveis da landing', () => {
    const componentsDir = path.resolve(__dirname, '../src/features/landing/components');
    const componentFiles = fs.readdirSync(componentsDir)
      .filter(f => f.endsWith('.jsx'))
      .map(f => path.join(componentsDir, f));

    const technicalTerms = [
      'LoanManagement',
      'financialService',
      'calculateInstallments',
      'sampleData',
      'planEntitlements',
      'Firestore',
      'Firebase',
      'hook',
      'componente',
      'mock',
    ];

    const violations = [];

    componentFiles.forEach(filePath => {
      const content = fs.readFileSync(filePath, 'utf-8');
      const relPath = path.relative(path.resolve(__dirname, '..'), filePath);

      const lines = content.split('\n');
      lines.forEach((line, idx) => {
        const trimmed = line.trim();
        if (
          trimmed.startsWith('import ') ||
          trimmed.startsWith('//') ||
          trimmed.startsWith('/*') ||
          trimmed.startsWith('*')
        ) {
          return;
        }

        technicalTerms.forEach(term => {
          const regex = new RegExp(`\\b${term}\\b`, 'i');
          if (regex.test(line)) {
            // Ignora a desestruturação do identificador de import JS sampleData
            if (trimmed.startsWith('const ') && trimmed.includes('sampleData')) return;

            violations.push({
              file: relPath,
              line: idx + 1,
              term,
              text: trimmed,
            });
          }
        });
      });
    });

    expect(
      violations,
      `Jargão técnico encontrado em texto da landing: ${JSON.stringify(violations, null, 2)}`
    ).toHaveLength(0);
  });
});
