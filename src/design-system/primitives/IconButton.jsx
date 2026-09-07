// src/design-system/primitives/IconButton.jsx
import React from 'react';

/**
 * Design System 2.0 — IconButton Primitive
 * 
 * @param {Object} props
 * @param {'secondary'|'ghost'|'danger'|'accent'} [props.variant='secondary']
 * @param {boolean} [props.disabled=false]
 * @param {string} props.ariaLabel - Required accessible description
 * @param {React.ReactNode} props.icon - Required icon element
 * @param {string} [props.className='']
 * @param {'button'|'submit'|'reset'} [props.type='button']
 */
export default function IconButton({
  variant = 'secondary',
  disabled = false,
  ariaLabel,
  icon,
  className = '',
  type = 'button',
  ...rest
}) {
  if (!ariaLabel) {
    console.warn('[DS2 IconButton] `ariaLabel` is mandatory for accessible icon-only buttons.');
  }

  const baseStyles = 'min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-xl p-2.5 select-none cursor-pointer transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--fc-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--fc-bg)] disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none motion-safe:active:scale-[0.95]';

  const variantStyles = {
    secondary: 'bg-[var(--fc-surface-2)] text-[var(--fc-text-primary)] border border-[var(--fc-border-default)] hover:bg-[var(--fc-surface-3)] hover:border-[var(--fc-border-strong)]',
    ghost: 'bg-transparent text-[var(--fc-text-secondary)] hover:text-[var(--fc-text-primary)] hover:bg-[var(--fc-surface-2)]',
    accent: 'bg-[var(--fc-accent-soft)] text-[var(--fc-accent)] border border-[var(--fc-accent)]/20 hover:bg-[var(--fc-accent)]/20',
    danger: 'bg-[var(--fc-danger-soft)] text-[var(--fc-danger)] border border-[var(--fc-danger)]/20 hover:bg-[var(--fc-danger)]/20',
  };

  const selectedVariant = variantStyles[variant] || variantStyles.secondary;

  return (
    <button
      type={type}
      disabled={disabled}
      aria-disabled={disabled ? 'true' : undefined}
      aria-label={ariaLabel}
      className={`${baseStyles} ${selectedVariant} ${className}`}
      {...rest}
    >
      <span className="shrink-0 flex items-center justify-center text-base" aria-hidden="true">
        {icon}
      </span>
    </button>
  );
}
