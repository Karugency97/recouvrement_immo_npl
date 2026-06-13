# S5a — Fondation workspace admin + push SECIB — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Le cabinet dispose d'un workspace `(admin)` sous Logto/Convex pour voir tous les dossiers, changer leur statut, répondre aux messages des syndics, et **pousser dans le vrai SECIB** (manuellement, par dossier, idempotent) les dossiers créés par le wizard syndic.

**Architecture:** Backend — nouvelles queries/mutations cabinet dans `cases.ts` + `messages.ts`, helpers d'écriture SECIB dans `lib/secibWrite.ts`, et les deux actions `secibPush.ts` (`previewPush` lecture seule, `runPush` `"use node"` qui crée Personne → Dossier → Parties puis patche le case). Frontend — `(admin)` migre de Directus vers Logto (middleware + layout client sur `users.me`), liste + détail des dossiers réécrits sur Convex, panneau de push.

**Tech Stack:** Convex 1.39 self-hosted (`"use node"` actions + `secibFetch` POST gateway), Next.js 15 App Router (client components), ShadCN (table/select/card/tabs/textarea/button/badge/dialog), Sonner, `@logto/next/edge`. Frontend via `makeFunctionReference` (jamais d'import `convex/_generated`).

**Spec:** `docs/superpowers/specs/2026-06-13-convex-s5a-admin-push-design.md`

**Repo pattern note:** pas de tests unitaires (ni vitest ni jest) — la vérif par tâche = `npx convex dev --once` (codegen + typecheck Convex) côté backend, `pnpm --filter frontend build` côté frontend, `npx convex run` pour les smoke checks, et validation E2E navigateur en fin de sprint. **Admin key Convex** (deploy) : memory `reference-convex-admin-key-retrieval`. **prefetch={false}** sur tout `<Link>` d'une route gardée Logto (memory `reference-rsc-prefetch-proxy-cors`). **`v.number()` accepte NaN** (memory `reference-convex-vnumber-accepts-nan`) — pertinent pour `matiereId`/`responsableId` du push (valider `Number.isFinite`). **secibFetch redactResponse** (memory `reference-secibfetch-redact-large-responses`) — non pertinent ici (les créations renvoient de petits JSON).

**Codegen note:** les nouveaux exports sont inconnus de `_generated` tant que `npx convex dev --once` (ou `codegen`) n'a pas tourné ; des erreurs tsc limitées à `internal.*` / `api.*` avant codegen sont **attendues**. Le frontend n'importe jamais `convex/_generated` (refs via `makeFunctionReference`).

**SECIB write note (CRITIQUE) :** les shapes de DTO d'écriture sont validées en prod pour l'affaire SEXTUS (memory `secib_dto_gotchas`) mais **jamais exercées depuis Convex**. Le push DOIT être validé sur le **dossier sandbox 164 / un débiteur jetable AVANT tout dossier réel** (Task 17). Pièges connus, encodés dans `lib/secibWrite.ts` :
- `POST /dossiers` : **ne jamais envoyer `Code`** (SECIB le génère, le gateway le strippe). Champs requis : `Nom`, `MatiereId`, `ResponsableId`, `SiteId: 1`, `Type: "Contentieux"` (SECIB mappe → `"D"`).
- `POST /parties` : body **imbriqué** `{ Dossier: { DossierId }, Personne: { PersonneId }, TypePartieId, Facturable, ParentPartieId: 0 }` — à plat = **HTTP 500**.
- `POST /personnes` : sans `PersonneId` = create (retourne `PersonneId`) ; avec = update. `NomCourt` n'est PAS auto-généré → le passer explicitement.
- Le gateway enveloppe toute réponse `{ data: <réponse SECIB> }` (helper `ok()`), donc `secibFetch` renvoie `{ data: ... }` — déballer `.data`.

---

## Task 1: Pre-flight

**Files:** aucun.

- [x] **Step 1: Vérifier la branche**

```bash
cd /Users/mkstudio/Desktop/recouvrement_immo_npl && git branch --show-current && git status --short
```

Expected : `feat/convex-s5a-admin-push` ; fichiers untracked (`convex/_generated/`) tolérés.

- [x] **Step 2: Vérifier les fondations attendues**

```bash
grep -c "requireRoleMutation\|requireRoleQuery\|NPL_FULL_ACCESS_ROLES\|SYNDIC_ROLES" convex/lib/auth.ts && \
grep -c "pendingSecibPush\|by_pending_push\|previousStatus\|statusChangedByUserId" convex/schema.ts && \
grep -c "export async function secibFetch" convex/lib/secibFetch.ts && \
grep -c "MATIERES_CONTENTIEUX\|INTERVENANTS" convex/schema.ts
```

Expected : chaque commande ≥ 1.

- [x] **Step 3: Vérifier que la base Convex tourne (codegen/typecheck local)**

```bash
npx convex dev --once 2>&1 | tail -5
```

Expected : se termine sans erreur de schéma (le codegen régénère `convex/_generated`). Si erreur d'auth admin key, voir memory `reference-convex-admin-key-retrieval`.

---

## Task 2: Lecture des référentiels pour le push — `cachedReferentials.readForPush`

Le panneau de push a besoin des matières contentieux + intervenants (rafraîchis chaque nuit par le cron S2c). On expose une query publique qui lit le cache et renvoie les deux payloads, **réservée aux rôles NPL full access**.

**Files:**
- Modify: `convex/cachedReferentials.ts`

- [x] **Step 1: Ajouter la query `readForPush` à la fin de `convex/cachedReferentials.ts`**

Ajouter les imports en tête de fichier (remplacer la ligne d'import existante) :

```ts
import { internalMutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireRoleQuery, NPL_FULL_ACCESS_ROLES } from "./lib/auth";
```

Puis ajouter à la fin du fichier :

```ts
// Référentiels nécessaires au panneau de push SECIB (S5a) : matières
// contentieux + intervenants. Réservé au cabinet (full access). Le payload
// est la réponse gateway telle que cachée ({ data: ... }) — le frontend la
// parse défensivement (la forme exacte SECIB n'est pas garantie). Renvoie
// null par kind si le cache est vide (cron jamais passé).
export const readForPush = query({
  args: {},
  handler: async (ctx) => {
    await requireRoleQuery(ctx, NPL_FULL_ACCESS_ROLES);
    const matieres = await ctx.db
      .query("cachedReferentials")
      .withIndex("by_kind", (q) => q.eq("kind", "MATIERES_CONTENTIEUX"))
      .unique();
    const intervenants = await ctx.db
      .query("cachedReferentials")
      .withIndex("by_kind", (q) => q.eq("kind", "INTERVENANTS"))
      .unique();
    return {
      matieres: matieres?.payload ?? null,
      intervenants: intervenants?.payload ?? null,
    };
  },
});
```

- [x] **Step 2: Codegen + typecheck**

```bash
npx convex dev --once 2>&1 | tail -5
```

Expected : pas d'erreur (hors `internal.*`/`api.*` si codegen pas encore régénéré — relancer une 2ᵉ fois si besoin).

- [x] **Step 3: Commit**

```bash
rtk git add convex/cachedReferentials.ts && rtk git commit -m "$(cat <<'EOF'
feat(s5a): cachedReferentials.readForPush — matières + intervenants (cabinet)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Queries cabinet — `cases.allForCabinet` + `cases.getByIdForCabinet`

Le cabinet voit TOUS les dossiers (tous syndics) avec le nom de l'org. `npl_avocat` garde sa query scopée existante (`dossiersOuJeSuisIntervenant`).

**Files:**
- Modify: `convex/cases.ts`

- [x] **Step 1: Étendre les imports en tête de `convex/cases.ts`**

Remplacer le bloc d'import existant par :

```ts
import { internalMutation, internalQuery, query, mutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import {
  requireRoleQuery,
  requireRoleMutation,
  SYNDIC_ROLES,
  NPL_FULL_ACCESS_ROLES,
} from "./lib/auth";
import { noSecibIntervenantId } from "./lib/errors";
```

- [x] **Step 2: Ajouter `allForCabinet` à la fin de `convex/cases.ts`**

```ts
// Liste GLOBALE pour le cabinet — tous les dossiers, tous syndics, avec
// le nom de l'org résolu (le cabinet doit savoir de quel syndic vient
// chaque dossier). Réservé NPL full access ; npl_avocat passe par sa
// query scopée dossiersOuJeSuisIntervenant. Pas de projection restrictive :
// le cabinet voit tout. collect() : volumétrie pilote ≤ ~150 docs.
export const allForCabinet = query({
  args: {},
  handler: async (ctx) => {
    await requireRoleQuery(ctx, NPL_FULL_ACCESS_ROLES);
    const rows = await ctx.db.query("cases").collect();
    // Résolution org → nom. Cache local des orgs déjà vues pour éviter
    // N lectures redondantes quand plusieurs dossiers partagent une org.
    const orgNames = new Map<string, string>();
    const result = [];
    for (const c of rows) {
      let orgName = orgNames.get(c.organizationId);
      if (orgName === undefined) {
        const org = await ctx.db.get(c.organizationId);
        orgName = org?.name ?? "—";
        orgNames.set(c.organizationId, orgName);
      }
      result.push({
        _id: c._id,
        organizationName: orgName,
        status: c.status,
        statusChangedAt: c.statusChangedAt,
        principalCents: c.principalCents,
        debiteur: c.debiteur,
        secibDossierId: c.secibDossierId,
        secibLibelle: c.secibLibelle,
        secibMatiereLibelle: c.secibMatiereLibelle,
        pendingSecibPush: c.pendingSecibPush ?? false,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      });
    }
    return result;
  },
});

// Détail complet d'un case pour le cabinet (full access — aucune
// restriction de champ). Renvoie null si l'id n'existe pas.
export const getByIdForCabinet = query({
  args: { caseId: v.id("cases") },
  handler: async (ctx, args) => {
    await requireRoleQuery(ctx, NPL_FULL_ACCESS_ROLES);
    const c = await ctx.db.get(args.caseId);
    if (!c) return null;
    const org = await ctx.db.get(c.organizationId);
    return { ...c, organizationName: org?.name ?? "—" };
  },
});
```

- [x] **Step 3: Codegen + typecheck**

```bash
npx convex dev --once 2>&1 | tail -5
```

Expected : pas d'erreur de schéma.

- [x] **Step 4: Commit**

```bash
rtk git add convex/cases.ts && rtk git commit -m "$(cat <<'EOF'
feat(s5a): cases.allForCabinet + getByIdForCabinet (full access)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Mutation de statut — `cases.setStatus`

**Files:**
- Modify: `convex/cases.ts`

- [x] **Step 1: Ajouter le validateur de statut + `setStatus` à la fin de `convex/cases.ts`**

```ts
// Union des 9 statuts — dupliqué du schéma pour valider l'argument côté
// mutation (le schéma n'exporte pas son union). Garder synchro avec
// convex/schema.ts cases.status.
const statusValidator = v.union(
  v.literal("CREE"),
  v.literal("EN_ATTENTE_PIECES"),
  v.literal("PRET"),
  v.literal("MISE_EN_DEMEURE_ENVOYEE"),
  v.literal("INJONCTION_DE_PAYER"),
  v.literal("ASSIGNATION_AU_FOND"),
  v.literal("JUGEMENT_OBTENU"),
  v.literal("CLOTURE"),
  v.literal("SUSPENDU"),
);

// Changement de statut par le cabinet. Transition libre (le cabinet sait
// ce qu'il fait — pas de machine à états contraignante en S5a). Pose
// previousStatus / statusChangedAt / statusChangedByUserId + trace audit.
// No-op silencieux si le statut est inchangé (évite une ligne d'audit vide).
export const setStatus = mutation({
  args: { caseId: v.id("cases"), status: statusValidator },
  handler: async (ctx, args): Promise<{ changed: boolean }> => {
    const user = await requireRoleMutation(ctx, NPL_FULL_ACCESS_ROLES);
    const caseDoc = await ctx.db.get(args.caseId);
    if (!caseDoc) {
      throw new ConvexError({
        code: "case.not_found",
        message: `Case ${args.caseId} introuvable.`,
      });
    }
    if (caseDoc.status === args.status) {
      return { changed: false };
    }
    const now = Date.now();
    await ctx.db.patch(args.caseId, {
      previousStatus: caseDoc.status,
      status: args.status,
      statusChangedAt: now,
      statusChangedByUserId: user._id,
      updatedAt: now,
    });
    await ctx.runMutation(internal.auditLogs.append, {
      actorLogtoUserId: user.logtoUserId,
      actorUserId: user._id,
      actorRole: user.role,
      actorOrganizationId: user.organizationId,
      action: "case.status_changed",
      targetType: "case",
      targetId: args.caseId,
      metadata: { from: caseDoc.status, to: args.status },
    });
    return { changed: true };
  },
});
```

- [x] **Step 2: Ajouter l'import `internal` en tête de `convex/cases.ts`**

Après la ligne `import { v, ConvexError } from "convex/values";`, ajouter :

```ts
import { internal } from "./_generated/api";
```

- [x] **Step 3: Codegen + typecheck**

```bash
npx convex dev --once 2>&1 | tail -5
```

Expected : pas d'erreur.

- [x] **Step 4: Commit**

```bash
rtk git add convex/cases.ts && rtk git commit -m "$(cat <<'EOF'
feat(s5a): cases.setStatus — transition + audit (cabinet)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Réponse cabinet — `messages.sendAsCabinet` + email syndic

**Files:**
- Modify: `convex/messages.ts`
- Modify: `convex/email.ts`
- Modify: `convex/users.ts`

- [x] **Step 1: Ajouter une query interne `users.syndicEmailsForOrg` à la fin de `convex/users.ts`**

```ts
// Emails des utilisateurs syndic d'une org — destinataires de la
// notification "réponse du cabinet" (S5a). Internal : appelée par l'action
// email. Filtre sur les rôles syndic (un npl_* rattaché à l'org ne doit
// pas recevoir la notif destinée au syndic).
export const syndicEmailsForOrg = internalQuery({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const users = await ctx.db
      .query("users")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId),
      )
      .collect();
    return users
      .filter(
        (u) => u.role === "syndic_admin" || u.role === "syndic_gestionnaire",
      )
      .map((u) => u.email);
  },
});
```

- [x] **Step 2: Ajouter `sendAsCabinet` à la fin de `convex/messages.ts`**

D'abord, vérifier que les imports en tête couvrent `NPL_FULL_ACCESS_ROLES` (déjà importé). Puis ajouter :

```ts
// Réponse du cabinet sur un dossier. senderRole "avocat" (affiché
// "Cabinet NPL" côté syndic). Schedule la notif email au syndic (découplé,
// gracieux). Réservé NPL full access en S5a — l'avocat scopé viendra avec
// l'extension intervenant de caseAccess (note S5 dans caseAccess.ts).
export const sendAsCabinet = mutation({
  args: { caseId: v.id("cases"), body: v.string() },
  handler: async (ctx, args): Promise<{ messageId: string }> => {
    const user = await requireRoleMutation(ctx, NPL_FULL_ACCESS_ROLES);
    const caseDoc = await ctx.db.get(args.caseId);
    if (!caseDoc) {
      throw new ConvexError({
        code: "case.not_found",
        message: `Case ${args.caseId} introuvable.`,
      });
    }
    if (!args.body.trim()) {
      throw new ConvexError({
        code: "message.empty",
        message: "Le message ne peut pas être vide.",
      });
    }
    const messageId = await ctx.db.insert("messages", {
      caseId: args.caseId,
      senderUserId: user._id,
      senderRole: "avocat" as const,
      body: args.body.trim(),
      createdAt: Date.now(),
    });
    await ctx.scheduler.runAfter(0, internal.email.notifySyndicReply, {
      caseId: args.caseId,
      messageId,
    });
    return { messageId };
  },
});
```

- [x] **Step 3: Ajouter `notifySyndicReply` à la fin de `convex/email.ts`**

```ts
// Notifie le(s) syndic(s) d'une org qu'le cabinet a répondu. Réutilise
// sendEmail (gracieux : sans RESEND_API_KEY → skip + audit, ne throw jamais).
// Un email par destinataire syndic ; skip+audit si l'org n'a aucun syndic.
export const notifySyndicReply = internalAction({
  args: { caseId: v.id("cases"), messageId: v.id("messages") },
  handler: async (ctx, args): Promise<void> => {
    const message = await ctx.runQuery(internal.messages.getByIdInternal, {
      messageId: args.messageId,
    });
    const caseDoc = await ctx.runQuery(internal.cases.getByIdInternal, {
      caseId: args.caseId,
    });
    if (!message || !caseDoc) {
      await auditEmail(ctx, "skipped", {
        reason: "message_or_case_missing",
        messageId: args.messageId,
        caseId: args.caseId,
      });
      return;
    }
    const emails = await ctx.runQuery(internal.users.syndicEmailsForOrg, {
      organizationId: caseDoc.organizationId,
    });
    if (emails.length === 0) {
      await auditEmail(ctx, "skipped", {
        reason: "no_syndic_recipient",
        caseId: args.caseId,
      });
      return;
    }
    const libelle = escapeHtml(caseDoc.secibLibelle ?? "Dossier");
    const extrait = escapeHtml(message.body.slice(0, 300));
    const url = `https://immo.nplavocat.com/dossiers/${args.caseId}`;
    for (const to of emails) {
      await ctx.runAction(internal.email.sendEmail, {
        to,
        subject: `Réponse du cabinet — ${libelle}`,
        html: `<p>Le cabinet NPL a répondu sur le dossier <strong>${libelle}</strong> :</p>
<blockquote>${extrait}</blockquote>
<p><a href="${url}">Ouvrir le dossier</a></p>`,
      });
    }
  },
});
```

- [x] **Step 4: Codegen + typecheck**

```bash
npx convex dev --once 2>&1 | tail -5
```

Expected : pas d'erreur.

- [x] **Step 5: Commit**

```bash
rtk git add convex/messages.ts convex/email.ts convex/users.ts && rtk git commit -m "$(cat <<'EOF'
feat(s5a): messages.sendAsCabinet + notifySyndicReply email

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Helpers d'écriture SECIB — `convex/lib/secibWrite.ts`

