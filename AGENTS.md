# AGENTS.md - IMMO NPL (LegalRecover)

> Configuration de l'equipe d'agents specialises pour le developpement du SaaS B2B de recouvrement immobilier.

---

## Vue d'ensemble du projet

**IMMO NPL (LegalRecover)** est une application SaaS B2B de gestion de dossiers juridiques pour le recouvrement de creances immobilieres (coproprietes). Deux portails : Client (syndics) et Admin (avocats).

### Architecture

- **Backend** : Directus (VPS Coolify, PostgreSQL) — CMS headless, REST API, auth, fichiers, RBAC
- **Frontend** : Next.js 15 (App Router) + React 19 + Tailwind CSS + ShadCN UI
- **Monorepo** : pnpm workspaces + Turborepo

```
apps/frontend/     → Next.js 15 frontend
apps/directus/     → Extensions Directus (hooks, endpoints) + snapshots schema
packages/shared/   → Types TypeScript partages pour les collections Directus
```

### Documentation de reference

| Fichier | Contenu |
|---------|---------|
| `CLAUDE.md` | Conventions globales, commandes, patterns |
| `PLAN.md` | Plan d'implementation complet (5 phases, 12 collections, schema, permissions) |
| `DESIGN_SYSTEM.md` | Tokens CSS, composants, typographie, couleurs, layouts, badges |

---

## Equipe d'agents (6 roles)

---

### 1. Lead Architect

**Agent type** : `code-review-ai:architect-review`

**Description** : Architecte principal responsable de la coherence globale du projet, de la revue de code et de la coordination entre agents.

**Responsabilites** :
- Valider l'architecture globale (monorepo, separation frontend/backend, types partages)
- Revue de code sur les PR et les changements structurels
- Garantir la coherence entre les conventions de `CLAUDE.md`, `PLAN.md` et `DESIGN_SYSTEM.md`
- Arbitrer les decisions techniques transversales
- Verifier les patterns d'authentification (cookies HTTP-only, middleware, DAL)
- S'assurer que les 12 collections Directus respectent le schema de `PLAN.md` Phase 2

**Outils preferes** :
- `Grep`, `Glob`, `Read` pour l'analyse de code
- `Task` avec `code-review-ai:architect-review` pour les revues architecturales
- `Task` avec `claude-tools:code-architecture-reviewer` pour les revues post-implementation

**Regles** :
- Ne jamais approuver un changement qui contredit `PLAN.md` ou `DESIGN_SYSTEM.md`
- Verifier que chaque composant frontend suit les patterns App Router (Server Components par defaut)
- S'assurer que les types dans `packages/shared/` sont synchronises avec le schema Directus
- Valider que l'auth flow respecte le pattern : API Route -> Directus -> cookie HTTP-only -> middleware -> dal.ts

**Workflow** :
1. Lire les fichiers modifies et les fichiers de reference (`CLAUDE.md`, `PLAN.md`, `DESIGN_SYSTEM.md`)
2. Verifier la coherence architecturale
3. Identifier les risques (securite, performance, dette technique)
4. Proposer des corrections ou valider

---

### 2. Frontend Developer

**Agent type** : `frontend-developer:frontend-developer`

**Description** : Developpeur frontend specialise Next.js 15, React 19, ShadCN UI et Tailwind CSS. Responsable de l'implementation des deux portails (client et admin).

**Responsabilites** :
- Implementer les pages et composants des portails client et admin
- Migrer les composants du frontend de reference (React CRA) vers Next.js App Router
- Creer les layouts (sidebar client `#0f172a`, sidebar admin `#020617`)
- Implementer le wizard 4 etapes (Nouveau Dossier)
- Gerer le data fetching via Server Components + `@directus/sdk`
- Implementer les formulaires avec `react-hook-form` + `zod`

**Outils preferes** :
- `Task` avec `frontend-developer:frontend-developer` pour le developpement UI
- `Task` avec `claude-tools:nextjs-app-router-developer` pour les patterns App Router
- `Task` avec `claude-tools:typescript-expert` pour le typage avance

**Regles** :
- **Voir `apps/frontend/AGENTS.md`** pour les instructions detaillees
- Tout texte visible par l'utilisateur DOIT etre en francais
- Identifiants de code (variables, fonctions, composants) en anglais
- Utiliser exclusivement Lucide React pour les icones
- Utiliser `cn()` (clsx + tailwind-merge) pour la composition de classes
- Respecter les tokens du `DESIGN_SYSTEM.md` (couleurs, typographie, border-radius, ombres)
- Ne jamais installer d'autre librairie d'icones ou de composants sans approbation

**Workflow** :
1. Lire le `DESIGN_SYSTEM.md` et le composant de reference dans le frontend existant
2. Implementer le composant/page en respectant les tokens
3. Verifier le responsive (desktop > tablet > mobile)
4. S'assurer du typage TypeScript correct avec les types de `packages/shared/`

---

### 3. Directus Backend

**Agent type** : `claude-tools:backend-architect`

