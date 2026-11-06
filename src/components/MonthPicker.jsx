// src/components/MonthPicker.jsx
import React, {
  useState,
  useRef,
  useEffect,
  useId,
  useCallback,
  useLayoutEffect,
} from 'react';
import { createPortal } from 'react-dom';

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

const MONTH_NAMES_FULL = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
];

const MONTH_NAMES_ABBR = [
  'jan', 'fev', 'mar', 'abr', 'mai', 'jun',
  'jul', 'ago', 'set', 'out', 'nov', 'dez'
];

const CalendarIcon = ({ className = '' }) => (
  <svg
    width={16}
    height={16}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`w-4 h-4 shrink-0 ${className}`.trim()}
    aria-hidden="true"
  >
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const ChevronLeftIcon = ({ className = '' }) => (
  <svg
    width={16}
    height={16}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`w-4 h-4 shrink-0 text-[var(--fc-text-secondary)] ${className}`.trim()}
    aria-hidden="true"
  >
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

const ChevronRightIcon = ({ className = '' }) => (
  <svg
    width={16}
    height={16}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`w-4 h-4 shrink-0 text-[var(--fc-text-secondary)] ${className}`.trim()}
    aria-hidden="true"
  >
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

/**
 * Converte valor "YYYY-MM" para { year, month } (1-12)
 */
function parseYearMonth(val) {
  if (!val || typeof val !== 'string') return null;
  const parts = val.split('-');
  if (parts.length !== 2) return null;
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (isNaN(y) || isNaN(m) || m < 1 || m > 12) return null;
  return { year: y, month: m };
}

function formatYearMonth(year, month) {
  const yStr = String(year).padStart(4, '0');
  const mStr = String(month).padStart(2, '0');
  return `${yStr}-${mStr}`;
}

