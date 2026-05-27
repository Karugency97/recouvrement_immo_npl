# Remplacement de Directus par Convex + Logto + SECIB

> **Intention** : **Convex remplace Directus**. Ce n'est pas une cohabitation long-terme — c'est une migration complète.
> **Statut** : S0 (Semaine 0) — fondation Convex provisionnée. Directus reste prod **uniquement** le temps de la bascule.
> **Date début** : 2026-05-27
> **Date cible décommission Directus** : T+6 semaines (fin S6) ; T+18 semaines max si pilote prolongé
> **Branche** : `feat/convex-s0-setup`
> **Réf** : [PLAN_V1.md](./PLAN_V1.md) (plan complet 6 semaines)

## État final visé (post-migration)

Un seul backend = **Convex self-hosted**. `apps/directus/` sera **supprimé** du repo. `@directus/sdk` retiré de `apps/frontend/`. Le service Coolify `ImmoJuris` (Directus + Postgres + Redis) sera stoppé puis supprimé après vérification des backups.

## Pourquoi remplacer Directus

Le stack actuel **Directus + Next.js** ([CLAUDE.md](../CLAUDE.md)) fonctionne en prod sur `immo.nplavocat.com`, mais il a 3 limites majeures vs les besoins du PLAN_V1 (cabinet d'avocat, recouvrement copropriété) :

1. **Pas de source de vérité juridique** : Directus stocke les dossiers en interne — pour un cabinet d'avocat, la source légale doit être **SECIB v8.1.4** (système métier validé barreau, traçabilité RIN). Convex agit comme couche applicative au-dessus de SECIB, Directus pas conçu pour ça.
2. **Pas de real-time natif** : les listes de dossiers, messages syndic↔avocat, notifications nécessitent du WebSocket. Convex queries sont reactive par design ; Directus impose du polling.
3. **Pas d'auth org-aware** : Directus RBAC = roles globaux. PLAN_V1 §6 exige du multi-tenant (org_npl + org_syndic_X par client) avec rôles d'organisation — c'est nativement Logto, pas Directus.

| Couche | Aujourd'hui (prod) | Cible PLAN_V1 |
|---|---|---|
| Backend métier | Directus (REST, RBAC, hooks) | **Convex** self-hosted (real-time, TS-first, actions) |
| Auth | Directus auth (cookie HTTP-only) | **Logto NPL** OIDC (SPA + M2M, MFA, organizations) |
| Source de vérité légale | Directus PostgreSQL | **SECIB v8.1.4** via gateway `apisecib.nplavocat.com` |
| Frontend | Next.js 15 (inchangé) | Next.js 15 (inchangé) |
| Storage fichiers | Directus uploads | **MinIO S3-compatible** (5 buckets) |

## Bascule pas-à-pas (Directus → Convex)

La bascule est **séquentielle, pas parallèle long-terme**. À chaque étape, on **retire** une responsabilité à Directus et on la donne à Convex. Directus n'est gardé que tant qu'il porte encore au moins une responsabilité prod.

| Phase | Action | Directus assume encore… | Convex assume désormais… |
|---|---|---|---|
| **S0** ✅ (2026-05-27) | Infra Convex+Logto+SECIB provisionnée sur Coolify | TOUT (prod intacte) | Rien (juste l'infra existe) |
| **S1** (S+1) | Wiring frontend : ConvexProvider, Logto SPA, middleware | Tout sauf l'auth | Auth (Logto remplace Directus auth) |
| **S2** (S+2) | Schema Convex complet + import dossiers SECIB | Lecture dossiers | Schema/référentiels métier |
| **S3** (S+3) | Portail Syndic réécrit sur Convex | Portail Admin uniquement | Portail Syndic (lecture + écriture) |
| **S4–S5** (S+4–5) | Portail Admin réécrit sur Convex | Rien de critique | Tout le métier |
| **S6** (S+6) | Audit, freeze Directus en read-only | Archive consultable | Tout |
| **S6+1** | **Stop containers Directus**, export final données | — | Tout, seul backend |
| **S6+2** | **Suppression `apps/directus/`** + `@directus/sdk` du repo | — (mort) | Tout |
| **S6+3** | Suppression Coolify : service `ImmoJuris` + `database.nplavocats.com` DNS | — | Tout |

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

## Ce que cette branche NE touche PAS (encore)

Volontairement intact pour cette PR — la **suppression** sera faite phase par phase une fois la responsabilité transférée à Convex :

- `apps/directus/` — sera supprimé en S6+2
- `apps/frontend/` — sera réécrit S3–S5 pour consommer Convex au lieu de Directus SDK
- `packages/shared/` — types Directus, seront remplacés par types générés Convex (`convex/_generated/`) en S2
- `PLAN.md` racine — c'est le plan Directus initial, gardé pour archive ; **PLAN_V1.md est la source de vérité à partir de S0**

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
