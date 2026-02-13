/**
 * Notes — Internal notes attached to a dossier.
 *
 * Notes are only visible to lawyers/admins (never to syndics).
 * They can be pinned (`epingle`) for quick reference.
 */

import type { Dossier } from "./dossiers";

/** Note types/categories. */
export const NOTE_TYPES = [
  "interne",
  "strategie",
  "memo_audience",
  "compte_rendu",
] as const;
export type NoteType = (typeof NOTE_TYPES)[number];

/** Core note record as stored in Directus. */
export interface Note {
  readonly id: string;
  /** FK to `dossiers`. */
  dossier_id: string | Dossier;
  /** FK to `directus_users`. */
  auteur_id: string;
  contenu: string;
  type: NoteType;
  /** Whether this note is pinned to the top. */
  epingle: boolean;
  readonly date_created: string;
  readonly date_updated: string | null;
}

/** Payload for creating a new note. */
export interface NoteCreate {
  dossier_id: string;
  auteur_id: string;
  contenu: string;
  type: NoteType;
  epingle?: boolean;
}

/** Payload for updating an existing note. */
export type NoteUpdate = Partial<Omit<NoteCreate, "dossier_id" | "auteur_id">>;
