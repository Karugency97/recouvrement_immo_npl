/**
 * Global Directus schema type.
 *
 * Pass this to `createDirectus<Schema>()` from `@directus/sdk` to get
 * fully typed SDK methods for all custom collections.
 *
 * @example
 * ```ts
 * import { createDirectus, rest } from "@directus/sdk";
 * import type { Schema } from "@immo-npl/shared";
 *
 * const client = createDirectus<Schema>("https://api.example.com").with(rest());
 * const dossiers = await client.request(readItems("dossiers"));
 * // dossiers is typed as Dossier[]
 * ```
 */

import type { Syndic } from "./syndics";
import type { Copropriete } from "./coproprietes";
import type { Debiteur } from "./debiteurs";
import type { Dossier } from "./dossiers";
import type { Creance } from "./creances";
import type { Document } from "./documents";
import type { Evenement } from "./evenements";
import type { Tache } from "./taches";
import type { HeureFacturable } from "./heures-facturables";
import type { Facture } from "./factures";
import type { Message } from "./messages";
import type { Note } from "./notes";

/**
 * Complete Directus schema mapping collection names to their record types.
 *
 * The keys must match the actual Directus collection names exactly.
 * Each value is an array of the corresponding record type, which is the
 * convention expected by `@directus/sdk` for `createDirectus<Schema>()`.
 */
export interface Schema {
  syndics: Syndic[];
  coproprietes: Copropriete[];
  debiteurs: Debiteur[];
  dossiers: Dossier[];
  creances: Creance[];
  documents: Document[];
  evenements: Evenement[];
  taches: Tache[];
  heures_facturables: HeureFacturable[];
  factures: Facture[];
  messages: Message[];
  notes: Note[];
}
