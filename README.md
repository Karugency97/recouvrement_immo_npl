# IMMO NPL (LegalRecover)

Application SaaS B2B de gestion de dossiers juridiques pour le recouvrement de creances immobilieres en copropriete.

Deux portails :
- **Portail Client** (Syndics) : depot de dossiers, suivi, messagerie, documents
- **Portail Admin** (Avocats) : workspace complet, taches, facturation, annuaire

## Architecture

```
┌─────────────────────────────────────────────────┐
│         FRONTEND (Next.js 15 + ShadCN UI)       │
│   Portail Client (Syndics)  │  Portail Admin    │
└──────────────────┬──────────────────────────────┘
                   │ REST API / @directus/sdk
┌──────────────────▼──────────────────────────────┐
│              DIRECTUS (Coolify VPS)              │
│  12 Collections │ Auth │ Files │ Flows │ RBAC   │
└──────────────────┬──────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────┐
│                 PostgreSQL                       │
└─────────────────────────────────────────────────┘
```

## Stack technique

| Couche | Technologie |
|--------|-------------|
| Frontend | Next.js 15 (App Router, Turbopack), React 19, TypeScript |
| UI | Tailwind CSS 3, ShadCN UI, Lucide React |
| Backend / API | Directus (REST API, auth, RBAC, fichiers) |
| Base de donnees | PostgreSQL |
| Hebergement backend | VPS via Coolify |
| Monorepo | pnpm workspaces + Turborepo |
| Validation | Zod + react-hook-form |
| Notifications | Sonner (toast) |

## Structure du monorepo

```
immo-npl/
├── apps/
│   ├── frontend/              # Next.js 15 (App Router)
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── (auth)/        # Login
│   │   │   │   ├── (client)/      # Portail Syndic
│   │   │   │   ├── (admin)/       # Portail Admin/Avocat
│   │   │   │   └── api/           # Route handlers (auth, upload)
│   │   │   ├── components/        # Composants React
│   │   │   └── lib/
│   │   │       ├── api/           # Fonctions CRUD par collection
│   │   │       ├── validations/   # Schemas Zod
│   │   │       ├── directus.ts    # Client Directus SDK
│   │   │       ├── dal.ts         # Data Access Layer (Server Components)
│   │   │       └── actions.ts     # Server Actions
│   │   └── ...
│   └── directus/              # Extensions Directus
│       ├── extensions/
│       │   ├── hooks/
│       │   │   ├── auto-reference/    # Reference auto LR-YYYY-NNN
│       │   │   └── auto-timeline/     # Timeline auto sur changement statut
│       │   └── endpoints/
│       │       └── dashboard-stats/   # Stats aggregees dashboard
│       ├── scripts/               # Scripts de setup
│       │   ├── setup-schema.mjs
│       │   ├── setup-roles.mjs
│       │   └── seed-data.mjs
│       └── snapshots/             # Snapshots schema Directus
└── packages/
    └── shared/                # Types TypeScript partages
        └── src/types/         # Types par collection Directus
```

## Pre-requis

- **Node.js** >= 18 (teste avec v22)
- **pnpm** >= 9 (`corepack enable && corepack prepare pnpm@9.15.4 --activate`)
- Une instance **Directus** en fonctionnement (auto-hebergee ou cloud)
- **PostgreSQL** (utilise par Directus)

## Installation

### 1. Cloner le repository

```bash
git clone <url-du-repo>
cd immo-npl
```

### 2. Installer les dependances

```bash
pnpm install
```

### 3. Configurer les variables d'environnement

Copier le fichier d'exemple et renseigner les valeurs :

```bash
cp .env.example apps/frontend/.env.local
```

Editer `apps/frontend/.env.local` :

```env
# URL publique de votre instance Directus
NEXT_PUBLIC_DIRECTUS_URL=http://localhost:8055
```

### 4. Configurer Directus

Si vous utilisez une instance Directus fraiche, executez les scripts de setup dans l'ordre :

```bash
# Creer le schema (collections, champs, relations)
pnpm --filter @immo-npl/directus setup:schema

# Configurer les roles (Administrateur, Avocat, Syndic)
pnpm --filter @immo-npl/directus setup:roles

# (Optionnel) Injecter des donnees de test
pnpm --filter @immo-npl/directus seed
```

> Ces scripts necessitent les variables `DIRECTUS_URL` et `DIRECTUS_ADMIN_TOKEN` dans `.env` a la racine (voir `.env.example`).

### 5. Lancer le developpement

```bash
# Demarrer le frontend (avec Turbopack)
pnpm dev
```

L'application sera disponible sur [http://localhost:3000](http://localhost:3000).

