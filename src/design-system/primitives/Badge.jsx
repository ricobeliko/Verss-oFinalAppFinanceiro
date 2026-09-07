// src/design-system/primitives/Badge.jsx
import React from 'react';

/**
 * Design System 2.0 — Badge Primitive (Non-interactive)
 * 
 * @param {Object} props
 * @param {'neutral'|'accent'|'success'|'warning'|'danger'|'info'} [props.variant='neutral']
 * @param {React.ReactNode} [props.icon]
 * @param {React.ReactNode} props.children
 * @param {string} [props.className='']
 */
export default function Badge({
  variant = 'neutral',
  icon,
  children,
  className = '',
  ...rest
}) {
  const baseStyles = 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold tracking-wide select-none pointer-events-none border';

  const variantStyles = {
    neutral: 'bg-[var(--fc-surface-2)] text-[var(--fc-text-secondary)] border-[var(--fc-border-default)]',
    accent: 'bg-[var(--fc-accent-soft)] text-[var(--fc-accent)] border-[var(--fc-accent)]/30',
    success: 'bg-[var(--fc-success-soft)] text-[var(--fc-success)] border-[var(--fc-success)]/30',
    warning: 'bg-[var(--fc-warning-soft)] text-[var(--fc-warning)] border-[var(--fc-warning)]/30',
    danger: 'bg-[var(--fc-danger-soft)] text-[var(--fc-danger)] border-[var(--fc-danger)]/30',
    info: 'bg-[var(--fc-info-soft)] text-[var(--fc-info)] border-[var(--fc-info)]/30',
  };

  const selectedVariant = variantStyles[variant] || variantStyles.neutral;

  return (
    <span
      className={`${baseStyles} ${selectedVariant} ${className}`}
      {...rest}
    >
      {icon && <span className="shrink-0 flex items-center justify-center text-[10px]" aria-hidden="true">{icon}</span>}
      <span>{children}</span>
    </span>
  );
}
