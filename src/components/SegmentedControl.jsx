// src/components/SegmentedControl.jsx
import React, { useRef, useId, useCallback } from 'react';
import usePrefersReducedMotion from '../hooks/usePrefersReducedMotion';

/**
 * Controle segmentado acessível com indicador deslizante por transform.
 *
 * Garante:
 * - Conformidade total com WAI-ARIA (role="radiogroup" e role="radio").
 * - Navegação por teclado com setas (ArrowLeft, ArrowRight, ArrowUp, ArrowDown, Home, End).
 * - Zona de toque recomendada (min-h-[44px] e min-w-[44px]).
 * - Transição suave do indicador acelerada por hardware (transform) sem layout shift.
 * - Respeito automático a prefers-reduced-motion (sem animação de translação).
 *
 * @param {Object} props
 * @param {Array<{ id: string, label: string, icon?: React.ReactNode, ariaLabel?: string }>} props.options
 * @param {string} props.value - ID da opção selecionada
 * @param {(id: string) => void} props.onChange - Callback disparado na troca
 * @param {string} [props.name] - Nome do grupo
 * @param {string} [props.ariaLabel='Opções'] - Rótulo acessível do grupo
 * @param {string} [props.className=''] - Classes adicionais
 */
export default function SegmentedControl({
  options = [],
  value,
  onChange,
  name,
  ariaLabel = 'Opções',
  className = '',
}) {
  const generatedId = useId();
  const groupName = name || `seg-ctrl-${generatedId}`;
  const containerRef = useRef(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  const selectedIndex = options.findIndex((opt) => opt.id === value);
  const activeIndex = selectedIndex >= 0 ? selectedIndex : 0;

  const handleKeyDown = useCallback(
    (e) => {
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key)) {
        return;
      }

      e.preventDefault();
      const count = options.length;
      if (count === 0) return;

      let nextIndex = activeIndex;

      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        nextIndex = (activeIndex + 1) % count;
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        nextIndex = (activeIndex - 1 + count) % count;
      } else if (e.key === 'Home') {
        nextIndex = 0;
      } else if (e.key === 'End') {
        nextIndex = count - 1;
      }

      const nextOption = options[nextIndex];
      if (nextOption && onChange) {
        onChange(nextOption.id);
        const buttons = containerRef.current?.querySelectorAll('button[role="radio"]');
        if (buttons && buttons[nextIndex]) {
          buttons[nextIndex].focus();
        }
      }
    },
    [activeIndex, options, onChange]
  );

  const count = options.length;
  const pillWidthPercent = count > 0 ? 100 / count : 100;
  const pillTranslateXPercent = activeIndex * 100;

  return (
    <div
      ref={containerRef}
      role="radiogroup"
      aria-label={ariaLabel}
      onKeyDown={handleKeyDown}
      className={`relative inline-flex items-center p-1 bg-[var(--fc-surface-1)] border border-[var(--fc-border-default)] rounded-2xl select-none shadow-sm ${className}`}
    >
      {/* Indicador Deslizante Acelerado por GPU */}
      {count > 0 && (
        <div
          aria-hidden="true"
          style={{
            width: `calc(${pillWidthPercent}% - 8px)`,
            transform: `translateX(calc(${pillTranslateXPercent}% + 4px))`,
          }}
          className={`absolute top-1 bottom-1 left-0 rounded-xl bg-[var(--fc-surface-2)] border border-[var(--fc-accent)]/20 shadow-sm pointer-events-none ${
            prefersReducedMotion ? '' : 'transition-transform duration-200 ease-out'
          }`}
        />
      )}

      {/* Botões de Opção */}
      {options.map((option) => {
        const isSelected = option.id === value;
        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            name={groupName}
            aria-checked={isSelected}
            tabIndex={isSelected ? 0 : -1}
            aria-label={option.ariaLabel || option.label}
            onClick={() => onChange && onChange(option.id)}
            className={`relative z-10 flex-1 min-h-[44px] min-w-[44px] px-3.5 py-2 inline-flex items-center justify-center gap-1.5 text-xs font-semibold rounded-xl cursor-pointer transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--fc-focus-ring)] ${
              isSelected
                ? 'text-[var(--fc-text-primary)] font-bold'
                : 'text-[var(--fc-text-secondary)] hover:text-[var(--fc-text-primary)]'
            }`}
          >
            {option.icon && <span className="shrink-0">{option.icon}</span>}
            <span>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
