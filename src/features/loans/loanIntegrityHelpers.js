// src/features/loans/loanIntegrityHelpers.js

/**
 * Detecta se uma compra (normal ou compartilhada) já possui qualquer histórico de pagamento
 * ou amortização registrada no banco de dados.
 * 
 * Fontes analisadas:
 * - valuePaidClient > 0 (compra normal)
 * - statusPaymentClient diferente de 'Pendente' (ex: 'Pago Parcial', 'Pago Total')
 * - Qualquer parcela com status 'Paga'/'Pago' ou com data de pagamento preenchida
 * - sharedDetails.person1/person2: valuePaid > 0, statusPayment != 'Pendente', ou parcela paga
 * 
 * @param {Object} loan - Documento da compra
 * @returns {boolean}
 */
export function hasPaymentHistory(loan) {
    if (!loan || typeof loan !== 'object') return false;

    // 1. Verificações no documento raiz (compra normal ou legado)
    if (typeof loan.valuePaidClient === 'number' && loan.valuePaidClient > 0) return true;
    if (typeof loan.valuePaid === 'number' && loan.valuePaid > 0) return true;
    if (loan.statusPaymentClient && loan.statusPaymentClient !== 'Pendente') return true;

    // 2. Verificação de parcelas no array raiz
    if (Array.isArray(loan.installments)) {
        const hasPaidRootInstallment = loan.installments.some(
            inst => inst && (inst.status === 'Paga' || inst.status === 'Pago' || Boolean(inst.paidDate))
        );
        if (hasPaidRootInstallment) return true;
    }

    // 3. Verificações específicas para compra compartilhada
    if (loan.isShared && loan.sharedDetails) {
        const p1 = loan.sharedDetails.person1;
        if (p1) {
            if (typeof p1.valuePaid === 'number' && p1.valuePaid > 0) return true;
            if (p1.statusPayment && p1.statusPayment !== 'Pendente') return true;
            if (Array.isArray(p1.installments)) {
                const hasPaidP1 = p1.installments.some(
                    inst => inst && (inst.status === 'Paga' || inst.status === 'Pago' || Boolean(inst.paidDate))
                );
                if (hasPaidP1) return true;
            }
        }

        const p2 = loan.sharedDetails.person2;
        if (p2) {
            if (typeof p2.valuePaid === 'number' && p2.valuePaid > 0) return true;
            // Se person2.shareAmount > 0 e status não é Pendente, houve quitação
            if (p2.statusPayment && p2.statusPayment !== 'Pendente' && Number(p2.shareAmount || 0) > 0) return true;
            if (Array.isArray(p2.installments)) {
                const hasPaidP2 = p2.installments.some(
                    inst => inst && (inst.status === 'Paga' || inst.status === 'Pago' || Boolean(inst.paidDate))
                );
                if (hasPaidP2) return true;
            }
        }
    }

    return false;
}

/**
 * Determina se a tentativa de edição de uma compra altera campos estruturais financeiros
 * que exigiriam a recomposição ou redistribuição de parcelas.
 * 
 * Campos estruturais:
 * - Tipo de compra (normal vs compartilhada)
 * - Valor total da compra
 * - Quantidade de parcelas
 * - Data de vencimento da primeira parcela
 * - Em compras compartilhadas: divisão de valores (shareAmount) ou troca de participantes
 * 
 * @param {Object} editingLoan - Compra original persistida
 * @param {Object} formParams - Valores preenchidos no formulário de edição
 * @returns {boolean}
 */
export function isStructuralFinancialEdit(editingLoan, formParams) {
    if (!editingLoan || !formParams) return false;

    // 1. Mudança no tipo de compra (normal vs compartilhada)
    const wasShared = Boolean(editingLoan.isShared);
    const isNowShared = formParams.purchaseType === 'shared';
    if (wasShared !== isNowShared) return true;

    // 2. Mudança no valor total (comparado em centavos para evitar float drift)
    const currentTotalCents = Math.round(Number(editingLoan.totalValue || 0) * 100);
    const newTotalCents = Math.round(Number(formParams.totalValue || 0) * 100);
    if (currentTotalCents !== newTotalCents) return true;

    // 3. Mudança na quantidade de parcelas
    const currentInstallmentsCount = parseInt(editingLoan.installmentsCount, 10);
    const newInstallmentsCount = parseInt(formParams.installmentsCount, 10);
    if (currentInstallmentsCount !== newInstallmentsCount) return true;

    // 4. Mudança no primeiro vencimento da compra
    const origFirstDueDate = editingLoan.installments?.[0]?.dueDate;
    if (origFirstDueDate && formParams.firstDueDate && origFirstDueDate !== formParams.firstDueDate) {
        return true;
    }

    // 5. Verificações de participantes e divisão em compras compartilhadas
    if (isNowShared) {
        const origP1 = editingLoan.sharedDetails?.person1;
        const origP2 = editingLoan.sharedDetails?.person2;

        const origP1Cents = Math.round(Number(origP1?.shareAmount || 0) * 100);
        const newP1Cents = Math.round(Number(formParams.person1Share || 0) * 100);
        if (origP1Cents !== newP1Cents) return true;

        const origP2Cents = Math.round(Number(origP2?.shareAmount || 0) * 100);
        const newP2Cents = Math.round(Number(formParams.person2Share || 0) * 100);
        if (origP2Cents !== newP2Cents) return true;

        if (origP1?.clientId !== formParams.selectedClient1Id) return true;
        if (origP2?.clientId !== formParams.selectedClient2Id) return true;
    } else {
        // 6. Verificação de cliente devedor em compra normal
        if (editingLoan.clientId !== formParams.selectedClientId) {
            return true;
        }
    }

    return false;
}

