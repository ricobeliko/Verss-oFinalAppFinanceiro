// src/features/landing/components/LandingFooter.jsx
import React from 'react';
import { Link } from 'react-router-dom';

export default function LandingFooter() {
  return (
    <footer className="bg-[#0A0B0E] border-t border-white/5 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#F5D580] via-[#E5B842] to-[#C99116] p-[1px]">
              <div className="w-full h-full bg-[#0D0E11] rounded-[7px] flex items-center justify-center">
                <span className="font-bold text-xs bg-gradient-to-tr from-[#E5B842] to-[#F5D580] bg-clip-text text-transparent">
                  F
                </span>
              </div>
            </div>
            <span className="font-bold text-base text-[#F9FAFB] tracking-tight">
              FinControl
            </span>
            <span className="text-xs text-[#9CA3AF]">
              • Inteligência Financeira e Compras Compartilhadas
            </span>
          </div>

          {/* Links */}
          <div className="flex items-center gap-6 text-xs text-[#9CA3AF]">
            <a href="#how-it-works" className="hover:text-[#F9FAFB] transition-colors">
              Como Funciona
            </a>
            <a href="#shared-purchases" className="hover:text-[#F9FAFB] transition-colors">
              Divisão de Compras
            </a>
            <a href="#pricing" className="hover:text-[#F9FAFB] transition-colors">
              Planos
            </a>
            <Link to="/login" className="hover:text-[#F9FAFB] transition-colors">
              Acessar Conta
            </Link>
          </div>

        </div>

        <div className="mt-8 pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#6B7280]">
          <p>© {new Date().getFullYear()} FinControl. Todos os direitos reservados.</p>
          <p className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#34D399]" />
            <span>Sistemas operacionais • Precisão matemática ativa</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
