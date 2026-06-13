# S3a — Portail Syndic lecture (Convex) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Le portail syndic (`(client)/`) tourne sur Logto + Convex : dashboard realtime, liste de dossiers, détail 3 tabs avec documents SECIB téléchargeables. Directus disparaît du chemin client.

**Architecture:** Backend : snapshot enrichi de 2 libellés + query `cases.duSyndic` + 2 actions documents scopées (garde `assertCaseInOrg`). Frontend : middleware route-aware (Logto edge pour `(client)`, Directus inchangé pour `(admin)`), pages réécrites en client components Convex (`useQuery`/`useAction` via `makeFunctionReference` — pattern playground, pas de couplage au codegen), composants métier `StatusBadge`/`CaseTimeline`, placeholders pour les pages S3b/S3c.

**Tech Stack:** Convex 1.39 self-hosted, @logto/next 4.2 (`/edge` pour le middleware), Next.js 15 App Router, ShadCN (table/tabs/card/select/input/badge/button/skeleton), Sonner.

**Spec:** `docs/superpowers/specs/2026-06-12-convex-s3a-portail-lecture-design.md`

**Repo pattern note:** pas de tests unitaires (convention repo) — validation par typecheck/lint/build + E2E manuel Playwright. **Admin key Convex** pour les tasks deploy : memory `reference-convex-admin-key-retrieval`.

**Codegen note:** les nouveaux exports Convex ne sont connus de `_generated` qu'après `convex codegen` (credentials requis). Erreurs tsc limitées à des propriétés inconnues de `internal.*`/`api.*` = attendu, à signaler ; l'orchestrateur lance le codegen entre les lots. Côté frontend, AUCUN import de `convex/_generated` — uniquement `makeFunctionReference`.

---

## Task 1: Pre-flight

**Files:** aucun.

- [ ] **Step 1:**

```bash
cd /Users/mkstudio/Desktop/recouvrement_immo_npl && git branch --show-current && git status --short
```

Expected : `feat/convex-s3a-portail-lecture` ; untracked `.playwright-mcp/`, `convex/_generated/` tolérés.

