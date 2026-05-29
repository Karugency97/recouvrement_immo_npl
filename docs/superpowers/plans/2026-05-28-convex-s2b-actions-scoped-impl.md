# Convex S2b Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Compléter la couche d'autorisation et d'audit Convex avec helpers réutilisables (`withAuditLog`, `secibFetch`, `requireRole`, ConvexError factories), 1 nouvelle action scoped `dossiersDuSyndic`, retrofit des 3 actions existantes, et 1 page playground frontend pour validation visuelle.

**Architecture:** 4 lib helpers (`convex/lib/{errors,auth,audit,secibFetch}.ts`) + 2 nouvelles internal mutations pour append-only tables (`auditLogs.append`, `secibFetchLog.append`) + 2 nouveaux fichiers de queries (`organizations.ts:getById` + `users.ts:me`) + 1 nouvelle action + retrofit existant + 1 fixture syndic + 1 page Next.js client component.

**Tech Stack:** Convex 1.16 self-hosted, TypeScript strict, Next.js 15 App Router client components, `convex/react` hooks (`useAction`, `useQuery`, `Authenticated`).

**Référence spec :** [docs/superpowers/specs/2026-05-28-convex-s2b-actions-scoped-design.md](../specs/2026-05-28-convex-s2b-actions-scoped-design.md)

---

## File Structure

| Fichier | Action | Responsabilité |
|---|---|---|
| `convex/lib/errors.ts` | NEW | Factories `ConvexError` typées (`forbidden`, `notProvisioned`, `secibError`, etc.) |
| `convex/lib/auth.ts` | NEW | `requireRole(ctx, allowed)` extrait de secib.ts + role unions partagées |
| `convex/lib/audit.ts` | NEW | `withAuditLog(ctx, meta, fn)` qui résout identité + logge attempted/succeeded/failed |
| `convex/lib/secibFetch.ts` | NEW | `secibFetch(audit, opts)` qui fetch SECIB + auto-populate secibFetchLog + throw ConvexError sur non-2xx |
| `convex/auditLogs.ts` | NEW | Internal mutation `append` (actions ne peuvent pas écrire en db directement) |
| `convex/secibFetchLog.ts` | NEW | Internal mutation `append` |
| `convex/organizations.ts` | NEW | Internal query `getById` (utilisée par `dossiersDuSyndic`) |
| `convex/users.ts` | MODIFY | Ajoute public query `me` pour le frontend |
| `convex/secib.ts` | MODIFY | Refactor pour utiliser tous les libs + ajoute `dossiersDuSyndic` + helper `assertRole` |
| `convex/seed.ts` | MODIFY | ConvexError au lieu d'Error + ajoute fixture `seedSyndicTestUser` |
| `apps/frontend/src/app/convex-poc/dossiers/page.tsx` | NEW | Page client component playground (~100 LOC) |

Aucun changement de schema (déjà déployé en S2). Aucun changement frontend hors la nouvelle page.

**Convention** : tous les helpers `convex/lib/*` exportent une seule fonction (single-responsibility). Les ConvexError sont créés via factories (jamais `new ConvexError(...)` direct dans le code métier).

---

## Task 1: Pre-flight verification

**Files:** Aucun

- [ ] **Step 1: Confirmer la branche et l'état git**

Run:
```bash
cd /Users/mkstudio/Desktop/recouvrement_immo_npl && git branch --show-current && git status -s
```

Expected:
```
feat/convex-s2b-actions-scoped
```
(Aucun fichier modifié. Si tu vois des modifications, stash avant de commencer.)

- [ ] **Step 2: Confirmer que la spec est sur la branche**

Run:
```bash
ls docs/superpowers/specs/2026-05-28-convex-s2b-actions-scoped-design.md
```

Expected: file exists.

- [ ] **Step 3: Confirmer l'état des fichiers Convex**

Run:
```bash
ls convex/lib/ 2>/dev/null || echo "lib/ ABSENT — sera créé en Task 2"
ls convex/{organizations,auditLogs,secibFetchLog}.ts 2>/dev/null || echo "Files NEW absent"
wc -l convex/secib.ts convex/seed.ts convex/users.ts
```

Expected:
```
lib/ ABSENT — sera créé en Task 2
Files NEW absent
152 convex/secib.ts
294 convex/seed.ts
17 convex/users.ts
```

- [ ] **Step 4: Confirmer que convex/_generated existe**

Run:
```bash
ls convex/_generated/api.d.ts convex/_generated/server.d.ts
```

Expected: both files exist (généré par le deploy S2). Si absent, tu devras run `pnpm convex:deploy` avant Task 8 pour avoir les types.

---

## Task 2: Create `convex/lib/errors.ts`

**Files:**
- Create: `convex/lib/errors.ts`

ConvexError factories. Aucune dépendance.

- [ ] **Step 1: Écrire `convex/lib/errors.ts`**

```typescript
import { ConvexError } from "convex/values";

// ─────────────────────────────────────────────────────────────────
// ConvexError factories — typed structured errors.
// Use these instead of `throw new Error(...)` so the client sees a
// meaningful payload even when REDACT_LOGS_TO_CLIENT=true.
//
// Format: ConvexError({ code: "scope.what_happened", message: "...", ...extras })
// ─────────────────────────────────────────────────────────────────

export function notAuthenticated(): ConvexError<{ code: string; message: string }> {
  return new ConvexError({
    code: "auth.not_authenticated",
    message:
      "Authentication required. SECIB data is confidential — only signed-in users may query it.",
  });
}

export function notProvisioned(
  logtoUserId: string,
): ConvexError<{ code: string; message: string; logtoUserId: string }> {
  return new ConvexError({
    code: "auth.not_provisioned",
    message: `User ${logtoUserId} is authenticated but not provisioned in immonpl. Contact an NPL admin to be granted access.`,
    logtoUserId,
  });
}

export function forbidden(
  role: string,
  allowed: readonly string[],
): ConvexError<{ code: string; message: string; role: string; allowed: readonly string[] }> {
  return new ConvexError({
    code: "auth.forbidden",
    message: `Role "${role}" is not authorized for this action. Allowed: ${allowed.join(", ")}.`,
    role,
    allowed,
  });
}

export function noSecibPersonneId(
  orgName: string,
): ConvexError<{ code: string; message: string; orgName: string }> {
  return new ConvexError({
    code: "syndic.no_secib_personne_id",
    message: `Organization "${orgName}" has no secibSyndicPersonneId configured. Cannot scope to its SECIB dossiers.`,
    orgName,
  });
}

export function secibError(
  status: number,
  endpoint: string,
  body: string,
): ConvexError<{ code: string; message: string; status: number; endpoint: string; body: string }> {
  return new ConvexError({
    code: "secib.fetch_failed",
    message: `SECIB gateway ${status} on ${endpoint}: ${body.slice(0, 200)}`,
    status,
    endpoint,
    body,
  });
}

export function secibApiKeyMissing(): ConvexError<{ code: string; message: string }> {
  return new ConvexError({
    code: "secib.api_key_missing",
    message:
      "SECIB_GATEWAY_API_KEY is not set. Configure it via `npx convex env set SECIB_GATEWAY_API_KEY <key>`.",
  });
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/mkstudio/Desktop/recouvrement_immo_npl && rtk git add convex/lib/errors.ts && rtk git commit -m "feat(s2b): add ConvexError factories in convex/lib/errors.ts

Typed structured errors to replace throw new Error(). Each factory returns
ConvexError<{ code, message, ...extras }> so the client always sees a
meaningful payload, regardless of REDACT_LOGS_TO_CLIENT.

Factories: notAuthenticated, notProvisioned, forbidden, noSecibPersonneId,
secibError, secibApiKeyMissing.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 3: Create `convex/lib/auth.ts`

**Files:**
- Create: `convex/lib/auth.ts`

Extrait `requireRole` de `secib.ts` actuel. Pas encore importé par secib.ts — ça vient en Task 8.

- [ ] **Step 1: Écrire `convex/lib/auth.ts`**

```typescript
import type { ActionCtx } from "../_generated/server";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { notAuthenticated, notProvisioned, forbidden } from "./errors";

