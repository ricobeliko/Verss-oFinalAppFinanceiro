// src/components/Select.jsx
import React, {
  useState,
  useRef,
  useEffect,
  useLayoutEffect,
  useId,
  Children,
  isValidElement,
  useCallback,
} from 'react';
import { createPortal } from 'react-dom';

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/**
 * MiniWaveIcon — Ícone identitário de 3 ondas do FinControl para itens selecionados.
 */
const MiniWaveIcon = ({ className = '' }) => (
  <svg
    width={16}
    height={16}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    className={`w-4 h-4 shrink-0 text-[var(--fc-accent)] ${className}`.trim()}
    aria-hidden="true"
  >
    <path d="M3 7c2.5-1.8 5-1.8 7.5 0s5 1.8 7.5 0" />
    <path d="M3 12c2.5-1.8 5-1.8 7.5 0s5 1.8 7.5 0" />
    <path d="M3 17c2.5-1.8 5-1.8 7.5 0s5 1.8 7.5 0" />
  </svg>
);

const ChevronIcon = ({ className = '' }) => (
  <svg
    width={16}
    height={16}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`w-4 h-4 shrink-0 text-[var(--fc-text-muted)] ${className}`.trim()}
    aria-hidden="true"
  >
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

/**
 * Converte children `<option>` ou a prop `options` em uma lista uniforme de objetos.
 */
function parseOptions(children, optionsProp) {
  if (Array.isArray(optionsProp) && optionsProp.length > 0) {
    return optionsProp.map((opt) =>
      typeof opt === 'object'
        ? { value: String(opt.value ?? ''), label: opt.label ?? String(opt.value ?? ''), disabled: Boolean(opt.disabled) }
        : { value: String(opt), label: String(opt), disabled: false }
    );
  }

  const items = [];
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    if (child.type === 'option') {
      const val = child.props.value !== undefined ? String(child.props.value) : String(child.props.children ?? '');
      const label = child.props.children ? String(child.props.children) : val;
      items.push({
        value: val,
        label,
        disabled: Boolean(child.props.disabled),
      });
    }
  });
  return items;
}

/**
 * Select — Componente de seleção próprio com tema Abyss / Crisp Teal,
 * acessibilidade WAI-ARIA combobox/listbox, bottom-sheet em mobile e portal seguro para modais.
 */
