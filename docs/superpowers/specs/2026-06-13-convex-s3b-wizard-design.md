# S3b — Wizard nouveau dossier (Convex) — Design

**Date** : 2026-06-13
**Statut** : validé (brainstorm avec user)
**Précède** : plan d'implémentation S3b
**Suit** : S3a (portail syndic lecture, PR #7 + fixes mergés)
**Décomposition S3** : S3a (lecture) → S3b (wizard, ce spec) → S3c (messagerie + notes→GED + emails)

## Objectif

Le Gate S4 (volet syndic) de PLAN_V1 : un syndic crée un dossier de recouvrement via un wizard auto-sauvegardé. Le submit produit un `case` Convex prêt à être contrôlé puis poussé dans SECIB par le cabinet — **le wizard n'écrit jamais dans SECIB**.

## Décisions verrouillées (brainstorm 2026-06-13)

- **Q1 — Comportement du submit** : crée un `case` Convex (statut `CREE`, flag `pendingSecibPush`), **aucune écriture SECIB**. La création SECIB réelle (Personne + Dossier + Parties) est faite par le cabinet en S5 après contrôle. Évite qu'un syndic pollue la GED du cabinet et tout `gw_*_creer` en prod pendant le pilote.
- **Q2 — Pièces** : **déclaration seule**. Le wizard liste les pièces requises ; le syndic ne fait que constater ce qu'il fournira. `pieces[]` créées en statut `REQUESTED`. Aucun upload de fichier (le stockage de binaires est un sous-système à part, S3c/S5).
- **Q3 — Cas spéciaux** : **cases à cocher pilotant les pièces conditionnelles**. `casSpecial[]` capture les cas applicables ; chaque cas ajoute sa pièce conditionnelle. Aucune logique de procédure dans le wizard (métier cabinet, S5). Encart d'info pour le redressement.
- **Q4 — Données débiteur/créance** : **champs structurés sur `cases`** (objet `debiteur` + métadonnées créance), pas de blob `v.any()`. Le débiteur = future Personne SECIB ; le typer rend le push S5 robuste.
- **Q5 — Brouillons** : **un seul brouillon actif par syndic**. Le wizard reprend le brouillon en cours ; en démarrer un nouveau écrase l'ancien. Le plus simple, cohérent avec « reprendre où on en était ».

## Hors scope

- Écriture SECIB (Personne / Dossier / Parties) — S5 (cabinet contrôle puis pousse)
- Upload de fichiers / stockage de binaires — S3c (demande de pièces) ou S5
- Logique de procédure par cas spécial (variantes de templates, déclaration de créance) — S5
- Messagerie, notifications, emails — S3c
- Brouillons multiples, partage de brouillon entre gestionnaires d'un même syndic
- Édition d'un dossier après création (le wizard ne fait que créer)

## Architecture

```
convex/schema.ts        cases + debiteur(objet) + créance(periode/nbRelances/observations) + pendingSecibPush + index by_pending_push
convex/lib/pieces.ts    catalogue de pièces (toujours + mapping cas spécial → pièce conditionnelle)
convex/lib/auth.ts      + requireRoleMutation (jumeau mutation de requireRoleQuery)
convex/caseDrafts.ts    getMyDraft (query) + saveDraft (mutation) + submitDraft (mutation)
apps/frontend/src/app/(client)/dossiers/nouveau/page.tsx   wizard 4 étapes (remplace le placeholder)
apps/frontend/src/lib/convexApi.ts                          + refs draft + types wizard
```

## Détail des composants

### 1. Schéma (`convex/schema.ts`)

Table `cases`, ajouts (tous optionnels — rétro-compatible, les cases importés de SECIB ne les ont pas) :

```ts
// Débiteur saisi au wizard — devient une Personne SECIB au push S5.
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
// Métadonnées créance (principalCents / principalDateExigibilite existent déjà).
periodeDebut: v.optional(v.number()),     // epoch ms
periodeFin: v.optional(v.number()),
nbRelances: v.optional(v.number()),
observations: v.optional(v.string()),
// Dossier créé au wizard, en attente de contrôle + push SECIB par le cabinet (S5).
pendingSecibPush: v.optional(v.boolean()),
```

Index ajouté : `.index("by_pending_push", ["pendingSecibPush"])` (S5 retrouve les dossiers à pousser).

`caseDrafts` : schéma inchangé (déjà complet, `wizardData: v.any()` porte l'état du formulaire en cours).

### 2. Catalogue de pièces (`convex/lib/pieces.ts`)

Module partagé (pas de dépendance `_generated`, importable par mutations et frontend via une copie typée).

```ts
export type PieceRequirement = "obligatoire" | "recommandee" | "utile";
export type PieceTemplate = { type: string; requirement: PieceRequirement };

// Toujours demandées (PLAN_V1 §3).
export const ALWAYS_PIECES: PieceTemplate[] = [
  { type: "Décompte de charges détaillé", requirement: "obligatoire" },
  { type: "PV d'AG approuvant les comptes", requirement: "recommandee" },
  { type: "Mandat de syndic en cours", requirement: "recommandee" },
  { type: "Mise en demeure préalable du syndic", requirement: "recommandee" },
  { type: "Relevé d'identité du débiteur", requirement: "utile" },
];

// Cas spécial → pièce conditionnelle. MULTI_LOTS = regroupement procédural,
// pas de pièce dédiée (PLAN_V1).
export const CONDITIONAL_PIECES: Record<string, PieceTemplate | undefined> = {
  INDIVISION: { type: "Liste des indivisaires + état civil", requirement: "obligatoire" },
  DECEDE: { type: "Acte de notoriété + déclaration de succession", requirement: "obligatoire" },
  REDRESSEMENT: { type: "Justificatif de redressement / liquidation", requirement: "obligatoire" },
  LOT_LOUE: { type: "Bail locatif + identité du locataire", requirement: "recommandee" },
  MULTI_LOTS: undefined,
};

// Construit la liste finale (toujours + conditionnelles dédupliquées).
export function buildPieces(casSpecial: string[]): PieceTemplate[] { /* ... */ }
```

Le frontend a sa propre copie du catalogue (pour afficher la liste en live à l'étape Pièces sans appel serveur) ; le backend l'utilise au submit pour générer les `pieces[]`. Source unique conceptuelle, dupliquée volontairement (frontend ne peut pas importer `convex/lib`). Documenté en commentaire des deux côtés.

### 3. Backend — `requireRoleMutation` (`convex/lib/auth.ts`)

`requireRoleQuery` prend un `QueryCtx`. Les mutations ont besoin du même gate sur `MutationCtx`. Ajout d'un jumeau :

```ts
export async function requireRoleMutation(
  ctx: MutationCtx,
  allowed: readonly UserRole[],
) { /* identique à requireRoleQuery, ctx.db.query (read) valide en mutation */ }
```

(Alternative envisagée : élargir requireRoleQuery à `QueryCtx | MutationCtx` — rejetée, la signature explicite est plus lisible et suit le pattern existant.)

### 4. Backend — `convex/caseDrafts.ts`

- **`getMyDraft`** (query) : `requireRoleQuery(ctx, SYNDIC_ROLES)` → le draft de l'auteur via `by_author` (`.unique()` ; un seul brouillon par syndic). Retourne le doc ou `null`.
- **`saveDraft`** (mutation) : `requireRoleMutation(ctx, SYNDIC_ROLES)` → upsert du draft de l'auteur (`by_author`). Args : `casSpecial`, `debiteurNom?`, `principalCents?`, `currentStep`, `wizardData`. `updatedAt = now`, `expiresAt = now + 30j`. (Le cron `casedrafts-cleanup` S2c purge les expirés.)
- **`submitDraft`** (mutation) : `requireRoleMutation(ctx, SYNDIC_ROLES)`. Args = les données finales validées du wizard (débiteur, créance, casSpecial). **Validation serveur** des champs requis (débiteur.nom + type, principalCents > 0, principalDateExigibilite) → `ConvexError` sinon. Crée le `case` : `organizationId`/`authorUserId`/`statusChangedByUserId` = l'appelant, `status: "CREE"`, `pendingSecibPush: true`, `debiteur`/créance structurés, `pieces` = `buildPieces(casSpecial)` mappées en `{type, requirement, status: "REQUESTED", requestedAt: now}`, `createdAt/updatedAt/statusChangedAt = now`. Puis **supprime le draft** de l'auteur s'il existe. Trace `auditLogs` (action `case.created_via_wizard`, acteur = le syndic — via une insertion directe, pas withAuditLog qui est action-only). Retourne `{ caseId }`.

### 5. Frontend — `/dossiers/nouveau`

Client component (remplace le placeholder `ComingSoon`). Reprend le stepper et la structure 4 étapes du `WizardForm.tsx` existant, recâblé sur Convex.

- **Au montage** : `useQuery(getMyDraft)`. Si un brouillon existe → bandeau « Reprendre votre brouillon » qui réhydrate `wizardData` dans l'état du formulaire.
- **Auto-save** : debounce ~1,5 s sur tout changement → `useMutation(saveDraft)` avec l'état courant + `currentStep`. Indicateur discret « Enregistré ».
- **Étapes** :
  1. **Débiteur** — type PP/PM (radio), nom (requis), adresse, email, téléphone, description du lot
  2. **Créance** — montant € (→ cents au submit), date d'exigibilité, période début/fin, nb de relances, observations + **cases à cocher cas spéciaux** (5)
  3. **Pièces** — liste calculée live via le catalogue frontend (`buildPieces(casSpecial)`), affichée en lecture avec badge de requirement ; encart info si `REDRESSEMENT` coché (« procédure spécifique — le cabinet vous recontactera »)
  4. **Validation** — récap lisible des 3 étapes + bouton « Créer le dossier »
- **Submit** : validation client (mêmes règles que le serveur) → `useMutation(submitDraft)` → toast Sonner succès → `router.push('/dossiers/${caseId}')`. Erreur → toast destructif avec le message `ConvexError`.
- `prefetch={false}` sur les liens internes (contrainte proxy/RSC, cf. memory `reference-rsc-prefetch-proxy-cors`).

### 6. `convexApi.ts`
Refs `getMyDraft` / `saveDraft` / `submitDraft` + types `WizardData`, `DebiteurInput`, copie du catalogue de pièces (`ALWAYS_PIECES`, `CONDITIONAL_PIECES`, `buildPieces`).

## Gestion des erreurs

- Champs requis manquants au submit → `ConvexError` (validation serveur, le client valide aussi avant).
- Rôle non-syndic sur les mutations draft → `forbidden` (gate `requireRoleMutation`).
- Brouillon d'un autre syndic → invisible (scoping `by_author` sur l'appelant ; un syndic ne peut ni lire ni écraser le draft d'un autre).
- Auto-save en échec réseau → silencieux + retry au prochain changement (pas de blocage de la saisie).

## Validation

1. Login `syndic_test_s2b` → `/dossiers/nouveau` → wizard vide.
2. Remplir étape Débiteur, attendre l'auto-save (« Enregistré »), **recharger la page** → bandeau « Reprendre » → données réhydratées.
3. Étape Créance : cocher `LOT_LOUE` → à l'étape Pièces, « Bail locatif + identité du locataire » apparaît ; cocher `REDRESSEMENT` → encart d'info affiché.
4. Submit → toast succès → redirect `/dossiers/[id]` du nouveau case ; le dossier apparaît dans la liste (statut `CREE`), `debiteur`/`pieces`/`pendingSecibPush` peuplés (vérif `convex data cases`), draft supprimé (`convex data caseDrafts` vide).
5. `auditLogs` : ligne `case.created_via_wizard` (acteur syndic).
6. Contre-tests : champ nom vide → submit bloqué (client + serveur) ; le brouillon n'est pas visible depuis un autre compte syndic ; non-régression liste/détail S3a.
7. Build prod en conditions Docker (leçon S2B) ; 0 erreur console (prefetch désactivé).
