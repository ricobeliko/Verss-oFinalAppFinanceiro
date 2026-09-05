// src/App.jsx

import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAppContext } from './context/AppContext';
import Spinner from './components/Spinner';

// Route-level code splitting para carregamento sob demanda
const AuthScreen = lazy(() => import('./features/auth/AuthScreen'));
const DashboardLayout = lazy(() => import('./features/dashboard/DashboardLayout'));
const LandingPage = lazy(() => import('./features/landing/LandingPage'));

const RouteFallback = () => (
  <div className="flex justify-center items-center h-screen bg-carbon-900">
    <Spinner />
  </div>
);

// Componente para proteger rotas que exigem autenticação
function ProtectedRoute({ children }) {
  const { currentUser, isAuthReady } = useAppContext();

  if (!isAuthReady) {
    return <RouteFallback />;
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
    return <RouteFallback />;
  }
  
  if (currentUser && currentUser.emailVerified) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

function App() {
  return (
    <Router>
      <Suspense fallback={<RouteFallback />}>
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
      </Suspense>
    </Router>
  );
}

export default App;