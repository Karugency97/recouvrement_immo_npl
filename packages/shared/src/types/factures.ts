/**
 * Factures — Invoices sent to syndics.
 *
 * An invoice may or may not be linked to a specific dossier. The `numero`
 * field is unique and typically auto-generated (e.g., `FAC-YYYY-NNN`).
 */

import type { Syndic } from "./syndics";
import type { Dossier } from "./dossiers";

/** Invoice statuses. */
export const FACTURE_STATUTS = [
  "brouillon",
  "emise",
  "envoyee",
  "payee",
  "en_retard",
  "annulee",
] as const;
export type FactureStatut = (typeof FACTURE_STATUTS)[number];

/** Core facture record as stored in Directus. */
export interface Facture {
  readonly id: string;
  /** Unique invoice number. */
  numero: string;
  /** FK to `syndics`. */
  syndic_id: string | Syndic;
  /** FK to `dossiers`. Nullable for general invoices. */
  dossier_id: string | Dossier | null;
  statut: FactureStatut;
  date_emission: string | null;
  date_echeance: string | null;
  date_paiement: string | null;
  montant_ht: number;
  taux_tva: number;
  montant_tva: number | null;
  montant_ttc: number | null;
  mode_paiement: string | null;
  notes: string | null;
  /** FK to `directus_files`. */
  fichier_pdf: string | null;
  readonly date_created: string;
  readonly date_updated: string | null;
}

/** Payload for creating a new facture. */
export interface FactureCreate {
  numero: string;
  syndic_id: string;
  montant_ht: number;
  taux_tva: number;
  dossier_id?: string | null;
  statut?: FactureStatut;
  date_emission?: string | null;
  date_echeance?: string | null;
  date_paiement?: string | null;
  montant_tva?: number | null;
  montant_ttc?: number | null;
  mode_paiement?: string | null;
  notes?: string | null;
  fichier_pdf?: string | null;
}

/** Payload for updating an existing facture. */
export type FactureUpdate = Partial<Omit<FactureCreate, "numero">>;