- [ ] **Step 2: Lire les fichiers qui seront réécrits** (comprendre avant d'écraser)

```bash
wc -l apps/frontend/src/middleware.ts apps/frontend/src/app/\(client\)/layout.tsx apps/frontend/src/app/\(client\)/dashboard/page.tsx apps/frontend/src/app/\(client\)/dossiers/page.tsx "apps/frontend/src/app/(client)/dossiers/[id]/page.tsx"
cat apps/frontend/src/components/layout/ClientLayoutWrapper.tsx | head -60
```

Noter les props exactes de `ClientLayoutWrapper` (attendu : `userName`, `userCompany`, `unreadCount`, `children`) et vérifier qu'il n'importe RIEN de `lib/directus` ou `lib/api` (s'il en importe → le signaler en DONE_WITH_CONCERNS, l'adaptation se décidera à la review).

---

## Task 2: Backend — snapshot enrichi (schéma + upsert + import)

**Files:**
- Modify: `convex/schema.ts` (table `cases`, bloc snapshot `secib*`)
- Modify: `convex/cases.ts` (snapshotValidator + patch champ-par-champ)
- Modify: `convex/importSecib.ts` (types + mapping)

- [ ] **Step 1: Schéma — 2 champs**

Dans le bloc « Snapshot SECIB inline » de la table `cases`, après `secibCodeMatiere`, ajouter :

```ts
    secibMatiereLibelle: v.optional(v.string()),
```

et après `secibIntervenantId` :

```ts
    secibResponsableNom: v.optional(v.string()),
```

- [ ] **Step 2: `convex/cases.ts` — étendre le validator et le patch**

Dans `snapshotValidator`, ajouter après `secibCodeMatiere` :

```ts
  secibMatiereLibelle: v.optional(v.string()),
```

et après `secibIntervenantId` :

```ts
  secibResponsableNom: v.optional(v.string()),
```

Dans le patch champ-par-champ de `upsertFromSecib`, ajouter les 2 lignes correspondantes :

```ts
        secibMatiereLibelle: args.snapshot.secibMatiereLibelle,
        secibResponsableNom: args.snapshot.secibResponsableNom,
```

(juste après leurs voisins respectifs `secibCodeMatiere` / `secibIntervenantId` ; le insert path utilise déjà `...args.snapshot`, rien à changer).

- [ ] **Step 3: `convex/importSecib.ts` — mapping**

Dans le type `DetailResponse`, étendre :

```ts
    Matiere?: { MatiereId: number; Libelle?: string | null } | null;
    Responsable?: { UtilisateurId: number; NomComplet?: string | null } | null;
```

Dans la construction du `snapshot`, ajouter :

```ts
            secibMatiereLibelle: d.Matiere?.Libelle ?? undefined,
            secibResponsableNom: d.Responsable?.NomComplet ?? undefined,
```

- [ ] **Step 4: Typecheck + commit**

```bash
npx tsc --noEmit -p convex 2>&1 | tail -2
git add convex/schema.ts convex/cases.ts convex/importSecib.ts && git commit -m "feat(s3a): snapshot enriched with matiere/responsable labels for syndic UI"
```

---

## Task 3: Backend — `cases.duSyndic` + internal getter

**Files:**
- Modify: `convex/cases.ts`

- [ ] **Step 1: Ajouter en fin de `convex/cases.ts`**

Compléter l'import en tête : `import { internalMutation, internalQuery, query } from "./_generated/server";` et `import { requireRoleQuery, SYNDIC_ROLES } from "./lib/auth";` (fusionner avec les imports existants).

```ts
// Getter interne — utilisé par les actions secib.* pour la garde
// d'appartenance org (assertCaseInOrg) avant tout appel gateway.
export const getByIdInternal = internalQuery({
  args: { caseId: v.id("cases") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.caseId);
  },
});

// Liste des cases de l'org du syndic appelant — pendant LOCAL de
// secib.dossiersDuSyndic (qui interroge SECIB en direct). Realtime,
// zéro appel gateway. collect() : volumétrie pilote ≤ ~150 docs,
// tri/filtres côté client ; pagination quand le volume l'exigera.
export const duSyndic = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireRoleQuery(ctx, SYNDIC_ROLES);
    return await ctx.db
      .query("cases")
      .withIndex("by_org", (q) => q.eq("organizationId", user.organizationId))
      .collect();
  },
});
```

- [ ] **Step 2: Typecheck + commit**

```bash
npx tsc --noEmit -p convex 2>&1 | tail -2
git add convex/cases.ts && git commit -m "feat(s3a): cases.duSyndic query + internal getter for org guard"
```

---

## Task 4: Backend — actions documents scopées

**Files:**
- Modify: `convex/secib.ts`

- [ ] **Step 1: Ajouter en fin de `convex/secib.ts`** (le fichier est `"use node"`, actions only — c'est bien des actions)

Compléter les imports existants : `notAuthenticated` n'est pas nécessaire ; ajouter `v` est déjà importé ; ajouter `import type { Id } from "./_generated/dataModel";` et étendre l'import errors : `import { forbidden, noSecibPersonneId } from "./lib/errors";` (déjà présent — vérifier).

```ts
// ─────────────────────────────────────────────────────────────────
// assertCaseInOrg — garde d'appartenance pour les actions documents.
// Rôles syndic : le case DOIT appartenir à leur org. Rôles NPL full
// access : passage direct (le cabinet voit tout). npl_avocat n'est
// PAS autorisé ici (son scope intervenant viendra avec son portail).
// ⚠ Le documentId de telechargerDocument n'est pas re-vérifié contre
// le dossier (pas de check direct côté SECIB) — accepté au pilote,
// l'audit log trace tout ; à durcir si multi-tenant réel.
// ─────────────────────────────────────────────────────────────────
async function assertCaseInOrg(
  ctx: Parameters<typeof withAuditLog>[0],
  audit: AuditContext,
  caseId: Id<"cases">,
): Promise<{ secibDossierId: string }> {
  const caseDoc = await ctx.runQuery(internal.cases.getByIdInternal, {
    caseId,
  });
  if (!caseDoc) {
    throw new ConvexError({
      code: "case.not_found",
      message: `Case ${caseId} not found.`,
    });
  }
  const isNplFull = (NPL_FULL_ACCESS_ROLES as readonly string[]).includes(
    audit.role,
  );
  if (!isNplFull && caseDoc.organizationId !== audit.organizationId) {
    throw forbidden(audit.role, SYNDIC_ROLES);
  }
  if (!caseDoc.secibDossierId) {
    throw new ConvexError({
      code: "case.not_linked_to_secib",
      message: "Ce dossier n'est pas encore lié à SECIB.",
    });
  }
  return { secibDossierId: caseDoc.secibDossierId };
}

// Documents SECIB d'un dossier — pour le tab Documents du détail.
export const documentsDuDossier = action({
  args: { caseId: v.id("cases") },
  handler: async (ctx, args): Promise<unknown> => {
    return await withAuditLog(
      ctx,
      {
        action: "secib.documents_du_dossier",
        targetType: "case",
        targetId: args.caseId,
      },
      async (audit) => {
        assertRole(audit, [...SYNDIC_ROLES, ...NPL_FULL_ACCESS_ROLES]);
        const { secibDossierId } = await assertCaseInOrg(ctx, audit, args.caseId);
        return await secibFetch(ctx, audit, {
          endpoint: `/dossiers/${secibDossierId}/documents`,
          targetType: "dossier_documents",
          targetId: secibDossierId,
        });
      },
    );
  },
});

// Téléchargement d'un document — renvoie { fileName, mimeType,
// contentBase64 } (limite valeur Convex 16 Mo : un PDF > ~10 Mo
// échouera proprement en ConvexError — accepté au pilote).
export const telechargerDocument = action({
  args: { caseId: v.id("cases"), documentId: v.string() },
  handler: async (ctx, args): Promise<unknown> => {
    return await withAuditLog(
      ctx,
      {
        action: "secib.telecharger_document",
        targetType: "document",
        targetId: args.documentId,
      },
      async (audit) => {
        assertRole(audit, [...SYNDIC_ROLES, ...NPL_FULL_ACCESS_ROLES]);
        await assertCaseInOrg(ctx, audit, args.caseId);
        return await secibFetch(ctx, audit, {
          endpoint: `/documents/${args.documentId}/content`,
          targetType: "document_content",
          targetId: args.documentId,
        });
      },
    );
  },
});
```

Notes implémentation : `withAuditLog`, `AuditContext`, `assertRole`, `SYNDIC_ROLES`, `NPL_FULL_ACCESS_ROLES`, `ConvexError`, `internal`, `secibFetch` sont déjà importés/définis dans `convex/secib.ts` (vérifier `AuditContext` est importé en type — sinon l'ajouter à l'import de `./lib/audit`).

- [ ] **Step 2: Vérifier le path gateway du content**

```bash
grep -n "content" "/Users/mkstudio/Desktop/API GATEWAY SECIB NPL/npl-api-gateway/src/routes/documents.ts" | head -5
```

Expected : une route `GET /:id/content` (le endpoint complet est donc `/documents/{id}/content`). Si le path diffère, adapter l'endpoint dans `telechargerDocument` et le signaler.

- [ ] **Step 3: Typecheck + commit**

```bash
npx tsc --noEmit -p convex 2>&1 | tail -3
```

(Erreur éventuelle limitée à `internal.cases.getByIdInternal` inconnu = codegen-gated, OK.)

```bash
git add convex/secib.ts && git commit -m "feat(s3a): scoped document actions — documentsDuDossier + telechargerDocument"
```

---

## Task 5: Frontend — refs Convex partagées + types

**Files:**
- Create: `apps/frontend/src/lib/convexApi.ts`

- [ ] **Step 1: Écrire `apps/frontend/src/lib/convexApi.ts`**

```ts
import { makeFunctionReference } from "convex/server";

// Références type-erased vers les fonctions Convex (pattern playground :
// pas d'import de convex/_generated pour ne pas coupler le tsconfig
// frontend au codegen). Les types ci-dessous reflètent les champs
// réellement consommés par l'UI.

export const meQuery = makeFunctionReference<"query">("users:me");
export const casesDuSyndicQuery = makeFunctionReference<"query">("cases:duSyndic");
export const documentsDuDossierAction = makeFunctionReference<"action">(
  "secib:documentsDuDossier",
);
export const telechargerDocumentAction = makeFunctionReference<"action">(
  "secib:telechargerDocument",
);

export type CaseStatus =
  | "CREE"
  | "EN_ATTENTE_PIECES"
  | "PRET"
  | "MISE_EN_DEMEURE_ENVOYEE"
  | "INJONCTION_DE_PAYER"
  | "ASSIGNATION_AU_FOND"
  | "JUGEMENT_OBTENU"
  | "CLOTURE"
  | "SUSPENDU";

export type CaseDoc = {
  _id: string;
  status: CaseStatus;
  statusChangedAt: number;
  principalCents?: number;
  secibDossierId?: string;
  secibLibelle?: string;
  secibCodeMatiere?: string;
  secibMatiereLibelle?: string;
  secibDateOuverture?: number;
  secibIntervenantId?: string;
  secibResponsableNom?: string;
  secibSnapshotAt?: number;
  createdAt: number;
  updatedAt: number;
};

export type SecibDocumentEntry = {
  DocumentId: string;
  Libelle?: string | null;
  Extension?: string | null;
  DateCreation?: string | null;
  RepertoireLibelle?: string | null;
};

export type DocumentContent = {
  fileName: string;
  mimeType: string;
  contentBase64: string;
};

// Les réponses gateway sont enveloppées { data: T }.
export type GatewayResponse<T> = { data?: T };
```

- [ ] **Step 2: Lint + commit**

```bash
cd apps/frontend && npx next lint --file src/lib/convexApi.ts 2>&1 | tail -2 && cd ../..
git add apps/frontend/src/lib/convexApi.ts && git commit -m "feat(s3a): shared Convex function refs + UI types"
```

---

## Task 6: Middleware route-aware + redirect callback

**Files:**
- Modify: `apps/frontend/src/middleware.ts`
- Modify: `apps/frontend/src/app/api/logto/[action]/route.ts`

- [ ] **Step 1: Middleware**

Dans `apps/frontend/src/middleware.ts` :

a) Ajouter les imports :

```ts
import LogtoClient from "@logto/next/edge";
import { logtoConfig } from "@/lib/logto";
```

b) Remplacer la constante `convexPaths` et son commentaire par :

