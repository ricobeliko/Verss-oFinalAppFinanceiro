import React, { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { useAppContext } from '../context/AppContext';
import { functions } from '../utils/firebase'; // Importe a instância do Firebase

// ✅ CORREÇÃO: Remova a lógica de chamada daqui e receba a função via props
export default function UpgradePrompt({ onUpgradeClick, isLoading }) {
  return (
    <div className="text-center p-6 bg-gray-800 rounded-lg shadow-lg border border-gray-700">
      <h3 className="text-2xl font-bold text-white mb-2">Acesso Vitalício ao FinControl Pro</h3>
      <p className="text-gray-400 mb-4">
        Libere relatórios avançados, gráficos detalhados e todas as funcionalidades Pro com um pagamento único.
      </p>
      <button
        onClick={onUpgradeClick} // Usa a função recebida
        disabled={isLoading}
        className="w-full bg-purple-600 text-white font-semibold py-3 px-6 rounded-lg shadow-md hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-wait"
      >
        {isLoading ? 'Redirecionando...' : 'Liberar Acesso Vitalício Agora'}
      </button>
    </div>
  );
}