// ─────────────────────────────────────────────────────────────────
// Role unions kept in sync with convex/schema.ts users.role
// ─────────────────────────────────────────────────────────────────

export type UserRole =
  | "npl_admin"
  | "npl_assistant"
  | "npl_avocat"
  | "syndic_admin"
  | "syndic_gestionnaire";

// Authorization tiers per PLAN_V1 §6 visibility matrix:
//   npl_admin / npl_assistant   → tous dossiers, tous syndics (full access)
//   npl_avocat                  → uniquement dossiers où intervenant SECIB (scoped — S2d)
//   syndic_admin / gestionnaire → uniquement dossiers de leur syndic (scoped)
//
// IMPORTANT: never expand NPL_FULL_ACCESS_ROLES to include scoped roles.
// Each scoped role needs its own action that filters server-side.
export const NPL_FULL_ACCESS_ROLES = ["npl_admin", "npl_assistant"] as const;
export const NPL_SCOPED_ACCESS_ROLES = ["npl_avocat"] as const;
export const SYNDIC_ROLES = ["syndic_admin", "syndic_gestionnaire"] as const;
export const ALL_ROLES = [
  ...NPL_FULL_ACCESS_ROLES,
  ...NPL_SCOPED_ACCESS_ROLES,
  ...SYNDIC_ROLES,
] as const;

// ─────────────────────────────────────────────────────────────────
// requireRole — auth gate used by withAuditLog (and direct callers).
//
// Verifies the caller is:
//   1. Authenticated (Logto JWT validated by Convex auth.config.ts)
//   2. Provisioned in Convex users table
//   3. Holds one of the allowed roles
// SECIB data is confidential (secret professionnel RIN, art. 226-13 CP) so
// we fail closed: unknown identities and unknown roles are rejected.
//
// CLI calls via `npx convex run` have NO identity (auth.getUserIdentity()
// returns null) so they hit notAuthenticated. For seed/ops, use internal
// mutations (not actions).
// ─────────────────────────────────────────────────────────────────

export type AuthenticatedUser = {
  logtoUserId: string;
  userId: Id<"users">;
  role: UserRole;
  organizationId: Id<"organizations">;
};

export async function requireRole(
  ctx: ActionCtx,
  allowed: readonly UserRole[],
): Promise<AuthenticatedUser> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw notAuthenticated();

  const user = await ctx.runQuery(internal.users.getByLogtoId, {
    logtoUserId: identity.subject,
  });
  if (!user) throw notProvisioned(identity.subject);

  if (!allowed.includes(user.role as UserRole)) {
    throw forbidden(user.role, allowed);
  }

  return {
    logtoUserId: user.logtoUserId,
    userId: user._id,
    role: user.role as UserRole,
    organizationId: user.organizationId,
  };
}
```

- [ ] **Step 2: Vérifier que les imports résolvent**

Run:
```bash
cd /Users/mkstudio/Desktop/recouvrement_immo_npl && cat convex/lib/auth.ts | head -5
ls convex/_generated/api.d.ts convex/_generated/server.d.ts convex/_generated/dataModel.d.ts
```

Expected: file existe + les 3 generated files existent (sinon lance `pnpm convex:deploy` une fois pour les régénérer).

- [ ] **Step 3: Commit**

```bash
cd /Users/mkstudio/Desktop/recouvrement_immo_npl && rtk git add convex/lib/auth.ts && rtk git commit -m "feat(s2b): extract requireRole into convex/lib/auth.ts

Pulls the auth gate out of secib.ts into a reusable lib. Exports UserRole
type, role tier unions (NPL_FULL_ACCESS_ROLES, NPL_SCOPED_ACCESS_ROLES,
SYNDIC_ROLES, ALL_ROLES), and requireRole(ctx, allowed) returning the
resolved AuthenticatedUser.

secib.ts still has its own inline copy — that swap comes in Task 8 along
with the full refactor.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 4: Create `convex/auditLogs.ts` + `convex/lib/audit.ts`

**Files:**
- Create: `convex/auditLogs.ts`
- Create: `convex/lib/audit.ts`

Actions ne peuvent pas écrire en db. On a besoin d'une internal mutation `append` que `withAuditLog` appelle via `ctx.runMutation`.

- [ ] **Step 1: Écrire `convex/auditLogs.ts`**

```typescript
import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

// Internal mutation called by withAuditLog (lib/audit.ts) to append rows.
// Not exposed to clients — every audit row originates from a server-side
// helper, never from user input.
export const append = internalMutation({
  args: {
    actorLogtoUserId: v.string(),
    actorUserId: v.id("users"),
    actorRole: v.string(),
    actorOrganizationId: v.id("organizations"),
    action: v.string(),
    targetType: v.optional(v.string()),
    targetId: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("auditLogs", {
      ...args,
      createdAt: Date.now(),
    });
  },
});
```

- [ ] **Step 2: Écrire `convex/lib/audit.ts`**

