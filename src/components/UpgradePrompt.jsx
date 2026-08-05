// src/components/UpgradePrompt.jsx

import React from 'react';

export default function UpgradePrompt({ onUpgradeClick, isLoading }) {
  return (
    <div className="text-center p-8 bg-carbon-900 border border-gold/30 rounded-3xl shadow-2xl space-y-4">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gold/10 text-gold border border-gold/20 mb-1 shadow-inner">
        👑
      </div>
      <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-gold-cream">Acesso Vitalício ao FinControl Pro</h3>
      <p className="text-sm text-gray-400 max-w-sm mx-auto leading-relaxed">
        Libere relatórios avançados, gráficos detalhados e todas as funcionalidades Pro com um pagamento único.
      </p>
      <button
        onClick={onUpgradeClick}
        disabled={isLoading}
        className="w-full bg-gradient-to-r from-gold-light to-gold text-carbon-900 font-extrabold py-3.5 px-6 rounded-2xl shadow-lg shadow-gold/20 hover:opacity-95 transition disabled:opacity-50 disabled:cursor-wait cursor-pointer tracking-wide"
      >
        {isLoading ? 'Redirecionando...' : 'Liberar Acesso Vitalício Agora'}
      </button>
    </div>
  );
}