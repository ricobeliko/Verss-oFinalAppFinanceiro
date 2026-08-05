// src/features/dashboard/DashboardLayout.jsx

import React, { useState, useEffect, useRef } from 'react';
import { httpsCallable } from 'firebase/functions';
import { useAppContext } from '../../context/AppContext';
import { functions } from '../../utils/firebase';
import WelcomeModal from '../../components/WelcomeModal'; 

// Páginas do painel
import Dashboard from './Dashboard';
import ClientManagement from '../clients/ClientManagement';
import CardManagement from '../cards/CardManagement';
import UnifiedTransactionManagement from '../transactions/TransactionManagement';
import SubscriptionManagement from '../subscriptions/SubscriptionManagement';
import CrisisMode from '../crisis/CrisisMode'; // 👈 Importação do Modo Crise

// --- Ícones ---
const FinControlLogo = ({ className }) => ( <svg className={className} width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"> <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/> <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/> <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/> </svg> );
const LogoutIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg> );
const ShieldCheckIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg> );
const ShieldIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> );
const StarIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg> );
const SunIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg> );
const MoonIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg> );
const ChevronLeftIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg> );
const ChevronRightIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg> );
const LockIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> );

// Ícones dos Menus
const HomeIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>);
const UsersIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>);
const CreditCardIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>);
const ActivityIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>);
const RepeatIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>);
const ZapIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>);

// --- Componente de Status do Usuário ---
function UserStatusBadge({ isCollapsed }) {
    const { isPro, isTrialActive, userProfile, showToast, activateFreeTrial, currentUser } = useAppContext();
    const [isLoading, setIsLoading] = useState(false);

    if (isCollapsed) return null;

    if (isPro) {
        return <div className="flex items-center gap-2 text-gold text-xs font-semibold px-3 py-1 bg-gold/10 rounded-xl border border-gold/20"><ShieldCheckIcon /><span>BLACK PRO</span></div>;
    }
    if (isTrialActive) {
        return <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold px-3 py-1 bg-emerald-500/10 rounded-xl border border-emerald-500/20"><StarIcon /><span>VIP ATIVO</span></div>;
    }
    return (
        <div className="flex flex-col gap-2 w-full">
            <div className="flex items-center justify-between text-gray-400 text-xs font-semibold">
                <span>Plano Atual</span>
                <span className="text-gold">STANDARD</span>
            </div>
            {!userProfile?.trialExpiresAt && (
                <button onClick={activateFreeTrial} className="w-full bg-gold/20 text-gold border border-gold/30 font-bold py-1.5 px-3 rounded-xl hover:bg-gold/30 transition text-xs cursor-pointer">
                    Ativar Mês VIP
                </button>
            )}
        </div>
    );
}