```ts
// Routes sous auth Logto/Convex. (client) est réécrit sur Convex (S3a) ;
// (admin) reste sous Directus jusqu'à S5.
const logtoPaths = [
  "/convex-poc",
  "/dashboard",
  "/dossiers",
  "/documents",
  "/messagerie",
  "/parametres",
];

const logtoClient = new LogtoClient(logtoConfig);
```

c) Remplacer le bloc « Logto / Convex routes » par :

```ts
  if (logtoPaths.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    // /convex-poc gère son propre état non-authentifié (lien Sign in).
    if (pathname.startsWith("/convex-poc")) return NextResponse.next();
    const { isAuthenticated } = await logtoClient.getLogtoContext(request);
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL("/api/logto/sign-in", request.url));
    }
    return NextResponse.next();
  }
```

d) Dans le reste du middleware (guard Directus), supprimer les références aux `clientRoutes` devenues Logto : retirer le tableau `clientRoutes` et le bloc `if ((userRole === "admin" || ...)` qui redirige admin/avocat hors des routes client (elles ne passent plus par ce code), en gardant intact le guard `/admin`. Lire le fichier complet avant d'éditer — l'objectif : les routes `(client)` ne touchent plus AUCUN code Directus.

- [ ] **Step 2: Callback → /dashboard**

