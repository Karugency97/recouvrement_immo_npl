/**
 * Coproprietes — Co-ownership properties managed by a syndic.
 *
 * Each copropriete belongs to exactly one syndic. Dossiers reference
 * a copropriete to indicate which building the debt pertains to.
 */

import type { Syndic } from "./syndics";

/** Core copropriete record as stored in Directus. */
export interface Copropriete {
  readonly id: string;
  nom: string;
  adresse: string;
  code_postal: string;
  ville: string;
  nombre_lots: number | null;
  /** FK to `syndics`. Resolved to the full object when using relational queries. */
  syndic_id: string | Syndic;
  reference_interne: string | null;
  readonly date_created: string;
  readonly date_updated: string | null;
}

/** Payload for creating a new copropriete. */
export interface CoproprieteCreate {
  nom: string;
  adresse: string;
  code_postal: string;
  ville: string;
  syndic_id: string;
  nombre_lots?: number | null;
  reference_interne?: string | null;
}

/** Payload for updating an existing copropriete. */
export type CoproprieteUpdate = Partial<CoproprieteCreate>;
