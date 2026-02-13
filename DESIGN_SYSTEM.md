# Design System - IMMO NPL (LegalRecover)

> Guide complet du design UX/UI de l'application de gestion juridique pour le recouvrement de creances immobilieres.
> Source de verite : ce fichier + frontend de reference (`/Users/mkstudio/Desktop/PROJET KARUGENCY/IMMO NPL/frontend/`).

---

## 1. Contexte & Vision

### Description
**IMMO NPL (LegalRecover)** est une application web SaaS B2B de gestion de dossiers juridiques specialisee dans le recouvrement de creances immobilieres (coproprietes). L'interface adopte une approche moderne, epuree et professionnelle.

### Marque
- **Nom principal** : "LegalRecover" (affiche dans la sidebar)
- **Sous-titre** : "Portail Client" (portail syndic) / "Administration" (portail admin)
- **Icone logo** : `Scale` (Lucide React) — balance de justice
- **Logo client** : Icone dans un carre arrondi `bg-slate-800`, texte blanc
- **Logo admin** : Icone dans un carre arrondi `bg-indigo-600`, texte blanc

### Utilisateurs cibles
| Profil | Acces | Fonctionnalites |
|--------|-------|-----------------|
| **Administrateurs / Avocats** | Portail Admin | Gestion complete des dossiers, documents, facturation, heures facturables |
| **Clients / Syndics** | Portail Client | Suivi transparent des dossiers, communication, documents |

### Pages principales

| Portail Client | Portail Admin |
|----------------|---------------|
| Dashboard (stats, dossiers recents) | Dashboard admin |
| Liste des dossiers | Tous les dossiers |
| Detail dossier (tabs: Suivi, Documents, Messagerie, Financier) | Workspace dossier (timeline, heures facturables, notes) |
| Documents | Taches & Audiences |
| Messagerie | Annuaire (debiteurs, syndics) |
| Parametres | Facturation globale |

---

## 2. Stack technique UI

| Categorie | Technologies |
|-----------|-------------|
| Framework | Next.js 15 (App Router) + React 19 |
| Styling | Tailwind CSS 3.4 + tailwindcss-animate |
| Composants | ShadCN UI + Radix UI (50+ composants) |
| Icones | Lucide React |
| Formulaires | React Hook Form + Zod |
| Notifications | Sonner (position: top-right, richColors) |
| Dates | date-fns |
| HTTP | @directus/sdk |
| Typographie | Inter (sans), Playfair Display (display) |
| Utilitaires | clsx + tailwind-merge via `cn()` |

---

## 3. Palette de couleurs

### Variables CSS (HSL dans `:root`)

```css
@layer base {
  :root {
    /* Fond & surfaces */
    --background: 210 40% 98%;        /* #f8fafc */
    --foreground: 222 47% 11%;        /* #0f172a */
    --card: 0 0% 100%;                /* #ffffff */
    --card-foreground: 222 47% 11%;

    /* Primary — Navy Blue (Client Portal) */
    --primary: 222 47% 11%;           /* #0f172a */
    --primary-foreground: 0 0% 100%;

    /* Secondary */
    --secondary: 210 40% 96%;
    --secondary-foreground: 222 47% 11%;

    /* Muted */
    --muted: 210 40% 96%;
    --muted-foreground: 215 16% 47%;  /* #64748b */

    /* Accent */
    --accent: 210 40% 96%;
    --accent-foreground: 222 47% 11%;

    /* Semantique */
    --destructive: 0 72% 51%;         /* #ef4444 — dette/alerte */
    --destructive-foreground: 0 0% 100%;
    --success: 160 84% 39%;           /* #10b981 — paye/succes */
    --success-foreground: 0 0% 100%;
    --warning: 38 92% 50%;            /* #f59e0b — en attente */
    --warning-foreground: 0 0% 100%;
    --info: 217 91% 60%;              /* #3b82f6 — info */
    --info-foreground: 0 0% 100%;

    /* Indigo — Admin accent */
    --indigo: 239 84% 67%;            /* #6366f1 */
    --indigo-foreground: 0 0% 100%;

    /* Borders & inputs */
    --border: 214 32% 91%;            /* #e2e8f0 */
    --input: 214 32% 91%;
    --ring: 222 47% 11%;

    /* Popover */
    --popover: 0 0% 100%;
    --popover-foreground: 222 47% 11%;

    /* Charts */
    --chart-1: 12 76% 61%;
    --chart-2: 173 58% 39%;
    --chart-3: 197 37% 24%;
    --chart-4: 43 74% 66%;
    --chart-5: 27 87% 67%;

    /* Radius */
    --radius: 0.5rem;                 /* 8px */

    /* Shadows */
    --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
    --shadow-card: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
    --shadow-elevated: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);

    /* Sidebar */
    --sidebar-width: 280px;
    --sidebar-width-collapsed: 72px;

    /* Admin sidebar (plus sombre) */
    --admin-sidebar: 222 47% 5%;      /* ~#020617 / slate-950 */
    --admin-sidebar-foreground: 210 40% 98%;
  }
}

/* Theme admin : surcharge --primary en indigo */
.admin-theme {
  --primary: 239 84% 67%;
  --ring: 239 84% 67%;
}
```

