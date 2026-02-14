#!/usr/bin/env node

/**
 * IMMO NPL — Directus Schema Setup Script (Phase 2)
 *
 * Creates all 12 custom collections with fields and relations.
 * Run once against a fresh Directus instance.
 *
 * Usage:
 *   DIRECTUS_URL=https://your-directus.com \
 *   DIRECTUS_ADMIN_EMAIL=admin@example.com \
 *   DIRECTUS_ADMIN_PASSWORD=yourpassword \
 *   node apps/directus/scripts/setup-schema.mjs
 */

import { getAccessToken, getDirectusUrl } from './auth.mjs';

let DIRECTUS_URL;
let ADMIN_TOKEN;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function api(method, path, body) {
  const res = await fetch(`${DIRECTUS_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${ADMIN_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }

  if (!res.ok) {
    // If collection already exists, skip silently
    if (res.status === 400 && JSON.stringify(data).includes('already exists')) {
      console.log(`  (already exists, skipping)`);
      return data;
    }
    throw new Error(`${method} ${path} -> ${res.status}: ${JSON.stringify(data)}`);
  }
  return data;
}

async function createCollection(collection, meta, fields) {
  console.log(`\nCreating collection: ${collection}`);
  return api('POST', '/collections', {
    collection,
    meta: { ...meta, singleton: false },
    schema: {},
    fields,
  });
}

async function createField(collection, field) {
  console.log(`  + field: ${collection}.${field.field}`);
  return api('POST', `/fields/${collection}`, field);
}

async function createRelation(relation) {
  const label = `${relation.collection}.${relation.field} -> ${relation.related_collection}`;
  console.log(`  ~ relation: ${label}`);
  return api('POST', '/relations', relation);
}

// ---------------------------------------------------------------------------
// Reusable field builders
// ---------------------------------------------------------------------------

function pkUuid() {
  return {
    field: 'id',
    type: 'uuid',
    schema: { is_primary_key: true, has_auto_increment: false },
    meta: { special: ['uuid'], interface: 'input', readonly: true, hidden: true },
  };
}

function dateCreated() {
  return {
    field: 'date_created',
    type: 'timestamp',
    schema: { is_nullable: true },
    meta: {
      special: ['date-created'],
      interface: 'datetime',
      readonly: true,
      hidden: true,
      width: 'half',
      display: 'datetime',
      display_options: { relative: true },
    },
  };
}

function dateUpdated() {
  return {
    field: 'date_updated',
    type: 'timestamp',
    schema: { is_nullable: true },
    meta: {
      special: ['date-updated'],
      interface: 'datetime',
      readonly: true,
      hidden: true,
      width: 'half',
      display: 'datetime',
      display_options: { relative: true },
    },
  };
}

function userCreated() {
  return {
    field: 'user_created',
    type: 'uuid',
    schema: { is_nullable: true },
    meta: {
      special: ['user-created'],
      interface: 'select-dropdown-m2o',
      readonly: true,
      hidden: true,
      width: 'half',
      display: 'user',
    },
  };
}

function userUpdated() {
  return {
    field: 'user_updated',
    type: 'uuid',
    schema: { is_nullable: true },
    meta: {
      special: ['user-updated'],
      interface: 'select-dropdown-m2o',
      readonly: true,
      hidden: true,
      width: 'half',
      display: 'user',
    },
  };
}

function dropdown(field, choices, opts = {}) {
  return {
    field,
    type: 'string',
    schema: {
      is_nullable: opts.nullable ?? false,
      default_value: opts.default ?? null,
    },
    meta: {
      interface: 'select-dropdown',
      display: 'labels',
      width: opts.width ?? 'half',
      required: opts.required ?? true,
      options: {
        choices: choices.map((c) =>
          typeof c === 'string' ? { text: c, value: c } : c
        ),
      },
      display_options: {
        choices: choices.map((c) =>
          typeof c === 'string' ? { text: c, value: c } : c
        ),
      },
    },
  };
}

function stringField(field, opts = {}) {
  return {
    field,
    type: 'string',
    schema: {
      is_nullable: opts.nullable ?? true,
      max_length: opts.maxLength ?? 255,
      default_value: opts.default ?? null,
      is_unique: opts.unique ?? false,
    },
    meta: {
      interface: 'input',
      width: opts.width ?? 'full',
      required: opts.required ?? false,
      note: opts.note ?? null,
      options: opts.options ?? null,
    },
  };
}

function textField(field, opts = {}) {
  return {
    field,
    type: 'text',
    schema: { is_nullable: opts.nullable ?? true },
    meta: {
      interface: opts.rich ? 'input-rich-text-html' : 'input-multiline',
      width: opts.width ?? 'full',
      required: opts.required ?? false,
      note: opts.note ?? null,
    },
  };
}

function emailField(field, opts = {}) {
  return {
    field,
    type: 'string',
    schema: {
      is_nullable: opts.nullable ?? true,
      is_unique: opts.unique ?? false,
    },
    meta: {
      interface: 'input',
      width: opts.width ?? 'half',
      required: opts.required ?? false,
      options: { iconRight: 'alternate_email' },
      display: 'formatted-value',
      display_options: { prefix: '', suffix: '', format: false },
    },
  };
}

function integerField(field, opts = {}) {
  return {
    field,
    type: 'integer',
    schema: {
      is_nullable: opts.nullable ?? true,
      default_value: opts.default ?? null,
    },
    meta: {
      interface: 'input',
      width: opts.width ?? 'half',
      required: opts.required ?? false,
      note: opts.note ?? null,
    },
  };
}

function decimalField(field, opts = {}) {
  return {
    field,
    type: 'decimal',
    schema: {
      is_nullable: opts.nullable ?? true,
      default_value: opts.default ?? null,
      numeric_precision: 12,
      numeric_scale: 2,
    },
    meta: {
      interface: 'input',
      width: opts.width ?? 'half',
      required: opts.required ?? false,
      note: opts.note ?? null,
      options: { step: 0.01 },
    },
  };
}

function booleanField(field, opts = {}) {
  return {
    field,
    type: 'boolean',
    schema: {
      is_nullable: false,
      default_value: opts.default ?? false,
    },
    meta: {
      interface: 'boolean',
      special: ['cast-boolean'],
      width: opts.width ?? 'half',
      display: 'boolean',
      note: opts.note ?? null,
    },
  };
}

function dateField(field, opts = {}) {
  return {
    field,
    type: 'date',
    schema: { is_nullable: opts.nullable ?? true },
    meta: {
      interface: 'datetime',
      width: opts.width ?? 'half',
      required: opts.required ?? false,
      note: opts.note ?? null,
    },
  };
}

function datetimeField(field, opts = {}) {
  return {
    field,
    type: 'timestamp',
    schema: { is_nullable: opts.nullable ?? true },
    meta: {
      interface: 'datetime',
      width: opts.width ?? 'half',
      required: opts.required ?? false,
      note: opts.note ?? null,
    },
  };
}

function jsonField(field, opts = {}) {
  return {
    field,
    type: 'json',
    schema: { is_nullable: true },
    meta: {
      interface: 'input-code',
      special: ['cast-json'],
      width: opts.width ?? 'full',
      note: opts.note ?? null,
      options: { language: 'json' },
    },
  };
}

/** FK field (uuid) — relation created separately */
function fkField(field, opts = {}) {
  return {
    field,
    type: 'uuid',
    schema: { is_nullable: opts.nullable ?? true },
    meta: {
      interface: 'select-dropdown-m2o',
      special: ['m2o'],
      width: opts.width ?? 'half',
      required: opts.required ?? false,
      note: opts.note ?? null,
      display: 'related-values',
      display_options: opts.displayTemplate
        ? { template: opts.displayTemplate }
        : null,
    },
  };
}

// ---------------------------------------------------------------------------
// 1. SYNDICS
// ---------------------------------------------------------------------------

async function createSyndics() {
  await createCollection(
    'syndics',
    {
      icon: 'business',
      note: 'Clients syndics de copropriete',
      display_template: '{{raison_sociale}}',
      archive_field: 'status',
      archive_value: 'inactif',
      unarchive_value: 'actif',
      sort_field: 'raison_sociale',
    },
    [
      pkUuid(),
      dropdown('status', ['actif', 'inactif', 'suspendu'], {
        default: 'actif',
        required: true,
      }),
      dateCreated(),
      dateUpdated(),
    ]
  );

  // Additional fields
  const fields = [
    stringField('raison_sociale', { required: true }),
    stringField('siret', { maxLength: 14, width: 'half', note: '14 caracteres' }),
    textField('adresse', { required: true }),
    stringField('code_postal', { maxLength: 5, width: 'half', note: '5 caracteres' }),
    stringField('ville', { required: true, width: 'half' }),
    emailField('email_contact', { required: true, unique: true }),
    stringField('telephone', { width: 'half' }),
    stringField('nom_referent', { width: 'half', note: 'Personne de contact' }),
    stringField('prenom_referent', { width: 'half' }),
    fkField('user_id', { note: 'Compte utilisateur Directus', displayTemplate: '{{first_name}} {{last_name}}' }),
    textField('notes_internes', { note: 'Visible admin uniquement' }),
  ];
  for (const f of fields) await createField('syndics', f);

  // Relation: syndics.user_id -> directus_users
  await createRelation({
    collection: 'syndics',
    field: 'user_id',
    related_collection: 'directus_users',
    schema: { on_delete: 'SET NULL' },
    meta: { sort_field: null },
  });
}

// ---------------------------------------------------------------------------
// 2. COPROPRIETES
// ---------------------------------------------------------------------------

async function createCoproprietes() {
  await createCollection(
    'coproprietes',
    {
      icon: 'apartment',
      note: 'Coproprietes gerees par les syndics',
      display_template: '{{nom}}',
    },
    [pkUuid(), dateCreated(), dateUpdated()]
  );

  const fields = [
    stringField('nom', { required: true }),
    textField('adresse', { required: true }),
    stringField('code_postal', { maxLength: 5, width: 'half' }),
    stringField('ville', { required: true, width: 'half' }),
    integerField('nombre_lots', { width: 'half' }),
    fkField('syndic_id', { required: true, displayTemplate: '{{raison_sociale}}' }),
    stringField('reference_interne', { width: 'half', note: 'Reference interne du syndic' }),
  ];
  for (const f of fields) await createField('coproprietes', f);

  await createRelation({
    collection: 'coproprietes',
    field: 'syndic_id',
    related_collection: 'syndics',
    schema: { on_delete: 'SET NULL' },
    meta: {
      one_field: 'coproprietes',
      one_deselect_action: 'nullify',
    },
  });
}

// ---------------------------------------------------------------------------
// 3. DEBITEURS
// ---------------------------------------------------------------------------

async function createDebiteurs() {
  await createCollection(
    'debiteurs',
    {
      icon: 'person',
      note: 'Debiteurs (particuliers ou societes)',
      display_template: '{{nom}} {{prenom}}',
    },
    [pkUuid(), dateCreated(), dateUpdated()]
  );

  const fields = [
    dropdown('type', ['particulier', 'societe'], { required: true }),
    dropdown('civilite', ['M.', 'Mme', 'Mme/M.'], { required: false, nullable: true }),
    stringField('nom', { required: true }),
    stringField('prenom', { width: 'half' }),
    textField('adresse', { required: true }),
    stringField('code_postal', { maxLength: 5, width: 'half' }),
    stringField('ville', { required: true, width: 'half' }),
    emailField('email', { width: 'half' }),
    stringField('telephone', { width: 'half' }),
    stringField('lot_description', { required: true, note: 'ex: Lot 12 - Appt T3' }),
    stringField('siret', { maxLength: 14, width: 'half', note: 'Si societe' }),
    textField('notes'),
  ];
  for (const f of fields) await createField('debiteurs', f);
}

// ---------------------------------------------------------------------------
// 4. DOSSIERS (Hub central)
// ---------------------------------------------------------------------------

async function createDossiers() {
  const statuts = [
    { text: 'Nouveau', value: 'nouveau' },
    { text: 'En cours', value: 'en_cours' },
    { text: 'Mise en demeure', value: 'mise_en_demeure' },
    { text: 'Assignation', value: 'assignation' },
    { text: 'Injonction', value: 'injonction' },
    { text: 'Audience', value: 'audience' },
    { text: 'Jugement', value: 'jugement' },
    { text: 'Execution', value: 'execution' },
    { text: 'Paye', value: 'paye' },
    { text: 'Cloture', value: 'cloture' },
    { text: 'Irrecovrable', value: 'irrecovrable' },
  ];

  const phases = [
    { text: 'Amiable', value: 'amiable' },
    { text: 'Pre-contentieux', value: 'pre_contentieux' },
    { text: 'Contentieux', value: 'contentieux' },
    { text: 'Execution', value: 'execution' },
  ];

  const priorites = [
    { text: 'Basse', value: 'basse' },
    { text: 'Normale', value: 'normale' },
    { text: 'Haute', value: 'haute' },
    { text: 'Urgente', value: 'urgente' },
  ];

  await createCollection(
    'dossiers',
    {
      icon: 'folder_open',
      note: 'Dossiers de recouvrement (hub central)',
      display_template: '{{reference}} — {{titre}}',
      archive_field: 'statut',
      archive_value: 'cloture',
      unarchive_value: 'en_cours',
    },
    [
      pkUuid(),
      dateCreated(),
      dateUpdated(),
      userCreated(),
      userUpdated(),
    ]
  );

  const fields = [
    stringField('reference', { required: true, unique: true, note: 'Auto-genere: LR-YYYY-NNN' }),
    dropdown('statut', statuts, { default: 'nouveau', required: true }),
    dropdown('phase', phases, { default: 'amiable', required: true }),
    stringField('titre', { required: true }),
    textField('description'),
    fkField('syndic_id', { required: true, displayTemplate: '{{raison_sociale}}' }),
    fkField('copropriete_id', { required: true, displayTemplate: '{{nom}}' }),
    fkField('debiteur_id', { required: true, displayTemplate: '{{nom}} {{prenom}}' }),
    fkField('avocat_responsable_id', { displayTemplate: '{{first_name}} {{last_name}}', note: 'Avocat en charge' }),
    dateField('date_ouverture', { required: true }),
    dateField('date_cloture'),
    dropdown('priorite', priorites, { default: 'normale', required: true }),
    stringField('juridiction', { width: 'half', note: 'ex: TJ Paris 18e' }),
    stringField('numero_rg', { width: 'half', note: 'Numero de role' }),
    datetimeField('prochaine_audience'),
    decimalField('montant_initial', { required: true, note: 'Creance initiale en EUR' }),
    decimalField('montant_actualise', { note: 'Avec interets et frais' }),
    decimalField('montant_recouvre', { default: 0, note: 'Montant deja recouvre' }),
  ];
  for (const f of fields) await createField('dossiers', f);

  // Relations
  await createRelation({
    collection: 'dossiers',
    field: 'syndic_id',
    related_collection: 'syndics',
    schema: { on_delete: 'SET NULL' },
    meta: { one_field: 'dossiers', one_deselect_action: 'nullify' },
  });
  await createRelation({
    collection: 'dossiers',
    field: 'copropriete_id',
    related_collection: 'coproprietes',
    schema: { on_delete: 'SET NULL' },
    meta: { one_field: null, one_deselect_action: 'nullify' },
  });
  await createRelation({
    collection: 'dossiers',
    field: 'debiteur_id',
    related_collection: 'debiteurs',
    schema: { on_delete: 'SET NULL' },
    meta: { one_field: null, one_deselect_action: 'nullify' },
  });
  await createRelation({
    collection: 'dossiers',
    field: 'avocat_responsable_id',
    related_collection: 'directus_users',
    schema: { on_delete: 'SET NULL' },
    meta: { sort_field: null },
  });
}

// ---------------------------------------------------------------------------
// 5. CREANCES
// ---------------------------------------------------------------------------

async function createCreances() {
  const types = [
    { text: 'Charges copropriete', value: 'charges_copropriete' },
    { text: 'Travaux', value: 'travaux' },
    { text: 'Fond travaux', value: 'fond_travaux' },
    { text: 'Penalites', value: 'penalites' },
    { text: 'Frais recouvrement', value: 'frais_recouvrement' },
    { text: 'Interets', value: 'interets' },
    { text: 'Article 700', value: 'article_700' },
    { text: 'Depens', value: 'depens' },
  ];

  const statuts = [
    { text: 'Du', value: 'du' },
    { text: 'Partiellement paye', value: 'partiellement_paye' },
    { text: 'Paye', value: 'paye' },
    { text: 'Conteste', value: 'conteste' },
  ];

  await createCollection(
    'creances',
    {
      icon: 'receipt_long',
      note: 'Detail des creances par dossier',
      display_template: '{{libelle}} — {{montant}} EUR',
    },
    [pkUuid(), dateCreated()]
  );

  const fields = [
    fkField('dossier_id', { required: true, displayTemplate: '{{reference}}' }),
    dropdown('type', types, { required: true }),
    stringField('libelle', { required: true, note: 'ex: Charges Q1-Q3 2024' }),
    decimalField('montant', { required: true }),
    dateField('periode_debut', { width: 'half' }),
    dateField('periode_fin', { width: 'half' }),
    dateField('date_exigibilite'),
    dropdown('statut', statuts, { default: 'du', required: true }),
    decimalField('montant_paye', { default: 0 }),
    textField('notes'),
  ];
  for (const f of fields) await createField('creances', f);

  await createRelation({
    collection: 'creances',
    field: 'dossier_id',
    related_collection: 'dossiers',
    schema: { on_delete: 'CASCADE' },
    meta: { one_field: 'creances', one_deselect_action: 'nullify' },
  });
}

// ---------------------------------------------------------------------------
// 6. DOCUMENTS
// ---------------------------------------------------------------------------

async function createDocuments() {
  const types = [
    { text: 'Releve de compte', value: 'releve_compte' },
    { text: 'Appel de fonds', value: 'appel_fonds' },
    { text: 'Contrat syndic', value: 'contrat_syndic' },
    { text: 'Mise en demeure', value: 'mise_en_demeure' },
    { text: 'Assignation', value: 'assignation' },
    { text: 'Jugement', value: 'jugement' },
    { text: 'Proces-verbal', value: 'proces_verbal' },
    { text: 'Correspondance', value: 'correspondance' },
    { text: 'Autre', value: 'autre' },
  ];

  await createCollection(
    'documents',
    {
      icon: 'description',
      note: 'Documents attaches aux dossiers',
      display_template: '{{titre}}',
    },
    [pkUuid(), dateCreated()]
  );

  const fields = [
    fkField('dossier_id', { required: true, displayTemplate: '{{reference}}' }),
    stringField('titre', { required: true }),
    dropdown('type', types, { required: true }),
    {
      field: 'fichier',
      type: 'uuid',
      schema: { is_nullable: true },
      meta: {
        interface: 'file',
        special: ['file'],
        width: 'full',
        note: 'Fichier uploade',
      },
    },
    textField('description'),
    booleanField('confidentiel', { default: false, note: 'Visible admin uniquement si active' }),
    fkField('uploaded_by', { displayTemplate: '{{first_name}} {{last_name}}', note: 'Uploade par' }),
    dateField('date_document', { note: 'Date du document original' }),
  ];
  for (const f of fields) await createField('documents', f);

  await createRelation({
    collection: 'documents',
    field: 'dossier_id',
    related_collection: 'dossiers',
    schema: { on_delete: 'CASCADE' },
    meta: { one_field: 'documents', one_deselect_action: 'nullify' },
  });
  await createRelation({
    collection: 'documents',
    field: 'fichier',
    related_collection: 'directus_files',
    schema: { on_delete: 'SET NULL' },
    meta: { sort_field: null },
  });
  await createRelation({
    collection: 'documents',
    field: 'uploaded_by',
    related_collection: 'directus_users',
    schema: { on_delete: 'SET NULL' },
    meta: { sort_field: null },
  });
}

// ---------------------------------------------------------------------------
// 7. EVENEMENTS (Timeline)
// ---------------------------------------------------------------------------

async function createEvenements() {
  const types = [
    { text: 'Creation', value: 'creation' },
    { text: 'Changement statut', value: 'changement_statut' },
    { text: 'Document ajoute', value: 'document_ajoute' },
    { text: 'Mise en demeure', value: 'mise_en_demeure' },
    { text: 'Assignation', value: 'assignation' },
    { text: 'Audience', value: 'audience' },
    { text: 'Jugement', value: 'jugement' },
    { text: 'Paiement', value: 'paiement' },
    { text: 'Note', value: 'note' },
    { text: 'Communication', value: 'communication' },
    { text: 'Autre', value: 'autre' },
  ];

  await createCollection(
    'evenements',
    {
      icon: 'timeline',
      note: 'Evenements de la timeline des dossiers',
      display_template: '{{titre}}',
      sort_field: 'date_evenement',
    },
    [pkUuid(), dateCreated()]
  );

  const fields = [
    fkField('dossier_id', { required: true, displayTemplate: '{{reference}}' }),
    dropdown('type', types, { required: true }),
    stringField('titre', { required: true }),
    textField('description'),
    datetimeField('date_evenement', { required: true }),
    fkField('auteur_id', { displayTemplate: '{{first_name}} {{last_name}}' }),
    jsonField('metadata', { note: 'Donnees supplementaires (ancien statut, etc.)' }),
    booleanField('visible_client', { default: true, note: 'Visible sur le portail client' }),
  ];
  for (const f of fields) await createField('evenements', f);

  await createRelation({
    collection: 'evenements',
    field: 'dossier_id',
    related_collection: 'dossiers',
    schema: { on_delete: 'CASCADE' },
    meta: { one_field: 'evenements', one_deselect_action: 'nullify' },
  });
  await createRelation({
    collection: 'evenements',
    field: 'auteur_id',
    related_collection: 'directus_users',
    schema: { on_delete: 'SET NULL' },
    meta: { sort_field: null },
  });
}

// ---------------------------------------------------------------------------
// 8. TACHES
// ---------------------------------------------------------------------------

async function createTaches() {
  const types = [
    { text: 'Tache', value: 'tache' },
    { text: 'Audience', value: 'audience' },
    { text: 'Echeance', value: 'echeance' },
    { text: 'Relance', value: 'relance' },
    { text: 'Rendez-vous', value: 'rdv' },
  ];

  const statuts = [
    { text: 'A faire', value: 'a_faire' },
    { text: 'En cours', value: 'en_cours' },
    { text: 'Terminee', value: 'terminee' },
    { text: 'Annulee', value: 'annulee' },
  ];

  const priorites = [
    { text: 'Basse', value: 'basse' },
    { text: 'Normale', value: 'normale' },
    { text: 'Haute', value: 'haute' },
    { text: 'Urgente', value: 'urgente' },
  ];

  await createCollection(
    'taches',
    {
      icon: 'task_alt',
      note: 'Taches, audiences, echeances, relances, rdv',
      display_template: '{{titre}}',
      sort_field: 'date_echeance',
      archive_field: 'statut',
      archive_value: 'annulee',
      unarchive_value: 'a_faire',
    },
    [pkUuid(), dateCreated(), dateUpdated()]
  );

  const fields = [
    fkField('dossier_id', { nullable: true, displayTemplate: '{{reference}}', note: 'Optionnel' }),
    dropdown('type', types, { required: true }),
    stringField('titre', { required: true }),
    textField('description'),
    dropdown('statut', statuts, { default: 'a_faire', required: true }),
    dropdown('priorite', priorites, { default: 'normale', required: true }),
    fkField('assignee_id', { displayTemplate: '{{first_name}} {{last_name}}', note: 'Assigne a' }),
    datetimeField('date_echeance', { required: true }),
    datetimeField('date_rappel', { note: 'Date de rappel email' }),
    stringField('lieu', { width: 'half', note: 'ex: TJ Paris' }),
    stringField('salle', { width: 'half', note: 'ex: Salle 4.12' }),
    datetimeField('terminee_le'),
  ];
  for (const f of fields) await createField('taches', f);

  await createRelation({
    collection: 'taches',
    field: 'dossier_id',
    related_collection: 'dossiers',
    schema: { on_delete: 'SET NULL' },
    meta: { one_field: 'taches', one_deselect_action: 'nullify' },
  });
  await createRelation({
    collection: 'taches',
    field: 'assignee_id',
    related_collection: 'directus_users',
    schema: { on_delete: 'SET NULL' },
    meta: { sort_field: null },
  });
}

// ---------------------------------------------------------------------------
// 9. FACTURES (created before heures_facturables for FK)
// ---------------------------------------------------------------------------

async function createFactures() {
  const statuts = [
    { text: 'Brouillon', value: 'brouillon' },
    { text: 'Emise', value: 'emise' },
    { text: 'Envoyee', value: 'envoyee' },
    { text: 'Payee', value: 'payee' },
    { text: 'En retard', value: 'en_retard' },
    { text: 'Annulee', value: 'annulee' },
  ];

  const modes = [
    { text: 'Virement', value: 'virement' },
    { text: 'Cheque', value: 'cheque' },
    { text: 'Prelevement', value: 'prelevement' },
    { text: 'Carte', value: 'carte' },
  ];

  await createCollection(
    'factures',
    {
      icon: 'receipt',
      note: 'Factures emises aux syndics',
      display_template: '{{numero}} — {{montant_ttc}} EUR',
      archive_field: 'statut',
      archive_value: 'annulee',
      unarchive_value: 'brouillon',
    },
    [pkUuid(), dateCreated(), dateUpdated()]
  );

  const fields = [
    stringField('numero', { required: true, unique: true, note: 'ex: F-2024-0001' }),
    fkField('syndic_id', { required: true, displayTemplate: '{{raison_sociale}}' }),
    fkField('dossier_id', { nullable: true, displayTemplate: '{{reference}}', note: 'Optionnel' }),
    dropdown('statut', statuts, { default: 'brouillon', required: true }),
    dateField('date_emission', { width: 'half' }),
    dateField('date_echeance', { width: 'half' }),
    dateField('date_paiement', { width: 'half' }),
    decimalField('montant_ht', { required: true }),
    decimalField('taux_tva', { default: 20.0, note: 'Taux TVA en %' }),
    decimalField('montant_tva', { note: 'Calcule automatiquement' }),
    decimalField('montant_ttc', { note: 'Calcule automatiquement' }),
    dropdown('mode_paiement', modes, { required: false, nullable: true }),
    textField('notes'),
    {
      field: 'fichier_pdf',
      type: 'uuid',
      schema: { is_nullable: true },
      meta: {
        interface: 'file',
        special: ['file'],
        width: 'full',
        note: 'PDF de la facture',
      },
    },
  ];
  for (const f of fields) await createField('factures', f);

  await createRelation({
    collection: 'factures',
    field: 'syndic_id',
    related_collection: 'syndics',
    schema: { on_delete: 'SET NULL' },
    meta: { one_field: 'factures', one_deselect_action: 'nullify' },
  });
  await createRelation({
    collection: 'factures',
    field: 'dossier_id',
    related_collection: 'dossiers',
    schema: { on_delete: 'SET NULL' },
    meta: { one_field: 'factures', one_deselect_action: 'nullify' },
  });
  await createRelation({
    collection: 'factures',
    field: 'fichier_pdf',
    related_collection: 'directus_files',
    schema: { on_delete: 'SET NULL' },
    meta: { sort_field: null },
  });
}

// ---------------------------------------------------------------------------
// 10. HEURES FACTURABLES
// ---------------------------------------------------------------------------

async function createHeuresFacturables() {
  const categories = [
    { text: 'Consultation', value: 'consultation' },
    { text: 'Redaction', value: 'redaction' },
    { text: 'Audience', value: 'audience' },
    { text: 'Correspondance', value: 'correspondance' },
    { text: 'Recherche', value: 'recherche' },
    { text: 'Deplacement', value: 'deplacement' },
    { text: 'Autre', value: 'autre' },
  ];

  await createCollection(
    'heures_facturables',
    {
      icon: 'schedule',
      note: 'Heures facturables des avocats sur les dossiers',
      display_template: '{{description}} — {{duree_minutes}} min',
      sort_field: 'date',
    },
    [pkUuid(), dateCreated()]
  );

  const fields = [
    fkField('dossier_id', { required: true, displayTemplate: '{{reference}}' }),
    fkField('avocat_id', { required: true, displayTemplate: '{{first_name}} {{last_name}}', note: 'Avocat' }),
    dateField('date', { required: true }),
    integerField('duree_minutes', { required: true, note: 'Duree en minutes' }),
    stringField('description', { required: true, note: 'ex: Redaction assignation' }),
    dropdown('categorie', categories, { required: true }),
    decimalField('taux_horaire', { note: 'Si different du taux par defaut' }),
    booleanField('facturable', { default: true }),
    fkField('facture_id', { nullable: true, displayTemplate: '{{numero}}', note: 'Null = pas encore facture' }),
  ];
  for (const f of fields) await createField('heures_facturables', f);

  await createRelation({
    collection: 'heures_facturables',
    field: 'dossier_id',
    related_collection: 'dossiers',
    schema: { on_delete: 'CASCADE' },
    meta: { one_field: 'heures_facturables', one_deselect_action: 'nullify' },
  });
  await createRelation({
    collection: 'heures_facturables',
    field: 'avocat_id',
    related_collection: 'directus_users',
    schema: { on_delete: 'SET NULL' },
    meta: { sort_field: null },
  });
  await createRelation({
    collection: 'heures_facturables',
    field: 'facture_id',
    related_collection: 'factures',
    schema: { on_delete: 'SET NULL' },
    meta: { one_field: 'heures', one_deselect_action: 'nullify' },
  });
}

// ---------------------------------------------------------------------------
// 11. MESSAGES
// ---------------------------------------------------------------------------

async function createMessages() {
  await createCollection(
    'messages',
    {
      icon: 'chat_bubble',
      note: 'Messagerie entre syndics et avocats',
      display_template: '{{contenu}}',
      sort_field: 'date_created',
    },
    [pkUuid(), dateCreated()]
  );

  const fields = [
    fkField('dossier_id', { required: true, displayTemplate: '{{reference}}' }),
    fkField('expediteur_id', { required: true, displayTemplate: '{{first_name}} {{last_name}}' }),
    textField('contenu', { required: true }),
    booleanField('lu', { default: false }),
    datetimeField('date_lecture'),
    {
      field: 'piece_jointe',
      type: 'uuid',
      schema: { is_nullable: true },
      meta: {
        interface: 'file',
        special: ['file'],
        width: 'full',
        note: 'Piece jointe optionnelle',
      },
    },
    fkField('parent_id', { nullable: true, displayTemplate: '{{contenu}}', note: 'Message parent (thread)' }),
  ];
  for (const f of fields) await createField('messages', f);

  await createRelation({
    collection: 'messages',
    field: 'dossier_id',
    related_collection: 'dossiers',
    schema: { on_delete: 'CASCADE' },
    meta: { one_field: 'messages', one_deselect_action: 'nullify' },
  });
  await createRelation({
    collection: 'messages',
    field: 'expediteur_id',
    related_collection: 'directus_users',
    schema: { on_delete: 'SET NULL' },
    meta: { sort_field: null },
  });
  await createRelation({
    collection: 'messages',
    field: 'piece_jointe',
    related_collection: 'directus_files',
    schema: { on_delete: 'SET NULL' },
    meta: { sort_field: null },
  });
  // Self-referencing relation for threads
  await createRelation({
    collection: 'messages',
    field: 'parent_id',
    related_collection: 'messages',
    schema: { on_delete: 'SET NULL' },
    meta: { one_field: 'replies', one_deselect_action: 'nullify' },
  });
}

// ---------------------------------------------------------------------------
// 12. NOTES
// ---------------------------------------------------------------------------

async function createNotes() {
  const types = [
    { text: 'Interne', value: 'interne' },
    { text: 'Strategie', value: 'strategie' },
    { text: 'Memo audience', value: 'memo_audience' },
    { text: 'Compte-rendu', value: 'compte_rendu' },
  ];

  await createCollection(
    'notes',
    {
      icon: 'sticky_note_2',
      note: 'Notes internes sur les dossiers (admin only)',
      display_template: '{{contenu}}',
    },
    [pkUuid(), dateCreated(), dateUpdated()]
  );

  const fields = [
    fkField('dossier_id', { required: true, displayTemplate: '{{reference}}' }),
    fkField('auteur_id', { required: true, displayTemplate: '{{first_name}} {{last_name}}' }),
    textField('contenu', { required: true, rich: true }),
    dropdown('type', types, { default: 'interne', required: true }),
    booleanField('epingle', { default: false, note: 'Epingler en haut' }),
  ];
  for (const f of fields) await createField('notes', f);

  await createRelation({
    collection: 'notes',
    field: 'dossier_id',
    related_collection: 'dossiers',
    schema: { on_delete: 'CASCADE' },
    meta: { one_field: 'notes', one_deselect_action: 'nullify' },
  });
  await createRelation({
    collection: 'notes',
    field: 'auteur_id',
    related_collection: 'directus_users',
    schema: { on_delete: 'SET NULL' },
    meta: { sort_field: null },
  });
}

// ---------------------------------------------------------------------------
// MAIN
// ---------------------------------------------------------------------------

async function main() {
  DIRECTUS_URL = getDirectusUrl();
  ADMIN_TOKEN = await getAccessToken();

  console.log('='.repeat(60));
  console.log('IMMO NPL — Directus Schema Setup (Phase 2)');
  console.log(`Target: ${DIRECTUS_URL}`);
  console.log('='.repeat(60));

  // Verify connectivity
  try {
    const info = await api('GET', '/server/info');
    console.log(`Directus version: ${info.data?.version ?? 'unknown'}\n`);
  } catch (e) {
    console.error('Cannot reach Directus. Check credentials.');
    process.exit(1);
  }

  // Create collections in dependency order
  // Independent collections first
  await createSyndics();
  await createDebiteurs();

  // Depends on syndics
  await createCoproprietes();

  // Depends on syndics, coproprietes, debiteurs
  await createDossiers();

  // Depends on dossiers
  await createCreances();
  await createDocuments();
  await createEvenements();
  await createTaches();

  // Factures depends on syndics, dossiers
  await createFactures();

  // Heures depends on dossiers, factures
  await createHeuresFacturables();

  // Messages depends on dossiers
  await createMessages();

  // Notes depends on dossiers
  await createNotes();

  console.log('\n' + '='.repeat(60));
  console.log('Schema setup complete! 12 collections created.');
  console.log('='.repeat(60));
  console.log('\nNext steps:');
  console.log('  1. Verify collections in Directus Admin UI');
  console.log('  2. Run Phase 3: Roles, permissions, extensions');
  console.log('  3. Export a snapshot: directus schema snapshot ./snapshot.yaml');
}

main().catch((err) => {
  console.error('\nFATAL ERROR:', err.message);
  process.exit(1);
});