Dans `apps/frontend/src/app/api/logto/[action]/route.ts`, remplacer :

```ts
      redirect("/convex-poc/dossiers");
```

par :

```ts
      redirect("/dashboard");
```

(et ajuster le commentaire au-dessus : le portail syndic est la destination post-login).

- [ ] **Step 3: Lint + commit**

```bash
cd apps/frontend && npx next lint --file src/middleware.ts --file "src/app/api/logto/[action]/route.ts" 2>&1 | tail -2 && cd ../..
git add apps/frontend/src/middleware.ts "apps/frontend/src/app/api/logto/[action]/route.ts" && git commit -m "feat(s3a): route-aware middleware — Logto guards (client), callback lands on /dashboard"
```

---

## Task 7: Composants métier

**Files:**
- Create: `apps/frontend/src/components/metier/StatusBadge.tsx`
- Create: `apps/frontend/src/components/metier/CaseTimeline.tsx`

- [ ] **Step 1: `StatusBadge.tsx`**

```tsx
import { Badge } from "@/components/ui/badge";
import type { CaseStatus } from "@/lib/convexApi";

// Mapping statuts → libellés FR + classes sémantiques du design system
// (tokens HSL de globals.css). Pill par convention badges.
const STATUS_CONFIG: Record<CaseStatus, { label: string; className: string }> = {
  CREE: { label: "Créé", className: "bg-info/15 text-info border-info/30" },
  EN_ATTENTE_PIECES: {
    label: "En attente de pièces",
    className: "bg-warning/15 text-warning border-warning/30",
  },
  PRET: { label: "Prêt", className: "bg-success/15 text-success border-success/30" },
  MISE_EN_DEMEURE_ENVOYEE: {
    label: "Mise en demeure envoyée",
    className: "bg-primary/15 text-primary border-primary/30",
  },
  INJONCTION_DE_PAYER: {
    label: "Injonction de payer",
    className: "bg-primary/15 text-primary border-primary/30",
  },
  ASSIGNATION_AU_FOND: {
    label: "Assignation au fond",
    className: "bg-primary/15 text-primary border-primary/30",
  },
  JUGEMENT_OBTENU: {
    label: "Jugement obtenu",
    className: "bg-success/15 text-success border-success/30",
  },
  CLOTURE: { label: "Clôturé", className: "bg-muted text-muted-foreground" },
  SUSPENDU: { label: "Suspendu", className: "bg-muted text-muted-foreground" },
};

export function StatusBadge({ status }: { status: CaseStatus }) {
  const config = STATUS_CONFIG[status] ?? {
    label: status,
    className: "bg-muted text-muted-foreground",
  };
  return (
    <Badge variant="outline" className={`rounded-full ${config.className}`}>
      {config.label}
    </Badge>
  );
}
```