### Couleurs principales (resume)

| Element | Couleur | HEX | Classe Tailwind |
|---------|---------|-----|-----------------|
| Sidebar client | Navy | `#0f172a` | `bg-slate-900` |
| Sidebar admin | Dark | `#020617` | `bg-slate-950` |
| Fond principal | Gris tres clair | `#f8fafc` | `bg-background` |
| Cartes | Blanc | `#ffffff` | `bg-card` |
| Texte principal | Gris fonce | `#0f172a` | `text-foreground` |
| Texte secondaire | Gris moyen | `#64748b` | `text-muted-foreground` |
| Accent admin | Indigo | `#6366f1` | `bg-indigo-600` / `text-indigo-400` |
| Succes / Paye | Emeraude | `#10b981` | `text-emerald-600` / `bg-emerald-100` |
| Alerte / Dette | Rouge | `#ef4444` | `text-red-600` / `bg-red-100` |
| Attention | Ambre | `#f59e0b` | `text-amber-700` / `bg-amber-100` |
| Info | Bleu | `#3b82f6` | `text-blue-600` / `bg-blue-100` |

### Dark mode

Variables definies dans `.dark` selector. Non active par defaut (pas de toggle dans l'UI pour l'instant).

---

## 4. Badges de statut

### Dossiers (StatusBadge)

Composant : `rounded-full px-2.5 py-0.5 text-xs font-medium border`

| Statut | Classe CSS | Fond | Texte | Bordure |
|--------|-----------|------|-------|---------|
| En cours | `status-active` | `bg-blue-100` | `text-blue-700` | `border-blue-200` |
| Cloture | `status-paid` | `bg-emerald-100` | `text-emerald-700` | `border-emerald-200` |
| Mise en demeure | `status-pending` | `bg-amber-100` | `text-amber-700` | `border-amber-200` |
| Assignation | `status-debt` | `bg-red-100` | `text-red-700` | `border-red-200` |
| Injonction | `status-pending` | `bg-amber-100` | `text-amber-700` | `border-amber-200` |
| Saisie | `status-debt` | `bg-red-100` | `text-red-700` | `border-red-200` |

### Documents (DocumentTypeBadge)

| Categorie | Fond | Texte | Bordure |
|-----------|------|-------|---------|
| Preuve | `bg-blue-100` | `text-blue-700` | `border-blue-200` |
| Procedure | `bg-purple-100` | `text-purple-700` | `border-purple-200` |
| Correspondance | `bg-slate-100` | `text-slate-700` | `border-slate-200` |

### Financier (FinancialStatusBadge)

| Statut | Fond | Texte | Bordure |
|--------|------|-------|---------|
| Paye | `bg-emerald-100` | `text-emerald-700` | `border-emerald-200` |
| En attente | `bg-amber-100` | `text-amber-700` | `border-amber-200` |
| Facture | `bg-blue-100` | `text-blue-700` | `border-blue-200` |

### Montant dette (DebtBadge)

`rounded-full px-2.5 py-0.5 text-xs font-semibold bg-red-100 text-red-700 border border-red-200`

---

## 5. Typographie

### Police principale : Inter

Importee via Google Fonts : `wght@300;400;500;600;700`

