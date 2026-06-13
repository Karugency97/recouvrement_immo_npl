# S3c — Messagerie syndic↔cabinet + pièces + email — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Le syndic échange des messages avec le cabinet sur un dossier (onglet Messages + boîte `/messagerie`), voit les pièces demandées, et chaque message alerte le cabinet par email (dégradation gracieuse si Resend non configuré).

**Architecture:** Garde d'accès org partagée query+mutation (`caseAccess.ts`). `messages.ts` : fil par dossier (query) + envoi (mutation qui schedule un email) + boîte de réception. `email.ts` (`"use node"`) : `sendEmail` Resend gracieux + `notifyNewMessage`. `cases.duSyndic` projette aussi `pieces`. Frontend : onglet Messages + composant `MessageThread`, section Pièces, page boîte de réception.

**Tech Stack:** Convex 1.39 self-hosted (scheduler pour l'email, `"use node"` action + fetch Resend), Next.js 15, ShadCN (textarea/button/card/tabs/badge), Sonner. Frontend via `makeFunctionReference`.

**Spec:** `docs/superpowers/specs/2026-06-13-convex-s3c-messagerie-design.md`

**Repo pattern note:** pas de tests unitaires — validation typecheck/lint/build + E2E Playwright. **Admin key Convex** (deploy) : memory `reference-convex-admin-key-retrieval`. **`v.number()` accepte NaN** (memory `reference-convex-vnumber-accepts-nan`) — non pertinent ici (pas de number user-fourni). **prefetch={false}** sur tout `<Link>` route `(client)` (memory `reference-rsc-prefetch-proxy-cors`).

**Codegen note:** nouveaux exports inconnus de `_generated` avant `convex codegen` ; erreurs tsc limitées à `internal.*`/`api.*` = attendu. Frontend : aucun import `convex/_generated`.

---

## Task 1: Pre-flight

**Files:** aucun.

- [ ] **Step 1:**

```bash
cd /Users/mkstudio/Desktop/recouvrement_immo_npl && git branch --show-current && git status --short
```

Expected : `feat/convex-s3c-messagerie` ; untracked tolérés.

- [ ] **Step 2: Vérifier les fondations**

```bash
grep -c "requireRoleQuery\|requireRoleMutation\|SYNDIC_ROLES\|NPL_FULL_ACCESS_ROLES" convex/lib/auth.ts && grep -c "by_case_created" convex/schema.ts && grep -c "internal.auditLogs.append" convex/lib/audit.ts
```

Expected : chaque commande ≥ 1.

---

## Task 2: Garde d'accès partagée — `convex/lib/caseAccess.ts`

**Files:**
- Create: `convex/lib/caseAccess.ts`

- [ ] **Step 1: Écrire `convex/lib/caseAccess.ts`**

```ts
import type { QueryCtx, MutationCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";
import { NPL_FULL_ACCESS_ROLES } from "./auth";
import { forbidden } from "./errors";

// ─────────────────────────────────────────────────────────────────
// Garde d'appartenance d'un case à l'org de l'appelant — réutilisable
// en query ET mutation (le assertCaseInOrg de secib.ts est action-only).
// Rôles NPL full access (admin/assistant) : accès total. Syndic : le case
// doit appartenir à son org. Retourne le case chargé.
// ─────────────────────────────────────────────────────────────────

function check(
  caseDoc: Doc<"cases"> | null,
  user: { role: string; organizationId: Id<"organizations"> },
): Doc<"cases"> {
  if (!caseDoc) {
    throw forbidden(user.role, NPL_FULL_ACCESS_ROLES);
  }
  const isNplFull = (NPL_FULL_ACCESS_ROLES as readonly string[]).includes(
    user.role,
  );
  if (!isNplFull && caseDoc.organizationId !== user.organizationId) {
    throw forbidden(user.role, NPL_FULL_ACCESS_ROLES);
  }
  return caseDoc;
}

export async function assertCaseAccessQuery(
  ctx: QueryCtx,
  caseId: Id<"cases">,
  user: { role: string; organizationId: Id<"organizations"> },
): Promise<Doc<"cases">> {
  return check(await ctx.db.get(caseId), user);
}

export async function assertCaseAccessMutation(
  ctx: MutationCtx,
  caseId: Id<"cases">,
  user: { role: string; organizationId: Id<"organizations"> },
): Promise<Doc<"cases">> {
  return check(await ctx.db.get(caseId), user);
}
```

(Une case introuvable est traitée comme un accès refusé — on ne révèle pas l'existence d'un case hors org.)

- [ ] **Step 2: Typecheck + commit**

```bash
npx tsc --noEmit -p convex 2>&1 | tail -2
git add convex/lib/caseAccess.ts && git commit -m "feat(s3c): shared case-access guard (query + mutation)"
```

---

## Task 3: `convex/messages.ts` — fil + envoi + boîte

**Files:**
- Create: `convex/messages.ts`

- [ ] **Step 1: Écrire `convex/messages.ts`**

```ts
import { internalQuery, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { v, ConvexError } from "convex/values";
import {
  requireRoleQuery,
  requireRoleMutation,
  SYNDIC_ROLES,
  NPL_FULL_ACCESS_ROLES,
} from "./lib/auth";
import {
  assertCaseAccessQuery,
  assertCaseAccessMutation,
} from "./lib/caseAccess";

const READ_ROLES = [...SYNDIC_ROLES, ...NPL_FULL_ACCESS_ROLES] as const;

// Fil chronologique d'un dossier. senderRole pilote l'affichage côté UI
// (syndic = "Vous", avocat = "Cabinet NPL") — pas de join users nécessaire.
export const byCase = query({
  args: { caseId: v.id("cases") },
  handler: async (ctx, args) => {
    const user = await requireRoleQuery(ctx, READ_ROLES);
    await assertCaseAccessQuery(ctx, args.caseId, user);
    const rows = await ctx.db
      .query("messages")
      .withIndex("by_case_created", (q) => q.eq("caseId", args.caseId))
      .order("asc")
      .collect();
    return rows.map((m) => ({
      _id: m._id,
      senderRole: m.senderRole,
      body: m.body,
      createdAt: m.createdAt,
    }));
  },
});

// Envoi d'un message par le syndic. Schedule l'email cabinet (découplé :
// une mutation ne peut pas faire de HTTP ; un email raté ne casse rien).
export const send = mutation({
  args: { caseId: v.id("cases"), body: v.string() },
  handler: async (ctx, args): Promise<{ messageId: string }> => {
    const user = await requireRoleMutation(ctx, SYNDIC_ROLES);
    await assertCaseAccessMutation(ctx, args.caseId, user);
    if (!args.body.trim()) {
      throw new ConvexError({
        code: "message.empty",
        message: "Le message ne peut pas être vide.",
      });
    }
    const messageId = await ctx.db.insert("messages", {
      caseId: args.caseId,
      senderUserId: user._id,
      senderRole: "syndic" as const,
      body: args.body.trim(),
      createdAt: Date.now(),
    });
    await ctx.scheduler.runAfter(0, internal.email.notifyNewMessage, {
      caseId: args.caseId,
      messageId,
    });
    return { messageId };
  },
});

// Lecture interne d'un message (pour l'action email).
export const getByIdInternal = internalQuery({
  args: { messageId: v.id("messages") },
  handler: async (ctx, args) => ctx.db.get(args.messageId),
});

// Boîte de réception : cases de l'org du syndic ayant au moins un message,
// avec la date du dernier. Per-case last-message lookup isolé ici (PAS dans
// duSyndic, pour ne pas alourdir dashboard/liste). Volumétrie pilote ok.
export const inbox = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireRoleQuery(ctx, SYNDIC_ROLES);
    const cases = await ctx.db
      .query("cases")
      .withIndex("by_org", (q) => q.eq("organizationId", user.organizationId))
      .collect();
    const result: {
      caseId: string;
      secibLibelle?: string;
      status: string;
      lastMessageAt: number;
    }[] = [];
    for (const c of cases) {
      const last = await ctx.db
        .query("messages")
        .withIndex("by_case_created", (q) => q.eq("caseId", c._id))
        .order("desc")
        .first();
      if (last) {
        result.push({
          caseId: c._id,
          secibLibelle: c.secibLibelle,
          status: c.status,
          lastMessageAt: last.createdAt,
        });
      }
    }
    result.sort((a, b) => b.lastMessageAt - a.lastMessageAt);
    return result;
  },
});
```

- [ ] **Step 2: Typecheck + commit**

```bash
npx tsc --noEmit -p convex 2>&1 | tail -3
git add convex/messages.ts && git commit -m "feat(s3c): messages byCase + send (schedules email) + inbox + internal getter"
```

---

## Task 4: Email — `convex/email.ts`

**Files:**
- Create: `convex/email.ts`

- [ ] **Step 1: Écrire `convex/email.ts`**

```ts
"use node";

import { internalAction } from "./_generated/server";
import type { ActionCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

// ─────────────────────────────────────────────────────────────────
// Email via Resend — DÉGRADATION GRACIEUSE. Sans RESEND_API_KEY,
// l'envoi est sauté proprement (log + audit), la messagerie n'est pas
// impactée. Un email raté ne throw jamais (côté appelant = scheduler).
// ─────────────────────────────────────────────────────────────────

async function auditEmail(
  ctx: ActionCtx,
  outcome: "sent" | "skipped" | "failed",
  metadata: Record<string, unknown>,
) {
  await ctx.runMutation(internal.auditLogs.append, {
    actorLogtoUserId: "system:email",
    actorRole: "system",
    action: `email.${outcome}`,
    metadata,
  });
}

export const sendEmail = internalAction({
  args: { to: v.string(), subject: v.string(), html: v.string() },
  handler: async (ctx, args): Promise<{ sent: boolean }> => {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      await auditEmail(ctx, "skipped", { reason: "no_api_key", to: args.to });
      return { sent: false };
    }
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: process.env.RESEND_FROM ?? "immonpl@nplavocat.com",
          to: args.to,
          subject: args.subject,
          html: args.html,
        }),
      });
      if (!res.ok) {
        await auditEmail(ctx, "failed", {
          status: res.status,
          body: (await res.text()).slice(0, 200),
        });
        return { sent: false };
      }
      await auditEmail(ctx, "sent", { to: args.to, subject: args.subject });
      return { sent: true };
    } catch (error) {
      await auditEmail(ctx, "failed", {
        error: error instanceof Error ? error.message.slice(0, 200) : String(error),
      });
      return { sent: false };
    }
  },
});

// Notifie le cabinet d'un nouveau message syndic.
export const notifyNewMessage = internalAction({
  args: { caseId: v.id("cases"), messageId: v.id("messages") },
  handler: async (ctx, args): Promise<void> => {
    const to = process.env.CABINET_NOTIFICATION_EMAIL;
    if (!to) {
      await auditEmail(ctx, "skipped", { reason: "no_recipient" });
      return;
    }
    const message = await ctx.runQuery(internal.messages.getByIdInternal, {
      messageId: args.messageId,
    });
    const caseDoc = await ctx.runQuery(internal.cases.getByIdInternal, {
      caseId: args.caseId,
    });
    if (!message || !caseDoc) return;
    const libelle = caseDoc.secibLibelle ?? "Dossier";
    const extrait = message.body.slice(0, 300);
    const url = `https://immo.nplavocat.com/dossiers/${args.caseId}`;
    await ctx.runAction(internal.email.sendEmail, {
      to,
      subject: `Nouveau message — ${libelle}`,
      html: `<p>Un syndic a envoyé un message sur le dossier <strong>${libelle}</strong> :</p>
<blockquote>${extrait}</blockquote>
<p><a href="${url}">Ouvrir le dossier</a></p>`,
    });
  },
});
```

- [ ] **Step 2: Typecheck + commit**

```bash
npx tsc --noEmit -p convex 2>&1 | tail -3
git add convex/email.ts && git commit -m "feat(s3c): email.sendEmail (Resend graceful) + notifyNewMessage"
```

---

## Task 5: `cases.duSyndic` — projeter `pieces`

**Files:**
- Modify: `convex/cases.ts`

- [ ] **Step 1: Ajouter `pieces` à la projection de `duSyndic`**

Dans `convex/cases.ts`, fonction `duSyndic`, dans l'objet `rows.map((c) => ({ ... }))`, ajouter après `secibResponsableNom: c.secibResponsableNom,` :

```ts
      pieces: c.pieces,
