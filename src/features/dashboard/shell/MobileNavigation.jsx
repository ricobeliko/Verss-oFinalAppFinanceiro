// src/features/dashboard/shell/MobileNavigation.jsx
import React, { useEffect, useRef } from 'react';
import Badge from '../../../design-system/primitives/Badge';

const HomeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);

const UsersIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const CreditCardIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect width="20" height="14" x="2" y="5" rx="2" />
    <line x1="2" x2="22" y1="10" y2="10" />
  </svg>
);

const ActivityIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </svg>
);

const RepeatIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="17 1 21 5 17 9" />
    <path d="M3 11V9a4 4 0 0 1 4-4h14" />
    <polyline points="7 23 3 19 7 15" />
    <path d="M21 13v2a4 4 0 0 1-4 4H3" />
  </svg>
);

const ZapIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);

const DEFAULT_MOBILE_NAV_LINKS = [
  { id: 'resumo', label: 'Resumo', icon: <HomeIcon /> },
  { id: 'pessoas', label: 'Pessoas', icon: <UsersIcon /> },
  { id: 'cards', label: 'Cartões', icon: <CreditCardIcon /> },
  { id: 'transactions', label: 'Movimentações', icon: <ActivityIcon /> },
  { id: 'subscriptions', label: 'Assinaturas', icon: <RepeatIcon /> },
  { id: 'crisis', label: 'Modo Crise', icon: <ZapIcon />, proOnly: true },
];

const CloseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const LockIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
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

export default function MobileNavigation({
  isOpen,
  onClose,
  activePage,
  onSelectPage,
  currentUser,
  isPro,
  isTrialActive,
  theme,
  onToggleTheme,
  onOpenDeleteModal,
  onLogout,
  onLockedFeatureClick,
  triggerRef,
  navLinks = DEFAULT_MOBILE_NAV_LINKS,
}) {
  const drawerRef = useRef(null);
  const wasOpenRef = useRef(false);

  // Escuta tecla Escape para fechar
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Restaura foco para o botão de disparo estritamente ao fechar (transição true -> false)
  useEffect(() => {
    if (isOpen) {
      wasOpenRef.current = true;
    } else if (wasOpenRef.current) {
      wasOpenRef.current = false;
      if (
        triggerRef?.current &&
        typeof triggerRef.current.focus === 'function' &&
        document.contains(triggerRef.current)
      ) {
        triggerRef.current.focus();
      }
    }
  }, [isOpen, triggerRef]);

  // Trava scroll do body quando aberto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const planBadge = isPro ? (
    <Badge variant="accent">Pro</Badge>
  ) : isTrialActive ? (
    <Badge variant="neutral">Teste Pro ativo</Badge>
  ) : (
    <Badge variant="neutral">Free</Badge>
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Menu de navegação móvel"
      className="fixed inset-0 z-50 lg:hidden flex"
    >
      {/* Backdrop Overlay */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm fc-drawer-overlay cursor-pointer"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Lateral Móvel */}
      <div
        ref={drawerRef}
        className="relative w-4/5 max-w-xs bg-[var(--fc-bg-subtle)] border-r border-[var(--fc-border-subtle)] h-full flex flex-col justify-between overflow-y-auto z-10 fc-drawer-slide shadow-[var(--fc-shadow-lg)]"
      >
        {/* Topo do Drawer */}
        <div>
          <div className="flex items-center justify-between h-16 px-4 border-b border-[var(--fc-border-subtle)]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[var(--fc-surface-2)] text-[var(--fc-accent)] border border-[var(--fc-border-subtle)] flex items-center justify-center shrink-0">
                <FinControlLogo />
              </div>
              <span className="font-semibold text-base text-[var(--fc-text-primary)]">
                FinControl
              </span>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar menu de navegação"
              className="min-w-[44px] min-h-[44px] p-2.5 rounded-xl text-[var(--fc-text-secondary)] hover:text-[var(--fc-text-primary)] hover:bg-[var(--fc-surface-1)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--fc-focus-ring)] cursor-pointer flex items-center justify-center"
            >
              <CloseIcon />
            </button>
          </div>

          {/* Links de Navegação Mobile (Touch Targets >= 44px) */}
          <nav className="p-3 space-y-1">
            {navLinks.map((link) => {
              const isLocked = link.proOnly && !isPro && !isTrialActive;
              const isActive = activePage === link.id;

              return (
                <button
                  key={link.id}
                  type="button"
                  onClick={() => {
                    if (isLocked) {
                      onLockedFeatureClick?.();
                    } else {
                      onSelectPage(link.id);
                      onClose();
                    }
                  }}
                  aria-current={isActive ? 'page' : undefined}
                  className={`w-full group min-h-[44px] flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-colors cursor-pointer border-l-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--fc-focus-ring)] ${
                    isActive
                      ? 'bg-[var(--fc-accent-soft)] text-[var(--fc-text-primary)] border-[var(--fc-accent)] font-semibold'
                      : 'text-[var(--fc-text-secondary)] hover:text-[var(--fc-text-primary)] hover:bg-[var(--fc-surface-1)] border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`shrink-0 transition-colors ${
                        isActive ? 'text-[var(--fc-accent)]' : 'text-[var(--fc-text-muted)] group-hover:text-[var(--fc-text-primary)]'
                      }`}
                    >
                      {link.icon}
                    </span>
                    <span>{link.label}</span>
                  </div>

                  {isLocked && (
                    <span className="text-[var(--fc-text-muted)]" title="Disponível no plano Pro">
                      <LockIcon />
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Rodapé Mobile: Plano, Tema, Exclusão & Logout */}
        <div className="p-4 border-t border-[var(--fc-border-subtle)] space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-medium text-[var(--fc-text-muted)]">Plano atual</span>
            {planBadge}
          </div>

          <div className="px-1 py-1 text-xs text-[var(--fc-text-muted)] truncate">
            {currentUser?.email}
          </div>

          <div className="pt-2 border-t border-[var(--fc-border-subtle)] space-y-1">
            <button
              type="button"
              onClick={onToggleTheme}
              className="w-full min-h-[44px] flex items-center justify-between px-3 py-2 text-xs font-medium rounded-xl text-[var(--fc-text-secondary)] hover:text-[var(--fc-text-primary)] hover:bg-[var(--fc-surface-1)] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--fc-focus-ring)]"
            >
              <span className="flex items-center gap-2.5">
                {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
                <span>{theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}</span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenDeleteModal();
              }}
              className="w-full min-h-[44px] flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-xl text-[var(--fc-danger)] hover:bg-[var(--fc-danger-soft)] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--fc-focus-ring)]"
            >
              <TrashIcon />
              <span>Excluir conta</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onClose();
                onLogout();
              }}
              className="w-full min-h-[44px] flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-xl text-[var(--fc-text-secondary)] hover:text-[var(--fc-text-primary)] hover:bg-[var(--fc-surface-1)] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--fc-focus-ring)]"
            >
              <LogoutIcon />
              <span>Sair da conta</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
