# S2d — Import dossiers SECIB + dossiersOuJeSuisIntervenant — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Importer les dossiers SECIB des 2 syndics pilotes (PersonneId 5847 et 3226, ~142 dossiers actifs) dans la table `cases`, et livrer la query scopée `cases.dossiersOuJeSuisIntervenant`.

**Architecture:** Internal action `"use node"` `importSecib.runForSyndic` (fetch gateway via `secibFetch` + acteur système S2c) → mutation `cases.upsertFromSecib` idempotente (index `by_secib_dossier`, le patch ne touche que le snapshot `secib*`). Query publique réactive sur l'index `by_secib_intervenant` via un nouveau helper `requireRoleQuery` (le `requireRole` existant est action-only). Orgs pilotes créées côté Logto (MCP) puis upsertées côté Convex.

**Tech Stack:** Convex self-hosted 1.39, gateway SECIB (`/personnes/{id}/dossiers`, `/dossiers/{id}` — réponses enveloppées `{ data: T }`), MCP logto-npl pour les orgs.

**Spec:** `docs/superpowers/specs/2026-06-12-convex-s2d-import-design.md`

**Repo pattern note:** pas de framework de test unitaire — validation par deploy (typecheck) + `pnpm convex:run` + inspection `pnpm exec convex data` + playground (pattern S2/S2B/S2C).

**Admin key Convex** (tasks 9+) : `CONVEX_SELF_HOSTED_URL=https://convex.immo.nplavocat.com` + `CONVEX_SELF_HOSTED_ADMIN_KEY` — récupération : memory `reference-convex-admin-key-retrieval`.

**Codegen note pour les implémenteurs** : les nouveaux modules (`cases`, `importSecib`) ne sont pas connus de `convex/_generated/api.ts` tant que `convex codegen` (qui exige les credentials) n'a pas tourné. Si `npx tsc --noEmit -p convex` n'échoue QUE sur des propriétés inconnues de `internal.*`/`api.*`, c'est attendu — le signaler et continuer ; l'orchestrateur lance le codegen entre les lots.

---

## Task 1: Pre-flight

**Files:** aucun.

- [ ] **Step 1: Branche et état**

```bash
cd /Users/mkstudio/Desktop/recouvrement_immo_npl && git branch --show-current && git status --short
```

Expected : `feat/convex-s2d-import` ; untracked `.playwright-mcp/` + `convex/_generated/` tolérés.

- [ ] **Step 2: Cibles inexistantes**

```bash
ls convex/cases.ts convex/importSecib.ts 2>&1
```

Expected : `No such file or directory` pour les deux.

---

## Task 2: Schéma — champs financiers optionnels

**Files:**
- Modify: `convex/schema.ts` (table `cases`, ~lignes 70-71)

- [ ] **Step 1: Rendre les 2 champs optionnels**

Dans `convex/schema.ts`, table `cases`, remplacer :

```ts
    // Calculs financiers (cents = entiers)
    principalCents: v.number(),
    principalDateExigibilite: v.number(),
```

par :

```ts
    // Calculs financiers (cents = entiers).
    // Requis fonctionnellement pour les cases créées par le wizard S3 ;
    // absents sur les dossiers importés de SECIB (montant inconnu —
    // ne JAMAIS défaulter à 0 : fausserait intérêts et stats).
    principalCents: v.optional(v.number()),
    principalDateExigibilite: v.optional(v.number()),
```

- [ ] **Step 2: Typecheck + commit**

```bash
npx tsc --noEmit -p convex 2>&1 | tail -2
git add convex/schema.ts && git commit -m "feat(s2d): cases financial fields optional — unknown on SECIB legacy imports"
```

---

## Task 3: `requireRoleQuery` + factory d'erreur

**Files:**
- Modify: `convex/lib/auth.ts`
- Modify: `convex/lib/errors.ts`

