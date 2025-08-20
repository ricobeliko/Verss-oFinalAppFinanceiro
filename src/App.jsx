import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useAppContext } from './context/AppContext';
import AuthScreen from './features/auth/AuthScreen';
import DashboardLayout from './features/dashboard/DashboardLayout';
import LandingPage from './features/landing/LandingPage'; // Importando a Landing Page
import Spinner from './components/Spinner'; // Um componente de carregamento

// Componente para proteger rotas que exigem autenticação
function ProtectedRoute({ children }) {
  const { user, isAuthReady } = useAppContext();

  if (!isAuthReady) {
    // Enquanto o estado de autenticação está sendo verificado, mostramos um spinner
    return <div className="flex justify-center items-center h-screen bg-gray-900"><Spinner /></div>;
  }

  // Se o usuário não estiver logado, redireciona para a tela de login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Se estiver logado, renderiza o componente filho (neste caso, o DashboardLayout)
  return children;
}

function App() {
  return (
    <AppProvider>
      <Router>
        <Routes>
          {/* ✅ ROTA INICIAL: A Landing Page */}
          {/* Quando alguém aceder a "/", a LandingPage será mostrada. */}
          <Route path="/" element={<LandingPage />} />

          {/* ✅ ROTA DE LOGIN */}
          {/* A tela de autenticação agora fica em "/login". */}
          <Route path="/login" element={<AuthScreen />} />

          {/* ✅ ROTA PROTEGIDA PARA O DASHBOARD */}
          {/* A rota "/dashboard/*" só será acessível para usuários logados. */}
          <Route 
            path="/dashboard/*" 
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            } 
          />
          
          {/* ✅ REDIRECIONAMENTO PADRÃO */}
          {/* Se um usuário logado tentar aceder a uma rota que não seja o dashboard, ele é redirecionado. */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    </AppProvider>
  );
}

export default App;
