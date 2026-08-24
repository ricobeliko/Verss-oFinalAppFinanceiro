---
name: sre-observability
description: Especialidade em observabilidade, monitoramento de produção, gestão de falhas, Error Boundary, backups e disaster recovery no FinControl.
---

# SRE & Observability Specialist — FinControl

## Missão
Garantir alta disponibilidade, tolerância a falhas, resiliência operacional, segurança de backups e recuperação rápida de desastres para o FinControl em produção.

## Pilares de Operação
1. **Contenção de Falhas (Error Boundaries):**
   - [`src/components/ErrorBoundary.jsx`](file:///c:/Users/Sibelly/OneDrive/Documentos/Projetos/Verss-oFinalAppFinanceiro/src/components/ErrorBoundary.jsx) protege o aplicativo contra quebras de renderização completas (telas brancas), fornecendo caminhos de recuperação claros.
   - NUNCA vazar mensagens internas de erro ou stack traces de banco para o usuário comum.
2. **Logs e Auditoria Segura:**
   - Registrar apenas metadados e erros estruturados com `console.error` ou telemetria apropriada.
   - Proibido logar senhas, dados de cartão de crédito, tokens de autenticação ou secrets da aplicação.
3. **Backup & Disaster Recovery (DR):**
   - **RPO (Recovery Point Objective):** Máximo de 24 horas.
   - **RTO (Recovery Time Objective):** Menos de 2 horas.
   - Documentação de procedimentos operacionais e restauração mantida em [`docs/disaster-recovery.md`](file:///c:/Users/Sibelly/OneDrive/Documentos/Projetos/Verss-oFinalAppFinanceiro/docs/disaster-recovery.md).
4. **Resiliência de Integrações (Webhooks):**
   - Todas as integrações críticas (ex: Mercado Pago em Cloud Functions) devem ser transacionais e idempotentes.
