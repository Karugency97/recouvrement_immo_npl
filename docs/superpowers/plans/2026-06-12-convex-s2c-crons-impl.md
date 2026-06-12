# S2c — Crons Convex + fix MinIO — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trois crons Convex quotidiens (refresh référentiels SECIB, cleanup caseDrafts expirés, purge secibFetchLog > 90j) + traçabilité système dans auditLogs + durcissement du compose MinIO.

**Architecture:** `convex/crons.ts` déclare les jobs ; chaque domaine porte son internal (action `referentials.refreshAll`, mutations `caseDrafts.cleanupExpired` / `secibFetchLog.purgeOld` avec batch 500 + re-planification). `secibFetch` accepte un acteur système (`fetchedByUserId` devient optionnel). Trace via un helper `cronRunRow()` inséré dans `auditLogs`. Fix infra MinIO hors repo via l'API Coolify.

**Tech Stack:** Convex self-hosted 1.39 (`cronJobs`, internalAction/internalMutation, scheduler), gateway SECIB (`/referentiel/*`), Coolify MCP pour le compose MinIO.

**Spec:** `docs/superpowers/specs/2026-06-12-convex-s2c-crons-design.md`

**Repo pattern note:** pas de framework de test unitaire dans ce repo — la validation se fait par `convex deploy` (typecheck strict) + exécution manuelle `pnpm convex:run` + inspection `pnpm exec convex data`, comme pour S2 et S2B.

**Admin key Convex** (nécessaire aux tasks 8+) : exporter `CONVEX_SELF_HOSTED_URL=https://convex.immo.nplavocat.com` et `CONVEX_SELF_HOSTED_ADMIN_KEY=<clé>`. Récupération de la clé : voir memory `reference-convex-admin-key-retrieval` (scheduled task Coolify temporaire `./generate_admin_key.sh` sur le service `convex-npl`, container `backend` — la clé est déterministe).

---

## Task 1: Pre-flight

**Files:** aucun.

- [ ] **Step 1: Vérifier la branche et l'état git**

```bash
cd /Users/mkstudio/Desktop/recouvrement_immo_npl && git branch --show-current && git status --short
```

Expected : `feat/convex-s2c-crons`, et seuls `.playwright-mcp/` et `convex/_generated/` en untracked (artefacts non commités, les laisser).

- [ ] **Step 2: Vérifier que le spec est sur la branche**

```bash
ls docs/superpowers/specs/2026-06-12-convex-s2c-crons-design.md
```

- [ ] **Step 3: Vérifier que les fichiers cibles n'existent pas encore**

```bash
ls convex/crons.ts convex/referentials.ts convex/cachedReferentials.ts convex/caseDrafts.ts 2>&1
```

Expected : `No such file or directory` pour les trois.

---

## Task 2: Schéma — `fetchedByUserId` optionnel

**Files:**
- Modify: `convex/schema.ts` (table `secibFetchLog`, ~ligne 255)

- [ ] **Step 1: Rendre le champ optionnel**

Dans `convex/schema.ts`, table `secibFetchLog`, remplacer :

```ts
    fetchedByUserId: v.id("users"),
```

par :

```ts
    // Optionnel : les fetchs des crons système n'ont pas d'utilisateur.
    fetchedByUserId: v.optional(v.id("users")),
```

(Les 3 indexes de la table, dont `by_user_time`, restent inchangés — un index sur champ optionnel est valide en Convex.)

- [ ] **Step 2: Commit**

```bash
git add convex/schema.ts && git commit -m "feat(s2c): secibFetchLog.fetchedByUserId optional — cron fetches have no user"
```

---

## Task 3: `secibFetchLog.append` + `secibFetch` en mode système

**Files:**
- Modify: `convex/secibFetchLog.ts`
- Modify: `convex/lib/secibFetch.ts`

- [ ] **Step 1: Rendre l'arg `fetchedByUserId` optionnel dans `append`**

Dans `convex/secibFetchLog.ts`, remplacer :

```ts
    fetchedByUserId: v.id("users"),
```

par :

```ts
    fetchedByUserId: v.optional(v.id("users")),
```

(Le handler `ctx.db.insert("secibFetchLog", { ...args, fetchedAt: Date.now() })` est inchangé — Convex omet les clés `undefined` à l'insert.)

- [ ] **Step 2: Élargir le type d'acteur dans `secibFetch`**

Dans `convex/lib/secibFetch.ts` :

a) Remplacer l'import du type audit :

