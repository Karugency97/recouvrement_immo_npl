# Plan d'Implementation - IMMO NPL (LegalRecover)

> Application SaaS B2B de gestion de dossiers juridiques pour le recouvrement de creances immobilieres (coproprietes).
> Backend : Directus (VPS Coolify, PostgreSQL) | Frontend : Next.js 15 + React 19 + ShadCN UI

## Reference : Frontend existant

Un frontend fonctionnel (React CRA + React Router) existe deja comme maquette de reference :
- **Chemin** : `/Users/mkstudio/Desktop/PROJET KARUGENCY/IMMO NPL/frontend/`
- **Screenshots** : `/Users/mkstudio/Desktop/Recouvrement immobilier NPL/Screen/`
- **A reprendre a l'identique** : tokens CSS (`index.css`), `tailwind.config.js`, layouts (sidebars client/admin), composants visuels (stats cards, wizard 4 etapes, timeline, badges, messagerie, documents)
- **A migrer** : React Router -> App Router, CaseContext -> Server Components + Directus SDK, JSDoc -> TypeScript, mockData -> API Directus, craco -> Next.js natif

Les fichiers cles du frontend existant a consulter lors de l'implementation :
- `src/index.css` — Tous les tokens CSS (variables, classes utilitaires, scrollbar, animations)
- `tailwind.config.js` — Config Tailwind complete (couleurs, ombres, animations, sidebar)
- `src/layouts/ClientLayout.jsx` — Sidebar client + header
- `src/layouts/AdminLayout.jsx` — Sidebar admin + header + theme indigo
- `src/pages/client/Dashboard.jsx` — Dashboard client (stats cards, dossiers recents, evenements)
- `src/components/client/NewCaseWizard.jsx` — Wizard 4 etapes complet
- `src/components/shared/StatusBadges.jsx` — Tous les badges (statut, document, financier, dette)
- `src/components/shared/Timeline.jsx` — Timeline verticale + compacte
- `src/components/shared/DocumentsList.jsx` — Liste documents
- `src/components/shared/MessageThread.jsx` — Messagerie avec bulles
- `src/data/types.js` — Constantes (statuts, labels, couleurs)
- `src/data/mockData.js` — Donnees mock (structure de reference pour les types)

---

## Architecture Globale

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

---

## Structure du Monorepo

