/**
 * Heures Facturables — Billable hours logged by lawyers on dossiers.
 *
 * Each entry records time spent on a dossier, categorised by activity type.
 * Non-billable entries (e.g., internal work) can be tracked by setting
 * `facturable` to false.
 */

import type { Dossier } from "./dossiers";

/** Billable hour activity categories. */
export const HEURE_FACTURABLE_CATEGORIES = [
  "consultation",
  "redaction",
  "audience",
  "correspondance",
  "recherche",
  "deplacement",
  "autre",
] as const;
export type HeureFacturableCategorie =
  (typeof HEURE_FACTURABLE_CATEGORIES)[number];

/** Core heure facturable record as stored in Directus. */
export interface HeureFacturable {
  readonly id: string;
  /** FK to `dossiers`. */
  dossier_id: string | Dossier;
  /** FK to `directus_users` (the lawyer logging time). */
  avocat_id: string;
  date: string;
  duree_minutes: number;
  description: string;
  categorie: HeureFacturableCategorie;
  taux_horaire: number | null;
  facturable: boolean;
  /** FK to `factures` when invoiced. */
  facture_id: string | null;
  readonly date_created: string;
}

/** Payload for creating a new heure facturable entry. */
export interface HeureFacturableCreate {
  dossier_id: string;
  avocat_id: string;
  date: string;
  duree_minutes: number;
  description: string;
  categorie: HeureFacturableCategorie;
  taux_horaire?: number | null;
  facturable?: boolean;
  facture_id?: string | null;
}

/** Payload for updating an existing heure facturable entry. */
export type HeureFacturableUpdate = Partial<
  Omit<HeureFacturableCreate, "dossier_id">
>;
