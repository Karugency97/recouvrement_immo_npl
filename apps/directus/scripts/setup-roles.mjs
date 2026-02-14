#!/usr/bin/env node

/**
 * IMMO NPL — Directus Roles & Permissions Setup (Phase 3)
 *
 * Creates/reuses roles (Avocat, Syndic) with policies and
 * permissions for Directus 11.x (policy-based permissions).
 *
 * Usage:
 *   DIRECTUS_URL=https://your-directus.com \
 *   DIRECTUS_ADMIN_EMAIL=admin@example.com \
 *   DIRECTUS_ADMIN_PASSWORD=yourpassword \
 *   node apps/directus/scripts/setup-roles.mjs
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
    if (res.status === 400 && JSON.stringify(data).includes('already exists')) {
      console.log(`  (already exists, skipping)`);
      return data;
    }
    throw new Error(`${method} ${path} -> ${res.status}: ${JSON.stringify(data)}`);
  }
  return data;
}

// ---------------------------------------------------------------------------
// Directus 11.x: Roles -> Policies -> Permissions
// ---------------------------------------------------------------------------

/**
 * Find or create a role by name.
 */
async function findOrCreateRole(name, description, icon) {
  // Check if role exists
  const existing = await api(
    'GET',
    `/roles?filter[name][_eq]=${encodeURIComponent(name)}`
  );
  if (existing.data?.length > 0) {
    console.log(`  Role "${name}" already exists: ${existing.data[0].id}`);
    return existing.data[0].id;
  }

  console.log(`  Creating role: ${name}`);
  const result = await api('POST', '/roles', { name, description, icon });
  return result.data?.id;
}

/**
 * Create a policy and attach it to a role.
 * In Directus 11.x, permissions are scoped to policies, not roles.
 */
async function createPolicyForRole(roleId, name, opts = {}) {
  console.log(`  Creating policy: ${name}`);

  const policy = await api('POST', '/policies', {
    name,
    icon: opts.icon ?? 'badge',
    description: opts.description ?? '',
    admin_access: opts.adminAccess ?? false,
    app_access: opts.appAccess ?? true,
  });

  const policyId = policy.data?.id;
  if (!policyId) throw new Error('Failed to create policy');

  // Link policy to role via the access junction
  await api('POST', '/access', {
    role: roleId,
    policy: policyId,
  });

  console.log(`  Policy ${policyId} linked to role ${roleId}`);
  return policyId;
}

/**
 * Add a permission to a policy (Directus 11.x).
 */
async function addPermission(policyId, collection, action, opts = {}) {
  const label = `${collection}.${action}`;
  console.log(`  + perm: ${label}`);

  const payload = {
    policy: policyId,
    collection,
    action,
    fields: opts.fields ?? ['*'],
    permissions: opts.filter ?? {},
    validation: opts.validation ?? {},
    presets: opts.presets ?? null,
  };

  return api('POST', '/permissions', payload);
}

// ---------------------------------------------------------------------------
// Avocat Permissions
// ---------------------------------------------------------------------------

