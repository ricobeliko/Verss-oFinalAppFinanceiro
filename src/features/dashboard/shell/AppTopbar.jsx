// src/features/dashboard/shell/AppTopbar.jsx
import React, { useState, useEffect, useRef } from 'react';
import Badge from '../../../design-system/primitives/Badge';
import TopNavPill from './TopNavPill';

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

const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 6h18" />
    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
  </svg>
);

const LogoutIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" x2="9" y1="12" y2="12" />
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
  activePage,
  onSelectPage,
  onPrefetch = () => {},
  onOpenSearch,
  theme,
  onToggleTheme,
  onOpenMobileMenu,
  mobileMenuTriggerRef,
  currentUser,
  isPro,
  isTrialActive,
  onOpenDeleteModal,
  onLogout,
}) {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && isProfileOpen) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isProfileOpen]);

  const userInitial = currentUser?.email?.[0]?.toUpperCase() || 'U';

  const planBadge = isPro ? (
    <Badge variant="accent">Pro</Badge>
  ) : isTrialActive ? (
    <Badge variant="neutral">Teste Pro ativo</Badge>
  ) : (
    <Badge variant="neutral">Free</Badge>
  );

  return (
    <header className="sticky top-0 z-30 fc-glass-shell border-b border-[var(--fc-border-subtle)] transition-colors will-change-transform">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
        {/* Esquerda: Menu Mobile + Logotipo FinControl */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            ref={mobileMenuTriggerRef}
            type="button"
            onClick={onOpenMobileMenu}
            aria-label="Abrir menu de navegação"
            className="md:hidden min-w-[44px] min-h-[44px] p-2.5 rounded-xl text-[var(--fc-text-secondary)] hover:text-[var(--fc-text-primary)] hover:bg-[var(--fc-surface-1)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--fc-focus-ring)] cursor-pointer flex items-center justify-center"
          >
            <MenuIcon />
          </button>

          <div className="flex items-center gap-2.5 select-none">
            <div className="w-8 h-8 rounded-xl bg-[var(--fc-surface-2)] text-[var(--fc-accent)] border border-[var(--fc-border-subtle)] flex items-center justify-center shrink-0">
              <FinControlLogo className="w-4 h-4" />
            </div>
            <span className="font-semibold text-base tracking-tight text-[var(--fc-text-primary)] hidden xs:inline">
              FinControl
            </span>
          </div>
        </div>

        {/* Centro: Barra de Navegação Superior (TopNavPill no Desktop >= 768px) */}
        <div className="hidden md:flex flex-1 justify-center px-2">
          <TopNavPill
            activePage={activePage}
            onSelectPage={onSelectPage}
            onPrefetch={onPrefetch}
          />
        </div>

        {/* Direita: Busca, Tema & Perfil do Usuário */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Gatilho de Busca Global */}
          <button
            type="button"
            onClick={onOpenSearch}
            aria-label="Abrir busca global de lançamentos (Buscar no FinControl...)"
            className="min-h-[44px] flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--fc-surface-1)] hover:bg-[var(--fc-surface-2)] border border-[var(--fc-border-default)] text-xs text-[var(--fc-text-muted)] hover:text-[var(--fc-text-secondary)] transition-all cursor-pointer shadow-[var(--fc-shadow-sm)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--fc-focus-ring)]"
          >
            <SearchIcon />
            <span className="hidden xl:inline truncate">Buscar no FinControl...</span>
            <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono font-semibold rounded bg-[var(--fc-surface-2)] text-[var(--fc-text-muted)] border border-[var(--fc-border-subtle)]">
              Ctrl K
            </kbd>
          </button>

          {/* Alternador de Tema */}
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label="Alternar tema"
            className="min-w-[44px] min-h-[44px] p-2.5 rounded-xl text-[var(--fc-text-secondary)] hover:text-[var(--fc-text-primary)] hover:bg-[var(--fc-surface-1)] border border-[var(--fc-border-subtle)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--fc-focus-ring)] cursor-pointer flex items-center justify-center"
          >
            {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
          </button>

          {/* Menu de Perfil / Conta do Usuário */}
          <div className="relative" ref={profileRef}>
            <button
              type="button"
              onClick={() => setIsProfileOpen((prev) => !prev)}
              aria-label="Abrir menu de perfil do usuário"
              aria-expanded={isProfileOpen}
              aria-haspopup="true"
              className="min-w-[44px] min-h-[44px] p-1.5 rounded-xl hover:bg-[var(--fc-surface-1)] transition-colors cursor-pointer flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--fc-focus-ring)]"
            >
              <div className="w-8 h-8 rounded-lg bg-[var(--fc-accent-soft)] text-[var(--fc-accent)] font-bold text-xs flex items-center justify-center shrink-0 border border-[var(--fc-accent)]/20">
                {userInitial}
              </div>
            </button>

            {/* Dropdown do Menu de Perfil */}
            {isProfileOpen && (
              <div
                role="menu"
                aria-label="Opções da conta"
                className="absolute right-0 top-12 w-64 rounded-xl bg-[var(--fc-surface-1)] border border-[var(--fc-border-default)] shadow-[var(--fc-shadow-lg)] p-2 z-50 fc-popover-enter"
              >
                <div className="px-3 py-2 border-b border-[var(--fc-border-subtle)] mb-1">
                  <p className="text-[11px] text-[var(--fc-text-muted)]">Logado como</p>
                  <p className="text-xs font-medium text-[var(--fc-text-primary)] truncate">
                    {currentUser?.email || 'Usuário'}
                  </p>
                  <div className="mt-1.5 flex items-center justify-between">
                    <span className="text-[11px] text-[var(--fc-text-muted)]">Plano</span>
                    {planBadge}
                  </div>
                </div>

                <div className="py-1 space-y-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      onToggleTheme(e);
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-lg text-[var(--fc-text-secondary)] hover:text-[var(--fc-text-primary)] hover:bg-[var(--fc-surface-2)] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--fc-focus-ring)]"
                  >
                    <span className="flex items-center gap-2.5">
                      {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
                      {theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileOpen(false);
                      onOpenDeleteModal?.();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-lg text-[var(--fc-danger)] hover:bg-[var(--fc-danger-soft)] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--fc-focus-ring)]"
                  >
                    <TrashIcon />
                    <span>Excluir conta</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileOpen(false);
                      onLogout?.();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-lg text-[var(--fc-text-secondary)] hover:text-[var(--fc-text-primary)] hover:bg-[var(--fc-surface-2)] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--fc-focus-ring)]"
                  >
                    <LogoutIcon />
                    <span>Sair da conta</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Navegação Mobile (< 768px): TopNavPill horizontal scrollable */}
      <div className="md:hidden px-3 py-2 border-t border-[var(--fc-border-subtle)] flex justify-center overflow-x-auto no-scrollbar">
        <TopNavPill
          activePage={activePage}
          onSelectPage={onSelectPage}
          onPrefetch={onPrefetch}
        />
      </div>
    </header>
  );
}
