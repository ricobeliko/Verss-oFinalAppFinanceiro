// src/features/landing/components/LandingHeader.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiMenu, FiX, FiArrowRight, FiSun, FiMoon } from 'react-icons/fi';
import FinControlMark from '../../../components/FinControlMark';
import { getInitialTheme, applyTheme } from '../../../utils/theme';
import { toggleThemeWithTransition } from '../../../utils/themeTransition';

export default function LandingHeader() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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

  const navLinks = [
    { label: 'Como Funciona', href: '#how-it-works' },
    { label: 'Divisão & Parcelas', href: '#shared-purchases' },
    { label: 'Recursos', href: '#features' },
    { label: 'Planos', href: '#pricing' },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-[var(--fc-bg)]/85 backdrop-blur-xl border-b border-[var(--fc-border-subtle)] py-3 shadow-[var(--fc-shadow-md)]'
          : 'bg-transparent py-5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Brand Logo with FinControlMark */}
        <a href="#hero" className="flex items-center gap-2.5 group/brand focus:outline-none">
          <FinControlMark
            size={34}
            animated={true}
            ariaHidden={true}
            className="transition-transform group-hover/brand:scale-105"
          />
          <span className="font-bold text-lg text-[var(--fc-text-primary)] tracking-tight group-hover/brand:text-[var(--fc-accent)] transition-colors">
            FinControl
          </span>
        </a>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-7">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-sm font-medium text-[var(--fc-text-secondary)] hover:text-[var(--fc-text-primary)] transition-colors relative py-1 group"
            >
              {link.label}
              <span className="absolute bottom-0 left-0 w-0 h-[1.5px] bg-[var(--fc-accent)] group-hover:w-full transition-all duration-300" />
            </a>
          ))}
        </nav>

        {/* Desktop Actions & Theme Toggle */}
        <div className="hidden md:flex items-center gap-3">
          {/* Theme Toggle Button */}
          <button
            type="button"
            onClick={handleToggleTheme}
            aria-label={theme === 'dark' ? 'Alternar para tema claro' : 'Alternar para tema escuro'}
            className="min-w-[40px] min-h-[40px] p-2 rounded-xl text-[var(--fc-text-secondary)] hover:text-[var(--fc-text-primary)] hover:bg-[var(--fc-surface-2)] border border-[var(--fc-border-subtle)] transition-colors flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--fc-focus-ring)]"
          >
            {theme === 'dark' ? (
              <FiSun className="w-4 h-4 text-[var(--fc-accent)]" />
            ) : (
              <FiMoon className="w-4 h-4 text-[var(--fc-accent)]" />
            )}
          </button>

          <Link
            to="/login"
            className="text-sm font-medium text-[var(--fc-text-secondary)] hover:text-[var(--fc-text-primary)] px-3.5 py-2 rounded-xl transition-colors"
          >
            Entrar
          </Link>
          <Link
            to="/login?mode=register"
            className="relative group overflow-hidden rounded-xl p-[1px] font-medium text-sm focus:outline-none"
          >
            <span className="absolute inset-0 bg-[var(--fc-accent)] transition-all group-hover:opacity-90" />
            <span className="relative flex items-center gap-2 px-4 py-2 rounded-[11px] bg-[var(--fc-surface-1)] text-[var(--fc-accent)] group-hover:bg-[var(--fc-accent)] group-hover:text-[var(--fc-accent-contrast)] transition-all duration-300 font-semibold shadow-md">
              Criar conta gratuita
              <FiArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </span>
          </Link>
        </div>

        {/* Mobile Buttons: Theme + Menu */}
        <div className="md:hidden flex items-center gap-2">
          <button
            type="button"
            onClick={handleToggleTheme}
            aria-label={theme === 'dark' ? 'Alternar para tema claro' : 'Alternar para tema escuro'}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center p-2 rounded-xl text-[var(--fc-text-secondary)] hover:text-[var(--fc-text-primary)] hover:bg-[var(--fc-surface-2)] border border-[var(--fc-border-subtle)] transition-colors focus:outline-none"
          >
            {theme === 'dark' ? (
              <FiSun className="w-5 h-5 text-[var(--fc-accent)]" />
            ) : (
              <FiMoon className="w-5 h-5 text-[var(--fc-accent)]" />
            )}
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center p-2 rounded-xl text-[var(--fc-text-secondary)] hover:text-[var(--fc-text-primary)] hover:bg-[var(--fc-surface-2)] border border-[var(--fc-border-subtle)] transition-colors focus:outline-none"
            aria-expanded={mobileMenuOpen}
            aria-controls="landing-mobile-nav"
            aria-label={
              mobileMenuOpen
                ? 'Fechar menu de navegação'
                : 'Abrir menu de navegação'
            }
          >
            {mobileMenuOpen ? <FiX className="w-6 h-6" /> : <FiMenu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div
          id="landing-mobile-nav"
          className="md:hidden bg-[var(--fc-surface-1)] border-b border-[var(--fc-border-default)] px-6 py-6 space-y-4 shadow-[var(--fc-shadow-lg)] motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-4 duration-200"
        >
          <nav className="flex flex-col space-y-3">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="min-h-[44px] flex items-center text-base font-medium text-[var(--fc-text-secondary)] hover:text-[var(--fc-text-primary)] py-2 border-b border-[var(--fc-border-subtle)]"
              >
                {link.label}
              </a>
            ))}
          </nav>
          <div className="pt-2 flex flex-col gap-2.5">
            <Link
              to="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full min-h-[44px] flex items-center justify-center text-center py-2.5 rounded-xl border border-[var(--fc-border-default)] text-sm font-medium text-[var(--fc-text-primary)] hover:bg-[var(--fc-surface-2)] transition-colors"
            >
              Entrar
            </Link>
            <Link
              to="/login?mode=register"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full min-h-[44px] flex items-center justify-center text-center py-2.5 rounded-xl bg-[var(--fc-accent)] hover:bg-[var(--fc-accent-hover)] text-[var(--fc-accent-contrast)] text-sm font-bold shadow-lg transition-colors"
            >
              Criar conta gratuita
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
