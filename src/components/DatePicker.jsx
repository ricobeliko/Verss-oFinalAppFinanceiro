// src/components/DatePicker.jsx
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
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const MONTH_NAMES_ABBR = [
  'jan', 'fev', 'mar', 'abr', 'mai', 'jun',
  'jul', 'ago', 'set', 'out', 'nov', 'dez'
];

const WEEKDAY_NAMES = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

export const CalendarIcon = ({ className = '' }) => (
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
 * Converte valor "YYYY-MM-DD" para { year, month, day } (mês 1-12) de forma estritamente local e sem bugs de fuso.
 */
function parseDateParts(val) {
  if (!val || typeof val !== 'string') return null;
  const parts = val.split('-');
  if (parts.length !== 3) return null;
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  const d = parseInt(parts[2], 10);
  if (isNaN(y) || isNaN(m) || isNaN(d) || m < 1 || m > 12 || d < 1 || d > 31) return null;
  return { year: y, month: m, day: d };
}

function formatDateParts(year, month, day) {
  const yStr = String(year).padStart(4, '0');
  const mStr = String(month).padStart(2, '0');
  const dStr = String(day).padStart(2, '0');
  return `${yStr}-${mStr}-${dStr}`;
}

function getTodayParts() {
  const now = new Date();
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate(),
  };
}

function getDaysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

function getFirstDayOfWeek(year, month) {
  return new Date(year, month - 1, 1).getDay();
}

