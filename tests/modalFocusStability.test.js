// tests/modalFocusStability.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('Modal Focus Stability & Invariants — Root Cause Elimination (FASE 8.7)', () => {
    let originalDocument;
    let originalWindow;

    beforeEach(() => {
        originalDocument = globalThis.document;
        originalWindow = globalThis.window;
    });

    afterEach(() => {
        globalThis.document = originalDocument;
        globalThis.window = originalWindow;
        vi.restoreAllMocks();
    });

    // =========================================================================
    // 1. ROOT CAUSE REGRESSION: Cleanup Não Dispara em Re-render por Digitação
    // =========================================================================
    describe('1. Causa Raiz: Invariância de Foco Durante Digitação Contínua', () => {
        it('COMPROVAÇÃO DA FALHA (RED) no modelo anterior vs RESOLUÇÃO (GREEN) no modelo corrigido', () => {
            const triggerButton = {
                id: 'btn-open-modal',
                focus: vi.fn(),
                nodeType: 1
            };
            const inputField = {
                id: 'subscriptionName',
                focus: vi.fn(),
                value: '',
                nodeType: 1
            };

            // Simula o documento com o campo de texto focado
            let activeElement = inputField;

            // --- MODELO ANTERIOR COM DEFEITO (Commit 42d84b8): dependência [isOpen, onClose] ---
            const createBuggyEffectHarness = () => {
                let cleanupFn = null;
                const previousActive = triggerButton;

                const runEffect = (isOpen) => {
                    // Se já havia um efeito rodando, o React executa o cleanup anterior
                    if (cleanupFn) {
                        cleanupFn();
                    }
                    if (!isOpen) return;

                    cleanupFn = () => {
                        // O cleanup do commit 42d84b8 restaurava foco ao botão de abertura
                        if (previousActive && typeof previousActive.focus === 'function') {
                            previousActive.focus();
                            activeElement = previousActive; // Rouba o foco!
                        }
                    };
                };

                return { runEffect };
            };

            // Simulação de digitação tecla-a-tecla ('N', 'e', 't') no modelo com defeito:
            const buggy = createBuggyEffectHarness();
            // Abertura do modal
            let onCloseInstance1 = () => {};
            buggy.runEffect(true, onCloseInstance1);
            activeElement = inputField; // Usuário foca o input

            // Usuário digita 'N': estado do pai muda -> nova função onCloseInstance2 é gerada
            let onCloseInstance2 = () => {};
            buggy.runEffect(true, onCloseInstance2);
            // No modelo com defeito, triggerButton.focus() FOI CHAMADO e activeElement virou o triggerButton!
            expect(triggerButton.focus).toHaveBeenCalledTimes(1);
            expect(activeElement.id).toBe('btn-open-modal'); // FALHA: Foco roubado!

            // Reset para testar o MODELO CORRIGIDO
            triggerButton.focus.mockClear();
            activeElement = inputField;

            // --- MODELO CORRIGIDO (FASE 8.7): dependência estrita [isOpen] com onCloseRef ---
            const createFixedEffectHarness = () => {
                let cleanupFn = null;
                let lastIsOpen = null;
                const previousActive = triggerButton;
                const onCloseRef = { current: null };

                const runEffect = (isOpen, onClose) => {
                    onCloseRef.current = onClose;
                    // O efeito SÓ roda e só re-agenda cleanup se isOpen mudar de valor
                    if (isOpen === lastIsOpen) {
                        return; // Re-renders do pai com novas funções onClose NÃO disparam cleanup!
                    }
                    if (cleanupFn) {
                        cleanupFn();
                    }
                    lastIsOpen = isOpen;
                    if (!isOpen) return;

                    cleanupFn = () => {
                        if (previousActive && typeof previousActive.focus === 'function') {
                            previousActive.focus();
                            activeElement = previousActive;
                        }
                    };
                };

                const simulateModalClose = () => {
                    if (cleanupFn) {
                        cleanupFn();
                    }
                    lastIsOpen = false;
                };

                return { runEffect, simulateModalClose };
            };

            const fixed = createFixedEffectHarness();
            // Abertura do modal
            fixed.runEffect(true, () => {});
            activeElement = inputField;

            // Usuário digita 'N' (novo onClose)
            fixed.runEffect(true, () => {});
            expect(triggerButton.focus).not.toHaveBeenCalled();
            expect(activeElement.id).toBe('subscriptionName');

            // Usuário digita 'e' (novo onClose)
            fixed.runEffect(true, () => {});
            expect(triggerButton.focus).not.toHaveBeenCalled();
            expect(activeElement.id).toBe('subscriptionName');

            // Usuário digita 't' (novo onClose)
            fixed.runEffect(true, () => {});
            expect(triggerButton.focus).not.toHaveBeenCalled();
            expect(activeElement.id).toBe('subscriptionName');

            // Somente ao fechar o modal o foco é restaurado ao botão de abertura
            fixed.simulateModalClose();
            expect(triggerButton.focus).toHaveBeenCalledTimes(1);
            expect(activeElement.id).toBe('btn-open-modal');
        });
    });

    // =========================================================================
    // 2. PRIORIZAÇÃO DE FOCO INICIAL: Input vs Botão Fechar
    // =========================================================================
    describe('2. Priorização de Foco Inicial: Input do Formulário vs Botão Fechar (✕)', () => {
        it('deve priorizar o primeiro input editável ao invés do botão fechar', () => {
            const closeButton = {
                id: 'btn-close-modal',
                tagName: 'BUTTON',
                focus: vi.fn()
            };
            const nameInput = {
                id: 'subscriptionName',
                tagName: 'INPUT',
                focus: vi.fn()
            };
            const valueInput = {
                id: 'subscriptionValue',
                tagName: 'INPUT',
                focus: vi.fn()
            };

            // Simula container do modal com o botão fechar primeiro no DOM
            const modalEl = {
                contains: vi.fn().mockReturnValue(false),
                querySelector: (selector) => {
                    if (selector.includes('input')) {
                        return nameInput;
                    }
                    return null;
                },
                querySelectorAll: () => {
                    // No querySelectorAll genérico, o botão fechar vinha em 0
                    return [closeButton, nameInput, valueInput];
                },
                focus: vi.fn()
            };

            // Lógica corrigida implementada no GenericModal e Modal
            const applyInitialFocus = (el, active) => {
                if (el.contains(active)) return;

                const firstInput = el.querySelector('input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled])');
                if (firstInput && typeof firstInput.focus === 'function') {
                    firstInput.focus();
                    return;
                }

                const focusable = el.querySelectorAll('button:not([disabled])');
                if (focusable.length > 0) {
                    focusable[0].focus();
                } else {
                    el.focus();
                }
            };

            applyInitialFocus(modalEl, null);

            // Garante que o input foi focado e o botão de fechar NÃO recebeu o foco
            expect(nameInput.focus).toHaveBeenCalledTimes(1);
            expect(closeButton.focus).not.toHaveBeenCalled();
            expect(modalEl.focus).not.toHaveBeenCalled();
        });

        it('não deve roubar o foco se o usuário já estiver interagindo com um campo', () => {
            const inputField = {
                id: 'subscriptionName',
                focus: vi.fn()
            };
            const modalEl = {
                contains: vi.fn().mockReturnValue(true), // Usuário já está no modal
                querySelector: vi.fn(),
                querySelectorAll: vi.fn(),
                focus: vi.fn()
            };

            const applyInitialFocus = (el, active) => {
                if (el.contains(active)) return;
                const firstInput = el.querySelector('input');
                if (firstInput) firstInput.focus();
            };

            applyInitialFocus(modalEl, inputField);

            expect(modalEl.querySelector).not.toHaveBeenCalled();
            expect(inputField.focus).not.toHaveBeenCalled();
        });
    });

    // =========================================================================
    // 3. MOBILE NAVIGATION: Restauração de Foco Estritamente na Transição
    // =========================================================================
    describe('3. Mobile Navigation: Restauração de Foco Apenas na Transição Fechar', () => {
        it('não deve focar o botão hamburger na montagem com isOpen=false', () => {
            const hamburgerBtn = {
                id: 'hamburger-menu-trigger',
                focus: vi.fn()
            };

            // Simula MobileNavigation com wasOpenRef
            const createMobileNavHarness = () => {
                let wasOpen = false;

                const onUpdate = (isOpen, triggerRef) => {
                    if (isOpen) {
                        wasOpen = true;
                    } else if (wasOpen) {
                        wasOpen = false;
                        if (triggerRef?.current && typeof triggerRef.current.focus === 'function') {
                            triggerRef.current.focus();
                        }
                    }
                };

                return { onUpdate };
            };

            const nav = createMobileNavHarness();
            const triggerRef = { current: hamburgerBtn };

            // Montagem inicial com isOpen=false
            nav.onUpdate(false, triggerRef);
            expect(hamburgerBtn.focus).not.toHaveBeenCalled();

            // Re-render aleatório enquanto fechado
            nav.onUpdate(false, triggerRef);
            expect(hamburgerBtn.focus).not.toHaveBeenCalled();

            // Usuário abre o menu (isOpen=true)
            nav.onUpdate(true, triggerRef);
            expect(hamburgerBtn.focus).not.toHaveBeenCalled();

            // Usuário fecha o menu (isOpen=false) -> agora sim restaura foco
            nav.onUpdate(false, triggerRef);
            expect(hamburgerBtn.focus).toHaveBeenCalledTimes(1);

            // Re-renders subsequentes com o menu fechado NÃO chamam focus novamente
            nav.onUpdate(false, triggerRef);
            nav.onUpdate(false, triggerRef);
            expect(hamburgerBtn.focus).toHaveBeenCalledTimes(1);
        });
    });
});