Trois helpers POST via `secibFetch`. **Chaque DTO encode un piège connu** (voir l'en-tête SECIB write note). Module `"use node"`-compatible (importé par une action `"use node"`).

**Files:**
- Create: `convex/lib/secibWrite.ts`

- [x] **Step 1: Écrire `convex/lib/secibWrite.ts`**

```ts
import type { ActionCtx } from "../_generated/server";
import type { FetchActor } from "./secibFetch";
import { secibFetch } from "./secibFetch";

// ─────────────────────────────────────────────────────────────────
// Helpers d'écriture SECIB (POST via le gateway). Le gateway enveloppe
// toute réponse { data: <réponse SECIB> } → on déballe .data.
//
// ⚠ Shapes validées en prod pour l'affaire SEXTUS (memory secib_dto_gotchas)
// mais JAMAIS exercées depuis Convex. À valider sur le sandbox (dossier 164 /
// débiteur jetable) avant tout dossier réel — cf. plan Task 17.
// ─────────────────────────────────────────────────────────────────

type DebiteurInput = {
  type: "PP" | "PM";
  nom: string;
};

// POST /personnes (→ SECIB /Personne/Post). Sans PersonneId = create.
// NomCourt n'est PAS auto-généré → on le passe explicitement (sinon SECIB
// génère un libellé tordu). On NE mappe PAS adresse/email/téléphone : les
// noms de champs SECIB ne sont pas garantis et un champ inconnu fait
// échouer la création — le cabinet complète la personne dans SECIB si besoin.
// Salutation/Qualité = 0 (non renseigné) : le wizard ne capture pas le genre.
export async function createPersonne(
  ctx: ActionCtx,
  actor: FetchActor,
  debiteur: DebiteurInput,
): Promise<{ personneId: number }> {
  const body = {
    Nom: debiteur.nom,
    NomCourt: debiteur.nom,
    SalutationId: debiteur.type === "PM" ? 3 : 0,
    QualiteId: 0,
  };
  const res = await secibFetch<{ data?: { PersonneId?: number } }>(ctx, actor, {
    endpoint: "/personnes",
    targetType: "personne_create",
    targetId: debiteur.nom,
    method: "POST",
    body,
  });
  const personneId = res.data?.PersonneId;
  if (typeof personneId !== "number") {
    throw new Error(
      `Création personne SECIB : pas de PersonneId retourné (réponse ${JSON.stringify(res).slice(0, 200)}).`,
    );
  }
  return { personneId };
}

// POST /dossiers (→ SECIB /Dossier/Post). NE PAS envoyer Code (auto-généré,
// strippé par le gateway). Type "Contentieux" (SECIB mappe → "D"). SiteId 1.
export async function createDossier(
  ctx: ActionCtx,
  actor: FetchActor,
  input: { nom: string; matiereId: number; responsableId: number },
): Promise<{ dossierId: number; code: string | null }> {
  const body = {
    Nom: input.nom,
    MatiereId: input.matiereId,
    ResponsableId: input.responsableId,
    SiteId: 1,
    Type: "Contentieux",
  };
  const res = await secibFetch<{
    data?: { DossierId?: number; Code?: string | null };
  }>(ctx, actor, {
    endpoint: "/dossiers",
    targetType: "dossier_create",
    targetId: input.nom,
    method: "POST",
    body,
  });
  const dossierId = res.data?.DossierId;
  if (typeof dossierId !== "number") {
    throw new Error(
      `Création dossier SECIB : pas de DossierId retourné (réponse ${JSON.stringify(res).slice(0, 200)}).`,
    );
  }
  return { dossierId, code: res.data?.Code ?? null };
}

// POST /parties (→ SECIB /Partie/Post). Body IMBRIQUÉ obligatoire
// { Dossier:{DossierId}, Personne:{PersonneId} } — à plat = HTTP 500.
// TypePartieId : 1 = client, 2 = adversaire.
export async function createPartie(
  ctx: ActionCtx,
  actor: FetchActor,
  input: {
    dossierId: number;
    personneId: number;
    typePartieId: 1 | 2;
    facturable: boolean;
  },
): Promise<void> {
  const body = {
    Dossier: { DossierId: input.dossierId },
    Personne: { PersonneId: input.personneId },
    TypePartieId: input.typePartieId,
    Facturable: input.facturable,
    ParentPartieId: 0,
  };
  await secibFetch(ctx, actor, {
    endpoint: "/parties",
    targetType: "partie_create",
    targetId: `${input.dossierId}:${input.personneId}`,
    method: "POST",
    body,
  });
}
```

- [x] **Step 2: Codegen + typecheck**

```bash
npx convex dev --once 2>&1 | tail -5
```

Expected : pas d'erreur.

- [x] **Step 3: Commit**

```bash
rtk git add convex/lib/secibWrite.ts && rtk git commit -m "$(cat <<'EOF'
feat(s5a): lib/secibWrite — createPersonne/Dossier/Partie helpers

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Action d'aperçu — `secibPush.previewPush`

Lecture seule : charge le case, cherche un débiteur existant dans SECIB, renvoie le DTO d'aperçu. Aucune écriture.

**Files:**
- Create: `convex/secibPush.ts`

- [x] **Step 1: Écrire `convex/secibPush.ts` (previewPush seulement — runPush ajouté Task 8)**

```ts
"use node";

import { action } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { internal } from "./_generated/api";
import { withAuditLog } from "./lib/audit";
import { secibFetch } from "./lib/secibFetch";
import { NPL_FULL_ACCESS_ROLES } from "./lib/auth";
import { forbidden } from "./lib/errors";

// Extracteur défensif : la réponse de recherche personne SECIB n'a pas de
// forme garantie (array | { data } | { Resultats }). On renvoie un tableau
// best-effort de { PersonneId, Nom } pour que le cabinet repère un doublon ;
// jamais d'exception sur une forme inattendue (→ tableau vide).
function extractPersonneMatches(
  raw: unknown,
): { personneId: number; nom: string }[] {
  const candidates =
    Array.isArray(raw)
      ? raw
      : Array.isArray((raw as { data?: unknown })?.data)
        ? (raw as { data: unknown[] }).data
        : Array.isArray((raw as { Resultats?: unknown })?.Resultats)
          ? (raw as { Resultats: unknown[] }).Resultats
          : [];
  const out: { personneId: number; nom: string }[] = [];
  for (const item of candidates) {
    const o = item as { PersonneId?: unknown; Nom?: unknown; NomCourt?: unknown };
    if (typeof o.PersonneId === "number") {
      out.push({
        personneId: o.PersonneId,
        nom: String(o.NomCourt ?? o.Nom ?? o.PersonneId),
      });
    }
  }
  return out;
}

// Aperçu du push : ce qui sera créé dans SECIB. Aucune écriture. Réservé
// au cabinet (full access). Cherche un débiteur homonyme pour proposer la
// réutilisation (évite un doublon de Personne).
export const previewPush = action({
  args: { caseId: v.id("cases") },
  handler: async (ctx, args): Promise<unknown> => {
    return await withAuditLog(
      ctx,
      {
        action: "secib.preview_push",
        targetType: "case",
        targetId: args.caseId,
      },
      async (audit) => {
        if (!(NPL_FULL_ACCESS_ROLES as readonly string[]).includes(audit.role)) {
          throw forbidden(audit.role, NPL_FULL_ACCESS_ROLES);
        }
        const caseDoc = await ctx.runQuery(internal.cases.getByIdInternal, {
          caseId: args.caseId,
        });
        if (!caseDoc) {
          throw new ConvexError({
            code: "case.not_found",
            message: `Case ${args.caseId} introuvable.`,
          });
        }
        if (!caseDoc.debiteur) {
          throw new ConvexError({
            code: "push.no_debiteur",
            message:
              "Ce dossier n'a pas de débiteur structuré (créé hors wizard ?) — push impossible.",
          });
        }
        const org = await ctx.runQuery(internal.organizations.getById, {
          id: caseDoc.organizationId,
        });
        if (!org?.secibSyndicPersonneId) {
          throw new ConvexError({
            code: "push.no_syndic_personne",
            message: `L'organisation "${org?.name ?? "?"}" n'a pas de secibSyndicPersonneId — impossible de rattacher le syndic comme partie.`,
          });
        }
        // Recherche homonyme (lecture). Échec toléré : la recherche n'est
        // qu'une aide, son échec ne doit pas bloquer l'aperçu.
        let matches: { personneId: number; nom: string }[] = [];
        try {
          const searchRaw = await secibFetch(ctx, audit, {
            endpoint: "/personnes",
            targetType: "personne_search",
            targetId: caseDoc.debiteur.nom,
            params: { denomination: caseDoc.debiteur.nom },
          });
          matches = extractPersonneMatches(searchRaw);
        } catch {
          matches = [];
        }
        return {
          debiteur: caseDoc.debiteur,
          syndicPersonneId: org.secibSyndicPersonneId,
          syndicName: org.name,
          alreadyPushed: Boolean(caseDoc.secibDossierId),
          existingMatches: matches,
        };
      },
    );
  },
});
```

- [x] **Step 2: Codegen + typecheck**

```bash
npx convex dev --once 2>&1 | tail -5
```

Expected : pas d'erreur.

- [x] **Step 3: Commit**

```bash
rtk git add convex/secibPush.ts && rtk git commit -m "$(cat <<'EOF'
feat(s5a): secibPush.previewPush — aperçu DTO + recherche homonyme

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: Action de push — `secibPush.runPush` + `cases.applyPushResult`

Crée Personne (ou réutilise) → Dossier → 2 Parties → patche le case. Idempotent, fail-loud.

**Files:**
- Modify: `convex/cases.ts`
- Modify: `convex/secibPush.ts`

- [x] **Step 1: Ajouter l'internal mutation `applyPushResult` à la fin de `convex/cases.ts`**

```ts
// Applique le résultat d'un push SECIB réussi (appelée par secibPush.runPush
// après création complète Personne+Dossier+Parties). Patch le snapshot SECIB
// et lève le flag pendingSecibPush. Internal : jamais appelée par le client.
export const applyPushResult = internalMutation({
  args: {
    caseId: v.id("cases"),
    secibDossierId: v.string(),
    secibLibelle: v.string(),
    secibCodeMatiere: v.string(),
    secibIntervenantId: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.patch(args.caseId, {
      secibDossierId: args.secibDossierId,
      secibLibelle: args.secibLibelle,
      secibCodeMatiere: args.secibCodeMatiere,
      secibIntervenantId: args.secibIntervenantId,
      secibSnapshotAt: now,
      pendingSecibPush: false,
      updatedAt: now,
    });
  },
});
```

- [x] **Step 2: Ajouter les imports d'écriture en tête de `convex/secibPush.ts`**

Après la ligne `import { secibFetch } from "./lib/secibFetch";`, ajouter :

```ts
import {
  createPersonne,
  createDossier,
  createPartie,
} from "./lib/secibWrite";
```

- [x] **Step 3: Ajouter `runPush` à la fin de `convex/secibPush.ts`**

```ts
// Push effectif dans SECIB. Séquence fail-loud (SECIB n'a pas de transaction
// multi-appels) : Personne (ou réutilisation) → Dossier (sans Code) →
// Partie syndic (client) → Partie débiteur (adversaire) → patch case.
// Idempotent : un case déjà poussé (secibDossierId présent) est refusé.
// En cas d'échec après création du Dossier, on throw avec les IDs créés
// dans metadata audit ; le case reste pendingSecibPush (nettoyage manuel
// du dossier orphelin par le cabinet — accepté au pilote, cf. spec).
export const runPush = action({
  args: {
    caseId: v.id("cases"),
    matiereId: v.number(),
    responsableId: v.number(),
    reuseDebiteurPersonneId: v.optional(v.number()),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{ secibDossierId: string; code: string | null }> => {
    return await withAuditLog(
      ctx,
      {
        action: "secib.run_push",
        targetType: "case",
        targetId: args.caseId,
        metadata: {
          matiereId: args.matiereId,
          responsableId: args.responsableId,
        },
      },
      async (audit) => {
        if (!(NPL_FULL_ACCESS_ROLES as readonly string[]).includes(audit.role)) {
          throw forbidden(audit.role, NPL_FULL_ACCESS_ROLES);
        }
        // v.number() accepte NaN/±Infinity → valider explicitement
        // (memory reference-convex-vnumber-accepts-nan).
        if (
          !Number.isFinite(args.matiereId) ||
          !Number.isFinite(args.responsableId)
        ) {
          throw new ConvexError({
            code: "push.invalid_referentiel",
            message: "Matière et responsable doivent être des entiers valides.",
          });
        }
        const caseDoc = await ctx.runQuery(internal.cases.getByIdInternal, {
          caseId: args.caseId,
        });
        if (!caseDoc) {
          throw new ConvexError({
            code: "case.not_found",
            message: `Case ${args.caseId} introuvable.`,
          });
        }
        // Idempotence : déjà poussé → refus.
        if (caseDoc.secibDossierId || caseDoc.pendingSecibPush === false) {
          throw new ConvexError({
            code: "push.already_done",
            message: "Ce dossier est déjà lié à SECIB (push refusé).",
          });
        }
        if (!caseDoc.debiteur) {
          throw new ConvexError({
            code: "push.no_debiteur",
            message: "Ce dossier n'a pas de débiteur structuré — push impossible.",
          });
        }
        const org = await ctx.runQuery(internal.organizations.getById, {
          id: caseDoc.organizationId,
        });
        if (!org?.secibSyndicPersonneId) {
          throw new ConvexError({
            code: "push.no_syndic_personne",
            message: `L'organisation "${org?.name ?? "?"}" n'a pas de secibSyndicPersonneId.`,
          });
        }
        const syndicPersonneId = Number(org.secibSyndicPersonneId);
        if (!Number.isFinite(syndicPersonneId)) {
          throw new ConvexError({
            code: "push.bad_syndic_personne",
            message: `secibSyndicPersonneId "${org.secibSyndicPersonneId}" n'est pas numérique.`,
          });
        }

        // 1. Débiteur : réutilisation confirmée par le cabinet, ou création.
        const debiteurPersonneId =
          args.reuseDebiteurPersonneId !== undefined
            ? args.reuseDebiteurPersonneId
            : (await createPersonne(ctx, audit, caseDoc.debiteur)).personneId;

        // 2. Dossier (SECIB assigne le Code).
        const nom = `${caseDoc.debiteur.nom} — recouvrement charges`;
        const { dossierId, code } = await createDossier(ctx, audit, {
          nom,
          matiereId: args.matiereId,
          responsableId: args.responsableId,
        });

        // 3. Parties : syndic = client (facturable), débiteur = adversaire.
        await createPartie(ctx, audit, {
          dossierId,
          personneId: syndicPersonneId,
          typePartieId: 1,
          facturable: true,
        });
        await createPartie(ctx, audit, {
          dossierId,
          personneId: debiteurPersonneId,
          typePartieId: 2,
          facturable: false,
        });

        // 4. Patch case (succès complet uniquement).
        await ctx.runMutation(internal.cases.applyPushResult, {
          caseId: args.caseId,
          secibDossierId: String(dossierId),
          secibLibelle: nom,
          secibCodeMatiere: String(args.matiereId),
          secibIntervenantId: String(args.responsableId),
        });

        return { secibDossierId: String(dossierId), code };
      },
    );
  },
});
```

- [x] **Step 4: Codegen + typecheck**

```bash
npx convex dev --once 2>&1 | tail -5
```

Expected : pas d'erreur.

- [x] **Step 5: Commit**

```bash
rtk git add convex/cases.ts convex/secibPush.ts && rtk git commit -m "$(cat <<'EOF'
feat(s5a): secibPush.runPush + cases.applyPushResult (idempotent, fail-loud)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: Deploy backend + smoke checks

