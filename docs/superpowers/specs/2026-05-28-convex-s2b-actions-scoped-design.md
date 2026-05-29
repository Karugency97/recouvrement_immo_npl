# Convex S2b — Actions scoped + withAuditLog + playground

> **Statut** : spec validée 2026-05-28, prête pour plan d'implémentation
> **Branche cible** : `feat/convex-s2b-actions-scoped`
> **Réf** : [docs/superpowers/specs/2026-05-27-convex-s2-schema-design.md](./2026-05-27-convex-s2-schema-design.md), [PLAN_V1.md §6](../../PLAN_V1.md)
> **Précédent** : PR #3 (S2 schema), PR #2 (S1 wiring), PR #1 (S0 foundation)

## Intention

Compléter la couche d'autorisation et d'audit du backend Convex pour les actions SECIB privilégiées. Trois objectifs :

1. **Action scoped syndic** : `dossiersDuSyndic` lit les dossiers d'un syndic via `gw_personnes_dossiers(secibSyndicPersonneId)`. Filtre côté SECIB (1 RTT).
2. **Audit trail conforme RIN** : helper `withAuditLog()` qui logge chaque action privilégiée (start + end + error) dans `auditLogs`. Helper `secibFetch()` qui auto-populate `secibFetchLog` pour replay/debug.
3. **Validation visuelle** : page `/convex-poc/dossiers` qui permet à un utilisateur connecté de tester les actions et voir les retours JSON.

L'action `dossiersOuJeSuisIntervenant` (npl_avocat) est **déferée à S2d** — SECIB n'a pas d'endpoint dédié, le filtrage post-fetch serait N+1, et la requête peut s'appuyer sur la table `cases` une fois l'import S2d effectué.

## Décisions verrouillées (brainstorm 2026-05-28)

| # | Question | Décision | Rationale |
|---|----------|----------|-----------|
| Q1 | Scope de la PR | C — full (actions neuves + retrofit existants + ConvexError partout + secibFetchLog auto) | Évite la dette technique S2c, cohérent : on construit le helper, on l'applique partout |
| Q2 | Forme de `withAuditLog` | A — wrap explicite dans le handler | Transparent, n'obscurcit pas la signature Convex action, metadata flexible par appel |
| Q3 | Stratégie filtrage avocat | C — defer à S2d | SECIB n'a pas d'endpoint scoped intervenant ; N+1 inacceptable ; `cases.by_secib_intervenant` plus tard |
| Q4 | Intégration frontend | A — page playground simple avec JSON brut | Validation visuelle minimum-viable, ~100 LOC, sans gold-plating |

## Architecture

### 4 helpers `convex/lib/`

**`convex/lib/auth.ts`** — extrait de `secib.ts` actuel :
- `requireRole(ctx, allowed)` : auth Logto + lookup user table + check role allowed. Throw `notProvisioned` ou `forbidden` ConvexError.
- Retourne `{ logtoUserId, userId, role, organizationId }`.

**`convex/lib/errors.ts`** — factories ConvexError typées :
- `notAuthenticated()` : "Authentication required..."
- `notProvisioned(logtoUserId)` : "User X not provisioned in immonpl..."
- `forbidden(role, allowed)` : "Role X not allowed..."
- `noSecibPersonneId(orgName)` : pour syndic sans `secibSyndicPersonneId` configuré
- `secibError(status, endpoint, body)` : non-2xx SECIB response
- Toutes utilisent `new ConvexError({ code: "...", message: "...", ...extras })` pour expose au client sans dépendre de `REDACT_LOGS_TO_CLIENT`.

**`convex/lib/audit.ts`** — `withAuditLog` :
```typescript
type AuditMeta = {
  action: string;              // ex: "secib.cabinet_info", "secib.dossiers_du_syndic"
  targetType?: string;         // ex: "cabinet", "personne_dossiers"
  targetId?: string;           // ex: secibSyndicPersonneId
  metadata?: Record<string, unknown>;
};

type AuditContext = {
  logtoUserId: string;
  userId: Id<"users">;
  role: UserRole;
  organizationId: Id<"organizations">;
  // meta forwarded for downstream helpers (secibFetch)
  action: string;
  targetType?: string;
  targetId?: string;
};

async function withAuditLog<T>(
  ctx: ActionCtx,
  meta: AuditMeta,
  fn: (audit: AuditContext) => Promise<T>,
): Promise<T>;
```

