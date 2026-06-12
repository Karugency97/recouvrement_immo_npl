# S2c — Crons Convex + fix MinIO — Design

**Date** : 2026-06-12
**Statut** : validé (brainstorm avec user)
**Précède** : plan d'implémentation S2c
**Suit** : S2b (actions scoped + withAuditLog + secibFetch, PR #4 mergée)

## Objectif

Mettre en place la maintenance automatique du backend Convex immonpl : trois crons quotidiens (refresh des référentiels SECIB, cleanup des brouillons de wizard expirés, purge des logs de fetch SECIB > 90 jours), un helper de traçabilité pour les exécutions système, et le durcissement infra du service MinIO (buckets auto-réparants).

## Décisions verrouillées (brainstorm 2026-06-12)

- **Q1 — Cron notes debounce** : **déféré à S3**. La table `cases` est vide (import S2d), aucun portail ne crée de notes (S3), et le push vers la GED exige des décisions (répertoire SECIB, format, nommage) qui appartiennent au workflow S3. YAGNI.
- **Q2 — Bucket presence check** : **fix infra à la source** (compose MinIO idempotent + healthcheck applicatif), pas de cron Convex de monitoring. Un cron aurait nécessité les creds S3 dans le deployment et une alerte sans destinataire.
- **Q3 — Architecture** : approche minimale — `convex/crons.ts` + internals par domaine, traçabilité via `auditLogs` existante (pas de table `cronRuns`).
- **Q4 — Traçabilité crons** : helper `logCronRun()` séparé (acteur système), `withAuditLog` existant inchangé.

## Hors scope

- Push notes → GED SECIB (S3)
- Push timeEntries → facturation SECIB (post-S3, cf. PLAN_V1)
- Alertes délais `delayAlerts` (sprint dédié, cf. PLAN_V1 — calcul J-180/J-90/J-30/J-7)
- Table `cronRuns` / endpoint HTTP de santé (à ajouter si le besoin de monitoring émerge)

## Architecture

```
convex/crons.ts               déclaration cronJobs() — 3 jobs quotidiens
convex/referentials.ts        internal action refreshAll (5 kinds → cachedReferentials)
convex/caseDrafts.ts          internal mutation cleanupExpired (batch 500 + rescheduling)
convex/secibFetchLog.ts       + internal mutation purgeOld (batch 500 + rescheduling)
convex/lib/audit.ts           + logCronRun() — trace système dans auditLogs
convex/lib/secibFetch.ts      accepte un contexte « system » (fetch sans user)
convex/schema.ts              secibFetchLog.fetchedByUserId devient optionnel
```

Fix infra (hors repo) : compose du service Coolify `convex-npl-minio`.

## Détail des composants

### 1. `convex/crons.ts`

```ts
const crons = cronJobs();
crons.daily("referentials-refresh", { hourUTC: 8, minuteUTC: 0 }, internal.referentials.refreshAll);
crons.daily("casedrafts-cleanup",   { hourUTC: 8, minuteUTC: 30 }, internal.caseDrafts.cleanupExpired, {});
crons.daily("secibfetchlog-purge",  { hourUTC: 9, minuteUTC: 0 }, internal.secibFetchLog.purgeOld, {});
```

08:00 UTC = 04:00 Guadeloupe (hors heures cabinet). Horaires décalés pour éviter le chevauchement.

### 2. Refresh référentiels — `convex/referentials.ts`

Internal action `"use node"` `refreshAll` :

- Mapping kind → endpoint gateway :

| Kind | Endpoint |
|---|---|
| `CODES_ACTIVITES` | `/referentiel/codes-activites` |
| `CODES_FACTURATION` | `/referentiel/codes-facturation` |
| `MATIERES_CONTENTIEUX` | `/referentiel/matieres-contentieux` |
| `INTERVENANTS` | `/referentiel/intervenants` |
| `ETAPES_PARAPHEUR` | `/referentiel/etapes-parapheur` |

(Les paths exacts sont à confronter aux routes du gateway `npl-api-gateway` pendant l'implémentation.)

- Boucle sur les 5 kinds, **try/catch par kind** : un échec n'empêche pas les autres ; les erreurs sont agrégées dans la metadata du log de run.
- Pour chaque kind réussi : upsert dans `cachedReferentials` via une internal mutation (patch du doc existant trouvé par l'index `by_kind`, sinon insert) avec `payload`, `fetchedAt = now`, `ttlAt = now + 25h` (25h pour absorber un retard de cron sans trou de cache).
- Termine par `logCronRun("referentials-refresh", { refreshed, failed })` — `.completed` si ≥ 1 kind OK, `.failed` si tout a échoué.

### 3. Cleanups par batch — pattern commun

`caseDrafts.cleanupExpired` et `secibFetchLog.purgeOld` sont des internal mutations qui suivent le même pattern :

1. Query par index, bornée à **500 docs** :
   - drafts : index `by_expires`, filtre `expiresAt < now`
   - fetchLog : `fetchedAt < now − 90 × 24 × 3600 × 1000` (l'ordre `_creationTime` par défaut suffit ; sinon collecte filtrée bornée)
2. `ctx.db.delete()` sur chaque doc.
3. Si la page contenait 500 docs (potentiellement d'autres restants), **re-planification immédiate** : `ctx.scheduler.runAfter(0, internal.<même mutation>, { continuation: true })`.
4. À la fin du dernier batch : `logCronRun(<job>, { deleted })`. Les batchs de continuation accumulent le compteur via l'argument (`deletedSoFar`).

Idempotent et borné — aucune mutation ne touche plus de 500 docs.

### 4. `logCronRun()` — `convex/lib/audit.ts`

```ts
logCronRun(ctx, job: string, outcome: "completed" | "failed", metadata?: Record<string, unknown>)
```

Insert direct dans `auditLogs` :
- `actorLogtoUserId: "system:cron"`, `actorRole: "system"`
- `action: "cron.<job>.<outcome>"`
- `metadata` : compteurs (kinds rafraîchis/échoués, docs supprimés, messages d'erreur tronqués)
- `createdAt: Date.now()`

Appelable depuis une mutation (insert direct) et depuis une action (via l'internal mutation `auditLogs.append` existante). `withAuditLog` n'est pas modifié.

### 5. `secibFetch` en mode système + schéma

- `convex/schema.ts` : `secibFetchLog.fetchedByUserId` passe de `v.id("users")` à `v.optional(v.id("users"))`. Aucune migration de données nécessaire (rendre un champ optionnel est rétro-compatible).
- `convex/lib/secibFetch.ts` : le paramètre `audit` accepte un contexte système (`{ userId: undefined }` ou union de type dédiée `SystemContext`) ; le log `secibFetchLog.append` transmet `fetchedByUserId` seulement s'il est défini.
- `convex/secibFetchLog.ts` : l'internal mutation `append` rend l'arg `fetchedByUserId` optionnel.

Les fetchs du cron restent ainsi tracés dans `secibFetchLog` (endpoint, payload, status) sans utilisateur fictif.

### 6. Fix infra MinIO (service Coolify `convex-npl-minio`, UUID `a11dgvd0tjf2p1iz1931157w`)

Contexte : un upgrade Coolify a déjà renommé le volume MinIO → buckets perdus → `convex deploy` en échec (`NoSuchBucket`), et le conteneur `minio-init` (`restart: 'no'`) ne se relance jamais pour les recréer (cf. memory `project_known_bugs.md`).

Modifications du compose (via `mcp__coolify__service` update + restart) :

1. **`minio-init` idempotent et relançable** :
   - commande : `mc alias set local http://minio:9000 $USER $PASS && mc mb --ignore-existing local/convex-exports local/convex-snapshots local/convex-modules local/convex-files local/convex-search`
   - `restart: on-failure`
2. **Healthcheck applicatif sur le conteneur `minio`** : vérifie un bucket sentinelle, ex. `mc ls local/convex-modules` (ou `curl` S3 HEAD bucket si `mc` indisponible dans l'image — à vérifier pendant l'implémentation). Buckets absents → `unhealthy` visible dans Coolify.

⚠️ Leçon S2B (memory `reference-coolify-traefik-gotchas`) : après update du compose, le `control restart` Coolify peut laisser le service `exited` — vérifier le status et faire un `start` explicite si besoin. Ajouter aussi le label `traefik.docker.network=coolify` si le service expose des routes Traefik (à vérifier — MinIO est interne, probablement pas concerné).

## Gestion des erreurs

- **Gateway SECIB down pendant le refresh** : chaque kind échoue individuellement, le cache existant reste servi (TTL 25h absorbe un raté ; deux ratés consécutifs = cache stale mais présent — acceptable pour des référentiels quasi statiques). Run loggé `.failed` avec les erreurs.
- **Mutation de cleanup qui throw** : Convex retry les mutations système ; le batch suivant reprendra au prochain run quotidien au pire.
- **Buckets manquants** : healthcheck unhealthy + restart du service les recrée (`--ignore-existing`).

## Validation

1. `pnpm convex:deploy` — les 3 crons apparaissent dans le dashboard Convex (`admin.immo.nplavocat.com` → Schedules).
2. Déclenchement manuel de chaque internal via `pnpm convex:run` :
   - `referentials:refreshAll` → `cachedReferentials` contient 5 docs avec payload non vide
   - `caseDrafts:cleanupExpired` → 0 supprimé (aucun draft) — insérer un draft expiré de test via une fixture, re-run, vérifier la suppression
   - `secibFetchLog:purgeOld` → 0 supprimé (logs récents) — vérifié par le compteur en metadata
3. `auditLogs` contient les lignes `cron.*.completed` avec compteurs.
4. Non-régression : `secib:cabinetInfo` via le playground (le refactor `secibFetch` ne casse pas le mode user).
5. MinIO : vérifier que le healthcheck passe au vert après restart, et valider l'idempotence de `minio-init` en le relançant (les 5 buckets existants ne sont pas altérés, `--ignore-existing` ne fail pas). Ne PAS supprimer de bucket de prod pour tester le cas unhealthy — la logique du healthcheck (`mc ls` qui fail sur bucket absent) se vérifie par lecture.
