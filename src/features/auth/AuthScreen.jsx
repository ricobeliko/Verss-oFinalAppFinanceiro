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
    
    // ✅ 1. Novos estados para a tela de verificação
    const [showVerification, setShowVerification] = useState(false);
    const [countdown, setCountdown] = useState(10);

    useEffect(() => {
        const savedEmail = localStorage.getItem('rememberedEmail');
        if (savedEmail) {
            setEmail(savedEmail);
            setRememberMe(true);
        }
    }, []);

    // ✅ 2. Efeito para controlar o contador regressivo
    useEffect(() => {
        let timer;
        if (showVerification && countdown > 0) {
            timer = setTimeout(() => setCountdown(countdown - 1), 1000);
        } else if (showVerification && countdown === 0) {
            // Quando o tempo acabar, volta para a tela de login
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

            // ✅ 3. Ativar a tela de verificação em vez de limpar o formulário
            setShowVerification(true);
            setCountdown(10); // Reinicia o contador
            
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

    // ✅ 4. Renderização condicional da nova tela
    if (showVerification) {
        return (
            <div className="min-h-screen bg-[#1e1e1e] flex items-center justify-center p-4 font-sans text-white">
                <div className="w-full max-w-md bg-gray-900/50 backdrop-blur-sm border border-gray-700 rounded-2xl shadow-lg p-8 text-center">
                    <MailIcon className="mx-auto text-purple-500" />
                    <h2 className="text-2xl font-bold mt-4 mb-2">Confirme seu E-mail</h2>
                    <p className="text-gray-300">
                        Enviamos um link de verificação para <strong className="text-purple-400">{email}</strong>.
                        Por favor, verifique sua caixa de entrada e spam para ativar sua conta.
                    </p>
                    <p className="text-gray-400 mt-6 text-sm">
                        Você será redirecionado para a tela de login em <strong className="text-white">{countdown}</strong> segundos.
                    </p>
                </div>
            </div>
        );
    }
    
    return (
        <div className="min-h-screen bg-[#1e1e1e] flex items-center justify-center p-4 font-sans">
            <div className="w-full max-w-md bg-gray-900/50 backdrop-blur-sm border border-gray-700 rounded-2xl shadow-lg p-8">
                <div className="text-center mb-8">
                    <FinControlLogo className="mx-auto text-purple-500" />
                    <h1 className="text-3xl font-bold tracking-wider text-white mt-4">FinControl</h1>
                    <p className="text-gray-400">{isRegistering ? 'Crie sua conta para começar' : 'Bem-vindo de volta'}</p>
                </div>

                <form onSubmit={isRegistering ? handleRegister : handleLogin}>
                    {isRegistering && (
                        <div className="mb-4">
                            <label className="block text-gray-400 text-sm font-bold mb-2" htmlFor="userName">Nome</label>
                            <input
                                id="userName"
                                type="text"
                                value={userName}
                                onChange={(e) => setUserName(e.target.value)}
                                placeholder="Seu nome completo"
                                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                                required
                            />
                        </div>
                    )}
                    <div className="mb-4">
                        <label className="block text-gray-400 text-sm font-bold mb-2" htmlFor="email">Email</label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="seu@email.com"
                            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                            required
                        />
                    </div>
                    <div className="mb-6">
                        <label className="block text-gray-400 text-sm font-bold mb-2" htmlFor="password">Senha</label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="********"
                            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                            required
                        />
                    </div>
                    {isRegistering && (
                         <div className="mb-6">
                            <label className="block text-gray-400 text-sm font-bold mb-2" htmlFor="confirmPassword">Confirmar Senha</label>
                            <input
                                id="confirmPassword"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="********"
                                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                                required
                            />
                        </div>
                    )}
                     {!isRegistering && (
                        <div className="flex items-center justify-between mb-6">
                            <label className="flex items-center text-gray-400 text-sm">
                                <input
                                    type="checkbox"
                                    checked={rememberMe}
                                    onChange={(e) => setRememberMe(e.target.checked)}
                                    className="form-checkbox h-4 w-4 text-purple-600 bg-gray-800 border-gray-600 rounded focus:ring-purple-500"
                                />
                                <span className="ml-2">Lembrar-me</span>
                            </label>
                            <a href="#" className="text-sm text-purple-500 hover:text-purple-400">Esqueceu a senha?</a>
                        </div>
                    )}
                    <div className="flex items-center justify-between">
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded-md focus:outline-none focus:shadow-outline transition duration-300 disabled:opacity-50 flex items-center justify-center"
                        >
                            {isLoading && <Spinner />}
                            <span className="ml-2">{isRegistering ? 'Cadastrar' : 'Entrar'}</span>
                        </button>
                    </div>
                </form>
                <div className="text-center mt-6">
                    <button onClick={() => {
                        setIsRegistering(!isRegistering);
                        // Limpa o formulário ao trocar entre login e registro
                        setUserName('');
                        setEmail(localStorage.getItem('rememberedEmail') || '');
                        setPassword('');
                        setConfirmPassword('');
                    }} className="text-sm text-gray-400 hover:text-white">
                        {isRegistering ? 'Já tem uma conta? Faça login' : 'Não tem uma conta? Cadastre-se'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default AuthScreen;

