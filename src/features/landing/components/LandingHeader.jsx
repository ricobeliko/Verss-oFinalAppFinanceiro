// src/features/landing/components/LandingHeader.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiMenu, FiX, FiArrowRight } from 'react-icons/fi';

export default function LandingHeader() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
          ? 'bg-[#0D0E11]/85 backdrop-blur-xl border-b border-white/5 py-3 shadow-2xl'
          : 'bg-transparent py-5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Brand Logo: [ F ] FinControl without badge */}
        <a href="#hero" className="flex items-center gap-2.5 group focus:outline-none">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#F5D580] via-[#E5B842] to-[#C99116] p-[1px] shadow-lg shadow-[#E5B842]/20 group-hover:scale-105 transition-transform">
            <div className="w-full h-full bg-[#0D0E11] rounded-[7px] flex items-center justify-center">
              <span className="font-bold text-sm bg-gradient-to-tr from-[#E5B842] to-[#F5D580] bg-clip-text text-transparent">
                F
              </span>
            </div>
          </div>
          <span className="font-bold text-lg text-[#F9FAFB] tracking-tight group-hover:text-[#F5D580] transition-colors">
            FinControl
          </span>
        </a>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-7">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-sm font-medium text-[#9CA3AF] hover:text-[#F9FAFB] transition-colors relative py-1 group"
            >
              {link.label}
              <span className="absolute bottom-0 left-0 w-0 h-[1.5px] bg-[#E5B842] group-hover:w-full transition-all duration-300" />
            </a>
          ))}
        </nav>

        {/* Desktop CTAs */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            to="/login"
            className="text-sm font-medium text-[#9CA3AF] hover:text-[#F9FAFB] px-3.5 py-2 rounded-xl transition-colors"
          >
            Entrar
          </Link>
          <Link
            to="/login?mode=register"
            className="relative group overflow-hidden rounded-xl p-[1px] font-medium text-sm focus:outline-none"
          >
            <span className="absolute inset-0 bg-gradient-to-r from-[#E5B842] via-[#F5D580] to-[#E5B842] transition-all group-hover:opacity-90 motion-safe:animate-pulse" />
            <span className="relative flex items-center gap-2 px-4 py-2 rounded-[11px] bg-[#0D0E11] text-[#F5D580] group-hover:bg-transparent group-hover:text-[#0D0E11] transition-all duration-300 font-semibold shadow-md">
              Criar conta gratuita
              <FiArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </span>
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 rounded-xl text-[#9CA3AF] hover:text-[#F9FAFB] hover:bg-white/5 transition-colors focus:outline-none"
          aria-label="Abrir menu de navegação"
        >
          {mobileMenuOpen ? <FiX className="w-6 h-6" /> : <FiMenu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#0D0E11]/98 border-b border-white/10 px-6 py-6 space-y-4 animate-in fade-in slide-in-from-top-4 duration-200">
          <nav className="flex flex-col space-y-3">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="text-base font-medium text-[#9CA3AF] hover:text-[#F9FAFB] py-2 border-b border-white/5"
              >
                {link.label}
              </a>
            ))}
          </nav>
          <div className="pt-2 flex flex-col gap-2.5">
            <Link
              to="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full text-center py-2.5 rounded-xl border border-white/10 text-sm font-medium text-[#F9FAFB]"
            >
              Entrar
            </Link>
            <Link
              to="/login?mode=register"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full text-center py-2.5 rounded-xl bg-gradient-to-r from-[#E5B842] to-[#F5D580] text-[#0D0E11] text-sm font-bold shadow-lg"
            >
              Criar conta gratuita
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