## Commandes disponibles

| Commande | Description |
|----------|-------------|
| `pnpm dev` | Demarrer tous les apps en mode dev (Turborepo) |
| `pnpm build` | Builder tous les apps |
| `pnpm lint` | Linter tous les apps |
| `pnpm type-check` | Verification des types TypeScript |
| `pnpm --filter frontend dev` | Demarrer uniquement le frontend |
| `pnpm --filter frontend build` | Builder uniquement le frontend |
| `pnpm --filter @immo-npl/directus setup:schema` | Configurer le schema Directus |
| `pnpm --filter @immo-npl/directus setup:roles` | Configurer les roles Directus |
| `pnpm --filter @immo-npl/directus seed` | Injecter des donnees de test |

### Ajouter un composant ShadCN

```bash
cd apps/frontend
pnpm dlx shadcn@latest add <composant>
```

## Authentification

Le flux d'authentification fonctionne ainsi :

1. L'utilisateur se connecte via `/login`
2. Le formulaire appelle `/api/auth/login` (Route Handler Next.js)
3. Le serveur authentifie via l'API Directus (`/auth/login`)
4. Les tokens sont stockes en cookies HTTP-only (`auth_token`, `refresh_token`)
5. Le middleware (`middleware.ts`) protege les routes et gere le refresh automatique
6. `dal.ts` lit l'utilisateur courant dans les Server Components

### Roles

| Role | Acces |
|------|-------|
| **Administrateur** | Acces complet |
| **Avocat** | CRUD sur la plupart des collections |
| **Syndic** | Lecture seule, filtre sur ses propres donnees (`syndics.user_id = $CURRENT_USER`) |

## Schema Directus

12 collections personnalisees avec `dossiers` comme hub central :

- `dossiers` — Dossiers juridiques (reference auto `LR-YYYY-NNN`)
- `debiteurs` — Debiteurs lies aux dossiers
- `creances` — Creances (montants, types)
- `coproprietes` — Coproprietes concernees
- `syndics` — Syndics (clients)
- `documents` — Pieces jointes
- `evenements` — Timeline (auto-creee sur changement de statut)
- `messages` — Messagerie dossier
- `notes` — Notes internes
- `taches` — Taches avocats
- `heures_facturables` — Suivi du temps
- `factures` — Facturation

## Extensions Directus

| Extension | Type | Description |
|-----------|------|-------------|
| `auto-reference` | Hook | Genere une reference sequentielle `LR-YYYY-NNN` a la creation d'un dossier |
| `auto-timeline` | Hook | Cree un evenement dans la timeline lors d'un changement de statut |
| `dashboard-stats` | Endpoint | Retourne les statistiques aggregees pour les dashboards client et admin |

## Variables d'environnement

### Frontend (`apps/frontend/.env.local`)

| Variable | Description | Exemple |
|----------|-------------|---------|
| `NEXT_PUBLIC_DIRECTUS_URL` | URL publique de l'instance Directus | `https://database.example.com` |

### Racine (`.env` — pour les scripts Directus)

| Variable | Description | Exemple |
|----------|-------------|---------|
| `DIRECTUS_URL` | URL de l'instance Directus | `http://localhost:8055` |
| `DIRECTUS_ADMIN_TOKEN` | Token statique admin Directus | `votre-token-admin` |
| `AUTH_SECRET` | Secret pour la signature des sessions | `une-chaine-aleatoire-longue` |

## Portails

### Portail Client (Syndic)

- `/dashboard` — Tableau de bord (stats, dossiers recents, evenements)
- `/dossiers` — Liste des dossiers
- `/dossiers/nouveau` — Creation de dossier (wizard 4 etapes)
- `/dossiers/[id]` — Detail d'un dossier
- `/documents` — Tous les documents
- `/messagerie` — Messagerie
- `/parametres` — Parametres du compte

### Portail Admin (Avocat)

- `/admin/dashboard` — Tableau de bord admin
- `/admin/dossiers` — Gestion des dossiers
- `/admin/dossiers/[id]` — Workspace dossier complet
- `/admin/taches` — Gestion des taches
- `/admin/annuaire` — Annuaire syndics/coproprietes
- `/admin/facturation` — Facturation et heures

## Conventions

- **UI** : Tout le contenu visible est en **francais**
- **Code** : Identifiants (variables, fonctions, composants) en **anglais**
- **Directus** : Noms de collections/champs en **francais**
- **Icones** : Lucide React exclusivement
- **Design** : Voir `DESIGN_SYSTEM.md` pour les tokens complets (couleurs, typographie, espacements)

## Licence

Proprietary — Tous droits reserves.
