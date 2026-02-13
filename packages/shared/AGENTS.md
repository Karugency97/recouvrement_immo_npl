# AGENTS.md - Shared Types Package

> Instructions specifiques pour la gestion du package de types TypeScript partages (`packages/shared/`).

---

## Role du package

Le package `@immo-npl/shared` centralise les types TypeScript qui representent les 12 collections Directus. Il est consomme par :

- `apps/frontend/` — pour typer les reponses API et les composants
- `apps/directus/` — pour typer les extensions (hooks, endpoints)

---

## Structure

```
packages/shared/
├── src/
│   └── types/
│       ├── index.ts              # Re-export de tous les types
│       ├── schema.ts             # Type Schema global (pour @directus/sdk)
│       ├── dossiers.ts           # Type Dossier + enums statut/phase
│       ├── syndics.ts            # Type Syndic
│       ├── coproprietes.ts       # Type Copropriete
│       ├── debiteurs.ts          # Type Debiteur + enum type
│       ├── creances.ts           # Type Creance + enums type/statut
│       ├── documents.ts          # Type Document + enums type/categorie
│       ├── evenements.ts         # Type Evenement + enum type
│       ├── taches.ts             # Type Tache + enums type/statut/priorite
│       ├── heures-facturables.ts # Type HeurFacturable + enum categorie
│       ├── factures.ts           # Type Facture + enum statut
│       ├── messages.ts           # Type Message
│       └── notes.ts              # Type Note + enum type
├── package.json
└── tsconfig.json
```

---

## Conventions de typage

### Nommage des types

| Element | Convention | Exemple |
|---------|------------|---------|
| Type principal | PascalCase singulier | `Dossier`, `Syndic`, `Creance` |
| Enum de statut | PascalCase + suffixe | `DossierStatut`, `TacheStatut` |
| Type de creation | PascalCase + `Create` | `DossierCreate`, `DebiteurCreate` |
| Type de mise a jour | PascalCase + `Update` | `DossierUpdate` |
| Schema global | `Schema` | Pour `createDirectus<Schema>()` |

### Pattern de definition d'un type collection

```typescript
// types/dossiers.ts

/** Statuts possibles d'un dossier */
export const DOSSIER_STATUTS = [
  'nouveau',
  'en_cours',
  'mise_en_demeure',
  'assignation',
  'injonction',
  'audience',
  'jugement',
  'execution',
  'paye',
  'cloture',
  'irrecovrable',
] as const;

export type DossierStatut = (typeof DOSSIER_STATUTS)[number];

/** Phases d'un dossier */
export const DOSSIER_PHASES = [
  'amiable',
  'pre_contentieux',
  'contentieux',
  'execution',
] as const;

export type DossierPhase = (typeof DOSSIER_PHASES)[number];

/** Priorites */
export const PRIORITES = ['basse', 'normale', 'haute', 'urgente'] as const;
export type Priorite = (typeof PRIORITES)[number];

/** Type Dossier (lecture depuis l'API) */
export interface Dossier {
  id: string;
  reference: string;
  statut: DossierStatut;
  phase: DossierPhase;
  titre: string;
  description: string | null;
  syndic_id: string | Syndic;
  copropriete_id: string | Copropriete;
  debiteur_id: string | Debiteur;
  avocat_responsable_id: string | null;
  date_ouverture: string;
  date_cloture: string | null;
  priorite: Priorite;
  juridiction: string | null;
  numero_rg: string | null;
  prochaine_audience: string | null;
  montant_initial: number;
  montant_actualise: number | null;
  montant_recouvre: number;
  date_created: string;
  date_updated: string;
  user_created: string;
  user_updated: string;
}

/** Type pour la creation d'un dossier (champs requis uniquement) */
export interface DossierCreate {
  titre: string;
  syndic_id: string;
  copropriete_id: string;
  debiteur_id: string;
  montant_initial: number;
  description?: string;
  priorite?: Priorite;
}

/** Type pour la mise a jour d'un dossier (tous les champs optionnels) */
export type DossierUpdate = Partial<Omit<Dossier, 'id' | 'reference' | 'date_created' | 'user_created'>>;
```

