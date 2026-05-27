# Proof-of-Life — Semaine 0

> Statut : ✅ Code en place. Reste à `npm install` + `npx convex dev` + set env key.

## Ce qui a été mis en place

### Structure Convex ([frontend/convex/](../frontend/convex/))

- **`schema.ts`** : 3 tables minimales pour démarrer (cf. PLAN_V1 §5)
  - `organizations` (org_npl, org_syndic_X) indexée par `logtoOrgId` et `kind`
  - `users` (5 rôles : npl_admin, npl_assistant, npl_avocat, syndic_admin, syndic_gestionnaire) indexée par `logtoUserId` et `organizationId`
  - `auditLogs` (RGPD + RIN — toutes actions tracées) indexée par actor / target / created
- **`secib.ts`** : 3 actions Convex Node.js sur le gateway `apisecib.nplavocat.com`
  - `gatewayHealth` — healthcheck sans auth (cf. proof-of-life léger)
  - `cabinetInfo` — `GET /cabinet/info` avec `X-API-Key`, lit l'identité cabinet
  - `dossiersRechercher` — `GET /dossiers` paginé, vrais dossiers SECIB
- **`auth.config.ts`** : placeholder Logto, à câbler en S1
- **`tsconfig.json`** : configuration TypeScript pour le dossier Convex
- **`README.md`** : guide opérationnel Convex

### Package frontend ([frontend/package.json](../frontend/package.json))

- Ajout de la dépendance `convex@^1.16.0`
- 3 scripts : `convex:dev`, `convex:deploy`, `convex:env`

### Environnement ([frontend/.env.example](../frontend/.env.example))

- `REACT_APP_CONVEX_URL` — URL du déploiement Convex
- `REACT_APP_LOGTO_ENDPOINT` — déjà rempli avec `auth.karugency.com`
- `REACT_APP_LOGTO_APP_ID` — à remplir en S1

## Comment tester le proof-of-life

```bash
cd frontend
npm install                                          # installe convex + deps existantes
npx convex dev                                       # init local + génère _generated/
# dans un autre terminal :
npx convex env set SECIB_GATEWAY_API_KEY <la-clef>   # voir ~/.claude.json MCP secib-gateway
npx convex run secib:gatewayHealth                   # ✅ { status: "ok", version, secib: "ok", redis: "ok" }
npx convex run secib:cabinetInfo                     # ✅ { data: { CabinetId, Nom: "CABINET AVOCAT NPL", ... } }
npx convex run secib:dossiersRechercher              # ✅ liste des dossiers SECIB réels
```

**Gate S1 du PLAN_V1** : auth + 1 lecture SECIB OK = on continue. Lecture SECIB OK est ✅ une fois `cabinetInfo` répond. Auth Logto est S1 à faire.

## Ce qui n'a pas été fait (volontairement, hors scope "proof-of-life")

Voir [CLEANUP_TODO.md](./CLEANUP_TODO.md) pour la liste des vestiges encore présents dans le repo.

## Prochaines étapes S1 (Fondations)

| # | Tâche | Effort | Bloquants |
|---|-------|--------|-----------|
| 1 | Déployer Convex self-hosted sur Coolify VPS Hostinger | 1-2 j | sous-domaine `convex.immo.nplavocat.com` + DNS |
| 2 | Déployer Sentry self-hosted | 0.5 j | sous-domaine `sentry.immo.nplavocat.com` |
| 3 | Wire Logto ↔ Convex (JWT middleware, rôles, orgs) | 1-2 j | configuration Logto resource |
| 4 | Resend DKIM/SPF/DMARC sur `nplavocat.com` | 0.5 j | accès DNS |
| 5 | CI/CD GitHub Actions → Coolify webhook + Convex CLI | 0.5 j | secrets GitHub |
| 6 | **Gate S1** : auth OK + lecture SECIB OK = go S2 | — | — |