| Element | Taille | Poids | Classe Tailwind |
|---------|--------|-------|-----------------|
| Titre page | 24px | 600 (semibold) | `text-2xl font-semibold tracking-tight` |
| Sous-titre page | 14px | 400 (regular) | `text-muted-foreground mt-1` |
| Titre carte | 14px | 500 (medium) | `text-sm font-medium text-muted-foreground` |
| Valeur statistique | 30px | 700 (bold) | `text-3xl font-bold` |
| Titre section (Card) | 18px | 600 | `text-lg` (via CardTitle) |
| Corps texte | 14px | 400 (regular) | `text-sm` |
| Labels formulaire | 14px | 500 (medium) | via `<Label>` ShadCN |
| Badge texte | 12px | 500 (medium) | `text-xs font-medium` |
| Caption / Reference | 12px | 400 (regular) | `text-xs text-muted-foreground` |
| Stat sous-texte | 12px | 400 | `text-xs text-muted-foreground mt-3` |

### Police display : Playfair Display

Importee via Google Fonts : `wght@500;600;700`. Classe : `font-display`.
Reservee pour les titres de marque et elements premium (non utilisee dans le portail courant).

---

## 6. Spacing System

Base unit : **4px** (Tailwind default)

| Token | Valeur | Usage | Classe |
|-------|--------|-------|--------|
| `xs` | 4px | Espacement minimal | `gap-1`, `p-1` |
| `sm` | 8px | Entre elements proches | `gap-2`, `p-2` |
| `md` | 16px | Padding interne standard | `gap-4`, `p-4` |
| `lg` | 24px | Padding cartes, gap grilles | `gap-6`, `p-6` |
| `xl` | 32px | Padding modal, sections | `gap-8`, `p-8` |
| `2xl` | 48px | Marges entre sections | `gap-12` |

---

## 7. Border Radius

| Element | Valeur | Variable / Classe |
|---------|--------|-------------------|
| Base | 8px | `--radius: 0.5rem` -> `rounded-lg` |
| Moyen | 6px | `calc(--radius - 2px)` -> `rounded-md` |
| Petit | 4px | `calc(--radius - 4px)` -> `rounded-sm` |
| Badges | 9999px | `rounded-full` (pill) |
| Avatar | 50% | `rounded-full` (cercle) |
| Icones cartes stats | 9999px | `rounded-full` |
| Wizard stepper dots | 9999px | `rounded-full` |

---

## 8. Ombres

| Element | Valeur | Classe Tailwind |
|---------|--------|-----------------|
| Subtile | `0 1px 2px 0 rgb(0 0 0 / 0.05)` | `--shadow-sm` |
| Cartes | `0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)` | `shadow-card` |
| Elevee (hover) | `0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)` | `shadow-elevated` / `hover:shadow-lg` |

---

## 9. Icones

**Bibliotheque** : Lucide React

| Contexte | Taille | Classe |
|----------|--------|--------|
| Navigation sidebar | 20px | `h-5 w-5` |
| Cartes statistiques | 24px | `h-6 w-6` |
| Boutons inline | 16px | `h-4 w-4` |
| Icones fichiers/documents | 32px | `h-8 w-8` |
| Icones vides (empty state) | 48px | `h-12 w-12` |
| Wizard stepper | 20px | `h-5 w-5` |

### Icones par contexte

| Usage | Icone Lucide |
|-------|-------------|
| Logo | `Scale` |
| Dashboard | `LayoutDashboard` |
| Dossiers | `FolderOpen` (client) / `FolderKanban` (admin) |
| Documents | `FileText` |
| Messagerie | `MessageSquare` |
| Parametres | `Settings` |
| Taches | `CalendarCheck` |
| Annuaire | `Users` |
| Facturation | `Receipt` |
| Nouveau dossier | `Plus` |
| Notifications | `Bell` |
| Recherche | `Search` |
| Montant a recouvrer | `AlertCircle` |
| Montant recouvre | `TrendingUp` |
| Dossiers clotures | `CheckCircle2` |
| Upload | `Upload` |
| Telecharger | `Download` |
| Voir | `Eye` |
| Envoyer | `Send` |
| Piece jointe | `Paperclip` |
| Horloge | `Clock` |
| Fleche droite | `ArrowRight` |
| Fleche gauche | `ArrowLeft` |
| Fermer | `X` |

---

## 10. Layout principal

### Structure generale

