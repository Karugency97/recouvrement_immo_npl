/**
 * Taches — Tasks, hearings, deadlines, reminders, and appointments.
 *
 * Tasks can optionally be linked to a dossier. They support assignment
 * to a specific user and scheduling with reminder dates.
 */

import type { Dossier } from "./dossiers";

/** Task types. */
export const TACHE_TYPES = [
  "tache",
  "audience",
  "echeance",
  "relance",
  "rdv",
] as const;
export type TacheType = (typeof TACHE_TYPES)[number];

/** Task statuses. */
export const TACHE_STATUTS = [
  "a_faire",
  "en_cours",
  "terminee",
  "annulee",
] as const;
export type TacheStatut = (typeof TACHE_STATUTS)[number];

/** Task priorities. */
export const TACHE_PRIORITES = [
  "basse",
  "normale",
  "haute",
  "urgente",
] as const;
export type TachePriorite = (typeof TACHE_PRIORITES)[number];

/** Core tache record as stored in Directus. */
export interface Tache {
  readonly id: string;
  /** FK to `dossiers`. Nullable because standalone tasks are allowed. */
  dossier_id: string | Dossier | null;
  type: TacheType;
  titre: string;
  description: string | null;
  statut: TacheStatut;
  priorite: TachePriorite;
  /** FK to `directus_users`. */
  assignee_id: string | null;
  date_echeance: string;
  date_rappel: string | null;
  /** Location (for `audience` or `rdv` types). */
  lieu: string | null;
  /** Room/court room (for `audience` type). */
  salle: string | null;
  terminee_le: string | null;
  readonly date_created: string;
  readonly date_updated: string | null;
}

/** Payload for creating a new tache. */
export interface TacheCreate {
  type: TacheType;
  titre: string;
  date_echeance: string;
  dossier_id?: string | null;
  description?: string | null;
  statut?: TacheStatut;
  priorite?: TachePriorite;
  assignee_id?: string | null;
  date_rappel?: string | null;
  lieu?: string | null;
  salle?: string | null;
  terminee_le?: string | null;
}

/** Payload for updating an existing tache. */
export type TacheUpdate = Partial<TacheCreate>;
