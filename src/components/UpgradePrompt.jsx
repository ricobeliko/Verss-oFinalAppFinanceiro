// src/components/UpgradePrompt.jsx

import React from 'react';
import { useAppContext } from '../context/AppContext';

function UpgradePrompt() {
    // ✅ CORREÇÃO:
    // Agora pegamos a função 'activateFreeTrial' diretamente do contexto.
    // Ela já contém toda a lógica de verificação de usuário e de ativação.
    const { activateFreeTrial } = useAppContext();

    return (
        <div className="text-center p-6 bg-yellow-900/50 border-2 border-dashed border-yellow-500/50 rounded-lg shadow-lg">
            <h3 className="text-xl font-bold text-yellow-300">Recurso Exclusivo Pro!</h3>
            <p className="text-yellow-400 mt-2 mb-4">
                Obtenha acesso a gráficos detalhados, despesas avulsas, assinaturas e muito mais.
            </p>
            <button 
                // ✅ CORREÇÃO:
                // O botão agora chama diretamente a função do contexto.
                onClick={activateFreeTrial}
                className="bg-purple-600 text-white font-bold py-2 px-6 rounded-lg shadow-md hover:bg-purple-700 transition disabled:bg-purple-400 disabled:cursor-not-allowed"
            >
                Ativar 30 Dias Grátis
            </button>
        </div>
    );
}

export default UpgradePrompt;