```
┌─────────────────────────────────────────────────────────┐
│ ┌─────────┐ ┌─────────────────────────────────────────┐ │
│ │         │ │  Header: sticky, h-16, border-b          │ │
│ │ SIDEBAR │ ├─────────────────────────────────────────┤ │
│ │  280px  │ │                                         │ │
│ │  fixed  │ │  CONTENU PRINCIPAL (p-6)                │ │
│ │ h-screen│ │  - Cartes statistiques                  │ │
│ │         │ │  - Listes                               │ │
│ │         │ │  - Widgets                              │ │
│ │         │ │                                         │ │
│ └─────────┘ └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

Conteneur : `flex min-h-screen bg-background`
Main : `flex-1 ml-[280px]`
Header : `sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-card px-6`
Contenu : `p-6`

### Sidebar Client (280px, `bg-slate-900`)

| Section | Implementation |
|---------|---------------|
| **Logo** | `px-6 py-5 border-b border-slate-700` — Icone Scale dans `h-10 w-10 rounded-lg bg-slate-800` + "LegalRecover" `text-lg font-semibold` + "Portail Client" `text-xs text-slate-400` |
| **CTA** | `px-4 py-4` — Bouton `w-full bg-slate-100 text-slate-900 hover:bg-slate-200` + icone Plus |
| **Navigation** | `px-3 py-2 space-y-1` — Items : `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium` |
| **Nav active** | `bg-slate-800 text-slate-100` |
| **Nav inactive** | `text-slate-400 hover:bg-slate-800/50 hover:text-slate-100` |
| **Badge notif** | `bg-red-500 text-slate-100 px-2 py-0.5 text-xs` (sur Messagerie) |
| **Profil** | `border-t border-slate-700 p-4` — Avatar `h-9 w-9 bg-slate-700` + Nom `text-sm font-medium text-slate-100` + Societe `text-xs text-slate-400` |

### Sidebar Admin (280px, `bg-slate-950`)

| Section | Implementation |
|---------|---------------|
| **Logo** | Icone Scale dans `h-10 w-10 rounded-lg bg-indigo-600` + "LegalRecover" + "Administration" `text-xs text-indigo-400 font-medium` |
| **Recherche** | `px-4 py-4` — Input `pl-9 bg-slate-900 border-slate-800 text-slate-100 placeholder:text-slate-500 focus:border-indigo-500` avec icone Search |
| **Nav active** | `bg-indigo-600/20 text-indigo-400 border border-indigo-600/30` |
| **Nav inactive** | `text-slate-400 hover:bg-slate-900 hover:text-slate-100` |
| **Bloc stats** | `mx-4 mb-4 rounded-lg bg-slate-900 p-4 border border-slate-800` — Grid 2 cols (Dossiers actifs + Taux recouvrement en `text-emerald-400`) |
| **Profil** | Avatar `h-9 w-9 bg-indigo-600` + Nom + Societe |
| **Notif header** | Badge `bg-indigo-600` au lieu de `bg-red-500` |

---

## 11. Composants cles

### Cartes statistiques (Dashboard)

**Layout** : `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4`

**Structure d'une carte** :
```jsx
<Card>
  <CardContent className="p-6">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <p className="text-3xl font-bold text-foreground mt-1">{value}</p>
      </div>
      <div className="h-12 w-12 rounded-full bg-{color}-100 flex items-center justify-center">
        <Icon className="h-6 w-6 text-{color}-600" />
      </div>
    </div>
    <p className="text-xs text-muted-foreground mt-3">{subtitle}</p>
  </CardContent>
</Card>
```

**4 cartes du Dashboard Client** :

| Carte | Icone | Couleur icone | Couleur valeur |
|-------|-------|---------------|----------------|
| Dossiers Actifs | `FolderOpen` | `bg-blue-100` / `text-blue-600` | `text-foreground` |
| Montant a Recouvrer | `AlertCircle` | `bg-red-100` / `text-red-600` | `text-red-600` |
| Montant Recouvre | `TrendingUp` | `bg-emerald-100` / `text-emerald-600` | `text-emerald-600` |
| Dossiers Clotures | `CheckCircle2` | `bg-slate-100` / `text-slate-600` | `text-foreground` |

---

### Liste des dossiers (Dossiers Recents)

**Structure d'un item** :
```jsx
<Link className="flex items-center justify-between p-4 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors">
  <div className="flex items-center gap-4">
    <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center">
      <Scale className="h-5 w-5 text-slate-600" />
    </div>
    <div>
      <p className="text-sm font-medium text-foreground">{coproprieteName}</p>
      <p className="text-xs text-muted-foreground">{reference} • {debtorName}</p>
    </div>
  </div>
  <div className="flex items-center gap-4">
    <StatusBadge status={status} />
    <p className="text-sm font-semibold text-foreground">{amount}</p>
    <ArrowRight className="h-4 w-4 text-muted-foreground" />
  </div>