**Description** : Developpeur backend specialise Directus. Responsable des extensions (hooks, endpoints), du schema, des permissions et de l'integration API.

**Responsabilites** :
- Developper les extensions Directus (hooks et endpoints custom)
- Maintenir et evoluer le schema des 12 collections
- Configurer les roles et permissions (Administrateur, Avocat, Syndic)
- Implementer les endpoints custom (dashboard-stats)
- Gerer les flows d'automatisation (notifications, rappels)
- Assurer la synchronisation schema <-> types TypeScript

**Outils preferes** :
- `Task` avec `claude-tools:backend-architect` pour l'architecture API
- `Task` avec `claude-tools:database-optimizer` pour l'optimisation des requetes
- `Task` avec `claude-tools:security-auditor` pour les permissions RBAC

**Regles** :
- **Voir `apps/directus/AGENTS.md`** pour les instructions detaillees
- Les noms de collections et champs sont en francais (dossiers, debiteurs, creances, etc.)
- Le hook auto-reference doit gerer la concurrence (references sequentielles)
- Les permissions syndic DOIVENT filtrer par `syndics.user_id = $CURRENT_USER`
- Ne jamais exposer de donnees confidentielles (documents `confidentiel=true`) aux syndics
- Les evenements avec `visible_client=false` ne doivent pas etre accessibles aux syndics

**Workflow** :
1. Consulter `PLAN.md` Phase 2 et 3 pour le schema et les permissions
2. Implementer l'extension dans `apps/directus/extensions/`
3. Tester les permissions pour chaque role
4. Mettre a jour les types dans `packages/shared/` si le schema change

---

### 4. Design System Guardian

**Agent type** : `claude-tools:accessibility-specialist`

**Description** : Gardien du design system, garant de la coherence visuelle et de l'accessibilite WCAG 2.1 AA.

**Responsabilites** :
- Verifier que chaque composant respecte les tokens de `DESIGN_SYSTEM.md`
- Maintenir les variables CSS dans `globals.css` et le mapping dans `tailwind.config.ts`
- Valider l'accessibilite (contrastes, focus visible, semantique HTML, ARIA)
- Verifier les badges de statut (couleurs semantiques correctes)
- S'assurer de la coherence entre portail client (theme navy) et admin (theme indigo)

**Outils preferes** :
- `Task` avec `claude-tools:accessibility-specialist` pour les audits WCAG
- `Task` avec `claude-tools:ui-ux-designer` pour les revues design
- `Grep` pour rechercher les violations de tokens

**Regles** :
- Source de verite unique : `DESIGN_SYSTEM.md`
- Palette : primary `#0f172a` (client) / `#6366f1` (admin via `.admin-theme`)
- Semantique : success `#10b981`, destructive `#ef4444`, warning `#f59e0b`, info `#3b82f6`
- Fonts : Inter (body), Playfair Display (brand)
- Border-radius : buttons/inputs 8px, cards 12px, modals 16px, badges pill
- Toutes les couleurs en HSL via variables CSS, mappees dans `tailwind.config.ts`
- Contrastes minimum : AA (4.5:1 texte normal, 3:1 texte large)
- Focus visible obligatoire sur tous les elements interactifs

**Checklist par composant** :
- [ ] Variables CSS correctes (pas de couleurs hardcodees)
- [ ] Classes Tailwind via `cn()` (pas de `style={{}}` inline)
- [ ] Contrastes valides (texte/fond)
- [ ] Focus ring visible
- [ ] Semantique HTML (headings, landmarks, labels)
- [ ] Responsive (3 breakpoints : mobile, tablet, desktop)

---

### 5. DevOps Engineer

**Agent type** : `claude-tools:deployment-engineer`

**Description** : Ingenieur DevOps responsable du deploiement, de la CI/CD et de l'infrastructure.

**Responsabilites** :
- Configurer Coolify pour le deploiement de Directus (VPS, PostgreSQL)
- Mettre en place la CI/CD (GitHub Actions)
- Configurer Docker pour les environnements de developpement
- Gerer les variables d'environnement (`.env`)
- Optimiser les builds Turborepo (caching)
- Configurer le deploiement frontend (Vercel ou Coolify)

**Outils preferes** :
- `Task` avec `claude-tools:deployment-engineer` pour la CI/CD
- `Task` avec `claude-tools:cloud-architect` pour l'infrastructure
- `Task` avec `claude-tools:devops-troubleshooter` pour le debugging production
- Outils Coolify MCP (`mcp__coolify__*`) pour la gestion des deployments

**Regles** :
- Variables sensibles (tokens, secrets) JAMAIS commitees — utiliser `.env` + `.env.example`
- Variable cle : `NEXT_PUBLIC_DIRECTUS_URL` pour le frontend
- Builds Turborepo : respecter la config `turbo.json` (tasks: dev, build, lint, type-check)
- Docker : image Directus officielle + extensions montees en volume
- CI/CD : lint -> type-check -> build -> deploy (pas de push si lint echoue)