```ts
import type { AuditContext } from "./audit";
```

par :

```ts
import type { Id } from "../_generated/dataModel";
```

b) Ajouter après le bloc d'imports :

```ts
// secibFetch n'a besoin que de l'identité du fetcher pour le log.
// AuditContext (user) la satisfait structurellement ; SYSTEM_FETCH_ACTOR
// est l'acteur des crons (pas d'utilisateur → fetchedByUserId omis).
export type FetchActor = { userId?: Id<"users"> };
export const SYSTEM_FETCH_ACTOR: FetchActor = {};
```

c) Changer la signature :

```ts
export async function secibFetch<T = unknown>(
  ctx: ActionCtx,
  audit: FetchActor,
  opts: SecibFetchOpts,
): Promise<T> {
```

(le corps est inchangé — `fetchedByUserId: audit.userId` transmet `undefined` pour le système, que `append` accepte désormais).

- [ ] **Step 3: Vérifier que les imports résolvent**

```bash
cd /Users/mkstudio/Desktop/recouvrement_immo_npl && npx tsc --noEmit -p convex 2>&1 | head -5
```

Expected : aucune erreur (`AuditContext` de `convex/secib.ts` est structurellement compatible avec `FetchActor`).

- [ ] **Step 4: Commit**

```bash
git add convex/secibFetchLog.ts convex/lib/secibFetch.ts && git commit -m "feat(s2c): secibFetch accepts system actor (no user) for cron fetches"
```

---

## Task 4: Traçabilité — `cronRunRow()` + `auditLogs.append` assoupli

**Files:**
- Modify: `convex/auditLogs.ts`
- Modify: `convex/lib/audit.ts`

- [ ] **Step 1: Rendre `actorUserId`/`actorOrganizationId` optionnels dans `append`**

Dans `convex/auditLogs.ts`, remplacer :

```ts
    actorUserId: v.id("users"),
    actorRole: v.string(),
    actorOrganizationId: v.id("organizations"),
```

par :

```ts
    // Optionnels : les lignes système (crons) n'ont ni user ni org.
    actorUserId: v.optional(v.id("users")),
    actorRole: v.string(),
    actorOrganizationId: v.optional(v.id("organizations")),
```

(Le schéma `auditLogs` les déclare déjà optionnels — seuls les args de la mutation étaient plus stricts.)

- [ ] **Step 2: Ajouter `cronRunRow()` dans `convex/lib/audit.ts`**

Ajouter à la fin du fichier :

```ts
// ─────────────────────────────────────────────────────────────────
// cronRunRow — ligne auditLogs pour une exécution de cron système.
// Retourne l'objet row : les mutations l'insèrent via ctx.db.insert,
// les actions via ctx.runMutation(internal.auditLogs.append, row).
// withAuditLog (user-centric) n'est pas concerné.
// ─────────────────────────────────────────────────────────────────
export function cronRunRow(
  job: string,
  outcome: "completed" | "failed",
  metadata?: Record<string, unknown>,
) {
  return {
    actorLogtoUserId: "system:cron",
    actorRole: "system",
    action: `cron.${job}.${outcome}`,
    metadata,
  };
}
```

- [ ] **Step 3: Commit**

```bash
git add convex/auditLogs.ts convex/lib/audit.ts && git commit -m "feat(s2c): cronRunRow helper + system rows allowed in auditLogs.append"
```

---

## Task 5: Refresh référentiels — `convex/cachedReferentials.ts` + `convex/referentials.ts`

⚠ Contrainte Convex : un fichier `"use node"` ne peut contenir que des **actions** — et `lib/secibFetch.ts` est `"use node"`, donc tout fichier qui l'importe doit l'être aussi. D'où la séparation : la mutation `upsertKind` vit dans `cachedReferentials.ts` (runtime par défaut), l'action `refreshAll` dans `referentials.ts` (`"use node"`).

**Files:**
- Create: `convex/cachedReferentials.ts`
- Create: `convex/referentials.ts`

- [ ] **Step 1: Écrire `convex/cachedReferentials.ts` (mutation upsert, runtime par défaut)**