- [ ] **Step 1: Ajouter la factory dans `convex/lib/errors.ts`** (fin de fichier)

```ts
export function noSecibIntervenantId(
  logtoUserId: string,
): ConvexError<{ code: string; message: string; logtoUserId: string }> {
  return new ConvexError({
    code: "avocat.no_secib_intervenant_id",
    message: `User ${logtoUserId} has no secibIntervenantId configured. An NPL admin must map this account to its SECIB intervenant (seed:setUserSecibIntervenantId).`,
    logtoUserId,
  });
}
```

- [ ] **Step 2: Ajouter `requireRoleQuery` dans `convex/lib/auth.ts`**

a) Compléter l'import des types générés en tête de fichier :

```ts
import type { ActionCtx, QueryCtx } from "../_generated/server";
```

b) Ajouter en fin de fichier :

```ts
// ─────────────────────────────────────────────────────────────────
// requireRoleQuery — même gate que requireRole, mais pour les QUERIES.
// Les queries n'ont pas ctx.runQuery : on lit users directement via
// ctx.db. Retourne le doc user complet (les queries scoped ont besoin
// de champs comme secibIntervenantId, pas seulement des ids).
// ─────────────────────────────────────────────────────────────────
export async function requireRoleQuery(
  ctx: QueryCtx,
  allowed: readonly UserRole[],
) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw notAuthenticated();

  const user = await ctx.db
    .query("users")
    .withIndex("by_logto_user", (q) => q.eq("logtoUserId", identity.subject))
    .unique();
  if (!user) throw notProvisioned(identity.subject);

  if (!allowed.includes(user.role as UserRole)) {
    throw forbidden(user.role, allowed);
  }

  return user;
}
```

- [ ] **Step 3: Typecheck + commit**

```bash
npx tsc --noEmit -p convex 2>&1 | tail -2
git add convex/lib/auth.ts convex/lib/errors.ts && git commit -m "feat(s2d): requireRoleQuery (query-side auth gate) + noSecibIntervenantId error"
```

---

## Task 4: Internal queries de résolution

**Files:**
- Modify: `convex/organizations.ts`
- Modify: `convex/users.ts`

- [ ] **Step 1: Ajouter `getBySecibPersonneId` à `convex/organizations.ts`** (fin de fichier ; `internalQuery` et `v` déjà importés — vérifier, compléter sinon)

```ts
// Résolution org syndic par sa référence SECIB. Utilisé par l'import S2d.
export const getBySecibPersonneId = internalQuery({
  args: { secibSyndicPersonneId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("organizations")
      .withIndex("by_secib_personne", (q) =>
        q.eq("secibSyndicPersonneId", args.secibSyndicPersonneId),
      )
      .unique();
  },
});
```

- [ ] **Step 2: Ajouter `getFirstNplAdmin` à `convex/users.ts`** (fin de fichier)

```ts
// Premier user npl_admin — auteur technique des cases importées de SECIB
// (authorUserId est requis au schéma ; l'import n'a pas d'auteur humain).
// Pas d'index sur role : table users minuscule, filter acceptable.
export const getFirstNplAdmin = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("role"), "npl_admin"))
      .first();
  },
});
```

- [ ] **Step 3: Typecheck + commit**

```bash
npx tsc --noEmit -p convex 2>&1 | tail -2
git add convex/organizations.ts convex/users.ts && git commit -m "feat(s2d): resolution queries — org by SECIB personne, first npl_admin"
```

---

## Task 5: Seed — `upsertSyndicOrg` + `setUserSecibIntervenantId`

**Files:**
- Modify: `convex/seed.ts` (fin de fichier ; `internalMutation`, `v`, `ConvexError` déjà importés)

- [ ] **Step 1: Ajouter les 2 mutations**

