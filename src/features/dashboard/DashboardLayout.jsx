// src/features/dashboard/DashboardLayout.jsx

import React, { useState, useEffect, useRef } from 'react';
import { signOut } from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { useAppContext } from '../../context/AppContext';
import { auth, functions } from '../../utils/firebase';
import { useNavigate } from 'react-router-dom';

// Páginas do painel
import Dashboard from './Dashboard';
import ClientManagement from '../clients/ClientManagement';
import CardManagement from '../cards/CardManagement';
import UnifiedTransactionManagement from '../transactions/TransactionManagement';
import SubscriptionManagement from '../subscriptions/SubscriptionManagement';

// --- Ícones ---
const FinControlLogo = ({ className }) => ( <svg className={className} width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"> <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/> <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/> <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/> </svg> );
const LogoutIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg> );
const ShieldCheckIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg> );
const ShieldIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> );
const StarIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg> );

// --- Componente de Status do Usuário ---
function UserStatusBadge() {
    const { isPro, isTrialActive, userProfile, showToast, activateFreeTrial } = useAppContext();
    const [isLoading, setIsLoading] = useState(false);
    const [timeRemaining, setTimeRemaining] = useState('');

    useEffect(() => {
        if (isTrialActive && userProfile?.trialExpiresAt) {
            const trialEndDate = userProfile.trialExpiresAt.toDate().getTime();
            const updateRemainingTime = () => {
                const now = new Date().getTime();
                const difference = trialEndDate - now;
                if (difference > 0) {
                    const days = Math.floor(difference / (1000 * 60 * 60 * 24));
                    const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                    setTimeRemaining(`${days}d ${hours}h`);
                } else { setTimeRemaining('Expirado'); }
            };
            updateRemainingTime();
            const interval = setInterval(updateRemainingTime, 60000);
            return () => clearInterval(interval);
        }
    }, [isTrialActive, userProfile]);

    const handleUpgrade = async () => {
        setIsLoading(true);
        try {
            const createStripeCheckout = httpsCallable(functions, 'createStripeCheckout');
            const { url } = (await createStripeCheckout()).data;
            window.location.href = url;
        } catch (error) {
            console.error("Erro ao chamar a Cloud Function:", error);
            showToast(error.message || "Ocorreu um erro.", "error");
        } finally {
            setIsLoading(false);
        }
    };

    if (isPro) {
        return <div className="flex items-center gap-2 text-purple-400 text-xs font-semibold"><ShieldCheckIcon /><span>PRO</span></div>;
    }
    if (isTrialActive) {
        return <div className="flex items-center gap-2 text-green-400 text-xs font-semibold"><StarIcon /><span>MÊS GRÁTIS ({timeRemaining})</span></div>;
    }
    return (
        <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 text-gray-400 text-xs font-semibold"><ShieldIcon /><span>FREE</span></div>
            {!userProfile?.trialExpiresAt && (
              <button onClick={activateFreeTrial} className="bg-purple-600 text-white font-semibold py-1 px-2 rounded-md hover:bg-purple-700 transition text-xs">Ativar Mês Grátis</button>
            )}
            <button onClick={handleUpgrade} disabled={isLoading} className="bg-purple-600 text-white font-semibold py-1 px-2 rounded-md hover:bg-purple-700 transition disabled:opacity-50 text-xs">
                {isLoading ? 'Aguarde...' : 'Tornar-se PRO'}
            </button>
        </div>
    );
}

