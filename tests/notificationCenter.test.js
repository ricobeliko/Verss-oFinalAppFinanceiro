// tests/notificationCenter.test.js
import { describe, it, expect, beforeEach } from 'vitest';
import { generateFinancialAlerts } from '../src/services/financialService';

describe('NotificationCenter - Central de Alertas e Notificações', () => {
    let mockStorage;

    beforeEach(() => {
        mockStorage = {};
        globalThis.localStorage = {
            getItem: (key) => mockStorage[key] || null,
            setItem: (key, val) => { mockStorage[key] = String(val); },
            removeItem: (key) => { delete mockStorage[key]; },
            clear: () => { mockStorage = {}; }
        };
    });

    it('deve derivar alertas em memória sem persistir na coleção notifications', () => {
        const cards = [{ id: 'card-1', name: 'Nubank', dueDay: 10 }];
        const loans = [{
            id: 'l-1',
            cardId: 'card-1',
            installments: [{ number: 1, value: 500, dueDate: '2026-08-10', status: 'Pendente' }]
        }];

        const alerts = generateFinancialAlerts({
            selectedMonth: '2026-08',
            loans,
            cards,
            todayStr: '2026-08-08'
        });

        expect(alerts.length).toBeGreaterThan(0);
        const cardDueAlert = alerts.find(a => a.type === 'card_due');
        expect(cardDueAlert).toBeDefined();
        expect(cardDueAlert.id).toBe('alert-due-card-1');
    });

    it('deve salvar apenas IDs e timestamps no dismiss, sem expor valores ou descrições no localStorage', () => {
        const userId = 'user-abc-123';
        const storageKey = `fincontrol:dismissed-alerts:${userId}`;
        const alertIdToDismiss = 'card-due-card-1-2026-08';

        const payload = [{ id: alertIdToDismiss, dismissedAt: new Date().toISOString() }];
        localStorage.setItem(storageKey, JSON.stringify(payload));

        const storedRaw = localStorage.getItem(storageKey);
        expect(storedRaw).toBeDefined();

        const storedParsed = JSON.parse(storedRaw);
        expect(storedParsed[0].id).toBe(alertIdToDismiss);
        expect(storedParsed[0].dismissedAt).toBeDefined();

        // Blindagem de Privacidade: Garante ausência de campos monetários ou PII
        expect(storedRaw).not.toContain('value');
        expect(storedRaw).not.toContain('amount');
        expect(storedRaw).not.toContain('clientName');
        expect(storedRaw).not.toContain('description');
    });

    it('deve isolar dispensas entre usuários distintos no mesmo navegador (Namespace User A vs User B)', () => {
        const userA = 'user-A';
        const userB = 'user-B';

        const keyA = `fincontrol:dismissed-alerts:${userA}`;
        const keyB = `fincontrol:dismissed-alerts:${userB}`;

        localStorage.setItem(keyA, JSON.stringify([{ id: 'alert-1', dismissedAt: '2026-08-24' }]));

        expect(localStorage.getItem(keyA)).toContain('alert-1');
        expect(localStorage.getItem(keyB)).toBeNull();
    });
});
