// src/components/GenericModal.jsx
import React, { useEffect, useRef } from 'react';
import Button from './Button';

export default function GenericModal({ 
    isOpen, 
    onClose, 
    title, 
    children, 
    message, 
    onConfirm, 
    isConfirmation = false, 
    maxWidth = 'max-w-lg' 
}) {
    const modalRef = useRef(null);
    const previousActiveElementRef = useRef(null);
    const onCloseRef = useRef(onClose);
    onCloseRef.current = onClose;

    // Gerencia o foco inicial ao abrir o modal e a restauração ao fechar
    useEffect(() => {
        if (!isOpen) return;

        previousActiveElementRef.current = document.activeElement;

        const focusableElementsSelector = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

        const timer = setTimeout(() => {
            const modalEl = modalRef.current;
            if (modalEl) {
                // Se o foco já estiver dentro do modal (usuário já interagindo com um campo), não rouba o foco
                if (modalEl.contains(document.activeElement)) {
                    return;
                }

                // Prioriza o primeiro campo editável de entrada (input, select, textarea)
                const firstInput = modalEl.querySelector('input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled])');
                if (firstInput && typeof firstInput.focus === 'function') {
                    firstInput.focus();
                    return;
                }

                const focusable = modalEl.querySelectorAll(focusableElementsSelector);
                if (focusable.length > 0) {
                    focusable[0].focus();
                } else {
                    modalEl.focus();
                }
            }
        }, 30);

        return () => {
            clearTimeout(timer);
            if (
                previousActiveElementRef.current &&
                typeof previousActiveElementRef.current.focus === 'function' &&
                document.contains(previousActiveElementRef.current)
            ) {
                previousActiveElementRef.current.focus();
            }
        };
    }, [isOpen]);

    // Gerencia eventos de teclado (Escape e Tab Trap) enquanto o modal estiver aberto
    useEffect(() => {
        if (!isOpen) return;

        const focusableElementsSelector = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                e.stopPropagation();
                onCloseRef.current?.();
                return;
            }

            if (e.key === 'Tab' && modalRef.current) {
                const focusables = Array.from(modalRef.current.querySelectorAll(focusableElementsSelector));
                if (focusables.length === 0) {
                    e.preventDefault();
                    return;
                }
                const first = focusables[0];
                const last = focusables[focusables.length - 1];

                if (e.shiftKey) {
                    if (document.activeElement === first || document.activeElement === modalRef.current) {
                        e.preventDefault();
                        last.focus();
                    }
                } else {
                    if (document.activeElement === last) {
                        e.preventDefault();
                        first.focus();
                    }
                }
            }
        };

        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const modalContent = (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop com desfoque e escurecimento profundo para perfeito contraste */}
            <div 
                className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity animate-fadeIn" 
                onClick={onClose}
                aria-hidden="true"
            ></div>

            {/* Caixa do Modal com fundo semântico, borda elegante e cantos bem arredondados */}
            <div 
                ref={modalRef}
                tabIndex={-1}
                role="dialog"
                aria-modal="true"
                aria-labelledby={title ? "generic-modal-title" : undefined}
                className={`relative z-10 w-full ${maxWidth} bg-[var(--fc-surface-1)] border border-[var(--fc-border-default)] rounded-3xl shadow-[var(--fc-shadow-lg)] p-6 sm:p-8 text-[var(--fc-text-primary)] animate-scaleUp outline-none focus-visible:ring-2 focus-visible:ring-[var(--fc-focus-ring)]`}
            >
                
                {/* Cabeçalho */}
                <div className="flex items-center justify-between pb-4 mb-6 border-b border-[var(--fc-border-subtle)]">
                    {title && (
                        <h3 id="generic-modal-title" className="text-xl font-bold text-[var(--fc-text-primary)] tracking-tight">
                            {title}
                        </h3>
                    )}
                    <button 
                        type="button"
                        onClick={onClose}
                        aria-label="Fechar modal"
                        className="w-8 h-8 rounded-full bg-[var(--fc-surface-2)] text-[var(--fc-text-secondary)] hover:text-[var(--fc-text-primary)] hover:bg-[var(--fc-surface-3)] flex items-center justify-center transition cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--fc-focus-ring)]"
                    >
                        <span aria-hidden="true">✕</span>
                    </button>
                </div>

                {/* Conteúdo */}
                <div className="space-y-4 mb-6">
                    {children}
                    {message && <p className="text-[var(--fc-text-secondary)] text-sm leading-relaxed">{message}</p>}
                </div>

                {/* Rodapé de Confirmação (caso seja modal de deletar/confirmar) */}
                {isConfirmation && (
                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--fc-border-subtle)]">
                        <Button 
                            variant="secondary" 
                            size="md" 
                            onClick={onClose}
                        >
                            Cancelar
                        </Button>
                        <Button 
                            variant="danger" 
                            size="md" 
                            onClick={onConfirm}
                        >
                            Confirmar
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );

    return modalContent;
}