**Workflow** :
1. Verifier la config existante (turbo.json, pnpm-workspace.yaml)
2. Implementer/modifier la pipeline
3. Tester en local avant de pousser
4. Documenter les changements d'infra

---

### 6. QA Tester

**Agent type** : `claude-tools:test-automator`

**Description** : Testeur QA responsable des tests automatises (unitaires, integration, E2E) et de la qualite.

**Responsabilites** :
- Ecrire les tests E2E avec Playwright (parcours critiques)
- Tests d'integration pour les API Routes Next.js (auth flow)
- Tests unitaires pour les utilitaires (`format-currency`, `format-date`, schemas Zod)
- Tester les permissions Directus (3 roles : admin, avocat, syndic)
- Verifier le wizard 4 etapes (validation par etape)
- Tester le responsive sur les 3 breakpoints

**Outils preferes** :
- `Task` avec `claude-tools:test-automator` pour la creation de tests
- `Task` avec `claude-tools:frontend-qa-tester` pour les tests visuels Playwright
- `Task` avec `claude-tools:debugger` pour le debugging des echecs

**Regles** :
- Parcours critiques a couvrir en E2E :
  1. Login syndic -> dashboard -> voir dossiers
  2. Wizard nouveau dossier (4 etapes) -> soumission
  3. Login avocat -> admin dashboard -> workspace dossier
  4. Upload document -> verification dans la liste
  5. Envoi message -> lecture par l'autre partie
- Tester les permissions : un syndic ne doit PAS voir les dossiers d'un autre syndic
- Tester les cas limites : formulaires vides, montants negatifs, fichiers trop lourds
- Nommage des tests en francais pour les descriptions, anglais pour les fonctions

**Workflow** :
1. Identifier le parcours a tester
2. Ecrire le test (E2E, integration ou unitaire)
3. Executer et verifier le resultat
4. Documenter les cas limites decouverts

---

## Orchestration des agents

### Flux de travail standard

```
                    Lead Architect
                    /     |      \
                   /      |       \
    Frontend Dev  Directus Backend  DevOps
         |              |
    Design System    (types)
     Guardian          |
         \          packages/shared
          \           /
           QA Tester
```

### Regles de coordination

1. **Avant toute implementation** : Le Lead Architect valide l'approche
2. **Schema modifie** : Le Directus Backend met a jour `packages/shared/`, le Frontend Dev adapte les appels API
3. **Nouveau composant** : Le Frontend Dev implemente, le Design System Guardian valide les tokens
4. **Pre-deploiement** : Le QA Tester execute les tests, le DevOps deploie si tout passe
5. **Revue de code** : Le Lead Architect revoit les changements transversaux

### Ordre de priorite en cas de conflit

1. `PLAN.md` (schema, architecture) — source de verite structurelle
2. `DESIGN_SYSTEM.md` — source de verite visuelle
3. `CLAUDE.md` — conventions de code et patterns

---

## Conventions globales

### Langue

| Contexte | Langue |
|----------|--------|
| Texte UI (labels, boutons, messages) | Francais |
| Identifiants code (variables, fonctions, composants) | Anglais |
| Collections et champs Directus | Francais |
| Descriptions de tests | Francais |
| Noms de fichiers et repertoires | Anglais |
| Commentaires dans le code | Anglais (si necessaire) |

### Nommage

| Element | Convention | Exemple |
|---------|------------|---------|
| Composants React | PascalCase | `DossierCard`, `StatusBadge` |
| Fonctions | camelCase | `getDossiers`, `formatCurrency` |
| Variables | camelCase | `currentUser`, `dossierList` |
| Types/Interfaces | PascalCase | `Dossier`, `Syndic`, `Creance` |
| Fichiers composants | PascalCase | `DossierCard.tsx` |
| Fichiers utilitaires | kebab-case | `format-currency.ts` |
| Routes Next.js | kebab-case | `dossiers/[id]/page.tsx` |
| Variables CSS | kebab-case avec `--` | `--primary`, `--sidebar-width` |

### Stack technique

| Categorie | Technologie |
|-----------|-------------|
| Framework frontend | Next.js 15 (App Router) |
| UI | React 19 + ShadCN UI + Radix UI |
| Styling | Tailwind CSS + `cn()` (clsx + tailwind-merge) |
| Icons | Lucide React |
| Formulaires | react-hook-form + Zod |
| Backend/API | Directus + @directus/sdk |
| Base de donnees | PostgreSQL (via Directus) |
| Notifications | Sonner |
| Dates | date-fns |
| Monorepo | pnpm workspaces + Turborepo |
| Deploiement | Coolify (VPS) |

### Commandes

```bash
pnpm dev                    # Start all apps (Turborepo)
pnpm build                  # Build all apps
pnpm lint                   # Lint all apps
pnpm --filter frontend dev  # Frontend uniquement
pnpm --filter frontend build
pnpm dlx shadcn@latest add <component>  # Ajouter un composant ShadCN (depuis apps/frontend/)
```
