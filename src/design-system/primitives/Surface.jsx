// src/design-system/primitives/Surface.jsx
import React from 'react';

/**
 * Design System 2.0 — Surface Primitive
 * 
 * @param {Object} props
 * @param {'default'|'elevated'|'interactive'} [props.variant='default']
 * @param {'none'|'sm'|'md'|'lg'} [props.padding='md']
 * @param {React.ElementType} [props.as='div']
 * @param {React.ReactNode} props.children
 * @param {string} [props.className='']
 */
export default function Surface({
  variant = 'default',
  padding = 'md',
  as = 'div',
  children,
  className = '',
  ...rest
}) {
  const baseStyles = 'rounded-2xl border transition-all duration-200';

  const variantStyles = {
    default: 'bg-[var(--fc-surface-1)] border-[var(--fc-border-default)] shadow-[var(--fc-shadow-sm)] text-[var(--fc-text-primary)]',
    elevated: 'bg-[var(--fc-surface-2)] border-[var(--fc-border-strong)] shadow-[var(--fc-shadow-md)] text-[var(--fc-text-primary)]',
    interactive: 'bg-[var(--fc-surface-1)] border-[var(--fc-border-default)] shadow-[var(--fc-shadow-sm)] hover:border-[var(--fc-accent)]/40 hover:shadow-[var(--fc-shadow-md)] motion-safe:hover:-translate-y-0.5 cursor-pointer text-[var(--fc-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--fc-focus-ring)]',
  };

  const paddingStyles = {
    none: 'p-0',
    sm: 'p-3.5 sm:p-4',
    md: 'p-5 sm:p-6',
    lg: 'p-7 sm:p-8',
  };

  const selectedVariant = variantStyles[variant] || variantStyles.default;
  const selectedPadding = paddingStyles[padding] || paddingStyles.md;

  return React.createElement(
    as,
    {
      className: `${baseStyles} ${selectedVariant} ${selectedPadding} ${className}`,
      ...rest,
    },
    children
  );
}