Flow :
1. Resolve identity via `requireRole(ctx, ALL_ROLES)` — accepts any provisioned user. The role-specific check is the callsite's job (cf. step 3).
2. Write `auditLogs` row with `action: meta.action + ".attempted"`
3. Call `fn(audit)`. The callsite checks `audit.role` against its specific allow-list and throws `forbidden(audit.role, allowed)` if mismatch. **Do NOT call `requireRole()` again inside the callback** — `audit.role` already holds the resolved role.
4. On success : write `auditLogs` row with `action: meta.action + ".succeeded"`, return result
5. On error : write `auditLogs` row with `action: meta.action + ".failed"` + serialized error in `metadata`, re-throw

**`convex/lib/secibFetch.ts`** — `secibFetch` :
```typescript
type SecibFetchOpts = {
  endpoint: string;           // path relative to SECIB_BASE_URL, ex: "/cabinet/info"
  targetType: string;         // for secibFetchLog row
  targetId: string;           // for secibFetchLog row
  method?: "GET" | "POST" | "PATCH";  // defaults to GET
  params?: Record<string, string | number>;  // query params
  body?: unknown;             // for POST/PATCH
};

async function secibFetch<T>(audit: AuditContext, opts: SecibFetchOpts): Promise<T>;
```

Flow :
1. Build URL with params
2. Fetch with secibHeaders (X-API-Key)
3. Write `secibFetchLog` row with full request+response+status+`fetchedByUserId: audit.userId`
4. On non-2xx : throw `secibError(status, endpoint, body)` ConvexError
5. Return parsed JSON

### Refactored `convex/secib.ts`

```typescript
"use node";

import { action, type ActionCtx } from "./_generated/server";
import { v } from "convex/values";
import { withAuditLog } from "./lib/audit";
import { secibFetch } from "./lib/secibFetch";
import { requireRole, NPL_FULL_ACCESS_ROLES, SYNDIC_ROLES, ALL_ROLES } from "./lib/auth";
import { noSecibPersonneId } from "./lib/errors";
import { internal } from "./_generated/api";

export const gatewayHealth = action({
  args: {},
  handler: async () => {
    // Public — no audit, no SECIB API key (just /admin/health)
    const res = await fetch(`${process.env.SECIB_GATEWAY_BASE_URL}/admin/health`);
    if (!res.ok) throw new ConvexError("secib.health_check_failed");
    return await res.json();
  },
});

// Helper used by callsites to keep the role check uniform :
function assertRole(audit: AuditContext, allowed: readonly UserRole[]): void {
  if (!allowed.includes(audit.role)) {
    throw forbidden(audit.role, allowed);
  }
}

export const cabinetInfo = action({
  args: {},
  handler: async (ctx) => {
    return await withAuditLog(
      ctx,
      { action: "secib.cabinet_info", targetType: "cabinet", targetId: "self" },
      async (audit) => {
        assertRole(audit, ALL_ROLES);  // any provisioned user (default for withAuditLog identity)
        return await secibFetch(audit, {
          endpoint: "/cabinet/info",
          targetType: "cabinet",
          targetId: "self",
        });
      },
    );
  },
});

export const dossiersRechercher = action({
  args: { page: v.optional(v.number()), pageSize: v.optional(v.number()) },
  handler: async (ctx, args) => {
    return await withAuditLog(
      ctx,
      {
        action: "secib.dossiers_rechercher",
        targetType: "dossiers_global",
        metadata: { page: args.page, pageSize: args.pageSize },
      },
      async (audit) => {
        assertRole(audit, NPL_FULL_ACCESS_ROLES);
        return await secibFetch(audit, {
          endpoint: "/dossiers",
          targetType: "dossiers_global",
          targetId: "all",
          params: { ...(args.page && { page: args.page }), ...(args.pageSize && { pageSize: args.pageSize }) },
        });
      },
    );
  },
});

export const dossiersDuSyndic = action({
  args: {},  // scope deducted from caller's organization
  handler: async (ctx) => {
    return await withAuditLog(
      ctx,
      { action: "secib.dossiers_du_syndic" },
      async (audit) => {
        assertRole(audit, SYNDIC_ROLES);
        // Fetch the syndic org to get its secibSyndicPersonneId
        const org = await ctx.runQuery(internal.organizations.getById, {
          id: audit.organizationId,
        });
        if (!org?.secibSyndicPersonneId) {
          throw noSecibPersonneId(org?.name ?? "<unknown>");
        }
        return await secibFetch(audit, {
          endpoint: `/personnes/${org.secibSyndicPersonneId}/dossiers`,
          targetType: "personne_dossiers",
          targetId: org.secibSyndicPersonneId,
        });
      },
    );
  },
});
```

