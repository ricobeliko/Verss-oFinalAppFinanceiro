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

    useEffect(() => {
        if (!isOpen) return;

        previousActiveElementRef.current = document.activeElement;

        const focusableElementsSelector = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

        const timer = setTimeout(() => {
            const modalEl = modalRef.current;
            if (modalEl) {
                const focusable = modalEl.querySelectorAll(focusableElementsSelector);
                if (focusable.length > 0) {
                    focusable[0].focus();
                } else {
                    modalEl.focus();
                }
            }
        }, 30);

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                e.stopPropagation();
                onClose();
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
            clearTimeout(timer);
            document.removeEventListener('keydown', handleKeyDown);
            if (previousActiveElementRef.current && typeof previousActiveElementRef.current.focus === 'function') {
                previousActiveElementRef.current.focus();
            }
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop com desfoque e escurecimento profundo para perfeito contraste */}
            <div 
                className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity animate-fadeIn" 
                onClick={onClose}
                aria-hidden="true"
            ></div>

            {/* Caixa do Modal com fundo sólido de carbono, borda elegante e cantos bem arredondados */}
            <div 
                ref={modalRef}
                tabIndex={-1}
                role="dialog"
                aria-modal="true"
                aria-labelledby={title ? "generic-modal-title" : undefined}
                className={`relative z-10 w-full ${maxWidth} bg-[#141414] border border-[#3A3A3A] rounded-3xl shadow-2xl p-6 sm:p-8 text-gray-200 animate-scaleUp outline-none focus-visible:ring-2 focus-visible:ring-gold/50`}
            >
                
                {/* Cabeçalho */}
                <div className="flex items-center justify-between pb-4 mb-6 border-b border-[#2A2A2A]">
                    {title && (
                        <h3 id="generic-modal-title" className="text-xl font-bold text-[#FFF3D6] tracking-tight">
                            {title}
                        </h3>
                    )}
                    <button 
                        type="button"
                        onClick={onClose}
                        aria-label="Fechar modal"
                        className="w-8 h-8 rounded-full bg-[#2A2A2A] text-gray-400 hover:text-white flex items-center justify-center transition cursor-pointer focus:outline-none focus:ring-2 focus:ring-gold/50"
                    >
                        <span aria-hidden="true">✕</span>
                    </button>
                </div>

                {/* Conteúdo */}
                <div className="space-y-4 mb-6">
                    {children}
                    {message && <p className="text-gray-300 text-sm leading-relaxed">{message}</p>}
                </div>

                {/* Rodapé de Confirmação (caso seja modal de deletar/confirmar) */}
                {isConfirmation && (
                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#2A2A2A]">
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
}