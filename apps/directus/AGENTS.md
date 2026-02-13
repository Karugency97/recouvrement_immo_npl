# AGENTS.md - Directus Backend

> Instructions specifiques pour l'agent Directus Backend travaillant sur le workspace `apps/directus/`.

---

## Architecture des extensions

```
apps/directus/
├── extensions/
│   ├── hooks/
│   │   ├── auto-reference/       # Genere LR-YYYY-NNN a la creation d'un dossier
│   │   │   └── index.ts
│   │   └── auto-timeline/        # Cree un evenement sur changement de statut
│   │       └── index.ts
│   └── endpoints/
│       └── dashboard-stats/      # Stats agregees pour les dashboards
│           └── index.ts
├── snapshots/
│   └── schema-snapshot.yaml      # Snapshot du schema Directus
└── package.json
```

### Convention de developpement des extensions

- Chaque extension dans son propre repertoire avec un `index.ts`
- TypeScript obligatoire
- Utiliser les services Directus (`ItemsService`, `SchemaService`, etc.) et non des requetes SQL directes
- Logger les erreurs via `logger` fourni par le contexte Directus
- Tester les permissions pour chaque role apres modification

---

## Schema des 12 collections

> Reference complete : `PLAN.md` Phase 2

### Collection centrale : `dossiers`

Le hub qui connecte toutes les autres collections :

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
                     messages → messages (self: threads)
                         |
                       notes

        factures → heures_facturables
        factures → syndics
        factures → dossiers
```

### Liste des collections

| # | Collection | Description | Champs cles |
|---|-----------|-------------|-------------|
| 1 | `syndics` | Clients syndics de copropriete | raison_sociale, user_id (FK users) |
| 2 | `coproprietes` | Coproprietes gerees par un syndic | nom, syndic_id (FK syndics) |
| 3 | `debiteurs` | Debiteurs (particulier ou societe) | type, nom, lot_description |
| 4 | `dossiers` | **Hub central** — Dossiers juridiques | reference (LR-YYYY-NNN), statut, phase, montants |
| 5 | `creances` | Creances rattachees a un dossier | type, montant, statut |
| 6 | `documents` | Documents uploades | type, fichier (FK files), confidentiel |
| 7 | `evenements` | Timeline des evenements | type, visible_client |
| 8 | `taches` | Taches et audiences | type, statut, assignee_id |
| 9 | `heures_facturables` | Heures de travail des avocats | duree_minutes, categorie, facturable |
| 10 | `factures` | Factures aux syndics | numero, statut, montants HT/TVA/TTC |
| 11 | `messages` | Messagerie par dossier | contenu, lu, parent_id (threads) |
| 12 | `notes` | Notes internes sur un dossier | type, contenu (WYSIWYG), epingle |

### Statuts des dossiers

| Statut | Phase | Description |
|--------|-------|-------------|
| `nouveau` | amiable | Dossier vient d'etre cree |
| `en_cours` | amiable | En traitement actif |
| `mise_en_demeure` | pre_contentieux | Mise en demeure envoyee |
| `assignation` | contentieux | Assignation en cours |
| `injonction` | contentieux | Requete en injonction de payer |
| `audience` | contentieux | Audience programmee |
| `jugement` | contentieux | Jugement rendu |
| `execution` | execution | Phase d'execution |
| `paye` | — | Creance recouvree |
| `cloture` | — | Dossier clos |
| `irrecovrable` | — | Creance irrecovrable |

---

## Extensions existantes

### Hook : Auto-reference (`auto-reference`)

**Fichier** : `extensions/hooks/auto-reference/index.ts`

**Declencheur** : `filter` sur `dossiers.items.create`

**Logique** :
1. Recuperer l'annee courante
2. Compter les dossiers existants pour cette annee
3. Generer `LR-{annee}-{numero sequentiel sur 3 chiffres}`
4. Injecter dans le champ `reference` du payload

**Point d'attention** : Gerer la concurrence — si 2 dossiers sont crees simultanement, eviter les doublons. Utiliser une transaction ou un mecanisme de verrouillage.

```typescript
// Pattern
export default ({ filter }, { services, database, logger }) => {
  filter('dossiers.items.create', async (payload) => {
    const year = new Date().getFullYear();
    // Compter les dossiers de l'annee et generer le prochain numero
    const count = await database('dossiers')
      .where('reference', 'like', `LR-${year}-%`)
      .count('* as total')
      .first();
    const next = String((count?.total || 0) + 1).padStart(3, '0');
    payload.reference = `LR-${year}-${next}`;
    return payload;
  });
};
```

### Hook : Auto-timeline (`auto-timeline`)

**Fichier** : `extensions/hooks/auto-timeline/index.ts`

**Declencheur** : `action` sur `dossiers.items.update`

**Logique** :
1. Detecter si le champ `statut` a change (comparer `payload.statut` avec la valeur precedente)
2. Si oui, creer un evenement dans `evenements` avec :
   - `type`: `changement_statut`
   - `titre`: Label du nouveau statut
   - `description`: "Statut passe de {ancien} a {nouveau}"
   - `metadata`: `{ ancien_statut, nouveau_statut }`
   - `visible_client`: `true`
   - `auteur_id`: l'utilisateur courant

```typescript
// Pattern
export default ({ action }, { services, getSchema }) => {
  action('dossiers.items.update', async (meta, context) => {
    if (meta.payload.statut) {
      const { ItemsService } = services;
      const eventsService = new ItemsService('evenements', {
        schema: await getSchema(),
        accountability: context.accountability,
      });
      await eventsService.createOne({
        dossier_id: meta.keys[0],
        type: 'changement_statut',
        titre: `Statut: ${meta.payload.statut}`,
        date_evenement: new Date().toISOString(),
        auteur_id: context.accountability?.user,
        visible_client: true,
        metadata: {
          nouveau_statut: meta.payload.statut,
        },
      });
    }
  });
};
```

### Endpoint : Dashboard Stats (`dashboard-stats`)

**Fichier** : `extensions/endpoints/dashboard-stats/index.ts`

**Routes** :

| Methode | Route | Description | Acces |
|---------|-------|-------------|-------|
| GET | `/dashboard-stats/client/:syndicId` | Stats d'un syndic specifique | Syndic (son propre ID) |
| GET | `/dashboard-stats/admin` | Stats globales | Admin, Avocat |

**Stats client** :
- Nombre de dossiers actifs (statut != cloture, paye, irrecovrable)
- Montant total a recouvrer (`SUM(montant_initial) - SUM(montant_recouvre)`)
- Montant total recouvre (`SUM(montant_recouvre)`)
- Nombre de dossiers clotures

**Stats admin** :
- Memes stats que client mais sur TOUS les dossiers
- Nombre de taches urgentes (echeance dans les 7 jours)
- Nombre de messages non lus
- Activite recente (derniers evenements)

---

## Roles et permissions (RBAC)

> Reference complete : `PLAN.md` Phase 3

### Role : Administrateur

Acces complet a toutes les collections et parametres Directus.

### Role : Avocat

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

### Role : Syndic (Client)

**Filtre global** : `syndics.user_id = $CURRENT_USER`

| Collection | Create | Read | Update | Delete |
|-----------|--------|------|--------|--------|
| dossiers | Via wizard | Ses dossiers | Non | Non |
| debiteurs | Via wizard | Ses dossiers | Non | Non |
| creances | Non | Ses dossiers | Non | Non |
| syndics | Non | Son profil | Son profil | Non |
| coproprietes | Non | Les siennes | Non | Non |
| documents | Upload | Non-confidentiels | Non | Non |
| evenements | Non | `visible_client=true` seulement | Non | Non |
| taches | Non | Audiences seulement | Non | Non |
| heures_facturables | Non | Non | Non | Non |
| factures | Non | Les siennes | Non | Non |
| messages | Envoi | Ses dossiers | Champ `lu` seulement | Non |
| notes | Non | Non | Non | Non |

**Points critiques de securite** :
- Un syndic ne doit JAMAIS voir les dossiers d'un autre syndic
- Les documents `confidentiel=true` sont invisibles pour les syndics
- Les evenements `visible_client=false` sont invisibles pour les syndics
- Les notes et heures_facturables sont 100% invisibles pour les syndics

---

## Patterns SDK cote serveur

### ItemsService (dans les extensions)

```typescript
const { ItemsService } = services;
const dossiersService = new ItemsService('dossiers', {
  schema: await getSchema(),
  accountability: context.accountability, // Respecte les permissions du user courant
});

