// src/features/auth/AuthScreen.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  setPersistence,
  browserLocalPersistence,
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useAppContext } from '../../context/AppContext';
import Button from '../../design-system/primitives/Button';
import TextField from '../../design-system/primitives/TextField';
import Surface from '../../design-system/primitives/Surface';
import AuthProductContext from './components/AuthProductContext';
import PasswordResetModal from './components/PasswordResetModal';
import EmailVerificationView from './components/EmailVerificationView';
import { mapAuthError } from './authErrorMap';

const FinControlLogo = ({ className = 'w-8 h-8 text-[var(--fc-accent)]' }) => (
  <svg
    aria-hidden="true"
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M12 2L2 7L12 12L22 7L12 2Z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M2 17L12 22L22 17"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M2 12L12 17L22 12"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export default function AuthScreen() {
  const { auth, db, getUserCollectionPathSegments, showToast } = useAppContext();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Mode: register ou login (honra links externos como ?mode=register)
  const initialModeRegister = searchParams.get('mode') === 'register';
  const [isRegistering, setIsRegistering] = useState(initialModeRegister);

  // Campos do formulário
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [userName, setUserName] = useState('');
  const [rememberEmail, setRememberEmail] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Verificação de e-mail e recuperação de senha
  const [showVerification, setShowVerification] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  // Carrega e-mail lembrado previamente no localStorage
  useEffect(() => {
    const savedEmail = localStorage.getItem('rememberedEmail');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberEmail(true);
    }
  }, []);

  // Sincroniza query parameter caso alterado externamente
  useEffect(() => {
    const mode = searchParams.get('mode');
    if (mode === 'register') {
      setIsRegistering(true);
      setShowVerification(false);
    } else if (mode === 'login') {
      setIsRegistering(false);
      setShowVerification(false);
    } else if (mode === 'verify') {
      setShowVerification(true);
      if (!email) {
        setEmail(searchParams.get('email') || 'usuario.exemplo@fincontrol.com');
      }
    }
  }, [searchParams, email]);

  // Cadastro
  const handleRegister = async (e) => {
    e.preventDefault();

    if (password.length < 8) {
      showToast('A senha deve ter no mínimo 8 caracteres.', 'warning');
      return;
    }

    if (password !== confirmPassword) {
      showToast('As senhas não coincidem.', 'warning');
      return;
    }

    setIsLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await sendEmailVerification(userCredential.user);

      const userCollectionPath = getUserCollectionPathSegments();
      const userDocRef = doc(db, ...userCollectionPath, userCredential.user.uid);

      await setDoc(userDocRef, {
        name: userName.trim(),
        email: email.trim(),
        createdAt: serverTimestamp(),
        plan: 'free',
        trialExpiresAt: null,
      });

      await signOut(auth);

      setShowVerification(true);
    } catch (error) {
      console.error('Erro no cadastro:', error);
      const friendlyMessage = mapAuthError(
        error,
        'Não foi possível concluir seu cadastro. Tente novamente.'
      );
      showToast(friendlyMessage, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Login
  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await setPersistence(auth, browserLocalPersistence);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);

      if (!userCredential.user.emailVerified) {
        showToast('Por favor, verifique seu e-mail antes de fazer login.', 'warning');
        await signOut(auth);
        setIsLoading(false);
        return;
      }

      if (rememberEmail) {
        localStorage.setItem('rememberedEmail', email.trim());
      } else {
        localStorage.removeItem('rememberedEmail');
      }

      navigate('/dashboard');
    } catch (error) {
      console.error('Erro no login:', error);
      const friendlyMessage = mapAuthError(error, 'E-mail ou senha inválidos.');
      showToast(friendlyMessage, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Recuperação de senha delegada ao modal DS2
  const handleSendResetEmail = async (targetEmail) => {
    await sendPasswordResetEmail(auth, targetEmail);
  };

  // Tela de verificação após cadastro
  if (showVerification) {
    return (
      <div
        data-theme="dark"
        className="min-h-screen bg-[var(--fc-bg)] flex items-center justify-center p-4 sm:p-6"
      >
        <EmailVerificationView
          email={email}
          onBackToLogin={() => {
            setShowVerification(false);
            setIsRegistering(false);
            setPassword('');
            setConfirmPassword('');
          }}
        />
      </div>
    );
  }

  return (
    <div
      data-theme="dark"
      className="min-h-screen bg-[var(--fc-bg)] text-[var(--fc-text-primary)] flex items-center justify-center p-4 sm:p-6 lg:p-10 font-sans"
    >
      <div className="w-full max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        {/* Painel Contextual do Produto (Desktop) */}
        <div className="col-span-12 lg:col-span-5 flex">
          <AuthProductContext />
        </div>

        {/* Card Principal de Formulário (DS2 Surface) */}
        <div className="col-span-12 lg:col-span-7 flex">
          <Surface
            variant="elevated"
            className="w-full max-w-md mx-auto p-6 sm:p-8 flex flex-col justify-between"
          >
            <div>
              {/* Header do Formulário */}
              <div className="text-center mb-6 sm:mb-8 space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-[var(--fc-accent-soft)] border border-[var(--fc-accent)]/20 flex items-center justify-center mx-auto shadow-sm">
                  <FinControlLogo />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--fc-text-primary)]">
                    Fin<span className="text-[var(--fc-accent)]">Control</span>
                  </h1>
                  <p className="text-xs sm:text-sm text-[var(--fc-text-secondary)] mt-1">
                    {isRegistering
                      ? 'Crie sua conta gratuita para começar'
                      : 'Acesse seu painel financeiro consolidado'}
                  </p>
                </div>
              </div>

              {/* Formulário de Acesso */}
              <form
                onSubmit={isRegistering ? handleRegister : handleLogin}
                className="space-y-4"
                noValidate
              >
                {isRegistering && (
                  <TextField
                    id="userName"
                    label="Nome Completo"
                    type="text"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder="Seu nome completo"
                    autoComplete="name"
                    required
                    disabled={isLoading}
                  />
                )}

                <TextField
                  id="email"
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  autoComplete="email"
                  required
                  disabled={isLoading}
                />

                <TextField
                  id="password"
                  label="Senha"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  autoComplete={isRegistering ? 'new-password' : 'current-password'}
                  required
                  disabled={isLoading}
                  helperText={
                    isRegistering ? 'A senha deve conter no mínimo 8 caracteres' : undefined
                  }
                />

                {isRegistering && (
                  <TextField
                    id="confirmPassword"
                    label="Confirmar Senha"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repita a sua senha"
                    autoComplete="new-password"
                    required
                    disabled={isLoading}
                  />
                )}

                {/* Linha de Apoio: Lembrar e-mail + Recuperação de Senha */}
                {!isRegistering && (
                  <div className="flex items-center justify-between text-xs pt-1">
                    <label className="flex items-center gap-2 text-[var(--fc-text-secondary)] hover:text-[var(--fc-text-primary)] cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={rememberEmail}
                        onChange={(e) => setRememberEmail(e.target.checked)}
                        className="w-4 h-4 rounded bg-[var(--fc-surface-2)] border border-[var(--fc-border-default)] accent-[var(--fc-accent)] focus:ring-2 focus:ring-[var(--fc-focus-ring)] cursor-pointer"
                      />
                      <span>Lembrar e-mail</span>
                    </label>

                    <button
                      type="button"
                      onClick={() => setIsResetModalOpen(true)}
                      className="min-h-[44px] inline-flex items-center text-[var(--fc-accent)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--fc-focus-ring)] rounded-lg px-2 cursor-pointer transition font-medium"
                    >
                      Esqueceu a senha?
                    </button>
                  </div>
                )}

                {/* Botão de Submissão Principal */}
                <div className="pt-2">
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    isLoading={isLoading}
                    disabled={isLoading}
                    className="w-full font-bold shadow-[var(--fc-shadow-md)]"
                  >
                    {isRegistering ? 'Criar Conta' : 'Entrar'}
                  </Button>
                </div>
              </form>
            </div>

            {/* Alternância de Modo (Login ↔ Cadastro) */}
            <div className="text-center mt-6 pt-5 border-t border-[var(--fc-border-subtle)]">
              <button
                type="button"
                onClick={() => {
                  setIsRegistering((prev) => !prev);
                  setPassword('');
                  setConfirmPassword('');
                }}
                className="min-h-[44px] inline-flex items-center justify-center text-xs text-[var(--fc-text-secondary)] hover:text-[var(--fc-accent)] transition font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--fc-focus-ring)] rounded-xl px-3 cursor-pointer"
              >
                {isRegistering
                  ? 'Já possui uma conta? Entrar'
                  : 'Não tem uma conta? Cadastre-se'}
              </button>
            </div>
          </Surface>
        </div>
      </div>

      {/* Modal de Recuperação de Senha (DS2) */}
      <PasswordResetModal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        initialEmail={email}
        onSendReset={handleSendResetEmail}
      />
    </div>
  );
}