```

Et corriger le commentaire de projection : retirer `pieces` de la liste « ne JAMAIS renvoyer » (il est désormais exposé — les pièces ne sont pas un champ cabinet sensible, le syndic doit voir ce qu'il doit fournir). Remplacer le commentaire :

```ts
    // Projection explicite : ne JAMAIS renvoyer au syndic les champs
    // internes/cabinet (authorUserId, statusChangedByUserId, previousStatus,
    // secibIntervenantId, secibCodeMatiere, casSpecial). pieces EST exposé
    // (le syndic doit voir les pièces demandées). Cf. CaseDoc frontend.
```

- [ ] **Step 2: Typecheck + commit**

```bash
npx tsc --noEmit -p convex 2>&1 | tail -2
git add convex/cases.ts && git commit -m "feat(s3c): duSyndic projects pieces for the detail Pièces section"
```

---

## Task 6: Frontend — refs + types

**Files:**
- Modify: `apps/frontend/src/lib/convexApi.ts`

- [ ] **Step 1: Ajouter les refs + types**

Sous les `makeFunctionReference` existants :

```ts
export const messagesByCaseQuery = makeFunctionReference<"query">("messages:byCase");
export const sendMessageMutation = makeFunctionReference<"mutation">("messages:send");
export const messagerieInboxQuery = makeFunctionReference<"query">("messages:inbox");
```

Dans le type `CaseDoc`, ajouter le champ `pieces` (le détail le lit pour la section Pièces) — l'ajouter à la définition existante :

```ts
  pieces?: {
    type: string;
    requirement: "obligatoire" | "recommandee" | "utile";
    status: "REQUESTED" | "RECEIVED" | "REJECTED";
    requestedAt: number;
  }[];
