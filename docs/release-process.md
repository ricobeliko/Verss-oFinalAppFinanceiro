# FinControl — Release Process

Este documento descreve o processo oficial e obrigatório para publicar uma versão do FinControl em produção.

> [!IMPORTANT]
> O deploy **nunca** deve ser executado sem que todos os checks de CI tenham passado.
> O único projeto de produção é `controle-de-cartao`. Qualquer deploy vai diretamente para usuários reais.

---

## 1. Ambientes

| Ambiente | ProjectId Firebase | URL | Deploy |
|----------|-------------------|-----|--------|
| **LOCAL** | `controle-de-cartao` (real, cuidado) | `http://localhost:5173` | N/A |
| **E2E / CI** | `demo-fincontrol-e2e` (sintético) | `http://localhost:5173` | Nunca |
| **PRODUÇÃO** | `controle-de-cartao` | `https://controle-de-cartao.web.app` | Manual pós-CI verde |

> [!WARNING]
> **Não existe staging.** Toda alteração vai direto para produção após o deploy.
> Recomendação futura: criar projeto Firebase `controle-de-cartao-staging` (ver docs/fase6-roadmap.md).

---

## 2. Checklist Pré-Deploy (OBRIGATÓRIO)

Execute cada item e confirme manualmente antes de fazer deploy:

```
[ ] git pull origin main — branch atualizado
[ ] npm ci               — dependências limpas e determinísticas
[ ] npm run lint         — zero erros ESLint
[ ] npm test             — todos os Vitest passando
[ ] npm run test:rules   — Firestore Rules tests passando
[ ] npm run test:functions — Cloud Functions tests passando
[ ] npm run test:e2e     — Playwright write-path e leitura passando
[ ] npm run build        — build de produção sem erros
[ ] Revisar diff: git diff main — entender EXATAMENTE o que muda
[ ] Confirmar que backup recente existe (ver docs/disaster-recovery.md)
[ ] Documentar release notes mínimas (o que muda, por quê)
[ ] Definir rollback: qual commit/versão restaurar se necessário
```

---

## 3. Gate Obrigatório: CI Verde

Antes de qualquer deploy, o **GitHub Actions CI** deve estar verde para o commit que será deployado:

```
✅ quality-gate (Lint + Vitest + Build)
✅ e2e-playwright (Playwright + Firebase Emulators)
```

**Nunca fazer deploy com CI vermelho ou sem CI.**

---

## 4. Procedimento de Deploy

### 4.1 Apenas Frontend (Hosting)

```bash
# Confirmar que está no commit correto
git log --oneline -5

# Build de produção
npm run build

# Deploy somente do hosting (não afeta Functions ou Rules)
firebase deploy --only hosting --project controle-de-cartao
```

### 4.2 Apenas Cloud Functions

```bash
# Build não é necessário para Functions (CommonJS)
# Mas instale as dependências dentro de functions/
cd functions && npm ci && cd ..

# Deploy somente das Functions
firebase deploy --only functions --project controle-de-cartao
```

### 4.3 Firestore Indexes Deploy Gate

> [!CAUTION]
> **FIRESTORE INDEX DEPLOY: BLOCKED UNTIL DRIFT RECONCILIATION**
> Existe drift conhecido entre os índices remotos e locais. Qualquer comando `firebase deploy --only firestore:indexes` ou `firebase deploy` sem `--only` está **ESTRITAMENTE BLOQUEADO** até que seja executada a reconciliação formal de índices.

### 4.4 Procedimento de Deploy Hosting

O deploy de produção deve ser estritamente restrito a:
```bash
# 1. Executar preflight automatizado
node scripts/release/preflight.js

# 2. Gerar o Release Manifest
# (Gera o arquivo de manifesto determinístico vinculado ao commit e SHA do bundle)

# 3. Deploy exclusivo do Hosting
firebase deploy --only hosting --project controle-de-cartao
```

---

## 5. Verificação Pós-Deploy

Após qualquer deploy, execute smoke test manual:

```
[ ] Status HTTP 200 na URL de produção
[ ] Login funciona normalmente
[ ] Dashboard carrega sem erros de ErrorBoundary
[ ] Pelo menos um cartão é exibido corretamente
[ ] Sem erros não tratados no console do navegador
[ ] Tokens de App Check válidos e trocados com sucesso
```

---

## 6. Procedimento e Critérios de Rollback

### 6.1 Critérios Objetivos de Rollback Imediato (SEV-1 / SEV-2)
- Dashboard cai no `ErrorBoundary` (exceção JS em runtime).
- Autenticação/login deixa de funcionar.
- Assets/chunks retornam erro HTTP 404.
- SHA-256 do artefato live difere do Release Manifest homologado.
- CSP bloqueia recursos essenciais de banco ou auth.
- Regressão financeira identificada.

### 6.2 Procedimento de Rollback de Hosting (Versão FINALIZED)

O Firebase Hosting mantém histórico determinístico de versões imutáveis:

1. **Identificar versão live atual e versão estável anterior:**
   - Consultar Release History no Firebase Hosting.
2. **Validar status `FINALIZED` da versão alvo:**
   - Garantir que a versão alvo para onde reverter está íntegra e finalizada.
3. **Executar Rollback (Release type `ROLLBACK`):**
   - No Console Firebase Hosting: Release History → Versão Alvo → "Rollback".
   - Ou via API/CLI apontando a versão anterior como ativa.
4. **Validar CDN e Cache:**
   - Aguardar propagação e validar resposta HTTP 200 em `controle-de-cartao.web.app` e `controle-de-cartao.firebaseapp.com`.
5. **Auditar Logs:**
   - Confirmar cessação de erros de cliente no Cloud Logging.

> [!WARNING]
> **Nunca executar `firebase deploy --only firestore:indexes` como parte de rollback de Hosting.**

### 6.3 Registro Histórico do Incidente Real de Rollback (Evidência Operacional)

O FinControl já executou com sucesso um rollback real de Hosting em produção:

- **Versão Problemática:** `sites/controle-de-cartao/versions/fbd237b9f4363163`
  - *Gatilho:* Regressão em runtime com `TypeError: (j.installments || []).forEach is not a function` pós-login, acionando o `ErrorBoundary`.
- **Rollback Executado:** `sites/controle-de-cartao/versions/665a043bb8d750ad`
  - *Resultado:* Restauração funcional instantânea do Dashboard em produção sem perda de dados.
- **Hotfix Posteriormente Homologado:** `sites/controle-de-cartao/versions/fe669241db09ec67`
  - *Resultado:* Correção com defesa retroativa de array em installments e redeploy controlado.

### 6.4 Rollback de Cloud Functions

Não há rollback nativo. Reverter via git e re-deploy:

```bash
# Encontrar o commit estável anterior
git log --oneline functions/

# Reverter para o commit estável
git checkout <COMMIT_HASH> -- functions/index.js

# Re-deploy das Functions
firebase deploy --only functions --project controle-de-cartao

# Desfazer o revert local após confirmar produção OK
git checkout HEAD -- functions/index.js
```

**Tempo estimado: 10–20 minutos**

### 6.5 Rollback de Firestore Rules

```bash
# Encontrar versão anterior no git
git log --oneline firestore.rules

# Restaurar versão anterior
git checkout <COMMIT_HASH> -- firestore.rules

# Deploy imediato das regras
firebase deploy --only firestore:rules --project controle-de-cartao

# Desfazer após confirmar
git checkout HEAD -- firestore.rules
```

**Tempo estimado: 2–5 minutos** ← mais rápido, boa opção em emergência

---

## 7. Classificação de Severidade de Incidentes

| Nível | Definição | Ação Imediata |
|-------|-----------|---------------|
| **SEV-1** | Perda de dados / indisponibilidade total | Rollback imediato + notificar usuários |
| **SEV-2** | Pagamento / auth / fluxo financeiro crítico | Rollback de Function + investigar logs |
| **SEV-3** | Degradação de funcionalidade | Hotfix na próxima janela |
| **SEV-4** | Problema cosmético / menor | Backlog normal |

---

## 8. Responsáveis

| Ação | Responsável |
|------|-------------|
| Executar deploy | Desenvolvedor com acesso Firebase |
| Aprovar PR → main | Revisor (quando CI existir) |
| Declarar rollback | Desenvolvedor sênior / produto |
| Comunicar usuários | Responsável pelo produto |

---

## 9. Secrets e Credenciais

> [!CAUTION]
> **NUNCA versionar secrets.** As seguintes credenciais vivem EXCLUSIVAMENTE no GCP Secret Manager e nunca devem aparecer em código, commits ou logs:
> - `MERCADOPAGO_ACCESS_TOKEN`
> - `GEMINI_API_KEY`
>
> As variáveis `VITE_*` do arquivo `.env` são públicas por design do Firebase Web SDK (aparecem no bundle), mas o arquivo `.env` local **não deve ser commitado** (está no `.gitignore`).

---

## 10. Gate de Ativação da IA Real

> [!WARNING]
> **A chave `GEMINI_API_KEY` NÃO deve ser provisionada em produção** até que o rate limiting por usuário esteja implementado na Cloud Function `generateAiMonthlyBriefing`.
>
> O fallback determinístico está ativo e é seguro. A IA real sem rate limit expõe a conta a custo ilimitado por abuso.
>
> Checklist para ativar IA real:
> ```
> [ ] Rate limiting (lastAiGeneratedAt + cooldown 24h) implementado
> [ ] PRO gating implementado (apenas usuários Pro)
> [ ] App Check configurado (recomendado)
> [ ] Provisionada via GCP Secret Manager (nunca via .env)
> [ ] Monitoramento de custo habilitado no GCP
> ```

---

*Documento criado na Fase 6 — Production Readiness & Operação Confiável.*
*Última atualização: 2026-08-24*