export default function DatePicker({
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
  placeholder = 'Selecione a data...',
  'aria-label': ariaLabel,
  ...rest
}) {
  const generatedId = useId();
  const pickerId = id || generatedId;

  const parsed = parseDateParts(value);
  const today = getTodayParts();

  const [isOpen, setIsOpen] = useState(false);
  const [viewYear, setViewYear] = useState(parsed ? parsed.year : today.year);
  const [viewMonth, setViewMonth] = useState(parsed ? parsed.month : today.month);
  const [focusedDay, setFocusedDay] = useState(parsed ? parsed.day : today.day);
  const [viewMode, setViewMode] = useState('days'); // 'days' | 'months'
  const [isMobile, setIsMobile] = useState(false);
  const [popoverPosition, setPopoverPosition] = useState({ top: 0, left: 0, width: 0 });

  const triggerRef = useRef(null);
  const popoverRef = useRef(null);
  const nativeInputRef = useRef(null);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (parsed) {
      setViewYear(parsed.year);
      setViewMonth(parsed.month);
      setFocusedDay(parsed.day);
    }
  }, [value, parsed]);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current || isMobile) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const popoverHeight = 350;

    let top = rect.bottom + 6;
    if (spaceBelow < popoverHeight && spaceAbove > spaceBelow) {
      top = Math.max(8, rect.top - popoverHeight - 6);
    }

    setPopoverPosition({
      top,
      left: rect.left,
      width: Math.max(rect.width, 290),
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
      setViewMode('days');
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleEscapeCapture = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        setIsOpen(false);
        setViewMode('days');
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handleEscapeCapture, true);
    return () => document.removeEventListener('keydown', handleEscapeCapture, true);
  }, [isOpen]);

  const isDateDisabled = (y, m, d) => {
    const dateStr = formatDateParts(y, m, d);
    if (min && dateStr < min) return true;
    if (max && dateStr > max) return true;
    return false;
  };

  const handleSelectDay = (d) => {
    if (isDateDisabled(viewYear, viewMonth, d)) return;
    const nextVal = formatDateParts(viewYear, viewMonth, d);
    setIsOpen(false);
    setViewMode('days');
    triggerRef.current?.focus();

    if (onChange) {
      const syntheticEvent = {
        target: { value: nextVal, name: name || id || '', id: id || '' },
        currentTarget: { value: nextVal, name: name || id || '' },
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
    setViewMode('days');
    triggerRef.current?.focus();

    if (onChange) {
      const syntheticEvent = {
        target: { value: '', name: name || id || '', id: id || '' },
        currentTarget: { value: '', name: name || id || '' },
      };
      onChange(syntheticEvent);
    }
  };

  const handleSelectToday = () => {
    setViewYear(today.year);
    setViewMonth(today.month);
    handleSelectDay(today.day);
  };

  const handlePrevMonth = () => {
    if (viewMonth === 1) {
      setViewYear((y) => y - 1);
      setViewMonth(12);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 12) {
      setViewYear((y) => y + 1);
      setViewMonth(1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  // Navegação por teclado
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
      setViewMode('days');
      return;
    }

    const daysCount = getDaysInMonth(viewYear, viewMonth);

    if (e.key === 'ArrowRight') {
      e.preventDefault();
      if (focusedDay < daysCount) {
        setFocusedDay((d) => d + 1);
      } else {
        handleNextMonth();
        setFocusedDay(1);
      }
      return;
    }

    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      if (focusedDay > 1) {
        setFocusedDay((d) => d - 1);
      } else {
        handlePrevMonth();
        setFocusedDay(getDaysInMonth(viewMonth === 1 ? viewYear - 1 : viewYear, viewMonth === 1 ? 12 : viewMonth - 1));
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (focusedDay + 7 <= daysCount) {
        setFocusedDay((d) => d + 7);
      } else {
        handleNextMonth();
        setFocusedDay((d) => (d + 7) - daysCount);
      }
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (focusedDay - 7 >= 1) {
        setFocusedDay((d) => d - 7);
      } else {
        handlePrevMonth();
        const prevDays = getDaysInMonth(viewMonth === 1 ? viewYear - 1 : viewYear, viewMonth === 1 ? 12 : viewMonth - 1);
        setFocusedDay((d) => prevDays - (7 - d));
      }
      return;
    }

    if (e.key === 'PageUp') {
      e.preventDefault();
      handlePrevMonth();
      return;
    }

    if (e.key === 'PageDown') {
      e.preventDefault();
      handleNextMonth();
      return;
    }

    if (e.key === 'Home') {
      e.preventDefault();
      setFocusedDay(1);
      return;
    }

    if (e.key === 'End') {
      e.preventDefault();
      setFocusedDay(daysCount);
      return;
    }

    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleSelectDay(focusedDay);
    }
  };

  const displayLabel = parsed
    ? `${String(parsed.day).padStart(2, '0')}/${String(parsed.month).padStart(2, '0')}/${parsed.year}`
    : placeholder;

  const renderDaysView = () => {
    const daysInMonth = getDaysInMonth(viewYear, viewMonth);
    const firstDayIndex = getFirstDayOfWeek(viewYear, viewMonth);
    const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const blanksArray = Array.from({ length: firstDayIndex }, (_, i) => i);

    return (
      <div className="p-3 select-none">
        {/* Cabeçalho do Mês e Ano */}
        <div className="flex items-center justify-between pb-3 mb-2 border-b border-[var(--fc-border-subtle)]">
          <button
            type="button"
            aria-label="Mês anterior"
            onClick={handlePrevMonth}
            className="min-w-[36px] min-h-[36px] p-2 rounded-xl text-[var(--fc-text-secondary)] hover:text-[var(--fc-text-primary)] hover:bg-[var(--fc-surface-2)] transition cursor-pointer flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--fc-focus-ring)]"
          >
            <ChevronLeftIcon />
          </button>

          <button
            type="button"
            onClick={() => setViewMode('months')}
            title="Alternar para seleção de mês/ano"
            className="font-bold text-sm text-[var(--fc-text-primary)] px-2.5 py-1 rounded-lg hover:bg-[var(--fc-surface-2)] transition cursor-pointer flex items-center gap-1.5"
          >
            <span>{MONTH_NAMES_FULL[viewMonth - 1]} de {viewYear}</span>
            <span className="text-[10px] text-[var(--fc-accent)]">▾</span>
          </button>

          <button
            type="button"
            aria-label="Próximo mês"
            onClick={handleNextMonth}
            className="min-w-[36px] min-h-[36px] p-2 rounded-xl text-[var(--fc-text-secondary)] hover:text-[var(--fc-text-primary)] hover:bg-[var(--fc-surface-2)] transition cursor-pointer flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--fc-focus-ring)]"
          >
            <ChevronRightIcon />
          </button>
        </div>

        {/* Nomes dos Dias da Semana (dom a sáb) */}
        <div className="grid grid-cols-7 gap-1 text-center mb-1">
          {WEEKDAY_NAMES.map((nameStr) => (
            <span key={nameStr} className="text-[11px] font-semibold text-[var(--fc-text-muted)] uppercase tracking-wider py-1">
              {nameStr}
            </span>
          ))}
        </div>

        {/* Grade de Dias */}
        <div className="grid grid-cols-7 gap-1">
          {blanksArray.map((b) => (
            <div key={`blank-${b}`} className="w-9 h-9" />
          ))}

          {daysArray.map((d) => {
            const isSelected = parsed && parsed.year === viewYear && parsed.month === viewMonth && parsed.day === d;
            const isToday = today.year === viewYear && today.month === viewMonth && today.day === d;
            const isDisabled = isDateDisabled(viewYear, viewMonth, d);
            const isFocused = isOpen && focusedDay === d;

            return (
              <button
                key={d}
                type="button"
                disabled={isDisabled}
                onClick={() => handleSelectDay(d)}
                aria-label={`${d} de ${MONTH_NAMES_FULL[viewMonth - 1]} de ${viewYear}`}
                aria-selected={isSelected}
                className={`w-9 h-9 rounded-xl text-xs font-medium transition-all cursor-pointer flex items-center justify-center relative mx-auto ${
                  isDisabled
                    ? 'opacity-30 cursor-not-allowed text-[var(--fc-text-muted)]'
                    : isSelected
                    ? 'bg-[var(--fc-accent)] text-[var(--fc-accent-contrast)] shadow-md font-bold'
                    : isFocused
                    ? 'bg-[var(--fc-accent-soft)] text-[var(--fc-text-primary)]'
                    : 'text-[var(--fc-text-primary)] hover:bg-[var(--fc-surface-2)]'
                } ${isToday && !isSelected ? 'ring-1 ring-[var(--fc-accent)] text-[var(--fc-accent)] font-semibold' : ''}`}
              >
                {d}
              </button>
            );
          })}
        </div>

        {/* Atalhos: Hoje e Limpar */}
        <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-[var(--fc-border-subtle)]">
          <button
            type="button"
            onClick={handleSelectToday}
            className="text-xs font-medium text-[var(--fc-accent)] hover:text-[var(--fc-accent-hover)] transition cursor-pointer py-1 px-2 rounded-lg hover:bg-[var(--fc-accent-soft)]"
          >
            Hoje
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
  };

  const renderMonthsView = () => (
    <div className="p-3 select-none">
      <div className="flex items-center justify-between pb-3 mb-2 border-b border-[var(--fc-border-subtle)]">
        <button
          type="button"
          aria-label="Ano anterior"
          onClick={() => setViewYear((y) => y - 1)}
          className="min-w-[36px] min-h-[36px] p-2 rounded-xl text-[var(--fc-text-secondary)] hover:text-[var(--fc-text-primary)] hover:bg-[var(--fc-surface-2)] transition cursor-pointer flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--fc-focus-ring)]"
        >
          <ChevronLeftIcon />
        </button>

        <span className="font-bold text-sm text-[var(--fc-text-primary)]">
          {viewYear}
        </span>

        <button
          type="button"
          aria-label="Próximo ano"
          onClick={() => setViewYear((y) => y + 1)}
          className="min-w-[36px] min-h-[36px] p-2 rounded-xl text-[var(--fc-text-secondary)] hover:text-[var(--fc-text-primary)] hover:bg-[var(--fc-surface-2)] transition cursor-pointer flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--fc-focus-ring)]"
        >
          <ChevronRightIcon />
        </button>
      </div>

      <div className="grid grid-cols-4 gap-1.5 py-1">
        {MONTH_NAMES_ABBR.map((abbr, idx) => {
          const m = idx + 1;
          const isSelected = viewMonth === m;

          return (
            <button
              key={abbr}
              type="button"
              onClick={() => {
                setViewMonth(m);
                setViewMode('days');
              }}
              className={`min-h-[40px] rounded-xl text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center ${
                isSelected
                  ? 'bg-[var(--fc-accent)] text-[var(--fc-accent-contrast)] shadow-md font-bold'
                  : 'text-[var(--fc-text-secondary)] hover:text-[var(--fc-text-primary)] hover:bg-[var(--fc-surface-2)]'
              }`}
            >
              {abbr}
            </button>
          );
        })}
      </div>

      <div className="pt-2 mt-2 border-t border-[var(--fc-border-subtle)] text-center">
        <button
          type="button"
          onClick={() => setViewMode('days')}
          className="text-xs font-medium text-[var(--fc-accent)] hover:underline cursor-pointer"
        >
          Voltar para dias
        </button>
      </div>
    </div>
  );

  const renderPortal = () => {
    if (!isOpen) return null;

    const content = viewMode === 'days' ? renderDaysView() : renderMonthsView();

    if (isMobile) {
      return createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-label={ariaLabel || 'Selecionar Data'}
          className="fixed inset-0 z-[9999] flex flex-col justify-end"
        >
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => {
              setIsOpen(false);
              setViewMode('days');
            }}
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
            {content}
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
        {content}
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
            className={`text-sm truncate ${
              !parsed ? 'text-[var(--fc-text-muted)]' : 'text-[var(--fc-text-primary)] font-medium font-mono'
            }`}
          >
            {displayLabel}
          </span>
        </div>
      </button>

      {/* Input nativo oculto e sincronizado para formulários HTML5 */}
      <input
        ref={nativeInputRef}
        id={pickerId}
        name={name}
        type="date"
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
