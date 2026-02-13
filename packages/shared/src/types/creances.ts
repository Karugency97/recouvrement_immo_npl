/**
 * Creances — Individual claims/debts within a dossier.
 *
 * A dossier can have multiple creances (charges, travaux, penalites, etc.).
 * Each tracks its own amount, payment status, and due period.
 */

import type { Dossier } from "./dossiers";

/** Claim types. */
export const CREANCE_TYPES = [
  "charges_copropriete",
  "travaux",
  "fond_travaux",
  "penalites",
  "frais_recouvrement",
  "interets",
  "article_700",
  "depens",
] as const;
export type CreanceType = (typeof CREANCE_TYPES)[number];

/** Claim payment statuses. */
export const CREANCE_STATUTS = [
  "du",
  "partiellement_paye",
  "paye",
  "conteste",
] as const;
export type CreanceStatut = (typeof CREANCE_STATUTS)[number];

/** Core creance record as stored in Directus. */
export interface Creance {
  readonly id: string;
  /** FK to `dossiers`. */
  dossier_id: string | Dossier;
  type: CreanceType;
  libelle: string;
  montant: number;
  periode_debut: string | null;
  periode_fin: string | null;
  date_exigibilite: string | null;
  statut: CreanceStatut;
  montant_paye: number;
  notes: string | null;
  readonly date_created: string;
}

/** Payload for creating a new creance. */
export interface CreanceCreate {
  dossier_id: string;
  type: CreanceType;
  libelle: string;
  montant: number;
  statut?: CreanceStatut;
  montant_paye?: number;
  periode_debut?: string | null;
  periode_fin?: string | null;
  date_exigibilite?: string | null;
  notes?: string | null;
}

/** Payload for updating an existing creance. */
export type CreanceUpdate = Partial<Omit<CreanceCreate, "dossier_id">>;