```
immo-npl/
├── apps/
│   ├── frontend/                       # Next.js 15 (App Router)
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── (auth)/            # Login, mot de passe oublie
│   │   │   │   │   ├── login/page.tsx
│   │   │   │   │   ├── forgot-password/page.tsx
│   │   │   │   │   └── layout.tsx
│   │   │   │   ├── (client)/          # Portail Syndic/Client
│   │   │   │   │   ├── dashboard/page.tsx
│   │   │   │   │   ├── dossiers/
│   │   │   │   │   │   ├── page.tsx
│   │   │   │   │   │   ├── [id]/page.tsx
│   │   │   │   │   │   └── nouveau/page.tsx
│   │   │   │   │   ├── documents/page.tsx
│   │   │   │   │   ├── messagerie/page.tsx
│   │   │   │   │   ├── parametres/page.tsx
│   │   │   │   │   └── layout.tsx
│   │   │   │   ├── (admin)/           # Portail Admin/Avocat
│   │   │   │   │   └── admin/
│   │   │   │   │       ├── dashboard/page.tsx
│   │   │   │   │       ├── dossiers/
│   │   │   │   │       │   ├── page.tsx
│   │   │   │   │       │   └── [id]/page.tsx    # Workspace
│   │   │   │   │       ├── taches/page.tsx
│   │   │   │   │       ├── annuaire/page.tsx
│   │   │   │   │       ├── facturation/page.tsx
│   │   │   │   │       └── layout.tsx
│   │   │   │   ├── api/auth/          # API Routes (login/logout/refresh)
│   │   │   │   ├── layout.tsx         # Root layout
│   │   │   │   └── page.tsx           # Redirect
│   │   │   ├── components/
│   │   │   │   ├── ui/               # ShadCN (generes)
│   │   │   │   ├── layout/           # Sidebar, Header, MobileNav
│   │   │   │   ├── dossiers/         # DossierCard, DossierList, Wizard
│   │   │   │   ├── timeline/         # Timeline, TimelineEvent
│   │   │   │   ├── documents/        # DocumentList, Upload, Viewer
│   │   │   │   ├── messaging/        # MessageList, Thread, Composer
│   │   │   │   ├── tasks/            # TaskList, TaskCard, Calendar
│   │   │   │   ├── billing/          # TimeEntry, InvoiceList
│   │   │   │   └── shared/           # StatsCard, EmptyState, Search
│   │   │   ├── lib/
│   │   │   │   ├── directus.ts       # Client SDK Directus
│   │   │   │   ├── dal.ts            # Data Access Layer (auth)
│   │   │   │   ├── api/              # Fonctions CRUD par collection
│   │   │   │   │   ├── dossiers.ts
│   │   │   │   │   ├── syndics.ts
│   │   │   │   │   ├── debiteurs.ts
│   │   │   │   │   ├── documents.ts
│   │   │   │   │   ├── evenements.ts
│   │   │   │   │   ├── taches.ts
│   │   │   │   │   ├── heures.ts
│   │   │   │   │   ├── factures.ts
│   │   │   │   │   ├── messages.ts
│   │   │   │   │   └── stats.ts
│   │   │   │   ├── utils/
│   │   │   │   │   ├── format-currency.ts
│   │   │   │   │   ├── format-date.ts
│   │   │   │   │   ├── cn.ts
│   │   │   │   │   └── constants.ts
│   │   │   │   └── validations/
│   │   │   │       ├── dossier-schema.ts
│   │   │   │       ├── message-schema.ts
│   │   │   │       └── task-schema.ts
│   │   │   ├── hooks/
│   │   │   │   ├── use-auth.ts
│   │   │   │   └── use-debounce.ts
│   │   │   ├── styles/globals.css
│   │   │   └── middleware.ts
│   │   ├── tailwind.config.ts
│   │   ├── components.json
│   │   └── package.json
│   │
│   └── directus/                       # Extensions Directus
│       ├── extensions/
│       │   ├── hooks/
│       │   │   ├── auto-reference/     # Genere LR-YYYY-NNN
│       │   │   └── auto-timeline/      # Evenement auto sur changement statut
│       │   └── endpoints/
│       │       └── dashboard-stats/    # Stats agregees
│       ├── snapshots/
│       │   └── schema-snapshot.yaml
│       └── package.json
│
├── packages/
│   └── shared/                         # Types TypeScript partages
│       ├── src/types/
│       └── package.json
│
├── pnpm-workspace.yaml
├── turbo.json
├── package.json
├── .env.example
├── .gitignore
├── DESIGN_SYSTEM.md
├── PLAN.md
└── README.md
```

---

## PHASE 1 : Initialisation du Monorepo

