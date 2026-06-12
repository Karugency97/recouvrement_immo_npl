# S3a — Portail Syndic lecture (Convex) — Design

**Date** : 2026-06-12
**Statut** : validé (brainstorm avec user)
**Précède** : plan d'implémentation S3a
**Suit** : S2d (import dossiers, PR #6 mergée)
**Décomposition S3** : S3a (lecture, ce spec) → S3b (wizard nouveau dossier) → S3c (messagerie + notes→GED + emails)

## Objectif

Le Gate S3 de PLAN_V1 : un syndic pilote se connecte avec son compte Logto et « se promène » dans ses vrais dossiers (13 pour L'Immobilière du Bourg, 111 pour Choix Immo) — dashboard, liste, détail avec documents SECIB téléchargeables. Le groupe `(client)/` est libéré de Directus.

## Décisions verrouillées (brainstorm 2026-06-12)

- **Q1 — Stratégie Directus** : remplacement complet en place. Le portail Directus actuel n'a aucun utilisateur réel (pilote pas encore ouvert). Le groupe `(client)/` passe sous Logto/Convex ; le groupe `(admin)/` reste dormant sous son guard Directus jusqu'à sa réécriture (S5) ; **le service Directus Coolify n'est pas touché** — son démantèlement se décidera quand plus rien ne s'y connecte (post-S5).
- **Q2 — Détail dossier** : 3 tabs — Infos (snapshot Convex realtime) / Documents (action scopée + téléchargement) / Suivi (`<CaseTimeline>` minimal, « Dossier créé » seul événement au départ).
- **Q3 — Dashboard** : minimal honnête — compteurs par statut + derniers dossiers mis à jour + CTA liste. Zéro placeholder mensonger (pas de blocs financiers/alertes « à venir »).
- **Approche** : rebranchement direct des pages existantes sur les hooks Convex (`useQuery`/`useAction`), structure ShadCN/design system conservée. Pas de couche d'adaptation.

## Hors scope

- Wizard nouveau dossier (S3b — la page `/dossiers/nouveau` devient un placeholder)
- Messagerie, demandes de pièces, notifications, emails Resend (S3c)
- Pages `documents` (vue transverse), `messagerie`, `parametres` → placeholders propres « disponible prochainement »
- Portail admin (S5) ; extraction i18n `messages.fr.json` (textes FR en dur, app monolingue — extraction si le besoin multilingue se confirme) ; pagination des listes (volumétrie pilote ≤ ~150)
- Onboarding des vrais utilisateurs syndics (création des comptes Logto des gestionnaires — opération à part, hors code)
- Suppression du service Directus / des `lib/api/*` encore consommés par `(admin)`

## Architecture

```
Backend (convex/)
  schema.ts         + cases.secibMatiereLibelle + cases.secibResponsableNom (optionnels)
  cases.ts          + duSyndic (query) ; snapshot upsert étendu aux 2 libellés
  importSecib.ts    snapshot enrichi (Matiere.Libelle, Responsable.NomComplet) — re-run idempotent
  secib.ts          + documentsDuDossier + telechargerDocument (actions scopées, withAuditLog)

Frontend (apps/frontend/src/)
  middleware.ts                       route-aware : Logto pour (client), Directus pour (admin)
  app/api/logto/[action]/route.ts     callback → /dashboard
  app/(client)/layout.tsx             identité via users.me (remplace dal.ts Directus)
  app/(client)/dashboard/page.tsx     compteurs statuts + derniers dossiers (cases.duSyndic)
  app/(client)/dossiers/page.tsx      liste filtrable/triable/recherche (client-side)
  app/(client)/dossiers/[id]/page.tsx détail 3 tabs
  app/(client)/{documents,messagerie,parametres}/page.tsx   placeholders S3c
  app/(client)/dossiers/nouveau/page.tsx                    placeholder S3b
  components/metier/StatusBadge.tsx   9 statuts → couleurs sémantiques design system
  components/metier/CaseTimeline.tsx  timeline verticale (1 événement pour l'instant)
```

## Détail des composants

### 0. Backend — snapshot enrichi (libellés)

`cases.secibMatiereLibelle` et `cases.secibResponsableNom` (optionnels, schéma) ; le validator de snapshot de `cases.upsertFromSecib` et le mapping de `importSecib.runForSyndic` les remplissent depuis `Matiere.Libelle` et `Responsable.NomComplet` du détail SECIB. **Re-run de l'import des 2 pilotes** après deploy (idempotent — `updated` partout, les libellés se remplissent).

### 1. Backend — `cases.duSyndic` (query)

`requireRoleQuery(ctx, SYNDIC_ROLES)` → cases de `user.organizationId` via l'index `by_org`, `collect()` (≤ ~150 docs au pilote ; tri/filtres côté client ; la pagination viendra avec le volume). Retourne les champs utiles à l'UI (doc complet acceptable — pas de champ sensible dans `cases`).

### 2. Backend — actions documents (`convex/secib.ts`)

Garde commune `assertCaseInOrg` : l'arg est un `caseId` Convex (`v.id("cases")`) ; l'action charge le case (internal query), vérifie `case.organizationId === audit.organizationId` (rôles syndic) — les rôles NPL full access (`npl_admin`/`npl_assistant`) passent sans cette contrainte. `ConvexError forbidden` sinon. Puis :
- **`documentsDuDossier`** : `gw GET /dossiers/{case.secibDossierId}/documents` → liste (Libelle, Extension, DateCreation, RepertoireLibelle, DocumentId)
- **`telechargerDocument`** : args `caseId` + `documentId` (string SECIB) → `gw GET /documents/{documentId}/content` → `{ fileName, mimeType, contentBase64 }`. ⚠ La garde d'appartenance vérifie le case ; le documentId n'est pas re-vérifié contre le dossier (le gateway/SECIB ne fournit pas de check direct — accepté au pilote, l'audit log trace tout ; à durcir si multi-tenant réel).

Les deux : `withAuditLog` (actions `secib.documents_du_dossier` / `secib.telecharger_document`, targetId = secibDossierId/documentId) + `secibFetch` — patterns S2B inchangés.

⚠ Taille de réponse : `telechargerDocument` renvoie le base64 dans la réponse d'action (limite Convex 16 Mo par valeur) — au-delà de ~10 Mo le téléchargement échouera proprement (`ConvexError` du gateway ou de l'action). Accepté au pilote (PDF juridiques typiques < 5 Mo).

### 3. Middleware & auth

`middleware.ts` :
- Routes `(client)` (`/dashboard`, `/dossiers/*`, `/documents`, `/messagerie`, `/parametres`) : session Logto vérifiée via `@logto/next/edge` (`getLogtoContext` sur la config partagée) → sinon redirect `/api/logto/sign-in`.
- Routes `(admin)` : guard Directus existant inchangé.
- `/login` (Directus) : plus référencée par le flux client ; la page reste pour `(admin)` si elle y est liée.
- Callback Logto (`app/api/logto/[action]/route.ts`) : redirect post-login `/convex-poc/dossiers` → `/dashboard`.

### 4. Layout `(client)` & identité

Le layout client affiche l'identité (nom, org) via `users.me` (Convex, client component) à la place du `dal.ts` Directus. Sidebar/nav du design system conservées ; les entrées de nav pointant sur les placeholders restent visibles (pages « disponible prochainement »). Un user **non-syndic** (npl_*) qui atteint `/dashboard` : la query `cases.duSyndic` renvoie `forbidden` → le layout affiche un état « Ce portail est réservé aux syndics » avec lien sign-out (pas de crash, pattern ErrorBoundary S2d).

### 5. Pages

- **Dashboard** : à partir de `cases.duSyndic` (une seule query, realtime) — compteurs par statut (cartes, `<StatusBadge>`), liste des 5 derniers `updatedAt`, CTA « Voir tous les dossiers ».
- **Liste** : table ShadCN — colonnes Libellé / Statut / Matière / Date d'ouverture / Dernière maj ; filtre statut (select), recherche texte sur libellé (client-side), tri par colonne. Ligne → détail.
- **Détail** : header (libellé, `<StatusBadge>`, date d'ouverture) + tabs :
  - *Infos* : snapshot `secib*` — matière et responsable affichés via les **libellés stockés au snapshot** (`secibMatiereLibelle`, `secibResponsableNom`, fournis par le détail SECIB à l'import ; résoudre via `cachedReferentials` exposerait des données cabinet aux syndics). Dates, et montant « à renseigner » si absent.
  - *Documents* : déclenchée à l'ouverture du tab (`useAction`), liste groupée par répertoire, bouton télécharger (base64 → Blob → `URL.createObjectURL` → `<a download>`)
  - *Suivi* : `<CaseTimeline>` — événement unique « Dossier créé le {createdAt} » (+ « importé de SECIB » si `secibSnapshotAt`)
- **Placeholders** (`documents`, `messagerie`, `parametres`, `dossiers/nouveau`) : page design-system propre, icône + « Disponible prochainement » + retour dashboard.

### 6. Composants métier

- `<StatusBadge status>` : mapping 9 statuts → couleurs sémantiques du design system (CREE=info, EN_ATTENTE_PIECES=warning, PRET/JUGEMENT_OBTENU=success, SUSPENDU/CLOTURE=muted, MISE_EN_DEMEURE_ENVOYEE/INJONCTION_DE_PAYER/ASSIGNATION_AU_FOND=primary/indigo) + libellés FR (« Créé », « En attente de pièces », …).
- `<CaseTimeline events>` : liste verticale point-ligne (design system), extensible (S5 y ajoutera les transitions).

## Gestion des erreurs

- Query `cases.duSyndic` en rôle non-syndic → `forbidden` → état dédié du layout (pas de crash).
- Tab Documents : gateway down → message d'erreur dans le tab (pattern résultat playground), dossier sans `secibDossierId` (futur case wizard non poussé) → tab affiche « Pas encore lié à SECIB ».
- Case d'une autre org → `forbidden` (garde `assertCaseInOrg`), détail affiche l'erreur.
- Téléchargement trop gros / échec → toast Sonner destructif avec le message `ConvexError`.

## Validation

1. Login `syndic_test_s2b` → `/dashboard` : 13 dossiers comptés, realtime (modifier un case via dashboard Convex → l'UI bouge sans refresh).
2. Liste : filtre statut, recherche « SEUILS », tri par date.
3. Détail d'un dossier réel : Infos complètes, tab Documents liste les pièces SECIB réelles, téléchargement d'un PDF byte-exact, tab Suivi affiche la création.
4. Contre-tests : user `npl_admin` sur `/dashboard` → état « réservé aux syndics » ; accès au `caseId` d'un dossier Choix Immo avec la session Immobilière du Bourg → `forbidden` ; non connecté sur `/dossiers` → redirect sign-in Logto.
5. `auditLogs` : lignes `secib.documents_du_dossier.*` et `secib.telecharger_document.*`.
6. Non-régression : playground `/convex-poc/dossiers` inchangé ; build prod (`next build`) sans erreur — attention aux pages `(client)` actuellement server components Directus qui doivent devenir des client components Convex (prerender : mêmes précautions que S2B, pas de `getLogtoContext` au prerender).
