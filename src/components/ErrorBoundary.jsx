// src/components/ErrorBoundary.jsx

import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    if (import.meta.env?.DEV) {
      console.error('ErrorBoundary capturou uma falha de renderização:', error, errorInfo);
    }

    // Telemetria Sanitizada: Reporta falha ao backend via Cloud Functions (Zero PII)
    try {
      if (typeof window !== 'undefined' && !window.__FINCONTROL_E2E_USER__) {
        import('firebase/functions').then(({ getFunctions, httpsCallable }) => {
          import('../utils/firebase').then(({ app }) => {
            const functions = getFunctions(app, 'southamerica-east1');
            const reportErrorCallable = httpsCallable(functions, 'reportClientError');
            reportErrorCallable({
              errorType: String(error?.name || 'ReactRenderError').slice(0, 50),
              component: 'ErrorBoundaryFallback',
              errorMessage: String(error?.message || '').slice(0, 300),
              route: window.location.pathname.slice(0, 100),
            }).catch(() => {
              // Silencia falhas de telemetria para não impactar UX e evitar loops
            });
          }).catch(() => {});
        }).catch(() => {});
      }
    } catch {
      // Ignora falhas de reporte
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-carbon-950 text-gold-cream flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-carbon-900 border border-carbon-800 rounded-3xl p-8 text-center shadow-2xl space-y-6 animate-fadeIn">
            {/* Ícone de Alerta Dourado */}
            <div className="w-16 h-16 bg-gold/10 border border-gold/20 rounded-2xl flex items-center justify-center mx-auto text-gold">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>

            {/* Mensagens de Feedback */}
            <div className="space-y-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-gold-cream">
                Não foi possível exibir esta tela
              </h1>
              <p className="text-sm text-gray-400">
                Ocorreu uma inconsistência temporária de renderização. Seus dados financeiros permanecem totalmente seguros e protegidos.
              </p>
            </div>

            {/* Ações de Recuperação */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <button
                type="button"
                onClick={this.handleRetry}
                className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-gold-500 to-gold-600 text-carbon-950 font-bold rounded-xl text-sm hover:from-gold-400 hover:to-gold-500 transition-all shadow-lg cursor-pointer"
              >
                Tentar novamente
              </button>
              <button
                type="button"
                onClick={this.handleGoHome}
                className="w-full sm:w-auto px-5 py-2.5 bg-carbon-800 hover:bg-carbon-700 text-gray-300 border border-carbon-700 font-semibold rounded-xl text-sm transition-all cursor-pointer"
              >
                Voltar ao início
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
