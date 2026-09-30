// src/features/dashboard/shell/AppTopbar.jsx
import React from 'react';
import NotificationCenterPopover from '../../../components/NotificationCenterPopover';

const SearchIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const MenuIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="18" x2="21" y2="18" />
  </svg>
);

const SunIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="5" />
    <line x1="12" y1="1" x2="12" y2="3" />
    <line x1="12" y1="21" x2="12" y2="23" />
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <line x1="1" y1="12" x2="3" y2="12" />
    <line x1="21" y1="12" x2="23" y2="12" />
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  </svg>
);

const MoonIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

const FinControlLogo = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default function AppTopbar({
  onOpenSearch,
  theme,
  onToggleTheme,
  onOpenMobileMenu,
  mobileMenuTriggerRef,
}) {
  return (
    <header className="sticky top-0 z-20 bg-[var(--fc-bg-subtle)]/90 backdrop-blur-md border-b border-[var(--fc-border-subtle)] h-16 px-4 sm:px-6 flex items-center justify-between gap-4 transition-colors">
      {/* Botão Hamburger e Logo Mobile */}
      <div className="flex items-center gap-2 lg:hidden">
        <button
          ref={mobileMenuTriggerRef}
          type="button"
          onClick={onOpenMobileMenu}
          aria-label="Abrir menu de navegação"
          className="min-w-[44px] min-h-[44px] p-2.5 rounded-xl text-[var(--fc-text-secondary)] hover:text-[var(--fc-text-primary)] hover:bg-[var(--fc-surface-1)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--fc-focus-ring)] cursor-pointer flex items-center justify-center"
        >
          <MenuIcon />
        </button>

        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[var(--fc-surface-2)] text-[var(--fc-accent)] border border-[var(--fc-border-subtle)] flex items-center justify-center shrink-0">
            <FinControlLogo />
          </div>
          <span className="font-semibold text-sm text-[var(--fc-text-primary)]">
            FinControl
          </span>
        </div>
      </div>

      {/* Gatilho de Busca Global (Desktop & Mobile) */}
      <div className="flex-1 max-w-md">
        <button
          type="button"
          onClick={onOpenSearch}
          aria-label="Abrir busca global de lançamentos (Buscar no FinControl...)"
          className="w-full flex items-center justify-between gap-3 px-3.5 py-2 rounded-xl bg-[var(--fc-surface-1)] hover:bg-[var(--fc-surface-2)] border border-[var(--fc-border-default)] text-xs text-[var(--fc-text-muted)] hover:text-[var(--fc-text-secondary)] transition-all cursor-pointer shadow-[var(--fc-shadow-sm)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--fc-focus-ring)]"
        >
          <div className="flex items-center gap-2.5 truncate">
            <span className="text-[var(--fc-text-muted)] shrink-0">
              <SearchIcon />
            </span>
            <span className="truncate">Buscar no FinControl...</span>
          </div>

          <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 text-[10px] font-mono font-semibold rounded bg-[var(--fc-surface-2)] text-[var(--fc-text-muted)] border border-[var(--fc-border-subtle)]">
            Ctrl K
          </kbd>
        </button>
      </div>

      {/* Ações da Direita: Notificações & Alternador de Tema */}
      <div className="flex items-center gap-2 sm:gap-3">
        <NotificationCenterPopover />

        <button
          type="button"
          onClick={onToggleTheme}
          aria-label="Alternar tema"
          className="min-w-[44px] min-h-[44px] p-2.5 rounded-xl text-[var(--fc-text-secondary)] hover:text-[var(--fc-text-primary)] hover:bg-[var(--fc-surface-1)] border border-[var(--fc-border-subtle)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--fc-focus-ring)] cursor-pointer flex items-center justify-center"
        >
          {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
        </button>
      </div>
    </header>
  );
}
