// tests/hostingCspAppCheck.test.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { describe, it, expect } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

describe('Hosting CSP App Check & reCAPTCHA Enterprise Compatibility (Fase 7.2.4)', () => {
    const firebaseJsonPath = path.join(rootDir, 'firebase.json');
    const firebaseJsonContent = fs.readFileSync(firebaseJsonPath, 'utf8');
    const firebaseConfig = JSON.parse(firebaseJsonContent);

    // Localizar o header Content-Security-Policy em hosting.headers
    const hostingHeadersGroup = firebaseConfig.hosting?.headers?.find(
        (h) => h.source === '**'
    );
    const cspHeader = hostingHeadersGroup?.headers?.find(
        (h) => h.key === 'Content-Security-Policy'
    );
    const cspValue = cspHeader?.value || '';

    it('Valida que o header Content-Security-Policy existe no firebase.json', () => {
        expect(cspHeader).toBeDefined();
        expect(cspValue).toBeTruthy();
    });

    it('A. script-src contém exatamente os endpoints oficiais do reCAPTCHA Enterprise', () => {
        expect(cspValue).toMatch(/script-src[^;]*https:\/\/www\.google\.com\/recaptcha\//);
        expect(cspValue).toMatch(/script-src[^;]*https:\/\/www\.gstatic\.com\/recaptcha\//);
    });

    it('B. frame-src contém os frames oficiais do reCAPTCHA Enterprise', () => {
        expect(cspValue).toMatch(/frame-src[^;]*https:\/\/www\.google\.com\/recaptcha\//);
        expect(cspValue).toMatch(/frame-src[^;]*https:\/\/recaptcha\.google\.com\/recaptcha\//);
    });

    it('C. connect-src contém https://www.google.com/recaptcha/', () => {
        expect(cspValue).toMatch(/connect-src[^;]*https:\/\/www\.google\.com\/recaptcha\//);
    });

    it('D. connect-src continua contendo https://*.googleapis.com (que cobre recaptchaenterprise.googleapis.com)', () => {
        expect(cspValue).toMatch(/connect-src[^;]*https:\/\/\*\.googleapis\.com/);
    });

    it('E. CSP continua contendo diretivas de isolamento estrito: frame-ancestors none, object-src none, base-uri self', () => {
        expect(cspValue).toContain("frame-ancestors 'none'");
        expect(cspValue).toContain("object-src 'none'");
        expect(cspValue).toContain("base-uri 'self'");
    });

    it('F. Não foi introduzido wildcard inseguro (* amplo ou https://*.google.com amplo)', () => {
        expect(cspValue).not.toMatch(/script-src[^;]*\s\*(?!\.)/);
        expect(cspValue).not.toMatch(/connect-src[^;]*\s\*(?!\.)/);
        expect(cspValue).not.toMatch(/frame-src[^;]*\s\*(?!\.)/);
        expect(cspValue).not.toContain('https://*.google.com');
        expect(cspValue).not.toContain('https://* ');
    });

    it('G. Fontes pré-existentes de Mercado Pago, Firebase e CDN permanecem preservadas', () => {
        // Mercado Pago
        expect(cspValue).toContain('https://sdk.mercadopago.com');
        expect(cspValue).toContain('https://api.mercadopago.com');
        expect(cspValue).toContain('https://*.mercadopago.com');
        expect(cspValue).toContain('https://*.mercadolivre.com');

        // Firebase
        expect(cspValue).toContain('https://*.firebaseio.com');
        expect(cspValue).toContain('wss://*.firebaseio.com');
        expect(cspValue).toContain('https://*.firebaseapp.com');
        expect(cspValue).toContain('https://*.cloudfunctions.net');
        expect(cspValue).toContain('https://identitytoolkit.googleapis.com');
        expect(cspValue).toContain('https://securetoken.googleapis.com');

        // Bibliotecas e CDNs
        expect(cspValue).toContain('https://cdnjs.cloudflare.com');
        expect(cspValue).toContain('https://fonts.googleapis.com');
        expect(cspValue).toContain('https://fonts.gstatic.com');
    });

    it('Valida preservação dos demais headers de segurança em hosting', () => {
        const headers = hostingHeadersGroup.headers.reduce((acc, h) => {
            acc[h.key] = h.value;
            return acc;
        }, {});

        expect(headers['X-Content-Type-Options']).toBe('nosniff');
        expect(headers['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
        expect(headers['X-Frame-Options']).toBe('DENY');
        expect(headers['Permissions-Policy']).toBe('camera=(), microphone=(), geolocation=(), payment=()');
        expect(headers['Strict-Transport-Security']).toBe('max-age=31536000');
    });
});
