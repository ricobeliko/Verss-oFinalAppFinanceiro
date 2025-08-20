// src/components/Toast.jsx

import React from 'react';

/**
 * Componente Toast aprimorado que recebe todas as suas propriedades via props.
 * Isso o torna um componente mais reutilizável e "presentacional".
 *
 * @param {object} props
 * @param {string} props.message - O texto a ser exibido no toast.
 * @param {string} props.type - O tipo do toast (success, error, warning, info).
 * @param {boolean} props.visible - Controla a visibilidade do toast.
 * @param {function} props.onClose - Função para ser chamada quando o toast for fechado.
 */
function Toast({ message, type = 'info', visible, onClose }) {
  // Se não estiver visível, não renderiza nada.
  if (!visible) {
    return null;
  }

  // Lógica para definir as cores com base no tipo de mensagem
  let bgColorClass, textColorClass, borderColorClass, icon;

  switch (type) {
    case 'success':
      bgColorClass = 'bg-green-100 dark:bg-green-900/50';
      textColorClass = 'text-green-700 dark:text-green-200';
      borderColorClass = 'border-green-400 dark:border-green-600';
      icon = (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      );
      break;
    case 'error':
      bgColorClass = 'bg-red-100 dark:bg-red-900/50';
      textColorClass = 'text-red-700 dark:text-red-200';
      borderColorClass = 'border-red-400 dark:border-red-600';
      icon = (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
        </svg>
      );
      break;
    case 'warning':
      bgColorClass = 'bg-yellow-100 dark:bg-yellow-800/50';
      textColorClass = 'text-yellow-700 dark:text-yellow-200';
      borderColorClass = 'border-yellow-400 dark:border-yellow-600';
      icon = (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.21 3.03-1.742 3.03H4.42c-1.532 0-2.492-1.696-1.742-3.03l5.58-9.92zM10 13a1 1 0 110-2 1 1 0 010 2zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
      );
      break;
    case 'info':
    default:
      bgColorClass = 'bg-blue-100 dark:bg-blue-900/50';
      textColorClass = 'text-blue-700 dark:text-blue-200';
      borderColorClass = 'border-blue-400 dark:border-blue-600';
      icon = (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
      );
      break;
  }

  return (
    <div 
        className={`fixed top-5 left-1/2 -translate-x-1/2 z-[1001] w-full max-w-sm transition-all duration-300 transform ${visible ? 'translate-y-0 opacity-100' : '-translate-y-20 opacity-0'}`}
        role="alert"
    >
        <div className={`flex items-center p-4 rounded-lg shadow-xl ${bgColorClass} ${textColorClass} border ${borderColorClass}`}>
            <div className="flex-shrink-0">
                {icon}
            </div>
            <p className="ml-3 text-sm font-medium">{message}</p>
            <button 
                onClick={onClose} 
                className="ml-auto -mx-1.5 -my-1.5 p-1.5 rounded-lg inline-flex items-center justify-center h-8 w-8 text-current hover:bg-white/20 focus:ring-2 focus:ring-white/30"
                aria-label="Fechar"
            >
                <span className="sr-only">Fechar</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>
    </div>
  );
}

export default Toast;