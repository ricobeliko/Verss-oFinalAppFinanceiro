// src/components/Toast.jsx

import React from 'react';

/**
 * Componente Toast aprimorado que recebe todas as suas propriedades via props.
 * Padrão Visual: Black Card (Carbono & Dourado).
 */
function Toast({ message, type = 'info', visible, onClose }) {
  if (!visible) {
    return null;
  }

  let iconColorClass, borderColorClass, icon;

  switch (type) {
    case 'success':
      iconColorClass = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      borderColorClass = 'border-emerald-500/30';
      icon = (
        <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className="h-5 w-5 text-emerald-400" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      );
      break;
    case 'error':
      iconColorClass = 'text-rose-400 bg-rose-500/10 border-rose-500/20';
      borderColorClass = 'border-rose-500/30';
      icon = (
        <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className="h-5 w-5 text-rose-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
        </svg>
      );
      break;
    case 'warning':
      iconColorClass = 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      borderColorClass = 'border-amber-500/30';
      icon = (
          <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.21 3.03-1.742 3.03H4.42c-1.532 0-2.492-1.696-1.742-3.03l5.58-9.92zM10 13a1 1 0 110-2 1 1 0 010 2zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
      );
      break;
    case 'info':
    default:
      iconColorClass = 'text-gold bg-gold/10 border-gold/20';
      borderColorClass = 'border-gold/30';
      icon = (
        <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className="h-5 w-5 text-gold" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
      );
      break;
  }

  return (
    <div 
        className={`fixed top-6 left-1/2 -translate-x-1/2 z-[1001] w-full max-w-md transition-all duration-300 transform px-4 ${visible ? 'translate-y-0 opacity-100' : '-translate-y-20 opacity-0'}`}
        role={type === 'error' ? 'alert' : 'status'}
        aria-live={type === 'error' ? 'assertive' : 'polite'}
        aria-atomic="true"
    >
        <div className={`flex items-center p-4 rounded-3xl shadow-2xl bg-carbon-900 border ${borderColorClass} backdrop-blur-xl text-gray-200`}>
            <div className={`flex-shrink-0 p-2.5 rounded-2xl border ${iconColorClass}`}>
                {icon}
            </div>
            <p className="ml-3.5 text-sm font-medium text-gold-cream">{message}</p>
            <button 
                onClick={onClose} 
                className="ml-auto -mx-1.5 -my-1.5 p-2 rounded-2xl inline-flex items-center justify-center h-8 w-8 text-gray-400 hover:text-white hover:bg-carbon-800 transition cursor-pointer focus:outline-none focus:ring-2 focus:ring-gold/50"
                aria-label="Fechar notificação"
            >
                <span className="sr-only">Fechar notificação</span>
                <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>
    </div>
  );
}

export default Toast;