```

En fin de fichier, ajouter :

```ts
export type MessageDoc = {
  _id: string;
  senderRole: "syndic" | "avocat";
  body: string;
  createdAt: number;
};

export type InboxEntry = {
  caseId: string;
  secibLibelle?: string;
  status: CaseStatus;
  lastMessageAt: number;
};
```

- [ ] **Step 2: Lint + commit**

```bash
cd apps/frontend && node_modules/.bin/next lint --file src/lib/convexApi.ts 2>&1 | tail -2 && cd ../..
git add apps/frontend/src/lib/convexApi.ts && git commit -m "feat(s3c): frontend message/inbox refs + types + pieces on CaseDoc"
```

---

## Task 7: Composant `MessageThread`

**Files:**
- Create: `apps/frontend/src/components/metier/MessageThread.tsx`

- [ ] **Step 1: Écrire `MessageThread.tsx`**

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
  sendMessageMutation,
  type MessageDoc,
} from "@/lib/convexApi";

export function MessageThread({ caseId }: { caseId: string }) {
  const messages = useQuery(messagesByCaseQuery, { caseId }) as
    | MessageDoc[]
    | undefined;
  const send = useMutation(sendMessageMutation);
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
          Aucun message. Démarrez la conversation avec le cabinet.
        </p>
      ) : (
        <div className="space-y-3">
          {messages.map((m) => {
            const mine = m.senderRole === "syndic";
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
                    {mine ? "Vous" : "Cabinet NPL"} ·{" "}
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
          placeholder="Écrire un message au cabinet…"
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

- [ ] **Step 2: Lint + commit**

```bash
cd apps/frontend && node_modules/.bin/next lint --file "src/components/metier/MessageThread.tsx" 2>&1 | tail -2 && cd ../..
git add apps/frontend/src/components/metier/MessageThread.tsx && git commit -m "feat(s3c): MessageThread component (realtime thread + composer)"
```

---

## Task 8: Détail — onglet Messages + section Pièces

**Files:**
- Modify: `apps/frontend/src/app/(client)/dossiers/[id]/page.tsx`

- [ ] **Step 1: Importer le composant + un Badge pour les pièces**

En tête de `apps/frontend/src/app/(client)/dossiers/[id]/page.tsx`, ajouter aux imports :

```tsx
import { Badge } from "@/components/ui/badge";
import { MessageThread } from "@/components/metier/MessageThread";
```

- [ ] **Step 2: Ajouter l'onglet Messages**

Dans `<TabsList>`, après `<TabsTrigger value="suivi">Suivi</TabsTrigger>`, ajouter :

```tsx
            <TabsTrigger value="messages">Messages</TabsTrigger>
