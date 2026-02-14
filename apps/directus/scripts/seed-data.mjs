#!/usr/bin/env node

/**
 * IMMO NPL — Seed Data Script
 *
 * Populates the Directus instance with realistic test data.
 * Run after setup-schema.mjs and setup-roles.mjs.
 *
 * Usage:
 *   DIRECTUS_URL=https://your-directus.com \
 *   DIRECTUS_ADMIN_EMAIL=admin@example.com \
 *   DIRECTUS_ADMIN_PASSWORD=yourpassword \
 *   node apps/directus/scripts/seed-data.mjs
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
    throw new Error(`${method} ${path} -> ${res.status}: ${JSON.stringify(data)}`);
  }
  return data;
}

async function createItem(collection, item) {
  const result = await api('POST', `/items/${collection}`, item);
  return result.data;
}

async function createUser(userData) {
  const result = await api('POST', '/users', userData);
  return result.data;
}

async function getRoleByName(name) {
  const result = await api('GET', `/roles?filter[name][_eq]=${encodeURIComponent(name)}`);
  return result.data?.[0];
}

// ---------------------------------------------------------------------------
// Seed Data
// ---------------------------------------------------------------------------

async function main() {
  DIRECTUS_URL = getDirectusUrl();
  ADMIN_TOKEN = await getAccessToken();

  console.log('='.repeat(60));
  console.log('IMMO NPL — Seed Data');
  console.log(`Target: ${DIRECTUS_URL}`);
  console.log('='.repeat(60));

  // Get role IDs
  const avocatRole = await getRoleByName('Avocat');
  const syndicRole = await getRoleByName('Syndic');

  if (!avocatRole || !syndicRole) {
    console.error('Roles not found. Run setup-roles.mjs first.');
    process.exit(1);
  }

  console.log(`\nAvocat role: ${avocatRole.id}`);
  console.log(`Syndic role: ${syndicRole.id}`);

  // -----------------------------------------------------------------------
  // 1. Create users
  // -----------------------------------------------------------------------
  console.log('\n--- Creating users ---');

  const avocat1 = await createUser({
    first_name: 'Pierre',
    last_name: 'Duval',
    email: 'pierre.duval@legalrecover.fr',
    password: 'Test1234!',
    role: avocatRole.id,
    status: 'active',
  });
  console.log(`  Avocat: ${avocat1.email}`);

  const avocat2 = await createUser({
    first_name: 'Marie',
    last_name: 'Laurent',
    email: 'marie.laurent@legalrecover.fr',
    password: 'Test1234!',
    role: avocatRole.id,
    status: 'active',
  });
  console.log(`  Avocat: ${avocat2.email}`);

  const syndicUser1 = await createUser({
    first_name: 'Jean',
    last_name: 'Martin',
    email: 'j.martin@foncia-idf.fr',
    password: 'Test1234!',
    role: syndicRole.id,
    status: 'active',
  });
  console.log(`  Syndic user: ${syndicUser1.email}`);

  const syndicUser2 = await createUser({
    first_name: 'Sophie',
    last_name: 'Petit',
    email: 's.petit@nexity-gestion.fr',
    password: 'Test1234!',
    role: syndicRole.id,
    status: 'active',
  });
  console.log(`  Syndic user: ${syndicUser2.email}`);

  // -----------------------------------------------------------------------
  // 2. Syndics
  // -----------------------------------------------------------------------
  console.log('\n--- Creating syndics ---');

  const syndic1 = await createItem('syndics', {
    raison_sociale: 'Foncia Ile-de-France',
    siret: '12345678901234',
    adresse: '15 rue de la Paix',
    code_postal: '75002',
    ville: 'Paris',
    email_contact: 'contact@foncia-idf.fr',
    telephone: '01 42 00 00 01',
    nom_referent: 'Martin',
    prenom_referent: 'Jean',
    user_id: syndicUser1.id,
    status: 'actif',
  });
  console.log(`  Syndic: ${syndic1.raison_sociale} (${syndic1.id})`);

  const syndic2 = await createItem('syndics', {
    raison_sociale: 'Nexity Gestion',
    siret: '98765432109876',
    adresse: '25 avenue des Champs-Elysees',
    code_postal: '75008',
    ville: 'Paris',
    email_contact: 'gestion@nexity-gestion.fr',
    telephone: '01 55 00 00 02',
    nom_referent: 'Petit',
    prenom_referent: 'Sophie',
    user_id: syndicUser2.id,
    status: 'actif',
  });
  console.log(`  Syndic: ${syndic2.raison_sociale} (${syndic2.id})`);

  // -----------------------------------------------------------------------
  // 3. Coproprietes
  // -----------------------------------------------------------------------
  console.log('\n--- Creating coproprietes ---');

  const copro1 = await createItem('coproprietes', {
    nom: 'Residence Les Tilleuls',
    adresse: '12 rue des Tilleuls',
    code_postal: '75018',
    ville: 'Paris',
    nombre_lots: 45,
    syndic_id: syndic1.id,
  });

  const copro2 = await createItem('coproprietes', {
    nom: 'Residence Haussmann',
    adresse: '88 boulevard Haussmann',
    code_postal: '75009',
    ville: 'Paris',
    nombre_lots: 32,
    syndic_id: syndic1.id,
  });

  const copro3 = await createItem('coproprietes', {
    nom: 'Le Parc Saint-Cloud',
    adresse: '5 allee du Parc',
    code_postal: '92210',
    ville: 'Saint-Cloud',
    nombre_lots: 60,
    syndic_id: syndic2.id,
  });

  console.log(`  ${copro1.nom}, ${copro2.nom}, ${copro3.nom}`);

  // -----------------------------------------------------------------------
  // 4. Debiteurs
  // -----------------------------------------------------------------------
  console.log('\n--- Creating debiteurs ---');

  const deb1 = await createItem('debiteurs', {
    type: 'particulier',
    civilite: 'M.',
    nom: 'Dupont',
    prenom: 'Robert',
    adresse: '12 rue des Tilleuls, Appt 304',
    code_postal: '75018',
    ville: 'Paris',
    email: 'r.dupont@email.fr',
    telephone: '06 12 34 56 78',
    lot_description: 'Lot 34 - Appt T3, 3e etage',
  });

  const deb2 = await createItem('debiteurs', {
    type: 'particulier',
    civilite: 'Mme',
    nom: 'Bernard',
    prenom: 'Catherine',
    adresse: '88 boulevard Haussmann, Appt 201',
    code_postal: '75009',
    ville: 'Paris',
    email: 'c.bernard@email.fr',
    telephone: '06 98 76 54 32',
    lot_description: 'Lot 12 - Appt T2, 2e etage',
  });

  const deb3 = await createItem('debiteurs', {
    type: 'societe',
    nom: 'SCI Les Erables',
    adresse: '5 allee du Parc, Lot Commercial',
    code_postal: '92210',
    ville: 'Saint-Cloud',
    email: 'contact@sci-erables.fr',
    telephone: '01 47 00 00 03',
    lot_description: 'Lots 1-3 - Local commercial RDC',
    siret: '55566677788899',
  });

  const deb4 = await createItem('debiteurs', {
    type: 'particulier',
    civilite: 'Mme/M.',
    nom: 'Garcia',
    prenom: 'Antoine',
    adresse: '12 rue des Tilleuls, Appt 502',
    code_postal: '75018',
    ville: 'Paris',
    lot_description: 'Lot 52 - Appt T4, 5e etage',
  });

  console.log(`  ${deb1.nom}, ${deb2.nom}, ${deb3.nom}, ${deb4.nom}`);

  // -----------------------------------------------------------------------
  // 5. Dossiers
  // -----------------------------------------------------------------------
  console.log('\n--- Creating dossiers ---');

  const dossier1 = await createItem('dossiers', {
    titre: 'Impayes charges Dupont - Les Tilleuls',
    statut: 'en_cours',
    phase: 'amiable',
    syndic_id: syndic1.id,
    copropriete_id: copro1.id,
    debiteur_id: deb1.id,
    avocat_responsable_id: avocat1.id,
    date_ouverture: '2025-01-15',
    priorite: 'normale',
    montant_initial: 8500.0,
    montant_actualise: 9200.0,
    montant_recouvre: 0,
  });

  const dossier2 = await createItem('dossiers', {
    titre: 'Recouvrement Bernard - Haussmann',
    statut: 'mise_en_demeure',
    phase: 'pre_contentieux',
    syndic_id: syndic1.id,
    copropriete_id: copro2.id,
    debiteur_id: deb2.id,
    avocat_responsable_id: avocat1.id,
    date_ouverture: '2024-11-03',
    priorite: 'haute',
    montant_initial: 15200.0,
    montant_actualise: 16800.0,
    montant_recouvre: 3000.0,
  });

  const dossier3 = await createItem('dossiers', {
    titre: 'SCI Les Erables - Charges commerciales',
    statut: 'assignation',
    phase: 'contentieux',
    syndic_id: syndic2.id,
    copropriete_id: copro3.id,
    debiteur_id: deb3.id,
    avocat_responsable_id: avocat2.id,
    date_ouverture: '2024-06-20',
    priorite: 'urgente',
    juridiction: 'TJ Nanterre',
    montant_initial: 42000.0,
    montant_actualise: 45500.0,
    montant_recouvre: 0,
  });

  const dossier4 = await createItem('dossiers', {
    titre: 'Impayes Garcia - Les Tilleuls',
    statut: 'nouveau',
    phase: 'amiable',
    syndic_id: syndic1.id,
    copropriete_id: copro1.id,
    debiteur_id: deb4.id,
    avocat_responsable_id: avocat2.id,
    date_ouverture: '2025-02-01',
    priorite: 'basse',
    montant_initial: 3200.0,
    montant_recouvre: 0,
  });

  const dossier5 = await createItem('dossiers', {
    titre: 'Recouvrement Dupont - Ancien dossier',
    statut: 'paye',
    phase: 'execution',
    syndic_id: syndic1.id,
    copropriete_id: copro1.id,
    debiteur_id: deb1.id,
    avocat_responsable_id: avocat1.id,
    date_ouverture: '2023-03-10',
    date_cloture: '2024-08-15',
    priorite: 'normale',
    montant_initial: 5600.0,
    montant_actualise: 6200.0,
    montant_recouvre: 6200.0,
  });

  console.log(`  Created ${5} dossiers`);

  // -----------------------------------------------------------------------
  // 6. Creances
  // -----------------------------------------------------------------------
  console.log('\n--- Creating creances ---');

  await createItem('creances', {
    dossier_id: dossier1.id,
    type: 'charges_copropriete',
    libelle: 'Charges Q1-Q2 2024',
    montant: 4200.0,
    periode_debut: '2024-01-01',
    periode_fin: '2024-06-30',
    statut: 'du',
    montant_paye: 0,
  });

  await createItem('creances', {
    dossier_id: dossier1.id,
    type: 'charges_copropriete',
    libelle: 'Charges Q3-Q4 2024',
    montant: 4300.0,
    periode_debut: '2024-07-01',
    periode_fin: '2024-12-31',
    statut: 'du',
    montant_paye: 0,
  });

  await createItem('creances', {
    dossier_id: dossier2.id,
    type: 'charges_copropriete',
    libelle: 'Charges 2023-2024',
    montant: 12000.0,
    periode_debut: '2023-01-01',
    periode_fin: '2024-06-30',
    statut: 'partiellement_paye',
    montant_paye: 3000.0,
  });

  await createItem('creances', {
    dossier_id: dossier2.id,
    type: 'travaux',
    libelle: 'Quote-part travaux ravalement',
    montant: 3200.0,
    date_exigibilite: '2024-03-01',
    statut: 'du',
    montant_paye: 0,
  });

  await createItem('creances', {
    dossier_id: dossier3.id,
    type: 'charges_copropriete',
    libelle: 'Charges commerciales 2023-2024',
    montant: 35000.0,
    periode_debut: '2023-01-01',
    periode_fin: '2024-12-31',
    statut: 'conteste',
    montant_paye: 0,
  });

  await createItem('creances', {
    dossier_id: dossier3.id,
    type: 'frais_recouvrement',
    libelle: 'Frais de recouvrement',
    montant: 7000.0,
    statut: 'du',
    montant_paye: 0,
  });

  await createItem('creances', {
    dossier_id: dossier4.id,
    type: 'charges_copropriete',
    libelle: 'Charges Q4 2024',
    montant: 3200.0,
    periode_debut: '2024-10-01',
    periode_fin: '2024-12-31',
    statut: 'du',
    montant_paye: 0,
  });

  console.log('  Created 7 creances');

  // -----------------------------------------------------------------------
  // 7. Evenements (Timeline)
  // -----------------------------------------------------------------------
  console.log('\n--- Creating evenements ---');

  await createItem('evenements', {
    dossier_id: dossier1.id,
    type: 'creation',
    titre: 'Dossier ouvert',
    description: 'Dossier cree suite a la demande du syndic Foncia.',
    date_evenement: '2025-01-15T09:00:00Z',
    auteur_id: avocat1.id,
    visible_client: true,
  });

  await createItem('evenements', {
    dossier_id: dossier1.id,
    type: 'communication',
    titre: 'Appel telephonique au debiteur',
    description: 'Tentative de contact par telephone. Pas de reponse.',
    date_evenement: '2025-01-20T14:30:00Z',
    auteur_id: avocat1.id,
    visible_client: true,
  });

  await createItem('evenements', {
    dossier_id: dossier2.id,
    type: 'creation',
    titre: 'Dossier ouvert',
    date_evenement: '2024-11-03T10:00:00Z',
    auteur_id: avocat1.id,
    visible_client: true,
  });

  await createItem('evenements', {
    dossier_id: dossier2.id,
    type: 'mise_en_demeure',
    titre: 'Mise en demeure envoyee',
    description: 'LRAR envoyee au debiteur. AR attendu.',
    date_evenement: '2024-12-01T09:00:00Z',
    auteur_id: avocat1.id,
    visible_client: true,
  });

  await createItem('evenements', {
    dossier_id: dossier2.id,
    type: 'paiement',
    titre: 'Paiement partiel recu',
    description: 'Virement de 3 000 EUR recu du debiteur.',
    date_evenement: '2025-01-10T11:00:00Z',
    auteur_id: avocat1.id,
    visible_client: true,
    metadata: { montant: 3000 },
  });

  await createItem('evenements', {
    dossier_id: dossier3.id,
    type: 'creation',
    titre: 'Dossier ouvert',
    date_evenement: '2024-06-20T08:00:00Z',
    auteur_id: avocat2.id,
    visible_client: true,
  });

  await createItem('evenements', {
    dossier_id: dossier3.id,
    type: 'assignation',
    titre: 'Assignation delivree',
    description: 'Assignation devant le TJ Nanterre.',
    date_evenement: '2024-10-15T09:00:00Z',
    auteur_id: avocat2.id,
    visible_client: true,
  });

  console.log('  Created 7 evenements');

  // -----------------------------------------------------------------------
  // 8. Taches
  // -----------------------------------------------------------------------
  console.log('\n--- Creating taches ---');

  const now = new Date();
  const in3Days = new Date(now.getTime() + 3 * 86400000).toISOString();
  const in7Days = new Date(now.getTime() + 7 * 86400000).toISOString();
  const in14Days = new Date(now.getTime() + 14 * 86400000).toISOString();

  await createItem('taches', {
    dossier_id: dossier1.id,
    type: 'relance',
    titre: 'Relance telephonique Dupont',
    description: 'Appeler M. Dupont pour proposition echeancier.',
    statut: 'a_faire',
    priorite: 'haute',
    assignee_id: avocat1.id,
    date_echeance: in3Days,
  });

  await createItem('taches', {
    dossier_id: dossier2.id,
    type: 'tache',
    titre: 'Rediger assignation Bernard',
    statut: 'en_cours',
    priorite: 'haute',
    assignee_id: avocat1.id,
    date_echeance: in7Days,
  });

  await createItem('taches', {
    dossier_id: dossier3.id,
    type: 'audience',
    titre: 'Audience TJ Nanterre - SCI Les Erables',
    description: 'Premiere audience de mise en etat.',
    statut: 'a_faire',
    priorite: 'urgente',
    assignee_id: avocat2.id,
    date_echeance: in14Days,
    lieu: 'TJ Nanterre',
    salle: 'Salle 3.08',
  });

  await createItem('taches', {
    type: 'echeance',
    titre: 'Renouvellement assurance RC Pro',
    statut: 'a_faire',
    priorite: 'normale',
    assignee_id: avocat1.id,
    date_echeance: in14Days,
  });

  console.log('  Created 4 taches');

  // -----------------------------------------------------------------------
  // 9. Heures facturables
  // -----------------------------------------------------------------------
  console.log('\n--- Creating heures facturables ---');

  await createItem('heures_facturables', {
    dossier_id: dossier1.id,
    avocat_id: avocat1.id,
    date: '2025-01-15',
    duree_minutes: 60,
    description: 'Analyse du dossier et des pieces',
    categorie: 'consultation',
    taux_horaire: 250.0,
    facturable: true,
  });

  await createItem('heures_facturables', {
    dossier_id: dossier1.id,
    avocat_id: avocat1.id,
    date: '2025-01-20',
    duree_minutes: 30,
    description: 'Appel telephonique au debiteur',
    categorie: 'correspondance',
    taux_horaire: 250.0,
    facturable: true,
  });

  await createItem('heures_facturables', {
    dossier_id: dossier2.id,
    avocat_id: avocat1.id,
    date: '2024-11-05',
    duree_minutes: 120,
    description: 'Redaction mise en demeure',
    categorie: 'redaction',
    taux_horaire: 250.0,
    facturable: true,
  });

  await createItem('heures_facturables', {
    dossier_id: dossier3.id,
    avocat_id: avocat2.id,
    date: '2024-10-10',
    duree_minutes: 180,
    description: 'Redaction assignation TJ Nanterre',
    categorie: 'redaction',
    taux_horaire: 300.0,
    facturable: true,
  });

  await createItem('heures_facturables', {
    dossier_id: dossier3.id,
    avocat_id: avocat2.id,
    date: '2024-10-15',
    duree_minutes: 120,
    description: 'Deplacement + signification assignation',
    categorie: 'deplacement',
    taux_horaire: 300.0,
    facturable: true,
  });

  console.log('  Created 5 heures facturables');

  // -----------------------------------------------------------------------
  // 10. Messages
  // -----------------------------------------------------------------------
  console.log('\n--- Creating messages ---');

  const msg1 = await createItem('messages', {
    dossier_id: dossier1.id,
    expediteur_id: syndicUser1.id,
    contenu: 'Bonjour Maitre, avez-vous pu contacter M. Dupont ? Nous avons relance de notre cote sans succes.',
    lu: true,
    date_lecture: '2025-01-22T10:00:00Z',
  });

  await createItem('messages', {
    dossier_id: dossier1.id,
    expediteur_id: avocat1.id,
    contenu: 'Bonjour, j\'ai tente de le joindre par telephone sans succes. Je vais lui envoyer un courrier recommande cette semaine.',
    lu: true,
    date_lecture: '2025-01-23T08:00:00Z',
    parent_id: msg1.id,
  });

  await createItem('messages', {
    dossier_id: dossier3.id,
    expediteur_id: avocat2.id,
    contenu: 'L\'assignation a ete delivree. Audience prevue dans les prochaines semaines. Je vous tiendrai informe.',
    lu: false,
  });

  console.log('  Created 3 messages');

  // -----------------------------------------------------------------------
  // 11. Notes
  // -----------------------------------------------------------------------
  console.log('\n--- Creating notes ---');

  await createItem('notes', {
    dossier_id: dossier2.id,
    auteur_id: avocat1.id,
    contenu: '<p>Le debiteur a effectue un paiement partiel de 3 000 EUR. Envisager echeancier pour le solde.</p><p><strong>Strategie</strong>: proposer un echeancier sur 12 mois avant d\'engager la procedure contentieuse.</p>',
    type: 'strategie',
    epingle: true,
  });

  await createItem('notes', {
    dossier_id: dossier3.id,
    auteur_id: avocat2.id,
    contenu: '<p>La SCI conteste les charges au motif que les appels de fonds ne sont pas conformes. Verifier les PV d\'AG.</p>',
    type: 'interne',
    epingle: false,
  });

  await createItem('notes', {
    dossier_id: dossier3.id,
    auteur_id: avocat2.id,
    contenu: '<p>Preparer les conclusions en reponse a la contestation. Points cles :</p><ul><li>Conformite des appels de fonds</li><li>PV AG approuvant les charges</li><li>Absence de prescription</li></ul>',
    type: 'memo_audience',
    epingle: true,
  });

  console.log('  Created 3 notes');

  // -----------------------------------------------------------------------
  // Done
  // -----------------------------------------------------------------------
  console.log('\n' + '='.repeat(60));
  console.log('Seed data complete!');
  console.log('='.repeat(60));
  console.log('\nTest credentials:');
  console.log('  Avocat 1: pierre.duval@legalrecover.fr / Test1234!');
  console.log('  Avocat 2: marie.laurent@legalrecover.fr / Test1234!');
  console.log('  Syndic 1: j.martin@foncia-idf.fr / Test1234!');
  console.log('  Syndic 2: s.petit@nexity-gestion.fr / Test1234!');
}

main().catch((err) => {
  console.error('\nFATAL ERROR:', err.message);
  process.exit(1);
});
