# Cleanup TODO

> Vestiges à supprimer pour finaliser le S0 cleanup du [PLAN_V1.md](./PLAN_V1.md).
> Tout est listé ici plutôt que supprimé directement — chaque entrée nécessite une décision explicite avant suppression.

## Catégorie 1 — Easy wins (suppression franche, zéro impact runtime)

| Cible | Raison | Action |
|-------|--------|--------|
| `supabase/migrations/*.sql` (5 fichiers) | Stack Supabase abandonnée au profit de Convex (PLAN_V1 §7) | `rm -rf supabase/` |
| `backend/` (FastAPI + MongoDB) | Starter Emergent inutile, le backend devient Convex | `rm -rf backend/` |
| `venv/` | Virtualenv Python du backend supprimé | `rm -rf venv/` |
| `tests/__init__.py` (fichier vide) | Vestige du backend Python | `rm -rf tests/` |
| `frontend/plugins/visual-edits/` | Plugin Emergent visual editor | `rm -rf frontend/plugins/visual-edits/` |
| `test_result.md` | Vestige Emergent | `rm test_result.md` |
| `docs/screencapture-legal-suite-4-preview-emergentagent-*.png` (4 fichiers) | Screenshots préview Emergent | `rm docs/screencapture-*.png` |
| `frontend/conductor/` | Vestige Emergent (si présent) | `rm -rf frontend/conductor/` (à confirmer) |
| `.gitconfig` racine | Suspect, à valider | inspection nécessaire |

**Estimation** : 5 minutes, zéro risque (rien n'importe ces dossiers dans le code frontend actuel).

## Catégorie 2 — craco.config.js

`frontend/craco.config.js` référence `./plugins/visual-edits/babel-metadata-plugin` et `./plugins/visual-edits/dev-server-setup` (lignes 17-18). Conditionnel sur `REACT_APP_ENABLE_VISUAL_EDITS`, donc inoffensif si la variable n'est pas définie, mais à nettoyer en même temps que `frontend/plugins/visual-edits/`.

**Action** : retirer le bloc `if (config.enableVisualEdits) {...}` et la section `webpackConfig.babel` conditionnelle (lignes 76-81 et 84-90).

**Garder** : la partie `health-check/` est un plugin légitime (endpoints /health pour Coolify), à conserver.

## Catégorie 3 — mockData (reporté à S3)

`frontend/src/data/mockData.js` est utilisé par **19 fichiers** :
- 4 helpers de formatage (`formatCurrency`, `formatDate`, `formatDateTime`, `formatFileSize`)
- 4 datasets statiques (`mockCases`, `currentUser`, `currentAdmin`, `lawyers`)

Le PLAN_V1 S3 (semaine 3) prévoit le branchement Convex avec vrais data. Donc :
- **Option A (recommandée)** : laisser mockData en place jusqu'à S3, où il sera remplacé fichier par fichier au fur et à mesure du branchement Convex.
- **Option B (proactive)** : extraire les 4 formatters dans `frontend/src/lib/format.js` maintenant (refactor de 19 imports), garder les datasets pour S3.

Décision actuelle : **Option A**. Le refactor proactif n'apporte rien tant que les pages affichent des données mockées.

## Catégorie 4 — Renommage projet (optionnel)

`package.json` racine et `frontend/package.json` ont `"name": "cabinet-juridique"` / `"frontend"`. PLAN_V1 utilise le nom **immonpl**. À renommer si on veut alignement, mais aucun impact technique.
