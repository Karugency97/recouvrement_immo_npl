/**
 * Documents — Files attached to a dossier.
 *
 * Each document references a Directus file via the `fichier` FK
 * and can be marked as confidential to restrict visibility.
 */

import type { Dossier } from "./dossiers";

/** Document types/categories. */
export const DOCUMENT_TYPES = [
  "releve_compte",
  "appel_fonds",
  "contrat_syndic",
  "mise_en_demeure",
  "assignation",
  "jugement",
  "proces_verbal",
  "correspondance",
  "autre",
] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

/** Core document record as stored in Directus. */
export interface Document {
  readonly id: string;
  /** FK to `dossiers`. */
  dossier_id: string | Dossier;
  titre: string;
  type: DocumentType;
  /** FK to `directus_files`. */
  fichier: string | null;
  description: string | null;
  confidentiel: boolean;
  /** FK to `directus_users`. */
  uploaded_by: string | null;
  date_document: string | null;
  readonly date_created: string;
}

/** Payload for creating a new document. */
export interface DocumentCreate {
  dossier_id: string;
  titre: string;
  type: DocumentType;
  fichier?: string | null;
  description?: string | null;
  confidentiel?: boolean;
  uploaded_by?: string | null;
  date_document?: string | null;
}

/** Payload for updating an existing document. */
export type DocumentUpdate = Partial<Omit<DocumentCreate, "dossier_id">>;
