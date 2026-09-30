// src/components/Button.jsx
import React from 'react';

/**
 * Componente de Botão Padronizado do Design System FinControl (Carbon Black & Gold).
 * 
 * @param {Object} props
 * @param {'primary'|'secondary'|'danger'|'ghost'|'outline-gold'} [props.variant='primary'] - Estilo visual
 * @param {'sm'|'md'|'lg'} [props.size='md'] - Tamanho do botão
 * @param {boolean} [props.isLoading=false] - Exibe spinner de carregamento
 * @param {boolean} [props.disabled=false] - Estado desabilitado
 * @param {React.ReactNode} [props.icon] - Ícone opcional à esquerda
 * @param {React.ReactNode} props.children - Conteúdo interno
 * @param {string} [props.className=''] - Classes Tailwind adicionais
 * @param {'button'|'submit'|'reset'} [props.type='button'] - Tipo nativo do botão
 */
export default function Button({
    variant = 'primary',
    size = 'md',
    isLoading = false,
    disabled = false,
    icon,
    children,
    className = '',
    type = 'button',
    ...rest
}) {
    const baseStyles = 'inline-flex items-center justify-center font-bold transition-all duration-200 cursor-pointer select-none focus:outline-none focus:ring-2 focus:ring-[var(--fc-focus-ring)] focus:ring-offset-2 focus:ring-offset-[var(--fc-bg)] disabled:cursor-not-allowed disabled:opacity-50';

    const variantStyles = {
        primary: 'bg-[var(--fc-accent)] hover:bg-[var(--fc-accent-hover)] text-[var(--fc-accent-contrast)] shadow-lg shadow-[var(--fc-accent)]/20 active:scale-[0.98]',
        secondary: 'bg-[var(--fc-surface-2)] hover:bg-[var(--fc-surface-3)] text-[var(--fc-text-primary)] border border-[var(--fc-border-default)] font-medium active:scale-[0.98]',
        danger: 'bg-[var(--fc-danger)] hover:opacity-90 text-white shadow-lg shadow-[var(--fc-danger)]/20 active:scale-[0.98]',
        ghost: 'text-[var(--fc-text-secondary)] hover:text-[var(--fc-text-primary)] hover:bg-[var(--fc-surface-2)] font-medium',
        'outline-gold': 'bg-[var(--fc-accent-soft)] text-[var(--fc-accent)] border border-[var(--fc-accent)]/30 hover:bg-[var(--fc-accent)]/20 font-bold active:scale-[0.98]'
    };

    const sizeStyles = {
        sm: 'text-xs py-1.5 px-3 rounded-xl gap-1.5',
        md: 'text-sm py-2.5 px-5 rounded-2xl gap-2',
        lg: 'text-base py-3.5 px-6 rounded-2xl gap-2.5'
    };

    const currentVariant = variantStyles[variant] || variantStyles.primary;
    const currentSize = sizeStyles[size] || sizeStyles.md;

    return (
        <button
            type={type}
            disabled={disabled || isLoading}
            className={`${baseStyles} ${currentVariant} ${currentSize} ${className}`}
            {...rest}
        >
            {isLoading ? (
                <>
                    <svg className="animate-spin h-4 w-4 text-current" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Carregando...</span>
                </>
            ) : (
                <>
                    {icon && <span className="flex-shrink-0" aria-hidden="true">{icon}</span>}
                    {children}
                </>
            )}
        </button>
    );
}
