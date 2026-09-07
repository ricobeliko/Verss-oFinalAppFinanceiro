// src/design-system/primitives/TextField.jsx
import React, { useId } from 'react';

/**
 * Design System 2.0 — TextField Primitive
 * 
 * @param {Object} props
 * @param {string} [props.label]
 * @param {string} [props.id]
 * @param {string} [props.error]
 * @param {string} [props.helperText]
 * @param {React.ReactNode} [props.prefix]
 * @param {React.ReactNode} [props.suffix]
 * @param {boolean} [props.disabled=false]
 * @param {boolean} [props.required=false]
 * @param {string} [props.className='']
 */
export default function TextField({
  label,
  id,
  error,
  helperText,
  prefix,
  suffix,
  disabled = false,
  required = false,
  className = '',
  ...rest
}) {
  const generatedId = useId();
  const inputId = id || `fc-field-${generatedId}`;
  const errorId = `${inputId}-error`;
  const helperId = `${inputId}-helper`;

  const describedBy = error ? errorId : helperText ? helperId : undefined;

  return (
    <div className={`w-full flex flex-col ${className}`}>
      {label && (
        <label
          htmlFor={inputId}
          className="text-xs font-semibold text-[var(--fc-text-secondary)] mb-1.5 flex items-center justify-between select-none"
        >
          <span>
            {label}
            {required && <span className="text-[var(--fc-accent)] ml-1" aria-hidden="true">*</span>}
          </span>
        </label>
      )}

      <div className="relative w-full flex items-center">
        {prefix && (
          <span
            className="absolute left-3.5 flex items-center justify-center text-sm font-medium text-[var(--fc-text-muted)] pointer-events-none select-none"
            aria-hidden="true"
          >
            {prefix}
          </span>
        )}

        <input
          id={inputId}
          disabled={disabled}
          required={required}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={describedBy}
          className={`
            w-full min-h-[44px] px-3.5 py-2.5 rounded-xl text-sm font-medium
            bg-[var(--fc-surface-1)] text-[var(--fc-text-primary)]
            placeholder:text-[var(--fc-text-muted)]
            border transition-all duration-200
            ${prefix ? 'pl-11' : ''}
            ${suffix ? 'pr-11' : ''}
            ${error
              ? 'border-[var(--fc-danger)] focus:ring-2 focus:ring-[var(--fc-danger)]/30 focus:border-[var(--fc-danger)]'
              : 'border-[var(--fc-border-default)] focus:border-[var(--fc-accent)] focus:ring-2 focus:ring-[var(--fc-focus-ring)]'
            }
            focus:outline-none
            disabled:opacity-40 disabled:cursor-not-allowed disabled:bg-[var(--fc-surface-2)]
          `}
          {...rest}
        />

        {suffix && (
          <span
            className="absolute right-3.5 flex items-center justify-center text-sm font-medium text-[var(--fc-text-muted)] pointer-events-none select-none"
            aria-hidden="true"
          >
            {suffix}
          </span>
        )}
      </div>

      {error ? (
        <p
          id={errorId}
          role="alert"
          className="mt-1.5 text-xs font-medium text-[var(--fc-danger)] flex items-center gap-1"
        >
          <span aria-hidden="true">⚠</span>
          <span>{error}</span>
        </p>
      ) : helperText ? (
        <p
          id={helperId}
          className="mt-1.5 text-xs text-[var(--fc-text-muted)]"
        >
          {helperText}
        </p>
      ) : null}
    </div>
  );
}
