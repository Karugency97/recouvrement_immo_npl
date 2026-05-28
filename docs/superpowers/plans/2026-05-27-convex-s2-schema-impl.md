# Convex S2 Schema Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Étendre `convex/schema.ts` de 3 → 13 tables et ajouter 10 fixtures seed dans `convex/seed.ts` pour valider la chaîne deploy + insert.

**Architecture:** Schema purement déclaratif Convex. Pas d'actions, pas de cron, pas d'import dans cette PR — tout ça vient en S2b/c/d. Validation = `pnpm convex:deploy` succeeds + chaque seed fixture insère une row sans erreur. 11 nouvelles tables (1 vient du choix Q2 hybride : `secibFetchLog`), 2 augmentées (`organizations` + `users`), 1 enrichie (`auditLogs`).

**Tech Stack:** Convex 1.16.0 (self-hosted), TypeScript 5 strict, `pnpm convex:deploy` / `convex:run` via root scripts.

**Référence spec :** [docs/superpowers/specs/2026-05-27-convex-s2-schema-design.md](../specs/2026-05-27-convex-s2-schema-design.md)

---

## File Structure

| Fichier | Action | Responsabilité |
|---|---|---|
| `convex/schema.ts` | Modifier | Définition `defineSchema` + 13 tables + indexes. Source unique de vérité pour le data model |
| `convex/seed.ts` | Modifier | Conserve `provisionNplUser` (S1), ajoute 10 fixtures `insertXxxFixture` (1 par nouvelle table) |
| `docs/superpowers/specs/2026-05-27-convex-s2-schema-design.md` | Référence | Spec source — ne pas modifier en exécution |

Aucun autre fichier touché. Le frontend (`apps/frontend/`) n'utilise pas encore les nouveaux types — pas de modification côté React.

