/**
 * Debiteurs — Debtors owing money to a copropriete.
 *
 * A debiteur can be either a natural person (`particulier`) or a company
 * (`societe`). When type is `societe`, `siret` should be populated.
 */

/** Debtor types. */
export const DEBITEUR_TYPES = ["particulier", "societe"] as const;
export type DebiteurType = (typeof DEBITEUR_TYPES)[number];

/** Civilite options for natural persons. */
export const DEBITEUR_CIVILITES = ["M.", "Mme", "Mme/M."] as const;
export type DebiteurCivilite = (typeof DEBITEUR_CIVILITES)[number];

/** Core debiteur record as stored in Directus. */
export interface Debiteur {
  readonly id: string;
  type: DebiteurType;
  civilite: DebiteurCivilite | null;
  nom: string;
  prenom: string | null;
  adresse: string;
  code_postal: string;
  ville: string;
  email: string | null;
  telephone: string | null;
  lot_description: string;
  siret: string | null;
  notes: string | null;
  readonly date_created: string;
  readonly date_updated: string | null;
}

/** Payload for creating a new debiteur. */
export interface DebiteurCreate {
  type: DebiteurType;
  nom: string;
  adresse: string;
  code_postal: string;
  ville: string;
  lot_description: string;
  civilite?: DebiteurCivilite | null;
  prenom?: string | null;
  email?: string | null;
  telephone?: string | null;
  siret?: string | null;
  notes?: string | null;
}

/** Payload for updating an existing debiteur. */
export type DebiteurUpdate = Partial<DebiteurCreate>;