```ts
import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

// Upsert d'un référentiel SECIB dans le cache. Appelé uniquement par
// l'action referentials.refreshAll (cron quotidien).

const TTL_MS = 25 * 60 * 60 * 1000; // 25h — couvre un cron raté sans trou de cache

export const kindValidator = v.union(
  v.literal("CODES_ACTIVITES"),
  v.literal("CODES_FACTURATION"),
  v.literal("MATIERES_CONTENTIEUX"),
  v.literal("INTERVENANTS"),
  v.literal("ETAPES_PARAPHEUR"),
);

export const upsertKind = internalMutation({
  args: { kind: kindValidator, payload: v.any() },
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("cachedReferentials")
      .withIndex("by_kind", (q) => q.eq("kind", args.kind))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, {
        payload: args.payload,
        fetchedAt: now,
        ttlAt: now + TTL_MS,
      });
    } else {
      await ctx.db.insert("cachedReferentials", {
        kind: args.kind,
        payload: args.payload,
        fetchedAt: now,
        ttlAt: now + TTL_MS,
      });
    }
  },
});
```

- [ ] **Step 2: Écrire `convex/referentials.ts` (action, "use node")**

```ts
"use node";

import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { secibFetch, SYSTEM_FETCH_ACTOR } from "./lib/secibFetch";
import { cronRunRow } from "./lib/audit";

// ─────────────────────────────────────────────────────────────────
// Référentiels SECIB — cache quotidien dans cachedReferentials.
// Le cron referentials-refresh appelle refreshAll chaque nuit ; chaque
// kind est fetché indépendamment (un échec n'invalide pas les autres,
// le cache précédent reste servi — TTL 25h pour absorber un raté).
// L'upsert vit dans cachedReferentials.ts (les fichiers "use node"
// ne peuvent contenir que des actions).
// ─────────────────────────────────────────────────────────────────

// Paths côté gateway npl-api-gateway (src/routes/referentiel.ts).
// ⚠ MATIERES_CONTENTIEUX est bien "matieres/contentieux" (slash, pas tiret).
const KIND_ENDPOINTS = {
  CODES_ACTIVITES: "/referentiel/codes-activites",
  CODES_FACTURATION: "/referentiel/codes-facturation",
  MATIERES_CONTENTIEUX: "/referentiel/matieres/contentieux",
  INTERVENANTS: "/referentiel/intervenants",
  ETAPES_PARAPHEUR: "/referentiel/etapes-parapheur",
} as const;

type Kind = keyof typeof KIND_ENDPOINTS;

// Type de retour explicite : ce module référence internal.* — inférence
// circulaire TS7022 sinon (même piège qu'en S2B).
export const refreshAll = internalAction({
  args: {},
  handler: async (ctx): Promise<void> => {
    const refreshed: string[] = [];
    const failed: Record<string, string> = {};

    for (const kind of Object.keys(KIND_ENDPOINTS) as Kind[]) {
      try {
        const payload = await secibFetch(ctx, SYSTEM_FETCH_ACTOR, {
          endpoint: KIND_ENDPOINTS[kind],
          targetType: "referentiel",
          targetId: kind,
        });
        await ctx.runMutation(internal.cachedReferentials.upsertKind, {
          kind,
          payload,
        });
        refreshed.push(kind);
      } catch (error) {
        failed[kind] =
          error instanceof Error ? error.message.slice(0, 200) : String(error);
      }
    }

    const outcome = refreshed.length > 0 ? "completed" : "failed";
    await ctx.runMutation(
      internal.auditLogs.append,
      cronRunRow("referentials-refresh", outcome, { refreshed, failed }),
    );
  },
});
```

- [ ] **Step 3: Vérifier le typecheck**

```bash
npx tsc --noEmit -p convex 2>&1 | head -10
```

Expected : aucune erreur.

- [ ] **Step 4: Commit**

```bash
git add convex/cachedReferentials.ts convex/referentials.ts && git commit -m "feat(s2c): referentials.refreshAll — daily SECIB referentials cache refresh"
```

---

## Task 6: Cleanup `caseDrafts` expirés — `convex/caseDrafts.ts`

**Files:**
- Create: `convex/caseDrafts.ts`

- [ ] **Step 1: Écrire `convex/caseDrafts.ts`**