// Lecture
const dossiers = await dossiersService.readByQuery({
  filter: { statut: { _neq: 'cloture' } },
  fields: ['*', 'syndic_id.raison_sociale'],
  sort: ['-date_created'],
  limit: 10,
});

// Creation
const newId = await dossiersService.createOne({
  titre: 'Nouveau dossier',
  statut: 'nouveau',
  phase: 'amiable',
  // ...
});

// Mise a jour
await dossiersService.updateOne(id, { statut: 'en_cours' });
```

### Aggregation (pour dashboard-stats)

```typescript
// Utiliser Knex directement pour les aggregations complexes
const stats = await database('dossiers')
  .where('syndic_id', syndicId)
  .whereNotIn('statut', ['cloture', 'paye', 'irrecovrable'])
  .count('* as actifs')
  .sum('montant_initial as total_initial')
  .sum('montant_recouvre as total_recouvre')
  .first();
```

---

## Flows Directus (automatisations)

| Flow | Declencheur | Action |
|------|------------|--------|
| Notification nouveau message | `items.create` sur `messages` | Email au destinataire |
| Rappel echeance tache | Cron 8h00 quotidien | Email aux assignees si `date_rappel = today` |
| Alerte audience imminente | Cron 8h00 quotidien | Email + evenement si audience dans 48h |

---

## Checklist pour toute modification du schema

- [ ] Schema mis a jour dans Directus (via UI ou snapshot)
- [ ] Types TypeScript mis a jour dans `packages/shared/src/types/`
- [ ] Permissions verifiees pour les 3 roles (admin, avocat, syndic)
- [ ] Extensions impactees mises a jour (hooks, endpoints)
- [ ] Snapshot schema exporte (`schema-snapshot.yaml`)
- [ ] Frontend informe des changements (fonctions API dans `lib/api/`)
