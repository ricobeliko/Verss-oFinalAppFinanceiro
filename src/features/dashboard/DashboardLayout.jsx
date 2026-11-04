// src/features/dashboard/DashboardLayout.jsx

import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { flushSync } from 'react-dom';
import gsap from 'gsap';
import { useAppContext } from '../../context/AppContext';
import GlobalSearchModal from '../../components/GlobalSearchModal';
import AccountDeletionModal from '../../components/AccountDeletionModal';
import { getInitialTheme, applyTheme } from '../../utils/theme';
import { toggleThemeWithTransition } from '../../utils/themeTransition';
import { SkeletonPage } from '../../design-system';
import { MOTION } from '../../design-system/motion';
import usePrefersReducedMotion from '../../hooks/usePrefersReducedMotion';

// Shell Desacoplado DS2
import AppSidebar from './shell/AppSidebar';
import AppTopbar from './shell/AppTopbar';
import MobileNavigation from './shell/MobileNavigation';
import LivingBackground from './shell/LivingBackground';
import PageWaveSweep from './shell/PageWaveSweep';

const PAGE_NAMES = {
  resumo: 'Resumo financeiro',
  pessoas: 'Gerenciamento de Pessoas',
  cards: 'Gerenciamento de Cartões',
  transactions: 'Adicionar Movimentações',
  subscriptions: 'Gerenciamento de Assinaturas',
  crisis: 'Modo Crise e Raio-X Financeiro',
};

// Página principal do painel (carregada no primeiro paint)
import Dashboard from './Dashboard';
import { loadTabModule, prefetchTab, prefetchAllTabs } from './tabPrefetch';

// Páginas secundárias carregadas sob demanda (tab-level code splitting com promessa memoizada)
const ClientManagement = lazy(() => loadTabModule('pessoas'));
const CardManagement = lazy(() => loadTabModule('cards'));
const UnifiedTransactionManagement = lazy(() => loadTabModule('transactions'));
const SubscriptionManagement = lazy(() => loadTabModule('subscriptions'));
const CrisisMode = lazy(() => loadTabModule('crisis'));

export default function DashboardLayout() {
  const { currentUser, isPro, isTrialActive, logout, showToast } = useAppContext();

  const [activePage, setActivePage] = useState('resumo');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const mobileMenuTriggerRef = useRef(null);
  const waveSweepRef = useRef(null);
  const contentWrapperRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const prefersReducedMotion = usePrefersReducedMotion();
  const [pageAnnouncement, setPageAnnouncement] = useState('');

  const navigateTo = (targetPage) => {
    if (!targetPage || targetPage === activePage) {
      return;
    }

    const isReduced = prefersReducedMotion;
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

    if (isReduced || isMobile) {
      waveSweepRef.current?.cancel();
      setActivePage(targetPage);
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = 0;
      }
      setPageAnnouncement(`Navegou para ${PAGE_NAMES[targetPage] || targetPage}`);
      return;
    }

    const contentEl = contentWrapperRef.current;
    const coverDuration = MOTION?.pageTransition?.coverIn ?? 0.45;

    // Dispara saída suave do conteúdo atual enquanto a onda sobe
    if (contentEl) {
      gsap.to(contentEl, {
        opacity: 0,
        y: MOTION?.pageExit?.y ?? -6,
        duration: coverDuration,
        ease: 'power2.in',
      });
    }

    // Carrega o chunk da aba em paralelo ao cover-in para que esteja 100% pronto no ápice
    const modulePromise = loadTabModule(targetPage);

    waveSweepRef.current?.sweep({
      waitFor: modulePromise,
      onPeak: () => {
        if (typeof window !== 'undefined' && window.__fincontrol_simulate_peak_error__) {
          window.__fincontrol_simulate_peak_error__ = false;
          throw new Error('Simulated onPeak crash in DashboardLayout');
        }
        flushSync(() => {
          setActivePage(targetPage);
        });
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = 0;
        }
        setPageAnnouncement(`Navegou para ${PAGE_NAMES[targetPage] || targetPage}`);

        // Prepara container para a revelação da nova tela
        if (contentEl) {
          gsap.set(contentEl, { opacity: 1, y: 0, clearProps: 'transform,opacity' });
        }
      },
      onComplete: () => {
        if (contentEl) {
          gsap.set(contentEl, { clearProps: 'transform,opacity' });
        }
      },
    });
  };

  // Tema Dark / Light sincronizado via utilitário canônico
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const handleToggleTheme = (event) => {
    const originElement = event?.currentTarget || event?.target || null;
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    toggleThemeWithTransition({
      nextTheme,
      originElement,
      applyTheme,
      setTheme,
    });
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

  // Prefetch de abas secundárias em background idle após o primeiro paint
  useEffect(() => {
    let idleId;
    let timeoutId;
    const doPrefetch = () => {
      prefetchAllTabs();
    };

    if (typeof window !== 'undefined') {
      if (typeof window.requestIdleCallback === 'function') {
        idleId = window.requestIdleCallback(doPrefetch, { timeout: 3000 });
      } else {
        timeoutId = window.setTimeout(doPrefetch, 1500);
      }
    }

    return () => {
      if (idleId && typeof window.cancelIdleCallback === 'function') {
        window.cancelIdleCallback(idleId);
      }
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
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
      <Suspense fallback={<SkeletonPage />}>
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
      className="min-h-screen bg-[var(--fc-bg)] text-[var(--fc-text-primary)] flex overflow-x-hidden font-sans fc-shell-enter transition-colors relative"
    >
      {/* Camada Atmosférica Viva (Fixed Background) */}
      <LivingBackground />

      {/* Sidebar Desktop (>= 1024px) */}
      <AppSidebar
        activePage={activePage}
        onSelectPage={navigateTo}
        onPrefetch={prefetchTab}
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
        onSelectPage={navigateTo}
        onPrefetch={prefetchTab}
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
      <div
        ref={scrollContainerRef}
        className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto relative z-10"
      >
        <AppTopbar
          onOpenSearch={() => setIsSearchOpen(true)}
          theme={theme}
          onToggleTheme={handleToggleTheme}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
          mobileMenuTriggerRef={mobileMenuTriggerRef}
        />

        <main className="container mx-auto p-4 sm:p-6 lg:p-8 max-w-7xl flex-1 relative z-10">
          <PageWaveSweep ref={waveSweepRef} />
          <div ref={contentWrapperRef} className="w-full">
            {renderActivePage()}
          </div>
        </main>
      </div>

      {/* Anúncio acessível de troca de tela para leitores de tela */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {pageAnnouncement}
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