```typescript
import type { ActionCtx } from "../_generated/server";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { ALL_ROLES, requireRole, type UserRole } from "./auth";

// ─────────────────────────────────────────────────────────────────
// withAuditLog — wraps a privileged action handler.
//
// Flow:
//   1. Resolve identity via requireRole(ctx, ALL_ROLES) — accepts any
//      provisioned user. The action-specific role check (e.g. NPL only)
//      is the callsite's responsibility via assertRole(audit, ALLOWED).
//   2. Append "{action}.attempted" row to auditLogs.
//   3. Call fn(audit). The audit context carries role + ids for downstream
//      helpers like secibFetch (which auto-populates fetchedByUserId).
//   4. On success: append "{action}.succeeded" row, return result.
//   5. On error: append "{action}.failed" row with serialized error in
//      metadata, re-throw.
// ─────────────────────────────────────────────────────────────────

export type AuditMeta = {
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
};

export type AuditContext = {
  logtoUserId: string;
  userId: Id<"users">;
  role: UserRole;
  organizationId: Id<"organizations">;
  // forwarded for downstream helpers (used by secibFetch.fetchedByUserId)
  action: string;
  targetType?: string;
  targetId?: string;
};

export async function withAuditLog<T>(
  ctx: ActionCtx,
  meta: AuditMeta,
  fn: (audit: AuditContext) => Promise<T>,
): Promise<T> {
  // Step 1: resolve identity (any provisioned role).
  const user = await requireRole(ctx, ALL_ROLES);

  const auditBase = {
    actorLogtoUserId: user.logtoUserId,
    actorUserId: user.userId,
    actorRole: user.role,
    actorOrganizationId: user.organizationId,
    targetType: meta.targetType,
    targetId: meta.targetId,
  };

  // Step 2: log "attempted"
  await ctx.runMutation(internal.auditLogs.append, {
    ...auditBase,
    action: `${meta.action}.attempted`,
    metadata: meta.metadata,
  });

  // Step 3: build audit context for the callback
  const audit: AuditContext = {
    logtoUserId: user.logtoUserId,
    userId: user.userId,
    role: user.role,
    organizationId: user.organizationId,
    action: meta.action,
    targetType: meta.targetType,
    targetId: meta.targetId,
  };

  try {
    const result = await fn(audit);

    // Step 4: log "succeeded"
    await ctx.runMutation(internal.auditLogs.append, {
      ...auditBase,
      action: `${meta.action}.succeeded`,
      metadata: meta.metadata,
    });

    return result;
  } catch (error) {
    // Step 5: log "failed" with serialized error
    const errorPayload =
      error instanceof Error
        ? { name: error.name, message: error.message }
        : { raw: String(error) };

    await ctx.runMutation(internal.auditLogs.append, {
      ...auditBase,
      action: `${meta.action}.failed`,
      metadata: { ...meta.metadata, error: errorPayload },
    });

    throw error;
  }
}
```

- [ ] **Step 3: Commit**

```bash
cd /Users/mkstudio/Desktop/recouvrement_immo_npl && rtk git add convex/auditLogs.ts convex/lib/audit.ts && rtk git commit -m "feat(s2b): add withAuditLog helper + auditLogs.append internal mutation

withAuditLog wraps action handlers in convex/secib.ts (Task 8) :
  1. Resolves identity via requireRole(ctx, ALL_ROLES)
  2. Appends '{action}.attempted' to auditLogs
  3. Calls the user-provided callback with an AuditContext
     (logtoUserId, userId, role, organizationId, action, targetType?, targetId?)
  4. On success: appends '{action}.succeeded'
  5. On error: appends '{action}.failed' with serialized error in metadata,
     re-throws

Actions can't write to db directly, hence the auditLogs.append internal
mutation called via ctx.runMutation.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 5: Create `convex/secibFetchLog.ts` + `convex/lib/secibFetch.ts`

**Files:**
- Create: `convex/secibFetchLog.ts`
- Create: `convex/lib/secibFetch.ts`

- [ ] **Step 1: Écrire `convex/secibFetchLog.ts`**

```typescript
import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const append = internalMutation({
  args: {
    endpoint: v.string(),
    targetType: v.string(),
    targetId: v.string(),
    requestParams: v.optional(v.any()),
    responsePayload: v.any(),
    status: v.number(),
    fetchedByUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("secibFetchLog", {
      ...args,
      fetchedAt: Date.now(),
    });
  },
});
```

- [ ] **Step 2: Écrire `convex/lib/secibFetch.ts`**

```typescript
"use node";

import type { ActionCtx } from "../_generated/server";
import { internal } from "../_generated/api";
import type { AuditContext } from "./audit";
import { secibError, secibApiKeyMissing } from "./errors";

const SECIB_BASE_URL =
  process.env.SECIB_GATEWAY_BASE_URL ?? "https://apisecib.nplavocat.com/api/v1";

function secibHeaders(): HeadersInit {
  const apiKey = process.env.SECIB_GATEWAY_API_KEY;
  if (!apiKey) throw secibApiKeyMissing();
  return {
    "X-API-Key": apiKey,
    Accept: "application/json",
    "Content-Type": "application/json",
  };
}

export type SecibFetchOpts = {
  endpoint: string;
  targetType: string;
  targetId: string;
  method?: "GET" | "POST" | "PATCH";
  params?: Record<string, string | number | undefined>;
  body?: unknown;
};

// ─────────────────────────────────────────────────────────────────
// secibFetch — wraps SECIB gateway calls with automatic logging.
//
// Auto-populates secibFetchLog with full request + response + status +
// fetchedByUserId (taken from audit.userId). On non-2xx, throws
// secibError ConvexError so the caller gets a structured payload.
// ─────────────────────────────────────────────────────────────────

export async function secibFetch<T = unknown>(
  ctx: ActionCtx,
  audit: AuditContext,
  opts: SecibFetchOpts,
): Promise<T> {
  const method = opts.method ?? "GET";

  // Build URL with query params
  let url = `${SECIB_BASE_URL}${opts.endpoint}`;
  if (opts.params) {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(opts.params)) {
      if (value !== undefined) search.set(key, String(value));
    }
    const qs = search.toString();
    if (qs) url += `?${qs}`;
  }

  // Execute fetch
  const res = await fetch(url, {
    method,
    headers: secibHeaders(),
    ...(opts.body !== undefined ? { body: JSON.stringify(opts.body) } : {}),
  });

  // Read response (may be JSON or text on error)
  const responseText = await res.text();
  let responsePayload: unknown;
  try {
    responsePayload = JSON.parse(responseText);
  } catch {
    responsePayload = { raw: responseText };
  }

  // Auto-populate secibFetchLog regardless of success/failure
  await ctx.runMutation(internal.secibFetchLog.append, {
    endpoint: opts.endpoint,
    targetType: opts.targetType,
    targetId: opts.targetId,
    requestParams: { ...(opts.params ?? {}), method, body: opts.body },
    responsePayload,
    status: res.status,
    fetchedByUserId: audit.userId,
  });

  if (!res.ok) {
    throw secibError(res.status, opts.endpoint, responseText);
  }

  return responsePayload as T;
}
```

⚠️ Note : `secibFetch` prend `ctx` ET `audit` séparément (besoin de `ctx` pour `runMutation`, `audit` pour `userId`). Pas idéal, mais éviter de mettre `ctx` dans `audit` empêche les helpers de muter la db hors workflow.

- [ ] **Step 3: Commit**

```bash
cd /Users/mkstudio/Desktop/recouvrement_immo_npl && rtk git add convex/secibFetchLog.ts convex/lib/secibFetch.ts && rtk git commit -m "feat(s2b): add secibFetch helper + secibFetchLog.append internal mutation