</Link>
```

---

### Timeline (Evenements)

**Composant vertical** avec 3 etats :

| Etat | Point (dot) | Ligne | Icone |
|------|------------|-------|-------|
| Complete | `bg-emerald-500 border-emerald-100` | `bg-emerald-200` | `Check` h-3 w-3 blanc |
| Actuel | `bg-blue-500 border-blue-100 ring-4 ring-blue-100` | `bg-slate-200` | `Clock` h-3 w-3 blanc |
| A venir | `bg-slate-200 border-slate-100` | `bg-slate-200` | `Circle` h-2 w-2 slate-400 |

**Structure** : `relative flex gap-4 pb-8 last:pb-0`
- Dot : `h-8 w-8 rounded-full border-4 border-background flex items-center justify-center`
- Ligne verticale : `absolute left-[15px] top-8 h-[calc(100%-32px)] w-0.5`
- Contenu : titre `text-sm font-medium` + date `text-xs text-muted-foreground` + description + acteur

**Compact Timeline** (horizontal) : cercles `h-6 w-6` relies par barres `h-0.5 w-8`

---

### Evenements a Venir (Dashboard sidebar)

**Structure simplifiee** :
```jsx
<div className="flex items-start gap-3">
  <div className="h-2 w-2 rounded-full mt-2 shrink-0 {bg-blue-500 | bg-slate-300}" />
  <div>
    <p className="text-sm font-medium text-foreground">{title}</p>
    <p className="text-xs text-muted-foreground mt-0.5">{caseRef} • {date}</p>
  </div>
</div>
```

---

### Modal Wizard (Nouveau Dossier)

**Container** :
- Dialog ShadCN : `sm:max-w-[600px] p-0 gap-0`
- Header : `p-6 pb-4 border-b` — Titre "Nouveau Dossier" + description
- Stepper : `px-6 py-4 border-b bg-muted/30`
- Contenu : `p-6 min-h-[320px]`
- Footer : `flex items-center justify-between p-6 border-t bg-muted/30`

**Stepper horizontal (4 etapes)** :

| Etape | Icone | Label |
|-------|-------|-------|
| 1 | `User` | Debiteur |
| 2 | `Euro` | Creance |
| 3 | `FileUp` | Pieces |
| 4 | `CheckCircle` | Validation |

**Etats du stepper** :
| Etat | Style du cercle |
|------|----------------|
| Complete | `bg-emerald-500 border-emerald-500 text-slate-100` + icone CheckCircle |
| Actif | `bg-slate-900 border-slate-900 text-slate-100` + icone de l'etape |
| Futur | `bg-background border-border text-muted-foreground` + icone de l'etape |

Ligne de connexion : `flex-1 h-0.5 mx-2` — `bg-emerald-500` si complete, `bg-border` sinon
Barre de progression : `<Progress value={(step/4)*100} className="h-1" />`

**Etapes** :

1. **Debiteur** (icone User)
   - Type de debiteur (Select : Particulier / Societe)
   - Nom complet / Raison sociale * (Input, placeholder: "Ex: Jean DUPONT ou SCI EXEMPLE")
   - Adresse complete * (Textarea, min-h-[80px])
   - Email + Telephone (grid 2 cols)
   - Lot / Description du bien * (Input, placeholder: "Ex: Lot 12 - Appartement T3")

2. **Creance** (icone Euro)
   - Nom de la copropriete * (Input, placeholder: "Ex: Residence Les Lilas")
   - Montant de la creance (€) * (Input type number)
   - Periode concernee * (Input, placeholder: "Ex: T1 2023 - T4 2023")
   - Relances precedentes effectuees ? (Select : Non / Informelle / Lettre recommandee)

3. **Pieces** (icone FileUp)
   - Description : "Deposez les pieces justificatives necessaires..."
   - Releve de compte copropriete * — Zone upload
   - Appels de fonds * — Zone upload
   - Contrat Syndic — Zone upload (optionnel)

4. **Validation** (icone CheckCircle)
   - Recapitulatif dans une Card : Copropriete, Debiteur, Type, Lot, Montant (rouge, gras), Periode, Documents joints
   - Avertissement : `bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800`

**Boutons** :
| Action | Style |
|--------|-------|
| Annuler / Precedent | `variant="ghost"` + ArrowLeft |
| Suivant | `variant="default"` (bg-primary) + ArrowRight |
| Soumettre | `variant="default"` + CheckCircle + "Soumettre le dossier" |

---

### Zone Upload

**Etat vide** :
```jsx
<label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-border rounded-lg cursor-pointer bg-muted/30 hover:bg-muted/50 transition-colors">
  <Upload className="h-6 w-6 text-muted-foreground mb-1" />
  <p className="text-sm text-muted-foreground">Cliquez ou deposez un fichier</p>
  <input type="file" className="hidden" accept=".pdf,.doc,.docx" />