| # | Action | Detail |
|---|--------|--------|
| 1.1 | Git init | `git init` + `.gitignore` |
| 1.2 | Package racine | `package.json` avec pnpm workspaces + Turborepo |
| 1.3 | Workspace config | `pnpm-workspace.yaml` (apps/*, packages/*) |
| 1.4 | Turborepo | `turbo.json` (tasks: dev, build, lint, type-check) |
| 1.5 | Env | `.env.example` avec `NEXT_PUBLIC_DIRECTUS_URL` |
| 1.6 | Dossiers Directus | `apps/directus/extensions/hooks/`, `endpoints/`, `snapshots/` |
| 1.7 | Next.js | `pnpm create next-app@latest apps/frontend` (TS, Tailwind, App Router, src dir) |
| 1.8 | Dependances | `@directus/sdk`, `sonner`, `react-hook-form`, `@hookform/resolvers`, `zod`, `lucide-react` |
| 1.9 | ShadCN UI | Init + ~25 composants (button, card, input, table, dialog, tabs, badge, etc.) |
| 1.10 | Design tokens | `globals.css` + `tailwind.config.ts` avec les couleurs/typo du DESIGN_SYSTEM.md |
| 1.11 | Types partages | `packages/shared/` avec les interfaces TypeScript des 12 collections |

### Dependances frontend

```json
{
  "dependencies": {
    "@directus/sdk": "latest",
    "sonner": "latest",
    "react-hook-form": "latest",
    "@hookform/resolvers": "latest",
    "zod": "latest",
    "lucide-react": "latest"
  }
}
```

---

## PHASE 2 : Schema Directus (12 Collections)

### 2.1 `syndics` — Clients syndics de copropriete

| Champ | Type | Options | Notes |
|-------|------|---------|-------|
| `id` | uuid | PK, auto | |
| `status` | string | actif / inactif / suspendu | default: actif |
| `raison_sociale` | string | **required** | Nom du syndic |
| `siret` | string | 14 chars | |
| `adresse` | text | **required** | |
| `code_postal` | string | 5 chars | |
| `ville` | string | **required** | |
| `email_contact` | string (email) | **required**, unique | |
| `telephone` | string | | |
| `nom_referent` | string | | Personne de contact |
| `prenom_referent` | string | | |
| `user_id` | uuid | FK -> directus_users | Compte utilisateur |
| `notes_internes` | text | | Visible admin only |
| `date_created` | timestamp | auto | |
| `date_updated` | timestamp | auto | |

**Relations** : `syndics` -> coproprietes (O2M), dossiers (O2M), factures (O2M)

---

### 2.2 `coproprietes`

| Champ | Type | Options | Notes |
|-------|------|---------|-------|
| `id` | uuid | PK | |
| `nom` | string | **required** | "Residence Les Tilleuls" |
| `adresse` | text | **required** | |
| `code_postal` | string | 5 chars | |
| `ville` | string | **required** | |
| `nombre_lots` | integer | | |
| `syndic_id` | uuid | FK -> syndics, **required** | |
| `reference_interne` | string | | Ref du syndic |
| `date_created` | timestamp | auto | |
| `date_updated` | timestamp | auto | |

**Relations** : `coproprietes.syndic_id` -> syndics (M2O)

---

### 2.3 `debiteurs`

| Champ | Type | Options | Notes |
|-------|------|---------|-------|
| `id` | uuid | PK | |
| `type` | string | **required** : particulier / societe | |
| `civilite` | string | M. / Mme / Mme/M. | si particulier |
| `nom` | string | **required** | Nom ou raison sociale |
| `prenom` | string | | si particulier |
| `adresse` | text | **required** | |
| `code_postal` | string | 5 chars | |
| `ville` | string | **required** | |
| `email` | string (email) | | |
| `telephone` | string | | |
| `lot_description` | string | **required** | "Lot 12 - Appt T3" |
| `siret` | string | | si societe |
| `notes` | text | | |
| `date_created` | timestamp | auto | |
| `date_updated` | timestamp | auto | |

---

### 2.4 `dossiers` — Collection centrale (HUB)

| Champ | Type | Options | Notes |
|-------|------|---------|-------|
| `id` | uuid | PK | |
| `reference` | string | unique, **required** | Auto: "LR-2024-001" |
| `statut` | string | **required** | Voir liste ci-dessous |
| `phase` | string | **required** | amiable / pre_contentieux / contentieux / execution |
| `titre` | string | **required** | |
| `description` | text | | |
| `syndic_id` | uuid | FK -> syndics, **required** | |
| `copropriete_id` | uuid | FK -> coproprietes, **required** | |
| `debiteur_id` | uuid | FK -> debiteurs, **required** | |
| `avocat_responsable_id` | uuid | FK -> directus_users | |
| `date_ouverture` | date | **required**, default: today | |
| `date_cloture` | date | | |
| `priorite` | string | basse / normale / haute / urgente | default: normale |
| `juridiction` | string | | "TJ Paris 18e" |
| `numero_rg` | string | | Numero de role |
| `prochaine_audience` | datetime | | |
| `montant_initial` | decimal | **required** | Creance initiale |
| `montant_actualise` | decimal | | Avec interets/frais |
| `montant_recouvre` | decimal | default: 0 | |
| `date_created` | timestamp | auto | |
| `date_updated` | timestamp | auto | |
| `user_created` | uuid | auto | |
| `user_updated` | uuid | auto | |

**Valeurs du champ `statut`** :

| Statut | Description |
|--------|-------------|
| `nouveau` | Dossier vient d'etre cree |
| `en_cours` | En traitement actif |
| `assignation` | Assignation en cours |
| `mise_en_demeure` | Mise en demeure envoyee |
| `injonction` | Requete en injonction de payer |
| `audience` | Audience programmee |
| `jugement` | Jugement rendu |
| `execution` | Phase d'execution |
| `paye` | Creance recouvree |
| `cloture` | Dossier clos |
| `irrecovrable` | Creance irrecovrable |

**Relations sortantes** : syndic (M2O), copropriete (M2O), debiteur (M2O), avocat (M2O)
**Relations entrantes** : creances, documents, evenements, taches, heures_facturables, messages, notes, factures (toutes O2M)

---

### 2.5 `creances`

| Champ | Type | Options | Notes |
|-------|------|---------|-------|
| `id` | uuid | PK | |
| `dossier_id` | uuid | FK -> dossiers, **required** | |
| `type` | string | **required** | charges_copropriete / travaux / fond_travaux / penalites / frais_recouvrement / interets / article_700 / depens |
| `libelle` | string | **required** | "Charges Q1-Q3 2024" |
| `montant` | decimal | **required** | |
| `periode_debut` | date | | |
| `periode_fin` | date | | |
| `date_exigibilite` | date | | |
| `statut` | string | du / partiellement_paye / paye / conteste | default: du |
| `montant_paye` | decimal | default: 0 | |
| `notes` | text | | |
| `date_created` | timestamp | auto | |

---

### 2.6 `documents`

| Champ | Type | Options | Notes |
|-------|------|---------|-------|
| `id` | uuid | PK | |
| `dossier_id` | uuid | FK -> dossiers, **required** | |
| `titre` | string | **required** | |
| `type` | string | **required** | releve_compte / appel_fonds / contrat_syndic / mise_en_demeure / assignation / jugement / proces_verbal / correspondance / autre |
| `fichier` | uuid | FK -> directus_files | Fichier uploade |
| `description` | text | | |
| `confidentiel` | boolean | default: false | Admin only si true |
| `uploaded_by` | uuid | FK -> directus_users, auto | |
| `date_document` | date | | Date du document |
| `date_created` | timestamp | auto | |

---

### 2.7 `evenements` — Timeline

| Champ | Type | Options | Notes |
|-------|------|---------|-------|
| `id` | uuid | PK | |
| `dossier_id` | uuid | FK -> dossiers, **required** | |
| `type` | string | **required** | creation / changement_statut / document_ajoute / mise_en_demeure / assignation / audience / jugement / paiement / note / communication / autre |
| `titre` | string | **required** | |
| `description` | text | | |
| `date_evenement` | datetime | **required** | |
| `auteur_id` | uuid | FK -> directus_users | |
| `metadata` | json | | Donnees extra (ancien statut, etc.) |
| `visible_client` | boolean | default: true | |
| `date_created` | timestamp | auto | |

---

### 2.8 `taches`

| Champ | Type | Options | Notes |
|-------|------|---------|-------|
| `id` | uuid | PK | |
| `dossier_id` | uuid | FK -> dossiers | Optionnel |
| `type` | string | **required** | tache / audience / echeance / relance / rdv |
| `titre` | string | **required** | |
| `description` | text | | |
| `statut` | string | a_faire / en_cours / terminee / annulee | default: a_faire |
| `priorite` | string | basse / normale / haute / urgente | default: normale |
| `assignee_id` | uuid | FK -> directus_users | |
| `date_echeance` | datetime | **required** | |
| `date_rappel` | datetime | | |
| `lieu` | string | | "TJ Paris" |
| `salle` | string | | "Salle 4.12" |
| `terminee_le` | datetime | | |
| `date_created` | timestamp | auto | |
| `date_updated` | timestamp | auto | |

---

### 2.9 `heures_facturables`

| Champ | Type | Options | Notes |
|-------|------|---------|-------|
| `id` | uuid | PK | |
| `dossier_id` | uuid | FK -> dossiers, **required** | |
| `avocat_id` | uuid | FK -> directus_users, **required** | |
| `date` | date | **required** | |
| `duree_minutes` | integer | **required** | En minutes |
| `description` | string | **required** | "Redaction assignation" |
| `categorie` | string | **required** | consultation / redaction / audience / correspondance / recherche / deplacement / autre |
| `taux_horaire` | decimal | | Si different du defaut |
| `facturable` | boolean | default: true | |
| `facture_id` | uuid | FK -> factures | null = pas encore facture |
| `date_created` | timestamp | auto | |

---

### 2.10 `factures`

| Champ | Type | Options | Notes |
|-------|------|---------|-------|
| `id` | uuid | PK | |
| `numero` | string | unique, **required** | "F-2024-0001" |
| `syndic_id` | uuid | FK -> syndics, **required** | |
| `dossier_id` | uuid | FK -> dossiers | Optionnel |
| `statut` | string | brouillon / emise / envoyee / payee / en_retard / annulee | default: brouillon |
| `date_emission` | date | | |
| `date_echeance` | date | | |
| `date_paiement` | date | | |
| `montant_ht` | decimal | **required** | |
| `taux_tva` | decimal | default: 20.00 | |
| `montant_tva` | decimal | | Calcule |
| `montant_ttc` | decimal | | Calcule |
| `mode_paiement` | string | virement / cheque / prelevement / carte | |
| `notes` | text | | |
| `fichier_pdf` | uuid | FK -> directus_files | PDF genere |
| `date_created` | timestamp | auto | |
| `date_updated` | timestamp | auto | |

---

### 2.11 `messages`

| Champ | Type | Options | Notes |
|-------|------|---------|-------|
| `id` | uuid | PK | |
| `dossier_id` | uuid | FK -> dossiers, **required** | |
| `expediteur_id` | uuid | FK -> directus_users, **required** | |
| `contenu` | text | **required** | |
| `lu` | boolean | default: false | |
| `date_lecture` | datetime | | |
| `piece_jointe` | uuid | FK -> directus_files | |
| `parent_id` | uuid | FK -> messages (self) | Pour threads |
| `date_created` | timestamp | auto | |

---

### 2.12 `notes`

| Champ | Type | Options | Notes |
|-------|------|---------|-------|
| `id` | uuid | PK | |
| `dossier_id` | uuid | FK -> dossiers, **required** | |
| `auteur_id` | uuid | FK -> directus_users, **required** | |
| `contenu` | text (WYSIWYG) | **required** | Contenu riche |
| `type` | string | interne / strategie / memo_audience / compte_rendu | default: interne |
| `epingle` | boolean | default: false | |
| `date_created` | timestamp | auto | |
| `date_updated` | timestamp | auto | |

---

### Diagramme de Relations

```
                    directus_users
                    /    |    \     \
                   /     |     \     \
             syndics  dossiers  taches  heures_facturables
               |      / | \  \
               |     /  |  \  \
        coproprietes |  |   |  evenements
                     |  |   |
                creances | documents
                         |
                     messages ──> messages (self: threads)
                         |
                       notes

        factures ──> heures_facturables
        factures ──> syndics
        factures ──> dossiers
```

---

## PHASE 3 : Configuration Directus

### 3.1 Roles et Permissions

#### Role : Administrateur (Admin Directus)
- Acces complet a toutes les collections
- Gestion utilisateurs, roles, parametres

#### Role : Avocat

| Collection | Create | Read | Update | Delete |
|-----------|--------|------|--------|--------|
| dossiers | Tous | Tous | Tous | Non |
| debiteurs | Tous | Tous | Tous | Non |
| creances | Tous | Tous | Tous | Tous |
| syndics | Non | Tous | Non | Non |
| coproprietes | Non | Tous | Non | Non |
| documents | Tous | Tous | Tous | Les siens |
| evenements | Tous | Tous | Les siens | Non |
| taches | Tous | Tous | Tous | Les siennes |
| heures_facturables | Tous | Les siennes | Les siennes | Les siennes |
| factures | Tous | Tous | Tous | Non |
| messages | Tous | Tous | Les siens | Non |
| notes | Tous | Tous | Les siennes | Les siennes |

#### Role : Syndic (Client)

| Collection | Create | Read | Update | Delete |
|-----------|--------|------|--------|--------|
| dossiers | Via wizard | Ses dossiers | Non | Non |
| debiteurs | Via wizard | Ses dossiers | Non | Non |
| creances | Non | Ses dossiers | Non | Non |
| syndics | Non | Son profil | Son profil | Non |
| coproprietes | Non | Les siennes | Non | Non |
| documents | Upload | Non-confidentiels | Non | Non |
| evenements | Non | visible_client=true | Non | Non |
| taches | Non | Audiences seulement | Non | Non |
| heures_facturables | Non | Non | Non | Non |
| factures | Non | Les siennes | Non | Non |
| messages | Envoi | Ses dossiers | Champ `lu` | Non |
| notes | Non | Non | Non | Non |

> Filtrage syndic : `syndics.user_id = $CURRENT_USER`

---

### 3.2 Extensions Directus

#### Hook : Auto-generation de reference (`auto-reference`)
- Declencheur : `filter` sur `dossiers.items.create`
- Action : Genere automatiquement `LR-YYYY-NNN` (annee courante + numero sequentiel)
- Fichier : `apps/directus/extensions/hooks/auto-reference/index.ts`

#### Hook : Timeline automatique (`auto-timeline`)
- Declencheur : `action` sur `dossiers.items.update`
- Condition : Le champ `statut` a change
- Action : Cree un evenement dans la collection `evenements` avec type `changement_statut`
- Fichier : `apps/directus/extensions/hooks/auto-timeline/index.ts`

#### Endpoint : Statistiques Dashboard (`dashboard-stats`)
- Route GET `/dashboard-stats/client/:syndicId` : Stats d'un syndic (dossiers actifs, montants)
- Route GET `/dashboard-stats/admin` : Stats globales (tous dossiers, taches urgentes)
- Fichier : `apps/directus/extensions/endpoints/dashboard-stats/index.ts`

---

### 3.3 Flows (Automatisations Directus)

| Flow | Declencheur | Action |
|------|------------|--------|
| **Notification nouveau message** | `items.create` sur `messages` | Email au destinataire (syndic ou avocat) |
| **Rappel echeance tache** | Cron quotidien 8h00 | Email aux assignees des taches dont `date_rappel = today` |
| **Alerte audience imminente** | Cron quotidien 8h00 | Email + evenement pour audiences dans les 48h |

---

## PHASE 4 : Frontend Next.js — Setup

### 4.1 Fichiers critiques

| Fichier | Role |
|---------|------|
| `src/lib/directus.ts` | Client SDK Directus (rest + authentication) |
| `src/lib/dal.ts` | Data Access Layer : `getCurrentUser()`, `getUserRole()` |
| `src/middleware.ts` | Protection routes, redirection login, guard par role |
| `src/app/layout.tsx` | Root layout : fonts (Inter + Playfair), Toaster |
| `src/styles/globals.css` | Tokens CSS du design system |
| `tailwind.config.ts` | Mapping tokens -> classes Tailwind |

### 4.2 Design System dans le code

> **IMPORTANT** : Les tokens CSS et la config Tailwind doivent etre copies depuis le frontend existant (`/Users/mkstudio/Desktop/PROJET KARUGENCY/IMMO NPL/frontend/`) et adaptes pour Next.js. Voir `DESIGN_SYSTEM.md` section 3 pour les variables completes.

**Fichiers source a porter** :
- `src/index.css` -> `src/styles/globals.css` (variables CSS, classes utilitaires, scrollbar, animations, .admin-theme)
- `tailwind.config.js` -> `tailwind.config.ts` (couleurs via hsl(var(--*)), ombres, sidebar, animations, keyframes)

**Cle** : Le `--primary` est `222 47% 11%` (navy) par defaut, surcharge en `239 84% 67%` (indigo) par la classe `.admin-theme` sur le portail admin.

### 4.3 Auth Flow

```
1. User -> /login (formulaire email/password)
2. POST /api/auth/login -> Directus /auth/login
3. Directus retourne access_token + refresh_token
4. API Route stocke le token dans un cookie HTTP-only
5. middleware.ts verifie le cookie sur chaque requete
6. dal.ts lit le cookie et fetch le user courant via Directus SDK
7. Redirection automatique : syndic -> /dashboard, admin/avocat -> /admin/dashboard
```

---

## PHASE 5 : Pages Frontend

### 5.1 Portail Client (Syndics)

| Page | Route | Contenu |
|------|-------|---------|
| **Dashboard** | `/(client)/dashboard` | 4 cartes stats + Dossiers Recents + Timeline recente |
| **Mes Dossiers** | `/(client)/dossiers` | Filtres + Liste DossierCard + Pagination + "Nouveau Dossier" |
| **Detail Dossier** | `/(client)/dossiers/[id]` | Header (ref, statut, debiteur) + Tabs : Apercu / Documents / Messages |
| **Nouveau Dossier** | `/(client)/dossiers/nouveau` | Wizard 4 etapes : Debiteur -> Creance -> Pieces -> Validation |
| **Documents** | `/(client)/documents` | Liste globale documents |
| **Messagerie** | `/(client)/messagerie` | Conversations par dossier + Thread |
| **Parametres** | `/(client)/parametres` | Profil syndic editable |

#### Cartes stats du Dashboard Client

| Carte | Icone | Couleur valeur |
|-------|-------|---------------|
| Dossiers Actifs | FolderOpen | Default |
| Montant a Recouvrer | TrendingDown | Rouge (#ef4444) |
| Montant Recouvre | TrendingUp | Vert (#10b981) |
| Dossiers Clotures | CheckCircle | Default |

#### Wizard Nouveau Dossier (4 etapes)

```
  (1)────────(2)────────(3)────────(4)
Debiteur   Creance    Pieces   Validation
```

- **Etape 1 - Debiteur** : Type (particulier/societe), Nom, Adresse, Email, Tel, Lot
- **Etape 2 - Creance** : Copropriete (select/creation), Montant, Periode, Relances
- **Etape 3 - Pieces** : Upload releve de compte, appels de fonds, contrat syndic
- **Etape 4 - Validation** : Recapitulatif read-only + Bouton "Soumettre"

Validation par etape avec schemas Zod + `react-hook-form`.

---

### 5.2 Portail Admin (Avocats)

| Page | Route | Contenu |
|------|-------|---------|
| **Dashboard** | `/(admin)/admin/dashboard` | 6 cartes stats + Dossiers recents + Taches urgentes (7j) + Activite |
| **Tous les Dossiers** | `/(admin)/admin/dossiers` | Filtres avances (statut, phase, syndic, avocat, date, montant) + Table triable |
| **Workspace Dossier** | `/(admin)/admin/dossiers/[id]` | Tabs : Apercu (editable) / Timeline / Heures / Notes / Documents / Messages |
| **Taches & Audiences** | `/(admin)/admin/taches` | Toggle liste/calendrier + Filtres + "Marquer terminee" |
| **Annuaire** | `/(admin)/admin/annuaire` | Tabs : Syndics / Debiteurs + Recherche + Dossiers associes |
| **Facturation** | `/(admin)/admin/facturation` | Stats + Tabs : Heures non facturees / Factures + Generation facture |

---

### 5.3 Layouts

#### Layout Client
- Sidebar 280px, fond `#0f172a` (navy)
- Navigation : Tableau de bord, Mes Dossiers, Documents, Messagerie (badge), Parametres
- CTA : "+ Nouveau Dossier"
- Profil utilisateur en bas
- Guard : redirige admin/avocat vers `/admin/dashboard`

#### Layout Admin
- Sidebar 280px, fond `#020617` (dark)
- Barre de recherche globale en haut
- Navigation : Dashboard, Tous les dossiers, Taches & Audiences, Annuaire, Facturation
- Guard : redirige syndic vers `/dashboard`

---

## Resume des Phases

| Phase | Description | Dependances |
|-------|-------------|-------------|
| **Phase 1** | Init monorepo + Next.js + ShadCN + Design tokens | Aucune |
| **Phase 2** | 12 collections Directus (schema complet) | Directus installe |
| **Phase 3** | Roles, permissions, extensions, flows | Phase 2 |
| **Phase 4** | Frontend setup (SDK, auth, middleware, layouts) | Phase 1 + Phase 2 |
| **Phase 5** | Toutes les pages (client + admin) | Phase 3 + Phase 4 |

---

## Points d'attention

1. **Auth tokens** : Utiliser des API Routes Next.js comme proxy pour Directus auth (cookies HTTP-only)
2. **Permissions syndic** : Filtrer par `syndics.user_id = $CURRENT_USER` — tester rigoureusement
3. **Reference unique** : Le hook auto-reference doit gerer la concurrence (2 dossiers simultanes)
4. **Upload wizard** : Stocker les fichiers temporairement cote client, uploader a l'etape 4
5. **Performance** : Utiliser l'endpoint custom stats plutot que des requetes relationnelles complexes
6. **Responsive** : Desktop (sidebar fixe) > Tablet (sidebar collapsible) > Mobile (sidebar drawer)