```ts
// ─────────────────────────────────────────────────────────────────
// upsertSyndicOrg — crée l'org Convex d'un syndic pilote, ou promeut
// une org existante (cas : org de test S2B → org réelle). Lookup par
// by_secib_personne pour que la promotion conserve le même _id (les
// users/cases déjà rattachés restent valides).
// ─────────────────────────────────────────────────────────────────
export const upsertSyndicOrg = internalMutation({
  args: {
    logtoOrgId: v.string(),
    name: v.string(),
    secibSyndicPersonneId: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("organizations")
      .withIndex("by_secib_personne", (q) =>
        q.eq("secibSyndicPersonneId", args.secibSyndicPersonneId),
      )
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, {
        name: args.name,
        logtoOrgId: args.logtoOrgId,
      });
      return { organizationId: existing._id, action: "promoted" };
    }
    const organizationId = await ctx.db.insert("organizations", {
      kind: "syndic",
      name: args.name,
      logtoOrgId: args.logtoOrgId,
      secibSyndicPersonneId: args.secibSyndicPersonneId,
      createdAt: Date.now(),
    });
    return { organizationId, action: "created" };
  },
});

// ─────────────────────────────────────────────────────────────────
// setUserSecibIntervenantId — mappe un compte avocat/admin sur son
// intervenant SECIB (Responsable.UtilisateurId, ex. "3" = Nancy).
// Prérequis de cases.dossiersOuJeSuisIntervenant. Le provisioning S3
// posera ce champ à la création des comptes avocats.
// ─────────────────────────────────────────────────────────────────
export const setUserSecibIntervenantId = internalMutation({
  args: { logtoUserId: v.string(), secibIntervenantId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_logto_user", (q) => q.eq("logtoUserId", args.logtoUserId))
      .unique();
    if (!user) {
      throw new ConvexError({
        code: "seed.user_not_found",
        message: `No provisioned user for logtoUserId ${args.logtoUserId}.`,
      });
    }
    await ctx.db.patch(user._id, {
      secibIntervenantId: args.secibIntervenantId,
    });
    return { userId: user._id };
  },
});
```

- [ ] **Step 2: Typecheck + commit**

```bash
npx tsc --noEmit -p convex 2>&1 | tail -2
git add convex/seed.ts && git commit -m "feat(s2d): upsertSyndicOrg (promote test org) + setUserSecibIntervenantId"
```

---

## Task 6: `convex/cases.ts` — upsert + query scopée

**Files:**
- Create: `convex/cases.ts`

- [ ] **Step 1: Écrire `convex/cases.ts`**

```ts
import { internalMutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireRoleQuery } from "./lib/auth";
import { noSecibIntervenantId } from "./lib/errors";

// ─────────────────────────────────────────────────────────────────
// cases — dossiers de recouvrement (hub central du schéma).
// S2d : upsert d'import SECIB + première query scopée avocat.
// Les queries de listing syndic arrivent avec le portail S3.
// ─────────────────────────────────────────────────────────────────

// Snapshot SECIB porté par l'import (sous-ensemble des champs secib* du schéma).
const snapshotValidator = v.object({
  secibDossierId: v.string(),
  secibLibelle: v.string(),
  secibCodeMatiere: v.optional(v.string()),
  secibDateOuverture: v.optional(v.number()),
  secibIntervenantId: v.optional(v.string()),
});

// Upsert idempotent par by_secib_dossier. Le patch ne touche QUE le
// snapshot secib* : un re-run d'import ne doit jamais écraser status,
// montants, pièces ou tout champ saisi par le cabinet entre-temps.
export const upsertFromSecib = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    authorUserId: v.id("users"),
    snapshot: snapshotValidator,
  },
  handler: async (ctx, args): Promise<"inserted" | "updated"> => {
    const now = Date.now();
    const existing = await ctx.db
      .query("cases")
      .withIndex("by_secib_dossier", (q) =>
        q.eq("secibDossierId", args.snapshot.secibDossierId),
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        ...args.snapshot,
        secibSnapshotAt: now,
        updatedAt: now,
      });
      return "updated";
    }

    await ctx.db.insert("cases", {
      organizationId: args.organizationId,
      authorUserId: args.authorUserId,
      status: "CREE",
      statusChangedAt: now,
      statusChangedByUserId: args.authorUserId,
      casSpecial: [],
      pieces: [],
      ...args.snapshot,
      secibSnapshotAt: now,
      createdAt: now,
      updatedAt: now,
    });
    return "inserted";
  },
});

// Query scopée avocat : les cases dont l'appelant est l'intervenant
// SECIB (Responsable du dossier). QUERY et non action : les données
// sont locales (c'est la raison du report S2B→S2d), donc réactif et
// zéro appel gateway. npl_admin autorisé : une avocate-admin (Nancy)
// porte les deux casquettes. Pas d'audit log — query réactive appelée
// en continu par l'UI (même convention que users.me).
export const dossiersOuJeSuisIntervenant = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireRoleQuery(ctx, ["npl_avocat", "npl_admin"]);
    const intervenantId = user.secibIntervenantId;
    if (!intervenantId) throw noSecibIntervenantId(user.logtoUserId);
    return await ctx.db
      .query("cases")
      .withIndex("by_secib_intervenant", (q) =>
        q.eq("secibIntervenantId", intervenantId),
      )
      .collect();
  },
});
```