```ts
import { internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { cronRunRow } from "./lib/audit";

// ─────────────────────────────────────────────────────────────────
// caseDrafts — brouillons du wizard "nouveau dossier".
// expiresAt = 30j après le dernier update (posé à l'écriture par le
// portail, S3). Le cron casedrafts-cleanup purge les expirés chaque nuit.
// Batch de 500 + re-planification : aucune mutation ne touche plus de
// 500 docs (limites Convex), idempotent si relancé.
// ─────────────────────────────────────────────────────────────────

const BATCH_SIZE = 500;

export const cleanupExpired = internalMutation({
  args: { deletedSoFar: v.optional(v.number()) },
  handler: async (ctx, args): Promise<void> => {
    const now = Date.now();
    const batch = await ctx.db
      .query("caseDrafts")
      .withIndex("by_expires", (q) => q.lt("expiresAt", now))
      .take(BATCH_SIZE);

    for (const doc of batch) {
      await ctx.db.delete(doc._id);
    }

    const deleted = (args.deletedSoFar ?? 0) + batch.length;

    if (batch.length === BATCH_SIZE) {
      // Page pleine → il en reste peut-être : continuer dans une
      // mutation séparée plutôt que de grossir celle-ci.
      await ctx.scheduler.runAfter(0, internal.caseDrafts.cleanupExpired, {
        deletedSoFar: deleted,
      });
      return;
    }

    await ctx.db.insert("auditLogs", {
      ...cronRunRow("casedrafts-cleanup", "completed", { deleted }),
      createdAt: now,
    });
  },
});
```

- [ ] **Step 2: Vérifier le typecheck**

```bash
npx tsc --noEmit -p convex 2>&1 | head -10
```

Expected : aucune erreur.

- [ ] **Step 3: Commit**

```bash
git add convex/caseDrafts.ts && git commit -m "feat(s2c): caseDrafts.cleanupExpired — nightly batched purge of expired drafts"
```

---

## Task 7: Purge `secibFetchLog` > 90j

**Files:**
- Modify: `convex/secibFetchLog.ts`

- [ ] **Step 1: Ajouter `purgeOld` à `convex/secibFetchLog.ts`**

Ajouter en haut du fichier l'import manquant :

```ts
import { internal } from "./_generated/api";
import { cronRunRow } from "./lib/audit";
```

et changer la première ligne d'import existante en :

```ts
import { internalMutation } from "./_generated/server";
```

(inchangée si déjà identique). Puis ajouter à la fin du fichier :

```ts
// ─────────────────────────────────────────────────────────────────
// purgeOld — cron secibfetchlog-purge : supprime les logs de fetch
// SECIB de plus de 90 jours. Pas d'index sur fetchedAt seul : on lit
// les plus anciens par _creationTime (ordre par défaut, asc) — comme
// fetchedAt ≈ _creationTime, dès qu'un doc de la page est trop récent,
// tout le reste l'est aussi.
// ─────────────────────────────────────────────────────────────────

const BATCH_SIZE = 500;
const RETENTION_MS = 90 * 24 * 60 * 60 * 1000;

export const purgeOld = internalMutation({
  args: { deletedSoFar: v.optional(v.number()) },
  handler: async (ctx, args): Promise<void> => {
    const cutoff = Date.now() - RETENTION_MS;
    const oldest = await ctx.db
      .query("secibFetchLog")
      .order("asc")
      .take(BATCH_SIZE);

    let deleted = args.deletedSoFar ?? 0;
    let pageExhausted = true;
    for (const doc of oldest) {
      if (doc.fetchedAt >= cutoff) {
        pageExhausted = false;
        break;
      }
      await ctx.db.delete(doc._id);
      deleted += 1;
    }

    if (pageExhausted && oldest.length === BATCH_SIZE) {
      await ctx.scheduler.runAfter(0, internal.secibFetchLog.purgeOld, {
        deletedSoFar: deleted,
      });
      return;
    }

    await ctx.db.insert("auditLogs", {
      ...cronRunRow("secibfetchlog-purge", "completed", { deleted }),
      createdAt: Date.now(),
    });
  },
});
```

- [ ] **Step 2: Vérifier le typecheck**

```bash
npx tsc --noEmit -p convex 2>&1 | head -10
```

Expected : aucune erreur.

- [ ] **Step 3: Commit**

```bash
git add convex/secibFetchLog.ts && git commit -m "feat(s2c): secibFetchLog.purgeOld — 90-day retention, batched"
```

---

## Task 8: Déclaration des crons — `convex/crons.ts`

**Files:**
- Create: `convex/crons.ts`