export default function Select({
  value,
  onChange,
  children,
  options: optionsProp,
  placeholder = 'Selecione...',
  disabled = false,
  required = false,
  id,
  name,
  className = '',
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  ...rest
}) {
  const generatedId = useId();
  const selectId = id || generatedId;
  const listboxId = `${selectId}-listbox`;

  const options = parseOptions(children, optionsProp);
  const selectedOption = options.find((o) => String(o.value) === String(value));

  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [popoverPosition, setPopoverPosition] = useState({ top: 0, left: 0, width: 0, placement: 'bottom' });
  const [isMobile, setIsMobile] = useState(false);

  const triggerRef = useRef(null);
  const popoverRef = useRef(null);
  const nativeSelectRef = useRef(null);
  const searchTimeoutRef = useRef(null);
  const searchStringRef = useRef('');

  // Detecta breakpoint móvel (< 640px)
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Recalcula posição do popover (getBoundingClientRect com auto-flip)
  const updatePosition = useCallback(() => {
    if (!triggerRef.current || isMobile) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const popoverHeight = 260; // Altura estimada do popover com scroll

    let placement = 'bottom';
    let top = rect.bottom + 6;

    if (spaceBelow < popoverHeight && spaceAbove > spaceBelow) {
      placement = 'top';
      top = Math.max(8, rect.top - popoverHeight - 6);
    }

    setPopoverPosition({
      top,
      left: rect.left,
      width: Math.max(rect.width, 180),
      placement,
    });
  }, [isMobile]);

  useIsomorphicLayoutEffect(() => {
    if (isOpen) {
      updatePosition();
    }
  }, [isOpen, updatePosition]);

  // Atualiza posição no scroll ou resize
  useEffect(() => {
    if (!isOpen || isMobile) return;
    const handleScrollOrResize = () => {
      updatePosition();
    };
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen, isMobile, updatePosition]);

  // Sincroniza índice destacado ao abrir
  useEffect(() => {
    if (isOpen) {
      const idx = options.findIndex((o) => String(o.value) === String(value));
      setHighlightedIndex(idx >= 0 ? idx : 0);
    }
  }, [isOpen, value, options]);

  // Fecha ao clicar fora do trigger e do popover
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDownOutside = (e) => {
      if (
        triggerRef.current?.contains(e.target) ||
        popoverRef.current?.contains(e.target)
      ) {
        return;
      }
      setIsOpen(false);
    };

    document.addEventListener('pointerdown', handlePointerDownOutside);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDownOutside);
    };
  }, [isOpen]);

  // Intercepta Escape com Capture para fechar PRIMEIRO o Select dentro de GenericModal
  useEffect(() => {
    if (!isOpen) return;

    const handleEscapeCapture = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleEscapeCapture, true);
    return () => {
      document.removeEventListener('keydown', handleEscapeCapture, true);
    };
  }, [isOpen]);

  // Seleção de uma opção
  const handleSelectOption = (opt) => {
    if (opt.disabled) return;
    setIsOpen(false);
    triggerRef.current?.focus();

    if (onChange) {
      const syntheticEvent = {
        target: {
          value: opt.value,
          name: name || id || '',
          id: id || '',
        },
        currentTarget: {
          value: opt.value,
          name: name || id || '',
        },
      };
      onChange(syntheticEvent);
    }

    if (nativeSelectRef.current) {
      nativeSelectRef.current.value = opt.value;
      nativeSelectRef.current.dispatchEvent(new Event('change', { bubbles: true }));
    }
  };

  // Navegação por teclado
  const handleKeyDown = (e) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'Tab') {
      setIsOpen(false);
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => {
        let next = prev + 1;
        while (next < options.length && options[next].disabled) {
          next++;
        }
        return next < options.length ? next : prev;
      });
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => {
        let next = prev - 1;
        while (next >= 0 && options[next].disabled) {
          next--;
        }
        return next >= 0 ? next : prev;
      });
      return;
    }

    if (e.key === 'Home') {
      e.preventDefault();
      const firstValid = options.findIndex((o) => !o.disabled);
      if (firstValid >= 0) setHighlightedIndex(firstValid);
      return;
    }

    if (e.key === 'End') {
      e.preventDefault();
      for (let i = options.length - 1; i >= 0; i--) {
        if (!options[i].disabled) {
          setHighlightedIndex(i);
          break;
        }
      }
      return;
    }

    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < options.length) {
        handleSelectOption(options[highlightedIndex]);
      }
      return;
    }

    // Type-ahead: busca por caractere digitado
    if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
      clearTimeout(searchTimeoutRef.current);
      searchStringRef.current += e.key.toLowerCase();
      searchTimeoutRef.current = setTimeout(() => {
        searchStringRef.current = '';
      }, 500);

      const matchIdx = options.findIndex(
        (o) => !o.disabled && o.label.toLowerCase().startsWith(searchStringRef.current)
      );
      if (matchIdx >= 0) {
        setHighlightedIndex(matchIdx);
      }
    }
  };

  // Garante foco no trigger quando a label nativa for clicada
  const handleNativeFocus = () => {
    triggerRef.current?.focus();
  };

  const displayText = selectedOption ? selectedOption.label : placeholder;
  const isPlaceholder = !selectedOption;

  // Renderização do Popover/Bottom-Sheet no Portal
  const renderList = () => {
    if (!isOpen) return null;

    const listContent = (
      <div
        id={listboxId}
        role="listbox"
        aria-label={ariaLabel || 'Opções de seleção'}
        tabIndex={-1}
        className="overflow-y-auto max-h-64 py-1.5 focus:outline-none custom-scrollbar"
      >
        {options.map((opt, index) => {
          const isSelected = String(opt.value) === String(value);
          const isHighlighted = index === highlightedIndex;

          return (
            <div
              key={`${opt.value}-${index}`}
              id={`${selectId}-option-${index}`}
              role="option"
              aria-selected={isSelected}
              aria-disabled={opt.disabled}
              onClick={() => handleSelectOption(opt)}
              onMouseEnter={() => !opt.disabled && setHighlightedIndex(index)}
              className={`min-h-[44px] px-3.5 py-2.5 rounded-xl flex items-center justify-between text-sm transition-colors cursor-pointer select-none mx-1.5 ${
                opt.disabled
                  ? 'opacity-40 cursor-not-allowed text-[var(--fc-text-muted)]'
                  : isHighlighted
                  ? 'bg-[var(--fc-accent-soft)] text-[var(--fc-text-primary)] font-medium'
                  : 'text-[var(--fc-text-secondary)] hover:text-[var(--fc-text-primary)]'
              } ${isSelected ? 'font-semibold text-[var(--fc-accent)]' : ''}`}
            >
              <span className="truncate pr-2">{opt.label}</span>
              {isSelected && <MiniWaveIcon />}
            </div>
          );
        })}
      </div>
    );

    // MODO MOBILE (< 640px): Bottom Sheet com touch targets >= 44px
    if (isMobile) {
      return createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-label={ariaLabel || 'Opções'}
          className="fixed inset-0 z-[9999] flex flex-col justify-end"
        >
          {/* Backdrop escuro com blur */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          {/* Bottom Sheet com cantos arredondados e onda sutil */}
          <div
            ref={popoverRef}
            className="relative z-10 w-full max-h-[80vh] bg-[var(--fc-surface-1)] border-t border-[var(--fc-border-default)] rounded-t-3xl shadow-[var(--fc-shadow-lg)] p-4 flex flex-col motion-safe:animate-in motion-safe:slide-in-from-bottom duration-200"
          >
            {/* Linha decorativa de onda e drag handle */}
            <div className="flex flex-col items-center gap-1.5 pb-2 border-b border-[var(--fc-border-subtle)] mb-2">
              <div className="w-10 h-1 bg-[var(--fc-border-strong)] rounded-full" aria-hidden="true" />
              <div className="w-24 h-[2px] bg-gradient-to-r from-transparent via-[var(--fc-accent)] to-transparent opacity-60" aria-hidden="true" />
            </div>

            {listContent}
          </div>
        </div>,
        document.body
      );
    }

    // MODO DESKTOP / TABLET (>= 640px): Popover posicionado em Portal com auto-flip
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
        {/* Linha decorativa de onda no topo do popover */}
        <div className="h-[2px] bg-gradient-to-r from-transparent via-[var(--fc-accent)]/60 to-transparent" aria-hidden="true" />
        {listContent}
      </div>,
      document.body
    );
  };

  return (
    <div className={`relative inline-block w-full ${className}`}>
      {/* Trigger Button com estética de vidro e identidade Abyss/Crisp Teal */}
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-activedescendant={
          isOpen && highlightedIndex >= 0 ? `${selectId}-option-${highlightedIndex}` : undefined
        }
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        onKeyDown={handleKeyDown}
        className={`w-full min-h-[44px] h-[44px] px-3.5 py-2.5 rounded-xl bg-[var(--fc-surface-2)] border border-[var(--fc-border-default)] text-left flex items-center justify-between gap-2.5 transition-all cursor-pointer focus:outline-none focus:border-[var(--fc-accent)] focus:ring-2 focus:ring-[var(--fc-focus-ring)] disabled:opacity-50 disabled:cursor-not-allowed ${
          isOpen ? 'border-[var(--fc-accent)] ring-2 ring-[var(--fc-focus-ring)] shadow-[var(--fc-shadow-sm)]' : ''
        }`}
        {...rest}
      >
        <span
          className={`truncate text-sm ${
            isPlaceholder ? 'text-[var(--fc-text-muted)]' : 'text-[var(--fc-text-primary)] font-medium'
          }`}
        >
          {displayText}
        </span>
        <ChevronIcon
          className={`w-4 h-4 text-[var(--fc-text-muted)] transition-transform duration-200 shrink-0 ${
            isOpen ? 'rotate-180 text-[var(--fc-accent)]' : ''
          }`}
        />
      </button>

      {/* Select nativo oculto e sincronizado para validação HTML5 de formulário e labels associadas */}
      <select
        ref={nativeSelectRef}
        id={id}
        name={name}
        value={value ?? ''}
        required={required}
        disabled={disabled}
        tabIndex={-1}
        aria-hidden="true"
        onFocus={handleNativeFocus}
        onChange={(e) => {
          if (onChange) onChange(e);
        }}
        className="sr-only absolute pointer-events-none opacity-0 w-0 h-0"
      >
        {required && <option value="">{placeholder}</option>}
        {options.map((opt, idx) => (
          <option key={`${opt.value}-${idx}`} value={opt.value} disabled={opt.disabled}>
            {opt.label}
          </option>
        ))}
      </select>

      {/* Portal Popover / Bottom Sheet */}
      {renderList()}
    </div>
  );
}