(Volumétrie pilote ≤ ~150 docs → `collect()` acceptable ; pagination au portail S3.)

- [ ] **Step 2: Typecheck + commit**

```bash
npx tsc --noEmit -p convex 2>&1 | tail -3
git add convex/cases.ts && git commit -m "feat(s2d): cases.upsertFromSecib + dossiersOuJeSuisIntervenant scoped query"
```

---

## Task 7: `convex/importSecib.ts` — action d'import

**Files:**
- Create: `convex/importSecib.ts`

- [ ] **Step 1: Écrire `convex/importSecib.ts`** (`"use node"` — action uniquement, contrainte Convex)

```ts
"use node";

import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v, ConvexError } from "convex/values";
import { secibFetch, SYSTEM_FETCH_ACTOR } from "./lib/secibFetch";
import { cronRunRow } from "./lib/audit";

// ─────────────────────────────────────────────────────────────────
// Import one-shot (ré-exécutable) des dossiers SECIB d'un syndic
// pilote vers la table cases. Déclenché manuellement :
//   npx convex run importSecib:runForSyndic '{"secibSyndicPersonneId":"5847"}'
// Idempotent : upsert par secibDossierId (cases.upsertFromSecib).
// Réutilise l'acteur système S2c — chaque appel gateway est tracé
// dans secibFetchLog, le run dans auditLogs (job import-secib-dossiers).
// ─────────────────────────────────────────────────────────────────

// Réponses gateway : enveloppées { data: T }.
type PartiesResponse = {
  data?: Array<{ Dossier: { DossierId: number }; TypePartieId: number }>;
};
type DetailResponse = {
  data?: {
    DossierId: number;
    Nom: string;
    DateCreation?: string | null;
    IsArchive?: boolean;
    Matiere?: { MatiereId: number } | null;
    Responsable?: { UtilisateurId: number } | null;
  };
};

export const runForSyndic = internalAction({
  args: { secibSyndicPersonneId: v.string() },
  handler: async (
    ctx,
    args,
  ): Promise<{
    imported: number;
    updated: number;
    skippedArchived: number;
    failed: Record<string, string>;
  }> => {
    const org = await ctx.runQuery(internal.organizations.getBySecibPersonneId, {
      secibSyndicPersonneId: args.secibSyndicPersonneId,
    });
    if (!org) {
      throw new ConvexError({
        code: "import.org_not_found",
        message: `No organization with secibSyndicPersonneId ${args.secibSyndicPersonneId}. Run seed:upsertSyndicOrg first.`,
      });
    }
    const author = await ctx.runQuery(internal.users.getFirstNplAdmin, {});
    if (!author) {
      throw new ConvexError({
        code: "import.no_npl_admin",
        message: "No npl_admin user provisioned — needed as import author.",
      });
    }

    // 1. Dossiers où le syndic est partie, filtrés client (TypePartieId 1),
    //    dédoublonnés (un dossier peut porter plusieurs parties parent/enfant).
    const parties = await secibFetch<PartiesResponse>(ctx, SYSTEM_FETCH_ACTOR, {
      endpoint: `/personnes/${args.secibSyndicPersonneId}/dossiers`,
      targetType: "personne_dossiers",
      targetId: args.secibSyndicPersonneId,
    });
    const dossierIds = [
      ...new Set(
        (parties.data ?? [])
          .filter((p) => p.TypePartieId === 1)
          .map((p) => p.Dossier.DossierId),
      ),
    ];

    // 2. Détail par dossier — erreur isolée par dossier (pattern S2c).
    let imported = 0;
    let updated = 0;
    let skippedArchived = 0;
    const failed: Record<string, string> = {};

    for (const dossierId of dossierIds) {
      try {
        const detail = await secibFetch<DetailResponse>(ctx, SYSTEM_FETCH_ACTOR, {
          endpoint: `/dossiers/${dossierId}`,
          targetType: "dossier",
          targetId: String(dossierId),
        });
        const d = detail.data;
        if (!d) throw new Error("empty detail payload");
        if (d.IsArchive) {
          skippedArchived += 1;
          continue;
        }
        const parsedDate = d.DateCreation ? Date.parse(d.DateCreation) : NaN;
        const result = await ctx.runMutation(internal.cases.upsertFromSecib, {
          organizationId: org._id,
          authorUserId: author._id,
          snapshot: {
            secibDossierId: String(d.DossierId),
            secibLibelle: d.Nom,
            secibCodeMatiere: d.Matiere
              ? String(d.Matiere.MatiereId)
              : undefined,
            secibDateOuverture: Number.isNaN(parsedDate)
              ? undefined
              : parsedDate,
            secibIntervenantId: d.Responsable
              ? String(d.Responsable.UtilisateurId)
              : undefined,
          },
        });
        if (result === "inserted") imported += 1;
        else updated += 1;
      } catch (error) {
        failed[String(dossierId)] =
          error instanceof Error ? error.message.slice(0, 200) : String(error);
      }
    }

    const outcome = Object.keys(failed).length === 0 ? "completed" : "failed";
    await ctx.runMutation(
      internal.auditLogs.append,
      cronRunRow("import-secib-dossiers", outcome, {
        secibSyndicPersonneId: args.secibSyndicPersonneId,
        imported,
        updated,
        skippedArchived,
        failed,
      }),
    );

    return { imported, updated, skippedArchived, failed };
  },
});
```

