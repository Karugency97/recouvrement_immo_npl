# Convex backend — immonpl

Backend Convex self-hosted, déployé sur Coolify (projet NPL).

## Production endpoints (S0 — provisioned 2026-05-27)

- **Backend API**: `https://convex.immo.nplavocat.com` (Let's Encrypt, healthy)
- **Dashboard**: `https://admin.immo.nplavocat.com` (Let's Encrypt, healthy)
- **Storage**: Postgres dédié `convex-npl-postgres` + MinIO 5 buckets

## Status — Semaine 0

- ✅ Schema minimal : `organizations`, `users`, `auditLogs` (proof-of-life)
- ✅ Actions SECIB proof-of-life : `cabinetInfo`, `gatewayHealth`, `dossiersRechercher`
- ✅ Auth Logto wiring : `auth.config.ts` pointe sur `https://auth.nplavocat.com/oidc`
- ⏳ Schema complet (cases, drafts, messages, notes, time_entries…) : en S2
- ⏳ Frontend Next.js intégration ConvexProvider : en S1

## Variables d'environnement (Convex backend, déjà configurées sur Coolify)

| Variable                  | Valeur prod                                                |
| ------------------------- | ---------------------------------------------------------- |
| `SECIB_GATEWAY_API_KEY`   | Clé `X-API-Key` du gateway SECIB (set côté Coolify)        |
| `SECIB_GATEWAY_BASE_URL`  | `https://apisecib.nplavocat.com/api/v1`                    |
| `POSTGRES_URL`            | `postgres://convex:***@yq4thus3w5pik52e6nbhekx2:5432` (base URL only — pas de /dbname, cf. doc Convex) |
| `INSTANCE_NAME`           | `convex-self-hosted` (dérive le nom de DB `convex_self_hosted`) |
| `CONVEX_CLOUD_ORIGIN`     | `https://convex.immo.nplavocat.com`                        |
| `CONVEX_SITE_ORIGIN`      | `https://convex.immo.nplavocat.com`                        |
| `S3_ENDPOINT_URL`         | `http://minio-a11dgvd0tjf2p1iz1931157w:9000` (interne docker network coolify) |
| `S3_STORAGE_*_BUCKET`     | `convex-{exports,snapshots,modules,files,search}`          |

## Tester le proof-of-life (local dev)

Depuis la racine du monorepo :

```bash
# Installer convex (côté apps/frontend pour le client React + côté root pour le CLI)
pnpm install convex

# Pointer le CLI sur le déploiement self-hosted
export CONVEX_SELF_HOSTED_URL=https://convex.immo.nplavocat.com
export CONVEX_SELF_HOSTED_ADMIN_KEY=<récupéré via le dashboard admin.immo.nplavocat.com>

# Test functions
npx convex run secib:gatewayHealth     # → { status: "ok", version, secib: "ok", redis: "ok" }
npx convex run secib:cabinetInfo       # → { data: { CabinetId, Nom: "CABINET AVOCAT NPL", … } }
npx convex run secib:dossiersRechercher --json '{"pageSize": 5}'
```

## Tables du schema

### `organizations`
Représente `org_npl` (le cabinet NPL) + un `org_syndic_X` par syndic client.
- Lien Logto : `logtoOrgId` ← l'`id` de l'organisation Logto NPL (cf. `9trwyqs3lm76` pour `org_npl`).
- Lien SECIB (pour les syndics) : `secibSyndicPersonneId` ← id de la personne SECIB.

### `users`
Mapping `logtoUserId` ↔ rôle applicatif. Les rôles sont définis comme **organization roles** côté Logto NPL.

### `auditLogs`
Tous les writes Convex sont loggés ici (RGPD + RIN traçabilité). Voir PLAN_V1 §8.

## Prochaines étapes (S1)

1. Frontend `apps/frontend` : installer `convex/react` + `ConvexProvider` côté layout
2. Logto wiring : ajouter scopes sur la ressource API Convex (`read:cases`, `write:cases`…)
3. CI/CD : `convex deploy` sur push to main via GitHub Actions
4. S2 : schema métier complet (cases, drafts, messages…) cf. PLAN_V1 §5
