// src/features/dashboard/DashboardLayout.jsx

import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { useAppContext } from '../../context/AppContext';
import GlobalSearchModal from '../../components/GlobalSearchModal';
import AccountDeletionModal from '../../components/AccountDeletionModal';
import Spinner from '../../components/Spinner';

// Shell Desacoplado DS2
import AppSidebar from './shell/AppSidebar';
import AppTopbar from './shell/AppTopbar';
import MobileNavigation from './shell/MobileNavigation';

// Página principal do painel (carregada no primeiro paint)
import Dashboard from './Dashboard';

// Páginas secundárias carregadas sob demanda (tab-level code splitting)
const ClientManagement = lazy(() => import('../clients/ClientManagement'));
const CardManagement = lazy(() => import('../cards/CardManagement'));
const UnifiedTransactionManagement = lazy(() => import('../transactions/TransactionManagement'));
const SubscriptionManagement = lazy(() => import('../subscriptions/SubscriptionManagement'));
const CrisisMode = lazy(() => import('../crisis/CrisisMode'));

export default function DashboardLayout() {
  const { currentUser, isPro, isTrialActive, logout, showToast } = useAppContext();

  const [activePage, setActivePage] = useState('resumo');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const mobileMenuTriggerRef = useRef(null);

  // Tema Dark / Light sincronizado com localStorage e data-theme
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Filtros Globais do Painel
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [selectedCardFilter, setSelectedCardFilter] = useState('');
  const [selectedClientFilter, setSelectedClientFilter] = useState('');

  // Atalho global Ctrl+K / ⌘+K para busca
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleLockedFeatureClick = () => {
    showToast('Disponível no plano Pro.', 'info');
  };

  const pageProps = {
    selectedMonth,
    setSelectedMonth,
    selectedCardFilter,
    setSelectedCardFilter,
    selectedClientFilter,
    setSelectedClientFilter,
  };

  const renderActivePage = () => {
    return (
      <Suspense
        fallback={
          <div className="flex justify-center items-center py-24 min-h-[300px]">
            <Spinner />
          </div>
        }
      >
        {(() => {
          switch (activePage) {
            case 'resumo':
              return <Dashboard {...pageProps} />;
            case 'pessoas':
              return <ClientManagement />;
            case 'cards':
              return <CardManagement />;
            case 'transactions':
              return <UnifiedTransactionManagement />;
            case 'subscriptions':
              return <SubscriptionManagement {...pageProps} />;
            case 'crisis':
              return <CrisisMode selectedMonth={selectedMonth} />;
            default:
              return <Dashboard {...pageProps} />;
          }
        })()}
      </Suspense>
    );
  };

  return (
    <div
      data-theme={theme}
      className="min-h-screen bg-[var(--fc-bg)] text-[var(--fc-text-primary)] flex overflow-x-hidden font-sans fc-shell-enter transition-colors"
    >
      {/* Sidebar Desktop (>= 1024px) */}
      <AppSidebar
        activePage={activePage}
        onSelectPage={setActivePage}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
        currentUser={currentUser}
        isPro={isPro}
        isTrialActive={isTrialActive}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        onOpenDeleteModal={() => setIsDeleteModalOpen(true)}
        onLogout={logout}
        onLockedFeatureClick={handleLockedFeatureClick}
      />

      {/* Drawer Móvel (< 1024px) */}
      <MobileNavigation
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        activePage={activePage}
        onSelectPage={setActivePage}
        currentUser={currentUser}
        isPro={isPro}
        isTrialActive={isTrialActive}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        onOpenDeleteModal={() => setIsDeleteModalOpen(true)}
        onLogout={logout}
        onLockedFeatureClick={handleLockedFeatureClick}
        triggerRef={mobileMenuTriggerRef}
      />

      {/* Canvas Principal: Topbar + Conteúdo */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        <AppTopbar
          onOpenSearch={() => setIsSearchOpen(true)}
          theme={theme}
          onToggleTheme={handleToggleTheme}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
          mobileMenuTriggerRef={mobileMenuTriggerRef}
        />

        <main className="container mx-auto p-4 sm:p-6 lg:p-8 max-w-7xl flex-1 fc-page-enter">
          {renderActivePage()}
        </main>
      </div>

      {/* Modal de Busca Global */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />

      {/* Modal de Exclusão de Conta (Fase 8.6 - Frozen) */}
      <AccountDeletionModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
      />
    </div>
  );
}