### Internal query needed : `organizations.getById`

`convex/organizations.ts` (new file) :
```typescript
import { internalQuery } from "./_generated/server";
import { v } from "convex/values";

export const getById = internalQuery({
  args: { id: v.id("organizations") },
  handler: async (ctx, args) => await ctx.db.get(args.id),
});
```

### Seed pour test syndic

`convex/seed.ts` — ajout fixture `seedSyndicTestUser` :
```typescript
export const seedSyndicTestUser = internalMutation({
  args: {
    logtoUserId: v.string(),
    email: v.string(),
    name: v.string(),
    secibSyndicPersonneId: v.string(),  // explicit arg — caller must know the real SECIB id
    syndicOrgName: v.string(),          // ex: "Syndic Test ABC"
    logtoOrgId: v.optional(v.string()), // defaults to derived name if Logto syndic org not yet provisioned
  },
  handler: async (ctx, args) => {
    const logtoOrgId = args.logtoOrgId ?? `test_syndic_${args.secibSyndicPersonneId}`;
    let org = await ctx.db
      .query("organizations")
      .withIndex("by_logto_org", (q) => q.eq("logtoOrgId", logtoOrgId))
      .unique();
    if (!org) {
      const id = await ctx.db.insert("organizations", {
        logtoOrgId,
        kind: "syndic",
        name: args.syndicOrgName,
        secibSyndicPersonneId: args.secibSyndicPersonneId,
        createdAt: Date.now(),
      });
      org = await ctx.db.get(id);
      if (!org) throw secibError(500, "seed", "Failed to insert syndic test org");
    }
    const existing = await ctx.db
      .query("users")
      .withIndex("by_logto_user", (q) => q.eq("logtoUserId", args.logtoUserId))
      .unique();
    if (existing) {
      return { status: "exists" as const, userId: existing._id, organizationId: org._id };
    }
    const userId = await ctx.db.insert("users", {
      logtoUserId: args.logtoUserId,
      email: args.email,
      name: args.name,
      role: "syndic_admin",
      organizationId: org._id,
      createdAt: Date.now(),
    });
    return { status: "created" as const, userId, organizationId: org._id };
  },
});
```

⚠️ Pour run le fixture, l'appelant doit fournir un `secibSyndicPersonneId` qui existe vraiment dans SECIB — sinon `dossiersDuSyndic` retournera vide ou erreur. Pour les tests locaux, choisir un syndic réel du cabinet NPL.

Plus tous les `throw new Error("Failed to insert...")` existants passent en `throw new ConvexError("seed.insert_failed", { table })`.

### Frontend playground