// --- Componente Principal do Layout ---
export default function DashboardLayout() {
    const { currentUser, userProfile, isPro, isTrialActive, activateFreeTrial, logout, showToast } = useAppContext();
    const [activePage, setActivePage] = useState('resumo');
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const profileRef = useRef(null);
    const [isWelcomeModalOpen, setIsWelcomeModalOpen] = useState(false);

    const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');

    useEffect(() => {
        const root = document.documentElement;
        if (theme === 'dark') {
            root.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            root.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    }, [theme]);

    const handleThemeToggle = () => setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));

    const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));
    const [selectedCardFilter, setSelectedCardFilter] = useState('');
    const [selectedClientFilter, setSelectedClientFilter] = useState('');

    const handleLogout = () => logout();

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (profileRef.current && !profileRef.current.contains(event.target)) {
                setIsProfileOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);
    
    useEffect(() => {
        if (userProfile && !isPro && !userProfile.trialExpiresAt) {
            const hasSeenModal = sessionStorage.getItem('hasSeenWelcomeModal');
            if (!hasSeenModal) {
                setIsWelcomeModalOpen(true);
                sessionStorage.setItem('hasSeenWelcomeModal', 'true');
            }
        }
    }, [userProfile, isPro]);

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
            case 'crisis': return <CrisisMode selectedMonth={selectedMonth} />;
            default: return <Dashboard {...pageProps} />;
        }
    };
    
    const navLinks = [
        { id: 'resumo', label: 'Resumo', icon: <HomeIcon /> },
        { id: 'pessoas', label: 'Pessoas', icon: <UsersIcon /> },
        { id: 'cards', label: 'Cartões', icon: <CreditCardIcon /> },
        { id: 'transactions', label: 'Movimentações', icon: <ActivityIcon /> },
        { id: 'subscriptions', label: 'Assinaturas', icon: <RepeatIcon /> },
        { id: 'crisis', label: 'Modo Crise', icon: <ZapIcon />, proOnly: true }, // 👈 Adicionado com restrição PRO
    ];

    const handleNavClick = (link) => {
        if (link.proOnly && !isPro && !isTrialActive) {
            showToast("O Modo Crise é uma ferramenta exclusiva para membros BLACK PRO ou VIP.", "error");
            return;
        }
        setActivePage(link.id);
    };
    
    const isTrialAvailable = true;

    return (
        <div className="min-h-screen bg-carbon-900 font-sans text-gray-300 flex overflow-hidden transition-colors duration-300">
            
            <WelcomeModal 
                isOpen={isWelcomeModalOpen}
                onClose={() => setIsWelcomeModalOpen(false)}
                onActivateTrial={activateFreeTrial}
                isTrialAvailable={isTrialAvailable}
            />

            {/* SIDEBAR LATERAL ESQUERDA RETRÁTIL */}
            <aside className={`bg-carbon-900 border-r border-carbon-800 flex flex-col justify-between transition-all duration-300 z-30 ${isSidebarCollapsed ? 'w-20' : 'w-64'}`}>
                
                <div>
                    <div className="flex items-center justify-between p-4 border-b border-carbon-800 h-16">
                        {!isSidebarCollapsed && (
                            <div className="flex items-center gap-3 overflow-hidden">
                                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-gold-light to-gold flex items-center justify-center text-carbon-900 shadow-md shadow-gold/20 flex-shrink-0">
                                    <FinControlLogo className="text-carbon-900" />
                                </div>
                                <h1 className="text-lg font-roboto font-extrabold tracking-wider text-gold-cream truncate">Fin<span className="text-gold">Control</span></h1>
                            </div>
                        )}
                        {isSidebarCollapsed && (
                            <div className="mx-auto w-8 h-8 rounded-xl bg-gradient-to-br from-gold-light to-gold flex items-center justify-center text-carbon-900 shadow-md">
                                <FinControlLogo className="text-carbon-900" />
                            </div>
                        )}
                        <button 
                            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                            className="p-1.5 rounded-xl bg-carbon-800 text-gray-400 hover:text-gold hover:bg-carbon-700 transition cursor-pointer"
                            title={isSidebarCollapsed ? "Expandir Menu" : "Recolher Menu"}
                        >
                            {isSidebarCollapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
                        </button>
                    </div>

                    {/* Links de Navegação com Proteção PRO */}
                    <nav className="p-3 space-y-2">
                        {navLinks.map(link => {
                            const isLocked = link.proOnly && !isPro && !isTrialActive;
                            const isActive = activePage === link.id;

                            return (
                                <button
                                    key={link.id}
                                    onClick={() => handleNavClick(link)}
                                    className={`w-full flex items-center justify-between px-3 py-3 rounded-2xl text-sm font-medium transition-all cursor-pointer ${
                                        isActive 
                                        ? 'bg-gradient-to-r from-gold-light to-gold text-carbon-900 font-bold shadow-lg shadow-gold/20' 
                                        : 'text-gray-400 hover:bg-carbon-800 hover:text-gold-cream'
                                    }`}
                                    title={isSidebarCollapsed ? `${link.label} ${isLocked ? '(Bloqueado - Requer PRO)' : ''}` : ''}
                                >
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <span className="flex-shrink-0">{link.icon}</span>
                                        {!isSidebarCollapsed && <span className="truncate">{link.label}</span>}
                                    </div>
                                    {!isSidebarCollapsed && isLocked && (
                                        <span className="text-gold" title="Exclusivo PRO">
                                            <LockIcon />
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </nav>
                </div>

                {/* Rodapé da Sidebar */}
                <div className="p-4 border-t border-carbon-800 space-y-4">
                    <UserStatusBadge isCollapsed={isSidebarCollapsed} />

                    <div className="relative" ref={profileRef}>
                        <button 
                            onClick={() => setIsProfileOpen(!isProfileOpen)} 
                            className={`w-full flex items-center gap-3 p-2 rounded-2xl bg-carbon-800/60 hover:bg-carbon-800 transition cursor-pointer ${isSidebarCollapsed ? 'justify-center' : 'justify-between'}`}
                        >
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-gold-light to-gold flex items-center justify-center font-extrabold text-carbon-900 flex-shrink-0 shadow-md">
                                {currentUser?.email?.[0].toUpperCase() || 'P'}
                            </div>
                            {!isSidebarCollapsed && (
                                <div className="overflow-hidden text-left">
                                    <p className="text-xs font-semibold text-gold-cream truncate">{currentUser?.email}</p>
                                    <p className="text-[10px] text-gray-400">Gerenciar conta</p>
                                </div>
                            )}
                        </button>
                        
                        {isProfileOpen && (
                            <div className={`absolute bottom-14 ${isSidebarCollapsed ? 'left-16' : 'left-0'} w-64 rounded-3xl bg-carbon-900 shadow-2xl border border-carbon-800 p-2 z-50 animate-fadeIn`}>
                                <div className="px-4 py-3 border-b border-carbon-800">
                                    <p className="text-xs text-gray-500">Logado como</p>
                                    <p className="text-sm font-semibold text-gold-cream truncate">{currentUser?.email}</p>
                                </div>
                                <div className="py-1">
                                    <button 
                                        type="button"
                                        onClick={handleThemeToggle} 
                                        className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium transition text-gray-300 hover:bg-carbon-800 rounded-2xl cursor-pointer"
                                    >
                                        <span className="flex items-center gap-3">
                                            {theme === 'dark' ? <SunIcon /> : <MoonIcon />} 
                                            {theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}
                                        </span>
                                        <div className={`w-10 h-6 flex items-center rounded-full p-1 transition-colors ${theme === 'dark' ? 'bg-gold justify-end' : 'bg-carbon-700 justify-start'}`}>
                                            <div className="bg-carbon-900 w-4 h-4 rounded-full shadow-md transform transition-transform"></div>
                                        </div>
                                    </button>

                                    <button 
                                        type="button"
                                        onClick={handleLogout} 
                                        className="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-medium transition text-rose-400 hover:bg-rose-500/20 rounded-2xl mt-1 cursor-pointer"
                                    >
                                        <LogoutIcon /> Sair da conta
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </aside>

            {/* CONTEÚDO PRINCIPAL À DIREITA */}
            <main className="flex-1 flex flex-col h-screen overflow-y-auto">
                <div className="container mx-auto p-4 sm:p-6 lg:p-8 max-w-7xl">
                    {renderActivePage()}
                </div>
            </main>
        </div>
    );
}