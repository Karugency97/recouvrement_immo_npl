/**
 * Messages — Communication between syndics and lawyers within a dossier.
 *
 * Messages support threading via the self-referencing `parent_id` FK.
 * The `lu` flag and `date_lecture` track read status for notifications.
 */

import type { Dossier } from "./dossiers";

/** Core message record as stored in Directus. */
export interface Message {
  readonly id: string;
  /** FK to `dossiers`. */
  dossier_id: string | Dossier;
  /** FK to `directus_users`. */
  expediteur_id: string;
  contenu: string;
  lu: boolean;
  date_lecture: string | null;
  /** FK to `directus_files`. */
  piece_jointe: string | null;
  /** Self FK for threading. Null for root messages. */
  parent_id: string | Message | null;
  readonly date_created: string;
}

/** Payload for creating a new message. */
export interface MessageCreate {
  dossier_id: string;
  expediteur_id: string;
  contenu: string;
  lu?: boolean;
  date_lecture?: string | null;
  piece_jointe?: string | null;
  parent_id?: string | null;
}

/** Payload for updating an existing message (typically marking as read). */
export type MessageUpdate = Partial<
  Pick<Message, "lu" | "date_lecture" | "contenu">
>;
