# Migration Directus → Convex + Logto + SECIB

> **Statut** : S0 (Semaine 0) — fondation Convex provisionnée, ZÉRO impact sur l'existant Directus.
> **Date début** : 2026-05-27
> **Branche** : `feat/convex-s0-setup`
> **Réf** : [PLAN_V1.md](./PLAN_V1.md) (plan complet 6 semaines)

## Pourquoi cette migration

Le stack actuel **Directus + Next.js** ([CLAUDE.md](../CLAUDE.md)) fonctionne en prod sur `immo.nplavocat.com`. Le PLAN_V1 introduit une évolution architecturale :

| Couche | Aujourd'hui (prod) | Cible PLAN_V1 |
|---|---|---|
| Backend métier | Directus (REST, RBAC, hooks) | **Convex** self-hosted (real-time, TS-first, actions) |
| Auth | Directus auth (cookie HTTP-only) | **Logto NPL** OIDC (SPA + M2M, MFA, organizations) |
| Source de vérité légale | Directus PostgreSQL | **SECIB v8.1.4** via gateway `apisecib.nplavocat.com` |
| Frontend | Next.js 15 (inchangé) | Next.js 15 (inchangé) |
| Storage fichiers | Directus uploads | **MinIO S3-compatible** (5 buckets) |