</label>
```

**Etat fichier depose** :
```jsx
<Card className="bg-muted/30">
  <CardContent className="p-3 flex items-center justify-between">
    <div className="flex items-center gap-3">
      <FileText className="h-8 w-8 text-red-500" />
      <div>
        <p className="text-sm font-medium text-foreground">{filename}</p>
        <p className="text-xs text-muted-foreground">{size} KB</p>
      </div>
    </div>
    <Button variant="ghost" size="icon"><X /></Button>
  </CardContent>
</Card>
```

---

### Documents (DocumentsList)

**Structure d'un item** :
```jsx
<Card className="hover:shadow-md transition-shadow">
  <CardContent className="p-4">
    <div className="flex items-center gap-4">
      <FileText className="h-8 w-8 text-red-500" />  {/* PDF = red-500, autre = slate-400 */}
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-medium text-foreground truncate">{name}</h4>
        <div className="flex items-center gap-3 mt-1">
          <span className="text-xs text-muted-foreground">{date}</span>
          <span className="text-xs text-muted-foreground">{size}</span>
          <span className="text-xs text-muted-foreground">Par: {uploader}</span>
        </div>
      </div>
      <DocumentTypeBadge category={category} />
      <Button variant="ghost" size="icon"><Eye /></Button>
      <Button variant="ghost" size="icon"><Download /></Button>
    </div>
  </CardContent>
</Card>
```

**Etat vide** : Icone `FileText h-12 w-12 text-muted-foreground` + "Aucun document"

---

### Messagerie (MessageThread)

**Conteneur** : `Card flex flex-col h-[500px]`
- Header : `CardTitle text-base` "Conversation" + `border-b`
- Zone messages : `ScrollArea flex-1 p-4` avec `space-y-4`
- Zone saisie : `border-t pt-4` — Textarea `min-h-[80px] resize-none` + boutons

**Bulle message** :
- Layout : `flex gap-3` (inverse avec `flex-row-reverse` si message propre)
- Avatar : `h-8 w-8` — Avocat: `bg-slate-900 text-slate-100` / Client: `bg-blue-100 text-blue-700`
- Bulle propre : `bg-slate-900 text-slate-100 rounded-lg rounded-tr-none px-4 py-2.5`
- Bulle autre : `bg-muted text-foreground rounded-lg rounded-tl-none px-4 py-2.5`
- Meta : `text-sm font-medium` (nom) + `text-xs text-muted-foreground` (date)

**Raccourci** : Enter pour envoyer, Shift+Enter pour saut de ligne

---

### Formulaires

**Style des inputs** (via ShadCN) :
- Border : `border-border` (`#e2e8f0`)
- Border-radius : `--radius` (8px)
- Placeholder : `text-muted-foreground` (`#64748b`)
- Focus : ring primary
- Espacement label/input : `mt-1.5`

**Labels** : Au-dessus du champ, champs obligatoires marques avec `*` rouge

**Inputs admin (sidebar search)** :
- `bg-slate-900 border-slate-800 text-slate-100`
- `placeholder:text-slate-500`
- `focus:border-indigo-500 focus:ring-indigo-500/20`

---

## 12. Animations

### Keyframes