⚠ Vérifier que `success`/`warning`/`info` existent comme couleurs Tailwind (cf. `tailwind.config.ts` — le design system les définit). Sinon utiliser les classes existantes équivalentes du projet (chercher l'usage dans `components/` ; le portail Directus avait déjà des badges de statut — réutiliser leurs classes).

- [ ] **Step 2: `CaseTimeline.tsx`**

```tsx
export type TimelineEvent = {
  id: string;
  date: number;
  title: string;
  description?: string;
};

// Timeline verticale minimaliste (point + ligne). S3a n'affiche que la
// création ; S5 y ajoutera les transitions de statut.
export function CaseTimeline({ events }: { events: TimelineEvent[] }) {
  if (events.length === 0) {
    return <p className="text-sm text-muted-foreground">Aucun événement.</p>;
  }
  return (
    <ol className="relative ml-3 border-l border-border">
      {events.map((event) => (
        <li key={event.id} className="mb-6 ml-6">
          <span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border border-background bg-primary" />
          <time className="text-xs text-muted-foreground">
            {new Date(event.date).toLocaleDateString("fr-FR", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </time>
          <h3 className="text-sm font-medium text-foreground">{event.title}</h3>
          {event.description && (
            <p className="text-sm text-muted-foreground">{event.description}</p>
          )}
        </li>
      ))}
    </ol>
  );
}
```

- [ ] **Step 3: Lint + commit**

```bash
cd apps/frontend && npx next lint --file "src/components/metier/*.tsx" 2>&1 | tail -2 && cd ../..
git add apps/frontend/src/components/metier && git commit -m "feat(s3a): StatusBadge + CaseTimeline business components"
```

---

## Task 8: Layout `(client)` sur Convex

**Files:**
- Modify (réécriture): `apps/frontend/src/app/(client)/layout.tsx`

- [ ] **Step 1: Réécrire le layout en client component**

```tsx
"use client";

import { useQuery } from "convex/react";
import { meQuery } from "@/lib/convexApi";
import { ClientLayoutWrapper } from "@/components/layout/ClientLayoutWrapper";

// Layout du portail syndic — identité via Convex (users.me), plus
// aucune dépendance Directus. Le middleware garantit une session
// Logto ; ce layout gère les deux états restants : provisioning
// manquant et rôle non-syndic.
export default function ClientLayout({
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

  if (me === null || me.organizationKind !== "syndic") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
        <h1 className="text-lg font-semibold">Ce portail est réservé aux syndics</h1>
        <p className="text-sm text-muted-foreground">
          {me === null
            ? "Votre compte n'est pas encore provisionné. Contactez le cabinet NPL."
            : `Connecté en tant que ${me.name} (${me.role}).`}
        </p>
        <a href="/api/logto/sign-out" className="text-sm text-primary underline">
          Se déconnecter
        </a>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <ClientLayoutWrapper
        userName={me.name}
        userCompany={me.organizationName ?? "Syndic"}
        unreadCount={0}
      >
        {children}
      </ClientLayoutWrapper>
    </div>
  );
}
```

(Si la lecture Task 1 a montré des props différentes sur `ClientLayoutWrapper`, adapter les props — pas le wrapper.)

- [ ] **Step 2: Lint + commit**

```bash
cd apps/frontend && npx next lint --file "src/app/(client)/layout.tsx" 2>&1 | tail -2 && cd ../..
git add "apps/frontend/src/app/(client)/layout.tsx" && git commit -m "feat(s3a): client layout on Convex identity — Directus-free"
```

---

## Task 9: Pages dashboard + liste

**Files:**
- Modify (réécriture): `apps/frontend/src/app/(client)/dashboard/page.tsx`
- Modify (réécriture): `apps/frontend/src/app/(client)/dossiers/page.tsx`

- [ ] **Step 1: `dashboard/page.tsx`**

```tsx
"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/metier/StatusBadge";
import {
  casesDuSyndicQuery,
  type CaseDoc,
  type CaseStatus,
} from "@/lib/convexApi";

// Dashboard syndic — minimal honnête (décision Q3 S3a) : compteurs par
// statut + derniers dossiers mis à jour. Une seule query realtime.
export default function DashboardPage() {
  const cases = useQuery(casesDuSyndicQuery) as CaseDoc[] | undefined;

  if (cases === undefined) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  const byStatus = new Map<CaseStatus, number>();
  for (const c of cases) byStatus.set(c.status, (byStatus.get(c.status) ?? 0) + 1);
  const recent = [...cases].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 5);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Tableau de bord</h1>
        <Button asChild>
          <Link href="/dossiers">Voir tous les dossiers ({cases.length})</Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[...byStatus.entries()].map(([status, count]) => (
          <Card key={status}>
            <CardHeader className="pb-2">
              <StatusBadge status={status} />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{count}</p>
              <p className="text-xs text-muted-foreground">
                dossier{count > 1 ? "s" : ""}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Derniers dossiers mis à jour</CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-border">
          {recent.map((c) => (
            <Link
              key={c._id}
              href={`/dossiers/${c._id}`}
              className="flex items-center justify-between gap-4 py-3 hover:bg-muted/50"
            >
              <span className="truncate text-sm">{c.secibLibelle ?? "Dossier"}</span>
              <StatusBadge status={c.status} />
            </Link>
          ))}
          {recent.length === 0 && (
            <p className="py-3 text-sm text-muted-foreground">Aucun dossier.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: `dossiers/page.tsx` (liste)**

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/metier/StatusBadge";
import {
  casesDuSyndicQuery,
  type CaseDoc,
  type CaseStatus,
} from "@/lib/convexApi";

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

type SortKey = "secibLibelle" | "secibDateOuverture" | "updatedAt";

// Liste des dossiers — filtres/tri/recherche côté client (volumétrie
// pilote ≤ ~150 ; pagination serveur quand le volume l'exigera).
export default function DossiersPage() {
  const cases = useQuery(casesDuSyndicQuery) as CaseDoc[] | undefined;
  const [statusFilter, setStatusFilter] = useState<string>("tous");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("updatedAt");
  const [sortAsc, setSortAsc] = useState(false);

  const rows = useMemo(() => {
    if (!cases) return [];
    let filtered = cases;
    if (statusFilter !== "tous") {
      filtered = filtered.filter((c) => c.status === statusFilter);
    }
    if (search.trim()) {
      const needle = search.trim().toLowerCase();
      filtered = filtered.filter((c) =>
        (c.secibLibelle ?? "").toLowerCase().includes(needle),
      );
    }
    return [...filtered].sort((a, b) => {
      const av = a[sortKey] ?? 0;
      const bv = b[sortKey] ?? 0;
      const cmp =
        typeof av === "string" && typeof bv === "string"
          ? av.localeCompare(bv, "fr")
          : Number(av) - Number(bv);
      return sortAsc ? cmp : -cmp;
    });
  }, [cases, statusFilter, search, sortKey, sortAsc]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc((s) => !s);
    else {
      setSortKey(key);
      setSortAsc(key === "secibLibelle");
    }
  };

  if (cases === undefined) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-6">
      <h1 className="text-2xl font-semibold">Mes dossiers</h1>

      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Rechercher un dossier…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="tous">Tous les statuts</SelectItem>
            {ALL_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground">
          {rows.length} dossier{rows.length > 1 ? "s" : ""}
        </p>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="cursor-pointer" onClick={() => toggleSort("secibLibelle")}>
              Libellé
            </TableHead>
            <TableHead>Statut</TableHead>
            <TableHead>Matière</TableHead>
            <TableHead className="cursor-pointer" onClick={() => toggleSort("secibDateOuverture")}>
              Ouverture
            </TableHead>
            <TableHead className="cursor-pointer" onClick={() => toggleSort("updatedAt")}>
              Dernière maj
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((c) => (
            <TableRow key={c._id}>
              <TableCell className="max-w-md">
                <Link href={`/dossiers/${c._id}`} className="block truncate hover:underline">
                  {c.secibLibelle ?? "Dossier"}
                </Link>
              </TableCell>
              <TableCell>
                <StatusBadge status={c.status} />
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {c.secibMatiereLibelle ?? "—"}
              </TableCell>
              <TableCell className="text-sm">
                {c.secibDateOuverture
                  ? new Date(c.secibDateOuverture).toLocaleDateString("fr-FR")
                  : "—"}
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

(Affiner : les `SelectItem` de statut devraient afficher les libellés FR de `StatusBadge` — exporter `STATUS_CONFIG` depuis `StatusBadge.tsx` et l'utiliser : `{STATUS_CONFIG[s].label}`. Faire cette retouche.)

- [ ] **Step 3: Lint + commit**

```bash
cd apps/frontend && npx next lint --file "src/app/(client)/dashboard/page.tsx" --file "src/app/(client)/dossiers/page.tsx" 2>&1 | tail -2 && cd ../..
git add "apps/frontend/src/app/(client)/dashboard/page.tsx" "apps/frontend/src/app/(client)/dossiers/page.tsx" && git commit -m "feat(s3a): dashboard + dossiers list on Convex realtime"
```

---

## Task 10: Page détail (3 tabs)

**Files:**
- Modify (réécriture): `apps/frontend/src/app/(client)/dossiers/[id]/page.tsx`

- [ ] **Step 1: Réécrire la page détail**

```tsx
"use client";

import { use, useEffect, useState } from "react";
import { useAction, useQuery } from "convex/react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Download } from "lucide-react";
import { StatusBadge } from "@/components/metier/StatusBadge";
import { CaseTimeline } from "@/components/metier/CaseTimeline";
import {
  casesDuSyndicQuery,
  documentsDuDossierAction,
  telechargerDocumentAction,
  type CaseDoc,
  type DocumentContent,
  type GatewayResponse,
  type SecibDocumentEntry,
} from "@/lib/convexApi";

function fmtDate(ms?: number) {
  return ms ? new Date(ms).toLocaleDateString("fr-FR") : "—";
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

// Tab Documents — fetch à l'ouverture (action scopée auditée côté Convex).
function DocumentsTab({ caseId }: { caseId: string }) {
  const fetchDocs = useAction(documentsDuDossierAction);
  const download = useAction(telechargerDocumentAction);
  const [docs, setDocs] = useState<SecibDocumentEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDocs({ caseId })
      .then((res) => {
        const payload = res as GatewayResponse<SecibDocumentEntry[]>;
        setDocs(payload.data ?? []);
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
    // fetchDocs est stable (useAction) ; caseId est la seule vraie dep.
  }, [caseId, fetchDocs]);

  const onDownload = async (doc: SecibDocumentEntry) => {
    try {
      const res = (await download({
        caseId,
        documentId: doc.DocumentId,
      })) as GatewayResponse<DocumentContent> & Partial<DocumentContent>;
      const content = (res.data ?? res) as DocumentContent;
      const bytes = Uint8Array.from(atob(content.contentBase64), (ch) =>
        ch.charCodeAt(0),
      );
      const blob = new Blob([bytes], { type: content.mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = content.fileName || `${doc.Libelle ?? "document"}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Téléchargement impossible");
    }
  };

  if (error) {
    return <p className="text-sm text-destructive">{error}</p>;
  }
  if (docs === null) {
    return <Skeleton className="h-40" />;
  }
  if (docs.length === 0) {
    return <p className="text-sm text-muted-foreground">Aucun document.</p>;
  }

  const byRepertoire = new Map<string, SecibDocumentEntry[]>();
  for (const d of docs) {
    const key = d.RepertoireLibelle ?? "Autres";
    byRepertoire.set(key, [...(byRepertoire.get(key) ?? []), d]);
  }

  return (
    <div className="space-y-6">
      {[...byRepertoire.entries()].map(([repertoire, entries]) => (
        <div key={repertoire}>
          <h3 className="mb-2 text-sm font-semibold text-muted-foreground">
            {repertoire}
          </h3>
          <div className="divide-y divide-border rounded-lg border border-border">
            {entries.map((d) => (
              <div
                key={d.DocumentId}
                className="flex items-center justify-between gap-4 px-4 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm">{d.Libelle ?? d.DocumentId}</p>
                  <p className="text-xs text-muted-foreground">
                    {d.Extension ?? ""}{" "}
                    {d.DateCreation
                      ? new Date(d.DateCreation).toLocaleDateString("fr-FR")
                      : ""}
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={() => onDownload(d)}>
                  <Download className="mr-1 h-4 w-4" /> Télécharger
                </Button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function DossierDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const cases = useQuery(casesDuSyndicQuery) as CaseDoc[] | undefined;

  if (cases === undefined) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-96" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  const caseDoc = cases.find((c) => c._id === id);
  if (!caseDoc) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">
          Dossier introuvable ou n'appartenant pas à votre organisation.
        </p>
      </div>
    );
  }

  const events = [
    {
      id: "created",
      date: caseDoc.createdAt,
      title: "Dossier créé",
      description: caseDoc.secibSnapshotAt ? "Importé depuis SECIB" : undefined,
    },
  ];

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold">{caseDoc.secibLibelle ?? "Dossier"}</h1>
        <StatusBadge status={caseDoc.status} />
      </div>

      <Tabs defaultValue="infos">
        <TabsList>
          <TabsTrigger value="infos">Infos</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="suivi">Suivi</TabsTrigger>
        </TabsList>

        <TabsContent value="infos">
          <Card>
            <CardContent className="pt-6">
              <InfoRow label="Matière" value={caseDoc.secibMatiereLibelle ?? "—"} />
              <InfoRow label="Responsable" value={caseDoc.secibResponsableNom ?? "—"} />
              <InfoRow label="Date d'ouverture" value={fmtDate(caseDoc.secibDateOuverture)} />
              <InfoRow label="Référence SECIB" value={caseDoc.secibDossierId ?? "—"} />
              <InfoRow
                label="Montant principal"
                value={
                  caseDoc.principalCents !== undefined
                    ? `${(caseDoc.principalCents / 100).toLocaleString("fr-FR")} €`
                    : "À renseigner"
                }
              />
              <InfoRow label="Dernière mise à jour" value={fmtDate(caseDoc.updatedAt)} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents">
          {caseDoc.secibDossierId ? (
            <DocumentsTab caseId={caseDoc._id} />
          ) : (
            <p className="text-sm text-muted-foreground">
              Pas encore lié à SECIB.
            </p>
          )}
        </TabsContent>

        <TabsContent value="suivi">
          <CaseTimeline events={events} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

Note : le tab Documents n'est monté qu'à l'activation (comportement Radix Tabs par défaut) — le fetch ne part donc qu'à l'ouverture du tab, comme spécifié.

- [ ] **Step 2: Lint + commit**

```bash
cd apps/frontend && npx next lint --file "src/app/(client)/dossiers/[id]/page.tsx" 2>&1 | tail -2 && cd ../..
git add "apps/frontend/src/app/(client)/dossiers/[id]/page.tsx" && git commit -m "feat(s3a): dossier detail — infos/documents/suivi tabs on Convex"
```

---

## Task 11: Placeholders S3b/S3c

**Files:**
- Create: `apps/frontend/src/components/shared/ComingSoon.tsx`
- Modify (réécriture): `apps/frontend/src/app/(client)/documents/page.tsx`
- Modify (réécriture): `apps/frontend/src/app/(client)/messagerie/page.tsx`
- Modify (réécriture): `apps/frontend/src/app/(client)/parametres/page.tsx`
- Modify (réécriture): `apps/frontend/src/app/(client)/dossiers/nouveau/page.tsx`

- [ ] **Step 1: `ComingSoon.tsx`**

```tsx
import Link from "next/link";
import { Construction } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ComingSoon({ title }: { title: string }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <Construction className="h-10 w-10 text-muted-foreground" />
      <h1 className="text-xl font-semibold">{title}</h1>
      <p className="text-sm text-muted-foreground">
        Cette fonctionnalité arrive prochainement.
      </p>
      <Button asChild variant="outline">
        <Link href="/dashboard">Retour au tableau de bord</Link>
      </Button>
    </div>
  );
}
```

- [ ] **Step 2: Les 4 pages** — chacune devient exactement :

```tsx
import { ComingSoon } from "@/components/shared/ComingSoon";

export default function Page() {
  return <ComingSoon title="<TITRE>" />;
}
```

avec `<TITRE>` respectivement : « Documents », « Messagerie », « Paramètres », « Nouveau dossier ».

- [ ] **Step 3: Lint + commit**

```bash
cd apps/frontend && npx next lint 2>&1 | tail -3 && cd ../..
git add apps/frontend/src && git commit -m "feat(s3a): placeholder pages for S3b/S3c features"
```

⚠ `git add apps/frontend/src` à ce stade ne doit ajouter QUE les 5 fichiers de cette task — vérifier avec `git status --short` avant le commit.

---

## Task 12: Build local complet (conditions Docker)

**Files:** aucun.

- [ ] **Step 1: Build sans `.env.local` (mimique le build Coolify — leçon S2B)**

```bash
cd apps/frontend && mv .env.local /tmp/env.local.bak 2>/dev/null; NEXT_PUBLIC_DIRECTUS_URL=https://database.nplavocats.com NEXT_PUBLIC_CONVEX_URL=https://convex.immo.nplavocat.com NEXT_PUBLIC_LOGTO_ENDPOINT=https://auth.nplavocat.com NEXT_PUBLIC_LOGTO_APP_ID=ky0iisybs0g3l7avvju4y NEXT_PUBLIC_LOGTO_RESOURCE=https://convex.immo.nplavocat.com NEXT_PUBLIC_APP_URL=https://immo.nplavocat.com npx next build --turbopack 2>&1 | tail -8; mv /tmp/env.local.bak .env.local 2>/dev/null; cd ../..
```

Expected : build OK. Pages `(client)` : statiques (client components purs) ou dynamiques — peu importe, AUCUNE ne doit faire échouer le prerender (pas de `getLogtoContext` au rendu, pas de throw au module scope).

- [ ] **Step 2: Commit éventuel** (si des fixes ont été nécessaires, les committer en `fix(s3a): build fixes`).

---

## Task 13: Deploy backend + re-run imports (libellés)

**Files:** aucun. ⚠ Admin key (header du plan).

- [ ] **Step 1: Codegen + deploy**

```bash
pnpm exec convex codegen && npx tsc --noEmit -p convex 2>&1 | tail -2 && pnpm convex:deploy 2>&1 | tail -2
```

- [ ] **Step 2: Re-run des imports (remplit les libellés — idempotent)**

```bash
pnpm convex:run importSecib:runForSyndic '{"secibSyndicPersonneId":"5847"}'
pnpm convex:run importSecib:runForSyndic '{"secibSyndicPersonneId":"3226"}'
```

Expected : `updated` ≈ 13 / 111, `imported: 0`. Vérifier un case :

```bash
pnpm exec convex data cases --limit 1 --order desc
```

Expected : `secibMatiereLibelle` et `secibResponsableNom` remplis.

---

## Task 14: Validation E2E (local) + push + PR

**Files:** aucun.

- [ ] **Step 1: Dev local + parcours syndic** — `pnpm --filter frontend dev` puis (Playwright) :
  1. `http://localhost:3000/dashboard` sans session → redirect sign-in Logto ; login `syndic_test_s2b` → retour `/dashboard`
  2. Dashboard : compteur `Créé: 13`, 5 derniers dossiers
  3. Liste : recherche « SEUILS », filtre statut, tri
  4. Détail d'un dossier : Infos avec libellés (matière + responsable), tab Documents = vraies pièces SECIB, télécharger un document (vérifier la taille du fichier > 0), tab Suivi
  5. Contre-tests : login `npl_test_admin` → `/dashboard` → état « réservé aux syndics » ; `/convex-poc/dossiers` toujours fonctionnel
- [ ] **Step 2: `auditLogs`** : lignes `secib.documents_du_dossier.succeeded` + `secib.telecharger_document.succeeded`.
- [ ] **Step 3: Push + PR**

```bash
git push -u origin feat/convex-s3a-portail-lecture
gh pr create --base main --head feat/convex-s3a-portail-lecture --title "feat(s3a): portail syndic lecture sur Convex — dashboard, dossiers, documents" --body "<résumé : décisions spec, captures du parcours validé, contre-tests sécurité>"
```

- [ ] **Step 4: Relayer l'URL.** Après merge : valider le parcours en prod (build Coolify = Task 12 déjà mimé).

---

## Self-review (fait à l'écriture)

- **Couverture spec** : snapshot libellés ✔ (T2+T13), duSyndic ✔ (T3), actions documents + garde ✔ (T4, path content vérifié en step dédié), middleware/callback ✔ (T6), layout + état non-syndic ✔ (T8), 3 pages ✔ (T9-T10), composants ✔ (T7), placeholders ✔ (T11), build Docker-like ✔ (T12 — leçon S2B), validation + contre-tests sécurité ✔ (T14).
- **Types cohérents** : `CaseDoc`/`CaseStatus`/refs partagés (T5) consommés par T8-T10 ; `STATUS_CONFIG` exporté pour la liste (retouche notée T9) ; `GatewayResponse<T>` aligné sur l'enveloppe `{data}`.
- **Pièges anticipés** : tab Radix monté à l'activation (fetch documents lazy) ; `use(params)` Next 15 ; pas d'import `_generated` côté frontend ; `convex-poc` exclu du guard middleware (gère son propre état) ; `unreadCount=0` en dur jusqu'à S3c.