/**
 * Constrói de forma segura e determinística o payload final da compra para persistência no Firestore.
 * Garante que:
 * - Compras com histórico de pagamento mantenham 100% dos pagamentos e status de parcelas originais.
 * - Compras novas ou sem pagamento recebam a estrutura financeira recalculada.
 * 
 * @param {Object} params
 * @param {Object|null} params.editingLoan - Compra original (se em modo edição)
 * @param {Object} params.formParams - Parâmetros do formulário
 * @param {string} params.userId - UID do usuário autenticado
 * @returns {Object} Payload final para addDoc ou updateDoc
 */
export function buildLoanSavePayload({ editingLoan, formParams, userId }) {
    const isEditing = Boolean(editingLoan);
    const hasHistory = isEditing && hasPaymentHistory(editingLoan);

    const payload = {
        description: formParams.description.trim(),
        totalValue: formParams.totalValue,
        installmentsCount: formParams.installmentsCount,
        purchaseDate: formParams.purchaseDate,
        cardId: formParams.cardId,
        userId,
    };

    if (formParams.purchaseType === 'normal') {
        payload.isShared = false;
        payload.clientId = formParams.selectedClientId;

        if (hasHistory) {
            payload.valuePaidClient = editingLoan.valuePaidClient ?? 0;
            payload.balanceDueClient = editingLoan.balanceDueClient ?? formParams.totalValue;
            payload.statusPaymentClient = editingLoan.statusPaymentClient ?? 'Pendente';
            payload.installments = editingLoan.installments || [];
        } else {
            payload.valuePaidClient = 0;
            payload.balanceDueClient = formParams.totalValue;
            payload.statusPaymentClient = 'Pendente';
            payload.installments = formParams.calculatedInstallments;
        }
    } else {
        payload.isShared = true;
        payload.valuePaidClient = 0;
        payload.balanceDueClient = formParams.totalValue;
        payload.statusPaymentClient = 'Pendente';

        if (hasHistory) {
            payload.installments = editingLoan.installments || [];

            const origP1 = editingLoan.sharedDetails?.person1 || {};
            const origP2 = editingLoan.sharedDetails?.person2 || {};

            payload.sharedDetails = {
                person1: {
                    clientId: formParams.selectedClient1Id,
                    shareAmount: origP1.shareAmount ?? formParams.person1Share,
                    installments: origP1.installments || [],
                    valuePaid: origP1.valuePaid ?? 0,
                    balanceDue: origP1.balanceDue ?? formParams.person1Share,
                    statusPayment: origP1.statusPayment ?? 'Pendente',
                },
                person2: {
                    clientId: formParams.selectedClient2Id,
                    shareAmount: origP2.shareAmount ?? formParams.person2Share,
                    installments: origP2.installments || [],
                    valuePaid: origP2.valuePaid ?? 0,
                    balanceDue: origP2.balanceDue ?? formParams.person2Share,
                    statusPayment: origP2.statusPayment ?? (formParams.person2Share > 0 ? 'Pendente' : 'Pago Total'),
                },
            };
        } else {
            payload.installments = formParams.calculatedInstallments;
            payload.sharedDetails = {
                person1: {
                    clientId: formParams.selectedClient1Id,
                    shareAmount: formParams.person1Share,
                    installments: formParams.calculatedP1Installments,
                    valuePaid: 0,
                    balanceDue: formParams.person1Share,
                    statusPayment: 'Pendente',
                },
                person2: {
                    clientId: formParams.selectedClient2Id,
                    shareAmount: formParams.person2Share,
                    installments: formParams.calculatedP2Installments,
                    valuePaid: 0,
                    balanceDue: formParams.person2Share,
                    statusPayment: formParams.person2Share > 0 ? 'Pendente' : 'Pago Total',
                },
            };
        }
    }

    return payload;
}