**Bénéfices visés** : 
- Real-time UX (queries Convex auto-reactive)
- TypeScript end-to-end (schema → queries → frontend)
- Source de vérité juridique = SECIB (cabinet d'avocat = traçabilité RIN)
- Multi-tenant Logto (org_npl + org_syndic_X par client)

## Approche non-disruptive

Pendant S0–S2, **Directus reste live et c'est lui qui sert le frontend en prod**. Convex est provisionné en parallèle (sur les mêmes serveurs Coolify) sans toucher au code existant.

Migration progressive prévue :
- **S0** ✅ : provisioner infra Convex + Logto + setup Coolify (fait)
- **S1** : wiring Logto auth dans Next.js + premier appel Convex en lecture (parallèle à Directus)
- **S2** : schema Convex complet + import dossiers SECIB
- **S3** : Portail Syndic basculé Convex (lecture)
- **S4–S6** : Portail Admin + Wizard + Workspace, retire Directus
- **S7+** : Directus reste pour migration data, puis sera décommissionné

## Infra provisionnée S0 (2026-05-27)

### Coolify, projet NPL

| Resource | UUID | Endpoint | Statut |
|---|---|---|---|
| `convex-npl-postgres` | `yq4thus3w5pik52e6nbhekx2` | interne (réseau `coolify`) | ✅ healthy |
| `convex-npl-minio` | `a11dgvd0tjf2p1iz1931157w` | interne `minio-…:9000` | ✅ healthy, 5 buckets `convex-*` |
| `convex-npl` (backend) | `s9qtpvew915hzec5ers7gx8u` (subapp `yz3281446xrsh7wflegf9lv0`) | `https://convex.immo.nplavocat.com` | ✅ healthy HTTPS |
| `convex-npl` (dashboard) | subapp `xdetijqoqw4swza3zdduclx2` | `https://admin.immo.nplavocat.com` | ✅ healthy HTTPS |
| `logto-NPL` | `dj8q3ygr79u4binn1o0ntxjh` | `https://auth.nplavocat.com` + `auth-admin.nplavocat.com` | ✅ healthy HTTPS |

### Logto NPL (instance dédiée)

| Type | Nom | ID |
|---|---|---|
| API Resource | `Convex Immonpl API` | `ezx5hqihw9z9fo4pqnvus` (indicator `https://convex.immo.nplavocat.com`) |
| App SPA | `Immonpl Frontend` | `hg2kdgwrvcg7l2xx86omc` (redirect `https://immo.nplavocat.com/callback`) |
| App M2M | `MCP NPL Admin` | `lrfc8x7dxpekfxuz6x2bd` (gestion Logto via Management API) |
| Organization | `NPL — Cabinet Nancy P.-L.` | `9trwyqs3lm76` |
| Org Role | `npl_admin` | `b4j079rothdw5acj9wr4g` |
| Org Role | `npl_assistant` | `ue89b3yixgf4j1jln8kdp` |
| Org Role | `npl_avocat` | `mot95t986z35mpswukify` |
| Org Role | `syndic_admin` | `v1ev81w2n3vk0buq9ipjf` |
| Org Role | `syndic_gestionnaire` | `8w4cnnrwje10yv25y0ye2` |

### DNS (Hostinger + autres registrars)

- `convex.immo.nplavocat.com` → 31.97.156.140 ✅ Let's Encrypt R13
- `admin.immo.nplavocat.com` → 31.97.156.140 ✅ Let's Encrypt R13
- `auth.nplavocat.com` → 31.97.156.140 ✅ Let's Encrypt
- `auth-admin.nplavocat.com` → 31.97.156.140 ✅ Let's Encrypt

## Ce que cette branche ajoute (S0)

| Fichier | Rôle |
|---|---|
| [`convex/schema.ts`](../convex/schema.ts) | 3 tables minimales : `organizations`, `users`, `auditLogs` |
| [`convex/secib.ts`](../convex/secib.ts) | 3 actions Node.js proof-of-life : `cabinetInfo`, `gatewayHealth`, `dossiersRechercher` |
| [`convex/auth.config.ts`](../convex/auth.config.ts) | Wire Convex ↔ Logto NPL OIDC (`auth.nplavocat.com/oidc`) |
| [`convex/tsconfig.json`](../convex/tsconfig.json) | TS config pour le dossier Convex |
| [`convex/README.md`](../convex/README.md) | Guide opérationnel Convex |
| `.env.example` | + vars `NEXT_PUBLIC_CONVEX_URL`, `NEXT_PUBLIC_LOGTO_*`, `CONVEX_SELF_HOSTED_*` |
| `package.json` (racine) | + dep `convex@^1.16.0` + scripts `convex:dev/deploy/env/run` |
| `docs/PLAN_V1.md` | Plan complet 6 semaines |
| `docs/PROOF_OF_LIFE.md` | Comment tester le wiring SECIB depuis Convex |

## Ce que cette branche NE touche PAS

- ❌ `apps/directus/` — intact, Directus reste prod
- ❌ `apps/frontend/` (sauf ajout convex deps) — code Next.js + Directus SDK intact
- ❌ `packages/shared/` — types Directus intacts
- ❌ `PLAN.md` racine — c'est le plan Directus, on garde pour traçabilité

## Étapes suivantes (S1 — frontend wiring)

À faire dans une **branche séparée** `feat/convex-s1-frontend-wiring` :

1. Installer `convex@^1.16.0` dans `apps/frontend/package.json`
2. Wrap le root layout Next.js avec `<ConvexProvider client={convex}>` 
3. Configurer le client Logto SPA (`@logto/next`) → cookies de session
4. Premier component : appel `secib.cabinetInfo` depuis une Server Component → afficher le nom du cabinet (= proof-of-life UX visible)
5. Définir des scopes sur la resource API Convex (`read:cases`, `write:cases`) et les lier aux org roles

## Comment tester maintenant (sans toucher au frontend)

```bash
# 1. Récupérer une admin key depuis le dashboard Convex
open https://admin.immo.nplavocat.com

# 2. Pointer le CLI Convex sur le déploiement self-hosted
export CONVEX_SELF_HOSTED_URL=https://convex.immo.nplavocat.com
export CONVEX_SELF_HOSTED_ADMIN_KEY=<admin key>

# 3. Tester les actions SECIB depuis convex CLI
pnpm convex:run secib:gatewayHealth
pnpm convex:run secib:cabinetInfo
pnpm convex:run secib:dossiersRechercher --json '{"pageSize": 3}'

# 4. Pousser le schema initial vers le déploiement
pnpm convex:deploy
```
