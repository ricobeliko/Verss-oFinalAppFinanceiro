// src/components/ProAnalyticsCharts.jsx

import React, { useMemo } from 'react';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList,
    PieChart, Pie, Cell,
} from 'recharts';
import { useAppContext } from '../context/AppContext';
import UpgradePrompt from './UpgradePrompt';
import { formatCurrencyDisplay } from '../utils/currency';

// Funções e componentes auxiliares
const formatYAxis = (tick) => {
    if (tick >= 1000) return `R$ ${(tick / 1000).toLocaleString('pt-BR')}k`;
    return `R$ ${tick}`;
};

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="p-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg">
                <p className="font-bold text-gray-800 dark:text-gray-100">{label}</p>
                <p className="text-blue-500 dark:text-blue-400">{`Total Gasto: ${formatCurrencyDisplay(payload[0].value)}`}</p>
            </div>
        );
    }
    return null;
};

const ProAnalyticsCharts = ({ loans, clients, expenses, subscriptions, theme }) => {
    // ✅ 1. PUXANDO O 'isTrialActive' DO CONTEXTO
    const { isPro, isTrialActive } = useAppContext();

    // ✅ 2. CRIANDO A VARIÁVEL DE ACESSO
    const hasProAccess = isPro || isTrialActive;

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
    
    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF1943', '#A45D5D'];
    const textColor = theme === 'dark' ? '#A3A3A3' : '#333';

    return (
        // ✅ 3. USANDO A NOVA VARIÁVEL PARA CONTROLAR O COMPONENTE INTEIRO
        // O container principal agora é renderizado com base no 'hasProAccess'.
        <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6 relative min-h-[380px]">
            {!hasProAccess ? (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-900/30 backdrop-blur-sm rounded-lg">
                    <UpgradePrompt />
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div>
                        <h3 className="text-xl font-bold text-blue-400 mb-4">Gastos por Pessoa (Fatura)</h3>
                        {dataForBarChart.length > 0 ? (
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={dataForBarChart}>
                                    <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#4A5568' : '#E2E8F0'}/>
                                    <XAxis dataKey="name" tick={{ fill: textColor }} />
                                    <YAxis tick={{ fill: textColor }} tickFormatter={formatYAxis} />
                                    <Tooltip content={<CustomTooltip />} cursor={{fill: theme === 'dark' ? 'rgba(96, 165, 250, 0.2)' : 'rgba(200, 200, 255, 0.3)'}}/>
                                    <Bar dataKey="Total Gasto" fill={theme === 'dark' ? '#60a5fa' : '#3b82f6'} radius={[4, 4, 0, 0]}>
                                        <LabelList dataKey="Total Gasto" position="top" formatter={(value) => formatCurrencyDisplay(value)} fill={textColor} fontSize={12}/>
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex items-center justify-center h-[300px] text-gray-500">Nenhuma compra para os filtros.</div>
                        )}
                    </div>

                    <div>
                        <h3 className="text-xl font-bold text-green-400 mb-4">Gastos Totais por Categoria</h3>
                        {dataForPieChart.length > 0 ? (
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie data={dataForPieChart} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} labelLine={false} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                                        {dataForPieChart.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(value) => formatCurrencyDisplay(value)} />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                             <div className="flex items-center justify-center h-[300px] text-gray-500">Nenhum gasto para os filtros.</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProAnalyticsCharts;