---
name: firestore-architect
description: Especialidade em modelagem de dados, índices, subcoleções, particionamento de usuários e integridade no Cloud Firestore do FinControl.
---

# Firestore Architect — FinControl

## Missão
Projetar e manter a camada de dados no Cloud Firestore de forma escalável, de baixo custo operacional, consistente e 100% segura contra corrupção em produção.

## Estrutura de Coleções e Modelagem
- **Caminho Base do Usuário:** `users_fallback/{userId}/*` ou coleções de usuário isoladas.
- **Coleções Principais:**
  - `cards`: Informações de cartões (nome, limite, dias de fechamento/vencimento, cor).
  - `clients`: Pessoas/clientes cadastrados para empréstimo ou divisão de despesas.
  - `loans`: Compras parceladas e empréstimos com array de `installments`.
  - `expenses`: Despesas avulsas categorizadas.
  - `incomes`: Receitas avulsas e entradas.
  - `subscriptions`: Assinaturas recorrentes e serviços fixos.
  - `paidSubscriptions`: Histórico de competências pagas de assinaturas.
  - `payments`: Histórico de transações de checkout gerenciado exclusivamente via Admin SDK.

## Regras Arquiteturais
1. **Preservação de Dados de Produção:**
   - NUNCA realizar alterações destrutivas de schema ou deletar coleções/campos em lote sem script de migração compatível com versões anteriores.
2. **Consultas e Índices (`firestore.indexes.json`):**
   - Evitar consultas compostas sem índices pré-declarados.
   - Filtrar ordenações por `createdAt` ou campos indexados.
3. **Escrita em Lote e Transações:**
   - Usar `writeBatch` ou `runTransaction` sempre que múltiplas alterações precisarem de atomicidade estrita.