- [ ] **Step 1: Écrire `convex/crons.ts`**

```ts
import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

// Crons quotidiens immonpl. 08:00 UTC = 04:00 Guadeloupe (hors heures
// cabinet). Horaires décalés pour éviter le chevauchement.
const crons = cronJobs();

crons.daily(
  "referentials-refresh",
  { hourUTC: 8, minuteUTC: 0 },
  internal.referentials.refreshAll,
  {},
);

crons.daily(
  "casedrafts-cleanup",
  { hourUTC: 8, minuteUTC: 30 },
  internal.caseDrafts.cleanupExpired,
  {},
);

crons.daily(
  "secibfetchlog-purge",
  { hourUTC: 9, minuteUTC: 0 },
  internal.secibFetchLog.purgeOld,
  {},
);

export default crons;
```

- [ ] **Step 2: Vérifier le typecheck**

```bash
npx tsc --noEmit -p convex 2>&1 | head -10
```

Expected : aucune erreur.

- [ ] **Step 3: Commit**

```bash
git add convex/crons.ts && git commit -m "feat(s2c): declare 3 daily crons (referentials, drafts cleanup, fetchlog purge)"
```

---

## Task 9: Fixture de test — draft expiré

**Files:**
- Modify: `convex/seed.ts`

- [ ] **Step 1: Ajouter la fixture à la fin de `convex/seed.ts`**

```ts
// ─────────────────────────────────────────────────────────────────
// insertExpiredDraftFixture — draft expiré pour valider le cron
// casedrafts-cleanup (S2c). Rattaché au premier user provisionné.
// ─────────────────────────────────────────────────────────────────
export const insertExpiredDraftFixture = internalMutation({
  args: {},
  handler: async (ctx) => {
    const user = await ctx.db.query("users").first();
    if (!user) {
      throw new ConvexError({
        code: "seed.no_user",
        message: "Provision a user first (seed:provisionNplUser).",
      });
    }
    const draftId = await ctx.db.insert("caseDrafts", {
      organizationId: user.organizationId,
      authorUserId: user._id,
      casSpecial: [],
      currentStep: "fixture",
      wizardData: { fixture: "s2c-expired-draft" },
      updatedAt: Date.now() - 31 * 24 * 60 * 60 * 1000,
      expiresAt: Date.now() - 24 * 60 * 60 * 1000, // expiré depuis hier
    });
    return { draftId };
  },
});
```

(Si `internalMutation` ou `ConvexError` ne sont pas déjà importés en tête de `seed.ts`, compléter les imports existants — `seed.ts` utilise déjà les deux depuis S2B.)

- [ ] **Step 2: Typecheck + commit**

```bash
npx tsc --noEmit -p convex 2>&1 | head -5
git add convex/seed.ts && git commit -m "feat(s2c): insertExpiredDraftFixture for cleanup cron validation"
```

---

## Task 10: Deploy + validation backend

**Files:** aucun. ⚠ Nécessite `CONVEX_SELF_HOSTED_URL` + `CONVEX_SELF_HOSTED_ADMIN_KEY` (voir header du plan).

- [ ] **Step 1: Deploy**

```bash
pnpm convex:deploy 2>&1 | tail -5
```

Expected : `✔ Deployed Convex functions to https://convex.immo.nplavocat.com`. Si erreurs TS7022 (inférence circulaire), ajouter des annotations de retour explicites sur les handlers concernés (cf. Task 5 note).

- [ ] **Step 2: Vérifier que les 3 crons sont enregistrés**

Ouvrir https://admin.immo.nplavocat.com (admin key) → onglet « Schedules » → les 3 jobs apparaissent avec leurs horaires. Vérification CLI alternative :

```bash
pnpm exec convex data _cron_jobs 2>/dev/null || echo "table système non exposée — vérifier via dashboard"
```

- [ ] **Step 3: Run manuel — refresh référentiels**

```bash
pnpm convex:run referentials:refreshAll '{}'
pnpm exec convex data cachedReferentials | head -10
```

Expected : 5 docs (un par kind), `payload` non vide, `ttlAt` ≈ now + 25h.

- [ ] **Step 4: Run manuel — cleanup drafts (avec fixture)**

```bash
pnpm convex:run seed:insertExpiredDraftFixture '{}'
pnpm convex:run caseDrafts:cleanupExpired '{}'
pnpm exec convex data caseDrafts
```