**Files:** aucun.

- [ ] **Step 1: Déployer les fonctions Convex**

```bash
npx convex deploy -y 2>&1 | tail -15
```

Expected : déploiement réussi, les nouvelles fonctions (`cases:allForCabinet`, `cases:setStatus`, `messages:sendAsCabinet`, `secibPush:previewPush`, `secibPush:runPush`, `cachedReferentials:readForPush`) listées. Si erreur admin key, voir memory `reference-convex-admin-key-retrieval`.

- [ ] **Step 2: Smoke — les fonctions sont enregistrées (sans identité → forbidden/auth attendu)**

```bash
npx convex run cases:allForCabinet '{}' 2>&1 | tail -5
```

Expected : échoue avec `auth.not_authenticated` (CLI sans identité Logto) — **prouve que la fonction existe et que la garde marche**. Pas un crash de type/déploiement.

- [ ] **Step 3: Smoke — référentiels en cache (le cron S2c a-t-il peuplé ?)**

```bash
npx convex data cachedReferentials 2>&1 | grep -c "MATIERES_CONTENTIEUX\|INTERVENANTS"
```

Expected : `2` si le cron `referentials-refresh` a tourné. Si `0`, déclencher manuellement : `npx convex run referentials:refreshAll '{}'` puis re-vérifier (le panneau de push en a besoin).

