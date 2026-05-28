# Convex S2 — Schema design

> **Statut** : spec validée 2026-05-27, prête pour plan d'implémentation
> **Branche cible** : `feat/convex-s2-schema`
> **Réf** : [PLAN_V1.md §5–6](../../PLAN_V1.md), [MIGRATION_DIRECTUS_TO_CONVEX.md](../../MIGRATION_DIRECTUS_TO_CONVEX.md)
> **Précédent** : PR #1 (S0 — auth + 3 actions SECIB), PR #2 (S1 — frontend wiring Logto+Convex)

## Intention

Définir le schema Convex complet pour le workflow immonpl : 11 nouvelles tables + 2 existantes (`organizations`, `users`) augmentées, soit **13 tables au total**. Le spec se limite au **schema** (struct + indexes). Les actions Convex scoped (`dossiersDuSyndic`, `dossiersOuJeSuisIntervenant`), le helper `withAuditLog()`, le cron référentiels et le script d'import des dossiers SECIB existants sont des PRs séparées (S2b, S2c, S2d).

Note : la 11ème table nouvelle (`secibFetchLog`) vient du choix Q2 = hybrid C ; elle n'est pas dans la liste initiale PLAN_V1 §S2 (12 tables) mais elle implémente le pattern "audit replay" du payload SECIB brut.

## Décisions verrouillées (brainstorm 2026-05-27)