`apps/frontend/src/app/convex-poc/dossiers/page.tsx` :
- Client Component (`"use client"`)
- Wraps content in `<Authenticated>` from `convex/react` so unauthenticated users see "Sign in to test"
- Uses `useAction(api.secib.cabinetInfo)` etc. for the 3 actions
- Layout : title + auth status row + 3 buttons + result `<pre>` + error `<pre>`
- Show current user identity + role (need a helper Convex query `users.me` that returns the caller's user row)

`convex/users.ts` — extend with public `me` query :
```typescript
export const me = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const user = await ctx.db
      .query("users")
      .withIndex("by_logto_user", (q) => q.eq("logtoUserId", identity.subject))
      .unique();
    if (!user) return null;
    const org = await ctx.db.get(user.organizationId);
    return {
      logtoUserId: user.logtoUserId,
      email: user.email,
      name: user.name,
      role: user.role,
      organizationName: org?.name,
      organizationKind: org?.kind,
    };
  },
});
```

(This is a public `query`, not internal — frontend uses it via `useQuery`.)

## Hors scope S2b (= S2c/S2d/S3)

- **`dossiersOuJeSuisIntervenant`** : S2d après import dossiers SECIB → ou S3 quand portail Admin écrit
- **Crons** : (referentials refresh, notes debounce, caseDrafts cleanup, secibFetchLog 90j purge) → S2c
- **Bucket presence check** : workaround documenté pour MinIO → S2c
- **Rename `getOrCreateFixtureCase`** → `ensureFixtureCaseExists` : cosmetic, S2c
- **Tests intégrés** : pas de framework de test Convex côté backend — validation = playground + `convex:run`. Tests E2E Playwright en S6 per PLAN_V1.
- **Notification email à l'avocat sur nouvelle action audit** : trop tôt, S3+

## Test plan (validation post-impl)

1. `pnpm convex:deploy` succeeds (4 nouveaux fichiers `lib/`, 1 nouveau fichier `organizations.ts`, refactor seed.ts + secib.ts)
2. `pnpm convex:run seed:provisionNplUser` (régression S2) → OK
3. `pnpm convex:run seed:seedSyndicTestUser '{"logtoUserId":"<id>","email":"test-syndic@example.com","name":"Syndic Test"}'` → `status: created`
4. **Local dev** :
   - `cp .env.example apps/frontend/.env.local`, remplir avec les Logto vars (déjà documenté en S1)
   - `pnpm dev` dans `apps/frontend`
   - Visiter `http://localhost:3000/convex-poc/dossiers`
   - Si pas loggué → bouton "Sign in" redirige vers Logto → callback → page chargée
   - Cliquer `cabinetInfo` → JSON cabinet visible
   - Cliquer `dossiersRechercher` → liste dossiers (vu que je suis npl_admin) ou erreur "Forbidden"
   - Cliquer `dossiersDuSyndic` → "Forbidden role npl_admin not allowed" (logique, je suis pas syndic)
5. **Re-login en tant que syndic test user** :
   - Logout, re-login avec un user provisionné `syndic_admin`
   - Cliquer `dossiersDuSyndic` → soit JSON dossiers du syndic SECIB, soit erreur explicite si `secibSyndicPersonneId` pas configuré
6. **Audit verify** : Convex dashboard `auditLogs` table → voir 2 rows par appel (attempted + succeeded/failed)
7. **SecibFetchLog verify** : Convex dashboard `secibFetchLog` table → voir 1 row par appel SECIB avec full responsePayload

## Migration / breaking changes

- Aucun changement de schema (S2 schema déjà déployé)
- `convex/secib.ts` exports inchangés (mêmes noms, mêmes args) — frontend existant continue de fonctionner
- `convex/seed.ts` exports inchangés (mêmes fixtures), ajoute juste `seedSyndicTestUser`
- ConvexError au lieu d'Error : si frontend catch les erreurs, il faut adapter — mais frontend n'utilise pas encore ces actions en prod
- Auto-populate secibFetchLog : pollue la table avec 1 row par fetch — pour le PoC c'est OK (low volume)

## Volumétrie estimée

| Catégorie | LOC nouveau | LOC modifié |
|---|---|---|
| `convex/lib/` (4 fichiers) | ~240 | 0 |
| `convex/secib.ts` | ~30 (action neuve) | ~150 (refactor) |
| `convex/seed.ts` | ~40 (fixture syndic) | ~10 (ConvexError) |
| `convex/users.ts` | ~25 (`me` query) | 0 |
| `convex/organizations.ts` | ~10 | 0 |
| `apps/frontend/src/app/convex-poc/dossiers/page.tsx` | ~100 | 0 |
| **Total** | **~445** | **~160** |
