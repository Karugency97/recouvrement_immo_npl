# S5a — Fondation workspace admin + push SECIB — Design

**Date** : 2026-06-13
**Statut** : validé (brainstorm avec user)
**Précède** : plan d'implémentation S5a
**Suit** : S3c (messagerie, PR #13 mergée)
**Décomposition S5** : **S5a** (workspace + push SECIB, ce spec) → S5b (actes) → S5c (time tracking + facturation) → S5d (notes→GED) → S5e (paiements) → S5f (alertes délais + digest + notifications)

## Objectif

Donner au cabinet un workspace pour traiter les dossiers, et **fermer les deux boucles** laissées ouvertes : (1) pousser dans le vrai SECIB les dossiers créés par le wizard syndic (`pendingSecibPush`), (2) répondre aux messages des syndics. Le groupe `(admin)/` quitte Directus pour Logto/Convex.

## Décisions verrouillées (brainstorm 2026-06-13)

- **Q0 — Décomposition S5** : S5a = fondation workspace + push SECIB uniquement. Actes / time tracking / notes→GED / paiements / alertes-digest-notifications = sprints S5b–f.
- **Q1 — Push SECIB** : **manuel par dossier, avec aperçu du DTO + confirmation, idempotent**. Le cabinet ouvre un dossier `pendingSecibPush`, voit ce qui sera créé (Personne débiteur, Dossier, Parties), choisit matière + responsable, confirme. Après push : `secibDossierId` posé, `pendingSecibPush = false`, **re-push refusé**. **Test obligatoire d'abord sur le dossier sandbox 164** avant tout dossier réel. Aucune écriture automatique (ni au submit syndic, ni par cron).

## Hors scope (sprints ultérieurs)

- Génération des actes (S5b), time tracking + push facturation (S5c), notes internes→GED (S5d), paiements/imputation (S5e), alertes délais + digest + notifications (S5f)
- Réécriture des pages admin Directus autres que dossiers (annuaire, facturation, taches → restent placeholders ou Directus jusqu'à leur sprint)
- Saga/reprise de push partiel (SECIB n'a pas de transaction multi-appels — voir « Gestion des erreurs »)

## Architecture

```
Backend (convex/)
  cases.ts            allForCabinet (query full-access) + setStatus (mutation) + getByIdForCabinet
  messages.ts         + sendAsCabinet (mutation avocat) ; byCase déjà full-access
  secibPush.ts        previewPush (action) + runPush (action "use node") + internal upsert/patch mutations
  lib/secibWrite.ts   helpers DTO (personne, dossier, partie) — POST gateway via secibFetch
  email.ts            + notifySyndicReply (action)

Frontend (apps/frontend/src/)
  middleware.ts                       (admin) routes → Logto (comme (client) en S3a)
  app/(admin)/layout.tsx              identité via users.me, gate rôles npl_*
  app/(admin)/dossiers/page.tsx       liste TOUS dossiers (full access)
  app/(admin)/dossiers/[id]/page.tsx  détail cabinet : infos, statut, messages, push SECIB
  components/admin/PushSecibPanel.tsx  aperçu DTO + sélection matière/responsable + confirm
  components/admin/StatusSelect.tsx    changement de statut
  lib/convexApi.ts                    + refs admin
```

## Détail des composants

### 1. Auth — migration `(admin)` → Logto

Identique à la migration `(client)` de S3a :
- `middleware.ts` : ajouter `/admin` aux `logtoPaths` ; retirer le guard Directus de `/admin` (les routes admin passent sous Logto). Conserver le critère prefetch RSC `Accept: text/x-component` (leçon S3a) et `prefetch={false}` sur les `<Link>` admin.
- `app/(admin)/layout.tsx` : réécriture client component sur `users.me`. Gate : si `me.role` n'est pas un rôle `npl_*` (admin/assistant/avocat) → état « réservé à l'équipe NPL » + sign-out. (Un syndic qui atteint `/admin` est rejeté.)
- Le service Directus n'est pas touché (démantèlement post-migration totale).

### 2. Backend — accès cabinet (`convex/cases.ts`)

- **`allForCabinet`** (query) : `requireRoleQuery(NPL_FULL_ACCESS_ROLES)` (admin/assistant — vue globale). `npl_avocat` utilise sa query scopée existante `dossiersOuJeSuisIntervenant` (S2d). Retourne tous les cases avec le **nom de l'org** résolu (join léger sur `organizations`) pour afficher de quel syndic vient chaque dossier. Projection : champs UI + `pendingSecibPush`, `debiteur`, `pieces`, `secibDossierId` (le cabinet voit tout — pas de restriction de champ côté cabinet).
- **`getByIdForCabinet`** (query) : un case complet pour le détail admin (full access, vérifie rôle NPL).
- **`setStatus`** (mutation) : `requireRoleMutation([...NPL_FULL_ACCESS_ROLES])` → change `status` (union des 9), pose `previousStatus`, `statusChangedAt`, `statusChangedByUserId`, `updatedAt`. Trace `auditLogs` (`case.status_changed`, métadonnée from→to). Transition libre (le cabinet sait ce qu'il fait ; pas de machine à états contraignante en S5a).

### 3. Backend — réponse cabinet (`convex/messages.ts`)

- **`sendAsCabinet`** (mutation) : `requireRoleMutation([...NPL_FULL_ACCESS_ROLES])` (S5a : admin/assistant ; l'avocat scopé viendra avec le scoping intervenant, cf. note S5 de `caseAccess.ts`). Insert message `senderRole: "avocat"`. Schedule `internal.email.notifySyndicReply` → email au syndic (`organizations` → users de l'org ; ou un email de contact). Dégradation gracieuse (réutilise `sendEmail`).
- `byCase` est déjà `[...SYNDIC_ROLES, ...NPL_FULL_ACCESS_ROLES]` (S3c) — le cabinet lit déjà les fils. Rien à changer côté lecture.

### 4. Backend — push SECIB (`convex/secibPush.ts` + `lib/secibWrite.ts`)

**`lib/secibWrite.ts`** : helpers POST gateway via `secibFetch` (method POST, body). Routes confirmées : `POST /personnes`, `POST /dossiers`, `POST /parties`.
- `createPersonne(ctx, audit, { type, nom, ... })` → `{ PersonneId }`
- `createDossier(ctx, audit, { Nom, MatiereId, ResponsableId })` → `{ DossierId, Code }` (⚠ NE PAS envoyer `Code` — SECIB le génère ; `SiteId: 1`, `Type: "D"`)
- `createPartie(ctx, audit, { dossierId, personneId, typePartieId, facturable })` → shape **imbriquée** `{ Dossier: { DossierId }, Personne: { PersonneId }, TypePartieId, Facturable, ParentPartieId: 0 }` (à plat = HTTP 500)

**`previewPush`** (action, args `{ caseId }`) : `withAuditLog` (full access) → charge le case → cherche un débiteur existant dans SECIB (`secibFetch GET /personnes/rechercher?denomination={nom}`) → retourne `{ debiteur, syndicPersonneId (org.secibSyndicPersonneId), existingPersonneMatches[] }`. Pas d'écriture. La matière et le responsable sont choisis côté UI depuis `cachedReferentials` (MATIERES_CONTENTIEUX + INTERVENANTS, rafraîchis par le cron S2c).

**`runPush`** (action `"use node"`, args `{ caseId, matiereId, responsableId, reuseDebiteurPersonneId? }`) :
1. `requireRole`/assertRole full access. Charge le case (internal query).
2. **Idempotence** : si `case.secibDossierId` est posé OU `pendingSecibPush === false` → `ConvexError` « déjà poussé ».
3. Résout l'org → `secibSyndicPersonneId` (sinon erreur).
4. **Débiteur** : si `reuseDebiteurPersonneId` fourni (le cabinet a confirmé une correspondance) → on le réutilise ; sinon `createPersonne(case.debiteur)`.
5. **Dossier** : `createDossier({ Nom: case.debiteur.nom + " — " + libellé court, MatiereId: matiereId, ResponsableId: responsableId })` → `{ DossierId, Code }`.
6. **Parties** : `createPartie(syndic: secibSyndicPersonneId, TypePartieId 1, Facturable true)` puis `createPartie(débiteur PersonneId, TypePartieId 2, Facturable false)`.
7. **Patch case** (internal mutation, après succès complet) : `secibDossierId = String(DossierId)`, `secibLibelle = Nom`, `secibCodeMatiere = String(matiereId)`, `secibIntervenantId = String(responsableId)`, `secibSnapshotAt = now`, `pendingSecibPush = false`, `updatedAt = now`. (Les libellés matière/responsable seront re-remplis au prochain re-import S2d, ou résolus à l'affichage.)
8. Trace `auditLogs` (`secib.dossier_pushed`, métadonnée DossierId/Code/PersonneId créés).
Retour : `{ secibDossierId, code }`.

### 5. Frontend — workspace admin

- **Liste `/admin/dossiers`** : table de TOUS les dossiers (`allForCabinet`) — colonnes Syndic (nom org) / Libellé ou débiteur / Statut / SECIB (badge « À pousser » si `pendingSecibPush`, sinon réf) / Dernière maj. Filtre « à pousser » + recherche. Lignes → détail.
- **Détail `/admin/dossiers/[id]`** : header (libellé, `<StatusBadge>`) + `<StatusSelect>` (changement de statut → `setStatus`). Onglets : **Infos** (débiteur, créance, pièces, org syndic), **Messages** (`<MessageThread>` réutilisé, mais l'envoi passe par `sendAsCabinet` — variante `asCabinet` du composant), **SECIB** :
  - si `pendingSecibPush` → `<PushSecibPanel>` : appelle `previewPush`, affiche le débiteur (+ correspondances existantes à réutiliser), selects **matière** (cachedReferentials) + **responsable** (intervenants), bouton « Pousser dans SECIB » → `runPush` → toast + le panneau bascule sur « Poussé : dossier {code} ».
  - sinon → « Déjà dans SECIB : {secibDossierId} » + (réutilise le tab Documents existant si on veut, optionnel).

### 6. `convexApi.ts`
Refs `allForCabinetQuery`, `setStatusMutation`, `sendAsCabinetMutation`, `previewPushAction`, `runPushAction` + types `CabinetCaseDoc`, `PreviewPushResult`.

## Gestion des erreurs

- **Push partiel** : SECIB n'a pas de transaction multi-appels. Si une étape échoue après création du Dossier, `runPush` **throw** avec les IDs déjà créés dans le message (DossierId, PersonneId) ; le case reste `pendingSecibPush` (pas de patch). Conséquence : un dossier orphelin peut exister dans SECIB — le cabinet le voit dans l'erreur, vérifie SECIB, nettoie si besoin. **Accepté au pilote** (volume faible, push supervisé). Une reprise idempotente est un raffinement post-pilote.
- **Idempotence** : `secibDossierId` posé → re-push refusé (`ConvexError`).
- **Org sans `secibSyndicPersonneId`** → erreur claire avant toute écriture.
- **Rôle non-NPL** → `forbidden` (gate + layout).
- Push = fail-loud (le cabinet doit savoir si SECIB a refusé).

## Validation

1. **Sandbox d'abord** : un case de test pointant le dossier sandbox — vérifier `previewPush` (recherche débiteur), puis `runPush` sur un débiteur jetable → vérifier dans SECIB (via la CLI `secib`/MCP, lecture seule) que Personne + Dossier + Parties sont créés correctement (parties imbriquées, Code auto-généré). **Ne PAS pousser un vrai dossier syndic tant que le sandbox n'est pas validé.**
2. Auth : login `npl_test_admin` → `/admin/dossiers` (liste tous syndics) ; un syndic sur `/admin` → « réservé à l'équipe NPL ».
3. Détail : changer le statut d'un dossier → reflété (liste + badge) + `auditLogs`.
4. Messages : répondre à un fil syndic (`sendAsCabinet`) → le message apparaît côté syndic (bulle « Cabinet NPL »), `auditLogs` email.
5. Push d'un dossier wizard réel (après validation sandbox) : preview → choisir matière/responsable → push → `secibDossierId` posé, `pendingSecibPush=false`, re-push refusé ; le dossier apparaît dans SECIB.
6. Contre-tests : re-push refusé ; push d'un dossier déjà SECIB refusé ; non-régression portail syndic (S3a-c).
7. Build prod Docker-like ; déploiement validé par **statut Coolify** (pas la redirect d'auth) ; 0 erreur console.
