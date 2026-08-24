/* global process */
// playwright.config.js
import { defineConfig, devices } from '@playwright/test';

/**
 * Configuração do Playwright para E2E Real do FinControl.
 * Executa testes reais em navegador Chromium contra o servidor local Vite.
 */
export default defineConfig({
    testDir: './e2e',
    timeout: 30 * 1000,
    expect: {
        timeout: 8000
    },
    fullyParallel: false,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 1 : 0,
    workers: 1,
    reporter: 'list',
    use: {
        baseURL: 'http://localhost:5173',
        trace: 'on-first-retry',
        headless: true,
        viewport: { width: 1280, height: 720 },
        screenshot: 'only-on-failure'
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        }
    ],
    webServer: {
        command: 'npm run dev',
        url: 'http://localhost:5173',
        reuseExistingServer: true,
        timeout: 60 * 1000,
    }
});
