// src/pages/LandingPage.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

// --- Ícones embutidos como componentes React ---

const MenuIcon = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>
);

const XIcon = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
);

const FinControlLogo = ({ className }) => (
    <svg className={className} width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);


const FeatureIcon = ({ children }) => (
    <div className="bg-gold/10 text-gold rounded-2xl h-14 w-14 flex items-center justify-center mb-4 mx-auto border border-gold/20 shadow-lg shadow-gold/10">
        {children}
    </div>
);

const ChartIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>;
const CreditCardIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>;
const UsersIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
const CheckIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>;


// --- Componente Principal da Landing Page (Black Card Theme) ---

export default function LandingPage() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    
    const navigate = useNavigate();
    const handleLoginClick = () => navigate('/login');
    const handleRegisterClick = () => navigate('/login');
    const handleUpgrade = () => navigate('/login');

    return (
        <div className="bg-carbon-900 text-gray-300 font-sans antialiased selection:bg-gold selection:text-carbon-900">
            
            {/* Cabeçalho */}
            <header className="fixed top-0 left-0 right-0 z-50 bg-carbon-900/90 backdrop-blur-xl border-b border-carbon-800 shadow-xl">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-20">
                        <div className="flex items-center gap-3">
                            <a href="#" className="flex items-center gap-3 group">
                                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-gold-light to-gold flex items-center justify-center text-carbon-900 shadow-lg shadow-gold/20 transition-transform group-hover:scale-105">
                                    <FinControlLogo className="text-carbon-900" />
                                </div>
                                <span className="text-2xl font-roboto font-extrabold tracking-wider text-gold-cream">Fin<span className="text-gold">Control</span></span>
                            </a>
                        </div>
                        <nav className="hidden md:flex md:items-center md:space-x-8">
                            <a href="#features" className="text-gray-400 hover:text-gold transition font-medium">Recursos</a>
                            <a href="#pricing" className="text-gray-400 hover:text-gold transition font-medium">Preços</a>
                        </nav>
                        <div className="hidden md:flex items-center space-x-3">
                            <button onClick={handleLoginClick} className="px-5 py-2.5 text-sm font-semibold text-gray-300 hover:text-gold-cream hover:bg-carbon-800 rounded-2xl transition cursor-pointer">Entrar</button>
                            <button onClick={handleRegisterClick} className="px-5 py-2.5 text-sm font-bold text-carbon-900 bg-gradient-to-r from-gold-light to-gold hover:opacity-90 rounded-2xl shadow-lg shadow-gold/20 transition cursor-pointer">Crie sua conta</button>
                        </div>
                        <div className="md:hidden flex items-center">
                            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2.5 rounded-2xl bg-carbon-800 text-gray-400 hover:text-gold transition cursor-pointer">
                                {isMenuOpen ? <XIcon className="h-6 w-6" /> : <MenuIcon className="h-6 w-6" />}
                            </button>
                        </div>
                    </div>
                </div>
                {/* Menu Mobile */}
                {isMenuOpen && (
                    <div className="md:hidden bg-carbon-900 border-t border-carbon-800 px-4 pt-4 pb-6 space-y-3 animate-fadeIn">
                        <a href="#features" onClick={() => setIsMenuOpen(false)} className="block px-4 py-3 rounded-2xl text-base font-medium text-gray-400 hover:bg-carbon-800 hover:text-gold-cream">Recursos</a>
                        <a href="#pricing" onClick={() => setIsMenuOpen(false)} className="block px-4 py-3 rounded-2xl text-base font-medium text-gray-400 hover:bg-carbon-800 hover:text-gold-cream">Preços</a>
                        <div className="pt-4 border-t border-carbon-800 space-y-2">
                            <button onClick={handleRegisterClick} className="block w-full text-center px-4 py-3 text-base font-bold text-carbon-900 bg-gradient-to-r from-gold-light to-gold rounded-2xl shadow-md transition">Crie sua conta</button>
                            <button onClick={handleLoginClick} className="block w-full text-center px-4 py-3 text-base font-medium text-gray-300 bg-carbon-800 hover:bg-carbon-700 rounded-2xl transition">Já tem uma conta? Entrar</button>
                        </div>
                    </div>
                )}
            </header>

            <main>
                {/* Seção Hero */}
                <section className="pt-32 md:pt-44 pb-20 md:pb-32 relative overflow-hidden">
                    {/* Efeito Glow de Fundo */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gold/5 blur-[120px] rounded-full pointer-events-none"></div>

                    <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gold/10 text-gold border border-gold/20 text-xs font-bold mb-6 tracking-wide uppercase">
                            ✨ Experiência Black Card & Luxo
                        </div>
                        <h1 className="text-4xl sm:text-5xl md:text-7xl font-black tracking-tight text-gold-cream leading-tight">
                            O controle financeiro para seus cartões,
                            <span className="block bg-gradient-to-r from-gold-light via-gold to-amber-500 bg-clip-text text-transparent mt-2">simples e de elite.</span>
                        </h1>
                        <p className="mt-6 max-w-2xl mx-auto text-base sm:text-lg md:text-xl text-gray-400 font-medium">
                            Pare de se perder em planilhas. Visualize suas faturas, gerencie compras compartilhadas com elegância e tenha clareza total dos seus gastos mensais.
                        </p>
                        <div className="mt-10 flex justify-center">
                            <button onClick={handleRegisterClick} className="px-8 py-4 text-lg font-black text-carbon-900 bg-gradient-to-r from-gold-light via-gold to-amber-500 hover:opacity-90 rounded-2xl shadow-2xl shadow-gold/20 transform hover:-translate-y-1 transition cursor-pointer">
                                Comece agora, é grátis! 💳
                            </button>
                        </div>
                    </div>
                </section>

                {/* Seção de Recursos */}
                <section id="features" className="py-20 md:py-32 bg-carbon-900/50 border-t border-carbon-800">
                    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl md:text-4xl font-black text-gold-cream">Tudo o que você precisa em um só lugar</h2>
                            <p className="mt-3 text-base md:text-lg text-gray-400">Ferramentas de alta precisão para descomplicar sua vida financeira.</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div className="bg-carbon-900 border border-carbon-800 p-8 rounded-3xl shadow-xl transition-all duration-300 hover:-translate-y-1 hover:border-gold/30 text-center">
                                <FeatureIcon><CreditCardIcon /></FeatureIcon>
                                <h3 className="text-xl font-bold mb-3 text-gold-cream">Gestão de Faturas</h3>
                                <p className="text-sm text-gray-400 leading-relaxed">Saiba exatamente o valor da sua fatura antes dela fechar. Adicione compras, despesas avulsas e assinaturas com total fluidez.</p>
                            </div>
                            <div className="bg-carbon-900 border border-carbon-800 p-8 rounded-3xl shadow-xl transition-all duration-300 hover:-translate-y-1 hover:border-gold/30 text-center">
                                <FeatureIcon><UsersIcon /></FeatureIcon>
                                <h3 className="text-xl font-bold mb-3 text-gold-cream">Compras Compartilhadas</h3>
                                <p className="text-sm text-gray-400 leading-relaxed">Dividiu uma compra? Registre o valor de cada pessoa e controle rigorosamente quem te deve o quê, parcela por parcela.</p>
                            </div>
                            <div className="bg-carbon-900 border border-carbon-800 p-8 rounded-3xl shadow-xl transition-all duration-300 hover:-translate-y-1 hover:border-gold/30 text-center">
                                <FeatureIcon><ChartIcon /></FeatureIcon>
                                <h3 className="text-xl font-bold mb-3 text-gold-cream">Relatórios Visuais</h3>
                                <p className="text-sm text-gray-400 leading-relaxed">Com os recursos Pro, visualize gráficos dinâmicos que mostram para onde seu dinheiro está indo e tome decisões mais assertivas.</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Seção de Preços */}
                <section id="pricing" className="py-20 md:py-32 border-t border-carbon-800">
                    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl md:text-4xl font-black text-gold-cream">Um plano para cada necessidade</h2>
                            <p className="mt-3 text-base md:text-lg text-gray-400">Comece de graça e evolua para a elite quando estiver pronto.</p>
                        </div>
                        <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
                            
                            {/* Plano Free */}
                            <div className="bg-carbon-900 border border-carbon-800 rounded-3xl p-8 sm:p-10 flex flex-col shadow-2xl">
                                <h3 className="text-2xl font-black text-gold-cream">Standard</h3>
                                <p className="mt-3 text-sm text-gray-400">O essencial para começar a organizar suas finanças hoje mesmo.</p>
                                <div className="mt-6">
                                    <span className="text-4xl font-black text-gold-cream">R$0</span>
                                    <span className="text-sm font-medium text-gray-500"> /mês</span>
                                </div>
                                <ul className="mt-8 space-y-4 text-gray-300 text-sm flex-1">
                                    <li className="flex items-start"><span className="text-gold mt-0.5 mr-3 flex-shrink-0"><CheckIcon /></span><span>Gerenciamento de Pessoas</span></li>
                                    <li className="flex items-start"><span className="text-gold mt-0.5 mr-3 flex-shrink-0"><CheckIcon /></span><span>Gerenciamento de Cartões</span></li>
                                    <li className="flex items-start"><span className="text-gold mt-0.5 mr-3 flex-shrink-0"><CheckIcon /></span><span>Registro de Compras</span></li>
                                </ul>
                                <div className="mt-8">
                                    <button onClick={handleRegisterClick} className="w-full px-6 py-3.5 text-sm font-bold text-gold bg-gold/10 border border-gold/20 hover:bg-gold/20 rounded-2xl transition cursor-pointer">Comece Grátis</button>
                                </div>
                            </div>

                            {/* Plano Pro */}
                            <div className="bg-gradient-to-b from-carbon-900 to-carbon-800 border-2 border-gold rounded-3xl p-8 sm:p-10 flex flex-col relative shadow-2xl shadow-gold/10">
                                <div className="absolute top-0 -translate-y-1/2 left-1/2 -translate-x-1/2">
                                    <span className="px-4 py-1 text-xs font-black tracking-widest text-carbon-900 bg-gradient-to-r from-gold-light to-gold rounded-full shadow-md">BLACK PRO</span>
                                </div>
                                <h3 className="text-2xl font-black text-gold-cream">Pro / Black</h3>
                                <p className="mt-3 text-sm text-gray-400">Desbloqueie todo o potencial com recursos analíticos avançados e exclusivas ferramentas de IA.</p>
                                
                                <div className="mt-6">
                                    <span className="text-4xl font-black text-gold">R$29,99</span>
                                    <span className="text-sm font-medium text-gray-400"> (Pagamento Único)</span>
                                </div>
                                
                                <ul className="mt-8 space-y-4 text-gray-300 text-sm flex-1">
                                    <li className="flex items-start"><span className="text-gold mt-0.5 mr-3 flex-shrink-0"><CheckIcon /></span><span className="font-semibold text-gold-cream">Acesso Vitalício a tudo do plano Standard, e mais:</span></li>
                                    <li className="flex items-start"><span className="text-gold mt-0.5 mr-3 flex-shrink-0"><CheckIcon /></span><span>Registro de Receitas e Despesas Avulsas</span></li>
                                    <li className="flex items-start"><span className="text-gold mt-0.5 mr-3 flex-shrink-0"><CheckIcon /></span><span>Relatórios e Gráficos Pro Analytics</span></li>
                                    <li className="flex items-start"><span className="text-gold mt-0.5 mr-3 flex-shrink-0"><CheckIcon /></span><span>Acesso Completo ao Modo Crise & Auditoria</span></li>
                                </ul>
                                
                                <div className="mt-8">
                                    <button onClick={handleUpgrade} className="w-full px-6 py-3.5 text-sm font-black text-carbon-900 bg-gradient-to-r from-gold-light to-gold hover:opacity-90 rounded-2xl shadow-lg shadow-gold/20 transition cursor-pointer">Tornar-se Black Pro</button>
                                </div>
                            </div>

                        </div>
                    </div>
                </section>
            </main>

            {/* Rodapé */}
            <footer className="bg-carbon-900 border-t border-carbon-800 py-10">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center text-xs text-gray-500">
                    <p>&copy; {new Date().getFullYear()} FinControl. Todos os direitos reservados.</p>
                </div>
            </footer>
        </div>
    );
}