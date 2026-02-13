/**
 * Evenements — Timeline events for a dossier.
 *
 * Events are automatically created by the `auto-timeline` Directus hook
 * on status changes. They can also be created manually (notes, communications).
 * The `visible_client` flag controls whether syndics can see the event.
 */

import type { Dossier } from "./dossiers";

/** Event types. */
export const EVENEMENT_TYPES = [
  "creation",
  "changement_statut",
  "document_ajoute",
  "mise_en_demeure",
  "assignation",
  "audience",
  "jugement",
  "paiement",
  "note",
  "communication",
  "autre",
] as const;
export type EvenementType = (typeof EVENEMENT_TYPES)[number];

/** Core evenement record as stored in Directus. */
export interface Evenement {
  readonly id: string;
  /** FK to `dossiers`. */
  dossier_id: string | Dossier;
  type: EvenementType;
  titre: string;
  description: string | null;
  date_evenement: string;
  /** FK to `directus_users`. */
  auteur_id: string | null;
  /** Arbitrary structured data attached to the event. */
  metadata: Record<string, unknown> | null;
  /** Whether this event is visible to the client (syndic) portal. */
  visible_client: boolean;
  readonly date_created: string;
}

/** Payload for creating a new evenement. */
export interface EvenementCreate {
  dossier_id: string;
  type: EvenementType;
  titre: string;
  date_evenement: string;
  description?: string | null;
  auteur_id?: string | null;
  metadata?: Record<string, unknown> | null;
  visible_client?: boolean;
}

/** Payload for updating an existing evenement. */
export type EvenementUpdate = Partial<Omit<EvenementCreate, "dossier_id">>;
