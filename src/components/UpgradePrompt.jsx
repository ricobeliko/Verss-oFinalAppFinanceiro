import React, { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { useAppContext } from '../context/AppContext';
// ✅ IMPORTAÇÃO CORRETA DO SERVIÇO 'functions'
import { functions } from '../utils/firebase'; 

function UpgradePrompt() {
    const { showToast, user } = useAppContext();
    const [isLoading, setIsLoading] = useState(false);

    const handleActivateTrial = async () => {
        if (!user) {
            showToast('Você precisa estar logado para ativar o teste.', 'error');
            return;
        }
        setIsLoading(true);
        try {
            // A função 'activateProTrial' deve existir nas suas Cloud Functions
            const activateProTrial = httpsCallable(functions, 'activateProTrial');
            const result = await activateProTrial({ uid: user.uid });
            
            if (result.data.success) {
                showToast('Teste Pro de 30 dias ativado com sucesso! Recarregue a página.', 'success');
                // Numa versão futura, podemos atualizar o estado 'isPro' aqui sem precisar recarregar
            } else {
                throw new Error(result.data.error || 'Falha ao ativar o teste.');
            }
        } catch (error) {
            console.error("Erro ao ativar o teste Pro:", error);
            showToast(error.message, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="text-center p-6 bg-yellow-100 dark:bg-gray-800 border-2 border-dashed border-yellow-400 dark:border-yellow-500 rounded-lg shadow-lg">
            <h3 className="text-xl font-bold text-yellow-800 dark:text-yellow-300">Recurso Exclusivo Pro!</h3>
            <p className="text-yellow-700 dark:text-yellow-400 mt-2 mb-4">
                Obtenha acesso a gráficos detalhados, despesas avulsas, assinaturas e muito mais.
            </p>
            <button 
                onClick={handleActivateTrial}
                disabled={isLoading}
                className="bg-purple-600 text-white font-bold py-2 px-6 rounded-lg shadow-md hover:bg-purple-700 transition disabled:bg-purple-400 disabled:cursor-not-allowed"
            >
                {isLoading ? 'Ativando...' : 'Ativar 30 Dias Grátis'}
            </button>
        </div>
    );
}

export default UpgradePrompt;