### Champs relationnels

Les champs FK (foreign key) utilisent un **union type** `string | RelatedType` :

```typescript
syndic_id: string | Syndic;  // string = ID seul, Syndic = objet hydrate
```

Cela reflète le comportement de Directus : sans `fields: ['syndic_id.*']`, on recoit un `string` (l'UUID). Avec les fields relationnels, on recoit l'objet complet.

### Type Schema global

```typescript
// types/schema.ts
import type { Dossier } from './dossiers';
import type { Syndic } from './syndics';
import type { Copropriete } from './coproprietes';
import type { Debiteur } from './debiteurs';
import type { Creance } from './creances';
import type { Document } from './documents';
import type { Evenement } from './evenements';
import type { Tache } from './taches';
import type { HeureFacturable } from './heures-facturables';
import type { Facture } from './factures';
import type { Message } from './messages';
import type { Note } from './notes';

/** Schema complet pour createDirectus<Schema>() */
export interface Schema {
  dossiers: Dossier[];
  syndics: Syndic[];
  coproprietes: Copropriete[];
  debiteurs: Debiteur[];
  creances: Creance[];
  documents: Document[];
  evenements: Evenement[];
  taches: Tache[];
  heures_facturables: HeureFacturable[];
  factures: Facture[];
  messages: Message[];
  notes: Note[];
}
```

---

## Pattern d'export monorepo

### package.json

```json
{
  "name": "@immo-npl/shared",
  "version": "0.0.1",
  "private": true,
  "main": "./src/types/index.ts",
  "types": "./src/types/index.ts",
  "exports": {
    ".": "./src/types/index.ts",
    "./types": "./src/types/index.ts"
  }
}
```

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*.ts"]
}
```

### Import dans les consumers

```typescript
// Dans apps/frontend/
import type { Dossier, DossierStatut, Schema } from '@immo-npl/shared';

// Dans apps/directus/
import type { Dossier } from '@immo-npl/shared';
```

Pour que cela fonctionne, le `tsconfig.json` du consumer doit inclure :
```json
{
  "compilerOptions": {
    "paths": {
      "@immo-npl/shared": ["../../packages/shared/src/types"],
      "@immo-npl/shared/*": ["../../packages/shared/src/types/*"]
    }
  }
}
```

Ou avec pnpm workspace, l'installation directe via `"@immo-npl/shared": "workspace:*"` dans le `package.json`.

---

## Synchronisation types <-> schema Directus

### Quand mettre a jour les types ?

1. **Ajout d'une collection** → Nouveau fichier `types/{collection}.ts` + ajout dans `schema.ts`
2. **Ajout d'un champ** → Ajouter la propriete dans l'interface correspondante
3. **Modification d'un enum** → Mettre a jour le `const` array et le type derive
4. **Suppression d'un champ** → Retirer de l'interface (verifier les usages dans le frontend)

### Checklist de synchronisation

- [ ] Le type reflète exactement les champs de la collection Directus
- [ ] Les champs FK ont le union type `string | RelatedType`
- [ ] Les champs optionnels ont `| null` (pas `?` sauf pour les types Create)
- [ ] Les enums correspondent aux valeurs configurees dans Directus
- [ ] L'index.ts re-exporte tous les types et enums
- [ ] Le Schema global inclut la nouvelle collection
- [ ] Les imports dans `apps/frontend/` et `apps/directus/` compilent sans erreur

### Regles strictes

- **Pas de `any`** — Tous les champs doivent etre types explicitement
- **Pas de `enum` TypeScript** — Utiliser `as const` + type derive (meilleure inference)
- **Noms de champs identiques a Directus** — Les champs sont en francais dans Directus, les types les reprennent tels quels
- **Dates en `string`** — Directus retourne les dates comme des strings ISO, pas des objets `Date`
- **Montants en `number`** — Les decimaux Directus sont retournes comme des numbers JavaScript
