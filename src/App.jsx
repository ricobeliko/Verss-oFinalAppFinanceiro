// src/App.jsx

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useAppContext } from './context/AppContext';
import AuthScreen from './features/auth/AuthScreen';
import DashboardLayout from './features/dashboard/DashboardLayout';
import LandingPage from './features/landing/LandingPage';
import Spinner from './components/Spinner';

// Componente para proteger rotas que exigem autenticação
function ProtectedRoute({ children }) {
  const { currentUser, isAuthReady } = useAppContext();

  if (!isAuthReady) {
    // Enquanto o estado de autenticação está sendo verificado, mostramos um spinner
    return <div className="flex justify-center items-center h-screen bg-gray-900"><Spinner /></div>;
  }

  // Se o usuário não estiver logado, redireciona para a Landing Page
  if (!currentUser) {
    // ✅ CORREÇÃO AQUI: Redireciona para a página inicial ("/") em vez de "/login"
    return <Navigate to="/" replace />;
  }
  
  // Se o usuário estiver logado, mas o e-mail não foi verificado,
  // ele é enviado para a tela de login, que contém a lógica para lidar com isso.
  if (!currentUser.emailVerified) {
    return <Navigate to="/login" replace />;
  }

  // Se estiver logado e verificado, renderiza o componente filho (o DashboardLayout)
  return children;
}

// Componente para rotas públicas que não devem ser acessadas por usuários logados
function PublicRoute({ children }) {
  const { currentUser, isAuthReady } = useAppContext();

  if (!isAuthReady) {
    // Mostra um spinner enquanto verifica o status de autenticação
    return <div className="flex justify-center items-center h-screen bg-gray-900"><Spinner /></div>;
  }
  
  // Se o usuário já estiver logado e verificado, redireciona para o dashboard
  if (currentUser && currentUser.emailVerified) {
    return <Navigate to="/dashboard" replace />;
  }

  // Caso contrário, renderiza a rota pública (Login ou LandingPage)
  return children;
}

function App() {
  return (
    <AppProvider>
      <Router>
        <Routes>
          {/* Rotas Públicas */}
          {/* Usamos o PublicRoute para garantir que usuários logados não vejam a landing page ou a tela de login */}
          <Route 
            path="/" 
            element={
              <PublicRoute>
                <LandingPage />
              </PublicRoute>
            } 
          />
          <Route 
            path="/login" 
            element={
              <PublicRoute>
                <AuthScreen />
              </PublicRoute>
            } 
          />

          {/* Rota Protegida para o Dashboard */}
          <Route 
            path="/dashboard/*" 
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            } 
          />
          
          {/* Redirecionamento Padrão */}
          {/* Qualquer outra rota inválida redireciona para a página inicial */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    </AppProvider>
  );
}

export default App;