async function setupAvocatPermissions(policyId) {
  console.log('\n--- Permissions Avocat ---');

  // dossiers: create, read, update (NO delete)
  await addPermission(policyId, 'dossiers', 'create');
  await addPermission(policyId, 'dossiers', 'read');
  await addPermission(policyId, 'dossiers', 'update');

  // debiteurs: create, read, update (NO delete)
  await addPermission(policyId, 'debiteurs', 'create');
  await addPermission(policyId, 'debiteurs', 'read');
  await addPermission(policyId, 'debiteurs', 'update');

  // creances: full CRUD
  await addPermission(policyId, 'creances', 'create');
  await addPermission(policyId, 'creances', 'read');
  await addPermission(policyId, 'creances', 'update');
  await addPermission(policyId, 'creances', 'delete');

  // syndics: read only
  await addPermission(policyId, 'syndics', 'read');

  // coproprietes: read only
  await addPermission(policyId, 'coproprietes', 'read');

  // documents: create, read, update all; delete own
  await addPermission(policyId, 'documents', 'create');
  await addPermission(policyId, 'documents', 'read');
  await addPermission(policyId, 'documents', 'update');
  await addPermission(policyId, 'documents', 'delete', {
    filter: { uploaded_by: { _eq: '$CURRENT_USER' } },
  });

  // evenements: create, read all; update own
  await addPermission(policyId, 'evenements', 'create');
  await addPermission(policyId, 'evenements', 'read');
  await addPermission(policyId, 'evenements', 'update', {
    filter: { auteur_id: { _eq: '$CURRENT_USER' } },
  });

  // taches: create, read, update all; delete own
  await addPermission(policyId, 'taches', 'create');
  await addPermission(policyId, 'taches', 'read');
  await addPermission(policyId, 'taches', 'update');
  await addPermission(policyId, 'taches', 'delete', {
    filter: {
      _or: [
        { assignee_id: { _eq: '$CURRENT_USER' } },
        { user_created: { _eq: '$CURRENT_USER' } },
      ],
    },
  });

  // heures_facturables: create all; read/update/delete own
  await addPermission(policyId, 'heures_facturables', 'create');
  await addPermission(policyId, 'heures_facturables', 'read', {
    filter: { avocat_id: { _eq: '$CURRENT_USER' } },
  });
  await addPermission(policyId, 'heures_facturables', 'update', {
    filter: { avocat_id: { _eq: '$CURRENT_USER' } },
  });
  await addPermission(policyId, 'heures_facturables', 'delete', {
    filter: { avocat_id: { _eq: '$CURRENT_USER' } },
  });

  // factures: create, read, update (NO delete)
  await addPermission(policyId, 'factures', 'create');
  await addPermission(policyId, 'factures', 'read');
  await addPermission(policyId, 'factures', 'update');

  // messages: create, read all; update own
  await addPermission(policyId, 'messages', 'create');
  await addPermission(policyId, 'messages', 'read');
  await addPermission(policyId, 'messages', 'update', {
    filter: { expediteur_id: { _eq: '$CURRENT_USER' } },
  });

  // notes: create, read all; update/delete own
  await addPermission(policyId, 'notes', 'create');
  await addPermission(policyId, 'notes', 'read');
  await addPermission(policyId, 'notes', 'update', {
    filter: { auteur_id: { _eq: '$CURRENT_USER' } },
  });
  await addPermission(policyId, 'notes', 'delete', {
    filter: { auteur_id: { _eq: '$CURRENT_USER' } },
  });

  // Directus system collections
  await addPermission(policyId, 'directus_users', 'read', {
    fields: ['id', 'first_name', 'last_name', 'email', 'avatar', 'role'],
  });
  await addPermission(policyId, 'directus_files', 'create');
  await addPermission(policyId, 'directus_files', 'read');
  await addPermission(policyId, 'directus_roles', 'read', {
    fields: ['id', 'name'],
  });
}

// ---------------------------------------------------------------------------
// Syndic Permissions
// ---------------------------------------------------------------------------

