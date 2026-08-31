// src/components/WelcomeModal.jsx

import React, { useEffect } from 'react';

// --- Ícones ---
const GiftIcon = () => ( <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg> );
const StarIcon = () => ( <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg> );
const XIcon = () => ( <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg> );

const WelcomeModal = ({ isOpen, onClose, onActivateTrial, isTrialAvailable }) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleActivate = () => {
    onActivateTrial();
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center z-50 p-4 animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-modal-title"
    >
      <div className="bg-carbon-900 border border-carbon-800 rounded-3xl shadow-2xl w-full max-w-md transform transition-all duration-300 overflow-hidden relative">
        
        {/* Botão Fechar */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-gray-400 hover:text-white p-2 rounded-2xl bg-carbon-800 hover:bg-carbon-700 transition cursor-pointer z-10 focus:outline-none focus:ring-2 focus:ring-gold/50"
          aria-label="Fechar modal de boas-vindas"
        >
          <XIcon />
        </button>

        <div className="p-8 text-white text-center space-y-6">
          {isTrialAvailable ? (
            // Versão "Mês Grátis"
            <>
              <div className="flex justify-center items-center">
                <div className="p-4 bg-gold/10 text-gold border border-gold/20 rounded-2xl shadow-inner">
                  <GiftIcon />
                </div>
              </div>
              <div className="space-y-2">
                <h2 id="welcome-modal-title" className="text-2xl sm:text-3xl font-bold tracking-tight text-gold-cream">Um Presente Para Você!</h2>
                <p className="text-sm text-gray-400 leading-relaxed max-w-xs mx-auto">
                  Desbloqueie todos os recursos Pro por 30 dias, totalmente grátis. Sem compromisso!
                </p>
              </div>
              <button
                onClick={handleActivate}
                className="w-full bg-gradient-to-r from-gold-light to-gold text-carbon-900 font-extrabold py-3.5 px-6 rounded-2xl shadow-lg shadow-gold/25 hover:opacity-95 transition cursor-pointer tracking-wide focus:outline-none focus:ring-2 focus:ring-gold/50"
              >
                Ativar Mês Grátis Agora!
              </button>
            </>
          ) : (
            // Versão "Torne-se Pro"
            <>
              <div className="flex justify-center items-center">
                 <div className="p-4 bg-gold/10 text-gold border border-gold/20 rounded-2xl shadow-inner">
                    <StarIcon />
                 </div>
              </div>
              <div className="space-y-2">
                <h2 id="welcome-modal-title" className="text-2xl sm:text-3xl font-bold tracking-tight text-gold-cream">Evolua sua Gestão!</h2>
                <p className="text-sm text-gray-400 leading-relaxed max-w-xs mx-auto">
                  Tenha acesso a gráficos detalhados, relatórios completos e muito mais com o plano Pro.
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-full bg-gradient-to-r from-gold-light to-gold text-carbon-900 font-extrabold py-3.5 px-6 rounded-2xl shadow-lg shadow-gold/25 hover:opacity-95 transition cursor-pointer tracking-wide focus:outline-none focus:ring-2 focus:ring-gold/50"
              >
                Ver Planos Pro
              </button>
            </>
          )}

          <div>
            <button
              onClick={onClose}
              className="text-xs font-semibold text-gray-400 hover:text-gold transition cursor-pointer tracking-wider uppercase focus:outline-none focus:underline"
            >
              Talvez depois
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WelcomeModal;