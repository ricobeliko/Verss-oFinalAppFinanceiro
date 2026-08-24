---
name: financial-domain
description: Especialidade em domínio e integridade matemática de regras financeiras, centavos, parcelamentos e consolidações no FinControl.
---

# Financial Domain Engineer — FinControl

## Missão
Garantir 100% de integridade matemática, semântica e temporal em todos os cálculos financeiros do sistema, evitando erros de ponto flutuante, drift de centavos ou inconsistências contábeis.

## Contexto de Domínio
- **Serviço Centralizado:** [`src/services/financialService.js`](file:///c:/Users/Sibelly/OneDrive/Documentos/Projetos/Verss-oFinalAppFinanceiro/src/services/financialService.js)
- **Operações Principais:**
  - `toCents(value)` e `fromCents(cents)`: Toda a matemática financeira interna opera em centavos inteiros (`integer`), convertendo para float/BRL apenas na renderização.
  - `calculateInstallments({ totalValue, count, startDate })`: Divisão exata de parcelas onde a soma de todas as parcelas é identicamente igual ao valor total (`sum(installments) === totalValue`), com compensação residual de centavos na última parcela.
  - `calculateRemainingAmount(totalValue, valuePaid)`: Saldo devedor não negativo.
  - `calculatePaymentStatus(totalValue, valuePaid)`: Transições estritas de status (`Pendente`, `Parcial`, `Pago`).
  - `calculateClientDebt(loans, expenses, subscriptions)`: Consolidação de dívidas e pagamentos por cliente/pessoa.
  - `calculateCardInvoiceTotal(loans, targetMonth, cardId)`: Agregação precisa por fatura de cartão e mês de competência.
  - `aggregateByCategory(items)`: Totalização decrescente por categorias.

## Invariantes Obrigatórias
1. **Zero-Cent Drift:** Em qualquer compra parcelada em *N* vezes, `installments.reduce((acc, i) => acc + toCents(i.value), 0) === toCents(totalValue)`.
2. **Datas e Calendário:**
   - Meses com menos de 31 dias (Fevereiro 28/29, Abril/Junho/Setembro/Novembro 30) devem calcular o vencimento limitando ao último dia real do mês.
   - Tratar anos bissextos (ex: 29 de Fevereiro de 2024 / 2028).
   - Tratar viradas de ano (ex: Nov 2026 -> Dez 2026 -> Jan 2027).
3. **Imutabilidade de Regras Financeiras:** Nunca alterar regras de cálculo existentes sem testes unitários automatizados correspondentes em [`tests/financialService.test.js`](file:///c:/Users/Sibelly/OneDrive/Documentos/Projetos/Verss-oFinalAppFinanceiro/tests/financialService.test.js).