async function setupSyndicPermissions(policyId) {
  console.log('\n--- Permissions Syndic ---');

  const syndicSelfFilter = { user_id: { _eq: '$CURRENT_USER' } };
  const viaDossierFilter = {
    dossier_id: { syndic_id: { user_id: { _eq: '$CURRENT_USER' } } },
  };
  const dossiersOwnFilter = {
    syndic_id: { user_id: { _eq: '$CURRENT_USER' } },
  };

  // dossiers: create (wizard), read own
  await addPermission(policyId, 'dossiers', 'create');
  await addPermission(policyId, 'dossiers', 'read', { filter: dossiersOwnFilter });

  // debiteurs: create (wizard), read
  await addPermission(policyId, 'debiteurs', 'create');
  await addPermission(policyId, 'debiteurs', 'read');

  // creances: read own dossiers
  await addPermission(policyId, 'creances', 'read', { filter: viaDossierFilter });

  // syndics: read & update own profile
  await addPermission(policyId, 'syndics', 'read', { filter: syndicSelfFilter });
  await addPermission(policyId, 'syndics', 'update', {
    filter: syndicSelfFilter,
    fields: [
      'raison_sociale', 'adresse', 'code_postal', 'ville',
      'email_contact', 'telephone', 'nom_referent', 'prenom_referent',
    ],
  });

  // coproprietes: read own
  await addPermission(policyId, 'coproprietes', 'read', {
    filter: { syndic_id: { user_id: { _eq: '$CURRENT_USER' } } },
  });

  // documents: create (upload), read non-confidential own
  await addPermission(policyId, 'documents', 'create');
  await addPermission(policyId, 'documents', 'read', {
    filter: {
      _and: [viaDossierFilter, { confidentiel: { _eq: false } }],
    },
  });

  // evenements: read visible_client=true, own dossiers
  await addPermission(policyId, 'evenements', 'read', {
    filter: {
      _and: [viaDossierFilter, { visible_client: { _eq: true } }],
    },
  });

  // taches: read audiences only, own dossiers
  await addPermission(policyId, 'taches', 'read', {
    filter: {
      _and: [
        { dossier_id: { syndic_id: { user_id: { _eq: '$CURRENT_USER' } } } },
        { type: { _eq: 'audience' } },
      ],
    },
  });

  // heures_facturables: NO access

  // factures: read own
  await addPermission(policyId, 'factures', 'read', {
    filter: { syndic_id: { user_id: { _eq: '$CURRENT_USER' } } },
  });

  // messages: create, read own dossiers, update lu only
  await addPermission(policyId, 'messages', 'create');
  await addPermission(policyId, 'messages', 'read', { filter: viaDossierFilter });
  await addPermission(policyId, 'messages', 'update', {
    filter: viaDossierFilter,
    fields: ['lu', 'date_lecture'],
  });

  // notes: NO access

  // Directus system collections
  await addPermission(policyId, 'directus_users', 'read', {
    fields: ['id', 'first_name', 'last_name', 'email', 'avatar'],
  });
  await addPermission(policyId, 'directus_files', 'create');
  await addPermission(policyId, 'directus_files', 'read');
}

// ---------------------------------------------------------------------------
// MAIN
// ---------------------------------------------------------------------------

async function main() {
  DIRECTUS_URL = getDirectusUrl();
  ADMIN_TOKEN = await getAccessToken();

  console.log('='.repeat(60));
  console.log('IMMO NPL — Roles & Permissions Setup (Phase 3)');
  console.log(`Directus 11.x (policy-based permissions)`);
  console.log(`Target: ${DIRECTUS_URL}`);
  console.log('='.repeat(60));

  // Verify connectivity
  try {
    await api('GET', '/server/info');
  } catch {
    console.error('Cannot reach Directus. Check credentials.');
    process.exit(1);
  }

  // 1. Find or create roles
  console.log('\n--- Roles ---');
  const avocatRoleId = await findOrCreateRole(
    'Avocat',
    'Avocats du cabinet - acces complet aux dossiers',
    'gavel'
  );
  const syndicRoleId = await findOrCreateRole(
    'Syndic',
    'Clients syndics - acces restreint a leurs propres donnees',
    'business'
  );

  if (!avocatRoleId || !syndicRoleId) {
    console.error('Failed to find/create roles.');
    process.exit(1);
  }

  // 2. Create policies for each role
  console.log('\n--- Policies ---');
  const avocatPolicyId = await createPolicyForRole(avocatRoleId, 'Avocat - Acces Dossiers', {
    icon: 'gavel',
    description: 'Acces complet aux dossiers, creances, documents',
    appAccess: true,
  });

  const syndicPolicyId = await createPolicyForRole(syndicRoleId, 'Syndic - Acces Client', {
    icon: 'business',
    description: 'Acces restreint aux propres donnees du syndic',
    appAccess: true,
  });

  // 3. Setup permissions on policies
  await setupAvocatPermissions(avocatPolicyId);
  await setupSyndicPermissions(syndicPolicyId);

  console.log('\n' + '='.repeat(60));
  console.log('Roles & permissions setup complete!');
  console.log(`  Avocat: role=${avocatRoleId} policy=${avocatPolicyId}`);
  console.log(`  Syndic: role=${syndicRoleId} policy=${syndicPolicyId}`);
  console.log('='.repeat(60));
  console.log('\nNext steps:');
  console.log('  1. Verify in Directus Admin > Settings > Roles & Policies');
  console.log('  2. Run seed script: node apps/directus/scripts/seed-data.mjs');
}

main().catch((err) => {
  console.error('\nFATAL ERROR:', err.message);
  process.exit(1);
});
