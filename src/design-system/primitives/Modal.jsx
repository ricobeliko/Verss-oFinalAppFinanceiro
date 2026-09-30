// src/design-system/primitives/Modal.jsx
import React, { useEffect, useRef } from 'react';
import { FiX } from 'react-icons/fi';

/**
 * Design System 2.0 — Modal Primitive
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen
 * @param {Function} props.onClose
 * @param {string} [props.title]
 * @param {React.ReactNode} props.children
 * @param {React.ReactNode} [props.footer]
 * @param {string} [props.maxWidth='max-w-lg']
 * @param {string} [props.className='']
 */
export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  maxWidth = 'max-w-lg',
  className = '',
}) {
  const modalRef = useRef(null);
  const previousActiveElementRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return;

    previousActiveElementRef.current = document.activeElement;

    const focusableSelector = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

    // Delay focus slightly so the modal element is attached to DOM
    const timer = setTimeout(() => {
      if (modalRef.current) {
        if (modalRef.current.contains(document.activeElement)) {
          return;
        }

        // Prioritize first editable input control
        const firstInput = modalRef.current.querySelector('input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled])');
        if (firstInput && typeof firstInput.focus === 'function') {
          firstInput.focus();
          return;
        }

        const focusable = modalRef.current.querySelectorAll(focusableSelector);
        if (focusable.length > 0) {
          focusable[0].focus();
        } else {
          modalRef.current.focus();
        }
      }
    }, 40);

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

  useEffect(() => {
    if (!isOpen) return;

    const focusableSelector = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCloseRef.current?.();
        return;
      }

      if (e.key === 'Tab' && modalRef.current) {
        const focusables = Array.from(modalRef.current.querySelectorAll(focusableSelector));
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-md fc-animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Card */}
      <div
        ref={modalRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'fc-modal-title' : undefined}
        className={`
          relative z-10 w-full ${maxWidth}
          bg-[var(--fc-surface-1)] border border-[var(--fc-border-strong)]
          rounded-3xl shadow-[var(--fc-shadow-lg)] p-6 sm:p-7
          text-[var(--fc-text-primary)] fc-animate-scale-up outline-none
          focus-visible:ring-2 focus-visible:ring-[var(--fc-focus-ring)]
          ${className}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 mb-5 border-b border-[var(--fc-border-subtle)]">
          {title && (
            <h3
              id="fc-modal-title"
              className="text-lg sm:text-xl font-bold tracking-tight text-[var(--fc-text-primary)]"
            >
              {title}
            </h3>
          )}

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar modal"
            className="min-w-[44px] min-h-[44px] p-2.5 rounded-xl bg-[var(--fc-surface-2)] text-[var(--fc-text-secondary)] hover:text-[var(--fc-text-primary)] hover:bg-[var(--fc-surface-3)] flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--fc-focus-ring)]"
          >
            <FiX className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Body */}
        <div className="mb-6 space-y-4">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--fc-border-subtle)]">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