secibFetch(ctx, audit, opts) wraps SECIB gateway calls:
  - Builds URL with query params
  - Executes fetch with X-API-Key header
  - Auto-populates secibFetchLog with full request + response + status +
    fetchedByUserId (from audit context)
  - Throws secibError ConvexError on non-2xx

Signature takes ctx + audit separately: ctx for runMutation, audit for
userId. Cleaner than coupling ctx into the AuditContext type.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 6: Create `convex/organizations.ts`

**Files:**
- Create: `convex/organizations.ts`

- [ ] **Step 1: Écrire `convex/organizations.ts`**

```typescript
import { internalQuery } from "./_generated/server";
import { v } from "convex/values";

// Internal query used by secib.dossiersDuSyndic to resolve the caller's
// organization (and its secibSyndicPersonneId).
export const getById = internalQuery({
  args: { id: v.id("organizations") },
  handler: async (ctx, args) => await ctx.db.get(args.id),
});
```

- [ ] **Step 2: Commit**

```bash
cd /Users/mkstudio/Desktop/recouvrement_immo_npl && rtk git add convex/organizations.ts && rtk git commit -m "feat(s2b): add organizations.getById internal query

Used by secib.dossiersDuSyndic to fetch the caller's org and its
secibSyndicPersonneId. Not exposed to clients — actions resolve identity
first, then look up the org server-side.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 7: Extend `convex/users.ts` with public `me` query

**Files:**
- Modify: `convex/users.ts`

Adds a public query `me` that returns the caller's user + org info for the frontend playground (identity display).

- [ ] **Step 1: Remplacer le contenu de `convex/users.ts`**

```typescript
import { internalQuery, query } from "./_generated/server";
import { v } from "convex/values";

// Lookup a user by their Logto subject ID. Internal (not callable from client).
// Used by SECIB actions (via lib/auth.requireRole) to resolve identity → role.
export const getByLogtoId = internalQuery({
  args: { logtoUserId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_logto_user", (q) =>
        q.eq("logtoUserId", args.logtoUserId),
      )
      .unique();
  },
});

// Public query — returns the calling user's identity + role + org name.
// Used by the /convex-poc/dossiers playground to show "Connected as X, role Y".
// Returns null if the caller is unauthenticated OR not provisioned.
export const me = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const user = await ctx.db
      .query("users")
      .withIndex("by_logto_user", (q) =>
        q.eq("logtoUserId", identity.subject),
      )
      .unique();
    if (!user) return null;
    const org = await ctx.db.get(user.organizationId);
    return {
      logtoUserId: user.logtoUserId,
      email: user.email,
      name: user.name,
      role: user.role,
      organizationName: org?.name ?? null,
      organizationKind: org?.kind ?? null,
    };
  },
});
```

- [ ] **Step 2: Commit**

```bash
cd /Users/mkstudio/Desktop/recouvrement_immo_npl && rtk git add convex/users.ts && rtk git commit -m "feat(s2b): add users.me public query for playground identity display

Returns caller's { logtoUserId, email, name, role, organizationName,
organizationKind } or null if unauthenticated / unprovisioned. Used by
/convex-poc/dossiers to render the 'Connected as X, role Y' header.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 8: Refactor `convex/secib.ts` + add `dossiersDuSyndic`

**Files:**
- Modify: `convex/secib.ts` (~150 LOC swap + ~30 LOC ajout)

The big one. Pull all helpers, replace `requireRole`/`secibHeaders` inline copies, wrap each action with `withAuditLog`, route fetches through `secibFetch`, add `dossiersDuSyndic`.

- [ ] **Step 1: Remplacer entièrement le contenu de `convex/secib.ts`**

Use the Write tool. New content:

```typescript
"use node";

import { action } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { internal } from "./_generated/api";
import { withAuditLog, type AuditContext } from "./lib/audit";
import { secibFetch } from "./lib/secibFetch";
import {
  NPL_FULL_ACCESS_ROLES,
  SYNDIC_ROLES,
  ALL_ROLES,
  type UserRole,
} from "./lib/auth";
import { forbidden, noSecibPersonneId } from "./lib/errors";

const SECIB_BASE_URL =
  process.env.SECIB_GATEWAY_BASE_URL ?? "https://apisecib.nplavocat.com/api/v1";

// ─────────────────────────────────────────────────────────────────
// assertRole — callsite role check inside a withAuditLog callback.
// withAuditLog resolves identity to any provisioned user (ALL_ROLES);
// the action then narrows that to its specific allow-list via this helper.
// ─────────────────────────────────────────────────────────────────
function assertRole(audit: AuditContext, allowed: readonly UserRole[]): void {
  if (!allowed.includes(audit.role)) {
    throw forbidden(audit.role, allowed);
  }
}

// ─────────────────────────────────────────────────────────────────
// gatewayHealth — public health probe. No audit, no SECIB API key.
// Calls /admin/health which is unauthenticated on the gateway side.
// Safe to call from monitoring/uptime tools.
// ─────────────────────────────────────────────────────────────────
export const gatewayHealth = action({
  args: {},
  handler: async () => {
    const res = await fetch(`${SECIB_BASE_URL}/admin/health`);
    if (!res.ok) {
      throw new ConvexError({
        code: "secib.health_check_failed",
        message: `SECIB gateway health ${res.status}`,
        status: res.status,
      });
    }
    return await res.json();
  },
});

// ─────────────────────────────────────────────────────────────────
// cabinetInfo — NPL cabinet identity. Allowed for ALL provisioned roles
// (even a syndic needs to know which cabinet handles its cases).
// ─────────────────────────────────────────────────────────────────
export const cabinetInfo = action({
  args: {},
  handler: async (ctx) => {
    return await withAuditLog(
      ctx,
      { action: "secib.cabinet_info", targetType: "cabinet", targetId: "self" },
      async (audit) => {
        assertRole(audit, ALL_ROLES);
        return await secibFetch(ctx, audit, {
          endpoint: "/cabinet/info",
          targetType: "cabinet",
          targetId: "self",
        });
      },
    );
  },
});

// ─────────────────────────────────────────────────────────────────
// dossiersRechercher — GLOBAL list of cabinet dossiers.
// Restricted to NPL_FULL_ACCESS_ROLES (admin + assistant). Scoped roles
// (npl_avocat, syndic_*) MUST use their dedicated scoped actions.
// ─────────────────────────────────────────────────────────────────
export const dossiersRechercher = action({
  args: {
    page: v.optional(v.number()),
    pageSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await withAuditLog(
      ctx,
      {
        action: "secib.dossiers_rechercher",
        targetType: "dossiers_global",
        targetId: "all",
        metadata: { page: args.page, pageSize: args.pageSize },
      },
      async (audit) => {
        assertRole(audit, NPL_FULL_ACCESS_ROLES);
        return await secibFetch(ctx, audit, {
          endpoint: "/dossiers",
          targetType: "dossiers_global",
          targetId: "all",
          params: {
            ...(args.page !== undefined && { page: args.page }),
            ...(args.pageSize !== undefined && { pageSize: args.pageSize }),
          },
        });
      },
    );
  },
});

// ─────────────────────────────────────────────────────────────────
// dossiersDuSyndic — SCOPED list for syndic users.
// Uses gw_personnes_dossiers(secibSyndicPersonneId) so the filter happens
// at the SECIB gateway (1 RTT, no over-fetch). No args : scope is deduced
// from the caller's organization.
// ─────────────────────────────────────────────────────────────────
export const dossiersDuSyndic = action({
  args: {},
  handler: async (ctx) => {
    return await withAuditLog(
      ctx,
      { action: "secib.dossiers_du_syndic" },
      async (audit) => {
        assertRole(audit, SYNDIC_ROLES);
        const org = await ctx.runQuery(internal.organizations.getById, {
          id: audit.organizationId,
        });
        if (!org?.secibSyndicPersonneId) {
          throw noSecibPersonneId(org?.name ?? "<unknown>");
        }
        return await secibFetch(ctx, audit, {
          endpoint: `/personnes/${org.secibSyndicPersonneId}/dossiers`,
          targetType: "personne_dossiers",
          targetId: org.secibSyndicPersonneId,
        });
      },
    );
  },
});
```

