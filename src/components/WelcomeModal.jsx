// src/components/WelcomeModal.jsx

import React from 'react';

// --- Ícones (integrados para não precisar de novas bibliotecas) ---
const GiftIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg> );
const StarIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg> );
const XIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg> );


const WelcomeModal = ({ isOpen, onClose, onActivateTrial, isTrialAvailable }) => {
  if (!isOpen) return null;

  const handleActivate = () => {
    onActivateTrial();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
      <div className="bg-gradient-to-br from-gray-800 to-[#1e1e1e] border border-gray-700 rounded-2xl shadow-2xl w-full max-w-md transform transition-all duration-300 scale-95 animate-fade-in-up">
        <div className="p-8 relative text-white text-center">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
            aria-label="Fechar modal"
          >
            <XIcon />
          </button>

          {isTrialAvailable ? (
            // Versão "Mês Grátis"
            <>
              <div className="flex justify-center items-center mb-6">
                <div className="p-4 bg-purple-500 bg-opacity-20 rounded-full">
                  <GiftIcon />
                </div>
              </div>
              <h2 className="text-3xl font-bold mb-2">Um Presente Para Você!</h2>
              <p className="text-gray-300 mb-6">
                Desbloqueie todos os recursos Pro por 30 dias, totalmente grátis. Sem compromisso!
              </p>
              <button
                onClick={handleActivate}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-lg shadow-lg transform hover:-translate-y-1 transition-all duration-300"
              >
                Ativar Mês Grátis Agora!
              </button>
            </>
          ) : (
            // Versão "Torne-se Pro"
            <>
              <div className="flex justify-center items-center mb-6">
                 <div className="p-4 bg-purple-500 bg-opacity-20 rounded-full">
                    <StarIcon />
                 </div>
              </div>
              <h2 className="text-3xl font-bold mb-2">Evolua sua Gestão!</h2>
              <p className="text-gray-300 mb-6">
                Tenha acesso a gráficos detalhados, relatórios completos e muito mais com o plano Pro.
              </p>
              <button
                onClick={onClose} // No futuro, pode levar a uma página de planos
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-lg shadow-lg transform hover:-translate-y-1 transition-all duration-300"
              >
                Ver Planos Pro
              </button>
            </>
          )}

          <button
            onClick={onClose}
            className="mt-4 text-sm text-gray-400 hover:text-gray-200 transition-colors"
          >
            Talvez depois
          </button>
        </div>
      </div>
    </div>
  );
};

export default WelcomeModal;