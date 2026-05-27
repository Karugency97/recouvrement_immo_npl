# Plan immonpl v1 — Stratégie & Exécution

> **Statut** : Plan figé, prêt pour exécution
> **Date de figeage** : 2026-05-27
> **Approche** : NPL-first, single-cabinet, SECIB-backed, Convex self-hosted
> **Horizon** : 6 semaines de build (flex +2-3) + 3 mois de pilote
> **Document compagnon** : [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md)

---

## Sommaire

- [Synthèse exécutive](#synthèse-exécutive)
- [Les 13 territoires](#les-13-territoires)
  - [#1 Personas précis](#1-personas-précis)
  - [#2 Périmètre métier v1](#2-périmètre-métier-v1)
  - [#3 Workflow juridique recouvrement](#3-workflow-juridique-recouvrement)
  - [#4 Inventaire SECIB précis](#4-inventaire-secib-précis)
  - [#5 Data ownership (SECIB vs Convex)](#5-data-ownership-secib-vs-convex)
  - [#6 Auth & rôles (Logto)](#6-auth--rôles-logto)
  - [#7 Architecture technique](#7-architecture-technique)
  - [#8 Sécurité & conformité](#8-sécurité--conformité)
  - [#9 UX & Design system applicabilité](#9-ux--design-system-applicabilité)
  - [#10 Notifications & communications](#10-notifications--communications)
  - [#11 Modèle économique NPL ↔ Karugency](#11-modèle-économique-npl--karugency)
  - [#12 GTM pilote](#12-gtm-pilote)
  - [#13 Ressources & contraintes](#13-ressources--contraintes)
- [Plan d'exécution 6 semaines](#plan-dexécution-6-semaines)
- [Risques & mitigations](#risques--mitigations)
- [Questions ouvertes pour Nancy (Semaine 0)](#questions-ouvertes-pour-nancy-semaine-0)
- [Actions immédiates](#actions-immédiates)

---

## Synthèse exécutive

immonpl est l'application de gestion du recouvrement de créances de copropriété co-construite avec le **Cabinet Nancy Pierre-Louis (NPL)**. Elle propose un **Portail Syndic** (clients de NPL) et un **Portail Admin** (équipe NPL), branchés sur **SECIB v8.1.4** comme backend métier via l'API existante `apisecib.nplavocat.com`.

**Approche stratégique : NPL-first.** Un seul cabinet, deux populations d'utilisateurs (syndics + équipe NPL), SECIB comme source de vérité métier, Convex self-hosted comme socle applicatif. Le multi-tenant et l'ouverture commerciale à d'autres cabinets sont reportés en phase 2.

**Stack technique** :
- Frontend : React 19 + Tailwind + ShadCN/Radix (PWA), déjà déployé sur `immo.nplavocat.com`
- Backend : Convex self-hosted sur Coolify (Hostinger France)
- Auth : Logto karugency (existant)
- SECIB : via gateway `apisecib.nplavocat.com` (existante)
- Emails : Resend + React Email
- Errors : Sentry self-hosted
- Backups : OVH Object Storage (souveraineté FR)

**Modèle économique : M5 hybride co-développement avec royalty.**
Karugency développe à ses frais et conserve l'IP, NPL fournit expertise + premier client + réseau, Karugency reverse 7 % sur revenus tirés d'autres cabinets que NPL.
Pricing syndic en freemium (P5) répercuté par NPL dans ses honoraires.

**Pilote** : 2 syndics déjà clients NPL (présents dans SECIB), 3 mois gratuit total, decision gate 4/6 critères.

**Ressources** : 1 développeur temps plein (Karugency), Nancy 3 h/semaine, budget 100 €/mois outils, runway 6 mois, T+6 semaines avec flex +2-3.

---

## Les 13 territoires

### #1 Personas précis

#### Hiérarchie

| Rang | Persona | Optimisation |
|------|---------|--------------|
| ★ Prioritaire | **P3 Gestionnaire de copro** | Tout pivot UX optimise pour lui |
| 2 | P2 Assistante juridique NPL | Power user quotidien interne |
| 3 | P1 Nancy (avocate) | Validation, parapheur, supervision |
| 4 | P4 Dirigeant agence syndic | Vue synthétique, peu de friction |

#### Hypothèses verrouillées

- **H1 Volume** : ~10-30 dossiers/mois actuels chez NPL, cible 50-100/mois en v1 sur 6 mois
- **H2 Comptable syndic** : pas d'accès direct en v1, gestionnaire relaye tout
- **H3 Type syndic pilote** : indé d'abord (P3 indé multi-casquette), pros en phase 2.1

#### Conséquences design verrouillées

- PWA mobile-first pour le portail syndic (P3 indé souvent terrain/tablette)
- Wizard Nouveau Dossier = porte d'entrée principale → lisible sans formation
- Page Suivi dossier = raison de revenir → transparence radicale
- Pas d'accès comptable séparé, ni Conseil Syndical, ni débiteur en v1
- Workspace admin riche (P1+P2) sans dégrader la simplicité P3
- Vue dirigeant agence (P4) agrégée simple sur portefeuille

#### Hors scope v1

Débiteur (copropriétaire impayé), Conseil Syndical, syndic bénévole/autogéré, comptable syndic, syndics pros structurés (SSO/SAML).

---

### #2 Périmètre métier v1

#### Cadre

- **Créances couvertes** : charges courantes de copropriété uniquement
- **Phases couvertes** : pré-contentieuse + contentieuse + exécution (suivi)
- **Phases hors-scope** : amiable pré-avocat, post-jugement orchestré, vente lot en cours

#### Modules IN v1 (11 modules)

1. Wizard création dossier (P3)
2. Suivi transparent du dossier (P3)
3. Génération 3 actes (templates Nancy/SECIB)
4. Workflow procédural orchestré (light — états + prochaine étape proposée, humain valide)
5. Calculs financiers auto (intérêts légaux + art. 700)
6. Messages syndic ↔ avocat + demande pièces structurée
7. Time tracking NPL → export SECIB
8. Vue portefeuille P4 (KPIs synthétiques)
9. Saisie paiements partiels
10. Alertes délais légaux
11. Reporting AG light (PDF par dossier)

#### Modules OUT v1

- Facturation auto syndic (NPL facture via SECIB comme aujourd'hui)
- Parapheur intégré (lecture SECIB seulement)
- Paiement débiteur en ligne (pas de portail débiteur v1)

#### Modes

- **Workflow** : light — états affichés, prochaine étape proposée, humain valide chaque transition
- **Facturation** : zéro nouveau code — l'app pousse les time entries vers SECIB, NPL facture depuis SECIB

---

### #3 Workflow juridique recouvrement

#### Machine à états (9 statuts)

```
1. CRÉÉ → 2. EN ATTENTE PIÈCES → 3. PRÊT → 4. MISE EN DEMEURE ENVOYÉE
         → 5. INJONCTION DE PAYER ou 6. ASSIGNATION AU FOND
         → 7. JUGEMENT OBTENU → 8. CLÔTURÉ

État transversal : 9. SUSPENDU (déclenché par syndic, retour à l'état précédent possible)
```

Règle : light = l'app propose la transition, l'humain valide (P1 ou P2).

#### Délais légaux surveillés (alertes J-180 / J-90 / J-30 / J-7)

| Délai | Base légale |
|-------|-------------|
| Prescription quinquennale charges copro | art. 42 loi 65 |
| Délai signification assignation (8 j min) | CPC |
| Délai opposition à injonction (1 mois) | CPC |
| Péremption d'instance (2 ans) | art. 386 CPC |
| Délai exécution jugement (10 ans) | art. L111-4 CPCE |

#### Calculs financiers (3 composantes)

```
Principal       = somme charges impayées (saisi par syndic, depuis date d'exigibilité)
Intérêts légaux = Principal × Taux légal semestriel × (durée en jours / 365)
Article 700     = montant fixe par dossier, saisi par Nancy
```

Hors v1 : frais huissier, frais greffe (saisie manuelle au cas par cas).

#### Imputation paiements partiels

Pas d'imputation automatique. L'app propose la règle légale (art. 1342-10 Code civil : frais → intérêts → principal) mais le syndic ou l'avocat peut **modifier** l'imputation dossier par dossier.

#### Templates d'actes (à fournir par Nancy)

1. Mise en demeure avocat
2. Requête en injonction de payer
3. Assignation au fond

**TODO bloquant** : récupérer les 3 templates SECIB avant la semaine 5.

#### Pièces — wizard intelligent

```
TOUJOURS demandé :
  ✓ Décompte de charges détaillé          (obligatoire)
  ✓ PV d'AG approuvant les comptes        (recommandée)
  ✓ Mandat de syndic en cours             (recommandée)
  ✓ Mise en demeure préalable du syndic   (recommandée)
  ✓ Relevé d'identité du débiteur         (utile)

CONDITIONNEL (selon cas spécial coché) :
  ✓ État daté / pré-état daté             (si vente en cours)
  ✓ Acte de notoriété + déclaration succession (si débiteur décédé)
  ✓ Liste des indivisaires + état civil   (si indivision)
  ✓ Justificatif redressement/liquidation (si procédure collective)
  ✓ Bail locatif + identité du locataire  (si lot loué)
```

#### Cas spéciaux IN v1

| Cas spécial | Impact template | Procédure spécifique |
|-------------|----------------|---------------------|
| **Indivision** | Variante des 3 templates avec pluralité de défendeurs | Assignation de TOUS les indivisaires |
| **Débiteur décédé** | Variante "contre la succession" | Action contre héritiers/succession |
| **Redressement/liquidation** | ⚠️ Pas d'assignation — **Déclaration de créance** au mandataire | Procédure totalement différente |
| **Lot loué** | Procédure annexe possible | Saisie loyers entre mains locataire |
| **Plusieurs lots même débiteur** | Un dossier global | Regroupement procédural |

⚠️ Signal d'alerte : redressement/liquidation est juridiquement très différent (déclaration de créance dans les 2 mois). À reconsidérer en cours de build si pression timing.

---

### #4 Inventaire SECIB précis

#### Décisions clés

- **Auth SECIB** : 1 clé technique unique pour user `immonpl-bot`. Traçabilité humaine vit dans Convex audit log.
- **Limites API** : aucune limite déclarée
- **Création dossier SECIB** : déclenchée au **submit final** du wizard syndic (pas à chaque step)
- **Documents** : push direct GED SECIB au moment où ils sont attachés au dossier
- **Time tracking** : push **automatique nocturne** vers SECIB (batch), écran "à pousser" visible côté NPL
- **Référentiels** : cache local Convex, refresh quotidien (cron Convex)
- **Import dossiers existants** : script one-shot en semaine 0-1 avant ouverture aux syndics

#### Mapping read/write

**WRITE vers SECIB**

```
gw_dossiers_creer            → submit wizard
gw_parties_creer             → submit wizard (débiteur, syndic comme demandeur)
gw_personnes_creer           → si débiteur nouveau
gw_documents_creer           → upload pièces (submit ou post-création)
gw_documents_save_or_update  → maj métadonnées pièce
gw_documents_move            → classement répertoire SECIB
gw_agenda_creer              → audiences, échéances ajoutées par P1/P2
gw_reglements_creer          → quand P3 saisit paiement partiel reçu
gw_factures_creer            → time entries pushées la nuit (si volet facturation)
```

**READ depuis SECIB**

```
gw_dossiers_rechercher       → liste dossier (filtres)
gw_dossiers_detail           → écran détail dossier
gw_dossiers_parties          → afficher parties
gw_dossiers_adversaires      → afficher débiteur côté admin
gw_dossiers_documents        → liste pièces du dossier
gw_dossiers_repertoires      → arborescence GED
gw_documents_liste           → pagination/recherche docs
gw_documents_detail          → métadonnées doc
gw_documents_content/contenu → preview doc dans l'app
gw_personnes_detail          → fiche personne
gw_personnes_dossiers        → dossiers liés à une personne
gw_personnes_contacts        → infos contact
gw_personnes_rechercher      → autocomplete user
gw_agenda_rechercher         → agenda dans l'app
gw_agenda_detail             → détail événement
gw_factures_liste/search     → facturation visible côté NPL
gw_factures_impayees         → KPI dirigeant agence
gw_reglements_liste          → historique paiements
gw_referentiel_codes_activites      → cache local
gw_referentiel_codes_facturation    → cache local
gw_referentiel_matieres_contentieux → cache local
gw_referentiel_intervenants         → cache local
gw_referentiel_etapes_parapheur     → affichage statut parapheur
gw_cabinet_info                     → contexte cabinet
```

#### Non utilisés en v1

`gw_referentiel_codes_agenda`, `gw_referentiel_codes_journal`, `gw_referentiel_types_frais`, `gw_referentiel_tva_taux`, `gw_admin_*`

#### Risques identifiés

- Single point of failure : 1 clé technique → rotation + monitoring
- Traçabilité externe : audit RIN → la chaîne `immonpl-bot` → user Convex doit être documentée
- Pollution SECIB : évitée grâce à la création au submit

---

### #5 Data ownership (SECIB vs Convex)

#### Sources de vérité

- **SECIB** = vérité légale (dossiers, parties, documents, agenda, factures, règlements, référentiels)
- **Convex** = vérité applicative (workflow états, drafts, messages, notes internes, time entries en transit, calculs, alertes, audit, sessions, cache référentiels)

#### Décisions clés

- **Wizard syndic** : draft 100 % Convex pendant le remplissage → push SECIB en une fois au submit final
- **État dossier (9 statuts)** : 100 % Convex. Nancy regardant SECIB direct ne verra pas l'état immonpl → acceptable
- **Notes internes** : double stockage → Convex (vivant, recherche, realtime) + archive auto SECIB (pérennité juridique). Push SECIB en debounce 5 min après dernière modif. Édition uniquement dans immonpl.
- **Pattern d'écriture SECIB** : **fail loud** — pas d'outbox/retry. Si SECIB down, l'utilisateur voit l'erreur immédiatement. Mitigation : monitoring SECIB + banner "SECIB indisponible".
- **TTL cache snapshot** : 5 min pour métadonnées dossier, 24 h pour référentiels, refresh forcé sur clic utilisateur

#### Tableau de propriété

| Donnée | Source de vérité | Notes |
|--------|------------------|-------|
| Dossier (métadonnées légales) | SECIB | Convex cache 5 min |
| Parties (syndic, débiteur, indivisaires) | SECIB | Convex cache |
| Documents officiels | SECIB GED | Convex liste + preview à la demande |
| Factures NPL → syndic | SECIB | Convex lecture |
| Règlements reçus | SECIB | Convex affichage, write SECIB sur saisie |
| Agenda (audiences) | SECIB | Convex lecture, write SECIB sur ajout |
| **État du dossier (9 statuts)** | **Convex** | Notre workflow |
| **Draft wizard** | **Convex** | Auto-save, supprimé au submit |
| **Messages syndic ↔ avocat** | **Convex** | Realtime |
| **Demande de pièces structurée** | **Convex** | Coche/upload statut |
| **Notes internes** | **Convex + archive SECIB** | Édition Convex uniquement |
| **Time entries (en attente push)** | **Convex** | Push nuit vers `gw_factures_creer` |
| **Calculs financiers** | **Convex (calcul) → SECIB (résultat)** | Recalcul à la volée |
| **Alertes/délais** | **Convex** | Cron Convex pour notifier |
| **Audit logs** | **Convex** | RGPD + RIN traçabilité |
| **Référentiels SECIB** | SECIB → cache Convex | Refresh quotidien |

#### Patterns de synchro

```
SECIB → Convex (read-through cache) :
  À l'ouverture d'un dossier, on appelle SECIB et on met à jour le snapshot Convex.
  TTL configurable. Refresh forcé sur clic utilisateur "actualiser".

Convex → SECIB (write-through fail loud) :
  Sur action utilisateur, on appelle SECIB de façon synchrone.
  Si SECIB échoue, l'utilisateur voit l'erreur immédiatement.

Convex → SECIB (batch nocturne) :
  Pour les time entries, push toutes les nuits via cron Convex.
```

---

### #6 Auth & rôles (Logto)

#### Verrouillé

- **Logto karugency** = provider d'auth
- **5 rôles** : `npl_admin`, `npl_assistant`, `npl_avocat` (futur), `syndic_admin`, `syndic_gestionnaire`
- **Organisations** : 1 `org_npl` + 1 `org_syndic_X` par syndic client
- **MFA** : obligatoire `npl_admin` + `syndic_admin` ; recommandé (non obligé) pour les autres
- **Passkey WebAuthn (Touch ID/Face ID)** : IN v1, option (TOTP reste base)
- **Cloisonnement intra-syndic** : aucun — tous les gestionnaires voient tous les dossiers du syndic
- **Session** : 8 h glissante pour tous les rôles
- **Délégation absence** : pas de feature dédiée, `npl_assistant` couvre les absences Nancy
- **Cap users** : illimité v1 + monitoring
- **SSO entreprise** (SAML/OIDC corporate) : OUT v1 → phase 2.1
- **Audit auth** : Logto natif + duplicate Convex (visible admin NPL)
- **Suspension user** : via MCP `suspend_user` Logto

#### Onboarding syndic — flux

```
1. NPL ouvre l'écran "Inviter un syndic"
2. Nancy renseigne : nom du syndic, email du dirigeant (syndic_admin)
3. immonpl crée :
   - org_syndic_X dans Logto
   - user "dirigeant" avec rôle syndic_admin dans cette org
   - email d'invitation envoyé (Logto magic link)
4. Le dirigeant définit son mot de passe + MFA obligatoire
5. Le dirigeant invite ensuite ses gestionnaires depuis son espace
```

#### Visibilité par rôle

```
npl_admin              → tous dossiers, tous syndics, time tracking équipe, facturation
npl_assistant          → tous dossiers, tous syndics, time tracking perso uniquement
npl_avocat (futur)     → dossiers où il/elle est intervenant SECIB

syndic_admin           → tous dossiers de SON syndic + KPIs portefeuille
syndic_gestionnaire    → tous dossiers de SON syndic
```

#### Mapping user Logto ↔ user SECIB

Toutes les actions SECIB sont signées `immonpl-bot`. Côté Convex, chaque write est tagué avec le `logto_user_id` réel. Sur les pushes SECIB, on stocke en métadonnées du document/dossier SECIB le `logto_user_id` pour la chaîne d'audit.

---

### #7 Architecture technique

#### Topologie

```
                       ┌────────────────────────────────┐
                       │  Frontend React PWA            │
                       │  https://immo.nplavocat.com    │
                       │  (déjà déployé Coolify)        │
                       └──────────────┬─────────────────┘
                                      │ HTTPS
                                      ▼
        ┌──────────────────────────────────────────────────┐
        │   VPS Coolify Hostinger France (mutualisé)        │
        │                                                   │
        │   • Convex Backend (docker)                       │
        │   • Postgres dédié Convex                         │
        │   • MinIO (S3, drafts + exports)                  │
        │   • Convex Dashboard (IP-restricted admin)        │
        │   • Sentry self-hosted                            │
        │   • Caddy (reverse proxy + TLS auto)              │
        └──────┬───────────────┬───────────────────────────┘
               │ HTTPS          │ HTTPS
               ▼                ▼
   ┌────────────────────────┐   ┌────────────────────────┐
   │ apisecib.nplavocat.com │   │  auth.karugency.com    │
   │ (gateway SECIB déjà    │   │  (Logto karugency)     │
   │  hostée Coolify)       │   │                        │
   └──────────┬─────────────┘   └────────────────────────┘
              ▼
   ┌────────────────────┐
   │   SECIB v8.1.4     │
   └────────────────────┘

Backups OVH Object Storage (souveraineté FR) ← cron quotidien Postgres + MinIO
```

#### Sous-domaines

| URL | Service |
|-----|---------|
| `immo.nplavocat.com` | Frontend React PWA |
| `apisecib.nplavocat.com` | API SECIB (existant) |
| `convex.immo.nplavocat.com` | Backend Convex |
| `admin.immo.nplavocat.com` | Convex Dashboard (IP-restricted) |
| `sentry.immo.nplavocat.com` | Sentry self-hosted (admin only) |
| `auth.karugency.com` | Logto (existant) |

#### Stack

| Couche | Choix |
|--------|-------|
| Frontend | React 19 existant + service worker PWA, build CRA, servi via Caddy |
| Backend | Convex self-hosted (docker-compose officiel) |
| DB Convex | Postgres dédié (instance Coolify séparée) |
| File storage | MinIO sur Coolify (S3-compatible) |
| Bridge SECIB | API existante `apisecib.nplavocat.com` |
| Auth | Logto karugency |
| Email | Resend + React Email |
| Reverse proxy / TLS | Caddy via Coolify, Let's Encrypt auto |
| Monitoring | Sentry self-hosted, alertes Coolify, logs centralisés |
| Backups | Postgres + MinIO → OVH Object Storage chiffrés |
| CI/CD | GitHub Actions → webhook Coolify ; Convex CLI |
| Environnements | Prod uniquement v1 + feature flags |
| Secrets | Coolify env vars chiffrés |

#### Risques d'archi

- Mutualisation VPS : monitoring serré, isolation réseau Coolify
- Couplage SECIB : monitoring de la gateway, page d'erreur amicale
- Pas de staging : feature flag + cohorte syndic restreinte

---

### #8 Sécurité & conformité

#### Cadre

| Cadre | Impact |
|-------|--------|
| RGPD | Base légale, registre, DPA, droits, hébergement EU |
| RIN Barreau | Secret professionnel, conservation dossiers ≥ 5 ans après clôture |
| Loi Informatique et Libertés | Mentions, info débiteur, CNIL |
| CPC | Conservation pièces, intégrité actes signés |

#### Verrouillé

- **VPS Coolify** : Hostinger France
- **Modèle RGPD** : Syndic = Responsable de traitement, NPL = Sous-traitant, Karugency = Sous-sous-traitant
- **DPO NPL** : Nancy (DPO interne)
- **DPO Karugency** : Karugency en interne (par défaut, à corriger)
- **DPA** : on adapte le modèle DPA existant de NPL + on rédige NPL ↔ Karugency
- **Conservation dossier** : 5 ans après clôture
- **Anonymisation** : à 5 ans + 2 ans, anonymisation (pas purge totale)
- **Test restauration backup** : mensuel automatique (script)

#### Chiffrement & hébergement

- LUKS disque VPS (si pas natif Hostinger)
- MinIO server-side encryption activé
- TLS forcé partout (Caddy + Let's Encrypt), HSTS
- Backups chiffrés client avant push OVH (rclone --crypt ou équivalent)

#### Rétention

| Donnée | Durée |
|--------|-------|
| Dossier de recouvrement | 5 ans après clôture |
| Messages, notes internes | Idem dossier |
| Time entries, factures | 10 ans (fiscal) |
| Audit logs | 3 ans |
| Données débiteur après paiement intégral | 2 ans puis anonymisation |
| Comptes utilisateurs inactifs > 2 ans | Suspension + alerte avant purge |
| Sessions, logs techniques | 90 jours |

#### Droits des personnes (RGPD)

| Droit | Implémentation v1 |
|-------|------------------|
| Accès | Email à `dpo@nplavocat.com` (1 mois SLA) |
| Rectification | Idem |
| Effacement | Restreint par conservation 5 ans, réponse argumentée |
| Opposition | Limité par intérêt légitime créancier |
| Portabilité | Export PDF du dossier sur demande |

#### Sécurité technique

| Mesure | Reco |
|--------|------|
| Rate limiting | 100 req/min/IP général, 5/min sur auth |
| Headers HTTP | CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy strict |
| Anti-CSRF | Tokens sur mutations Convex |
| Logs accès | Tout accès dossier loggué (user + dossier + timestamp + IP) |
| Détection anomalies | Alerte si user accède à > 50 dossiers en 1 h |
| Secrets | Coolify env vars chiffrés, rotation annuelle |
| Tests de restauration backup | Mensuel automatique |

#### Plan d'incident

Procédure 72 h CNIL (notification si fuite données personnelles). Contact incident à définir. Modèle de notification syndics à préparer en semaine 5-6.

---

### #9 UX & Design system applicabilité

> Base : [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) (existant, 409 lignes, mature).

#### Verrouillé

- **WCAG 2.1 AA** = cible audit v1
- **Desktop-first, mobile responsive ensuite**
- **Email** : Resend + React Email, 6 templates initiaux
- **Onboarding** : pilote = accompagnement live, post-pilote = tour guidé interactif + tooltips + vidéo
- **Logo "Immo NPL"** déjà existant — à intégrer
- **Mode sombre OUT v1**
- **i18n** : FR only v1, strings isolées dans `messages.fr.json`
- **Densité différenciée** : admin NPL dense, syndic aéré

#### 6 composants métier à créer

1. `<CaseTimeline>` — chronologie événements
2. `<StatusBadge>` — 9 statuts dossier
3. `<DelayAlert>` — alertes délais avec urgence visuelle
4. `<PieceRequestList>` — demande de pièces structurée
5. `<PaymentImputationEditor>` — édition imputation paiements partiels
6. `<TimeTrackingEntry>` — saisie time entry

#### Standards UX additionnels

- États vides : illustration + titre + 1 action principale
- États de chargement : skeleton screens > 200 ms (pas de spinners centrés)
- États d'erreur : (a) toast Sonner transitoire, (b) banner persistant si SECIB down, (c) page erreur si app cassée
- Notifications in-app : Sonner top-right, 5 s, action "Voir" pour notifs importantes
- Affichage montants : `1 234,56 €` (espace fine, virgule décimale), rouge négatif, vert positif
- Accessibilité clavier : `Cmd+K` palette, `Cmd+/` aide, `N` nouveau dossier

#### Risque acté

P3 gestionnaire indé multi-casquette terrain → desktop-first signifie UX mobile correcte mais pas optimisée. Mitigation : test actif sur tablette dès S4, optimisations mobile ciblées si besoin avant pilote.

---

### #10 Notifications & communications

#### Architecture

```
Triggers (événements métier dans Convex)
        │
        ▼
┌────────────────────────────────────────┐
│  Notification Service (Convex actions) │
│  - décide canal selon event + prefs    │
│  - écrit notif in-app dans Convex      │
└──────┬─────────┬─────────┬─────────────┘
       ▼         ▼         ▼
   In-app    Email     Push web
   (Sonner   (Resend + (PWA + Notification API)
   + drawer) React Email)
```

#### Matrice events × canaux

**Côté Syndic (P3, P4)**

| Événement | 📧 Email | 🔔 In-app | 📱 Push |
|-----------|---------|-----------|--------|
| Demande de pièce par l'avocat | ✅ | ✅ | ✅ (opt-in) |
| Nouveau message de l'avocat | ✅ | ✅ | ✅ |
| Changement de statut dossier | ⚠️ digest | ✅ | — |
| Nouveau document ajouté | ⚠️ digest | ✅ | — |
| Alerte délai (J-30, J-7) | ✅ | ✅ | — |
| Confirmation paiement enregistré | — | ✅ | — |
| Facture émise (P4) | ✅ | ✅ | — |
| Dossier clôturé | ✅ | ✅ | — |

**Côté NPL (P1, P2)**

| Événement | 📧 Email | 🔔 In-app | 📱 Push |
|-----------|---------|-----------|--------|
| Nouveau dossier soumis par syndic | ⚠️ digest matin | ✅ | — |
| Pièce ajoutée par syndic | ⚠️ digest | ✅ | — |
| Message du syndic | ✅ | ✅ | ✅ (opt-in) |
| Alerte délai critique (J-7, J-30) | ✅ matin chaque jour | ✅ | — |
| Échéance audience (J-7) | ✅ | ✅ | — |
| Rappel saisie time tracking fin journée | — | ✅ 18 h | — |
| Erreur push SECIB | ✅ (admin) | ✅ (admin) | — |
| Quota SECIB / backup failed (admin) | ✅ | ✅ | — |

#### Verrouillé

- Push web (PWA) IN v1, opt-in après 2ème connexion
- Digest matin NPL : email 8 h récap
- Préférences user : toggle par catégorie (statuts / messages / alertes / rapports) — 4 toggles email + 4 toggles in-app
- Email "from" : `notifications@immo.nplavocat.com`
- Rétention drawer notifications : 30 jours, archivage auto ensuite
- SMS : OUT v1
- Realtime in-app (Convex) : badges et listes se rafraîchissent sans refresh
- Cooldown anti-spam : 3 emails max/dossier/user/jour, fusion automatique

#### Implémentation

- DKIM / SPF / DMARC sur `nplavocat.com` pour Resend (semaine 1-2)
- React Email templates en cohérence avec le DS (semaine 3)
- Service worker PWA + push subscription (semaine 4)
- Cron Convex pour digest matin 8 h (semaine 4-5)

---

### #11 Modèle économique NPL ↔ Karugency

#### Verrouillé

- **Modèle de relation** : **M5 Hybride co-développement avec royalty**
  - Karugency paye le développement, garde 100 % IP du code
  - NPL paye 0 € d'avance, fournit expertise + premier client + réseau
  - NPL obtient licence d'usage à vie + voix dans la roadmap + crédit "co-créé avec"
  - Karugency reverse **7 %** sur revenus tirés d'autres cabinets que NPL (durée 5 ans)
- **Modèle pricing syndic** : **P5 Freemium**
  - X dossiers gratuits/mois par syndic (à calibrer après pilote, hypothèse : 5)
  - Payant au-delà (~30 € HT par dossier supplémentaire, à valider)
- **Schéma facturation** : Karugency → NPL → Syndic
  - Karugency facture NPL au global (par syndic actif ou flat fee)
  - NPL inclut le coût immonpl dans ses honoraires syndic
  - Le syndic ne voit pas Karugency directement (cohérence sous-traitance avocat-client)
- **Cible revenu** : 750-1500 €/mois en fin de pilote (5 syndics actifs)
- **Exclusivité** : 0 dans les deux sens, Nancy a priorité commerciale sur features
- **Démarrage** : confiance avec Nancy, contrat formel rédigé pendant les premières semaines (signé avant ouverture pilote S6)

#### Critères de succès pilote

- A : 2 syndics actifs après 3 mois
- B : ≥ 70 % nouveaux dossiers via immonpl
- C : NPS Nancy ≥ 50
- D : Économies temps NPL ≥ 20 % par dossier
- E : 0 bug critique résiduel
- F : NPS syndic (P3) ≥ 30

**Decision gate** : 4/6 critères atteints → passage phase 2 ; sinon itération 3 mois.

#### Clauses contrat formel (rédaction S1-S3)

- IP code Karugency 100 %
- Licence à vie gratuite à NPL
- Royalty 7 % sur revenus extérieurs (durée 5 ans, après quoi 0 %)
- Données métier propriété NPL (Karugency = hébergement et droit d'usage anonymisé pour stats)
- Templates d'actes propriété NPL (hébergés sous licence)
- Confidentialité mutuelle 5 ans après fin
- Non-débauchage 12 mois
- Préavis sortie 6 mois + export complet données + 30 j accès
- Crédit "co-créé avec Cabinet Nancy Pierre-Louis" autorisé

---

### #12 GTM pilote

#### Verrouillé

- **Panel pilote** : **2 syndics** en diversité contrôlée
  - Pilote A : indé local 1-3 personnes (cas P3 multi-casquette, mobile-friendly)
  - Pilote B : indé moyen 5-15 personnes structuré (cas P3 + P4 différenciés)
- **Recrutement** : Nancy a déjà identifié ses 2 syndics, **déjà clients NPL avec dossiers actifs dans SECIB** → effet wow immédiat à l'onboarding
- **Tarif pilote** : 100 % gratuit, dossiers illimités, 3 mois
- **Durée pilote** : 3 mois (couvre cycle MED + injonction de payer)
- **Decision gate** : 4/6 critères atteints → passage phase 2 ; sinon itération 3 mois

#### Avantage stratégique "syndics déjà dans SECIB"

- S1 : récupération identifiant SECIB des 2 syndics via `gw_personnes_rechercher`
- S1-2 : développement script d'import (`syndic_SECIB` ↔ `org_syndic_X` Logto + dossiers actifs)
- S5-6 : import des dossiers réels en pré-prod, validation Nancy
- S6 onboarding : les dirigeants syndics arrivent dans immonpl et voient tous leurs dossiers en cours dès la 1ère seconde → effet wow

#### Protocole d'onboarding (1 h par syndic)

1. Visio Nancy + Karugency + dirigeant + gestionnaire
2. Démo live 4 écrans : Dashboard, Nouveau Dossier, Suivi, Messages
3. Création compte syndic_admin → invitation gestionnaire en live
4. Création d'un premier vrai dossier ensemble
5. Q/R + kit syndic : guide PDF 3 pages + vidéo 2 min + contact support direct
6. Email récap le soir avec liens + identifiants

#### Mesure pendant le pilote

| Métrique | Source | Cadence |
|----------|--------|---------|
| Activation : % syndics avec ≥ 1 dossier créé après 7 j | Convex audit logs | Hebdo |
| Usage : nb dossiers/syndic/mois | Convex | Mensuel |
| Vélocité workflow : temps moyen entre 2 transitions | Convex audit | Mensuel |
| Satisfaction P3 : court survey (NPS + 2 questions) | Email J+30, J+60, J+90 | À chaque borne |
| Satisfaction P4 : interview 30 min | Calendly | Mois 2 |
| Temps NPL saved : chronométrage 5 dossiers avant/après | Manuel | Mois 0 + Mois 3 |
| Tickets support | Email/messages | Hebdo |
| Bugs critiques | Sentry + tickets | En continu |

---

### #13 Ressources & contraintes

- **Équipe** : 1 dev (Karugency) — temps plein
- **Compétences** : Convex acquise, Coolify/Docker maîtrisée → ramp-up minimal
- **Budget mensuel outils** : 100 €/mois (couvre Resend, OVH Object Storage, domaines, marge)
- **Runway** : 6 mois (permet itération 3 mois post-pilote sans pression)
- **Nancy** : 3 h/semaine engagement (validation templates, retours, recrutement)
- **Timing** : T+6 semaines avec flexibilité +2-3 semaines, pas d'événement contraignant

⚠️ **Risque structurel** : bus factor 1 — si dev indisponible 2 semaines, tout s'arrête. Mitigation prévue dans plan d'exécution.

---

## Plan d'exécution 6 semaines

### Semaine 0 — Préparation (3-5 jours)

- ✍️ MOU 1 page NPL ↔ Karugency signé (relation M5 + royalty 7 %)
- 📄 Récupération auprès de Nancy : 3 templates SECIB + variantes cas spéciaux + logo NPL haute déf + charte couleurs + modèle DPA NPL/syndic
- 🌐 DNS + domaines : sous-domaines `convex.`, `admin.`, `sentry.`, `notifications.` sous `immo.nplavocat.com` + DKIM/SPF/DMARC Resend
- 🧹 Repo cleanup : virer Supabase deps, mockData, vestiges Emergent. Préparer structure Convex
- 🪪 Logto setup : créer `org_npl` + comptes Nancy/assistante en pré-prod

### Semaine 1 — Fondations

- 🐳 Convex self-hosted déployé Coolify (backend + Postgres + MinIO + dashboard IP-restricted)
- 🛡️ Sentry self-hosted déployé
- 🔑 Logto ↔ Convex auth wiring (middleware JWT, rôles, orgs)
- 📞 Validation appel SECIB depuis Convex action via `apisecib.nplavocat.com` — 1 query "list dossiers" qui ramène vrais data → **proof of life**
- 📧 Resend validé (DKIM ok, premier email test)
- 🚀 CI/CD GitHub Actions → Coolify webhook + Convex CLI deploy
- 🎯 **Gate S1** : auth + 1 lecture SECIB OK = on continue

### Semaine 2 — Modèle de données + import

- 🗄️ Schema Convex complet : `organizations`, `users`, `cases` (state machine), `case_drafts`, `messages`, `notes`, `time_entries`, `notifications`, `notification_preferences`, `audit_logs`, `delay_alerts`, `cached_referentials`
- 🔄 Sync référentiels SECIB → cron quotidien
- 📦 Script import dossiers SECIB des 2 syndics pilotes → Convex (mapping syndic SECIB ↔ org_syndic Logto) — testé en pré-prod
- ✅ Audit logs : tout accès dossier loggué
- 🎯 **Gate S2** : 2 syndics importés avec leurs dossiers SECIB existants = matière du wow effect prête

### Semaine 3 — Portail Syndic lecture

- 🖥️ Dashboard syndic branché Convex (vrais data, realtime)
- 📋 Liste Dossiers + filtres + tri + recherche
- 🔍 Détail Dossier (tabs Suivi / Documents / Messages / Infos) — lecture seule
- 🧩 Composants métier créés : `<CaseTimeline>`, `<StatusBadge>`, `<DelayAlert>`
- 📱 Mobile responsive ajustement (P3 indé tablette)
- 🌍 i18n strings extraites dans `messages.fr.json`
- 🎯 **Gate S3** : un syndic peut "se promener" dans ses dossiers (lecture seule) = squelette UX validé

### Semaine 4 — Wizard + Messages + Email

- 🧙 Wizard Nouveau Dossier branché Convex (draft auto-save entre sessions)
- 🔀 Wizard intelligent par cas spécial (indivision, décédé, redressement, loué, multi-lots)
- 📤 Submit wizard → push SECIB (dossier + parties + documents en transaction) avec fail loud
- 💬 Messages syndic ↔ avocat realtime
- 📋 Demande de pièces structurée (coches + upload)
- 📧 Email templates Resend : invitation, MFA, alerte délai, nouveau message, changement statut, document ajouté
- 📱 Push web PWA (Notification API) + opt-in après 2ème connexion
- 🎯 **Gate S4** : création dossier de bout en bout côté syndic = matière du portail syndic complète

### Semaine 5 — Portail Admin NPL

- 🖥️ Workspace admin 3 colonnes branché Convex
- 📄 Génération des 3 actes depuis templates Nancy (avec variantes cas spéciaux)
- ⏱️ Time tracking + cron nocturne push SECIB (`gw_factures_creer`)
- 📝 Notes internes + debounce 5 min archive auto SECIB
- 💶 Saisie paiements partiels + proposition imputation (override possible)
- 🚨 Alertes délais (cron Convex toutes les nuits, calcul J-180/J-90/J-30/J-7 sur 5 délais)
- 📨 Digest matin 8 h (récap nouveaux dossiers + pièces + délais critiques)
- 🔔 Drawer notifications + historique 30 j
- 🎯 **Gate S5** : Nancy peut traiter un dossier complet workspace = matière du portail admin complète

### Semaine 6 — Polish, conformité, pilote

- ♿ Audit WCAG 2.1 AA (axe-core CI + audit manuel) + corrections
- 🧪 Tests E2E Playwright sur 4 flows critiques (création dossier, transition état, paiement partiel, message)
- 💾 Backups quotidiens Postgres + MinIO → OVH Object Storage chiffrés + script test restore (mensuel cron)
- 📊 Monitoring : alertes Coolify ressources, Sentry digest hebdo, monitoring SECIB API health
- 🚧 Page erreur SECIB down + banner "SECIB indisponible"
- 📘 Documentation utilisateur : kit syndic PDF 3 p + vidéo 2 min hosted + guide rapide P1/P2
- 🤝 Onboarding pilote : 2× 1 h visio (Nancy + Karugency + syndic A puis syndic B)
- 🎉 Ouverture pilote

### Semaines 7–18 — Pilote 3 mois

- Releases hebdo
- Bug critique : SLA 24 h
- Entretien mensuel par syndic (P3 + P4)
- Chronométrage 5 dossiers Nancy mois 0 vs mois 3
- NPS J+30, J+60, J+90
- **Decision Gate T+18 semaines** : 4/6 critères → phase 2 ouverte ; sinon itération

---

## Risques & mitigations

| # | Risque | Probabilité | Impact | Mitigation |
|---|--------|-------------|--------|-----------|
| R1 | Bus factor 1 (Karugency seul, maladie 2 semaines) | Moyenne | Élevé | Doc continue dans repo, accès lecture Nancy au repo, plan de continuité S6 documenté |
| R2 | Templates SECIB pas livrés à temps (Nancy retardée) | Moyenne | Élevé (bloque S5) | Récup S0, relance S2, fallback texte simple si pas livré S5 |
| R3 | SECIB API instabilité (fail loud = UX dégradée) | Faible | Élevé | Monitoring, page erreur amicale, mode degraded read-only en backup |
| R4 | Cas spéciaux explosent le scope (redressement = procédure différente) | Élevée | Moyen | Priorité : indivision + décédé en S4. Redressement + loué + multi-lots fin S5/S6. Si timing serré, redressement reporté phase 2.1 |
| R5 | Adoption P3 plus lente (gestionnaires habitués email) | Moyenne | Élevé | Nancy push fort dès J+1, onboarding live, dashboard "adoption" interne, alerte si syndic inactif J+15 |
| R6 | Désync état Convex ↔ SECIB (Nancy agit direct SECIB) | Moyenne | Moyen | Règle équipe "transitions via immonpl uniquement", formation S0, alerte automatique si dossier modifié SECIB hors immonpl |
| R7 | Fuite confidentialité avocat-client | Très faible | Catastrophique | Audit logs, alerte exfiltration > 50 dossiers/h, chiffrement backups, MFA admins obligatoire, plan incident 72 h CNIL prêt |
| R8 | Désaccord économique en cours de route (M5 ambigu) | Faible | Élevé | MOU S0, contrat formel S3, mise à plat trimestrielle |
| R9 | Logto karugency single point of failure | Faible | Élevé | Backups Logto réguliers, monitoring uptime, plan de migration documenté |
| R10 | Freemium P5 mal calibré (trop généreux = revenu nul, trop strict = adoption freinée) | Élevée | Moyen | Démarrer 100 % gratuit pilote, calibrer le freemium après mois 2 sur data réelle |

---

## Questions ouvertes pour Nancy (Semaine 0)

À faire en 1 réunion 1 h 30 :

1. **Signature MOU** (1 page) : M5 + royalty 7 % + licence à vie NPL + IP Karugency 100 %
2. **Templates SECIB** : les 3 acceptés + leurs variantes pour cas spéciaux. Rythme de livraison : 2 templates en S0, 1 en S2, variantes en S3
3. **Confirmation des 2 syndics pilotes** : noms, contacts, période d'engagement, planning visio onboarding S6
4. **DPA modèles** : NPL fournit le DPA Syndic ↔ NPL actuel pour qu'on le complète. On rédige le DPA NPL ↔ Karugency
5. **Disponibilité Nancy S6** pour les 2 visios d'onboarding (créneaux à bloquer maintenant)
6. **Charte graphique** : logo HD + couleurs cabinet (à intégrer dans le DS)
7. **Engagement transition** : Nancy s'engage à passer ses dossiers via immonpl dès J+1 du pilote (sinon adoption tuée)
8. **Calibrage freemium** : combien de dossiers gratuits/mois/syndic ? Hypothèse : 5 dossiers gratuits puis 30 € HT/dossier supp. À valider en pilote.
9. **DPO Karugency** : Karugency en interne acté (à corriger si externalisé)

---

## Actions immédiates

| Priorité | Action | Effort |
|----------|--------|--------|
| 🔴 P0 | Caler la réunion 1 h 30 avec Nancy (Semaine 0) avec les 9 questions ci-dessus | 30 min |
| 🔴 P0 | Rédiger le MOU 1 page (M5 + royalty + IP + licence) | 1 h |
| 🟠 P1 | Acheter / configurer les sous-domaines `convex.`, `admin.`, `sentry.`, `notifications.` | 30 min |
| 🟠 P1 | Configurer DKIM/SPF/DMARC pour `notifications@immo.nplavocat.com` chez Resend | 1 h |
| 🟠 P1 | Nettoyer le repo : supprimer Supabase deps, mockData, Emergent scripts | 1 h |
| 🟡 P2 | Lire la doc Convex self-hosted en détail (compose, Postgres, S3) | 2 h |
| 🟡 P2 | Préparer le repo Coolify pour le nouveau service Convex (vars d'env, networks) | 1 h |
| 🟡 P2 | Identifier les 5 délais légaux à coder en S5 et leurs articles précis (alertes) | 1 h Nancy |

---

> **En une phrase** : plan clair, dimensionné, défendable — 6 semaines de build solo temps plein avec Convex/Coolify/SECIB déjà en place, 2 syndics pilotes déjà clients NPL avec leurs dossiers SECIB importés pour effet wow immédiat, modèle économique M5 freemium aligné, 10 risques identifiés avec mitigations. Le seul vrai blocker maintenant, c'est la réunion 1 h 30 avec Nancy en Semaine 0.
