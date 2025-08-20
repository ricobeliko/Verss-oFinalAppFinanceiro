// src/features/auth/AuthScreen.jsx

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
import { doc, setDoc } from 'firebase/firestore';
import { useAppContext } from '../../context/AppContext';

// --- Ícones ---
const FinControlLogo = ({ className }) => (
    <svg className={className} width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);

// --- Componente Principal ---
function AuthScreen() {
    const { auth, db, currentUser, getUserCollectionPathSegments, showToast } = useAppContext();
    const navigate = useNavigate();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [userName, setUserName] = useState('');
    const [isRegistering, setIsRegistering] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Efeito para preencher o e-mail lembrado e redirecionar se já estiver logado
    useEffect(() => {
        if (currentUser) {
            navigate('/dashboard');
        }
        const savedEmail = localStorage.getItem('rememberedEmail');
        if (savedEmail) {
            setEmail(savedEmail);
            setRememberMe(true);
        }
    }, [currentUser, navigate]);

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
                createdAt: new Date(),
                plan: 'free',
                isPro: false,
                trialExpiresAt: null,
            });
            
            showToast('Cadastro realizado! Verifique seu e-mail para ativar a conta.', 'success');
            await signOut(auth);
            setIsRegistering(false); // Volta para a tela de login
            // Limpa os campos após o sucesso
            setEmail('');
            setPassword('');
            setConfirmPassword('');
            setUserName('');

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
        if (!auth) {
            showToast("Serviço de autenticação indisponível.", "error");
            return;
        }

        setIsLoading(true);
        try {
            // Define a persistência da sessão
            await setPersistence(auth, browserLocalPersistence);
            const userCredential = await signInWithEmailAndPassword(auth, email, password);

            if (!userCredential.user.emailVerified) {
                showToast('Por favor, verifique seu e-mail antes de fazer login.', 'warning');
                await signOut(auth); // Desloga o usuário se o e-mail não for verificado
                return;
            }

            if (rememberMe) {
                localStorage.setItem('rememberedEmail', email);
            } else {
                localStorage.removeItem('rememberedEmail');
            }
            // O redirecionamento será tratado pelo useEffect que observa 'currentUser'
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
    
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900 text-gray-200 p-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <FinControlLogo className="mx-auto text-purple-500" />
                    <h1 className="text-3xl font-roboto font-bold tracking-wider text-white mt-2">FinControl</h1>
                    <p className="text-gray-400 mt-1">Seu controle financeiro, simples e visual.</p>
                </div>

                <div className="bg-gray-800 p-8 rounded-lg shadow-2xl">
                    <h2 className="text-2xl font-bold text-center mb-6 text-white">
                        {isRegistering ? 'Crie sua Conta' : 'Acesse sua Conta'}
                    </h2>

                    <form onSubmit={isRegistering ? handleRegister : handleLogin} className="space-y-4">
                        {isRegistering && (
                            <input type="text" placeholder="Seu nome" value={userName} onChange={(e) => setUserName(e.target.value)} className="w-full p-3 bg-gray-700 border-2 border-gray-600 rounded-lg focus:ring-purple-500 focus:border-purple-500 transition" required />
                        )}
                        <input type="email" placeholder="Seu e-mail" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-3 bg-gray-700 border-2 border-gray-600 rounded-lg focus:ring-purple-500 focus:border-purple-500 transition" required autoComplete="email" />
                        <input type="password" placeholder="Sua senha" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-3 bg-gray-700 border-2 border-gray-600 rounded-lg focus:ring-purple-500 focus:border-purple-500 transition" required autoComplete={isRegistering ? "new-password" : "current-password"} />
                        {isRegistering && (
                            <input type="password" placeholder="Confirme a senha" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full p-3 bg-gray-700 border-2 border-gray-600 rounded-lg focus:ring-purple-500 focus:border-purple-500 transition" required autoComplete="new-password" />
                        )}
                        
                        {!isRegistering && (
                            <div className="flex items-center justify-between">
                                <label className="flex items-center text-sm text-gray-400">
                                    <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="h-4 w-4 bg-gray-700 border-gray-600 text-purple-600 focus:ring-purple-500 rounded" />
                                    <span className="ml-2">Lembrar e-mail</span>
                                </label>
                                {/* Futuramente, um link de "Esqueci a senha" pode ser adicionado aqui */}
                            </div>
                        )}

                        <button type="submit" disabled={isLoading} className="w-full bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 transition duration-300 shadow-lg disabled:bg-purple-800 disabled:cursor-not-allowed">
                            {isLoading ? 'Processando...' : (isRegistering ? 'Registrar' : 'Entrar')}
                        </button>
                    </form>
                    
                    <p className="mt-6 text-center text-sm text-gray-400">
                        {isRegistering ? 'Já tem uma conta?' : 'Não tem uma conta?'}
                        <button onClick={() => setIsRegistering(prev => !prev)} className="font-semibold text-purple-400 hover:text-purple-300 ml-1">
                            {isRegistering ? 'Faça login' : 'Crie uma agora'}
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
}

export default AuthScreen;