**Convention seeds** : chaque `insertXxxFixture` est une `internalMutation` qui :
- Cherche l'org NPL via `logtoOrgId = "9trwyqs3lm76"` (créée par `provisionNplUser`)
- Cherche un user dans cette org (le premier trouvé)
- Si org/user manque → throw `"Run seed:provisionNplUser first"`
- Pour les FKs vers `cases` : prend `caseId` optionnel ; si absent, cherche le premier case de l'org ou throw
- Insère 1 row avec des valeurs fixtures cohérentes
- Retourne `{ status: "inserted", id }`

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
feat/convex-s2-schema
```
(Aucun fichier modifié. Si tu vois des modifications, stash-les avant de commencer.)

- [ ] **Step 2: Confirmer que la spec est bien sur la branche**

Run:
```bash
ls docs/superpowers/specs/2026-05-27-convex-s2-schema-design.md
```

Expected: le fichier existe (committé au premier commit de la branche).

- [ ] **Step 3: Confirmer l'état actuel du schema**

Run:
```bash
cat convex/schema.ts
```

Expected: 3 tables (`organizations`, `users`, `auditLogs`), ~46 lignes. C'est l'état S0 inchangé.

- [ ] **Step 4: Confirmer l'absence de `convex/seed.ts`**

Run:
```bash
ls convex/seed.ts 2>/dev/null || echo "ABSENT — sera créé en Task 7"
```

Expected: `ABSENT — sera créé en Task 7`.

Pourquoi : `seed.ts` n'a été ajouté qu'en S1 (PR #2, non encore mergée). La branche S2 part de main, donc le fichier n'existe pas ici. Si S1 merge avant S2, il y aura un conflit trivial à résoudre au merge (garder la version S2 qui inclut tout). Voir Task 7.

---

## Task 2: Core augmented (organizations + users)

**Files:**
- Modify: `convex/schema.ts:5-31`

Augmente `organizations` (ajoute 1 index) et `users` (ajoute 1 champ + 1 index).

- [ ] **Step 1: Remplacer le contenu d'`convex/schema.ts`**

Le fichier complet en fin de Task 2 :

```typescript
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  organizations: defineTable({
    logtoOrgId: v.string(),
    kind: v.union(v.literal("npl"), v.literal("syndic")),
    name: v.string(),
    // syndic uniquement — référence personne morale dans SECIB pour mapping import (S2d)
    secibSyndicPersonneId: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_logto_org", ["logtoOrgId"])
    .index("by_secib_personne", ["secibSyndicPersonneId"])
    .index("by_kind", ["kind"]),

  users: defineTable({
    logtoUserId: v.string(),
    email: v.string(),
    name: v.string(),
    role: v.union(
      v.literal("npl_admin"),
      v.literal("npl_assistant"),
      v.literal("npl_avocat"),
      v.literal("syndic_admin"),
      v.literal("syndic_gestionnaire"),
    ),
    organizationId: v.id("organizations"),
    // npl_avocat seulement — référence intervenant SECIB pour scope dossiersOuJeSuisIntervenant (S2b)
    secibIntervenantId: v.optional(v.string()),
    createdAt: v.number(),
    lastSeenAt: v.optional(v.number()),
  })
    .index("by_logto_user", ["logtoUserId"])
    .index("by_organization", ["organizationId"])
    .index("by_secib_intervenant", ["secibIntervenantId"]),

  auditLogs: defineTable({
    actorLogtoUserId: v.string(),
    actorRole: v.string(),
    action: v.string(),
    targetType: v.optional(v.string()),
    targetId: v.optional(v.string()),
    metadata: v.optional(v.any()),
    ip: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_actor", ["actorLogtoUserId"])
    .index("by_target", ["targetType", "targetId"])
    .index("by_created", ["createdAt"]),
});
```

Use Edit tool with `replace_all: false` matching the existing file content. Avoid full rewrite if possible — use a single Edit that replaces the `users:` block + the `organizations:` block.

- [ ] **Step 2: Vérifier la diff**

Run:
```bash
cd /Users/mkstudio/Desktop/recouvrement_immo_npl && git diff convex/schema.ts
```

Expected diff: 1 new index on organizations (`by_secib_personne`), 1 new field on users (`secibIntervenantId`), 1 new index on users (`by_secib_intervenant`).

- [ ] **Step 3: Commit**

```bash
cd /Users/mkstudio/Desktop/recouvrement_immo_npl && git add convex/schema.ts && git commit -m "feat(s2): augment organizations + users for SECIB scoping

- organizations: add by_secib_personne index (S2d import mapping)
- users: add secibIntervenantId field + by_secib_intervenant index
  (needed by S2b dossiersOuJeSuisIntervenant action for npl_avocat scope)

Refs: docs/superpowers/specs/2026-05-27-convex-s2-schema-design.md §Core

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 3: Workflow tables (cases + caseDrafts)

**Files:**
- Modify: `convex/schema.ts` — append two new tables after the `users` table definition

- [ ] **Step 1: Ajouter `cases` au schema**

Insérer dans `convex/schema.ts` entre la fin de la définition `users` (qui se termine par `.index("by_secib_intervenant", ["secibIntervenantId"]),`) et le début de `auditLogs:`. Add this block:

```typescript
  cases: defineTable({
    organizationId: v.id("organizations"),
    authorUserId: v.id("users"),

    // State machine — 9 statuts PLAN_V1 §3
    status: v.union(
      v.literal("CREE"),
      v.literal("EN_ATTENTE_PIECES"),
      v.literal("PRET"),
      v.literal("MISE_EN_DEMEURE_ENVOYEE"),
      v.literal("INJONCTION_DE_PAYER"),
      v.literal("ASSIGNATION_AU_FOND"),
      v.literal("JUGEMENT_OBTENU"),
      v.literal("CLOTURE"),
      v.literal("SUSPENDU"),
    ),
    previousStatus: v.optional(v.string()),
    statusChangedAt: v.number(),
    statusChangedByUserId: v.id("users"),

    casSpecial: v.array(
      v.union(
        v.literal("INDIVISION"),
        v.literal("DECEDE"),
        v.literal("REDRESSEMENT"),
        v.literal("LOT_LOUE"),
        v.literal("MULTI_LOTS"),
      ),
    ),

    // Calculs financiers (cents = entiers)
    principalCents: v.number(),
    principalDateExigibilite: v.number(),
    article700Cents: v.optional(v.number()),
    interetsLegauxFromYearMonth: v.optional(v.number()),

    // Snapshot SECIB inline (Q2 choix C — partie "hot")
    secibDossierId: v.optional(v.string()),
    secibLibelle: v.optional(v.string()),
    secibCodeMatiere: v.optional(v.string()),
    secibDateOuverture: v.optional(v.number()),
    secibIntervenantId: v.optional(v.string()),
    secibSnapshotAt: v.optional(v.number()),

    // Pièces inline (5-10 items max par dossier)
    pieces: v.array(
      v.object({
        type: v.string(),
        requirement: v.union(
          v.literal("obligatoire"),
          v.literal("recommandee"),
          v.literal("utile"),
        ),
        status: v.union(
          v.literal("REQUESTED"),
          v.literal("RECEIVED"),
          v.literal("REJECTED"),
        ),
        secibDocId: v.optional(v.string()),
        requestedAt: v.number(),
        receivedAt: v.optional(v.number()),
      }),
    ),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["organizationId"])
    .index("by_org_status", ["organizationId", "status"])
    .index("by_status", ["status"])
    .index("by_secib_dossier", ["secibDossierId"])
    .index("by_secib_intervenant", ["secibIntervenantId"]),

```

- [ ] **Step 2: Ajouter `caseDrafts` juste après `cases`**

```typescript
  caseDrafts: defineTable({
    organizationId: v.id("organizations"),
    authorUserId: v.id("users"),
    casSpecial: v.array(
      v.union(
        v.literal("INDIVISION"),
        v.literal("DECEDE"),
        v.literal("REDRESSEMENT"),
        v.literal("LOT_LOUE"),
        v.literal("MULTI_LOTS"),
      ),
    ),
    debiteurNom: v.optional(v.string()),
    principalCents: v.optional(v.number()),
    currentStep: v.string(),
    wizardData: v.any(),
    updatedAt: v.number(),
    expiresAt: v.number(),
  })
    .index("by_author", ["authorUserId"])
    .index("by_org", ["organizationId"])
    .index("by_expires", ["expiresAt"]),

```

- [ ] **Step 3: Vérifier la diff**

Run:
```bash
cd /Users/mkstudio/Desktop/recouvrement_immo_npl && git diff convex/schema.ts | head -100
```

Expected: 2 new tables added, ~80 lignes ajoutées.

- [ ] **Step 4: Commit**

```bash
cd /Users/mkstudio/Desktop/recouvrement_immo_npl && git add convex/schema.ts && git commit -m "feat(s2): add cases + caseDrafts (workflow)

- cases: 9-state machine, casSpecial array, financial cents,
  inline SECIB snapshot (Q2 hybrid C), inline pieces array.
  5 indexes (by_org, by_org_status, by_status, by_secib_dossier,
  by_secib_intervenant).
- caseDrafts: hybrid Q3 — typed hot fields (debiteurNom, principalCents,
  casSpecial, currentStep) + opaque wizardData blob. Auto-expires after 30j.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 4: Collaboration tables (messages + notes)

**Files:**
- Modify: `convex/schema.ts` — append after `caseDrafts`

- [ ] **Step 1: Ajouter `messages` au schema (après `caseDrafts`)**

```typescript
  messages: defineTable({
    caseId: v.id("cases"),
    senderUserId: v.id("users"),
    senderRole: v.union(v.literal("syndic"), v.literal("avocat")),
    body: v.string(),
    attachmentSecibDocId: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_case_created", ["caseId", "createdAt"]),

```

- [ ] **Step 2: Ajouter `notes` juste après**

```typescript
  notes: defineTable({
    caseId: v.id("cases"),
    authorUserId: v.id("users"),
    body: v.string(),
    lastEditedAt: v.number(),
    pendingPush: v.boolean(),
    lastPushedToSecibAt: v.optional(v.number()),
    secibDocId: v.optional(v.string()),
  })
    .index("by_case", ["caseId"])
    .index("by_pending_push", ["pendingPush", "lastEditedAt"]),

```

- [ ] **Step 3: Commit**

```bash
cd /Users/mkstudio/Desktop/recouvrement_immo_npl && git add convex/schema.ts && git commit -m "feat(s2): add messages + notes (collab)

- messages: linear thread per case, syndic <-> avocat, by_case_created index
- notes: NPL internal notes with debounce push state to SECIB GED
  (5 min debounce cron will pickup via by_pending_push index in S2c)

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 5: Admin operations tables (timeEntries + notifications + notificationPreferences + delayAlerts)

**Files:**
- Modify: `convex/schema.ts` — append after `notes`

- [ ] **Step 1: Ajouter `timeEntries`**

```typescript
  timeEntries: defineTable({
    caseId: v.id("cases"),
    userId: v.id("users"),
    description: v.string(),
    durationMinutes: v.number(),
    ratePerHourCents: v.optional(v.number()),
    startedAt: v.number(),
    pendingPush: v.boolean(),
    pushedToSecibAt: v.optional(v.number()),
    secibFactureId: v.optional(v.string()),
  })
    .index("by_case", ["caseId"])
    .index("by_user_started", ["userId", "startedAt"])
    .index("by_pending_push", ["pendingPush"]),

```

- [ ] **Step 2: Ajouter `notifications`**

```typescript
  notifications: defineTable({
    recipientUserId: v.id("users"),
    type: v.union(
      v.literal("NEW_MESSAGE"),
      v.literal("STATUS_CHANGE"),
      v.literal("DELAY_ALERT"),
      v.literal("DOCUMENT_ADDED"),
      v.literal("PIECE_REQUESTED"),
      v.literal("PIECE_RECEIVED"),
    ),
    caseId: v.optional(v.id("cases")),
    body: v.string(),
    link: v.string(),
    readAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_recipient_created", ["recipientUserId", "createdAt"])
    .index("by_recipient_unread", ["recipientUserId", "readAt"]),

```

- [ ] **Step 3: Ajouter `notificationPreferences`**

```typescript
  notificationPreferences: defineTable({
    userId: v.id("users"),
    channel: v.union(
      v.literal("EMAIL"),
      v.literal("PUSH"),
      v.literal("IN_APP"),
    ),
    notificationType: v.string(),
    enabled: v.boolean(),
  }).index("by_user", ["userId"]),

```

- [ ] **Step 4: Ajouter `delayAlerts`**

```typescript
  delayAlerts: defineTable({
    caseId: v.id("cases"),
    delayType: v.union(
      v.literal("PRESCRIPTION_QUINQUENNALE"),
      v.literal("SIGNIFICATION_ASSIGNATION"),
      v.literal("OPPOSITION_INJONCTION"),
      v.literal("PEREMPTION_INSTANCE"),
      v.literal("EXECUTION_JUGEMENT"),
    ),
    deadlineAt: v.number(),
    level: v.union(
      v.literal("J180"),
      v.literal("J90"),
      v.literal("J30"),
      v.literal("J7"),
      v.literal("EXPIRED"),
    ),
    computedAt: v.number(),
    acknowledged: v.boolean(),
  })
    .index("by_case", ["caseId"])
    .index("by_level_deadline", ["level", "deadlineAt"]),

```

- [ ] **Step 5: Commit**

```bash
cd /Users/mkstudio/Desktop/recouvrement_immo_npl && git add convex/schema.ts && git commit -m "feat(s2): add timeEntries + notifications + notificationPreferences + delayAlerts

- timeEntries: per-user time tracking with night-batch push to gw_factures_creer
- notifications: per-recipient drawer (30j) + email/push/in-app
- notificationPreferences: per-user channel x type toggle
- delayAlerts: 5 legal delays x 4 levels (J180/J90/J30/J7/EXPIRED),
  computed by nightly cron (S2c)

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 6: Cache & audit tables (cachedReferentials + secibFetchLog + auditLogs augmented)

**Files:**
- Modify: `convex/schema.ts` — append `cachedReferentials` + `secibFetchLog` after `delayAlerts`, then augment the existing `auditLogs` definition

- [ ] **Step 1: Ajouter `cachedReferentials` après `delayAlerts`**

```typescript
  cachedReferentials: defineTable({
    kind: v.union(
      v.literal("CODES_ACTIVITES"),
      v.literal("CODES_FACTURATION"),
      v.literal("MATIERES_CONTENTIEUX"),
      v.literal("INTERVENANTS"),
      v.literal("ETAPES_PARAPHEUR"),
    ),
    payload: v.any(),
    fetchedAt: v.number(),
    ttlAt: v.number(),
  }).index("by_kind", ["kind"]),

```

- [ ] **Step 2: Ajouter `secibFetchLog` juste après**

```typescript
  secibFetchLog: defineTable({
    endpoint: v.string(),
    targetType: v.string(),
    targetId: v.string(),
    requestParams: v.optional(v.any()),
    responsePayload: v.any(),
    status: v.number(),
    fetchedAt: v.number(),
    fetchedByUserId: v.id("users"),
  })
    .index("by_target", ["targetType", "targetId", "fetchedAt"])
    .index("by_endpoint_time", ["endpoint", "fetchedAt"])
    .index("by_user_time", ["fetchedByUserId", "fetchedAt"]),

```

- [ ] **Step 3: Augmenter `auditLogs` — ajouter 2 champs + 2 indexes**

Remplacer le bloc `auditLogs: defineTable({ ... }).index(...).index(...).index(...)` par :

```typescript
  auditLogs: defineTable({
    // S0 existant
    actorLogtoUserId: v.string(),
    actorRole: v.string(),
    action: v.string(),
    targetType: v.optional(v.string()),
    targetId: v.optional(v.string()),
    metadata: v.optional(v.any()),
    ip: v.optional(v.string()),
    createdAt: v.number(),
    // S2 enrichi
    actorUserId: v.optional(v.id("users")),
    actorOrganizationId: v.optional(v.id("organizations")),
  })
    .index("by_actor", ["actorLogtoUserId"])
    .index("by_target", ["targetType", "targetId"])
    .index("by_created", ["createdAt"])
    .index("by_org_created", ["actorOrganizationId", "createdAt"])
    .index("by_action_created", ["action", "createdAt"]),
```

- [ ] **Step 4: Vérifier que le fichier compile (lecture sanity check)**

Run:
```bash
cd /Users/mkstudio/Desktop/recouvrement_immo_npl && wc -l convex/schema.ts
```

Expected: ~280-300 lignes (au lieu des 46 initiales). Le fichier doit se terminer par `});` qui ferme le `defineSchema({`.

- [ ] **Step 5: Commit**

```bash
cd /Users/mkstudio/Desktop/recouvrement_immo_npl && git add convex/schema.ts && git commit -m "feat(s2): add cachedReferentials + secibFetchLog + augment auditLogs

- cachedReferentials: 5 SECIB referential kinds, 24h TTL (S2c cron refresh)
- secibFetchLog: Q2 hybrid C — full SECIB payload + audit replay,
  indexed by_target/by_endpoint_time/by_user_time. 90j retention (S2c)
- auditLogs: + actorUserId (FK) + actorOrganizationId (FK) +
  by_org_created/by_action_created indexes for per-syndic + per-type
  audit reporting

Schema is now complete — 13 tables, 33 indexes, ~500 LOC.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 7: Create `convex/seed.ts` with provisionNplUser + 10 fixtures

**Files:**
- Create: `convex/seed.ts`

Le fichier n'existe pas sur la branche `feat/convex-s2-schema` (il vit sur `feat/convex-s1-frontend-wiring`, PR #2 non mergée). On le CRÉE ici avec :
- `provisionNplUser` (identique à la version S1 — sera trivialement résolu au merge si S1 merge avant)
- 10 fixtures `insertXxxFixture` (1 par nouvelle table)

Convention : chaque fixture cherche l'org NPL + un user, insère 1 row valide, retourne l'id. Si org/user manque → throw "Run seed:provisionNplUser first".

Les fixtures dépendantes de `caseId` (messages, notes, timeEntries, delayAlerts) délèguent à un helper `getOrCreateFixtureCase` qui crée un case si nécessaire.

- [ ] **Step 1: Créer `convex/seed.ts`**

Le contenu complet (utilise `MutationCtx` typé proprement depuis `_generated/server`) :

```typescript
import { internalMutation, type MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

// ─────────────────────────────────────────────────────────────────
// Constants from S0 infra (cf. MIGRATION_DIRECTUS_TO_CONVEX.md)
// ─────────────────────────────────────────────────────────────────
const NPL_ORG_LOGTO_ID = "9trwyqs3lm76";
const NPL_ORG_NAME = "NPL — Cabinet Nancy Pierre-Louis";

// ─────────────────────────────────────────────────────────────────
// S1 — provisionNplUser (also in PR #2 ; trivial merge if S1 lands first)
// ─────────────────────────────────────────────────────────────────

export const provisionNplUser = internalMutation({
  args: {
    logtoUserId: v.string(),
    email: v.string(),
    name: v.string(),
    role: v.union(
      v.literal("npl_admin"),
      v.literal("npl_assistant"),
      v.literal("npl_avocat"),
    ),
  },
  handler: async (ctx, args) => {
    let org = await ctx.db
      .query("organizations")
      .withIndex("by_logto_org", (q) => q.eq("logtoOrgId", NPL_ORG_LOGTO_ID))
      .unique();
    if (!org) {
      const orgId = await ctx.db.insert("organizations", {
        logtoOrgId: NPL_ORG_LOGTO_ID,
        kind: "npl",
        name: NPL_ORG_NAME,
        createdAt: Date.now(),
      });
      org = await ctx.db.get(orgId);
      if (!org) throw new Error("Failed to insert NPL organization row");
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
        role: existing.role,
      };
    }
    const userId = await ctx.db.insert("users", {
      logtoUserId: args.logtoUserId,
      email: args.email,
      name: args.name,
      role: args.role,
      organizationId: org._id,
      createdAt: Date.now(),
    });
    return {
      status: "created" as const,
      userId,
      organizationId: org._id,
      role: args.role,
    };
  },
});

// ─────────────────────────────────────────────────────────────────
// S2 — Fixture helpers (proper MutationCtx typing)
// ─────────────────────────────────────────────────────────────────

async function getNplOrgAndFirstUser(
  ctx: MutationCtx,
): Promise<{ orgId: Id<"organizations">; userId: Id<"users"> }> {
  const org = await ctx.db
    .query("organizations")
    .withIndex("by_logto_org", (q) => q.eq("logtoOrgId", NPL_ORG_LOGTO_ID))
    .unique();
  if (!org) throw new Error("Run seed:provisionNplUser first — NPL org missing");
  const user = await ctx.db
    .query("users")
    .withIndex("by_organization", (q) => q.eq("organizationId", org._id))
    .first();
  if (!user) throw new Error("Run seed:provisionNplUser first — no user in NPL org");
  return { orgId: org._id, userId: user._id };
}

async function getOrCreateFixtureCase(ctx: MutationCtx): Promise<Id<"cases">> {
  const { orgId, userId } = await getNplOrgAndFirstUser(ctx);
  const existing = await ctx.db
    .query("cases")
    .withIndex("by_org", (q) => q.eq("organizationId", orgId))
    .first();
  if (existing) return existing._id;
  const now = Date.now();
  return await ctx.db.insert("cases", {
    organizationId: orgId,
    authorUserId: userId,
    status: "CREE",
    statusChangedAt: now,
    statusChangedByUserId: userId,
    casSpecial: [],
    principalCents: 1000_00,
    principalDateExigibilite: now,
    pieces: [],
    createdAt: now,
    updatedAt: now,
  });
}

// ─────────────────────────────────────────────────────────────────
// S2 — Insert fixtures (1 par nouvelle table)
// ─────────────────────────────────────────────────────────────────

export const insertCaseFixture = internalMutation({
  args: {},
  handler: async (ctx) => {
    const { orgId, userId } = await getNplOrgAndFirstUser(ctx);
    const now = Date.now();
    const id = await ctx.db.insert("cases", {
      organizationId: orgId,
      authorUserId: userId,
      status: "CREE",
      statusChangedAt: now,
      statusChangedByUserId: userId,
      casSpecial: [],
      principalCents: 1500_00,
      principalDateExigibilite: now - 90 * 24 * 60 * 60 * 1000,
      pieces: [
        {
          type: "DECOMPTE_CHARGES",
          requirement: "obligatoire",
          status: "REQUESTED",
          requestedAt: now,
        },
      ],
      createdAt: now,
      updatedAt: now,
    });
    return { status: "inserted" as const, id };
  },
});

export const insertCaseDraftFixture = internalMutation({
  args: {},
  handler: async (ctx) => {
    const { orgId, userId } = await getNplOrgAndFirstUser(ctx);
    const now = Date.now();
    const id = await ctx.db.insert("caseDrafts", {
      organizationId: orgId,
      authorUserId: userId,
      casSpecial: [],
      debiteurNom: "FIXTURE — Mme Test",
      principalCents: 2500_00,
      currentStep: "DEBITEUR",
      wizardData: { adresseLine1: "12 rue de la fixture, 75001 Paris" },
      updatedAt: now,
      expiresAt: now + 30 * 24 * 60 * 60 * 1000,
    });
    return { status: "inserted" as const, id };
  },
});

export const insertMessageFixture = internalMutation({
  args: {},
  handler: async (ctx) => {
    const { userId } = await getNplOrgAndFirstUser(ctx);
    const caseId = await getOrCreateFixtureCase(ctx);
    const id = await ctx.db.insert("messages", {
      caseId,
      senderUserId: userId,
      senderRole: "avocat",
      body: "FIXTURE — Message test S2",
      createdAt: Date.now(),
    });
    return { status: "inserted" as const, id };
  },
});

export const insertNoteFixture = internalMutation({
  args: {},
  handler: async (ctx) => {
    const { userId } = await getNplOrgAndFirstUser(ctx);
    const caseId = await getOrCreateFixtureCase(ctx);
    const now = Date.now();
    const id = await ctx.db.insert("notes", {
      caseId,
      authorUserId: userId,
      body: "FIXTURE — Note interne test S2",
      lastEditedAt: now,
      pendingPush: true,
    });
    return { status: "inserted" as const, id };
  },
});

export const insertTimeEntryFixture = internalMutation({
  args: {},
  handler: async (ctx) => {
    const { userId } = await getNplOrgAndFirstUser(ctx);
    const caseId = await getOrCreateFixtureCase(ctx);
    const id = await ctx.db.insert("timeEntries", {
      caseId,
      userId,
      description: "FIXTURE — Étude du dossier (test S2)",
      durationMinutes: 45,
      startedAt: Date.now(),
      pendingPush: true,
    });
    return { status: "inserted" as const, id };
  },
});

export const insertNotificationFixture = internalMutation({
  args: {},
  handler: async (ctx) => {
    const { userId } = await getNplOrgAndFirstUser(ctx);
    const id = await ctx.db.insert("notifications", {
      recipientUserId: userId,
      type: "NEW_MESSAGE",
      body: "FIXTURE — Vous avez un nouveau message (test S2)",
      link: "/dossiers/fixture",
      createdAt: Date.now(),
    });
    return { status: "inserted" as const, id };
  },
});

export const insertNotificationPreferenceFixture = internalMutation({
  args: {},
  handler: async (ctx) => {
    const { userId } = await getNplOrgAndFirstUser(ctx);
    const id = await ctx.db.insert("notificationPreferences", {
      userId,
      channel: "EMAIL",
      notificationType: "NEW_MESSAGE",
      enabled: true,
    });
    return { status: "inserted" as const, id };
  },
});

export const insertDelayAlertFixture = internalMutation({
  args: {},
  handler: async (ctx) => {
    const caseId = await getOrCreateFixtureCase(ctx);
    const now = Date.now();
    const id = await ctx.db.insert("delayAlerts", {
      caseId,
      delayType: "PRESCRIPTION_QUINQUENNALE",
      deadlineAt: now + 180 * 24 * 60 * 60 * 1000,
      level: "J180",
      computedAt: now,
      acknowledged: false,
    });
    return { status: "inserted" as const, id };
  },
});

export const insertCachedReferentialsFixture = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const id = await ctx.db.insert("cachedReferentials", {
      kind: "MATIERES_CONTENTIEUX",
      payload: { fixture: true, codes: ["RECOUVREMENT_COPRO"] },
      fetchedAt: now,
      ttlAt: now + 24 * 60 * 60 * 1000,
    });
    return { status: "inserted" as const, id };
  },
});

export const insertSecibFetchLogFixture = internalMutation({
  args: {},
  handler: async (ctx) => {
    const { userId } = await getNplOrgAndFirstUser(ctx);
    const id = await ctx.db.insert("secibFetchLog", {
      endpoint: "gw_cabinet_info",
      targetType: "cabinet",
      targetId: "fixture",
      responsePayload: { fixture: true },
      status: 200,
      fetchedAt: Date.now(),
      fetchedByUserId: userId,
    });
    return { status: "inserted" as const, id };
  },
});
```

Use the Write tool to create `convex/seed.ts`. ⚠️ Si le fichier existe déjà (rebase post-S1-merge), fusionner manuellement plutôt qu'écraser.

- [ ] **Step 2: Vérifier que le fichier a la bonne taille**

Run:
```bash
cd /Users/mkstudio/Desktop/recouvrement_immo_npl && wc -l convex/seed.ts
```

Expected: ~280-320 lignes (au lieu des 84 initiales).

- [ ] **Step 3: Commit**

```bash
cd /Users/mkstudio/Desktop/recouvrement_immo_npl && git add convex/seed.ts && git commit -m "feat(s2): add 10 fixture mutations (1 per new table)

Convention: each insertXxxFixture is an internalMutation that
- looks up the NPL org + first user (errors if seed:provisionNplUser
  wasn't run first)
- inserts a 1-row fixture with valid required fields
- for case-dependent tables, uses getOrCreateFixtureCase helper
- returns { status: 'inserted', id }

Validates per spec test plan: 'pour chaque nouvelle table, 1 mutation
seed qui valide insert + indexes'.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 8: Deploy + smoke test + push

**Files:** Aucune modif — c'est l'étape de validation.

⚠️ Cette task NÉCESSITE que `CONVEX_SELF_HOSTED_URL` et `CONVEX_SELF_HOSTED_ADMIN_KEY` soient set dans l'env du shell. Si tu ne les as pas, récupère l'admin key depuis https://admin.immo.nplavocat.com puis :

```bash
export CONVEX_SELF_HOSTED_URL=https://convex.immo.nplavocat.com
export CONVEX_SELF_HOSTED_ADMIN_KEY=<la cle>
```

- [ ] **Step 1: Deploy le schema**

Run depuis la racine du repo :
```bash
cd /Users/mkstudio/Desktop/recouvrement_immo_npl && pnpm convex:deploy 2>&1 | tail -30
```

Expected: lignes finales contenant `Deployed` ou `Schema updated`. Si erreur de type Convex, lire et corriger dans `convex/schema.ts` avant de continuer.

Cas d'échec connus :
- "Required field X missing" → fixture incomplet, ajuste la fixture ou marque le champ `v.optional()`
- "Index Y conflicts" → 2 indexes avec mêmes colonnes, renomme
- "Cannot remove field Z" → tentative de retirer un champ qui contient encore des rows ; en l'occurrence pas de risque ici (schema purement additif)

- [ ] **Step 2: Vérifier que `_generated/` est créé**

Run:
```bash
cd /Users/mkstudio/Desktop/recouvrement_immo_npl && ls convex/_generated/
```

Expected: `api.d.ts`, `api.js`, `dataModel.d.ts`, `server.d.ts`, `server.js`. Si absent, le deploy n'a pas réussi — repasser à l'étape 1.

- [ ] **Step 3: Provisionner le test user via provisionNplUser**

Run:
```bash
cd /Users/mkstudio/Desktop/recouvrement_immo_npl && pnpm convex:run seed:provisionNplUser --json '{"logtoUserId":"y603zurdjehk","email":"contact@karugency.com","name":"Test Admin NPL","role":"npl_admin"}'
```

Expected: JSON avec `status: "created"` (premier appel sur cette DB, le user Logto `y603zurdjehk` est créé dans Convex `users` avec FK vers l'org NPL automatiquement créée). Si tu vois `status: "exists"`, c'est que provisionNplUser a déjà été lancé sur ce déploiement Convex (pas un problème — les fixtures suivantes vont fonctionner pareil).

- [ ] **Step 4: Lancer toutes les fixtures S2**

Run chacune et vérifier qu'elles retournent `{ status: "inserted", id: "..." }` :

```bash
cd /Users/mkstudio/Desktop/recouvrement_immo_npl
pnpm convex:run seed:insertCaseFixture
pnpm convex:run seed:insertCaseDraftFixture
pnpm convex:run seed:insertMessageFixture
pnpm convex:run seed:insertNoteFixture
pnpm convex:run seed:insertTimeEntryFixture
pnpm convex:run seed:insertNotificationFixture
pnpm convex:run seed:insertNotificationPreferenceFixture
pnpm convex:run seed:insertDelayAlertFixture
pnpm convex:run seed:insertCachedReferentialsFixture
pnpm convex:run seed:insertSecibFetchLogFixture
```

Si une fixture échoue → noter laquelle et l'erreur ; corriger soit la fixture (champs manquants), soit le schema (type incorrect), redeploy.

- [ ] **Step 5: Vérifier le dashboard Convex visualise les 13 tables**

Ouvrir https://admin.immo.nplavocat.com dans le navigateur. Section "Data" doit lister 13 tables avec au moins 1 row dans chacune des nouvelles.

- [ ] **Step 6: Vérifier non-régression frontend tsc**

Run depuis `apps/frontend/` (avec stubs env si besoin) :
```bash
cd /Users/mkstudio/Desktop/recouvrement_immo_npl/apps/frontend && NEXT_PUBLIC_CONVEX_URL=https://convex.immo.nplavocat.com NEXT_PUBLIC_LOGTO_ENDPOINT=https://auth.nplavocat.com NEXT_PUBLIC_LOGTO_APP_ID=stub NEXT_PUBLIC_LOGTO_RESOURCE=https://convex.immo.nplavocat.com NEXT_PUBLIC_APP_URL=http://localhost:3000 NEXT_PUBLIC_DIRECTUS_URL=http://localhost:8055 LOGTO_APP_SECRET=stub LOGTO_COOKIE_SECRET=0000000000000000000000000000000000000000000000000000000000000000 pnpm tsc --noEmit
```

Expected: pas d'output (clean). Si erreurs liées au schema → check qu'aucun import de `convex/_generated` ne pointe sur un type renommé.

- [ ] **Step 7: Push la branche**

```bash
cd /Users/mkstudio/Desktop/recouvrement_immo_npl && git push -u origin feat/convex-s2-schema
```

Expected: push successful, branch tracking set.

---

## Task 9: Open PR

**Files:** Aucune modif.

- [ ] **Step 1: Créer la PR vers main**

```bash
cd /Users/mkstudio/Desktop/recouvrement_immo_npl && gh pr create --base main --head feat/convex-s2-schema --title "feat(s2): Convex schema complete — 13 tables, 33 indexes" --body "$(cat <<'EOF'
## Résumé

S2 = schema Convex complet pour le workflow immonpl. Ajoute 10 nouvelles tables + augmente \`organizations\`/\`users\`/\`auditLogs\` existantes. Aucune action, aucune cron, aucun import dans cette PR — tout ça vient en S2b/S2c/S2d.

Spec : [docs/superpowers/specs/2026-05-27-convex-s2-schema-design.md](./docs/superpowers/specs/2026-05-27-convex-s2-schema-design.md)
Plan : [docs/superpowers/plans/2026-05-27-convex-s2-schema-impl.md](./docs/superpowers/plans/2026-05-27-convex-s2-schema-impl.md)

## Décisions verrouillées (brainstorm 2026-05-27)

- **Q1** : queries server-side (filter + sort + pagination) → indexes composites
- **Q2** : snapshot SECIB hybride (hot fields inline dans \`cases\` + table dédiée \`secibFetchLog\` pour rawPayload + audit replay)
- **Q3** : \`caseDrafts\` hybride (champs hot typés + \`wizardData: any\` blob)

## Tables touchées

| Table | Action | Indexes |
|---|---|---|
| organizations | + 1 index | by_secib_personne |
| users | + 1 field + 1 index | secibIntervenantId, by_secib_intervenant |
| **cases** | NEW | by_org, by_org_status, by_status, by_secib_dossier, by_secib_intervenant |
| **caseDrafts** | NEW | by_author, by_org, by_expires |
| **messages** | NEW | by_case_created |
| **notes** | NEW | by_case, by_pending_push |
| **timeEntries** | NEW | by_case, by_user_started, by_pending_push |
| **notifications** | NEW | by_recipient_created, by_recipient_unread |
| **notificationPreferences** | NEW | by_user |
| **delayAlerts** | NEW | by_case, by_level_deadline |
| **cachedReferentials** | NEW | by_kind |
| **secibFetchLog** | NEW | by_target, by_endpoint_time, by_user_time |
| auditLogs | + 2 fields + 2 indexes | actorUserId, actorOrganizationId, by_org_created, by_action_created |

## Validation

- [x] \`pnpm convex:deploy\` succeeds
- [x] \`pnpm convex:run seed:provisionNplUser\` (régression S1) → OK
- [x] 10 fixtures \`insertXxxFixture\` retournent toutes \`{ status: 'inserted', id }\`
- [x] Dashboard Convex affiche 13 tables avec 1+ row dans chaque nouvelle
- [x] \`pnpm tsc --noEmit\` sur \`apps/frontend\` reste clean

## Test plan reviewer

\`\`\`bash
git checkout feat/convex-s2-schema
export CONVEX_SELF_HOSTED_URL=https://convex.immo.nplavocat.com
export CONVEX_SELF_HOSTED_ADMIN_KEY=<admin key>
pnpm convex:deploy
pnpm convex:run seed:insertCaseFixture
# ... etc pour les 10
\`\`\`

## Suite

- **S2b** : actions scoped (\`dossiersDuSyndic\`, \`dossiersOuJeSuisIntervenant\`) + helper \`withAuditLog()\`
- **S2c** : crons (referentials refresh quotidien, notes debounce 5 min, caseDrafts cleanup expirés, secibFetchLog purge 90j)
- **S2d** : script import des dossiers SECIB existants des 2 syndics pilotes vers \`cases\`

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)" 2>&1 | tail -5
```

Expected: URL de la PR créée, ex `https://github.com/Karugency97/recouvrement_immo_npl/pull/3`.

- [ ] **Step 2: Relayer l'URL à l'utilisateur**

Récupérer la PR URL du step précédent et la communiquer à l'utilisateur (avec un récap court : tables ajoutées, status validation, prochaine étape).

---

## Recovery scenarios

- **Convex deploy fails (schema type error)** : lire le message d'erreur, identifier la table concernée, ajuster `convex/schema.ts`, commit le fix (`fix(s2): ...`), redéployer
- **Fixture fails (FK invalide)** : un index a probablement été mal nommé. Vérifier que les noms d'indexes correspondent (`by_logto_org` partout, pas `by_logto_orgs` etc.)
- **`_generated/` pas créé après deploy** : check `CONVEX_SELF_HOSTED_ADMIN_KEY` correctement set ; relancer `pnpm convex:deploy`
- **tsc fails sur frontend** : aucun changement attendu côté frontend en S2, c'est probablement un import de `convex/_generated` qui pointe sur un type renommé. Soit `_generated` désynchronisé → relancer deploy ; soit le frontend tente d'importer un type inexistant → ne devrait pas arriver en S2

---

## Notes pour le runner

- Toutes les modifications de schema sont **additives** (aucun champ obligatoire supprimé, aucun index renommé). Pas de migration nécessaire côté data — les rows existantes (NPL org + test user créés en S1) restent valides.
- Le seed `provisionNplUser` reste l'unique point d'entrée pour créer un user — les fixtures S2 dépendent de lui.
- Aucun secret n'est introduit dans cette PR (le SECIB API key reste géré côté Convex env, le Logto secret côté frontend env).
- Les fixtures S2 ne sont PAS supprimables proprement (pas de delete fixture). Elles polluent la DB de dev avec des rows "FIXTURE — ...". Cleanup manuel via Convex dashboard si besoin.