| # | Question | Décision | Rationale |
|---|----------|----------|-----------|
| Q1 | Pattern de query dashboard "Mes dossiers" syndic | Server-side filter + sort + pagination | Convex écrit `cases.list({ orgId, status?, search?, cursor })` avec indexes composites. Tient au-delà de ~500 dossiers/syndic. Real-time natif Convex envoie les updates seulement aux clients qui matchent. |
| Q2 | Snapshot SECIB | **Hybrid C** — champs hot inline dans `cases` + table séparée `secibFetchLog` pour rawPayload + audit replay | Inline pour dashboard rapide + indexes simples. Table séparée pour auditabilité RIN (PLAN_V1 §8) et debug (replay d'une réponse SECIB à instant T). |
| Q3 | Structure `caseDrafts` (wizard auto-save) | **Hybrid C** — champs hot typés (debiteurNom, principalCents, casSpecial, currentStep) + blob `wizardData: any` | Liste "Mes drafts" peut afficher debiteurNom + casSpecial sans parser le blob. Wizard interne évolue sans migration. |

Decisions par défaut (non débattues car standards) :

- **State enum** : `v.union(v.literal("CREE"), ...)` — typage strict côté Convex et frontend
- **Messages model** : thread linéaire par dossier (pas de threading parent/child v1)
- **AuditLogs partitioning** : table unique, indexes composites (par actor / target / org / action), TTL géré côté app
- **Cents pour montants** : tous les `*Cents` sont des `number` entiers (pas de Float arithmétique sur l'argent)
- **Timestamps** : `number` Unix epoch ms (compat `Date.now()`)

## Schema final — 13 tables

### ① Core (existantes — augmentées)

```typescript
organizations: defineTable({
  logtoOrgId: v.string(),
  kind: v.union(v.literal("npl"), v.literal("syndic")),
  name: v.string(),
  // syndic uniquement — référence personne morale dans SECIB pour mapping import
  secibSyndicPersonneId: v.optional(v.string()),
  createdAt: v.number(),
})
  .index("by_logto_org", ["logtoOrgId"])
  .index("by_secib_personne", ["secibSyndicPersonneId"])  // NEW S2
  .index("by_kind", ["kind"]),

users: defineTable({
  logtoUserId: v.string(),
  email: v.string(),
  name: v.string(),
  role: v.union(
    v.literal("npl_admin"),
    v.literal("npl_assistant"),
    v.literal("npl_avocat"),
    v.literal("syndic_admin"),
    v.literal("syndic_gestionnaire"),
  ),
  organizationId: v.id("organizations"),
  // npl_avocat seulement — référence intervenant SECIB pour scope
  // dossiersOuJeSuisIntervenant (S2b). Null pour les autres rôles.
  secibIntervenantId: v.optional(v.string()),  // NEW S2
  createdAt: v.number(),
  lastSeenAt: v.optional(v.number()),
})
  .index("by_logto_user", ["logtoUserId"])
  .index("by_organization", ["organizationId"])
  .index("by_secib_intervenant", ["secibIntervenantId"]),  // NEW S2
```

### ② Workflow & wizard

```typescript
cases: defineTable({
  organizationId: v.id("organizations"),  // org_syndic du dossier
  authorUserId: v.id("users"),            // qui a créé le dossier (syndic)

  // State machine — 9 statuts PLAN_V1 §3
  status: v.union(
    v.literal("CREE"),
    v.literal("EN_ATTENTE_PIECES"),
    v.literal("PRET"),
    v.literal("MISE_EN_DEMEURE_ENVOYEE"),
    v.literal("INJONCTION_DE_PAYER"),
    v.literal("ASSIGNATION_AU_FOND"),
    v.literal("JUGEMENT_OBTENU"),
    v.literal("CLOTURE"),
    v.literal("SUSPENDU"),  // transverse — retour previousStatus possible
  ),
  // Pour SUSPENDU → retour à previousStatus
  previousStatus: v.optional(v.string()),
  statusChangedAt: v.number(),
  statusChangedByUserId: v.id("users"),

  // Cas spéciaux PLAN_V1 §3 — un dossier peut combiner (ex: indivision + décédé)
  casSpecial: v.array(v.union(
    v.literal("INDIVISION"),
    v.literal("DECEDE"),
    v.literal("REDRESSEMENT"),
    v.literal("LOT_LOUE"),
    v.literal("MULTI_LOTS"),
  )),

  // Calculs financiers PLAN_V1 §3 — tous en cents (entiers)
  principalCents: v.number(),
  principalDateExigibilite: v.number(),   // pour intérêts légaux
  article700Cents: v.optional(v.number()),
  // Convex calcule les intérêts à la volée à partir de cette date + taux semestriel
  interetsLegauxFromYearMonth: v.optional(v.number()),  // YYYYMM

  // Snapshot SECIB inline (Q2 choix C — partie "hot")
  // Le payload SECIB brut va dans secibFetchLog ; ici on garde le minimum
  // utilisé par les listes et les écrans de détail.
  secibDossierId: v.optional(v.string()),
  secibLibelle: v.optional(v.string()),
  secibCodeMatiere: v.optional(v.string()),
  secibDateOuverture: v.optional(v.number()),
  secibIntervenantId: v.optional(v.string()),  // l'avocat assigné côté SECIB
  secibSnapshotAt: v.optional(v.number()),     // TTL 5 min — refresh on read

  // Pièces inline — wizard intelligent PLAN_V1 §3
  // 5–10 items max par dossier ; inline car array atomique sur update.
  pieces: v.array(v.object({
    type: v.string(),  // "DECOMPTE_CHARGES" | "PV_AG" | "MANDAT_SYNDIC" | "MISE_EN_DEMEURE_SYNDIC" | "RIB" | "ETAT_DATE" | "ACTE_NOTORIETE" | "LISTE_INDIVISAIRES" | "JUSTIF_RJ_LJ" | "BAIL"
    requirement: v.union(
      v.literal("obligatoire"),
      v.literal("recommandee"),
      v.literal("utile"),
    ),
    status: v.union(
      v.literal("REQUESTED"),
      v.literal("RECEIVED"),
      v.literal("REJECTED"),
    ),
    secibDocId: v.optional(v.string()),
    requestedAt: v.number(),
    receivedAt: v.optional(v.number()),
  })),

  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_org", ["organizationId"])
  .index("by_org_status", ["organizationId", "status"])  // dashboard syndic filtré
  .index("by_status", ["status"])                         // workspace admin NPL
  .index("by_secib_dossier", ["secibDossierId"])         // import & sync
  .index("by_secib_intervenant", ["secibIntervenantId"]) // scope npl_avocat

caseDrafts: defineTable({
  organizationId: v.id("organizations"),
  authorUserId: v.id("users"),
  // Hot fields (Q3 choix C) — query-able dans "Mes drafts"
  casSpecial: v.array(v.union(
    v.literal("INDIVISION"),
    v.literal("DECEDE"),
    v.literal("REDRESSEMENT"),
    v.literal("LOT_LOUE"),
    v.literal("MULTI_LOTS"),
  )),
  debiteurNom: v.optional(v.string()),
  principalCents: v.optional(v.number()),
  currentStep: v.string(),  // "DEBITEUR" | "CHARGES" | "PIECES" | "REVIEW"
  // Blob wizard interne — schéma libre côté frontend
  wizardData: v.any(),
  updatedAt: v.number(),
  expiresAt: v.number(),  // 30 jours après dernier updatedAt → cleanup cron
})
  .index("by_author", ["authorUserId"])
  .index("by_org", ["organizationId"])
  .index("by_expires", ["expiresAt"]),  // cron cleanup nocturne
```

### ③ Collaboration syndic ↔ avocat

```typescript
messages: defineTable({
  caseId: v.id("cases"),
  senderUserId: v.id("users"),
  senderRole: v.union(v.literal("syndic"), v.literal("avocat")),
  body: v.string(),
  attachmentSecibDocId: v.optional(v.string()),  // pièce SECIB attachée
  createdAt: v.number(),
})
  .index("by_case_created", ["caseId", "createdAt"]),  // thread pagination

notes: defineTable({
  caseId: v.id("cases"),
  authorUserId: v.id("users"),  // toujours NPL (assistant/avocat/admin)
  body: v.string(),
  lastEditedAt: v.number(),
  // Push state — debounce 5 min puis cron archive vers GED SECIB
  pendingPush: v.boolean(),
  lastPushedToSecibAt: v.optional(v.number()),
  secibDocId: v.optional(v.string()),
})
  .index("by_case", ["caseId"])
  .index("by_pending_push", ["pendingPush", "lastEditedAt"]),  // cron pickup
```

### ④ Admin operations

```typescript
timeEntries: defineTable({
  caseId: v.id("cases"),
  userId: v.id("users"),       // qui a presté
  description: v.string(),
  durationMinutes: v.number(),
  ratePerHourCents: v.optional(v.number()),  // override du tarif user
  startedAt: v.number(),
  // Push state — batch nocturne gw_factures_creer
  pendingPush: v.boolean(),
  pushedToSecibAt: v.optional(v.number()),
  secibFactureId: v.optional(v.string()),
})
  .index("by_case", ["caseId"])
  .index("by_user_started", ["userId", "startedAt"])  // "ma feuille de temps"
  .index("by_pending_push", ["pendingPush"]),         // cron night batch

notifications: defineTable({
  recipientUserId: v.id("users"),
  type: v.union(
    v.literal("NEW_MESSAGE"),
    v.literal("STATUS_CHANGE"),
    v.literal("DELAY_ALERT"),
    v.literal("DOCUMENT_ADDED"),
    v.literal("PIECE_REQUESTED"),
    v.literal("PIECE_RECEIVED"),
  ),
  caseId: v.optional(v.id("cases")),
  body: v.string(),
  link: v.string(),  // path frontend, ex "/dossiers/abc/messages"
  readAt: v.optional(v.number()),
  createdAt: v.number(),
})
  .index("by_recipient_created", ["recipientUserId", "createdAt"])  // drawer
  .index("by_recipient_unread", ["recipientUserId", "readAt"]),     // badge count

notificationPreferences: defineTable({
  userId: v.id("users"),
  channel: v.union(
    v.literal("EMAIL"),
    v.literal("PUSH"),     // web push PWA
    v.literal("IN_APP"),
  ),
  // Doit matcher notifications.type — string ouverte pour évolution facile
  notificationType: v.string(),
  enabled: v.boolean(),
})
  .index("by_user", ["userId"]),

delayAlerts: defineTable({
  caseId: v.id("cases"),
  delayType: v.union(
    v.literal("PRESCRIPTION_QUINQUENNALE"),  // art. 42 loi 65
    v.literal("SIGNIFICATION_ASSIGNATION"),  // CPC 8j min
    v.literal("OPPOSITION_INJONCTION"),      // CPC 1 mois
    v.literal("PEREMPTION_INSTANCE"),        // art. 386 CPC 2 ans
    v.literal("EXECUTION_JUGEMENT"),         // art. L111-4 CPCE 10 ans
  ),
  deadlineAt: v.number(),
  level: v.union(
    v.literal("J180"),
    v.literal("J90"),
    v.literal("J30"),
    v.literal("J7"),
    v.literal("EXPIRED"),
  ),
  computedAt: v.number(),       // dernière exécution cron
  acknowledged: v.boolean(),    // user a vu l'alerte
})
  .index("by_case", ["caseId"])
  .index("by_level_deadline", ["level", "deadlineAt"]),  // digest matin 8h
```

### ⑤ Cache & audit

```typescript
cachedReferentials: defineTable({
  kind: v.union(
    v.literal("CODES_ACTIVITES"),
    v.literal("CODES_FACTURATION"),
    v.literal("MATIERES_CONTENTIEUX"),
    v.literal("INTERVENANTS"),
    v.literal("ETAPES_PARAPHEUR"),
  ),
  payload: v.any(),  // raw SECIB
  fetchedAt: v.number(),
  ttlAt: v.number(),  // generic TTL 24h
})
  .index("by_kind", ["kind"]),  // 1 row par kind, upsert

secibFetchLog: defineTable({
  endpoint: v.string(),       // "gw_dossiers_detail"
  targetType: v.string(),     // "dossier" | "personne" | "facture" | ...
  targetId: v.string(),
  requestParams: v.optional(v.any()),
  responsePayload: v.any(),
  status: v.number(),         // HTTP status
  fetchedAt: v.number(),
  fetchedByUserId: v.id("users"),
})
  .index("by_target", ["targetType", "targetId", "fetchedAt"])  // replay
  .index("by_endpoint_time", ["endpoint", "fetchedAt"])          // monitoring
  .index("by_user_time", ["fetchedByUserId", "fetchedAt"]),      // audit user

auditLogs: defineTable({
  // S0 existant
  actorLogtoUserId: v.string(),
  actorRole: v.string(),
  action: v.string(),  // ex: "case.read", "case.status_changed", "secib.dossier_fetched", "note.pushed"
  targetType: v.optional(v.string()),
  targetId: v.optional(v.string()),
  metadata: v.optional(v.any()),
  ip: v.optional(v.string()),
  createdAt: v.number(),
  // S2 enrichi — pour reporting par org et par type d'action
  actorUserId: v.optional(v.id("users")),
  actorOrganizationId: v.optional(v.id("organizations")),
})
  .index("by_actor", ["actorLogtoUserId"])
  .index("by_target", ["targetType", "targetId"])
  .index("by_created", ["createdAt"])
  .index("by_org_created", ["actorOrganizationId", "createdAt"])  // NEW
  .index("by_action_created", ["action", "createdAt"]),           // NEW
```

## Récap volumétrie

| Catégorie | Tables | Indexes | LOC schema |
|---|---|---|---|
| Core (augmenté) | 2 | 6 | ~50 |
| Workflow | 2 | 8 | ~140 |
| Collab | 2 | 3 | ~40 |
| Admin ops | 4 | 8 | ~160 |
| Cache & audit | 3 | 9 | ~110 |
| **Total** | **13** | **34** | **~500** |

## Hors scope S2 (= PRs ultérieures)

- **S2b — Actions scoped** : `dossiersDuSyndic`, `dossiersOuJeSuisIntervenant`, helper `withAuditLog()` (wrap toutes les actions privilégiées avec audit)
- **S2c — Cron référentiels** : `crons.daily(referentialsRefresh)` qui refresh les 5 kinds dans `cachedReferentials`
- **S2d — Import dossiers** : script one-shot qui lit les dossiers SECIB des 2 syndics pilotes et les insère dans `cases` (mapping `secibSyndicPersonneId` → `organizationId`, status par défaut "CREE")
- **Cron debounce notes** : à inclure dans S2c
- **Cron cleanup caseDrafts expirés** : à inclure dans S2c
- **Cron cleanup secibFetchLog > 90j** : à inclure dans S2c

## Notes de migration

- Pas de breaking change pour `organizations` / `users` — seuls ajouts de champs optionnels et nouveaux indexes
- `auditLogs` existant : les rows S0/S1 (s'il y en a) ont `actorUserId` / `actorOrganizationId` à `undefined` — acceptable (champs optional)
- Nouvelles tables : aucune migration nécessaire (création vide)
- `convex deploy` suffira

## Décisions explicitement reportées

- **Real-time sur le snapshot SECIB** : si snapshot change, faut-il re-render le dashboard ? Décision S3 quand on écrit le portail syndic — pour l'instant, refresh manuel sur clic "actualiser" + TTL 5 min
- **Cleanup `secibFetchLog`** : politique TTL 90 jours mentionnée mais non implémentée en S2. À ajouter en S2c avec un cron de purge
- **Mécanisme exact du debounce 5 min des notes** : approche probable = cron Convex toutes les minutes qui pick les `pendingPush=true AND lastEditedAt < now-5min`. À détailler en S2c
- **`pieces` inline vs table séparée** : inline en S2 car array atomique sur update. Si on doit indexer "tous les dossiers où la pièce X est REQUESTED depuis Y jours", on extraira en table séparée S3+
- **Strings ouvertes** : `cases.pieces[].type`, `caseDrafts.currentStep`, `notificationPreferences.notificationType` restent en `v.string()` (pas en literal union) pour permettre au frontend d'évoluer (nouveaux types de pièces ajoutés par Nancy, nouveaux steps wizard, nouveaux types de notifs) sans migration Convex. Tradeoff conscient : pas de garantie de cohérence côté backend, à valider zod côté handler quand pertinent.

## Test plan (validation post-impl)

- `pnpm convex:deploy` réussit sur le déploiement self-hosted
- `pnpm convex:run seed:provisionNplUser` continue de fonctionner (régression S1)
- Pour chaque nouvelle table : 1 mutation seed test (`seed:insertCaseFixture`, etc.) écrite côté `convex/seed.ts` qui valide insert + indexes
- Dashboard Convex (`https://admin.immo.nplavocat.com`) affiche les 13 tables avec leurs indexes
- `pnpm tsc` clean côté frontend (régression S1 — le frontend ne référence pas encore les nouveaux types)