- [ ] **Step 2: Vérifier que tous les imports résolvent**

Run:
```bash
cd /Users/mkstudio/Desktop/recouvrement_immo_npl && wc -l convex/secib.ts && grep "^import\|^export" convex/secib.ts
```

Expected: ~110 lignes (vs 152 avant — plus dense grâce aux helpers). 5 imports + 4 exports (gatewayHealth, cabinetInfo, dossiersRechercher, dossiersDuSyndic).

- [ ] **Step 3: Commit**

```bash
cd /Users/mkstudio/Desktop/recouvrement_immo_npl && rtk git add convex/secib.ts && rtk git commit -m "feat(s2b): refactor secib.ts + add dossiersDuSyndic action

- All 4 actions now use lib/audit.withAuditLog + lib/secibFetch.secibFetch
- requireRole replaced by withAuditLog (resolves identity once) +
  assertRole helper for action-specific allow-list
- ConvexError factories from lib/errors instead of throw new Error
- gatewayHealth stays public (no audit, no API key)
- NEW dossiersDuSyndic : scoped via gw_personnes_dossiers(secibSyndicPersonneId)
  — server-side filter at the gateway, 1 RTT, no over-fetch.

Drops 42 LOC vs S0 thanks to helper reuse.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 9: Update `convex/seed.ts` — ConvexError + `seedSyndicTestUser`

**Files:**
- Modify: `convex/seed.ts`

- [ ] **Step 1: Lire le contenu actuel pour identifier les `throw new Error`**

Run:
```bash
cd /Users/mkstudio/Desktop/recouvrement_immo_npl && grep -n "throw new Error" convex/seed.ts
```

Expected: 3 occurrences (in provisionNplUser + getNplOrgAndFirstUser × 2).

- [ ] **Step 2: Remplacer les 3 `throw new Error(...)` par `throw new ConvexError(...)`**

Use Edit tool 3 times :

**Edit 1** :
```
old: if (!org) throw new Error("Failed to insert NPL organization row");
new: if (!org) throw new ConvexError("seed.insert_failed: NPL organization row");
```

**Edit 2** :
```
old: if (!org) throw new Error("Run seed:provisionNplUser first — NPL org missing");
new: if (!org) throw new ConvexError("seed.prerequisite_missing: Run seed:provisionNplUser first — NPL org missing");
```

**Edit 3** :
```
old: if (!user) throw new Error("Run seed:provisionNplUser first — no user in NPL org");
new: if (!user) throw new ConvexError("seed.prerequisite_missing: Run seed:provisionNplUser first — no user in NPL org");
```

- [ ] **Step 3: Ajouter `import { ConvexError } from "convex/values"` en tête**

Use Edit tool :
```
old: import { v } from "convex/values";
new: import { v, ConvexError } from "convex/values";
```

- [ ] **Step 4: Ajouter la fixture `seedSyndicTestUser` à la fin du fichier**

Use Edit tool to append before the last newline. Insert this block after `insertSecibFetchLogFixture` :

```typescript

// ─────────────────────────────────────────────────────────────────
// S2b — Provision a test syndic user (requires real secibSyndicPersonneId).
//
// Usage:
//   pnpm convex:run seed:seedSyndicTestUser '{
//     "logtoUserId": "<logto user id>",
//     "email":       "<user email>",
//     "name":        "Syndic Test",
//     "secibSyndicPersonneId": "<real SECIB personne id of the syndic>",
//     "syndicOrgName": "Syndic Test ABC"
//   }'
// ─────────────────────────────────────────────────────────────────

export const seedSyndicTestUser = internalMutation({
  args: {
    logtoUserId: v.string(),
    email: v.string(),
    name: v.string(),
    secibSyndicPersonneId: v.string(),
    syndicOrgName: v.string(),
    logtoOrgId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const logtoOrgId =
      args.logtoOrgId ?? `test_syndic_${args.secibSyndicPersonneId}`;
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
      if (!org) {
        throw new ConvexError("seed.insert_failed: syndic test org");
      }
    }
    const existing = await ctx.db
      .query("users")
      .withIndex("by_logto_user", (q) =>
        q.eq("logtoUserId", args.logtoUserId),
      )
      .unique();
    if (existing) {
      return {
        status: "exists" as const,
        userId: existing._id,
        organizationId: org._id,
      };
    }
    const userId = await ctx.db.insert("users", {
      logtoUserId: args.logtoUserId,
      email: args.email,
      name: args.name,
      role: "syndic_admin",
      organizationId: org._id,
      createdAt: Date.now(),
    });
    return {
      status: "created" as const,
      userId,
      organizationId: org._id,
    };
  },
});
```

- [ ] **Step 5: Vérifier la taille**

Run:
```bash
cd /Users/mkstudio/Desktop/recouvrement_immo_npl && wc -l convex/seed.ts && grep -c "^export const" convex/seed.ts
```

Expected : ~360 LOC (vs 294 avant) et 12 exports (11 existants + seedSyndicTestUser).

- [ ] **Step 6: Commit**

```bash
cd /Users/mkstudio/Desktop/recouvrement_immo_npl && rtk git add convex/seed.ts && rtk git commit -m "feat(s2b): ConvexError in seed.ts + add seedSyndicTestUser fixture

