# S3b — Wizard nouveau dossier (Convex) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Un syndic crée un dossier via un wizard 4 étapes auto-sauvegardé ; le submit produit un `case` Convex (`status: CREE`, `pendingSecibPush`) sans aucune écriture SECIB.

**Architecture:** Schéma `cases` enrichi (objet `debiteur` + métadonnées créance + flag push). Catalogue de pièces partagé (`convex/lib/pieces.ts` + copie frontend). 3 fonctions draft (`getMyDraft`/`saveDraft`/`submitDraft`) gardées syndic via un nouveau `requireRoleMutation`. Page wizard client (remplace le placeholder), auto-save debouncé, pièces conditionnelles live par cas spécial.

**Tech Stack:** Convex 1.39 self-hosted, Next.js 15 App Router, ShadCN (input/textarea/radio-group/checkbox/card/button/progress/label), Sonner. Frontend via `makeFunctionReference` (pas d'import `convex/_generated`).

**Spec:** `docs/superpowers/specs/2026-06-13-convex-s3b-wizard-design.md`

**Repo pattern note:** pas de tests unitaires (convention repo) — validation par typecheck/lint/build + E2E Playwright. **Admin key Convex** (tasks deploy) : memory `reference-convex-admin-key-retrieval`.

**Codegen note:** nouveaux exports Convex inconnus de `_generated` avant `convex codegen` (credentials requis). Erreurs tsc limitées à `internal.*`/`api.*` inconnus = attendu ; l'orchestrateur lance codegen entre lots. Frontend : AUCUN import `convex/_generated`, seulement `makeFunctionReference`.

**Contrainte RSC/proxy (memory `reference-rsc-prefetch-proxy-cors`)** : tout `<Link>` vers une route `(client)` doit porter `prefetch={false}`.

---

## Task 1: Pre-flight

**Files:** aucun.

- [ ] **Step 1:**

```bash
cd /Users/mkstudio/Desktop/recouvrement_immo_npl && git branch --show-current && git status --short
```

Expected : `feat/convex-s3b-wizard` ; untracked `.playwright-mcp/`, `convex/_generated/` tolérés.

- [ ] **Step 2: Vérifier les fondations S3a présentes**

```bash
grep -c "requireRoleQuery\|SYNDIC_ROLES" convex/lib/auth.ts && grep -c "duSyndic" convex/cases.ts && grep -c "casesDuSyndicQuery" apps/frontend/src/lib/convexApi.ts
```

Expected : chaque commande retourne un nombre ≥ 1.

---

## Task 2: Schéma — champs wizard sur `cases`

**Files:**
- Modify: `convex/schema.ts` (table `cases`)

- [ ] **Step 1: Ajouter les champs dans la table `cases`**

Dans `convex/schema.ts`, table `cases`, ajouter ce bloc **juste avant** `createdAt: v.number(),` (la dernière paire de champs de la table, avant la chaîne d'index) :

```ts
    // ── Wizard syndic (S3b) — un dossier créé au portail, en attente de
    // contrôle + push SECIB par le cabinet (S5). Tous optionnels : les
    // cases importés de SECIB ne les portent pas.
    debiteur: v.optional(
      v.object({
        type: v.union(v.literal("PP"), v.literal("PM")),
        nom: v.string(),
        adresse: v.optional(v.string()),
        email: v.optional(v.string()),
        telephone: v.optional(v.string()),
        lotDescription: v.optional(v.string()),
      }),
    ),
    periodeDebut: v.optional(v.number()),
    periodeFin: v.optional(v.number()),
    nbRelances: v.optional(v.number()),
    observations: v.optional(v.string()),
    pendingSecibPush: v.optional(v.boolean()),
```

- [ ] **Step 2: Ajouter l'index `by_pending_push`**

Dans la même table, à la chaîne d'index `.index(...)`, ajouter après `by_secib_intervenant` :

```ts
    .index("by_pending_push", ["pendingSecibPush"])
```

- [ ] **Step 3: Typecheck + commit**

```bash
npx tsc --noEmit -p convex 2>&1 | tail -2
git add convex/schema.ts && git commit -m "feat(s3b): cases wizard fields (debiteur, créance, pendingSecibPush) + by_pending_push index"
```

---

## Task 3: Catalogue de pièces — `convex/lib/pieces.ts`

**Files:**
- Create: `convex/lib/pieces.ts`

- [ ] **Step 1: Écrire `convex/lib/pieces.ts`**

```ts
// ─────────────────────────────────────────────────────────────────
// Catalogue des pièces justificatives (PLAN_V1 §3).
// Source de vérité backend ; le frontend en a une COPIE (il ne peut pas
// importer convex/lib). Garder les deux synchronisés (cf.
// apps/frontend/src/lib/pieces.ts).
// ─────────────────────────────────────────────────────────────────

export type PieceRequirement = "obligatoire" | "recommandee" | "utile";
export type PieceTemplate = { type: string; requirement: PieceRequirement };

// Toujours demandées.
export const ALWAYS_PIECES: PieceTemplate[] = [
  { type: "Décompte de charges détaillé", requirement: "obligatoire" },
  { type: "PV d'AG approuvant les comptes", requirement: "recommandee" },
  { type: "Mandat de syndic en cours", requirement: "recommandee" },
  { type: "Mise en demeure préalable du syndic", requirement: "recommandee" },
  { type: "Relevé d'identité du débiteur", requirement: "utile" },
];

// Cas spécial → pièce conditionnelle. MULTI_LOTS = regroupement
// procédural, pas de pièce dédiée (PLAN_V1).
export const CONDITIONAL_PIECES: Record<string, PieceTemplate | undefined> = {
  INDIVISION: {
    type: "Liste des indivisaires + état civil",
    requirement: "obligatoire",
  },
  DECEDE: {
    type: "Acte de notoriété + déclaration de succession",
    requirement: "obligatoire",
  },
  REDRESSEMENT: {
    type: "Justificatif de redressement / liquidation",
    requirement: "obligatoire",
  },
  LOT_LOUE: {
    type: "Bail locatif + identité du locataire",
    requirement: "recommandee",
  },
  MULTI_LOTS: undefined,
};

// Liste finale = toujours + conditionnelles des cas cochés, dédupliquées
// par `type` (l'ordre suit ALWAYS puis l'ordre des cas spéciaux).
export function buildPieces(casSpecial: string[]): PieceTemplate[] {
  const seen = new Set<string>();
  const result: PieceTemplate[] = [];
  for (const p of ALWAYS_PIECES) {
    if (!seen.has(p.type)) {
      seen.add(p.type);
      result.push(p);
    }
  }
  for (const cas of casSpecial) {
    const p = CONDITIONAL_PIECES[cas];
    if (p && !seen.has(p.type)) {
      seen.add(p.type);
      result.push(p);
    }
  }
  return result;
}
```

- [ ] **Step 2: Typecheck + commit**

```bash
npx tsc --noEmit -p convex 2>&1 | tail -2
git add convex/lib/pieces.ts && git commit -m "feat(s3b): pieces catalog (always + conditional per cas spécial)"
```

---

## Task 4: `requireRoleMutation`

**Files:**
- Modify: `convex/lib/auth.ts`

- [ ] **Step 1: Étendre l'import des types générés**

En tête de `convex/lib/auth.ts`, remplacer :

```ts
import type { ActionCtx, QueryCtx } from "../_generated/server";
```

par :

```ts
import type { ActionCtx, QueryCtx, MutationCtx } from "../_generated/server";
```

- [ ] **Step 2: Ajouter `requireRoleMutation` en fin de fichier**

```ts
// ─────────────────────────────────────────────────────────────────
// requireRoleMutation — jumeau de requireRoleQuery pour les MUTATIONS.
// MutationCtx a aussi ctx.db (en écriture) et ctx.auth ; la lecture
// users via ctx.db.query est valide. Retourne le doc user complet.
// ─────────────────────────────────────────────────────────────────
export async function requireRoleMutation(
  ctx: MutationCtx,
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
git add convex/lib/auth.ts && git commit -m "feat(s3b): requireRoleMutation — mutation-side auth gate"
```

---

## Task 5: Draft — getMyDraft + saveDraft + submitDraft

**Files:**
- Modify: `convex/caseDrafts.ts`

- [ ] **Step 1: Étendre les imports en tête de `convex/caseDrafts.ts`**

Remplacer la ligne d'import server par :

```ts
import { internalMutation, mutation, query } from "./_generated/server";
```

et ajouter après les imports existants :

```ts
import { ConvexError } from "convex/values";
import { requireRoleQuery, requireRoleMutation, SYNDIC_ROLES } from "./lib/auth";
import { buildPieces } from "./lib/pieces";
```

(`internal`, `v`, `cronRunRow` restent importés.)

- [ ] **Step 2: Ajouter le validator `casSpecial` partagé (sous les imports)**

```ts
// Union des 5 cas spéciaux — alignée sur schema.ts cases.casSpecial.
const casSpecialValidator = v.array(
  v.union(
    v.literal("INDIVISION"),
    v.literal("DECEDE"),
    v.literal("REDRESSEMENT"),
    v.literal("LOT_LOUE"),
    v.literal("MULTI_LOTS"),
  ),
);

const DRAFT_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30j (cron casedrafts-cleanup purge)
```

- [ ] **Step 3: Ajouter les 3 fonctions en fin de fichier**

```ts
// ─────────────────────────────────────────────────────────────────
// Wizard syndic (S3b) — un seul brouillon actif par syndic.
// ─────────────────────────────────────────────────────────────────

// Brouillon courant du syndic appelant (ou null).
export const getMyDraft = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireRoleQuery(ctx, SYNDIC_ROLES);
    return await ctx.db
      .query("caseDrafts")
      .withIndex("by_author", (q) => q.eq("authorUserId", user._id))
      .unique();
  },
});

// Upsert du brouillon (un par auteur). Auto-save debouncé côté wizard.
export const saveDraft = mutation({
  args: {
    casSpecial: casSpecialValidator,
    debiteurNom: v.optional(v.string()),
    principalCents: v.optional(v.number()),
    currentStep: v.string(),
    wizardData: v.any(),
  },
  handler: async (ctx, args) => {
    const user = await requireRoleMutation(ctx, SYNDIC_ROLES);
    const now = Date.now();
    const existing = await ctx.db
      .query("caseDrafts")
      .withIndex("by_author", (q) => q.eq("authorUserId", user._id))
      .unique();
    const fields = {
      organizationId: user.organizationId,
      authorUserId: user._id,
      casSpecial: args.casSpecial,
      debiteurNom: args.debiteurNom,
      principalCents: args.principalCents,
      currentStep: args.currentStep,
      wizardData: args.wizardData,
      updatedAt: now,
      expiresAt: now + DRAFT_TTL_MS,
    };
    if (existing) {
      await ctx.db.patch(existing._id, fields);
      return { draftId: existing._id };
    }
    const draftId = await ctx.db.insert("caseDrafts", fields);
    return { draftId };
  },
});

// Submit — crée le case (CREE, pendingSecibPush) puis supprime le draft.
// AUCUNE écriture SECIB : le cabinet contrôle puis pousse en S5.
export const submitDraft = mutation({
  args: {
    debiteur: v.object({
      type: v.union(v.literal("PP"), v.literal("PM")),
      nom: v.string(),
      adresse: v.optional(v.string()),
      email: v.optional(v.string()),
      telephone: v.optional(v.string()),
      lotDescription: v.optional(v.string()),
    }),
    principalCents: v.number(),
    principalDateExigibilite: v.number(),
    periodeDebut: v.optional(v.number()),
    periodeFin: v.optional(v.number()),
    nbRelances: v.optional(v.number()),
    observations: v.optional(v.string()),
    casSpecial: casSpecialValidator,
  },
  handler: async (ctx, args): Promise<{ caseId: string }> => {
    const user = await requireRoleMutation(ctx, SYNDIC_ROLES);

    // Validation serveur (le client valide aussi avant submit).
    if (!args.debiteur.nom.trim()) {
      throw new ConvexError({
        code: "wizard.debiteur_nom_required",
        message: "Le nom du débiteur est obligatoire.",
      });
    }
    if (args.principalCents <= 0) {
      throw new ConvexError({
        code: "wizard.principal_required",
        message: "Le montant principal doit être supérieur à 0.",
      });
    }

    const now = Date.now();
    const pieces = buildPieces(args.casSpecial).map((p) => ({
      type: p.type,
      requirement: p.requirement,
      status: "REQUESTED" as const,
      requestedAt: now,
    }));

    const caseId = await ctx.db.insert("cases", {
      organizationId: user.organizationId,
      authorUserId: user._id,
      status: "CREE" as const,
      statusChangedAt: now,
      statusChangedByUserId: user._id,
      casSpecial: args.casSpecial,
      principalCents: args.principalCents,
      principalDateExigibilite: args.principalDateExigibilite,
      debiteur: args.debiteur,
      periodeDebut: args.periodeDebut,
      periodeFin: args.periodeFin,
      nbRelances: args.nbRelances,
      observations: args.observations,
      pendingSecibPush: true,
      pieces,
      createdAt: now,
      updatedAt: now,
    });

    // Supprimer le brouillon (un par auteur).
    const draft = await ctx.db
      .query("caseDrafts")
      .withIndex("by_author", (q) => q.eq("authorUserId", user._id))
      .unique();
    if (draft) await ctx.db.delete(draft._id);

    // Trace audit (insertion directe — withAuditLog est action-only).
    await ctx.db.insert("auditLogs", {
      actorLogtoUserId: user.logtoUserId,
      actorUserId: user._id,
      actorRole: user.role,
      actorOrganizationId: user.organizationId,
      action: "case.created_via_wizard",
      targetType: "case",
      targetId: caseId,
      createdAt: now,
    });

    return { caseId };
  },
});
```

- [ ] **Step 4: Typecheck + commit**

```bash
npx tsc --noEmit -p convex 2>&1 | tail -3
git add convex/caseDrafts.ts && git commit -m "feat(s3b): getMyDraft + saveDraft + submitDraft (case CREE, pendingSecibPush, no SECIB write)"
```

---

## Task 6: Frontend — refs Convex + catalogue pièces

**Files:**
- Modify: `apps/frontend/src/lib/convexApi.ts`
- Create: `apps/frontend/src/lib/pieces.ts`

- [ ] **Step 1: Ajouter les refs + types dans `apps/frontend/src/lib/convexApi.ts`**

Sous les `makeFunctionReference` existants, ajouter :

```ts
export const getMyDraftQuery = makeFunctionReference<"query">("caseDrafts:getMyDraft");
export const saveDraftMutation = makeFunctionReference<"mutation">("caseDrafts:saveDraft");
export const submitDraftMutation = makeFunctionReference<"mutation">("caseDrafts:submitDraft");
```

En fin de fichier, ajouter les types du wizard :

```ts
export type CasSpecial =
  | "INDIVISION"
  | "DECEDE"
  | "REDRESSEMENT"
  | "LOT_LOUE"
  | "MULTI_LOTS";

export type WizardData = {
  debiteur: {
    type: "PP" | "PM";
    nom: string;
    adresse: string;
    email: string;
    telephone: string;
    lotDescription: string;
  };
  creance: {
    montant: string; // euros (string d'input) — converti en cents au submit
    dateExigibilite: string; // yyyy-mm-dd
    periodeDebut: string;
    periodeFin: string;
    nbRelances: string;
    observations: string;
  };
  casSpecial: CasSpecial[];
};

export type DraftDoc = {
  _id: string;
  currentStep: string;
  wizardData: WizardData;
  updatedAt: number;
};
```

- [ ] **Step 2: Créer `apps/frontend/src/lib/pieces.ts` (copie du catalogue backend)**

```ts
// COPIE du catalogue backend convex/lib/pieces.ts (le frontend ne peut
// pas importer convex/lib). Garder synchronisé. Sert à afficher la liste
// de pièces en live à l'étape Pièces du wizard.

export type PieceRequirement = "obligatoire" | "recommandee" | "utile";
export type PieceTemplate = { type: string; requirement: PieceRequirement };

export const ALWAYS_PIECES: PieceTemplate[] = [
  { type: "Décompte de charges détaillé", requirement: "obligatoire" },
  { type: "PV d'AG approuvant les comptes", requirement: "recommandee" },
  { type: "Mandat de syndic en cours", requirement: "recommandee" },
  { type: "Mise en demeure préalable du syndic", requirement: "recommandee" },
  { type: "Relevé d'identité du débiteur", requirement: "utile" },
];

export const CONDITIONAL_PIECES: Record<string, PieceTemplate | undefined> = {
  INDIVISION: { type: "Liste des indivisaires + état civil", requirement: "obligatoire" },
  DECEDE: { type: "Acte de notoriété + déclaration de succession", requirement: "obligatoire" },
  REDRESSEMENT: { type: "Justificatif de redressement / liquidation", requirement: "obligatoire" },
  LOT_LOUE: { type: "Bail locatif + identité du locataire", requirement: "recommandee" },
  MULTI_LOTS: undefined,
};

export function buildPieces(casSpecial: string[]): PieceTemplate[] {
  const seen = new Set<string>();
  const result: PieceTemplate[] = [];
  for (const p of ALWAYS_PIECES) {
    if (!seen.has(p.type)) {
      seen.add(p.type);
      result.push(p);
    }
  }
  for (const cas of casSpecial) {
    const p = CONDITIONAL_PIECES[cas];
    if (p && !seen.has(p.type)) {
      seen.add(p.type);
      result.push(p);
    }
  }
  return result;
}
```

- [ ] **Step 3: Lint + commit**

```bash
cd apps/frontend && node_modules/.bin/next lint --file src/lib/convexApi.ts --file src/lib/pieces.ts 2>&1 | tail -2 && cd ../..
git add apps/frontend/src/lib/convexApi.ts apps/frontend/src/lib/pieces.ts && git commit -m "feat(s3b): frontend draft refs + wizard types + pieces catalog copy"
```

---

## Task 7: Wizard — `/dossiers/nouveau`

**Files:**
- Modify (réécriture): `apps/frontend/src/app/(client)/dossiers/nouveau/page.tsx`

- [ ] **Step 1: Réécrire la page (wizard complet)**

```tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import {
  getMyDraftQuery,
  saveDraftMutation,
  submitDraftMutation,
  type CasSpecial,
  type DraftDoc,
  type WizardData,
} from "@/lib/convexApi";
import { buildPieces } from "@/lib/pieces";

const STEPS = ["Débiteur", "Créance", "Pièces", "Validation"] as const;

const CAS_SPECIAUX: { value: CasSpecial; label: string }[] = [
  { value: "INDIVISION", label: "Indivision" },
  { value: "DECEDE", label: "Débiteur décédé" },
  { value: "REDRESSEMENT", label: "Redressement / liquidation" },
  { value: "LOT_LOUE", label: "Lot loué" },
  { value: "MULTI_LOTS", label: "Plusieurs lots, même débiteur" },
];

const EMPTY: WizardData = {
  debiteur: { type: "PP", nom: "", adresse: "", email: "", telephone: "", lotDescription: "" },
  creance: { montant: "", dateExigibilite: "", periodeDebut: "", periodeFin: "", nbRelances: "", observations: "" },
  casSpecial: [],
};

export default function NouveauDossierPage() {
  const router = useRouter();
  const draft = useQuery(getMyDraftQuery) as DraftDoc | null | undefined;
  const saveDraft = useMutation(saveDraftMutation);
  const submitDraft = useMutation(submitDraftMutation);

  const [step, setStep] = useState(0);
  const [data, setData] = useState<WizardData>(EMPTY);
  const [hydrated, setHydrated] = useState(false);
  const [resumed, setResumed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Réhydrate le brouillon existant une seule fois.
  useEffect(() => {
    if (hydrated || draft === undefined) return;
    if (draft) {
      setData(draft.wizardData);
      setStep(Number(draft.currentStep) || 0);
      setResumed(true);
    }
    setHydrated(true);
  }, [draft, hydrated]);

  // Auto-save debouncé (~1,5 s).
  const scheduleSave = useCallback(
    (next: WizardData, nextStep: number) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        setSaving(true);
        try {
          await saveDraft({
            casSpecial: next.casSpecial,
            debiteurNom: next.debiteur.nom || undefined,
            principalCents: next.creance.montant
              ? Math.round(parseFloat(next.creance.montant) * 100)
              : undefined,
            currentStep: String(nextStep),
            wizardData: next,
          });
        } catch {
          // Échec silencieux : retry au prochain changement.
        } finally {
          setSaving(false);
        }
      }, 1500);
    },
    [saveDraft],
  );

  const update = (next: WizardData, nextStep = step) => {
    setData(next);
    if (hydrated) scheduleSave(next, nextStep);
  };

  const setDebiteur = (patch: Partial<WizardData["debiteur"]>) =>
    update({ ...data, debiteur: { ...data.debiteur, ...patch } });
  const setCreance = (patch: Partial<WizardData["creance"]>) =>
    update({ ...data, creance: { ...data.creance, ...patch } });
  const toggleCas = (cas: CasSpecial) => {
    const has = data.casSpecial.includes(cas);
    update({
      ...data,
      casSpecial: has ? data.casSpecial.filter((c) => c !== cas) : [...data.casSpecial, cas],
    });
  };

  const canNext = () => {
    if (step === 0) return data.debiteur.type && data.debiteur.nom.trim();
    if (step === 1) return data.creance.montant && parseFloat(data.creance.montant) > 0 && data.creance.dateExigibilite;
    return true;
  };

  const goTo = (s: number) => {
    setStep(s);
    if (hydrated) scheduleSave(data, s);
  };

  const onSubmit = async () => {
    setSubmitting(true);
    try {
      const res = (await submitDraft({
        debiteur: {
          type: data.debiteur.type,
          nom: data.debiteur.nom.trim(),
          adresse: data.debiteur.adresse || undefined,
          email: data.debiteur.email || undefined,
          telephone: data.debiteur.telephone || undefined,
          lotDescription: data.debiteur.lotDescription || undefined,
        },
        principalCents: Math.round(parseFloat(data.creance.montant) * 100),
        principalDateExigibilite: new Date(data.creance.dateExigibilite).getTime(),
        periodeDebut: data.creance.periodeDebut ? new Date(data.creance.periodeDebut).getTime() : undefined,
        periodeFin: data.creance.periodeFin ? new Date(data.creance.periodeFin).getTime() : undefined,
        nbRelances: data.creance.nbRelances ? Number(data.creance.nbRelances) : undefined,
        observations: data.creance.observations || undefined,
        casSpecial: data.casSpecial,
      })) as { caseId: string };
      toast.success("Dossier créé. Le cabinet va le contrôler.");
      router.push(`/dossiers/${res.caseId}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Création impossible");
    } finally {
      setSubmitting(false);
    }
  };

  if (draft === undefined) {
    return <div className="p-6 text-sm text-muted-foreground">Chargement…</div>;
  }

  const pieces = buildPieces(data.casSpecial);

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <h1 className="text-2xl font-semibold">Nouveau dossier</h1>

      {resumed && (
        <p className="rounded-md bg-info/10 px-3 py-2 text-sm text-info">
          Brouillon repris automatiquement.
        </p>
      )}

      {/* Stepper */}
      <div className="flex items-center gap-2 text-sm">
        {STEPS.map((label, i) => (
          <span
            key={label}
            className={
              i === step
                ? "font-semibold text-primary"
                : i < step
                  ? "text-foreground"
                  : "text-muted-foreground"
            }
          >
            {i + 1}. {label}
            {i < STEPS.length - 1 && <span className="mx-1 text-muted-foreground">→</span>}
          </span>
        ))}
        {saving && <span className="ml-auto text-xs text-muted-foreground">Enregistré…</span>}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{STEPS[step]}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === 0 && (
            <>
              <div className="space-y-2">
                <Label>Type de débiteur</Label>
                <RadioGroup
                  value={data.debiteur.type}
                  onValueChange={(v) => setDebiteur({ type: v as "PP" | "PM" })}
                  className="flex gap-6"
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="PP" id="pp" />
                    <Label htmlFor="pp">Personne physique</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="PM" id="pm" />
                    <Label htmlFor="pm">Personne morale</Label>
                  </div>
                </RadioGroup>
              </div>
              <Field label="Nom *" value={data.debiteur.nom} onChange={(v) => setDebiteur({ nom: v })} />
              <Field label="Adresse" value={data.debiteur.adresse} onChange={(v) => setDebiteur({ adresse: v })} />
              <Field label="Email" value={data.debiteur.email} onChange={(v) => setDebiteur({ email: v })} />
              <Field label="Téléphone" value={data.debiteur.telephone} onChange={(v) => setDebiteur({ telephone: v })} />
              <Field label="Description du lot" value={data.debiteur.lotDescription} onChange={(v) => setDebiteur({ lotDescription: v })} />
            </>
          )}

          {step === 1 && (
            <>
              <Field label="Montant principal (€) *" type="number" value={data.creance.montant} onChange={(v) => setCreance({ montant: v })} />
              <Field label="Date d'exigibilité *" type="date" value={data.creance.dateExigibilite} onChange={(v) => setCreance({ dateExigibilite: v })} />
              <div className="grid grid-cols-2 gap-4">
                <Field label="Période début" type="date" value={data.creance.periodeDebut} onChange={(v) => setCreance({ periodeDebut: v })} />
                <Field label="Période fin" type="date" value={data.creance.periodeFin} onChange={(v) => setCreance({ periodeFin: v })} />
              </div>
              <Field label="Nombre de relances" type="number" value={data.creance.nbRelances} onChange={(v) => setCreance({ nbRelances: v })} />
              <div className="space-y-2">
                <Label>Observations</Label>
                <Textarea value={data.creance.observations} onChange={(e) => setCreance({ observations: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Cas particuliers</Label>
                {CAS_SPECIAUX.map((c) => (
                  <div key={c.value} className="flex items-center gap-2">
                    <Checkbox
                      id={c.value}
                      checked={data.casSpecial.includes(c.value)}
                      onCheckedChange={() => toggleCas(c.value)}
                    />
                    <Label htmlFor={c.value}>{c.label}</Label>
                  </div>
                ))}
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <p className="text-sm text-muted-foreground">
                Pièces à fournir pour ce dossier. Vous les transmettrez au cabinet
                à l'étape suivante du suivi.
              </p>
              <ul className="space-y-2">
                {pieces.map((p) => (
                  <li key={p.type} className="flex items-center justify-between gap-4 rounded-md border border-border px-3 py-2 text-sm">
                    <span>{p.type}</span>
                    <Badge variant="outline" className="capitalize">{p.requirement}</Badge>
                  </li>
                ))}
              </ul>
              {data.casSpecial.includes("REDRESSEMENT") && (
                <p className="rounded-md bg-warning/10 px-3 py-2 text-sm text-warning">
                  Redressement / liquidation : la procédure est spécifique
                  (déclaration de créance). Le cabinet vous recontactera.
                </p>
              )}
            </>
          )}

          {step === 3 && (
            <div className="space-y-3 text-sm">
              <Recap label="Débiteur" value={`${data.debiteur.type === "PP" ? "Personne physique" : "Personne morale"} — ${data.debiteur.nom}`} />
              <Recap label="Montant" value={data.creance.montant ? `${data.creance.montant} €` : "—"} />
              <Recap label="Exigibilité" value={data.creance.dateExigibilite || "—"} />
              <Recap label="Cas particuliers" value={data.casSpecial.length ? data.casSpecial.join(", ") : "Aucun"} />
              <Recap label="Pièces" value={`${pieces.length} à fournir`} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" disabled={step === 0} onClick={() => goTo(step - 1)}>
          Précédent
        </Button>
        {step < STEPS.length - 1 ? (
          <Button disabled={!canNext()} onClick={() => goTo(step + 1)}>
            Suivant
          </Button>
        ) : (
          <Button disabled={submitting} onClick={onSubmit}>
            {submitting ? "Création…" : "Créer le dossier"}
          </Button>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function Recap({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border py-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
```

Note : pas de `<Link>` dans cette page (navigation par `router.push` au submit) → pas de souci prefetch.

- [ ] **Step 2: Lint + commit**

```bash
cd apps/frontend && node_modules/.bin/next lint --file "src/app/(client)/dossiers/nouveau/page.tsx" 2>&1 | tail -2 && cd ../..
git add "apps/frontend/src/app/(client)/dossiers/nouveau/page.tsx" && git commit -m "feat(s3b): wizard nouveau dossier — 4 steps, auto-save, conditional pieces"
```

---

## Task 8: Codegen + deploy + build

**Files:** aucun. ⚠ Admin key (header du plan).

- [ ] **Step 1: Codegen + typecheck**

```bash
pnpm exec convex codegen && npx tsc --noEmit -p convex 2>&1 | tail -2
```

Expected : `No errors found`. Si TS7022 sur `submitDraft` (référence `internal`/`api`) : le type de retour `Promise<{ caseId: string }>` est déjà annoté — vérifier qu'il n'a pas été omis.

- [ ] **Step 2: Deploy**

```bash
pnpm convex:deploy 2>&1 | tail -2
```

Expected : `✔ Deployed Convex functions`. Aucun index supprimé.

- [ ] **Step 3: Build frontend en conditions Docker (leçon S2B)**

```bash
cd apps/frontend && mv .env.local /tmp/env.local.bak 2>/dev/null; NEXT_PUBLIC_DIRECTUS_URL=https://database.nplavocats.com NEXT_PUBLIC_CONVEX_URL=https://convex.immo.nplavocat.com NEXT_PUBLIC_LOGTO_ENDPOINT=https://auth.nplavocat.com NEXT_PUBLIC_LOGTO_APP_ID=ky0iisybs0g3l7avvju4y NEXT_PUBLIC_LOGTO_RESOURCE=https://convex.immo.nplavocat.com NEXT_PUBLIC_APP_URL=https://immo.nplavocat.com node_modules/.bin/next build --turbopack 2>&1 | grep -E "Compiled|Failed|error|✓|dossiers/nouveau" | head -15; mv /tmp/env.local.bak .env.local 2>/dev/null; cd ../..
```

Expected : `Compiled successfully`, route `/dossiers/nouveau` présente, aucune erreur.

---

## Task 9: Validation E2E + push + PR

**Files:** aucun.

- [ ] **Step 1: Dev local + parcours wizard** — `pnpm --filter frontend dev` puis (Playwright), login `syndic_test_s2b` :
  1. `/dossiers/nouveau` → wizard vide (étape Débiteur)
  2. Saisir type=PP, nom="TEST WIZARD MARTIN" → attendre « Enregistré… » → **recharger la page** → bandeau « Brouillon repris », nom rempli
  3. Suivant → Créance : montant=1500, date d'exigibilité, cocher `LOT_LOUE` + `REDRESSEMENT`
  4. Suivant → Pièces : vérifier « Bail locatif… » présent + encart redressement
  5. Suivant → Validation : récap correct → « Créer le dossier »
  6. Toast succès → redirect `/dossiers/[id]` ; le détail montre le débiteur et le statut `Créé`
- [ ] **Step 2: Vérifier les données**

```bash
export CONVEX_SELF_HOSTED_URL=https://convex.immo.nplavocat.com CONVEX_SELF_HOSTED_ADMIN_KEY='<clé>'
pnpm exec convex data cases --limit 1 --order desc
pnpm exec convex data caseDrafts
pnpm exec convex data auditLogs --limit 2 --order desc
```

Expected : nouveau case avec `debiteur`, `pendingSecibPush: true`, `pieces` (6 entrées REQUESTED dont le bail), `principalCents: 150000` ; `caseDrafts` vide (brouillon supprimé) ; audit `case.created_via_wizard`.

- [ ] **Step 3: Contre-tests** — nom vide → bouton Suivant désactivé (étape 0) ; le wizard d'un autre compte syndic (`npl_test_admin` n'est pas syndic → la query `getMyDraft` renverrait forbidden, mais l'admin n'accède pas au portail — tester plutôt : se reconnecter en syndic, le brouillon précédent est bien supprimé après submit). Non-régression liste/détail S3a.

- [ ] **Step 4: Push + PR**

```bash
git push -u origin feat/convex-s3b-wizard
gh pr create --base main --head feat/convex-s3b-wizard --title "feat(s3b): wizard nouveau dossier syndic (Convex, sans écriture SECIB)" --body "<résumé : décisions Q1-Q5, parcours validé, compteurs>"
```

- [ ] **Step 5: Relayer l'URL.** Après merge : déploiement Coolify (build = Task 8 step 3 déjà mimé) ; valider le parcours en prod.

---

## Self-review (fait à l'écriture)

- **Couverture spec** : schéma debiteur/créance/flag/index ✔ (T2), catalogue pièces ✔ (T3, MULTI_LOTS=undefined), requireRoleMutation ✔ (T4), getMyDraft/saveDraft/submitDraft atomique + validation serveur + audit ✔ (T5), refs+types+copie catalogue ✔ (T6), wizard 4 étapes + auto-save debounce + réhydratation + pièces conditionnelles live + encart redressement ✔ (T7), deploy + build Docker ✔ (T8), validation + contre-tests ✔ (T9).
- **Types cohérents** : `WizardData`/`CasSpecial`/`DraftDoc` (T6) consommés par T7 ; `casSpecialValidator` (T5) aligné sur le schéma (T2) et `CasSpecial` (T6) ; `buildPieces` identique back (T3) / front (T6) ; `submitDraft` args ↔ champs schéma cases (T2) ; retour `{ caseId }` annoté (anti-TS7022).
- **Pièges anticipés** : un seul brouillon (`by_author` `.unique()`) ; auto-save ne part pas avant hydratation (`if (hydrated)`) ; pas de `<Link>` dans le wizard (prefetch non concerné) ; submit convertit euros→cents et dates→epoch côté client, le serveur valide les valeurs typées ; `pieces` insérées avec `status: "REQUESTED" as const` (union schéma).
