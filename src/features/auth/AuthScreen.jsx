// src/pages/AuthScreen.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    createUserWithEmailAndPassword,
    sendEmailVerification,
    signInWithEmailAndPassword,
    signOut,
    setPersistence,
    browserLocalPersistence
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useAppContext } from '/src/context/AppContext';
import Spinner from '/src/components/Spinner';

// --- Ícones ---
const FinControlLogo = ({ className }) => (
    <svg className={className} width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);

const MailIcon = ({ className }) => (
    <svg className={className} width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path>
        <polyline points="22,6 12,13 2,6"></polyline>
    </svg>
);

// --- Componente Principal ---
function AuthScreen() {
    const { auth, db, getUserCollectionPathSegments, showToast } = useAppContext();
    const navigate = useNavigate();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [userName, setUserName] = useState('');
    const [isRegistering, setIsRegistering] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    
    // Estados para a tela de verificação
    const [showVerification, setShowVerification] = useState(false);
    const [countdown, setCountdown] = useState(10);

    useEffect(() => {
        const savedEmail = localStorage.getItem('rememberedEmail');
        if (savedEmail) {
            setEmail(savedEmail);
            setRememberMe(true);
        }
    }, []);

    // Efeito para controlar o contador regressivo
    useEffect(() => {
        let timer;
        if (showVerification && countdown > 0) {
            timer = setTimeout(() => setCountdown(countdown - 1), 1000);
        } else if (showVerification && countdown === 0) {
            setShowVerification(false);
            setIsRegistering(false);
        }
        return () => clearTimeout(timer);
    }, [showVerification, countdown]);

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
                name: userName,
                email: email,
                createdAt: serverTimestamp(),
                plan: "free",
                trialExpiresAt: null,
            });

            await signOut(auth);

            setShowVerification(true);
            setCountdown(10);
            
        } catch (error) {
            console.error("Erro no cadastro:", error);
            if (error.code === 'auth/email-already-in-use') {
                showToast('Este e-mail já está em uso. Tente fazer login.', 'error');
            } else {
                showToast(`Erro no cadastro: ${error.message}`, 'error');
            }
        } finally {
            setIsLoading(false);
        }
    };
    
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

            if (rememberMe) {
                localStorage.setItem('rememberedEmail', email);
            } else {
                localStorage.removeItem('rememberedEmail');
            }
            navigate('/dashboard');
        } catch (error) {
            console.error("Erro no login:", error);
            if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                showToast('E-mail ou senha inválidos.', 'error');
            } else {
                showToast(`Erro no login: ${error.message}`, 'error');
            }
        } finally {
            setIsLoading(false);
        }
    };

    if (showVerification) {
        return (
            <div className="min-h-screen bg-carbon-900 flex items-center justify-center p-4 font-sans text-gray-300">
                <div className="w-full max-w-md bg-carbon-900 border border-carbon-800 rounded-3xl shadow-2xl p-8 text-center space-y-6">
                    <div className="w-16 h-16 rounded-2xl bg-gold/10 text-gold border border-gold/20 flex items-center justify-center mx-auto shadow-lg">
                        <MailIcon className="text-gold" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-gold-cream tracking-tight mb-2">Confirme seu E-mail</h2>
                        <p className="text-sm text-gray-400 leading-relaxed">
                            Enviamos um link de verificação para <strong className="text-gold">{email}</strong>.
                            Por favor, verifique sua caixa de entrada e spam para ativar sua conta.
                        </p>
                    </div>
                    <p className="text-xs text-gray-500 pt-2 border-t border-carbon-800">
                        Você será redirecionado para a tela de login em <strong className="text-gold-cream font-bold">{countdown}</strong> segundos.
                    </p>
                </div>
            </div>
        );
    }
    
    return (
        <div className="min-h-screen bg-carbon-900 flex items-center justify-center p-4 font-sans text-gray-300">
            <div className="w-full max-w-md bg-carbon-900 border border-carbon-800 rounded-3xl shadow-2xl p-8">
                <div className="text-center mb-8">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-gold-light to-gold flex items-center justify-center text-carbon-900 mx-auto shadow-lg shadow-gold/20">
                        <FinControlLogo className="text-carbon-900" />
                    </div>
                    <h1 className="text-3xl font-black tracking-wider text-gold-cream mt-4">Fin<span className="text-gold">Control</span></h1>
                    <p className="text-sm text-gray-400 mt-1">{isRegistering ? 'Crie sua conta Black para começar' : 'Bem-vindo de volta ao seu painel'}</p>
                </div>

                <form onSubmit={isRegistering ? handleRegister : handleLogin} className="space-y-4">
                    {isRegistering && (
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1.5" htmlFor="userName">Nome</label>
                            <input
                                id="userName"
                                type="text"
                                value={userName}
                                onChange={(e) => setUserName(e.target.value)}
                                placeholder="Seu nome completo"
                                className="w-full px-4 py-3.5 bg-carbon-800 border border-carbon-700 rounded-2xl text-gold-cream placeholder:text-gray-500 focus:ring-2 focus:ring-gold focus:outline-none transition-all text-sm font-medium"
                                required
                            />
                        </div>
                    )}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1.5" htmlFor="email">Email</label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="seu@email.com"
                            className="w-full px-4 py-3.5 bg-carbon-800 border border-carbon-700 rounded-2xl text-gold-cream placeholder:text-gray-500 focus:ring-2 focus:ring-gold focus:outline-none transition-all text-sm font-medium"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1.5" htmlFor="password">Senha</label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="********"
                            className="w-full px-4 py-3.5 bg-carbon-800 border border-carbon-700 rounded-2xl text-gold-cream placeholder:text-gray-500 focus:ring-2 focus:ring-gold focus:outline-none transition-all text-sm font-medium"
                            required
                        />
                    </div>
                    {isRegistering && (
                         <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1.5" htmlFor="confirmPassword">Confirmar Senha</label>
                            <input
                                id="confirmPassword"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="********"
                                className="w-full px-4 py-3.5 bg-carbon-800 border border-carbon-700 rounded-2xl text-gold-cream placeholder:text-gray-500 focus:ring-2 focus:ring-gold focus:outline-none transition-all text-sm font-medium"
                                required
                            />
                        </div>
                    )}
                    {!isRegistering && (
                        <div className="flex items-center justify-between text-sm pt-1">
                            <label className="flex items-center text-gray-400 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={rememberMe}
                                    onChange={(e) => setRememberMe(e.target.checked)}
                                    className="form-checkbox h-4 w-4 text-gold bg-carbon-800 border-carbon-700 rounded focus:ring-gold accent-gold"
                                />
                                <span className="ml-2">Lembrar-me</span>
                            </label>
                            <a href="#" className="text-gold hover:text-gold-light transition font-medium">Esqueceu a senha?</a>
                        </div>
                    )}
                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-gradient-to-r from-gold-light to-gold hover:opacity-90 text-carbon-900 font-bold py-3.5 px-4 rounded-2xl shadow-lg shadow-gold/20 transition duration-300 disabled:opacity-50 flex items-center justify-center cursor-pointer"
                        >
                            {isLoading && <Spinner />}
                            <span className={isLoading ? "ml-2" : ""}>{isRegistering ? 'Criar Conta' : 'Entrar'}</span>
                        </button>
                    </div>
                </form>
                <div className="text-center mt-6">
                    <button onClick={() => {
                        setIsRegistering(!isRegistering);
                        setUserName('');
                        setEmail(localStorage.getItem('rememberedEmail') || '');
                        setPassword('');
                        setConfirmPassword('');
                    }} className="text-sm text-gray-400 hover:text-gold transition cursor-pointer font-medium">
                        {isRegistering ? 'Já tem uma conta? Faça login' : 'Não tem uma conta? Cadastre-se'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default AuthScreen;