```

Après le `<TabsContent value="suivi">…</TabsContent>`, ajouter :

```tsx
        <TabsContent value="messages">
          <MessageThread caseId={caseDoc._id} />
        </TabsContent>
```

- [ ] **Step 3: Ajouter la section Pièces dans l'onglet Infos**

Dans `<TabsContent value="infos">`, à l'intérieur du `<Card><CardContent>`, après le dernier `<InfoRow ... label="Dernière mise à jour" />`, ajouter (toujours dans le CardContent, après la fermeture du groupe d'InfoRow — adapter à la structure réelle ; le rendu cible : un bloc sous les infos) :

```tsx
              {caseDoc.pieces && caseDoc.pieces.length > 0 && (
                <div className="mt-6">
                  <h3 className="mb-2 text-sm font-semibold">Pièces demandées</h3>
                  <ul className="space-y-2">
                    {caseDoc.pieces.map((p) => (
                      <li
                        key={p.type}
                        className="flex items-center justify-between gap-4 rounded-md border border-border px-3 py-2 text-sm"
                      >
                        <span>{p.type}</span>
                        <Badge variant="outline" className="capitalize">
                          {p.requirement}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
```

(Si la structure du CardContent ne permet pas l'insertion telle quelle — ex. fermeture conditionnelle — placer le bloc juste après `</Card>` de l'onglet Infos, dans le `<TabsContent value="infos">`. Lire le fichier avant d'éditer.)

- [ ] **Step 4: Lint + commit**

```bash
cd apps/frontend && node_modules/.bin/next lint --file "src/app/(client)/dossiers/[id]/page.tsx" 2>&1 | tail -2 && cd ../..
git add "apps/frontend/src/app/(client)/dossiers/[id]/page.tsx" && git commit -m "feat(s3c): detail — Messages tab + Pièces section"
```

---

## Task 9: Boîte de réception `/messagerie`

**Files:**
- Modify (réécriture): `apps/frontend/src/app/(client)/messagerie/page.tsx`

- [ ] **Step 1: Réécrire la page**

```tsx
"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/metier/StatusBadge";
import { messagerieInboxQuery, type InboxEntry } from "@/lib/convexApi";

export default function MessageriePage() {
  const inbox = useQuery(messagerieInboxQuery) as InboxEntry[] | undefined;

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-semibold">Messagerie</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Conversations</CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-border">
          {inbox === undefined ? (
            <Skeleton className="h-24" />
          ) : inbox.length === 0 ? (
            <p className="py-3 text-sm text-muted-foreground">
              Aucune conversation. Ouvrez un dossier pour écrire au cabinet.
            </p>
          ) : (
            inbox.map((c) => (
              <Link
                key={c.caseId}
                href={`/dossiers/${c.caseId}`}
                prefetch={false}
                className="flex items-center justify-between gap-4 py-3 hover:bg-muted/50"
              >
                <span className="truncate text-sm">
                  {c.secibLibelle ?? "Dossier"}
                </span>
                <span className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">
                    {new Date(c.lastMessageAt).toLocaleDateString("fr-FR")}
                  </span>
                  <StatusBadge status={c.status} />
                </span>
              </Link>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Lint + commit**

```bash
cd apps/frontend && node_modules/.bin/next lint --file "src/app/(client)/messagerie/page.tsx" 2>&1 | tail -2 && cd ../..
git add "apps/frontend/src/app/(client)/messagerie/page.tsx" && git commit -m "feat(s3c): messagerie inbox page (conversations list)"
```

---

## Task 10: Codegen + deploy + build

**Files:** aucun. ⚠ Admin key (header du plan).

- [ ] **Step 1: Codegen + typecheck**

```bash
pnpm exec convex codegen && npx tsc --noEmit -p convex 2>&1 | tail -2
```

Expected : `No errors found`.

- [ ] **Step 2: Deploy**

```bash
pnpm convex:deploy 2>&1 | tail -2
```

Expected : `✔ Deployed Convex functions`.

- [ ] **Step 3: Build frontend Docker-like (leçon S2B)**

```bash
cd apps/frontend && mv .env.local /tmp/env.local.bak 2>/dev/null; NEXT_PUBLIC_DIRECTUS_URL=https://database.nplavocats.com NEXT_PUBLIC_CONVEX_URL=https://convex.immo.nplavocat.com NEXT_PUBLIC_LOGTO_ENDPOINT=https://auth.nplavocat.com NEXT_PUBLIC_LOGTO_APP_ID=ky0iisybs0g3l7avvju4y NEXT_PUBLIC_LOGTO_RESOURCE=https://convex.immo.nplavocat.com NEXT_PUBLIC_APP_URL=https://immo.nplavocat.com node_modules/.bin/next build --turbopack 2>&1 | grep -E "Compiled|Failed|error|messagerie|dossiers" | head -10; mv /tmp/env.local.bak .env.local 2>/dev/null; cd ../..
```

Expected : `Compiled successfully`, routes `/messagerie` + `/dossiers/[id]` présentes, aucune erreur.

---

## Task 11: Validation E2E + push + PR

**Files:** aucun.

- [ ] **Step 1: Dev local + parcours** — `pnpm --filter frontend dev`, login `syndic_test_s2b` (Playwright) :
  1. Ouvrir un dossier → onglet **Messages** → fil vide → envoyer « Bonjour, pouvez-vous confirmer la réception ? » → le message apparaît (bulle « Vous », realtime), champ vidé
  2. Onglet **Infos** : si dossier wizard S3b → section « Pièces demandées » affichée ; sinon (dossier importé sans pieces) → pas de section (normal)
  3. **/messagerie** → le dossier apparaît dans la liste, date du dernier message → clic → retour au dossier
- [ ] **Step 2: Vérifier backend**

```bash
export CONVEX_SELF_HOSTED_URL=https://convex.immo.nplavocat.com CONVEX_SELF_HOSTED_ADMIN_KEY='<clé>'
pnpm exec convex data messages --limit 2 --order desc
pnpm exec convex data auditLogs --limit 3 --order desc
```

Expected : message inséré (`senderRole: "syndic"`) ; `auditLogs` contient `email.skipped` (Resend non configuré) — la messagerie a marché malgré l'email sauté.

- [ ] **Step 3: Contre-test sécurité** — récupérer un `caseId` d'un dossier Choix Immo (autre org) :

```bash
pnpm exec convex data cases --limit 200 | grep "k97ezt6wh8v28jaa0gfm86bnm988h08c" | head -1 | awk '{print $1}'
```

Naviguer `/dossiers/<ce-caseId>` en session Immobilière du Bourg → « introuvable » (déjà couvert S3a) ; et l'onglet Messages d'un tel case ne doit rien renvoyer / `forbidden`. Non-régression S3a/S3b.

- [ ] **Step 4: Push + PR**

```bash
git push -u origin feat/convex-s3c-messagerie
gh pr create --base main --head feat/convex-s3c-messagerie --title "feat(s3c): messagerie syndic↔cabinet + pièces + email Resend gracieux" --body "<résumé : décisions, parcours validé, email skipped>"
```

- [ ] **Step 5: Relayer l'URL.** Après merge : poller le **statut Coolify** (pas la redirect d'auth — leçon : elle ne distingue pas les builds), puis valider en prod.

---

## Self-review (fait à l'écriture)

- **Couverture spec** : garde partagée ✔ (T2), messages byCase/send/inbox ✔ (T3, envoi schedule l'email), email gracieux ✔ (T4, skip sans clé + audit), duSyndic+pieces ✔ (T5), refs+types ✔ (T6), MessageThread ✔ (T7), onglet Messages + section Pièces ✔ (T8), boîte ✔ (T9, prefetch=false), deploy+build ✔ (T10), validation + contre-test org ✔ (T11).
- **Types cohérents** : `MessageDoc`/`InboxEntry` (T6) ↔ retours `byCase`/`inbox` (T3) ; `CaseDoc.pieces` (T6) ↔ projection duSyndic (T5) ↔ schéma `cases.pieces` ; `send` retourne `{ messageId }` annoté (anti-TS7022) ; `notifyNewMessage` annoté `Promise<void>`.
- **Pièges anticipés** : email découplé via `scheduler.runAfter` (mutation ne fait pas de HTTP) ; `sendEmail` ne throw jamais (return `{sent}`) ; `auditEmail` typé `ActionCtx` (pas le placeholder `Parameters<...>`) ; `inbox` fait le lookup par-case hors de `duSyndic` (perf dashboard/liste préservée) ; case hors org = accès refusé sans révéler l'existence ; `prefetch={false}` sur le lien boîte→dossier.
