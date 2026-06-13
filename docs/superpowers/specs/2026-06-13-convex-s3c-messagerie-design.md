# S3c — Messagerie syndic↔cabinet + pièces + email — Design

**Date** : 2026-06-13
**Statut** : validé (brainstorm avec user)
**Précède** : plan d'implémentation S3c
**Suit** : S3b (wizard, PR #12 mergée)
**Décomposition S3** : S3a (lecture) → S3b (wizard) → S3c (messagerie, ce spec) — **dernier morceau de S3**

## Objectif

Fermer la boucle de communication du portail syndic : le syndic échange des messages avec le cabinet sur un dossier (fil par dossier + boîte de réception globale), voit la liste des pièces demandées, et chaque message alerte le cabinet par email. Les réponses du cabinet et la création de notes internes arrivent avec le portail admin (S5).

## Décisions verrouillées (brainstorm 2026-06-13)

- **Q0 — Découpage** : S3c = **boucle de communication syndic** uniquement. **`notes → GED` reporté en S5** (les notes internes sont écrites par les avocats dans le workspace admin ; le cron `notes→GED` déféré de S2c y atterrira). Push web PWA reporté (polish).
- **Q1 — Sens de la messagerie** : le syndic **envoie + voit le fil** ; le cabinet est **notifié par email** (ses réponses viendront via le workspace admin S5). La messagerie est ainsi utile dès le pilote.
- **Q2 — Email / Resend** : **dégradation gracieuse**. Resend n'est pas configuré (pas de clé, pas de domaine vérifié). L'action `sendEmail` envoie via `RESEND_API_KEY` **si présente**, sinon log + skip proprement. La messagerie marche in-app immédiatement ; l'email s'active dès que la clé + le DKIM sont posés (opération séparée).
- **Q3 — Emplacement** : **fil par dossier** (onglet « Messages » sur le détail) **+ page `/messagerie` globale** (boîte de réception : dossiers ayant des messages, aperçu du dernier).

## Hors scope

- Notes internes + push GED SECIB — **S5** (feature cabinet)
- Réponses du cabinet dans une UI (workspace admin) — **S5**
- Notifications in-app (table `notifications`) — non exercées tant que le cabinet ne répond pas (S5). En S3c le syndic est l'émetteur ; il n'a rien « de non-lu » à recevoir. La boîte `/messagerie` liste ses conversations sans machinerie de non-lus.
- **Upload de pièces** / changement de statut des pièces par le syndic — l'upload (stockage binaire) reste déféré ; en S3c les pièces sont **affichées en lecture** (le syndic voit ce qui est demandé). La fourniture réelle se fait par message (« je vous transmets X ») ou en S5.
- Push web PWA, digest matin, templates email autres que « nouveau message »

## Architecture

```
convex/messages.ts      byCase (query, org-scoped) + send (mutation → schedule email)
convex/email.ts         sendEmail (internal action "use node", Resend graceful) + notifyNewMessage
convex/lib/caseAccess.ts  assertCaseAccessQuery / assertCaseAccessMutation (garde org partagée)
convex/cases.ts         duSyndic projection : + champ pieces (affichage) + dernier message (boîte)
apps/frontend/src/lib/convexApi.ts   refs messages + types
apps/frontend/src/app/(client)/dossiers/[id]/page.tsx   + onglet Messages + section Pièces
apps/frontend/src/app/(client)/messagerie/page.tsx      boîte de réception (remplace placeholder)
apps/frontend/src/components/metier/MessageThread.tsx   fil + composeur
```

## Détail des composants

### 1. Garde d'accès partagée (`convex/lib/caseAccess.ts`)

Extraite du pattern `assertCaseInOrg` de S3a (qui vit dans `secib.ts`, action-only) pour être réutilisable en query **et** mutation. Deux helpers :

```ts
// Charge le case et vérifie que l'appelant (syndic) y a accès via son org.
// NPL full access (admin/assistant) passe sans contrainte. Retourne le case.
export async function assertCaseAccessQuery(ctx: QueryCtx, caseId, user) { ... }
export async function assertCaseAccessMutation(ctx: MutationCtx, caseId, user) { ... }
```

(Le `assertCaseInOrg` de `secib.ts` reste pour les actions documents ; on ne le déplace pas — risque de régression S3a. La logique org est dupliquée une fois, documentée. Alternative — un helper unique générique sur `{db}` — rejetée pour ne pas toucher `secib.ts`.)

### 2. Backend — `convex/messages.ts`

- **`byCase`** (query, args `{ caseId }`) : `requireRoleQuery(SYNDIC_ROLES + NPL_FULL_ACCESS_ROLES)` → `assertCaseAccessQuery` → messages via `by_case_created` (ordre chrono). Retourne `{ _id, senderUserId, senderRole, body, createdAt }` (+ nom de l'expéditeur résolu : join léger sur `users` pour afficher « Vous » / « Cabinet NPL »).
- **`send`** (mutation, args `{ caseId, body }`) : `requireRoleMutation(SYNDIC_ROLES)` → `assertCaseAccessMutation` → valide `body.trim()` non vide → insert `messages` (`senderRole: "syndic"`, `senderUserId`, `createdAt`) → **schedule** `ctx.scheduler.runAfter(0, internal.email.notifyNewMessage, { caseId, messageId })` (l'email part dans une action ; les mutations ne peuvent pas faire de HTTP). Retourne `{ messageId }`.

### 3. Backend — email (`convex/email.ts`)

- **`sendEmail`** (internal action `"use node"`, args `{ to, subject, html }`) : lit `RESEND_API_KEY`. **Absente → log + return** `{ skipped: true }` (dégradation gracieuse). Présente → `POST https://api.resend.com/emails` avec `from: process.env.RESEND_FROM ?? "immonpl@nplavocat.com"`. Erreur Resend → log, pas de throw (un email raté ne doit pas remonter d'erreur visible). Tracé dans `auditLogs` (`email.sent` / `email.skipped` / `email.failed`).
- **`notifyNewMessage`** (internal action) : charge le message + le case (internal queries) → construit le sujet (« Nouveau message — dossier {libellé} ») + un HTML minimal (expéditeur, extrait, lien `https://immo.nplavocat.com/dossiers/{caseId}`) → `sendEmail` vers `CABINET_NOTIFICATION_EMAIL` (env var ; défaut = adresse NPL configurée à l'activation). Pas d'email si la var destinataire est absente (log).

### 4. Backend — `cases.duSyndic` enrichi

La projection (qui ne renvoie au syndic que des champs sûrs) gagne :
- `pieces` (le tableau requested, pour l'affichage — pas de champ sensible)
- `lastMessageAt` / `messageCount` : calculés pour la boîte de réception. Implémentation : la query collecte les cases, puis pour chaque case lit le dernier message via `by_case_created` (borné `.order("desc").first()`). Volumétrie pilote ≤ ~150 cases → acceptable ; à paginer/dénormaliser si le volume grandit (noté).

### 5. Frontend — onglet Messages (`/dossiers/[id]`)

4ᵉ onglet « Messages » à côté de Infos/Documents/Suivi. Composant `<MessageThread caseId>` :
- `useQuery(messagesByCase, { caseId })` → fil chronologique (bulles ; « Vous » à droite, « Cabinet NPL » à gauche), realtime
- composeur (textarea + bouton Envoyer) → `useMutation(sendMessage)` ; vide le champ au succès, toast destructif en erreur
- état vide : « Aucun message. Démarrez la conversation avec le cabinet. »

Section **Pièces** ajoutée à l'onglet Infos (ou un sous-bloc du détail) : liste `caseDoc.pieces` (type + badge requirement + statut), lecture seule, titre « Pièces demandées ».

### 6. Frontend — boîte `/messagerie`

Remplace le placeholder. `useQuery(casesDuSyndic)` → filtre les cases avec `messageCount > 0`, triées par `lastMessageAt` desc. Chaque ligne : libellé du dossier + date du dernier message + `<StatusBadge>` → lien vers `/dossiers/[id]` (onglet Messages). `prefetch={false}` (contrainte RSC). État vide : « Aucune conversation. »

### 7. `convexApi.ts`
Refs `messagesByCaseQuery` / `sendMessageMutation` + types `MessageDoc` ; `CaseDoc` étendu (`pieces`, `lastMessageAt?`, `messageCount?`).

## Gestion des erreurs

- Message vide → bloqué client + serveur (`ConvexError`).
- Case d'une autre org → `forbidden` (garde `assertCaseAccess*`).
- Resend absent/erreur → email sauté/loggé, **la messagerie n'échoue jamais** à cause de l'email (envoi découplé via scheduler).
- Rôle non autorisé → `forbidden`.

## Validation

1. Login `syndic_test_s2b` → ouvrir un dossier → onglet Messages → envoyer « Bonjour, pouvez-vous me confirmer la réception du dossier ? » → le message apparaît (realtime), champ vidé.
2. `auditLogs` : `email.skipped` (Resend non configuré) — la messagerie a fonctionné malgré tout.
3. Section Pièces : sur un dossier issu du wizard S3b, les pièces REQUESTED s'affichent (lecture).
4. `/messagerie` : le dossier où on a posté apparaît dans la boîte, dernier message daté ; clic → onglet Messages.
5. Contre-tests : message sur le `caseId` d'un autre syndic → `forbidden` ; non-régression S3a (Infos/Documents/Suivi) + S3b (wizard).
6. (Si clé Resend fournie pendant le sprint) : poser `RESEND_API_KEY` + `CABINET_NOTIFICATION_EMAIL`, configurer le DKIM `nplavocat.com` (MCP Hostinger), envoyer un message → vrai email reçu + `auditLogs: email.sent`.
7. Build prod Docker-like (leçon S2B) ; `prefetch={false}` sur les liens `/messagerie` ; 0 erreur console.