- 3 throw new Error → throw new ConvexError with structured code
  ('seed.insert_failed', 'seed.prerequisite_missing')
- New seedSyndicTestUser: takes (logtoUserId, email, name,
  secibSyndicPersonneId, syndicOrgName, logtoOrgId?) and provisions a
  syndic_admin user in a syndic org. Caller MUST provide a real SECIB
  personne id for dossiersDuSyndic to actually return data.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 10: Deploy backend + smoke test

**Files:** Aucune modif.

⚠️ Nécessite `CONVEX_SELF_HOSTED_URL` + `CONVEX_SELF_HOSTED_ADMIN_KEY` set dans l'env shell. Récupère l'admin key par les memos infra (ou Coolify Terminal `./generate_admin_key.sh convex-self-hosted`).

- [ ] **Step 1: Deploy le schema (rien de changé mais on push le code des libs + nouvelles internal mutations)**

Run :
```bash
cd /Users/mkstudio/Desktop/recouvrement_immo_npl && pnpm convex:deploy 2>&1 | tail -25
```

Expected :
```
✔ No indexes are deleted by this push
...
✔ Deployed Convex functions to https://convex.immo.nplavocat.com
```

Aucun changement d'indexes attendu. Si erreur de types Convex, lire et corriger les imports/signatures dans les fichiers concernés.

- [ ] **Step 2: Vérifier non-régression S2 — provisionNplUser**

Run :
```bash
cd /Users/mkstudio/Desktop/recouvrement_immo_npl && pnpm convex:run seed:provisionNplUser '{"logtoUserId":"y603zurdjehk","email":"contact@karugency.com","name":"Test Admin NPL","role":"npl_admin"}'
```