```css
--animation-accordion-down: 0.2s ease-out;
--animation-accordion-up: 0.2s ease-out;
--animation-slide-in-left: 0.3s ease-out (translateX -10px -> 0);
--animation-fade-in: 0.2s ease-out (opacity 0 -> 1);
--animation-scale-in: 0.2s ease-out (scale 0.95 -> 1, opacity 0 -> 1);
--animation-pulse-soft: 2s ease-in-out infinite (opacity 1 -> 0.7 -> 1);
```

### Classes utilitaires

| Classe | Usage |
|--------|-------|
| `animate-fade-in` | Apparition de page (Dashboard, listes) |
| `animate-slide-in` | Elements entrant par la gauche |
| `transition-colors` | Hover sur nav items, boutons |
| `transition-shadow` | Hover sur cards (documents) |
| `hover:shadow-md` / `hover:shadow-lg` | Elevation au hover |
| `hover:bg-muted/50` | Hover sur lignes de tableau / items de liste |

---

## 13. Responsive

| Breakpoint | Comportement |
|------------|--------------|
| Desktop (>1024px) | Layout complet avec sidebar fixe 280px |
| Tablet (768-1024px) | Sidebar collapsible (72px), grilles 2 colonnes |
| Mobile (<768px) | Sidebar en drawer, cartes empilees 1 colonne |

Grilles : `grid-cols-1 md:grid-cols-2 lg:grid-cols-4` (stats)
Dashboard : `grid-cols-1 lg:grid-cols-3` (recents 2/3 + evenements 1/3)

---

## 14. Scrollbar

```css
::-webkit-scrollbar { width: 8px; height: 8px; }
::-webkit-scrollbar-track { bg-muted rounded-full; }
::-webkit-scrollbar-thumb { bg-slate-300 rounded-full; }
::-webkit-scrollbar-thumb:hover { bg-slate-400; }
```

---

## 15. Formatage des donnees

| Type | Format | Locale |
|------|--------|--------|
| Devise | `62 499,00 €` | `fr-FR`, style: currency, currency: EUR |
| Date | `14/12/2023` | `fr-FR`, format court |
| Date-heure | `14/12/2023 14:30` | `fr-FR` |
| Taille fichier | `1.2 KB` / `3.4 MB` | Division par 1024 |

---

## 16. Principes UX

### A respecter

1. **Minimalisme moderne** : Interface epuree, sans surcharge
2. **Hierarchie visuelle** : Titres > Valeurs > Descriptions
3. **Feedback immediat** : Badges colores, icones contextuelles, toast Sonner
4. **Progressive disclosure** : Wizard multi-etapes, onglets
5. **Espacement genereux** : Respiration entre elements (p-6, gap-4)
6. **Consistance** : Memes patterns partout (StatusBadge, Card, cn())
7. **Accessibilite** : Contrastes suffisants, focus visible (`focus-ring`), semantique HTML
8. **Affordance** : Zones cliquables evidentes, hover states
9. **Ton formel** : Langage objectif, contexte juridique

### A eviter

- Surcharger visuellement les interfaces
- Couleurs non semantiques pour les statuts
- Animations superflues
- Negliger l'accessibilite
- Texte trop petit ou contraste insuffisant
- Placer des donnees sensibles dans des tooltips ou elements faciles a manquer

---

## 17. Composants ShadCN utilises

| Categorie | Composants |
|-----------|------------|
| **Inputs** | Input, Textarea, Checkbox, Radio, Switch, Select, Toggle, Slider, Label |
| **Display** | Avatar (+ AvatarFallback), Badge, Alert, Card (+ CardHeader/Content/Title/Description), Progress, Skeleton |
| **Navigation** | Breadcrumb, Pagination, Navigation-Menu, Menubar, NavLink (React Router -> Next.js Link) |
| **Containers** | Dialog (+ DialogContent/Header/Title/Description), Drawer, Sheet, Popover, Accordion, Tabs, ScrollArea |
| **Data** | Table (sortable/filterable) |
| **Menus** | Dropdown-Menu, Context-Menu |
| **Advanced** | Command Palette, Carousel, Resizable Panels, Separator |
| **Feedback** | Toast (Sonner), Alert-Dialog |

---

> **Ce design system privilegie la clarte, la transparence et l'efficacite pour des utilisateurs professionnels gerant des procedures juridiques sensibles.**
> **Reference d'implementation** : Le frontend existant dans `/Users/mkstudio/Desktop/PROJET KARUGENCY/IMMO NPL/frontend/` sert de maquette fonctionnelle.