Expected : la fixture insérée puis supprimée — table vide (ou sans le draft fixture).

- [ ] **Step 5: Run manuel — purge fetchLog**

```bash
pnpm convex:run secibFetchLog:purgeOld '{}'
```

Expected : OK sans erreur (0 supprimé — tous les logs ont < 90j).

- [ ] **Step 6: Vérifier les lignes auditLogs système**

```bash
pnpm exec convex data auditLogs --limit 6 --order desc
```

Expected : lignes `cron.referentials-refresh.completed` (metadata.refreshed = 5 kinds), `cron.casedrafts-cleanup.completed` (deleted ≥ 1), `cron.secibfetchlog-purge.completed` (deleted = 0), avec `actorLogtoUserId: "system:cron"`.

- [ ] **Step 7: Non-régression mode user**

```bash
pnpm convex:run seed:provisionNplUser '{"logtoUserId":"y603zurdjehk","email":"contact@karugency.com","name":"Test Admin NPL","role":"npl_admin"}'
```

Expected : `status: "exists"`. (Le refactor `secibFetch` ne doit pas casser le chemin user — le playground sera re-testé en Task 12.)

---

## Task 11: Fix infra MinIO (via Coolify MCP — hors repo)

**Files:** aucun (compose Coolify du service `convex-npl-minio`, UUID `a11dgvd0tjf2p1iz1931157w`).

Constat (compose actuel lu le 2026-06-12) : `minio-init` est **déjà idempotent** (`mc mb --ignore-existing` en boucle sur les 5 buckets). Restent : `restart: 'no'` → `on-failure`, et le healthcheck du conteneur `minio` qui ne vérifie que la liveness, pas les buckets.

- [ ] **Step 1: Mettre à jour le compose via `mcp__coolify__service` (action `update`)**