export default function MonthPicker({
  value,
  onChange,
  min,
  max,
  disabled = false,
  required = false,
  id,
  name,
  className = '',
  allowClear = false,
  placeholder = 'Selecione o mês...',
  'aria-label': ariaLabel,
  ...rest
}) {
  const generatedId = useId();
  const pickerId = id || generatedId;

  const parsed = parseYearMonth(value);
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-12

  const [isOpen, setIsOpen] = useState(false);
  const [viewYear, setViewYear] = useState(parsed ? parsed.year : currentYear);
  const [focusedMonth, setFocusedMonth] = useState(parsed ? parsed.month : currentMonth);
  const [isEditingYear, setIsEditingYear] = useState(false);
  const [yearInput, setYearInput] = useState(String(viewYear));
  const [isMobile, setIsMobile] = useState(false);
  const [popoverPosition, setPopoverPosition] = useState({ top: 0, left: 0, width: 0 });

  const triggerRef = useRef(null);
  const popoverRef = useRef(null);
  const nativeInputRef = useRef(null);

  // Detecta breakpoint móvel (< 640px)
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Sincroniza ano e foco quando valor mudar
  useEffect(() => {
    if (parsed) {
      setViewYear(parsed.year);
      setFocusedMonth(parsed.month);
      setYearInput(String(parsed.year));
    }
  }, [value, parsed]);

  // Recalcula posição do popover
  const updatePosition = useCallback(() => {
    if (!triggerRef.current || isMobile) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const popoverHeight = 280;

    let top = rect.bottom + 6;
    if (spaceBelow < popoverHeight && spaceAbove > spaceBelow) {
      top = Math.max(8, rect.top - popoverHeight - 6);
    }

    setPopoverPosition({
      top,
      left: rect.left,
      width: Math.max(rect.width, 260),
    });
  }, [isMobile]);

  useIsomorphicLayoutEffect(() => {
    if (isOpen) {
      updatePosition();
    }
  }, [isOpen, updatePosition]);

  useEffect(() => {
    if (!isOpen || isMobile) return;
    const handleScrollOrResize = () => updatePosition();
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen, isMobile, updatePosition]);

  // Fecha ao clicar fora
  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (e) => {
      if (
        triggerRef.current?.contains(e.target) ||
        popoverRef.current?.contains(e.target)
      ) {
        return;
      }
      setIsOpen(false);
      setIsEditingYear(false);
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [isOpen]);

  // Intercepta Escape com Capture para fechar primeiro o MonthPicker dentro de GenericModal
  useEffect(() => {
    if (!isOpen) return;
    const handleEscapeCapture = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        setIsOpen(false);
        setIsEditingYear(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handleEscapeCapture, true);
    return () => document.removeEventListener('keydown', handleEscapeCapture, true);
  }, [isOpen]);

  const isMonthDisabled = (y, m) => {
    const ymStr = formatYearMonth(y, m);
    if (min && ymStr < min) return true;
    if (max && ymStr > max) return true;
    return false;
  };

  const handleSelectMonth = (m) => {
    if (isMonthDisabled(viewYear, m)) return;
    const nextVal = formatYearMonth(viewYear, m);
    setIsOpen(false);
    setIsEditingYear(false);
    triggerRef.current?.focus();

    if (onChange) {
      const syntheticEvent = {
        target: {
          value: nextVal,
          name: name || id || '',
          id: id || '',
        },
        currentTarget: {
          value: nextVal,
          name: name || id || '',
        },
      };
      onChange(syntheticEvent);
    }

    if (nativeInputRef.current) {
      nativeInputRef.current.value = nextVal;
      nativeInputRef.current.dispatchEvent(new Event('change', { bubbles: true }));
    }
  };

  const handleClear = () => {
    setIsOpen(false);
    setIsEditingYear(false);
    triggerRef.current?.focus();

    if (onChange) {
      const syntheticEvent = {
        target: { value: '', name: name || id || '', id: id || '' },
        currentTarget: { value: '', name: name || id || '' },
      };
      onChange(syntheticEvent);
    }
  };

  const handleSelectCurrentMonth = () => {
    setViewYear(currentYear);
    handleSelectMonth(currentMonth);
  };

  // Teclado
  const handleKeyDown = (e) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'Tab') {
      setIsOpen(false);
      setIsEditingYear(false);
      return;
    }

    if (e.key === 'ArrowRight') {
      e.preventDefault();
      setFocusedMonth((prev) => (prev < 12 ? prev + 1 : 1));
      if (focusedMonth === 12) setViewYear((y) => y + 1);
      return;
    }

    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setFocusedMonth((prev) => (prev > 1 ? prev - 1 : 12));
      if (focusedMonth === 1) setViewYear((y) => y - 1);
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedMonth((prev) => {
        const next = prev + 3;
        return next <= 12 ? next : next - 12;
      });
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedMonth((prev) => {
        const next = prev - 3;
        return next >= 1 ? next : next + 12;
      });
      return;
    }

    if (e.key === 'PageUp') {
      e.preventDefault();
      setViewYear((y) => y - 1);
      return;
    }

    if (e.key === 'PageDown') {
      e.preventDefault();
      setViewYear((y) => y + 1);
      return;
    }

    if (e.key === 'Home') {
      e.preventDefault();
      setFocusedMonth(1);
      return;
    }

    if (e.key === 'End') {
      e.preventDefault();
      setFocusedMonth(12);
      return;
    }

    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleSelectMonth(focusedMonth);
    }
  };

  const displayLabel = parsed
    ? `${MONTH_NAMES_FULL[parsed.month - 1]} de ${parsed.year}`
    : placeholder;

  const renderPopoverContent = () => (
    <div className="p-3 select-none">
      {/* Cabeçalho do Popover: Navegação de Ano */}
      <div className="flex items-center justify-between pb-3 mb-2 border-b border-[var(--fc-border-subtle)]">
        <button
          type="button"
          aria-label="Ano anterior"
          onClick={() => {
            setViewYear((y) => y - 1);
            setYearInput(String(viewYear - 1));
          }}
          className="min-w-[36px] min-h-[36px] p-2 rounded-xl text-[var(--fc-text-secondary)] hover:text-[var(--fc-text-primary)] hover:bg-[var(--fc-surface-2)] transition cursor-pointer flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--fc-focus-ring)]"
        >
          <ChevronLeftIcon />
        </button>

        {isEditingYear ? (
          <input
            type="number"
            value={yearInput}
            onChange={(e) => setYearInput(e.target.value)}
            onBlur={() => {
              const y = parseInt(yearInput, 10);
              if (!isNaN(y) && y >= 1900 && y <= 2100) setViewYear(y);
              else setYearInput(String(viewYear));
              setIsEditingYear(false);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const y = parseInt(yearInput, 10);
                if (!isNaN(y) && y >= 1900 && y <= 2100) setViewYear(y);
                else setYearInput(String(viewYear));
                setIsEditingYear(false);
              }
            }}
            autoFocus
            className="w-20 text-center font-bold text-sm bg-[var(--fc-surface-2)] border border-[var(--fc-accent)] rounded-lg text-[var(--fc-text-primary)] p-1 focus:outline-none"
          />
        ) : (
          <button
            type="button"
            onClick={() => setIsEditingYear(true)}
            title="Clique para editar o ano"
            className="font-bold text-sm text-[var(--fc-text-primary)] px-2.5 py-1 rounded-lg hover:bg-[var(--fc-surface-2)] transition cursor-pointer"
          >
            {viewYear}
          </button>
        )}

        <button
          type="button"
          aria-label="Próximo ano"
          onClick={() => {
            setViewYear((y) => y + 1);
            setYearInput(String(viewYear + 1));
          }}
          className="min-w-[36px] min-h-[36px] p-2 rounded-xl text-[var(--fc-text-secondary)] hover:text-[var(--fc-text-primary)] hover:bg-[var(--fc-surface-2)] transition cursor-pointer flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--fc-focus-ring)]"
        >
          <ChevronRightIcon />
        </button>
      </div>

      {/* Grade 4x3 de Meses */}
      <div className="grid grid-cols-4 gap-1.5 py-1">
        {MONTH_NAMES_ABBR.map((abbr, idx) => {
          const m = idx + 1;
          const isSelected = parsed && parsed.year === viewYear && parsed.month === m;
          const isCurrent = currentYear === viewYear && currentMonth === m;
          const isDisabled = isMonthDisabled(viewYear, m);
          const isFocused = isOpen && focusedMonth === m;

          return (
            <button
              key={abbr}
              type="button"
              disabled={isDisabled}
              onClick={() => handleSelectMonth(m)}
              aria-label={`${MONTH_NAMES_FULL[idx]} de ${viewYear}`}
              aria-selected={isSelected}
              className={`min-h-[44px] sm:min-h-[38px] rounded-xl text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center relative ${
                isDisabled
                  ? 'opacity-30 cursor-not-allowed text-[var(--fc-text-muted)]'
                  : isSelected
                  ? 'bg-[var(--fc-accent)] text-[var(--fc-accent-contrast)] shadow-md font-bold'
                  : isFocused
                  ? 'bg-[var(--fc-accent-soft)] text-[var(--fc-text-primary)]'
                  : 'text-[var(--fc-text-secondary)] hover:text-[var(--fc-text-primary)] hover:bg-[var(--fc-surface-2)]'
              } ${isCurrent && !isSelected ? 'ring-1 ring-[var(--fc-accent)] text-[var(--fc-accent)]' : ''}`}
            >
              {abbr}
            </button>
          );
        })}
      </div>

      {/* Atalhos: Este mês e Limpar */}
      <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-[var(--fc-border-subtle)]">
        <button
          type="button"
          onClick={handleSelectCurrentMonth}
          className="text-xs font-medium text-[var(--fc-accent)] hover:text-[var(--fc-accent-hover)] transition cursor-pointer py-1 px-2 rounded-lg hover:bg-[var(--fc-accent-soft)]"
        >
          Este mês
        </button>

        {allowClear && (
          <button
            type="button"
            onClick={handleClear}
            className="text-xs font-medium text-[var(--fc-text-muted)] hover:text-[var(--fc-text-primary)] transition cursor-pointer py-1 px-2 rounded-lg hover:bg-[var(--fc-surface-2)]"
          >
            Limpar
          </button>
        )}
      </div>
    </div>
  );

  const renderPortal = () => {
    if (!isOpen) return null;

    if (isMobile) {
      return createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-label={ariaLabel || 'Selecionar Mês'}
          className="fixed inset-0 z-[9999] flex flex-col justify-end"
        >
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          <div
            ref={popoverRef}
            className="relative z-10 w-full bg-[var(--fc-surface-1)] border-t border-[var(--fc-border-default)] rounded-t-3xl shadow-[var(--fc-shadow-lg)] p-4 motion-safe:animate-in motion-safe:slide-in-from-bottom duration-200"
          >
            <div className="flex flex-col items-center gap-1.5 pb-2 border-b border-[var(--fc-border-subtle)] mb-2">
              <div className="w-10 h-1 bg-[var(--fc-border-strong)] rounded-full" aria-hidden="true" />
              <div className="w-24 h-[2px] bg-gradient-to-r from-transparent via-[var(--fc-accent)] to-transparent opacity-60" aria-hidden="true" />
            </div>
            {renderPopoverContent()}
          </div>
        </div>,
        document.body
      );
    }

    return createPortal(
      <div
        ref={popoverRef}
        style={{
          position: 'fixed',
          top: `${popoverPosition.top}px`,
          left: `${popoverPosition.left}px`,
          width: `${popoverPosition.width}px`,
          zIndex: 9999,
        }}
        className="fc-glass-shell bg-[var(--fc-surface-1)]/95 backdrop-blur-xl border border-[var(--fc-border-default)] rounded-2xl shadow-[var(--fc-shadow-lg)] overflow-hidden motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 duration-150"
      >
        <div className="h-[2px] bg-gradient-to-r from-transparent via-[var(--fc-accent)]/60 to-transparent" aria-hidden="true" />
        {renderPopoverContent()}
      </div>,
      document.body
    );
  };

  return (
    <div className={`relative inline-block w-full ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        role="button"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-label={ariaLabel || displayLabel}
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        onKeyDown={handleKeyDown}
        className={`w-full min-h-[44px] h-[44px] px-3.5 py-2.5 rounded-xl bg-[var(--fc-surface-2)] border border-[var(--fc-border-default)] text-left flex items-center justify-between gap-2.5 transition-all cursor-pointer focus:outline-none focus:border-[var(--fc-accent)] focus:ring-2 focus:ring-[var(--fc-focus-ring)] disabled:opacity-50 disabled:cursor-not-allowed ${
          isOpen ? 'border-[var(--fc-accent)] ring-2 ring-[var(--fc-focus-ring)] shadow-[var(--fc-shadow-sm)]' : ''
        }`}
        {...rest}
      >
        <div className="flex items-center gap-2.5 truncate min-w-0">
          <CalendarIcon className={isOpen ? 'text-[var(--fc-accent)]' : 'text-[var(--fc-text-muted)]'} />
          <span
            className={`text-sm truncate capitalize ${
              !parsed ? 'text-[var(--fc-text-muted)]' : 'text-[var(--fc-text-primary)] font-medium'
            }`}
          >
            {displayLabel}
          </span>
        </div>
      </button>

      {/* Input nativo oculto e sincronizado */}
      <input
        ref={nativeInputRef}
        id={pickerId}
        name={name}
        type="month"
        value={value ?? ''}
        required={required}
        disabled={disabled}
        min={min}
        max={max}
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => {
          if (onChange) onChange(e);
        }}
        className="sr-only absolute pointer-events-none opacity-0 w-0 h-0"
      />

      {renderPortal()}
    </div>
  );
}
