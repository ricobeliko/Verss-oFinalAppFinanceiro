// src/components/NotificationSettingsModal.jsx
import React, { useState } from 'react';
import GenericModal from './GenericModal';

/**
 * Modal de Preferências de Alertas Financeiros.
 * Permite ao usuário ligar/desligar alertas específicos e ajustar limiares de antecedência.
 */
export default function NotificationSettingsModal({
    isOpen,
    onClose,
    currentSettings = {},
    onSaveSettings
}) {
    const [cardDueEnabled, setCardDueEnabled] = useState(currentSettings.cardDueEnabled !== false);
    const [cardDueDays, setCardDueDays] = useState(String(currentSettings.cardDueDays || '3'));
    const [receivablesEnabled, setReceivablesEnabled] = useState(currentSettings.receivablesEnabled !== false);
    const [highLimitEnabled, setHighLimitEnabled] = useState(currentSettings.highLimitEnabled !== false);
    const [highLimitThreshold, setHighLimitThreshold] = useState(String(currentSettings.highLimitThreshold || '85'));
    const [subscriptionsEnabled, setSubscriptionsEnabled] = useState(currentSettings.subscriptionsEnabled !== false);
    const [anomaliesEnabled, setAnomaliesEnabled] = useState(currentSettings.anomaliesEnabled !== false);
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await onSaveSettings({
                cardDueEnabled,
                cardDueDays: parseInt(cardDueDays, 10) || 3,
                receivablesEnabled,
                highLimitEnabled,
                highLimitThreshold: parseInt(highLimitThreshold, 10) || 85,
                subscriptionsEnabled,
                anomaliesEnabled
            });
            onClose();
        } catch (err) {
            console.error('Erro ao salvar preferências:', err);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <GenericModal
            isOpen={isOpen}
            onClose={onClose}
            title="Preferências de Alertas Financeiros"
            maxWidth="max-w-lg"
        >
            <form onSubmit={handleSave} className="space-y-5">
                <p className="text-xs text-gray-400">
                    Personalize como e quando o FinControl deve alertar sobre faturas, repasses e vencimentos.
                </p>

                <div className="space-y-4 divide-y divide-carbon-800">
                    {/* 1. Vencimento de Cartão */}
                    <div className="pt-3 flex items-center justify-between">
                        <div className="space-y-0.5">
                            <label className="text-sm font-bold text-gold-cream block">Vencimento de Fatura</label>
                            <span className="text-xs text-gray-400">Notificar quando a fatura estiver perto de fechar</span>
                        </div>
                        <div className="flex items-center gap-3">
                            {cardDueEnabled && (
                                <select
                                    value={cardDueDays}
                                    onChange={(e) => setCardDueDays(e.target.value)}
                                    className="p-1.5 bg-carbon-800 border border-carbon-700 rounded-xl text-xs text-gold font-bold focus:outline-none"
                                >
                                    <option value="1">1 dia antes</option>
                                    <option value="2">2 dias antes</option>
                                    <option value="3">3 dias antes</option>
                                    <option value="5">5 dias antes</option>
                                    <option value="7">7 dias antes</option>
                                </select>
                            )}
                            <input
                                type="checkbox"
                                checked={cardDueEnabled}
                                onChange={(e) => setCardDueEnabled(e.target.checked)}
                                className="w-5 h-5 accent-gold rounded cursor-pointer"
                            />
                        </div>
                    </div>

                    {/* 2. Repasses de Terceiros */}
                    <div className="pt-3 flex items-center justify-between">
                        <div className="space-y-0.5">
                            <label className="text-sm font-bold text-gold-cream block">Repasses de Terceiros</label>
                            <span className="text-xs text-gray-400">Alertar sobre valores pendentes de cobrança</span>
                        </div>
                        <input
                            type="checkbox"
                            checked={receivablesEnabled}
                            onChange={(e) => setReceivablesEnabled(e.target.checked)}
                            className="w-5 h-5 accent-gold rounded cursor-pointer"
                        />
                    </div>

                    {/* 3. Limite Alto de Cartão */}
                    <div className="pt-3 flex items-center justify-between">
                        <div className="space-y-0.5">
                            <label className="text-sm font-bold text-gold-cream block">Comprometimento de Limite</label>
                            <span className="text-xs text-gray-400">Avisar quando faturas superarem o limite cadastrado</span>
                        </div>
                        <div className="flex items-center gap-3">
                            {highLimitEnabled && (
                                <select
                                    value={highLimitThreshold}
                                    onChange={(e) => setHighLimitThreshold(e.target.value)}
                                    className="p-1.5 bg-carbon-800 border border-carbon-700 rounded-xl text-xs text-gold font-bold focus:outline-none"
                                >
                                    <option value="70">&ge; 70%</option>
                                    <option value="80">&ge; 80%</option>
                                    <option value="85">&ge; 85%</option>
                                    <option value="90">&ge; 90%</option>
                                </select>
                            )}
                            <input
                                type="checkbox"
                                checked={highLimitEnabled}
                                onChange={(e) => setHighLimitEnabled(e.target.checked)}
                                className="w-5 h-5 accent-gold rounded cursor-pointer"
                            />
                        </div>
                    </div>

                    {/* 4. Assinaturas Recorrentes */}
                    <div className="pt-3 flex items-center justify-between">
                        <div className="space-y-0.5">
                            <label className="text-sm font-bold text-gold-cream block">Assinaturas Recorrentes</label>
                            <span className="text-xs text-gray-400">Avisar sobre cobranças programadas nos próximos 2 dias</span>
                        </div>
                        <input
                            type="checkbox"
                            checked={subscriptionsEnabled}
                            onChange={(e) => setSubscriptionsEnabled(e.target.checked)}
                            className="w-5 h-5 accent-gold rounded cursor-pointer"
                        />
                    </div>

                    {/* 5. Anomalias de Gastos */}
                    <div className="pt-3 flex items-center justify-between">
                        <div className="space-y-0.5">
                            <label className="text-sm font-bold text-gold-cream block">Anomalias de Gastos</label>
                            <span className="text-xs text-gray-400">Detectar aumentos repentinos &gt; 50% vs média trimestral</span>
                        </div>
                        <input
                            type="checkbox"
                            checked={anomaliesEnabled}
                            onChange={(e) => setAnomaliesEnabled(e.target.checked)}
                            className="w-5 h-5 accent-gold rounded cursor-pointer"
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-carbon-800">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-xs font-semibold text-gray-400 hover:text-white rounded-xl bg-carbon-800 transition cursor-pointer"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        disabled={isSaving}
                        className="px-5 py-2 text-xs font-bold text-carbon-900 bg-gradient-to-r from-gold-light to-gold rounded-xl shadow-lg hover:opacity-90 transition cursor-pointer disabled:opacity-50"
                    >
                        {isSaving ? 'Salvando...' : 'Salvar Preferências'}
                    </button>
                </div>
            </form>
        </GenericModal>
    );
}
