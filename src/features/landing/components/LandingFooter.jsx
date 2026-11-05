// src/features/landing/components/LandingFooter.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import FinControlMark from '../../../components/FinControlMark';

export default function LandingFooter() {
  return (
    <footer className="bg-[var(--fc-surface-1)] border-t border-[var(--fc-border-subtle)] py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-3 group/brand">
            <FinControlMark
              size={28}
              animated={true}
              ariaHidden={true}
              className="transition-transform group-hover/brand:scale-105"
            />
            <span className="font-bold text-base text-[var(--fc-text-primary)] tracking-tight">
              FinControl
            </span>
            <span className="text-xs text-[var(--fc-text-secondary)]">
              • Gestão de Cartões e Compras Compartilhadas
            </span>
          </div>

          {/* Links */}
          <div className="flex items-center gap-6 text-xs text-[var(--fc-text-secondary)]">
            <a href="#how-it-works" className="hover:text-[var(--fc-text-primary)] transition-colors">
              Como Funciona
            </a>
            <a href="#shared-purchases" className="hover:text-[var(--fc-text-primary)] transition-colors">
              Divisão de Compras
            </a>
            <a href="#pricing" className="hover:text-[var(--fc-text-primary)] transition-colors">
              Planos
            </a>
            <Link to="/login" className="hover:text-[var(--fc-text-primary)] transition-colors">
              Acessar Conta
            </Link>
          </div>

        </div>

        <div className="mt-8 pt-8 border-t border-[var(--fc-border-subtle)] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[var(--fc-text-muted)]">
          <p>© {new Date().getFullYear()} FinControl. Todos os direitos reservados.</p>
          <p className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--fc-success)]" />
            <span>Sistemas operacionais • Precisão matemática ativa</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