// --- Componente Principal do Layout ---
export default function DashboardLayout() {
    const { currentUser } = useAppContext();
    const [activePage, setActivePage] = useState('resumo');
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const profileRef = useRef(null);
    const navigate = useNavigate();

    const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));
    const [selectedCardFilter, setSelectedCardFilter] = useState('');
    const [selectedClientFilter, setSelectedClientFilter] = useState('');

    const handleLogout = () => {
        signOut(auth).then(() => {
            navigate('/');
        }).catch((error) => {
            console.error("Erro ao fazer logout:", error);
        });
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (profileRef.current && !profileRef.current.contains(event.target)) {
                setIsProfileOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);
    
    const pageProps = {
        selectedMonth, setSelectedMonth,
        selectedCardFilter, setSelectedCardFilter,
        selectedClientFilter, setSelectedClientFilter,
    };

    const renderActivePage = () => {
        switch (activePage) {
            case 'resumo': return <Dashboard {...pageProps} />;
            case 'pessoas': return <ClientManagement />;
            case 'cards': return <CardManagement />;
            case 'transactions': return <UnifiedTransactionManagement />;
            case 'subscriptions': return <SubscriptionManagement {...pageProps} />;
            default: return <Dashboard {...pageProps} />;
        }
    };
    
    const navLinks = [
        { id: 'resumo', label: 'Resumo' },
        { id: 'pessoas', label: 'Pessoas' },
        { id: 'cards', label: 'Cartões' },
        { id: 'transactions', label: 'Movimentações' },
        { id: 'subscriptions', label: 'Assinaturas' },
    ];

    return (
        <div className="min-h-screen bg-[#1e1e1e] font-sans text-gray-300 flex flex-col">
            <header className="bg-gray-900/50 border-b border-gray-800 backdrop-blur-sm sticky top-0 z-40">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center gap-2">
                            <FinControlLogo className="text-purple-500" />
                            <h1 className="text-xl font-roboto font-bold tracking-wider text-white">FinControl</h1>
                        </div>
                        <nav className="hidden md:flex items-center space-x-2">
                            {navLinks.map(link => (
                                <button
                                    key={link.id}
                                    onClick={() => setActivePage(link.id)}
                                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${activePage === link.id ? 'bg-purple-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
                                >
                                    {link.label}
                                </button>
                            ))}
                        </nav>
                        <div className="flex items-center gap-4">
                            <div className="hidden sm:block">
                                <UserStatusBadge />
                            </div>
                            <div className="relative" ref={profileRef}>
                                <button 
                                    onClick={() => setIsProfileOpen(!isProfileOpen)} 
                                    className="w-9 h-9 rounded-full bg-gray-700 flex items-center justify-center font-bold text-purple-300 hover:bg-gray-600 transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-purple-500"
                                >
                                    {currentUser?.email?.[0].toUpperCase() || 'P'}
                                </button>
                                {isProfileOpen && (
                                    <div className="absolute right-0 mt-2 w-56 origin-top-right rounded-md bg-gray-800 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                                        <div className="py-1">
                                            <div className="px-4 py-2 border-b border-gray-700">
                                                <p className="text-sm text-white">Logado como</p>
                                                <p className="text-sm font-medium text-gray-300 truncate">{currentUser?.email}</p>
                                            </div>
                                            <div className="sm:hidden p-4 border-b border-gray-700">
                                                <UserStatusBadge />
                                            </div>
                                            <button onClick={handleLogout} className="flex w-full items-center gap-3 px-4 py-2 text-sm transition text-red-400 hover:bg-red-500/20 hover:text-red-300">
                                                <LogoutIcon /> Sair da conta
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
                <div className="md:hidden border-t border-gray-800">
                    <nav className="flex items-center justify-center p-2 space-x-1 overflow-x-auto">
                        {navLinks.map(link => (
                            <button
                                key={link.id}
                                onClick={() => setActivePage(link.id)}
                                className={`flex-shrink-0 px-3 py-2 rounded-md text-sm font-medium transition-colors ${activePage === link.id ? 'bg-purple-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
                            >
                                {link.label}
                            </button>
                        ))}
                    </nav>
                </div>
            </header>
            <main className="flex-1 container mx-auto p-4 sm:p-6 lg:p-8">
                {renderActivePage()}
            </main>
        </div>
    );
}