`docker_compose_raw` complet à pousser (deux changements vs l'actuel, marqués `# CHANGED`) :

```yaml
services:
  minio:
    image: 'minio/minio:RELEASE.2025-04-22T22-12-26Z'
    command: 'server /data --console-address ":9001"'
    environment:
      MINIO_ROOT_USER: '${SERVICE_USER_MINIO}'
      MINIO_ROOT_PASSWORD: '${SERVICE_PASSWORD_MINIO}'
      MINIO_BROWSER: 'on'
    volumes:
      - 'minio-data:/data'
    healthcheck:
      test:
        - CMD-SHELL
        # CHANGED: liveness + présence des 5 buckets (répertoires du volume).
        # Buckets perdus (volume renommé/vidé) → unhealthy visible dans Coolify.
        - 'curl -f http://localhost:9000/minio/health/live && test -d /data/convex-exports && test -d /data/convex-snapshots && test -d /data/convex-modules && test -d /data/convex-files && test -d /data/convex-search || exit 1'
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s
    networks:
      - default
      - coolify
  minio-init:
    image: 'minio/mc:RELEASE.2025-04-16T18-13-26Z'
    depends_on:
      minio:
        condition: service_healthy
    entrypoint:
      - /bin/sh
      - '-c'
      - "set -e\nmc alias set local http://minio:9000 \"${SERVICE_USER_MINIO}\" \"${SERVICE_PASSWORD_MINIO}\"\nfor b in convex-exports convex-snapshots convex-modules convex-files convex-search; do\n  mc mb --ignore-existing \"local/$b\"\ndone\necho \"Convex buckets ready\"\n"
    restart: on-failure   # CHANGED: était 'no' — se relance si l'init échoue
    networks:
      - default
volumes:
  minio-data:
    name: minio-data
networks:
  default: {  }
  coolify:
    external: true
```

⚠ Ordre de poule et d'œuf : au premier démarrage sur volume vierge, les buckets n'existent pas encore → `minio` resterait unhealthy → `minio-init` (qui `depends_on: service_healthy`) ne démarrerait jamais. Ce n'est PAS le cas ici (les 5 buckets existent déjà sur le volume), mais documenter dans le commit/PR : sur un volume vierge, créer les répertoires à la main ou assouplir temporairement le healthcheck.

- [ ] **Step 2: Redémarrer le service et vérifier (leçon S2B)**

```
mcp__coolify__control { resource: service, action: restart, uuid: a11dgvd0tjf2p1iz1931157w }
```

Puis vérifier le status via `mcp__coolify__get_service` — **si `exited`, faire un `control start` explicite** (bug connu : restart post-update de compose laisse le service stoppé, cf. memory `reference-coolify-traefik-gotchas`).

- [ ] **Step 3: Valider**

- `get_service` → `minio` : `running:healthy` (le nouveau healthcheck passe avec les 5 buckets présents) ; `minio-init` : `exited` code 0 (relancé, buckets déjà présents, `--ignore-existing` no-op).
- Non-régression backend : `pnpm convex:deploy` (le deploy pousse les modules vers le bucket `convex-modules`) → succès.

---

## Task 12: Validation E2E + push + PR

**Files:** aucun.

- [ ] **Step 1: Playground prod — non-régression S2B**

Ouvrir https://immo.nplavocat.com/convex-poc/dossiers, login `npl_test_admin`, cliquer `cabinetInfo` → `✓` avec données SECIB (le refactor `secibFetch` n'a pas cassé le mode user).

- [ ] **Step 2: Push + PR**

```bash
git push -u origin feat/convex-s2c-crons
gh pr create --base main --head feat/convex-s2c-crons --title "feat(s2c): 3 crons quotidiens + logCronRun + MinIO bucket healthcheck" --body "$(cat <<'EOF'
## Résumé

S2c — maintenance automatique du backend Convex :
- **referentials-refresh** (08:00 UTC) : cache des 5 référentiels SECIB dans `cachedReferentials` (TTL 25h, échec par kind isolé)
- **casedrafts-cleanup** (08:30 UTC) : purge des brouillons wizard expirés (batch 500 + re-planification)
- **secibfetchlog-purge** (09:00 UTC) : rétention 90j des logs de fetch SECIB
- Traçabilité : lignes `auditLogs` système (`system:cron`) via `cronRunRow()`
- `secibFetch` accepte un acteur système (`fetchedByUserId` optionnel)
- Infra (hors repo) : healthcheck buckets sur le conteneur MinIO + `minio-init` en `restart: on-failure`

**Spec** : docs/superpowers/specs/2026-06-12-convex-s2c-crons-design.md
**Plan** : docs/superpowers/plans/2026-06-12-convex-s2c-crons-impl.md

## Décisions verrouillées

- Cron notes→GED **déféré à S3** (table cases vide, specs dépendantes du workflow S3)
- Bucket check = **fix infra à la source**, pas de cron Convex de monitoring
- Pas de table cronRuns — `auditLogs` suffit pour 3 jobs quotidiens

## Validation

- [ ] Deploy OK, 3 crons visibles dans le dashboard (Schedules)
- [ ] `referentials:refreshAll` → 5 kinds dans `cachedReferentials`
- [ ] Fixture draft expiré supprimée par `caseDrafts:cleanupExpired`
- [ ] `secibFetchLog:purgeOld` → 0 supprimé (logs récents)
- [ ] Lignes `cron.*.completed` dans `auditLogs`
- [ ] MinIO healthy avec le nouveau healthcheck, `minio-init` rejouable
- [ ] Non-régression playground (cabinetInfo en user)

## Hors scope (PRs ultérieures)

- **S2d** : import dossiers SECIB des 2 syndics pilotes + `dossiersOuJeSuisIntervenant`
- **S3** : portail Syndic sur Convex + push notes→GED + push timeEntries

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 3: Relayer l'URL de la PR à l'utilisateur**

---

## Self-review (fait à l'écriture)

- **Couverture spec** : crons.ts ✔ (Task 8), refreshAll + mapping endpoints ✔ (Task 5, slash `matieres/contentieux` vérifié dans le source du gateway), cleanups batch ✔ (Tasks 6-7), cronRunRow ✔ (Task 4), secibFetch système + schéma ✔ (Tasks 2-3), fix MinIO ✔ (Task 11, compose réel lu — init déjà idempotent, seuls restart + healthcheck changent), validation ✔ (Tasks 10-12).
- **Types cohérents** : `FetchActor`/`SYSTEM_FETCH_ACTOR` (Task 3) utilisés en Task 5 ; `cronRunRow` (Task 4) utilisé en Tasks 5-7 ; `kindValidator` aligné sur l'union du schéma.
- **Anti-TS7022** : annotations `Promise<void>` posées d'office sur les handlers qui référencent `internal.<même module>` (leçon S2B).
