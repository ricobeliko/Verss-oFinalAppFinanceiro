import React, { useState } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useAppContext } from '../context/AppContext';

export default function UpgradePrompt() {
  const [isLoading, setIsLoading] = useState(false);
  const { showToast } = useAppContext();

  const handleUpgradeClick = async () => {
    setIsLoading(true);
    try {
      const functions = getFunctions();
      // Chama a função segura 'getPaymentLink' que criamos no Firebase.
      const getPaymentLink = httpsCallable(functions, 'getPaymentLink');
      const result = await getPaymentLink();
      
      if (result.data.link) {
        // Redireciona o usuário para o link de pagamento que o Firebase nos deu.
        window.location.href = result.data.link;
      } else {
        throw new Error("Link de pagamento não recebido do servidor.");
      }
    } catch (error) {
      console.error("Erro ao obter link de pagamento:", error);
      showToast('Não foi possível iniciar o pagamento. Tente novamente mais tarde.', 'error');
      setIsLoading(false);
    }
  };

  return (
    <div className="text-center p-6 bg-gray-800 rounded-lg shadow-lg border border-gray-700">
      <h3 className="text-2xl font-bold text-white mb-2">Acesso Vitalício ao FinControl Pro</h3>
      <p className="text-gray-400 mb-4">
        Libere relatórios avançados, gráficos detalhados e todas as funcionalidades Pro com um pagamento único.
      </p>
      <button
        onClick={handleUpgradeClick}
        disabled={isLoading}
        className="w-full bg-purple-600 text-white font-semibold py-3 px-6 rounded-lg shadow-md hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-wait"
      >
        {isLoading ? 'Redirecionando para pagamento...' : 'Liberar Acesso Vitalício Agora'}
      </button>
    </div>
  );
}