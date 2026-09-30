// src/components/ProAnalyticsCharts.jsx

import React, { useState, useMemo } from 'react';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList,
    PieChart, Pie, Cell, Legend
} from 'recharts';
import { useAppContext } from '../context/AppContext';
import UpgradePrompt from './UpgradePrompt';
import { formatCurrencyDisplay } from '../utils/currency';

const formatYAxis = (tick) => {
    if (tick >= 1000) return `R$ ${(tick / 1000).toLocaleString('pt-BR')}k`;
    return `R$ ${tick}`;
};

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="p-3 bg-[var(--fc-surface-1)] border border-[var(--fc-border-default)] rounded-xl shadow-[var(--fc-shadow-md)] text-xs space-y-1">
                <p className="font-bold text-[var(--fc-text-primary)]">{label}</p>
                <p className="text-[var(--fc-accent)] font-mono font-bold">{`Total Gasto: ${formatCurrencyDisplay(payload[0].value)}`}</p>
            </div>
        );
    }
    return null;
};

const ProAnalyticsCharts = ({ loans, clients, expenses, subscriptions, theme }) => {
    const { isPro, isTrialActive, currentUser, showToast, activateFreeTrial } = useAppContext();
    const [isLoading, setIsLoading] = useState(false);

    const hasProAccess = isPro || isTrialActive;

    const handleActivateTrial = async () => {
        if (typeof window !== 'undefined' && (window.__FINCONTROL_E2E_USER__ || sessionStorage.getItem('fincontrol_e2e_user'))) {
            showToast('Teste Pro ativado com sucesso! Aproveite 30 dias de acesso aos recursos Pro.', 'success');
            return;
        }
        if (typeof activateFreeTrial === 'function') {
            await activateFreeTrial();
        }
    };
    const isLight = theme === 'light';
    const textColor = isLight ? '#434A56' : '#9CA3AF';
    const gridStroke = isLight ? 'rgba(20, 24, 30, 0.08)' : 'rgba(255, 255, 255, 0.08)';
    const axisLineStroke = isLight ? 'rgba(20, 24, 30, 0.15)' : 'rgba(255, 255, 255, 0.15)';
    const barFill = isLight ? '#8E5E00' : '#E5B842';
    const cellStroke = isLight ? '#FFFFFF' : '#1A1D24';
    const pieTooltipBg = isLight ? '#FFFFFF' : '#1A1D24';
    const pieTooltipBorder = isLight ? 'rgba(20, 24, 30, 0.15)' : 'rgba(255, 255, 255, 0.15)';
    const pieTooltipColor = isLight ? '#121417' : '#F9FAFB';

    const handleUpgrade = async () => {
        if (!currentUser) {
            showToast("Você precisa estar logado para fazer o upgrade.", "error");
            return;
        }
        setIsLoading(true);
        try {
            const { httpsCallable } = await import('firebase/functions');
            const { getAppFunctions } = await import('../utils/firebase');
            const functions = await getAppFunctions();
            const createMercadoPagoPreference = httpsCallable(functions, 'createMercadoPagoPreference');
            const result = await createMercadoPagoPreference();
            
            const checkoutUrl = result.data.init_point; 
            if (checkoutUrl) {
                window.location.href = checkoutUrl;
            } else {
                throw new Error("Link de pagamento não recebido do servidor.");
            }
        } catch (error) {
            console.error("Erro ao obter link de pagamento:", error);
            showToast('Não foi possível iniciar o pagamento. Tente novamente mais tarde.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const dataForBarChart = useMemo(() => {
        const clientTotals = {};
        loans.forEach(loan => {
            const clientName = clients.find(c => c.id === loan.clientId)?.name || 'Desconhecido';
            clientTotals[clientName] = (clientTotals[clientName] || 0) + loan.value;
        });
        return Object.entries(clientTotals).map(([name, value]) => ({ name, 'Total Gasto': value }));
    }, [loans, clients]);
    
    const dataForPieChart = useMemo(() => {
        const categories = {};
        (expenses || []).forEach(expense => {
            const category = expense.category || 'Outros';
            categories[category] = (categories[category] || 0) + expense.value;
        });
        const totalLoans = (loans || []).reduce((acc, loan) => acc + loan.value, 0);
        if (totalLoans > 0) {
            categories['Compras Parceladas'] = (categories['Compras Parceladas'] || 0) + totalLoans;
        }
        const totalSubscriptions = (subscriptions || []).reduce((acc, sub) => acc + sub.value, 0);
        if (totalSubscriptions > 0) {
            categories['Assinaturas'] = (categories['Assinaturas'] || 0) + totalSubscriptions;
        }
        return Object.entries(categories).map(([name, value]) => ({ name, value }));
    }, [expenses, loans, subscriptions]);

    const COLORS = isLight 
        ? ['#8E5E00', '#B45309', '#D97706', '#92400E', '#78350F', '#451A03', '#B7791F']
        : ['#F2B705', '#F29F05', '#D97904', '#BF5B04', '#8C3F02', '#592501', '#E8C547'];

    return (
        <div className="relative min-h-[380px]">
            {!hasProAccess ? (
                <div className="absolute inset-0 flex items-center justify-center bg-[var(--fc-bg)]/80 backdrop-blur-md rounded-2xl z-20 p-4 overflow-y-auto">
                    <div className="max-w-md w-full my-auto">
                        <UpgradePrompt 
                            onUpgradeClick={handleUpgrade} 
                            onActivateTrial={handleActivateTrial}
                            isLoading={isLoading} 
                        />
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    
                    {/* Gráfico de Barras: Gastos por Pessoa */}
                    <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--fc-text-primary)] mb-6">Gastos por Pessoa (Fatura)</h3>
                        {dataForBarChart.length > 0 ? (
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={dataForBarChart}>
                                    <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                                    <XAxis dataKey="name" tick={{ fill: textColor, fontSize: 12 }} axisLine={{ stroke: axisLineStroke }} />
                                    <YAxis tick={{ fill: textColor, fontSize: 12 }} tickFormatter={formatYAxis} axisLine={{ stroke: axisLineStroke }} />
                                    <Tooltip content={<CustomTooltip />} cursor={{ fill: isLight ? 'rgba(142, 94, 0, 0.05)' : 'rgba(229, 184, 66, 0.05)' }} />
                                    <Bar dataKey="Total Gasto" fill={barFill} radius={[8, 8, 0, 0]}>
                                        <LabelList dataKey="Total Gasto" position="top" formatter={(value) => formatCurrencyDisplay(value)} fill={barFill} fontSize={11} fontWeight="bold" />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex items-center justify-center h-[300px] text-[var(--fc-text-muted)] text-sm">Nenhuma compra para os filtros.</div>
                        )}
                    </div>

                    {/* Gráfico de Pizza: Gastos por Categoria */}
                    <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--fc-text-primary)] mb-6">Gastos Totais por Categoria</h3>
                        {dataForPieChart.length > 0 ? (
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie data={dataForPieChart} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} labelLine={false} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                                        {dataForPieChart.map((entry, index) => (
                                             <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke={cellStroke} strokeWidth={2} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(value) => formatCurrencyDisplay(value)} contentStyle={{ backgroundColor: pieTooltipBg, borderColor: pieTooltipBorder, borderRadius: '0.75rem', color: pieTooltipColor }} />
                                    <Legend wrapperStyle={{ fontSize: '12px', color: textColor, paddingTop: '10px' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex items-center justify-center h-[300px] text-[var(--fc-text-muted)] text-sm">Nenhum gasto para os filtros.</div>
                        )}
                    </div>

                </div>
            )}
        </div>
    );
};

export default ProAnalyticsCharts;