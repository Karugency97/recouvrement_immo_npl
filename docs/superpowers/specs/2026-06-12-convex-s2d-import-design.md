# S2d — Import dossiers SECIB + dossiersOuJeSuisIntervenant — Design

**Date** : 2026-06-12
**Statut** : validé (brainstorm avec user)
**Précède** : plan d'implémentation S2d
**Suit** : S2c (crons, PR #5 mergée)

## Objectif

Peupler la table `cases` avec les dossiers SECIB réels des **2 syndics pilotes**, et livrer la query scopée `dossiersOuJeSuisIntervenant` (déférée depuis S2B faute de données locales). C'est le sprint qui transforme le POC en données réelles et débloque S3 (portail Syndic).

## Décisions verrouillées (brainstorm 2026-06-12)

- **Q1 — Syndics pilotes & orgs** : **option A** — Immobilière du Bourg + AGENCE CHOIX IMMO, en **orgs réelles** (création Logto + Convex ; l'org de test 5847 est promue en org réelle).
- **Q2 — Champs financiers** : **option A** — `principalCents` et `principalDateExigibilite` deviennent **optionnels** dans le schéma (`undefined` ≠ faux 0 € dans les calculs). `authorUserId`/`statusChangedByUserId` restent requis : l'import y met le user npl_admin. Statut `CREE` partout (pas de mapping automatique de l'état réel — SECIB n'a pas d'équivalent de la machine à états ; affinage manuel par le cabinet ensuite).
- **Q3 — Profondeur d'import** : **option A** — import **enrichi** (un `gw_dossiers_detail` par dossier) et **actifs uniquement** (`IsArchive: true` sautés). Ré-exécutable : upsert par `secibDossierId` via l'index `by_secib_dossier`.
- **Architecture** : internal action Convex (réutilise `secibFetch` + acteur système + audit S2c), pas de script local ni d'orchestration externe.
- **`dossiersOuJeSuisIntervenant` est une query** (lecture de la table `cases` locale via `by_secib_intervenant`), pas une action — réactive, zéro appel gateway. Rôles autorisés : `npl_avocat` **et** `npl_admin` (une avocate-admin comme Nancy porte les deux casquettes).

## Données de référence (vérifiées en lecture seule le 2026-06-12)

| Syndic pilote | PersonneId SECIB | Dossiers (TypePartieId=1) |
|---|---|---|
| SYNDIC DE COPROPRIETE L'IMMOBILIERE DU BOURG | `5847` | ~14 |
| AGENCE CHOIX IMMO | `3226` | ~128 |

⚠ `CHOIX IMMO` PersonneId 3728 est un **doublon** (sans RCS) de 3226 — ne pas l'utiliser.

Shape du détail dossier (vérifiée sur le dossier TEST 164) :
- `DateCreation` (ISO) → `secibDateOuverture` (epoch ms)
- `Matiere.MatiereId` (number) → `secibCodeMatiere` (string)
- `Responsable.UtilisateurId` (number, ex. 3 = Nancy) → `secibIntervenantId` (string) — identifiant canonique
- `Nom` → `secibLibelle`, `DossierId` → `secibDossierId` (string)
- `IsArchive` (boolean) → filtre

## Hors scope

- Query liste des cases côté syndic (S3 — le portail la définira avec sa pagination/tri)
- Sync continue SECIB → cases (S2d est un import one-shot ré-exécutable ; une éventuelle sync périodique sera un sprint dédié si le besoin se confirme)
- Onboarding des utilisateurs syndics réels dans les orgs Logto (S3)
- Mapping des statuts réels des dossiers (manuel, par le cabinet)

## Architecture

```
convex/schema.ts          principalCents + principalDateExigibilite optionnels
convex/importSecib.ts     runForSyndic (internal action "use node") + upsertCase (internal mutation)
convex/cases.ts           query publique dossiersOuJeSuisIntervenant
convex/seed.ts            + upsertSyndicOrg + setUserSecibIntervenantId (internal mutations)
apps/frontend/src/app/convex-poc/dossiers/page.tsx   + bouton "dossiersOuJeSuisIntervenant"
```

Hors repo (à l'exécution) : création des 2 orgs Logto réelles via le MCP `logto-npl`.

## Détail des composants

### 1. Schéma

`cases.principalCents` et `cases.principalDateExigibilite` passent en `v.optional(...)` avec le commentaire : « Requis fonctionnellement pour les cases créées par le wizard S3 ; absents sur les dossiers importés de SECIB (montant inconnu — ne JAMAIS défaulter à 0). » Rendre un champ optionnel est rétro-compatible, aucune migration.

### 2. Orgs pilotes — `seed:upsertSyndicOrg`

Internal mutation `{ logtoOrgId, name, secibSyndicPersonneId }` :
- cherche par l'index `by_secib_personne` ;
- si trouvée (cas org de test 5847) : **patch** `name` + `logtoOrgId` (promotion en org réelle) ;
- sinon : insert `{ kind: "syndic", ... }`.
- retourne `{ organizationId, action: "promoted" | "created" }`.

À l'exécution, les orgs Logto sont créées d'abord (MCP `logto-npl`, `create_organization`) pour obtenir les vrais `logtoOrgId` :
- « L'Immobilière du Bourg » → promotion de l'org Convex de test 5847
- « Agence Choix Immo » → création org Convex 3226

### 3. Import — `convex/importSecib.ts`

**`runForSyndic`** (internal action `"use node"`, args `{ secibSyndicPersonneId: v.string() }`) :

1. Résout l'org Convex via une internal query (par `by_secib_personne`) — `ConvexError` si absente. Résout aussi le user npl_admin (premier user `role: "npl_admin"`) comme auteur d'import — `ConvexError` si absent.
2. `secibFetch(ctx, SYSTEM_FETCH_ACTOR, { endpoint: "/personnes/{id}/dossiers" })` → liste des parties.
3. Filtre `TypePartieId === 1` (client), **dédoublonne** par `Dossier.DossierId` (un même dossier peut apparaître plusieurs fois via des parties parent/enfant).
4. Pour chaque DossierId : `secibFetch` détail `/dossiers/{id}` ; si `IsArchive` → compteur `skippedArchived`, skip ; sinon `ctx.runMutation(internal.importSecib.upsertCase, { organizationId, authorUserId, snapshot })`. Erreur par dossier isolée (try/catch, compteur `failed` + message tronqué 200 chars) — pattern S2c.
5. Trace finale : `cronRunRow("import-secib-dossiers", outcome, { secibSyndicPersonneId, imported, updated, skippedArchived, failed })` via `internal.auditLogs.append`. `outcome = failed` si ≥ 1 échec (cohérent avec la convention S2c post-review). NB : `cronRunRow` est réutilisé tel quel — l'acteur `system:cron` est acceptable pour un run système déclenché manuellement ; le nom du job le distingue.

**`upsertCase`** (internal mutation) : cherche par `by_secib_dossier` ;
- absent → `insert` : `status: "CREE"`, `statusChangedAt: now`, `statusChangedByUserId: authorUserId`, `casSpecial: []`, `pieces: []`, `createdAt/updatedAt: now`, snapshot `secib*` complet (`secibSnapshotAt: now`), pas de `principalCents`/`principalDateExigibilite` → retourne `"inserted"` ;
- présent → `patch` **uniquement** des champs snapshot `secib*` + `secibSnapshotAt` + `updatedAt` → retourne `"updated"`. Un re-run ne touche jamais `status`, montants, pièces ou autres champs saisis entre-temps.

Volumétrie : ~142 appels détail séquentiels (~1 min, cache gateway 5 min) — largement sous le timeout action.

### 4. Query — `convex/cases.ts` : `dossiersOuJeSuisIntervenant`

Query **publique** (pattern `users.me`) :
1. `requireRole(ctx, ["npl_avocat", "npl_admin"])` (helper S2B existant) ;
2. si `user.secibIntervenantId` absent → `ConvexError { code: "avocat.no_secib_intervenant_id" }` (nouvelle factory dans `convex/lib/errors.ts`) ;
3. retourne les `cases` de l'index `by_secib_intervenant` (collect — volumétrie pilote ≤ ~150 docs ; la pagination viendra avec le portail S3).

Pas d'audit log : query réactive appelée en continu par l'UI — l'auditer générerait du bruit (cohérent avec `users.me`). Les actions SECIB restent les seules auditées.

### 5. Mapping intervenant — `seed:setUserSecibIntervenantId`

Internal mutation `{ logtoUserId, secibIntervenantId }` : patch du user (lookup `by_logto_user`). Utilisée en validation pour donner au user npl_admin de test `secibIntervenantId: "3"` (Nancy, `Responsable.UtilisateurId` 3). À terme, le provisioning S3 posera ce champ à la création des comptes avocats.

### 6. Playground

Ajout d'un 4e bouton `dossiersOuJeSuisIntervenant` sur `/convex-poc/dossiers` — `useQuery` (pas `useAction`) déclenché à la demande (le pattern existant du playground affiche le résultat JSON brut ; pour une query, un state `enabled` + `useQuery` conditionnel via `"skip"`).

## Gestion des erreurs

- Org ou user npl_admin introuvable → `ConvexError` immédiate, rien d'importé.
- Échec gateway sur la liste → action throw (run `.failed`, 0 importé).
- Échec détail sur un dossier → isolé (compteur `failed`, les autres continuent).
- Re-run après échec partiel → idempotent : les déjà-importés passent en `updated`, les échoués retentés.

## Validation

1. Deploy + création des 2 orgs Logto (MCP) + `seed:upsertSyndicOrg` ×2 → vérifier `organizations` (promotion 5847 : même `_id` qu'avant, nouveau nom/logtoOrgId).
2. `importSecib:runForSyndic {"secibSyndicPersonneId":"5847"}` → ~14 cases ; re-run immédiat → `imported: 0, updated: ~14` (idempotence).
3. `importSecib:runForSyndic {"secibSyndicPersonneId":"3226"}` → ~128 cases (moins les archivés) ; compteurs cohérents avec SECIB.
4. `seed:setUserSecibIntervenantId {"logtoUserId":"y603zurdjehk","secibIntervenantId":"3"}` puis playground : login npl_admin → bouton `dossiersOuJeSuisIntervenant` → les dossiers dont Nancy est responsable ; en syndic → `auth.forbidden`.
5. `auditLogs` : lignes `import-secib-dossiers` avec compteurs ; `secibFetchLog` : ~142 lignes de fetch détail (acteur système).
6. Non-régression : `dossiersDuSyndic` en syndic (playground) inchangé.
