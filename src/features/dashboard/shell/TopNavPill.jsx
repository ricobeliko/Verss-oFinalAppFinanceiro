// src/features/dashboard/shell/TopNavPill.jsx
import React, { useRef, useState, useLayoutEffect, useEffect, useCallback } from 'react';
import usePrefersReducedMotion from '../../../hooks/usePrefersReducedMotion';

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

const HomeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);

const UsersIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const CreditCardIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect width="20" height="14" x="2" y="5" rx="2" />
    <line x1="2" x2="22" y1="10" y2="10" />
  </svg>
);

const ActivityIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </svg>
);

const RepeatIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="17 1 21 5 17 9" />
    <path d="M3 11V9a4 4 0 0 1 4-4h14" />
    <polyline points="7 23 3 19 7 15" />
    <path d="M21 13v2a4 4 0 0 1-4 4H3" />
  </svg>
);

const NAV_ITEMS = [
  { id: 'resumo', label: 'Resumo', icon: <HomeIcon /> },
  { id: 'pessoas', label: 'Pessoas', icon: <UsersIcon /> },
  { id: 'cards', label: 'Cartões', icon: <CreditCardIcon /> },
  { id: 'transactions', label: 'Movimentações', icon: <ActivityIcon /> },
  { id: 'subscriptions', label: 'Assinaturas', icon: <RepeatIcon /> },
];

export default function TopNavPill({
  activePage,
  onSelectPage,
  onPrefetch = () => {},
  className = '',
}) {
  const containerRef = useRef(null);
  const buttonRefs = useRef({});
  const prefersReducedMotion = usePrefersReducedMotion();

  const [indicatorStyle, setIndicatorStyle] = useState({
    left: 0,
    width: 0,
    ready: false,
  });

  const updateIndicator = useCallback(() => {
    const container = containerRef.current;
    const activeButton = buttonRefs.current[activePage];
    if (!container || !activeButton) return;

    const containerRect = container.getBoundingClientRect();
    const activeRect = activeButton.getBoundingClientRect();

    setIndicatorStyle({
      left: activeRect.left - containerRect.left + container.scrollLeft,
      width: activeRect.width,
      ready: true,
    });
  }, [activePage]);

  useIsomorphicLayoutEffect(() => {
    updateIndicator();
  }, [updateIndicator]);

  useEffect(() => {
    const handleResize = () => updateIndicator();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [updateIndicator]);

  // Suporte a teclado acessível (Setas Esquerda/Direita)
  const handleKeyDown = (e, index) => {
    let nextIndex = null;
    if (e.key === 'ArrowRight') {
      nextIndex = (index + 1) % NAV_ITEMS.length;
    } else if (e.key === 'ArrowLeft') {
      nextIndex = (index - 1 + NAV_ITEMS.length) % NAV_ITEMS.length;
    }

    if (nextIndex !== null) {
      e.preventDefault();
      const nextTab = NAV_ITEMS[nextIndex];
      const nextButton = buttonRefs.current[nextTab.id];
      if (nextButton) {
        nextButton.focus();
        onPrefetch(nextTab.id);
        onSelectPage(nextTab.id);
      }
    }
  };

  return (
    <nav
      aria-label="Navegação principal"
      className={`relative inline-flex items-center max-w-full overflow-x-auto no-scrollbar ${className}`}
    >
      <div
        ref={containerRef}
        role="tablist"
        aria-orientation="horizontal"
        className="relative flex items-center gap-1 p-1 rounded-full fc-glass-shell border border-[var(--fc-border-subtle)] shadow-[var(--fc-shadow-sm)] bg-[var(--fc-surface-1)]/75 backdrop-blur-md shrink-0"
      >
        {/* Indicador deslizante (Pill ativa) com aceleração por GPU */}
        <div
          aria-hidden="true"
          className={`absolute top-1 bottom-1 rounded-full bg-[var(--fc-accent-soft)] border border-[var(--fc-accent)]/30 shadow-sm pointer-events-none will-change-transform ${
            prefersReducedMotion ? '' : 'transition-[transform,width,opacity] duration-250 ease-[cubic-bezier(0.16,1,0.3,1)]'
          }`}
          style={{
            transform: `translateX(${indicatorStyle.left}px)`,
            width: `${indicatorStyle.width}px`,
            opacity: indicatorStyle.ready ? 1 : 0,
          }}
        />

        {NAV_ITEMS.map((tab, idx) => {
          const isActive = activePage === tab.id;

          return (
            <button
              key={tab.id}
              ref={(el) => {
                buttonRefs.current[tab.id] = el;
              }}
              type="button"
              id={`nav-tab-${tab.id}`}
              aria-current={isActive ? 'page' : undefined}
              aria-label={tab.label}
              onClick={() => onSelectPage(tab.id)}
              onMouseEnter={() => onPrefetch(tab.id)}
              onFocus={() => onPrefetch(tab.id)}
              onTouchStart={() => onPrefetch(tab.id)}
              onKeyDown={(e) => handleKeyDown(e, idx)}
              className={`relative z-10 min-h-[44px] min-w-[44px] px-3.5 sm:px-4 py-2 rounded-full flex items-center justify-center gap-2 text-xs sm:text-sm font-medium transition-colors cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--fc-focus-ring)] ${
                isActive
                  ? 'text-[var(--fc-accent)] font-semibold'
                  : 'text-[var(--fc-text-secondary)] hover:text-[var(--fc-text-primary)]'
              }`}
            >
              <span
                className={`shrink-0 transition-colors ${
                  isActive ? 'text-[var(--fc-accent)]' : 'text-[var(--fc-text-muted)]'
                }`}
              >
                {tab.icon}
              </span>
              <span className="whitespace-nowrap">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