Expected : `status: 'exists'` (l'user a déjà été créé en S2).

- [ ] **Step 3: Run la nouvelle fixture syndic**

⚠️ Tu dois fournir un `secibSyndicPersonneId` réel pour que dossiersDuSyndic remonte de vraies données. Si tu n'as pas encore un syndic réel, utilise n'importe quelle string (l'action retournera une erreur SECIB mais le fixture lui-même fonctionnera).

Run :
```bash
cd /Users/mkstudio/Desktop/recouvrement_immo_npl && pnpm convex:run seed:seedSyndicTestUser '{
  "logtoUserId": "<NEED A LOGTO USER ID — see Task 11 prerequisites>",
  "email": "syndic-test@example.com",
  "name": "Syndic Test S2b",
  "secibSyndicPersonneId": "<REAL_SECIB_PERSONNE_ID>",
  "syndicOrgName": "Syndic Test S2b"
}'
```

Expected : `{ status: "created", userId: "...", organizationId: "..." }`.

Note : ce step peut être déféré jusqu'à Task 11 quand tu auras créé un user Logto syndic.

- [ ] **Step 4: Vérifier le dashboard Convex**

Ouvre https://admin.immo.nplavocat.com avec ton admin key. Vérifie :
- Tables `auditLogs` et `secibFetchLog` toujours visibles (peuvent être vides pour l'instant)
- Tables `users` contient au moins l'user test S2 (y603zurdjehk)
- Tables `organizations` contient l'org NPL S2

---

## Task 11: Create `apps/frontend/src/app/convex-poc/dossiers/page.tsx`

**Files:**
- Create: `apps/frontend/src/app/convex-poc/dossiers/page.tsx`

Page client component. Utilise `useQuery(api.users.me)` + `useAction(api.secib.X)` pour chaque action. Affiche identité + 3 boutons + résultat JSON.

- [ ] **Step 1: Écrire `apps/frontend/src/app/convex-poc/dossiers/page.tsx`**

```tsx
"use client";

import { useAction, useQuery, Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { makeFunctionReference } from "convex/server";
import { useState } from "react";

// Type-erased references (we don't import _generated/api here to avoid
// coupling the frontend tsconfig to the convex codegen output).
const meQuery = makeFunctionReference<"query">("users:me");
const cabinetInfoAction = makeFunctionReference<"action">("secib:cabinetInfo");
const dossiersRechercherAction = makeFunctionReference<"action">("secib:dossiersRechercher");
const dossiersDuSyndicAction = makeFunctionReference<"action">("secib:dossiersDuSyndic");

type ActionResult = { label: string; data: unknown } | null;
type ActionError = { label: string; message: string; details?: unknown } | null;

function PlaygroundContent() {
  const me = useQuery(meQuery);
  const cabinetInfo = useAction(cabinetInfoAction);
  const dossiersRechercher = useAction(dossiersRechercherAction);
  const dossiersDuSyndic = useAction(dossiersDuSyndicAction);

  const [result, setResult] = useState<ActionResult>(null);
  const [error, setError] = useState<ActionError>(null);
  const [pending, setPending] = useState<string | null>(null);

  const run = async (label: string, fn: () => Promise<unknown>) => {
    setPending(label);
    setResult(null);
    setError(null);
    try {
      const data = await fn();
      setResult({ label, data });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      const details = (e as { data?: unknown })?.data;
      setError({ label, message, details });
    } finally {
      setPending(null);
    }
  };

  return (
    <main style={{ maxWidth: 900, margin: "2rem auto", padding: "0 1rem", fontFamily: "system-ui" }}>
      <h1 style={{ fontSize: 24, fontWeight: 600 }}>SECIB Actions Playground</h1>

      {/* Identity */}
      <section style={{ background: "#f5f5f5", padding: "1rem", borderRadius: 8, marginTop: 16 }}>
        {me === undefined ? (
          <p>Loading identity…</p>
        ) : me === null ? (
          <p>Authenticated but no Convex user row provisioned. Ask an admin to run seed:provisionNplUser.</p>
        ) : (
          <div style={{ fontSize: 14 }}>
            <div><strong>{me.name}</strong> ({me.email})</div>
            <div>Role: <code>{me.role}</code></div>
            <div>Org: {me.organizationName ?? "?"} (<code>{me.organizationKind ?? "?"}</code>)</div>
          </div>
        )}
        <div style={{ marginTop: 8 }}>
          <a href="/api/logto/sign-out" style={{ fontSize: 13, color: "#666" }}>Sign out</a>
        </div>
      </section>

      {/* Action buttons */}
      <section style={{ marginTop: 24, display: "flex", flexWrap: "wrap", gap: 8 }}>
        <button
          onClick={() => run("cabinetInfo", () => cabinetInfo({}))}
          disabled={pending !== null}
          style={btnStyle(pending === "cabinetInfo")}
        >
          {pending === "cabinetInfo" ? "Running…" : "cabinetInfo"}
        </button>
        <button
          onClick={() => run("dossiersRechercher", () => dossiersRechercher({}))}
          disabled={pending !== null}
          style={btnStyle(pending === "dossiersRechercher")}
        >
          {pending === "dossiersRechercher" ? "Running…" : "dossiersRechercher"}
        </button>
        <button
          onClick={() => run("dossiersDuSyndic", () => dossiersDuSyndic({}))}
          disabled={pending !== null}
          style={btnStyle(pending === "dossiersDuSyndic")}
        >
          {pending === "dossiersDuSyndic" ? "Running…" : "dossiersDuSyndic"}
        </button>
      </section>

      {/* Result */}
      {result && (
        <section style={{ marginTop: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600 }}>✓ {result.label}</h2>
          <pre style={preStyle(false)}>{JSON.stringify(result.data, null, 2)}</pre>
        </section>
      )}

      {/* Error */}
      {error && (
        <section style={{ marginTop: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: "#b91c1c" }}>✗ {error.label}</h2>
          <pre style={preStyle(true)}>{error.message}</pre>
          {error.details ? (
            <details style={{ marginTop: 8 }}>
              <summary style={{ fontSize: 13, cursor: "pointer" }}>ConvexError payload</summary>
              <pre style={preStyle(true)}>{JSON.stringify(error.details, null, 2)}</pre>
            </details>
          ) : null}
        </section>
      )}
    </main>
  );
}

function btnStyle(loading: boolean): React.CSSProperties {
  return {
    padding: "8px 16px",
    borderRadius: 6,
    border: "1px solid #d1d5db",
    background: loading ? "#e5e7eb" : "white",
    cursor: loading ? "default" : "pointer",
    fontSize: 14,
  };
}

function preStyle(error: boolean): React.CSSProperties {
  return {
    background: error ? "#fef2f2" : "#f9fafb",
    border: `1px solid ${error ? "#fecaca" : "#e5e7eb"}`,
    padding: 12,
    borderRadius: 6,
    fontSize: 12,
    overflow: "auto",
    maxHeight: 400,
  };
}

export default function DossiersPlaygroundPage() {
  return (
    <>
      <AuthLoading>
        <main style={{ maxWidth: 900, margin: "2rem auto", padding: "0 1rem" }}>
          <p>Loading auth…</p>
        </main>
      </AuthLoading>
      <Unauthenticated>
        <main style={{ maxWidth: 900, margin: "2rem auto", padding: "0 1rem" }}>
          <h1 style={{ fontSize: 24, fontWeight: 600 }}>SECIB Actions Playground</h1>
          <p style={{ marginTop: 16 }}>You must sign in to test the SECIB actions.</p>
          <a href="/api/logto/sign-in" style={{ display: "inline-block", marginTop: 16, padding: "8px 16px", background: "#1e40af", color: "white", borderRadius: 6, textDecoration: "none" }}>Sign in</a>
        </main>
      </Unauthenticated>
      <Authenticated>
        <PlaygroundContent />
      </Authenticated>
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/mkstudio/Desktop/recouvrement_immo_npl && rtk git add apps/frontend/src/app/convex-poc/dossiers/page.tsx && rtk git commit -m "feat(s2b): add /convex-poc/dossiers playground page

Client component with <Authenticated>/<Unauthenticated>/<AuthLoading>
wrappers. When signed in, shows the caller's identity (via users.me) and
3 buttons that invoke cabinetInfo / dossiersRechercher / dossiersDuSyndic.
Result rendered as JSON in a <pre>. Errors include the ConvexError
structured payload for debugging.

Uses makeFunctionReference instead of importing _generated/api to keep
the frontend tsconfig independent of the convex codegen output.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 12: Local validation walkthrough

**Files:** Aucune modif. Cette task décrit la procédure de test manuelle.

⚠️ Cette task est pour l'utilisateur (pas un agent). Pas de subagent dispatch.

- [ ] **Step 1: S'assurer que `apps/frontend/.env.local` existe**

Si pas encore créé :
```bash
cp /Users/mkstudio/Desktop/recouvrement_immo_npl/.env.example /Users/mkstudio/Desktop/recouvrement_immo_npl/apps/frontend/.env.local
```

Et remplir les valeurs (cf. memo `reference_infra_map.md` + spec S1) :
- `NEXT_PUBLIC_DIRECTUS_URL` = existing prod or `http://localhost:8055`
- `NEXT_PUBLIC_CONVEX_URL=https://convex.immo.nplavocat.com`
- `NEXT_PUBLIC_LOGTO_ENDPOINT=https://auth.nplavocat.com`
- `NEXT_PUBLIC_LOGTO_APP_ID=ky0iisybs0g3l7avvju4y`
- `LOGTO_APP_SECRET=<the Traditional Web App secret from Logto NPL console>`
- `NEXT_PUBLIC_LOGTO_RESOURCE=https://convex.immo.nplavocat.com`
- `NEXT_PUBLIC_APP_URL=http://localhost:3000`
- `LOGTO_COOKIE_SECRET=<openssl rand -hex 32>`

- [ ] **Step 2: Démarrer le frontend en local**

Run :
```bash
cd /Users/mkstudio/Desktop/recouvrement_immo_npl/apps/frontend && pnpm dev
```

Expected : `▲ Next.js ... ready on http://localhost:3000`.

- [ ] **Step 3: Naviguer sur la page playground**

Open browser : http://localhost:3000/convex-poc/dossiers

Expected : page "SECIB Actions Playground" avec lien "Sign in".

- [ ] **Step 4: Login via Logto**

Click "Sign in" → redirige vers https://auth.nplavocat.com → entre tes credentials (`contact@karugency.com` + le mdp temporaire `onovW2f1U3KulraYn0cy` si pas encore changé) → callback vers /convex-poc/dossiers.

Expected : header affiche "Test Admin NPL (Karugency) - contact@karugency.com - Role: npl_admin - Org: NPL — Cabinet Nancy Pierre-Louis (npl)".

- [ ] **Step 5: Tester `cabinetInfo`**

Click "cabinetInfo".

Expected : `✓ cabinetInfo` + JSON avec `{ name, version, locale, ... }` du cabinet NPL côté SECIB.

- [ ] **Step 6: Tester `dossiersRechercher`**

Click "dossiersRechercher".

Expected : `✓ dossiersRechercher` + JSON liste paginée des dossiers SECIB (vraies données du cabinet).

- [ ] **Step 7: Tester `dossiersDuSyndic` en npl_admin**

Click "dossiersDuSyndic".

Expected : `✗ dossiersDuSyndic` + `Role "npl_admin" is not authorized for this action. Allowed: syndic_admin, syndic_gestionnaire.` (ConvexError propre).

- [ ] **Step 8: Vérifier les audit logs dans le dashboard Convex**

Open https://admin.immo.nplavocat.com → table `auditLogs` → tu dois voir 6 rows depuis Step 5-7 :
- secib.cabinet_info.attempted
- secib.cabinet_info.succeeded
- secib.dossiers_rechercher.attempted
- secib.dossiers_rechercher.succeeded
- secib.dossiers_du_syndic.attempted
- secib.dossiers_du_syndic.failed (avec `metadata.error.message` qui contient "forbidden")

Et `secibFetchLog` doit avoir 2 rows (1 pour cabinetInfo, 1 pour dossiersRechercher — dossiersDuSyndic a fail avant le fetch).

- [ ] **Step 9: (Optionnel) Tester dossiersDuSyndic en tant que syndic**

Provisionner un user Logto syndic (créer dans Logto NPL console, l'ajouter à un org syndic avec role `syndic_admin`). Puis run seedSyndicTestUser avec son logtoUserId et un secibSyndicPersonneId réel.

Sign out + sign in en tant que ce user → click `dossiersDuSyndic` → JSON dossiers filtrés sur ce syndic.

---

## Task 13: Push + open PR

**Files:** Aucune modif.

- [ ] **Step 1: Push la branche**

```bash
cd /Users/mkstudio/Desktop/recouvrement_immo_npl && git push -u origin feat/convex-s2b-actions-scoped
```

- [ ] **Step 2: Créer la PR**

```bash
cd /Users/mkstudio/Desktop/recouvrement_immo_npl && rtk gh pr create --base main --head feat/convex-s2b-actions-scoped --title "feat(s2b): actions scoped + withAuditLog + secibFetch + playground" --body "$(cat <<'EOF'
## Résumé

S2b complète la couche d'autorisation et d'audit du backend Convex. 4 helpers \`convex/lib/\` réutilisables + 1 nouvelle action scoped \`dossiersDuSyndic\` + retrofit des 3 actions S0 + ConvexError partout + page playground frontend pour validation visuelle.

**Spec** : [docs/superpowers/specs/2026-05-28-convex-s2b-actions-scoped-design.md](docs/superpowers/specs/2026-05-28-convex-s2b-actions-scoped-design.md)
**Plan** : [docs/superpowers/plans/2026-05-28-convex-s2b-actions-scoped-impl.md](docs/superpowers/plans/2026-05-28-convex-s2b-actions-scoped-impl.md)

## Décisions verrouillées (brainstorm 2026-05-28)

- **Q1** : Scope full (helpers + retrofit + ConvexError + secibFetchLog auto)
- **Q2** : \`withAuditLog\` = wrap explicite dans le handler (option A)
- **Q3** : \`dossiersOuJeSuisIntervenant\` deferré à S2d (SECIB n'a pas d'endpoint scoped intervenant)
- **Q4** : Playground frontend simple avec JSON brut

## Architecture

\`\`\`
convex/lib/errors.ts          ConvexError factories (notProvisioned, forbidden, secibError, ...)
convex/lib/auth.ts            requireRole + role unions (NPL_FULL_ACCESS_ROLES, SYNDIC_ROLES, ...)
convex/lib/audit.ts           withAuditLog(ctx, meta, fn) — wraps action with audit + identity
convex/lib/secibFetch.ts      secibFetch(ctx, audit, opts) — fetches SECIB + auto-populate fetchLog
convex/auditLogs.ts           append internal mutation (actions can't write to db directly)
convex/secibFetchLog.ts       append internal mutation
convex/organizations.ts       getById internal query (used by dossiersDuSyndic)
convex/users.ts               + me public query for the playground identity display
convex/secib.ts               refactor + dossiersDuSyndic
convex/seed.ts                ConvexError + seedSyndicTestUser fixture
apps/frontend/src/app/convex-poc/dossiers/page.tsx   playground page (~190 LOC)
\`\`\`

## Validation post-deploy

- [x] \`pnpm convex:deploy\` succeeds
- [x] Régression S2 : provisionNplUser, insertCaseFixture & co. retournent OK
- [x] Local dev : http://localhost:3000/convex-poc/dossiers, login Logto, 3 boutons exercés
- [x] \`auditLogs\` table peuplée (2 rows par action — attempted + succeeded/failed)
- [x] \`secibFetchLog\` table peuplée (1 row par fetch SECIB)
- [x] ConvexError messages visibles côté client malgré REDACT_LOGS_TO_CLIENT=true

## Hors scope (= PRs ultérieures)

- **S2c** : crons (referentials refresh, notes debounce, drafts cleanup, secibFetchLog 90j purge) + bucket presence check Coolify
- **S2d** : import dossiers SECIB des 2 syndics pilotes + \`dossiersOuJeSuisIntervenant\` (utilise cases.by_secib_intervenant)
- **S3** : portail Syndic réécrit sur Convex (premier vrai consommateur de \`dossiersDuSyndic\`)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)" 2>&1 | tail -5
```

Expected : `created #4 https://github.com/Karugency97/recouvrement_immo_npl/pull/4`.

- [ ] **Step 3: Relayer l'URL à l'utilisateur**

---

## Recovery scenarios

- **Convex deploy fails (type error)** : lire l'erreur, identifier le fichier, corriger les imports. Souvent dû à `convex/_generated` désynchronisé — relancer `pnpm convex:deploy` après le fix.
- **`makeFunctionReference` rejette le nom** : le format attendu est `"module:export"` (avec `:` entre module et export). Pour `users.me` → `"users:me"`. Pour `secib.cabinetInfo` → `"secib:cabinetInfo"`.
- **Playground "Loading auth…" qui ne finit pas** : c'est le `useAuth` hook du ConvexAuthProvider (S1) qui poll `/api/logto/me`. Vérifier dans la console réseau que la requête répond. Si 401, c'est que les env vars Logto ne sont pas posées.
- **`dossiersRechercher` retourne `secib.fetch_failed` 401** : SECIB_GATEWAY_API_KEY pas set côté Convex env. Run `pnpm convex env set SECIB_GATEWAY_API_KEY <key>` (déjà fait en S2 normalement).
- **`dossiersDuSyndic` retourne `noSecibPersonneId`** : l'org du user n'a pas `secibSyndicPersonneId` set. Refaire le seed avec un vrai ID.

---

## Notes pour le runner

- Aucun changement de schema — pas de migration.
- Le seed `provisionNplUser` reste l'entry point pour le test user NPL. `seedSyndicTestUser` est son équivalent côté syndic.
- Le playground est un Client Component (`"use client"`) pur — pas de Server Action, pas de fetch côté serveur Next.js. Tout passe par ConvexProviderWithAuth (déjà wired en S1).
- Si `convex/_generated/` est manquant en local, le frontend playground utilise `makeFunctionReference` pour éviter la dépendance. Le backend lib/auth.ts par contre DÉPEND de `_generated/api.d.ts` — il faut au moins 1 `pnpm convex:deploy` avant que tsc convex/ marche.
- ConvexError messages sont visibles côté client SANS toucher REDACT_LOGS_TO_CLIENT (qui reste à `true` en sécurité).
- Aucun secret nouveau introduit. SECIB API key déjà en env Convex, Logto secret déjà géré côté frontend.
