// tests/loanIntegrity.test.js
import { describe, it, expect } from 'vitest';
import {
    hasPaymentHistory,
    isStructuralFinancialEdit,
    buildLoanSavePayload
} from '../src/features/loans/loanIntegrityHelpers';
import { calculateInstallments } from '../src/services/financialService';

describe('Loan Integrity & Payment History Preservation (Fase 8.1)', () => {
    
    // =========================================================================
    // 1. DETECÇÃO DE HISTÓRICO DE PAGAMENTO (hasPaymentHistory)
    // =========================================================================
    describe('1. hasPaymentHistory', () => {
        it('deve retornar false para empréstimo nulo, indefinido ou vazio', () => {
            expect(hasPaymentHistory(null)).toBe(false);
            expect(hasPaymentHistory(undefined)).toBe(false);
            expect(hasPaymentHistory({})).toBe(false);
        });

        it('deve retornar false para compra recém-criada sem pagamentos', () => {
            const freshLoan = {
                id: 'loan-1',
                description: 'Notebook',
                totalValue: 1200,
                valuePaidClient: 0,
                balanceDueClient: 1200,
                statusPaymentClient: 'Pendente',
                installments: [
                    { number: 1, value: 600, dueDate: '2026-10-10', status: 'Pendente', paidDate: null },
                    { number: 2, value: 600, dueDate: '2026-11-10', status: 'Pendente', paidDate: null }
                ]
            };
            expect(hasPaymentHistory(freshLoan)).toBe(false);
        });

        it('deve detectar histórico quando valuePaidClient > 0', () => {
            const loan = {
                valuePaidClient: 100,
                balanceDueClient: 200,
                statusPaymentClient: 'Pendente',
                installments: []
            };
            expect(hasPaymentHistory(loan)).toBe(true);
        });

        it('deve detectar histórico quando statusPaymentClient != Pendente (ex: Pago Parcial)', () => {
            const loan = {
                valuePaidClient: 0, // anomalia pontual
                statusPaymentClient: 'Pago Parcial',
                installments: []
            };
            expect(hasPaymentHistory(loan)).toBe(true);
        });

        it('deve detectar histórico quando statusPaymentClient === Pago Total', () => {
            const loan = {
                statusPaymentClient: 'Pago Total',
                installments: []
            };
            expect(hasPaymentHistory(loan)).toBe(true);
        });

        it('deve detectar histórico quando qualquer parcela raiz tiver status Paga', () => {
            const loan = {
                valuePaidClient: 0,
                statusPaymentClient: 'Pendente',
                installments: [
                    { number: 1, value: 100, status: 'Paga', paidDate: '2026-09-01' },
                    { number: 2, value: 100, status: 'Pendente', paidDate: null }
                ]
            };
            expect(hasPaymentHistory(loan)).toBe(true);
        });

        it('deve detectar histórico quando qualquer parcela tiver paidDate preenchido', () => {
            const loan = {
                valuePaidClient: 0,
                statusPaymentClient: 'Pendente',
                installments: [
                    { number: 1, value: 100, status: 'Pendente', paidDate: '2026-09-01' }
                ]
            };
            expect(hasPaymentHistory(loan)).toBe(true);
        });

        it('deve detectar histórico em compra compartilhada quando person1 pagou', () => {
            const sharedLoan = {
                isShared: true,
                valuePaidClient: 0,
                statusPaymentClient: 'Pendente',
                sharedDetails: {
                    person1: {
                        valuePaid: 50,
                        balanceDue: 150,
                        statusPayment: 'Pago Parcial',
                        installments: [{ number: 1, value: 50, status: 'Paga' }]
                    },
                    person2: {
                        valuePaid: 0,
                        balanceDue: 200,
                        statusPayment: 'Pendente',
                        installments: [{ number: 1, value: 50, status: 'Pendente' }]
                    }
                }
            };
            expect(hasPaymentHistory(sharedLoan)).toBe(true);
        });

        it('deve detectar histórico em compra compartilhada quando person2 pagou', () => {
            const sharedLoan = {
                isShared: true,
                valuePaidClient: 0,
                statusPaymentClient: 'Pendente',
                sharedDetails: {
                    person1: {
                        valuePaid: 0,
                        balanceDue: 200,
                        statusPayment: 'Pendente',
                        installments: []
                    },
                    person2: {
                        valuePaid: 100,
                        balanceDue: 100,
                        statusPayment: 'Pago Parcial',
                        installments: [{ number: 1, value: 100, status: 'Paga' }]
                    }
                }
            };
            expect(hasPaymentHistory(sharedLoan)).toBe(true);
        });

        it('deve retornar false para compra compartilhada sem pagamentos', () => {
            const sharedLoan = {
                isShared: true,
                valuePaidClient: 0,
                statusPaymentClient: 'Pendente',
                sharedDetails: {
                    person1: {
                        shareAmount: 100,
                        valuePaid: 0,
                        balanceDue: 100,
                        statusPayment: 'Pendente',
                        installments: [{ number: 1, value: 50, status: 'Pendente' }]
                    },
                    person2: {
                        shareAmount: 100,
                        valuePaid: 0,
                        balanceDue: 100,
                        statusPayment: 'Pendente',
                        installments: [{ number: 1, value: 50, status: 'Pendente' }]
                    }
                }
            };
            expect(hasPaymentHistory(sharedLoan)).toBe(false);
        });
    });

    // =========================================================================
    // 2. DETECÇÃO DE ALTERAÇÕES ESTRUTURAIS FINANCEIRAS (isStructuralFinancialEdit)
    // =========================================================================
    describe('2. isStructuralFinancialEdit', () => {
        const originalLoan = {
            id: 'loan-123',
            description: 'Notebook Dell',
            totalValue: 3000,
            installmentsCount: 3,
            isShared: false,
            clientId: 'client-1',
            cardId: 'card-1',
            purchaseDate: '2026-09-01',
            installments: [
                { number: 1, value: 1000, dueDate: '2026-10-10', status: 'Paga' },
                { number: 2, value: 1000, dueDate: '2026-11-10', status: 'Pendente' },
                { number: 3, value: 1000, dueDate: '2026-12-10', status: 'Pendente' }
            ]
        };

        it('Caso 1 — metadados permitidos: deve retornar false quando apenas descrição e cartão são alterados', () => {
            const formParams = {
                purchaseType: 'normal',
                totalValue: 3000,
                installmentsCount: 3,
                firstDueDate: '2026-10-10',
                description: 'Notebook Dell Inspiron Atualizado',
                cardId: 'card-2',
                selectedClientId: 'client-1' // Mantém o mesmo clientId original
            };
            expect(isStructuralFinancialEdit(originalLoan, formParams)).toBe(false);
        });

        it('Caso 2 — troca de cliente: deve retornar true se selectedClientId for alterado em compra normal', () => {
            const formParams = {
                purchaseType: 'normal',
                totalValue: 3000,
                installmentsCount: 3,
                firstDueDate: '2026-10-10',
                description: 'Notebook Dell',
                cardId: 'card-1',
                selectedClientId: 'client-99' // Alterado de client-1 para client-99
            };
            expect(isStructuralFinancialEdit(originalLoan, formParams)).toBe(true);
        });

        it('deve retornar true se totalValue for alterado', () => {
            const formParams = {
                purchaseType: 'normal',
                totalValue: 3500, // alterado de 3000 para 3500
                installmentsCount: 3,
                firstDueDate: '2026-10-10'
            };
            expect(isStructuralFinancialEdit(originalLoan, formParams)).toBe(true);
        });

        it('deve retornar true se installmentsCount for alterado', () => {
            const formParams = {
                purchaseType: 'normal',
                totalValue: 3000,
                installmentsCount: 4, // alterado de 3 para 4
                firstDueDate: '2026-10-10'
            };
            expect(isStructuralFinancialEdit(originalLoan, formParams)).toBe(true);
        });

        it('deve retornar true se purchaseType mudar de normal para shared', () => {
            const formParams = {
                purchaseType: 'shared',
                totalValue: 3000,
                installmentsCount: 3,
                firstDueDate: '2026-10-10'
            };
            expect(isStructuralFinancialEdit(originalLoan, formParams)).toBe(true);
        });

        it('deve retornar true se firstDueDate alterar o primeiro vencimento original', () => {
            const formParams = {
                purchaseType: 'normal',
                totalValue: 3000,
                installmentsCount: 3,
                firstDueDate: '2026-11-15' // alterado de 2026-10-10
            };
            expect(isStructuralFinancialEdit(originalLoan, formParams)).toBe(true);
        });

        it('deve detectar alteração estrutural em compra compartilhada quando shareAmount mudar', () => {
            const sharedOriginal = {
                isShared: true,
                totalValue: 1000,
                installmentsCount: 2,
                installments: [{ number: 1, dueDate: '2026-10-10' }],
                sharedDetails: {
                    person1: { clientId: 'p1', shareAmount: 600 },
                    person2: { clientId: 'p2', shareAmount: 400 }
                }
            };
            const formParams = {
                purchaseType: 'shared',
                totalValue: 1000,
                installmentsCount: 2,
                firstDueDate: '2026-10-10',
                selectedClient1Id: 'p1',
                selectedClient2Id: 'p2',
                person1Share: 500, // alterado de 600 para 500
                person2Share: 500
            };
            expect(isStructuralFinancialEdit(sharedOriginal, formParams)).toBe(true);
        });

        it('deve detectar alteração estrutural em compra compartilhada quando participantes mudarem', () => {
            const sharedOriginal = {
                isShared: true,
                totalValue: 1000,
                installmentsCount: 2,
                installments: [{ number: 1, dueDate: '2026-10-10' }],
                sharedDetails: {
                    person1: { clientId: 'p1', shareAmount: 600 },
                    person2: { clientId: 'p2', shareAmount: 400 }
                }
            };
            const formParams = {
                purchaseType: 'shared',
                totalValue: 1000,
                installmentsCount: 2,
                firstDueDate: '2026-10-10',
                selectedClient1Id: 'p1',
                selectedClient2Id: 'p999', // alterado participante 2
                person1Share: 600,
                person2Share: 400
            };
            expect(isStructuralFinancialEdit(sharedOriginal, formParams)).toBe(true);
        });
    });

    // =========================================================================
    // 3. CONSTRUÇÃO DO PAYLOAD E CASOS DE REGRESSÃO OBRIGATÓRIOS (Casos A a F)
    // =========================================================================
    describe('3. Matriz Canônica de Regressão (Casos A a F)', () => {

        // CASO A
        it('Caso A: Criar compra sem pagamentos. Editar descrição. Estado continua correto.', () => {
            const originalLoan = {
                id: 'loan-a',
                description: 'Geladeira',
                totalValue: 2000,
                installmentsCount: 2,
                purchaseDate: '2026-09-01',
                cardId: 'card-1',
                clientId: 'client-1',
                isShared: false,
                valuePaidClient: 0,
                balanceDueClient: 2000,
                statusPaymentClient: 'Pendente',
                installments: [
                    { number: 1, value: 1000, dueDate: '2026-10-05', status: 'Pendente', paidDate: null },
                    { number: 2, value: 1000, dueDate: '2026-11-05', status: 'Pendente', paidDate: null }
                ]
            };

            expect(hasPaymentHistory(originalLoan)).toBe(false);

            const formParams = {
                description: 'Geladeira Frost Free Inox',
                totalValue: 2000,
                installmentsCount: 2,
                purchaseDate: '2026-09-01',
                cardId: 'card-1',
                purchaseType: 'normal',
                selectedClientId: 'client-1',
                firstDueDate: '2026-10-05',
                calculatedInstallments: calculateInstallments({ totalValue: 2000, count: 2, startDate: '2026-10-05' })
            };

            const payload = buildLoanSavePayload({ editingLoan: originalLoan, formParams, userId: 'user-1' });

            expect(payload.description).toBe('Geladeira Frost Free Inox');
            expect(payload.totalValue).toBe(2000);
            expect(payload.valuePaidClient).toBe(0);
            expect(payload.balanceDueClient).toBe(2000);
            expect(payload.statusPaymentClient).toBe('Pendente');
            expect(payload.installments).toHaveLength(2);
            expect(payload.installments[0].status).toBe('Pendente');
        });

        // CASO B
        it('Caso B: Compra normal parcialmente paga. Editar metadado permitido. Histórico integralmente preservado.', () => {
            const originalLoan = {
                id: 'loan-b',
                description: 'Curso de Idiomas',
                totalValue: 300,
                installmentsCount: 3,
                purchaseDate: '2026-08-01',
                cardId: 'card-1',
                clientId: 'client-1',
                isShared: false,
                valuePaidClient: 100,
                balanceDueClient: 200,
                statusPaymentClient: 'Pago Parcial',
                installments: [
                    { number: 1, value: 100, dueDate: '2026-09-10', status: 'Paga', paidDate: '2026-09-05' },
                    { number: 2, value: 100, dueDate: '2026-10-10', status: 'Pendente', paidDate: null },
                    { number: 3, value: 100, dueDate: '2026-11-10', status: 'Pendente', paidDate: null }
                ]
            };

            expect(hasPaymentHistory(originalLoan)).toBe(true);

            const formParams = {
                description: 'Curso de Espanhol Avançado', // Apenas metadado alterado
                totalValue: 300,
                installmentsCount: 3,
                purchaseDate: '2026-08-01',
                cardId: 'card-1',
                purchaseType: 'normal',
                selectedClientId: 'client-1',
                firstDueDate: '2026-09-10',
                calculatedInstallments: calculateInstallments({ totalValue: 300, count: 3, startDate: '2026-09-10' })
            };

            expect(isStructuralFinancialEdit(originalLoan, formParams)).toBe(false);

            const payload = buildLoanSavePayload({ editingLoan: originalLoan, formParams, userId: 'user-1' });

            // Invariantes essenciais:
            expect(payload.description).toBe('Curso de Espanhol Avançado');
            expect(payload.valuePaidClient).toBe(100); // NÃO PODE SER 0!
            expect(payload.balanceDueClient).toBe(200); // NÃO PODE SER 300!
            expect(payload.statusPaymentClient).toBe('Pago Parcial'); // NÃO PODE SER 'Pendente'!
            expect(payload.installments[0].status).toBe('Paga');
            expect(payload.installments[0].paidDate).toBe('2026-09-05');
            expect(payload.installments[1].status).toBe('Pendente');
            expect(payload.installments[2].status).toBe('Pendente');
        });

        // CASO C
        it('Caso C: Compra normal totalmente paga. Editar metadado permitido. Histórico mantido em Pago Total.', () => {
            const originalLoan = {
                id: 'loan-c',
                description: 'Supermercado',
                totalValue: 200,
                installmentsCount: 2,
                purchaseDate: '2026-07-01',
                cardId: 'card-1',
                clientId: 'client-1',
                isShared: false,
                valuePaidClient: 200,
                balanceDueClient: 0,
                statusPaymentClient: 'Pago Total',
                installments: [
                    { number: 1, value: 100, dueDate: '2026-08-10', status: 'Paga', paidDate: '2026-08-05' },
                    { number: 2, value: 100, dueDate: '2026-09-10', status: 'Paga', paidDate: '2026-09-05' }
                ]
            };

            expect(hasPaymentHistory(originalLoan)).toBe(true);

            const formParams = {
                description: 'Supermercado Mensal - Julho',
                totalValue: 200,
                installmentsCount: 2,
                purchaseDate: '2026-07-01',
                cardId: 'card-2',
                purchaseType: 'normal',
                selectedClientId: 'client-1',
                firstDueDate: '2026-08-10',
                calculatedInstallments: []
            };

            expect(isStructuralFinancialEdit(originalLoan, formParams)).toBe(false);

            const payload = buildLoanSavePayload({ editingLoan: originalLoan, formParams, userId: 'user-1' });

            expect(payload.description).toBe('Supermercado Mensal - Julho');
            expect(payload.cardId).toBe('card-2');
            expect(payload.valuePaidClient).toBe(200);
            expect(payload.balanceDueClient).toBe(0);
            expect(payload.statusPaymentClient).toBe('Pago Total');
            expect(payload.installments.every(i => i.status === 'Paga')).toBe(true);
        });

        // CASO D
        it('Caso D: Compra compartilhada parcialmente paga. Editar metadado. Histórico de ambas as pessoas preservado.', () => {
            const sharedLoan = {
                id: 'loan-d',
                description: 'Jantar Restaurante',
                totalValue: 400,
                installmentsCount: 2,
                purchaseDate: '2026-08-15',
                cardId: 'card-1',
                isShared: true,
                valuePaidClient: 0,
                balanceDueClient: 400,
                statusPaymentClient: 'Pendente',
                installments: [
                    { number: 1, value: 200, dueDate: '2026-09-10', status: 'Pendente' },
                    { number: 2, value: 200, dueDate: '2026-10-10', status: 'Pendente' }
                ],
                sharedDetails: {
                    person1: {
                        clientId: 'alice',
                        shareAmount: 200,
                        valuePaid: 100,
                        balanceDue: 100,
                        statusPayment: 'Pago Parcial',
                        installments: [
                            { number: 1, value: 100, dueDate: '2026-09-10', status: 'Paga', paidDate: '2026-09-02' },
                            { number: 2, value: 100, dueDate: '2026-10-10', status: 'Pendente', paidDate: null }
                        ]
                    },
                    person2: {
                        clientId: 'bob',
                        shareAmount: 200,
                        valuePaid: 0,
                        balanceDue: 200,
                        statusPayment: 'Pendente',
                        installments: [
                            { number: 1, value: 100, dueDate: '2026-09-10', status: 'Pendente', paidDate: null },
                            { number: 2, value: 100, dueDate: '2026-10-10', status: 'Pendente', paidDate: null }
                        ]
                    }
                }
            };

            expect(hasPaymentHistory(sharedLoan)).toBe(true);

            const formParams = {
                description: 'Jantar Restaurante Italiano Celebracao',
                totalValue: 400,
                installmentsCount: 2,
                purchaseDate: '2026-08-15',
                cardId: 'card-1',
                purchaseType: 'shared',
                selectedClient1Id: 'alice',
                selectedClient2Id: 'bob',
                person1Share: 200,
                person2Share: 200,
                firstDueDate: '2026-09-10'
            };

            expect(isStructuralFinancialEdit(sharedLoan, formParams)).toBe(false);

            const payload = buildLoanSavePayload({ editingLoan: sharedLoan, formParams, userId: 'user-1' });

            expect(payload.description).toBe('Jantar Restaurante Italiano Celebracao');
            expect(payload.sharedDetails.person1.valuePaid).toBe(100);
            expect(payload.sharedDetails.person1.balanceDue).toBe(100);
            expect(payload.sharedDetails.person1.statusPayment).toBe('Pago Parcial');
            expect(payload.sharedDetails.person1.installments[0].status).toBe('Paga');

            expect(payload.sharedDetails.person2.valuePaid).toBe(0);
            expect(payload.sharedDetails.person2.balanceDue).toBe(200);
            expect(payload.sharedDetails.person2.statusPayment).toBe('Pendente');
        });

        // CASO E
        it('Caso E: Compra com pagamento existente. Tentar alteração estrutural. isStructuralFinancialEdit deve retornar true (Fail-Closed).', () => {
            const loanWithPayment = {
                id: 'loan-e',
                totalValue: 1000,
                installmentsCount: 5,
                valuePaidClient: 400,
                balanceDueClient: 600,
                statusPaymentClient: 'Pago Parcial',
                installments: [
                    { number: 1, value: 200, dueDate: '2026-08-10', status: 'Paga' },
                    { number: 2, value: 200, dueDate: '2026-09-10', status: 'Paga' },
                    { number: 3, value: 200, dueDate: '2026-10-10', status: 'Pendente' }
                ]
            };

            expect(hasPaymentHistory(loanWithPayment)).toBe(true);

            // Tentativa de alterar valor total de 1000 para 1200
            const attemptChangeValue = {
                purchaseType: 'normal',
                totalValue: 1200,
                installmentsCount: 5,
                firstDueDate: '2026-08-10'
            };
            expect(isStructuralFinancialEdit(loanWithPayment, attemptChangeValue)).toBe(true);

            // Tentativa de alterar parcelas de 5 para 6
            const attemptChangeCount = {
                purchaseType: 'normal',
                totalValue: 1000,
                installmentsCount: 6,
                firstDueDate: '2026-08-10'
            };
            expect(isStructuralFinancialEdit(loanWithPayment, attemptChangeCount)).toBe(true);

            // Tentativa de alterar tipo de compra
            const attemptChangeType = {
                purchaseType: 'shared',
                totalValue: 1000,
                installmentsCount: 5,
                firstDueDate: '2026-08-10'
            };
            expect(isStructuralFinancialEdit(loanWithPayment, attemptChangeType)).toBe(true);
        });

        // CASO E2: Troca de cliente em compra parcialmente paga deve ser bloqueada (FAIL CLOSED)
        it('Caso E2 (Payload / Save): Compra normal parcialmente paga. Tentativa de alterar clientId (client-A -> client-B) deve bloquear save', () => {
            const loanWithPayment = {
                id: 'loan-e2',
                clientId: 'client-A',
                totalValue: 300,
                installmentsCount: 3,
                valuePaidClient: 100,
                balanceDueClient: 200,
                statusPaymentClient: 'Pago Parcial',
                isShared: false,
                installments: [
                    { number: 1, value: 100, dueDate: '2026-08-10', status: 'Paga' },
                    { number: 2, value: 100, dueDate: '2026-09-10', status: 'Pendente' },
                    { number: 3, value: 100, dueDate: '2026-10-10', status: 'Pendente' }
                ]
            };

            expect(hasPaymentHistory(loanWithPayment)).toBe(true);

            // Tentativa de alterar cliente devedor
            const attemptChangeClient = {
                purchaseType: 'normal',
                totalValue: 300,
                installmentsCount: 3,
                firstDueDate: '2026-08-10',
                selectedClientId: 'client-B'
            };

            const isStructural = isStructuralFinancialEdit(loanWithPayment, attemptChangeClient);
            expect(isStructural).toBe(true);

            // Simulação da guarda fail-closed em handleSaveLoan
            let updateDocCalled = false;
            let saveBlocked = false;

            if (hasPaymentHistory(loanWithPayment) && isStructuralFinancialEdit(loanWithPayment, attemptChangeClient)) {
                saveBlocked = true;
                // Save é interrompido sem chamar updateDoc
            } else {
                updateDocCalled = true;
            }

            expect(saveBlocked).toBe(true);
            expect(updateDocCalled).toBe(false);
        });

        // CASO F
        it('Caso F: Compra sem qualquer pagamento. Alterar estrutura financeira permitida. Parcelas recalculadas deterministicamente.', () => {
            const loanWithoutPayment = {
                id: 'loan-f',
                description: 'Mesa de Escritorio',
                totalValue: 600,
                installmentsCount: 3,
                valuePaidClient: 0,
                balanceDueClient: 600,
                statusPaymentClient: 'Pendente',
                installments: [
                    { number: 1, value: 200, dueDate: '2026-10-10', status: 'Pendente' },
                    { number: 2, value: 200, dueDate: '2026-11-10', status: 'Pendente' },
                    { number: 3, value: 200, dueDate: '2026-12-10', status: 'Pendente' }
                ]
            };

            expect(hasPaymentHistory(loanWithoutPayment)).toBe(false);

            // Usuário altera para R$ 1.200 em 4x
            const newInstallments = calculateInstallments({ totalValue: 1200, count: 4, startDate: '2026-11-10' });
            const formParams = {
                description: 'Mesa de Escritorio Madeira Maciça',
                totalValue: 1200,
                installmentsCount: 4,
                purchaseDate: '2026-10-01',
                cardId: 'card-1',
                purchaseType: 'normal',
                selectedClientId: 'client-1',
                firstDueDate: '2026-11-10',
                calculatedInstallments: newInstallments
            };

            const payload = buildLoanSavePayload({ editingLoan: loanWithoutPayment, formParams, userId: 'user-1' });

            expect(payload.description).toBe('Mesa de Escritorio Madeira Maciça');
            expect(payload.totalValue).toBe(1200);
            expect(payload.installmentsCount).toBe(4);
            expect(payload.valuePaidClient).toBe(0);
            expect(payload.balanceDueClient).toBe(1200);
            expect(payload.statusPaymentClient).toBe('Pendente');
            expect(payload.installments).toHaveLength(4);
            expect(payload.installments[0].value).toBe(300);
            expect(payload.installments[3].value).toBe(300);
        });

        // CASO G: Nova Compra (editingLoan === null)
        it('Caso G: Nova compra deve iniciar com valores padrão e parcelas pendentes', () => {
            const newInstallments = calculateInstallments({ totalValue: 500, count: 5, startDate: '2026-10-10' });
            const formParams = {
                description: 'Cadeira Gamer',
                totalValue: 500,
                installmentsCount: 5,
                purchaseDate: '2026-09-02',
                cardId: 'card-1',
                purchaseType: 'normal',
                selectedClientId: 'client-1',
                firstDueDate: '2026-10-10',
                calculatedInstallments: newInstallments
            };

            const payload = buildLoanSavePayload({ editingLoan: null, formParams, userId: 'user-123' });

            expect(payload.description).toBe('Cadeira Gamer');
            expect(payload.totalValue).toBe(500);
            expect(payload.valuePaidClient).toBe(0);
            expect(payload.balanceDueClient).toBe(500);
            expect(payload.statusPaymentClient).toBe('Pendente');
            expect(payload.installments).toHaveLength(5);
        });
    });
});
