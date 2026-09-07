// src/design-system/primitives/Button.jsx
import React from 'react';

/**
 * Design System 2.0 — Button Primitive
 * 
 * @param {Object} props
 * @param {'primary'|'secondary'|'ghost'|'danger'} [props.variant='primary']
 * @param {'sm'|'md'|'lg'} [props.size='md']
 * @param {boolean} [props.isLoading=false]
 * @param {boolean} [props.disabled=false]
 * @param {React.ReactNode} [props.icon]
 * @param {React.ReactNode} props.children
 * @param {string} [props.className='']
 * @param {'button'|'submit'|'reset'} [props.type='button']
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
  const baseStyles = 'relative inline-flex items-center justify-center font-medium select-none cursor-pointer transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--fc-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--fc-bg)] disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none motion-safe:active:scale-[0.98]';

  const variantStyles = {
    primary: 'bg-gradient-to-r from-[var(--fc-accent)] to-[var(--fc-accent-hover)] text-[var(--fc-accent-contrast)] font-bold shadow-md hover:opacity-95',
    secondary: 'bg-[var(--fc-surface-2)] text-[var(--fc-text-primary)] border border-[var(--fc-border-default)] hover:bg-[var(--fc-surface-3)] hover:border-[var(--fc-border-strong)] font-semibold',
    ghost: 'bg-transparent text-[var(--fc-text-secondary)] hover:text-[var(--fc-text-primary)] hover:bg-[var(--fc-surface-2)] font-medium',
    danger: 'bg-[var(--fc-danger)] text-white hover:opacity-95 font-semibold shadow-md',
  };

  const sizeStyles = {
    sm: 'min-h-[44px] min-w-[44px] px-3.5 py-2 text-xs rounded-xl gap-2',
    md: 'min-h-[44px] min-w-[44px] px-5 py-2.5 text-sm rounded-xl gap-2.5',
    lg: 'min-h-[48px] min-w-[48px] px-6 py-3.5 text-base rounded-2xl gap-3',
  };

  const selectedVariant = variantStyles[variant] || variantStyles.primary;
  const selectedSize = sizeStyles[size] || sizeStyles.md;

  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      aria-disabled={disabled || isLoading ? 'true' : undefined}
      aria-busy={isLoading ? 'true' : undefined}
      className={`${baseStyles} ${selectedVariant} ${selectedSize} ${className}`}
      {...rest}
    >
      {isLoading ? (
        <span className="inline-flex items-center justify-center gap-2">
          <svg
            className="motion-safe:animate-spin h-4 w-4 text-current"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span>Carregando...</span>
        </span>
      ) : (
        <>
          {icon && <span className="shrink-0 flex items-center justify-center" aria-hidden="true">{icon}</span>}
          <span>{children}</span>
        </>
      )}
    </button>
  );
}