- [ ] **Step 2: Typecheck + commit**

```bash
npx tsc --noEmit -p convex 2>&1 | tail -3
```

(Erreurs limitées à `internal.cases`/`internal.organizations.getBySecibPersonneId`/`internal.users.getFirstNplAdmin` inconnus = codegen-gated, attendu.)

```bash
git add convex/importSecib.ts && git commit -m "feat(s2d): importSecib.runForSyndic — enriched idempotent import of pilot syndic dossiers"
```

---

## Task 8: Playground — bouton query

**Files:**
- Modify: `apps/frontend/src/app/convex-poc/dossiers/page.tsx`

⚠ Une erreur de `useQuery` Convex **throw au rendu React** (contrairement aux actions dont l'erreur se catch dans le handler). Le résultat de la query est donc rendu dans un composant dédié enveloppé d'un ErrorBoundary minimal — sinon le clic en rôle syndic (forbidden attendu) ferait crasher la page.

- [ ] **Step 1: Ajouter la référence query + le composant résultat**

Sous les `makeFunctionReference` existants, ajouter :

```tsx
const dossiersIntervenantQuery = makeFunctionReference<"query">(
  "cases:dossiersOuJeSuisIntervenant",
);
```

Ajouter en fin de fichier (niveau module) :

```tsx
// Erreurs de useQuery = throw au rendu → boundary local pour afficher
// la ConvexError (forbidden / no_secib_intervenant_id) au lieu de
// crasher la page.
class QueryErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <pre style={{ color: "#b00020", whiteSpace: "pre-wrap", fontSize: 13 }}>
          {this.state.error.message}
        </pre>
      );
    }
    return this.props.children;
  }
}

function IntervenantResult() {
  const data = useQuery(dossiersIntervenantQuery, {});
  if (data === undefined) return <p>Loading…</p>;
  return (
    <pre style={{ whiteSpace: "pre-wrap", fontSize: 13 }}>
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}
```

(`React` : compléter l'import existant — `import React, { useState } from "react";`.)

- [ ] **Step 2: Brancher le bouton dans `PlaygroundContent`**

Ajouter un state à côté des states existants :

```tsx
const [showIntervenant, setShowIntervenant] = useState(false);
```

Ajouter le bouton après `dossiersDuSyndic` (mêmes styles que les boutons existants) :

```tsx
<button onClick={() => setShowIntervenant((s) => !s)} style={/* style des boutons existants */}>
  dossiersOuJeSuisIntervenant
</button>
```

Et la zone de rendu après la zone de résultat existante :

```tsx
{showIntervenant && (
  <section style={{ marginTop: 16 }}>
    <h2 style={{ fontSize: 18, fontWeight: 600 }}>cases:dossiersOuJeSuisIntervenant</h2>
    <QueryErrorBoundary>
      <IntervenantResult />
    </QueryErrorBoundary>
  </section>
)}
```

(Adapter les styles inline à ceux du fichier — reprendre exactement les styles des boutons/sections existants.)

- [ ] **Step 3: Lint + commit**

```bash
cd apps/frontend && npx next lint --file src/app/convex-poc/dossiers/page.tsx 2>&1 | tail -3 && cd ../..
git add apps/frontend/src/app/convex-poc/dossiers/page.tsx && git commit -m "feat(s2d): playground button for dossiersOuJeSuisIntervenant query"
```

---

## Task 9: Codegen + deploy

**Files:** aucun. ⚠ Admin key requise (header du plan).

- [ ] **Step 1: Codegen + typecheck complet**

```bash
pnpm exec convex codegen && npx tsc --noEmit -p convex 2>&1 | tail -2
```

Expected : `No errors found`. Si TS7022 (inférence circulaire) sur `runForSyndic` ou `dossiersOuJeSuisIntervenant` : les annotations de retour explicites sont déjà posées — vérifier qu'elles n'ont pas été omises.

- [ ] **Step 2: Deploy**

```bash
pnpm convex:deploy 2>&1 | tail -3
```

Expected : `✔ Deployed Convex functions`.

---

## Task 10: Orgs pilotes + exécution de l'import

**Files:** aucun (MCP logto-npl + `convex run`).

- [ ] **Step 1: Créer les 2 orgs Logto réelles** (MCP `mcp__logto-npl__create_organization`)

- name « L'Immobilière du Bourg », description « Syndic pilote immonpl — SECIB PersonneId 5847 »
- name « Agence Choix Immo », description « Syndic pilote immonpl — SECIB PersonneId 3226 »

Noter les deux `id` Logto retournés.

- [ ] **Step 2: Upsert des orgs Convex**

```bash
pnpm convex:run seed:upsertSyndicOrg '{"logtoOrgId":"<LOGTO_ORG_ID_BOURG>","name":"L'\''Immobilière du Bourg","secibSyndicPersonneId":"5847"}'
pnpm convex:run seed:upsertSyndicOrg '{"logtoOrgId":"<LOGTO_ORG_ID_CHOIX>","name":"Agence Choix Immo","secibSyndicPersonneId":"3226"}'
```

Expected : 1er → `action: "promoted"` (même `organizationId` que l'org test S2B `k97018cw204t2mhbdtnatyn8j588hb6r`) ; 2e → `action: "created"`.

- [ ] **Step 3: Import Immobilière du Bourg + test d'idempotence**

```bash
pnpm convex:run importSecib:runForSyndic '{"secibSyndicPersonneId":"5847"}'
pnpm convex:run importSecib:runForSyndic '{"secibSyndicPersonneId":"5847"}'
```

Expected : 1er run `imported: ~14, updated: 0, failed: {}` ; 2e run `imported: 0, updated: ~14` (idempotence).

- [ ] **Step 4: Import Choix Immo**

```bash
pnpm convex:run importSecib:runForSyndic '{"secibSyndicPersonneId":"3226"}'
```

Expected : `imported + skippedArchived ≈ 128`, `failed: {}`.

- [ ] **Step 5: Vérifier les tables**

```bash
pnpm exec convex data cases --limit 5 --order desc
pnpm exec convex data auditLogs --limit 4 --order desc
```

Expected : cases avec snapshot `secib*` rempli, `status: "CREE"`, sans `principalCents` ; lignes `cron.import-secib-dossiers.completed` avec compteurs.

- [ ] **Step 6: Mapper Nancy sur le user de test**

```bash
pnpm convex:run seed:setUserSecibIntervenantId '{"logtoUserId":"y603zurdjehk","secibIntervenantId":"3"}'
```

---

## Task 11: Validation E2E playground

**Files:** aucun.

- [ ] **Step 1: En npl_admin** — https://immo.nplavocat.com/convex-poc/dossiers (après redeploy frontend du merge, OU en local `pnpm --filter frontend dev`), login `npl_test_admin` → bouton `dossiersOuJeSuisIntervenant` → liste des cases dont `secibIntervenantId === "3"` (dossiers dont Nancy est responsable).
- [ ] **Step 2: En syndic** — login `syndic_test_s2b` → même bouton → erreur `auth.forbidden` affichée par le boundary (pas de crash).
- [ ] **Step 3: Non-régression** — en syndic, `dossiersDuSyndic` → ✓ 14 dossiers.

---

## Task 12: Push + PR

- [ ] **Step 1: Push + PR**

```bash
git push -u origin feat/convex-s2d-import
gh pr create --base main --head feat/convex-s2d-import --title "feat(s2d): import dossiers SECIB pilotes + dossiersOuJeSuisIntervenant" --body "<résumé : décisions Q1-Q3 du spec, compteurs d'import réels constatés, validation E2E>"
```

- [ ] **Step 2: Relayer l'URL + compteurs réels à l'utilisateur**

---

## Self-review (fait à l'écriture)

- **Couverture spec** : schéma ✔ (Task 2), orgs ✔ (Tasks 5+10), import enrichi/filtré/idempotent ✔ (Tasks 6-7, wrapper `{data}` du gateway pris en compte), query + requireRoleQuery + factory ✔ (Tasks 3+6), mapping Nancy ✔ (Tasks 5+10), playground ✔ (Task 8 avec ErrorBoundary — useQuery throw au rendu), validation ✔ (Tasks 10-11).
- **Types cohérents** : `requireRoleQuery` retourne le doc user complet (Task 3) → `user.secibIntervenantId` lu en Task 6 ; `internal.cases.upsertFromSecib` (Task 6) appelé en Task 7 avec le même shape `snapshot` ; retours annotés explicitement (anti-TS7022).
- **Contrainte "use node"** : `importSecib.ts` ne contient que l'action ; mutation/queries dans `cases.ts`/`organizations.ts`/`users.ts` (runtime défaut).
