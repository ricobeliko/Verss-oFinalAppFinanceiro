# FinControl — Especificação do Release Manifest

O **Release Manifest** é o documento estruturado e determinístico que deve ser gerado antes de qualquer promoção de artefato para o Firebase Hosting de produção.

---

## 1. Estrutura do Manifesto (JSON Schema v1.0.0)

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "FinControlReleaseManifest",
  "type": "object",
  "required": [
    "manifestVersion",
    "commitSha",
    "buildTimestamp",
    "nodeVersion",
    "npmVersion",
    "hostingOnly",
    "indexHtmlSha256",
    "firebaseProjectId",
    "firebaseAppId",
    "hostingSite",
    "previousHostingVersion",
    "newHostingVersion",
    "appCheckFirestoreMode",
    "appCheckAuthMode",
    "ciRunId",
    "ciConclusion",
    "securityGates"
  ],
  "properties": {
    "manifestVersion": { "type": "string", "enum": ["1.0.0"] },
    "commitSha": { "type": "string", "pattern": "^[0-9a-f]{40}$" },
    "buildTimestamp": { "type": "string", "format": "date-time" },
    "nodeVersion": { "type": "string" },
    "npmVersion": { "type": "string" },
    "hostingOnly": { "type": "boolean", "enum": [true] },
    "indexHtmlSha256": { "type": "string", "minLength": 64, "maxLength": 64 },
    "firebaseProjectId": { "type": "string", "enum": ["controle-de-cartao"] },
    "firebaseAppId": { "type": "string", "enum": ["1:364725310124:web:0786258bdcb752d5d70509"] },
    "hostingSite": { "type": "string", "enum": ["controle-de-cartao"] },
    "previousHostingVersion": { "type": "string" },
    "newHostingVersion": { "type": "string" },
    "appCheckFirestoreMode": { "type": "string", "enum": ["UNENFORCED", "ENFORCED"] },
    "appCheckAuthMode": { "type": "string", "enum": ["OFF", "ENFORCED"] },
    "ciRunId": { "type": "string" },
    "ciConclusion": { "type": "string", "enum": ["success"] },
    "securityGates": {
      "type": "object",
      "properties": {
        "functionsBlocked": { "type": "boolean", "enum": [true] },
        "firestoreRulesBlocked": { "type": "boolean", "enum": [true] },
        "firestoreIndexesBlocked": { "type": "boolean", "enum": [true] },
        "demoFallbackForbidden": { "type": "boolean", "enum": [true] },
        "appCheckDebugForbidden": { "type": "boolean", "enum": [true] }
      }
    }
  }
}
```

---

## 2. Campos Proibidos (Gate de Segurança)

> [!CAUTION]
> **É estritamente proibido** incluir qualquer um dos seguintes dados no manifesto:
> 1. API Keys do Firebase (`AIzaSy...`).
> 2. Tokens de Acesso do Mercado Pago (`APP_USR-...`).
> 3. Tokens de Debug do App Check.
> 4. JWTs, cookies de sessão ou credenciais de serviço.

A violação deste gate aciona rejeição automática pelo gerador em `scripts/release/manifestGenerator.js`.