---

## Task 10: Frontend — refs + types Convex (`convexApi.ts`)

**Files:**
- Modify: `apps/frontend/src/lib/convexApi.ts`

- [x] **Step 1: Ajouter les refs + types à la fin de `apps/frontend/src/lib/convexApi.ts`**

```ts
// ── S5a workspace admin ──────────────────────────────────────────
export const allForCabinetQuery = makeFunctionReference<"query">("cases:allForCabinet");
export const getByIdForCabinetQuery = makeFunctionReference<"query">("cases:getByIdForCabinet");
export const setStatusMutation = makeFunctionReference<"mutation">("cases:setStatus");
export const sendAsCabinetMutation = makeFunctionReference<"mutation">("messages:sendAsCabinet");
export const previewPushAction = makeFunctionReference<"action">("secibPush:previewPush");
export const runPushAction = makeFunctionReference<"action">("secibPush:runPush");
export const referentialsForPushQuery = makeFunctionReference<"query">("cachedReferentials:readForPush");

export type DebiteurInfo = {
  type: "PP" | "PM";
  nom: string;
  adresse?: string;
  email?: string;
  telephone?: string;
  lotDescription?: string;
};

// Ligne de la liste cabinet (cases:allForCabinet).
export type CabinetCaseRow = {
  _id: string;
  organizationName: string;
  status: CaseStatus;
  statusChangedAt: number;
  principalCents?: number;
  debiteur?: DebiteurInfo;
  secibDossierId?: string;
  secibLibelle?: string;
  secibMatiereLibelle?: string;
  pendingSecibPush: boolean;
  createdAt: number;
  updatedAt: number;
};

// Détail cabinet (cases:getByIdForCabinet) — doc case complet + nom org.
// Champs principaux consommés par l'UI ; le reste passe en optionnel.
export type CabinetCaseDoc = {
  _id: string;
  organizationName: string;
  organizationId: string;
  status: CaseStatus;
  statusChangedAt: number;
  previousStatus?: string;
  principalCents?: number;
  debiteur?: DebiteurInfo;
  secibDossierId?: string;
  secibLibelle?: string;
  secibMatiereLibelle?: string;
  secibCodeMatiere?: string;
  secibIntervenantId?: string;
  pendingSecibPush?: boolean;
  pieces?: CaseDoc["pieces"];
  createdAt: number;
  updatedAt: number;
};

export type PreviewPushResult = {
  debiteur: DebiteurInfo;
  syndicPersonneId: string;
  syndicName: string;
  alreadyPushed: boolean;
  existingMatches: { personneId: number; nom: string }[];
};

// Option de select pour matière/responsable. Le payload référentiel SECIB
// (cachedReferentials) n'a pas de forme garantie → le composant le parse
// défensivement vers { id, label }.
export type ReferentialOption = { id: number; label: string };
```

