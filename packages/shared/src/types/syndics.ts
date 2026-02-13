/**
 * Syndics — Real estate property managers (syndics de copropriete).
 *
 * Each syndic is linked to a Directus user via `user_id` and manages
 * one or more coproprietes. The syndic portal filters data by
 * `syndics.user_id = $CURRENT_USER`.
 */

/** Possible statuses for a syndic account. */
export const SYNDIC_STATUTS = ["actif", "inactif", "suspendu"] as const;
export type SyndicStatut = (typeof SYNDIC_STATUTS)[number];

/** Core syndic record as stored in Directus. */
export interface Syndic {
  readonly id: string;
  status: SyndicStatut;
  raison_sociale: string;
  siret: string;
  adresse: string;
  code_postal: string;
  ville: string;
  email_contact: string;
  telephone: string;
  nom_referent: string;
  prenom_referent: string;
  /** FK to `directus_users`. */
  user_id: string;
  notes_internes: string | null;
  readonly date_created: string;
  readonly date_updated: string | null;
}

/** Payload for creating a new syndic (required fields only). */
export interface SyndicCreate {
  raison_sociale: string;
  siret: string;
  adresse: string;
  code_postal: string;
  ville: string;
  email_contact: string;
  telephone: string;
  nom_referent: string;
  prenom_referent: string;
  user_id: string;
  status?: SyndicStatut;
  notes_internes?: string | null;
}

/** Payload for updating an existing syndic (all editable fields optional). */
export type SyndicUpdate = Partial<SyndicCreate>;
