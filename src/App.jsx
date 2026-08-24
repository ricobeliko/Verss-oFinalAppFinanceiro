// src/App.jsx

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAppContext } from './context/AppContext';
import AuthScreen from './features/auth/AuthScreen';
import DashboardLayout from './features/dashboard/DashboardLayout';
import LandingPage from './features/landing/LandingPage';
import Spinner from './components/Spinner';

// Componente para proteger rotas que exigem autenticação
function ProtectedRoute({ children }) {
  const { currentUser, isAuthReady } = useAppContext();

  if (!isAuthReady) {
    return (
      <div className="flex justify-center items-center h-screen bg-carbon-900">
        <Spinner />
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/" replace />;
  }
  
  if (!currentUser.emailVerified) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

// Componente para rotas públicas que não devem ser acessadas por usuários logados
function PublicRoute({ children }) {
  const { currentUser, isAuthReady } = useAppContext();

  if (!isAuthReady) {
    return (
      <div className="flex justify-center items-center h-screen bg-carbon-900">
        <Spinner />
      </div>
    );
  }
  
  if (currentUser && currentUser.emailVerified) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

function App() {
  return (
    <Router>
      <Routes>
        {/* Rotas Públicas */}
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
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;