- [x] **Step 2: Build frontend (typecheck)**

```bash
pnpm --filter frontend build 2>&1 | tail -15
```

Expected : build réussi (ou échoue plus loin sur les pages pas encore créées — à ce stade, seul `convexApi.ts` change, le build doit passer).

- [x] **Step 3: Commit**

```bash
rtk git add apps/frontend/src/lib/convexApi.ts && rtk git commit -m "$(cat <<'EOF'
feat(s5a): convexApi refs + types workspace admin

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 11: Middleware — `/admin` sous Logto

**Files:**
- Modify: `apps/frontend/src/middleware.ts`

- [x] **Step 1: Ajouter `/admin` à `logtoPaths`**

Remplacer le tableau `logtoPaths` :

```ts
// Routes sous auth Logto/Convex. (client) ET (admin) sont sur Convex.
const logtoPaths = [
  "/convex-poc",
  "/dashboard",
  "/dossiers",
  "/documents",
  "/messagerie",
  "/parametres",
  "/admin",
];
```

- [x] **Step 2: Retirer la garde Directus `/admin` (devenue morte)**

Supprimer ce bloc plus bas dans `middleware()` (la garde de rôle est désormais faite par le layout `(admin)` sur `users.me`) :

```ts
  // Role-based route protection (Directus — admin portal only)
  const userRole = request.cookies.get("user_role")?.value;

  if (userRole === "syndic" && pathname.startsWith("/admin")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
```

Le `return NextResponse.next();` qui le suivait reste (fin de la fonction `middleware`).

- [x] **Step 3: Build frontend**

```bash
pnpm --filter frontend build 2>&1 | tail -15
```

Expected : build réussi (les pages `/admin` Directus existent encore — neutralisées à la Task 12).

- [x] **Step 4: Commit**

```bash
rtk git add apps/frontend/src/middleware.ts && rtk git commit -m "$(cat <<'EOF'
feat(s5a): middleware — /admin sous garde Logto

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 12: Layout `(admin)` Logto + neutralisation des pages Directus restantes

Le layout `(admin)/admin/layout.tsx` est un Server Component Directus (`requireAuth()`). On le réécrit en Client Component sur `users.me` (gate `npl_*`), comme `(client)`. **Conséquence** : toutes les pages sous `/admin` ne doivent plus dépendre de la DAL Directus. Dossiers list/detail sont réécrits (Tasks 13-15) ; les autres (dashboard, taches, annuaire, messagerie, facturation) sont remplacées par des placeholders `ComingSoon` (client).

**Files:**
- Modify: `apps/frontend/src/app/(admin)/admin/layout.tsx`
- Modify: `apps/frontend/src/app/(admin)/admin/dashboard/page.tsx`
- Modify: `apps/frontend/src/app/(admin)/admin/taches/page.tsx`
- Modify: `apps/frontend/src/app/(admin)/admin/annuaire/page.tsx`
- Modify: `apps/frontend/src/app/(admin)/admin/messagerie/page.tsx`
- Modify: `apps/frontend/src/app/(admin)/admin/facturation/page.tsx`

- [x] **Step 1: Réécrire `apps/frontend/src/app/(admin)/admin/layout.tsx`**

```tsx
"use client";

import { useQuery } from "convex/react";
import { meQuery } from "@/lib/convexApi";
import { AdminLayoutWrapper } from "@/components/layout/AdminLayoutWrapper";

const NPL_ROLES = ["npl_admin", "npl_assistant", "npl_avocat"];

// Workspace cabinet — identité via Convex (users.me), plus aucune
// dépendance Directus. Le middleware garantit une session Logto ; ce
// layout gère provisioning manquant + rôle non-NPL.
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const me = useQuery(meQuery);

  if (me === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Chargement…</p>
      </div>
    );
  }

  if (me === null || !NPL_ROLES.includes(me.role)) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
        <h1 className="text-lg font-semibold">Ce portail est réservé à l&apos;équipe NPL</h1>
        <p className="text-sm text-muted-foreground">
          {me === null
            ? "Votre compte n'est pas encore provisionné. Contactez un administrateur NPL."
            : `Connecté en tant que ${me.name} (${me.role}).`}
        </p>
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/api/logto/sign-out" className="text-sm text-primary underline">
          Se déconnecter
        </a>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background admin-theme">
      <AdminLayoutWrapper
        userName={me.name}
        userCompany={me.organizationName ?? "Cabinet NPL"}
        unreadCount={0}
      >
        {children}
      </AdminLayoutWrapper>
    </div>
  );
}
```

- [x] **Step 2: Remplacer `dashboard/page.tsx` par un placeholder**

Écrire `apps/frontend/src/app/(admin)/admin/dashboard/page.tsx` :

```tsx
"use client";

import { ComingSoon } from "@/components/shared/ComingSoon";

export default function AdminDashboardPage() {
  return <ComingSoon title="Tableau de bord cabinet" />;
}
```

- [x] **Step 3: Remplacer `taches/page.tsx`**

Écrire `apps/frontend/src/app/(admin)/admin/taches/page.tsx` :

```tsx
"use client";

import { ComingSoon } from "@/components/shared/ComingSoon";

export default function AdminTachesPage() {
  return <ComingSoon title="Tâches & audiences" />;
}
```

- [x] **Step 4: Remplacer `annuaire/page.tsx`**

Écrire `apps/frontend/src/app/(admin)/admin/annuaire/page.tsx` :

```tsx
"use client";

import { ComingSoon } from "@/components/shared/ComingSoon";

export default function AdminAnnuairePage() {
  return <ComingSoon title="Annuaire" />;
}
```

- [x] **Step 5: Remplacer `messagerie/page.tsx`**

Écrire `apps/frontend/src/app/(admin)/admin/messagerie/page.tsx` :

```tsx
"use client";

import { ComingSoon } from "@/components/shared/ComingSoon";

export default function AdminMessageriePage() {
  return <ComingSoon title="Messagerie cabinet" />;
}
```

(La réponse aux messages se fait depuis le détail d'un dossier en S5a ; une boîte globale cabinet viendra plus tard.)

- [x] **Step 6: Remplacer `facturation/page.tsx`**

Écrire `apps/frontend/src/app/(admin)/admin/facturation/page.tsx` :

```tsx
"use client";

import { ComingSoon } from "@/components/shared/ComingSoon";

export default function AdminFacturationPage() {
  return <ComingSoon title="Facturation" />;
}
```

- [x] **Step 7: Build frontend**

```bash
pnpm --filter frontend build 2>&1 | tail -20
```

Expected : build réussi. Si une page Directus orpheline (ex. `admin/dossiers/page.tsx` encore Directus) casse, c'est attendu — corrigé Task 13. Vérifier au moins que `layout.tsx` + les 5 placeholders compilent.

- [x] **Step 8: Commit**

```bash
rtk git add "apps/frontend/src/app/(admin)/admin/layout.tsx" "apps/frontend/src/app/(admin)/admin/dashboard/page.tsx" "apps/frontend/src/app/(admin)/admin/taches/page.tsx" "apps/frontend/src/app/(admin)/admin/annuaire/page.tsx" "apps/frontend/src/app/(admin)/admin/messagerie/page.tsx" "apps/frontend/src/app/(admin)/admin/facturation/page.tsx" && rtk git commit -m "$(cat <<'EOF'
feat(s5a): admin layout Logto/Convex + placeholders pages Directus

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 13: Liste des dossiers cabinet — `/admin/dossiers`

**Files:**
- Modify: `apps/frontend/src/app/(admin)/admin/dossiers/page.tsx`

- [x] **Step 1: Réécrire `apps/frontend/src/app/(admin)/admin/dossiers/page.tsx`**

```tsx
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/metier/StatusBadge";
import { allForCabinetQuery, type CabinetCaseRow } from "@/lib/convexApi";

// Workspace cabinet — TOUS les dossiers, tous syndics. Filtres/recherche
// côté client (volumétrie pilote ≤ ~150). Le filtre "À pousser" surface
// les dossiers wizard en attente de push SECIB.
export default function AdminDossiersPage() {
  const cases = useQuery(allForCabinetQuery) as CabinetCaseRow[] | undefined;
  const [search, setSearch] = useState("");
  const [onlyPending, setOnlyPending] = useState(false);

  const rows = useMemo(() => {
    if (!cases) return [];
    let filtered = cases;
    if (onlyPending) filtered = filtered.filter((c) => c.pendingSecibPush);
    if (search.trim()) {
      const needle = search.trim().toLowerCase();
      filtered = filtered.filter(
        (c) =>
          (c.secibLibelle ?? "").toLowerCase().includes(needle) ||
          (c.debiteur?.nom ?? "").toLowerCase().includes(needle) ||
          c.organizationName.toLowerCase().includes(needle),
      );
    }
    return [...filtered].sort((a, b) => b.updatedAt - a.updatedAt);
  }, [cases, search, onlyPending]);

  if (cases === undefined) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  const pendingCount = cases.filter((c) => c.pendingSecibPush).length;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Tous les dossiers</h1>

      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Rechercher (libellé, débiteur, syndic)…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <Button
          variant={onlyPending ? "default" : "outline"}
          size="sm"
          onClick={() => setOnlyPending((v) => !v)}
        >
          À pousser ({pendingCount})
        </Button>
        <p className="text-sm text-muted-foreground">
          {rows.length} dossier{rows.length > 1 ? "s" : ""}
        </p>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Syndic</TableHead>
            <TableHead>Dossier</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead>SECIB</TableHead>
            <TableHead>Dernière maj</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((c) => (
            <TableRow key={c._id}>
              <TableCell className="text-sm">{c.organizationName}</TableCell>
              <TableCell className="max-w-xs">
                <Link
                  href={`/admin/dossiers/${c._id}`}
                  prefetch={false}
                  className="block truncate hover:underline"
                >
                  {c.secibLibelle ?? c.debiteur?.nom ?? "Dossier"}
                </Link>
              </TableCell>
              <TableCell>
                <StatusBadge status={c.status} />
              </TableCell>
              <TableCell className="text-sm">
                {c.pendingSecibPush ? (
                  <Badge variant="outline" className="rounded-full bg-warning/15 text-warning border-warning/30">
                    À pousser
                  </Badge>
                ) : c.secibDossierId ? (
                  <span className="text-muted-foreground">{c.secibDossierId}</span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell className="text-sm">
                {new Date(c.updatedAt).toLocaleDateString("fr-FR")}
              </TableCell>
            </TableRow>
          ))}
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                Aucun dossier ne correspond.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
```

- [x] **Step 2: Build frontend**

```bash
pnpm --filter frontend build 2>&1 | tail -20
```

Expected : build réussi (le détail `admin/dossiers/[id]/page.tsx` est encore Directus — s'il casse, c'est attendu, corrigé Task 14).

- [x] **Step 3: Commit**

```bash
rtk git add "apps/frontend/src/app/(admin)/admin/dossiers/page.tsx" && rtk git commit -m "$(cat <<'EOF'
feat(s5a): admin dossiers list (tous syndics, filtre à pousser)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 14: Détail dossier cabinet — shell + statut + messages

Composants : `StatusSelect` (changement de statut) et `AdminMessageThread` (fil + envoi `sendAsCabinet`). Le panneau SECIB vient Task 15.

**Files:**
- Create: `apps/frontend/src/components/admin/StatusSelect.tsx`
- Create: `apps/frontend/src/components/admin/AdminMessageThread.tsx`
- Modify: `apps/frontend/src/app/(admin)/admin/dossiers/[id]/page.tsx`

- [x] **Step 1: Écrire `apps/frontend/src/components/admin/StatusSelect.tsx`**

```tsx
"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { STATUS_CONFIG } from "@/components/metier/StatusBadge";
import { setStatusMutation, type CaseStatus } from "@/lib/convexApi";

const ALL_STATUSES: CaseStatus[] = [
  "CREE",
  "EN_ATTENTE_PIECES",
  "PRET",
  "MISE_EN_DEMEURE_ENVOYEE",
  "INJONCTION_DE_PAYER",
  "ASSIGNATION_AU_FOND",
  "JUGEMENT_OBTENU",
  "CLOTURE",
  "SUSPENDU",
];

export function StatusSelect({
  caseId,
  status,
}: {
  caseId: string;
  status: CaseStatus;
}) {
  const setStatus = useMutation(setStatusMutation);
  const [saving, setSaving] = useState(false);

  const onChange = async (next: string) => {
    setSaving(true);
    try {
      await setStatus({ caseId, status: next as CaseStatus });
      toast.success("Statut mis à jour");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Échec du changement de statut");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Select value={status} onValueChange={onChange} disabled={saving}>
      <SelectTrigger className="w-64">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {ALL_STATUSES.map((s) => (
          <SelectItem key={s} value={s}>
            {STATUS_CONFIG[s].label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
```

- [x] **Step 2: Écrire `apps/frontend/src/components/admin/AdminMessageThread.tsx`**

```tsx
"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  messagesByCaseQuery,
  sendAsCabinetMutation,
  type MessageDoc,
} from "@/lib/convexApi";

// Fil côté cabinet : "Vous" = avocat (à droite), syndic à gauche. L'envoi
// passe par sendAsCabinet (senderRole "avocat" + notif email syndic).
export function AdminMessageThread({ caseId }: { caseId: string }) {
  const messages = useQuery(messagesByCaseQuery, { caseId }) as
    | MessageDoc[]
    | undefined;
  const send = useMutation(sendAsCabinetMutation);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  const onSend = async () => {
    if (!body.trim()) return;
    setSending(true);
    try {
      await send({ caseId, body: body.trim() });
      setBody("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Envoi impossible");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4">
      {messages === undefined ? (
        <Skeleton className="h-40" />
      ) : messages.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Aucun message sur ce dossier.
        </p>
      ) : (
        <div className="space-y-3">
          {messages.map((m) => {
            const mine = m.senderRole === "avocat";
            return (
              <div
                key={m._id}
                className={mine ? "flex justify-end" : "flex justify-start"}
              >
                <div
                  className={
                    "max-w-[75%] rounded-lg px-3 py-2 text-sm " +
                    (mine
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground")
                  }
                >
                  <p className="mb-1 text-xs opacity-70">
                    {mine ? "Cabinet NPL" : "Syndic"} ·{" "}
                    {new Date(m.createdAt).toLocaleString("fr-FR", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                  <p className="whitespace-pre-wrap">{m.body}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="space-y-2">
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Répondre au syndic…"
          rows={3}
        />
        <div className="flex justify-end">
          <Button onClick={onSend} disabled={sending || !body.trim()}>
            {sending ? "Envoi…" : "Envoyer"}
          </Button>
        </div>
      </div>
    </div>
  );
}
```

- [x] **Step 3: Réécrire `apps/frontend/src/app/(admin)/admin/dossiers/[id]/page.tsx`**

```tsx
"use client";

import { use } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/metier/StatusBadge";
import { StatusSelect } from "@/components/admin/StatusSelect";
import { AdminMessageThread } from "@/components/admin/AdminMessageThread";
import { PushSecibPanel } from "@/components/admin/PushSecibPanel";
import { getByIdForCabinetQuery, type CabinetCaseDoc } from "@/lib/convexApi";

export default function AdminDossierDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const caseDoc = useQuery(getByIdForCabinetQuery, { caseId: id }) as
    | CabinetCaseDoc
    | null
    | undefined;

  if (caseDoc === undefined) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (caseDoc === null) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Dossier introuvable.</p>
        <Button asChild variant="outline">
          <Link href="/admin/dossiers" prefetch={false}>
            Retour aux dossiers
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">
            {caseDoc.secibLibelle ?? caseDoc.debiteur?.nom ?? "Dossier"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {caseDoc.organizationName} · <StatusBadge status={caseDoc.status} />
          </p>
        </div>
        <StatusSelect caseId={caseDoc._id} status={caseDoc.status} />
      </div>

      <Tabs defaultValue="infos">
        <TabsList>
          <TabsTrigger value="infos">Infos</TabsTrigger>
          <TabsTrigger value="messages">Messages</TabsTrigger>
          <TabsTrigger value="secib">SECIB</TabsTrigger>
        </TabsList>

        <TabsContent value="infos" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Débiteur</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              {caseDoc.debiteur ? (
                <>
                  <p>
                    <span className="text-muted-foreground">Nom : </span>
                    {caseDoc.debiteur.nom} ({caseDoc.debiteur.type})
                  </p>
                  {caseDoc.debiteur.adresse && (
                    <p>
                      <span className="text-muted-foreground">Adresse : </span>
                      {caseDoc.debiteur.adresse}
                    </p>
                  )}
                  {caseDoc.debiteur.lotDescription && (
                    <p>
                      <span className="text-muted-foreground">Lot : </span>
                      {caseDoc.debiteur.lotDescription}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-muted-foreground">
                  Pas de débiteur structuré (dossier importé de SECIB).
                </p>
              )}
              {caseDoc.principalCents !== undefined && (
                <p>
                  <span className="text-muted-foreground">Principal : </span>
                  {(caseDoc.principalCents / 100).toLocaleString("fr-FR", {
                    style: "currency",
                    currency: "EUR",
                  })}
                </p>
              )}
            </CardContent>
          </Card>

          {caseDoc.pieces && caseDoc.pieces.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Pièces</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                {caseDoc.pieces.map((p, i) => (
                  <p key={i} className="flex items-center justify-between">
                    <span>{p.type}</span>
                    <span className="text-xs text-muted-foreground">
                      {p.requirement} · {p.status}
                    </span>
                  </p>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="messages">
          <Card>
            <CardContent className="pt-6">
              <AdminMessageThread caseId={caseDoc._id} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="secib">
          <PushSecibPanel
            caseId={caseDoc._id}
            pendingSecibPush={caseDoc.pendingSecibPush ?? false}
            secibDossierId={caseDoc.secibDossierId}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

- [x] **Step 4: Build (échec attendu sur PushSecibPanel manquant)**

```bash
pnpm --filter frontend build 2>&1 | grep -i "PushSecibPanel\|error" | head -5
```

Expected : erreur « Cannot find module ... PushSecibPanel » — **attendu**, le composant est créé Task 15. (Ne PAS committer un build cassé : on commit après Task 15.)

- [x] **Step 5: Commit (shell détail + 2 composants, le panel suit)**

```bash
rtk git add "apps/frontend/src/app/(admin)/admin/dossiers/[id]/page.tsx" apps/frontend/src/components/admin/StatusSelect.tsx apps/frontend/src/components/admin/AdminMessageThread.tsx && rtk git commit -m "$(cat <<'EOF'
feat(s5a): admin dossier detail — statut + réponse messages

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 15: Panneau de push SECIB — `PushSecibPanel`

Aperçu (`previewPush`) → sélection matière/responsable (référentiels) → confirmation → `runPush`.

**Files:**
- Create: `apps/frontend/src/components/admin/PushSecibPanel.tsx`

- [x] **Step 1: Écrire `apps/frontend/src/components/admin/PushSecibPanel.tsx`**

```tsx
"use client";

import { useMemo, useState } from "react";
import { useAction, useQuery } from "convex/react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  previewPushAction,
  runPushAction,
  referentialsForPushQuery,
  type PreviewPushResult,
  type ReferentialOption,
} from "@/lib/convexApi";

// Parse défensif d'un payload référentiel SECIB (forme non garantie :
// array | { data } | { Resultats }) vers [{ id, label }]. id = premier
// champ numérique nommé *Id ; label = premier champ texte plausible.
function parseReferential(
  payload: unknown,
  idKeys: string[],
  labelKeys: string[],
): ReferentialOption[] {
  const arr = Array.isArray(payload)
    ? payload
    : Array.isArray((payload as { data?: unknown })?.data)
      ? (payload as { data: unknown[] }).data
      : Array.isArray((payload as { Resultats?: unknown })?.Resultats)
        ? (payload as { Resultats: unknown[] }).Resultats
        : [];
  const out: ReferentialOption[] = [];
  for (const item of arr) {
    const o = item as Record<string, unknown>;
    const idKey = idKeys.find((k) => typeof o[k] === "number");
    if (!idKey) continue;
    const labelKey = labelKeys.find((k) => typeof o[k] === "string");
    out.push({
      id: o[idKey] as number,
      label: labelKey ? String(o[labelKey]) : String(o[idKey]),
    });
  }
  return out;
}

export function PushSecibPanel({
  caseId,
  pendingSecibPush,
  secibDossierId,
}: {
  caseId: string;
  pendingSecibPush: boolean;
  secibDossierId?: string;
}) {
  const referentials = useQuery(referentialsForPushQuery) as
    | { matieres: unknown; intervenants: unknown }
    | undefined;
  const preview = useAction(previewPushAction);
  const runPush = useAction(runPushAction);

  const [previewData, setPreviewData] = useState<PreviewPushResult | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [matiereId, setMatiereId] = useState<string>("");
  const [responsableId, setResponsableId] = useState<string>("");
  const [reusePersonneId, setReusePersonneId] = useState<string>("");
  const [pushing, setPushing] = useState(false);
  const [pushedDossierId, setPushedDossierId] = useState<string | null>(null);

  const matiereOptions = useMemo(
    () =>
      referentials
        ? parseReferential(
            referentials.matieres,
            ["MatiereId", "Id"],
            ["Libelle", "Nom", "Designation"],
          )
        : [],
    [referentials],
  );
  const intervenantOptions = useMemo(
    () =>
      referentials
        ? parseReferential(
            referentials.intervenants,
            ["UtilisateurId", "IntervenantId", "Id"],
            ["NomComplet", "Nom", "Libelle"],
          )
        : [],
    [referentials],
  );

  // Déjà poussé.
  if (!pendingSecibPush && secibDossierId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">SECIB</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          Déjà dans SECIB — dossier <strong>{secibDossierId}</strong>.
        </CardContent>
      </Card>
    );
  }

  // Pas un dossier wizard à pousser.
  if (!pendingSecibPush) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">SECIB</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Ce dossier n&apos;est pas en attente de push.
        </CardContent>
      </Card>
    );
  }

  const onPreview = async () => {
    setLoadingPreview(true);
    try {
      const result = (await preview({ caseId })) as PreviewPushResult;
      setPreviewData(result);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Aperçu impossible");
    } finally {
      setLoadingPreview(false);
    }
  };

  const onPush = async () => {
    const m = Number(matiereId);
    const r = Number(responsableId);
    if (!Number.isFinite(m) || !Number.isFinite(r) || !matiereId || !responsableId) {
      toast.error("Choisissez une matière et un responsable.");
      return;
    }
    setPushing(true);
    try {
      const res = (await runPush({
        caseId,
        matiereId: m,
        responsableId: r,
        ...(reusePersonneId ? { reuseDebiteurPersonneId: Number(reusePersonneId) } : {}),
      })) as { secibDossierId: string; code: string | null };
      setPushedDossierId(res.secibDossierId);
      toast.success(`Poussé dans SECIB — dossier ${res.code ?? res.secibDossierId}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Push échoué");
    } finally {
      setPushing(false);
    }
  };

  if (pushedDossierId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">SECIB</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          Poussé — dossier SECIB <strong>{pushedDossierId}</strong>.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Pousser dans SECIB</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!previewData ? (
          <Button onClick={onPreview} disabled={loadingPreview}>
            {loadingPreview ? "Aperçu…" : "Aperçu du push"}
          </Button>
        ) : (
          <>
            <div className="space-y-1 text-sm">
              <p>
                <span className="text-muted-foreground">Débiteur (Personne adversaire) : </span>
                {previewData.debiteur.nom} ({previewData.debiteur.type})
              </p>
              <p>
                <span className="text-muted-foreground">Syndic (Personne client) : </span>
                {previewData.syndicName} — PersonneId {previewData.syndicPersonneId}
              </p>
              {previewData.existingMatches.length > 0 && (
                <p className="text-warning">
                  {previewData.existingMatches.length} homonyme(s) dans SECIB —
                  réutiliser un PersonneId existant ci-dessous pour éviter un doublon.
                </p>
              )}
            </div>

            {referentials === undefined ? (
              <Skeleton className="h-10" />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Matière</label>
                  <Select value={matiereId} onValueChange={setMatiereId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choisir une matière" />
                    </SelectTrigger>
                    <SelectContent>
                      {matiereOptions.map((o) => (
                        <SelectItem key={o.id} value={String(o.id)}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Responsable</label>
                  <Select value={responsableId} onValueChange={setResponsableId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choisir un responsable" />
                    </SelectTrigger>
                    <SelectContent>
                      {intervenantOptions.map((o) => (
                        <SelectItem key={o.id} value={String(o.id)}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {previewData.existingMatches.length > 0 && (
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">
                  Réutiliser un PersonneId débiteur existant (optionnel)
                </label>
                <Select value={reusePersonneId} onValueChange={setReusePersonneId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Créer une nouvelle personne" />
                  </SelectTrigger>
                  <SelectContent>
                    {previewData.existingMatches.map((m) => (
                      <SelectItem key={m.personneId} value={String(m.personneId)}>
                        {m.nom} (#{m.personneId})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <Button onClick={onPush} disabled={pushing}>
              {pushing ? "Push en cours…" : "Pousser dans SECIB"}
            </Button>
            <p className="text-xs text-muted-foreground">
              Crée la Personne débiteur, le Dossier (Code auto-généré par SECIB) et
              les Parties. Irréversible côté SECIB — vérifiez la matière et le responsable.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
```

- [x] **Step 2: Build frontend (doit passer maintenant)**

```bash
pnpm --filter frontend build 2>&1 | tail -20
```

Expected : build réussi (toutes les pages `/admin` compilent).

- [x] **Step 3: Commit**

```bash
rtk git add apps/frontend/src/components/admin/PushSecibPanel.tsx && rtk git commit -m "$(cat <<'EOF'
feat(s5a): PushSecibPanel — aperçu + matière/responsable + push

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 16: Lint + build full + push branche

**Files:** aucun.

- [ ] **Step 1: Lint frontend**

```bash
rtk lint 2>&1 | tail -15 || pnpm --filter frontend lint 2>&1 | tail -15
```

Expected : 0 erreur (warnings tolérés). Corriger toute erreur ESLint bloquante (notamment `no-html-link-for-pages` → `eslint-disable` déjà posé sur le `<a>` sign-out du layout).

- [ ] **Step 2: Build frontend en conditions Docker-like (leçon S2B : pas de .env.local, NEXT_PUBLIC_* en env)**

```bash
pnpm --filter frontend build 2>&1 | tail -20
```

Expected : build réussi.

- [ ] **Step 3: Push la branche**

```bash
rtk git push -u origin feat/convex-s5a-admin-push 2>&1 | tail -5
```

Expected : branche poussée.

---

## Task 17: Déploiement + validation E2E (sandbox push d'abord)

**Files:** aucun. **Validation manuelle — ne pas court-circuiter le gate sandbox.**

- [ ] **Step 1: Vérifier le déploiement frontend (Coolify)**

Le push `main`→déploie ; ici on est sur une branche, donc soit merge d'abord (PR), soit déploiement manuel. **Vérifier le statut de déploiement Coolify** (PAS la redirect d'auth — leçon S3b/c) via le MCP coolify (`mcp__coolify__list_deployments` / `get_application`) ou l'UI. Le backend Convex est déjà déployé (Task 9).

- [ ] **Step 2: Auth — accès cabinet**

Se connecter en prod (`https://immo.nplavocat.com`) avec un compte `npl_admin` → naviguer `/admin/dossiers` → la liste affiche TOUS les dossiers, colonne Syndic peuplée. Se connecter avec un compte syndic → `/admin/dossiers` → écran « réservé à l'équipe NPL ».

- [ ] **Step 3: Statut**

Ouvrir un dossier → changer le statut via le select → toast succès → le badge se met à jour (liste + détail). Vérifier l'audit :

```bash
npx convex run --no-push 2>/dev/null; npx convex data auditLogs 2>&1 | grep -c "case.status_changed"
```

Expected : ≥ 1.

- [ ] **Step 4: Réponse messages**

Sur un dossier ayant un fil syndic, onglet Messages → répondre → le message apparaît (bulle « Cabinet NPL » à droite). Vérifier côté syndic (autre compte) que la réponse apparaît à gauche. Vérifier `auditLogs` : `email.skipped` (Resend non configuré) ou `email.sent`.

- [ ] **Step 5: ⚠ PUSH SANDBOX D'ABORD — NE PAS pousser un vrai dossier syndic**

Créer (via le wizard syndic, compte de test) un dossier jetable avec un **débiteur au nom factice unique** (ex. « TEST PUSH 20260613 »). Puis en `npl_admin` :
1. Ouvrir ce dossier → onglet SECIB → « Aperçu du push » → vérifier débiteur + syndic PersonneId affichés.
2. Choisir une matière + un responsable (ex. Nancy = responsable). Pousser.
3. **Vérifier dans SECIB** (lecture seule, via la CLI `secib` ou le MCP `secib-gateway`) que la Personne, le Dossier (Code auto-généré) et les 2 Parties (syndic=client TypePartieId 1, débiteur=adversaire TypePartieId 2, **body imbriqué accepté**) sont créés correctement :

```bash
secib --profile sl gw-dossiers-detail <DossierId retourné> -o json | head -40
```

Expected : le dossier existe, Nom = « TEST PUSH … — recouvrement charges », parties présentes. **Si SECIB rejette** (ex. 500 sur personne/partie, champ DTO inattendu) : corriger `convex/lib/secibWrite.ts` (le shape exact n'avait jamais été exercé depuis Convex), redéployer, re-tester sur un NOUVEAU débiteur jetable. Ne pas passer à l'étape 6 tant que le sandbox n'est pas vert.

- [ ] **Step 6: Idempotence**

Re-pousser le même dossier (rouvrir l'onglet SECIB) → le panneau affiche « Déjà dans SECIB — dossier {id} » et `runPush` refuse (`push.already_done`). Vérifier `auditLogs` : `secib.run_push.succeeded` une seule fois pour ce case.

- [ ] **Step 7: Non-régression portail syndic**

Vérifier que le portail syndic (S3a-c) marche toujours : dashboard, liste, détail (Infos/Documents/Suivi/Messages), wizard, messagerie. 0 erreur console.

- [ ] **Step 8: Nettoyage sandbox**

Le dossier SECIB de test créé à l'étape 5 peut être laissé (sandbox) ou signalé au cabinet pour suppression. Noter le DossierId créé dans le récap de PR.

---

## Task 18: PR

**Files:** aucun.

- [ ] **Step 1: Ouvrir la PR**

```bash
rtk gh pr create --title "S5a — Workspace admin + push SECIB" --body "$(cat <<'EOF'
## S5a — Fondation workspace admin + push SECIB

Spec : `docs/superpowers/specs/2026-06-13-convex-s5a-admin-push-design.md`
Plan : `docs/superpowers/plans/2026-06-13-convex-s5a-admin-push-impl.md`

### Contenu
- **Auth** : `(admin)` migre de Directus vers Logto/Convex (middleware + layout `users.me`, gate `npl_*`). Pages admin non-dossiers → placeholders ComingSoon.
- **Cabinet** : `cases.allForCabinet` (tous syndics, nom org), `getByIdForCabinet`, `setStatus` (9 statuts + audit).
- **Messagerie** : `messages.sendAsCabinet` (senderRole avocat) + email syndic gracieux.
- **Push SECIB** (manuel, idempotent, fail-loud) : `previewPush` (aperçu + recherche homonyme) → `runPush` (Personne → Dossier sans Code → Parties imbriquées → patch case). Helpers `lib/secibWrite.ts`.
- **UI** : liste cabinet (filtre « à pousser »), détail (Infos/Messages/SECIB), `PushSecibPanel`.

### Validation
- Auth cabinet + rejet syndic ✓
- Statut + audit ✓
- Réponse messages syndic↔cabinet ✓
- **Push validé sur dossier sandbox** (DossierId SECIB créé : `<à renseigner>`) ✓
- Idempotence (re-push refusé) ✓
- Non-régression portail syndic ✓

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)" 2>&1 | tail -5
```

- [ ] **Step 2: Final review handoff**

Dispatcher un Code Reviewer sur l'ensemble du diff de la branche (spec-compliance + qualité), puis présenter le résultat à l'utilisateur pour merge.

---

## Self-Review (rempli)

**1. Couverture du spec :**
- Auth migration `(admin)` → Logto : Task 11 (middleware) + Task 12 (layout + neutralisation). ✓
- `allForCabinet` + nom org + `getByIdForCabinet` : Task 3. ✓ ; `npl_avocat` garde `dossiersOuJeSuisIntervenant` (inchangé). ✓
- `setStatus` (9 états, previousStatus/statusChangedAt/By + audit) : Task 4. ✓
- `sendAsCabinet` (senderRole avocat + email syndic gracieux) : Task 5. ✓
- `secibWrite` helpers (personne/dossier/partie, pièges encodés) : Task 6. ✓
- `previewPush` (aperçu, recherche homonyme, aucune écriture) : Task 7. ✓
- `runPush` (idempotent, fail-loud, Personne→Dossier→Parties→patch) : Task 8. ✓
- UI liste + détail + `PushSecibPanel` : Tasks 13-15. ✓
- `convexApi.ts` refs+types : Task 10. ✓
- Gestion erreurs (push partiel documenté, idempotence, org sans PersonneId, rôle) : Tasks 7-8 + spec. ✓
- Validation sandbox-first : Task 17 étape 5 (gate explicite). ✓

**2. Placeholders :** aucun `TBD`/`TODO` ; tout step de code montre le code complet. ✓

**3. Cohérence des types :** `CabinetCaseRow`/`CabinetCaseDoc`/`PreviewPushResult`/`ReferentialOption` définis en Task 10, consommés Tasks 13-15. Refs `allForCabinetQuery`/`setStatusMutation`/`sendAsCabinetMutation`/`previewPushAction`/`runPushAction`/`referentialsForPushQuery`/`getByIdForCabinetQuery` définies Task 10, utilisées dans les composants. `createPersonne`/`createDossier`/`createPartie` (Task 6) appelées par `runPush` (Task 8). `applyPushResult` (Task 8, cases.ts) appelée par `runPush`. `syndicEmailsForOrg` (Task 5, users.ts) appelée par `notifySyndicReply`. ✓

**Note SECIB :** les shapes d'écriture (createPersonne surtout — PP/PM, champs minimaux) n'ont jamais été exercées depuis Convex ; le gate sandbox (Task 17.5) est l'endroit prévu pour corriger `secibWrite.ts` si SECIB rejette. C'est intentionnel et conforme au spec (« test sandbox 164 obligatoire avant tout dossier réel »).
