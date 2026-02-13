/**
 * Dossiers — Legal recovery cases (central hub of the application).
 *
 * Every dossier links a syndic, copropriete, and debiteur together and
 * tracks the lifecycle of the debt recovery through statuts and phases.
 * The `reference` field is auto-generated as `LR-YYYY-NNN` by a Directus hook.
 */

import type { Syndic } from "./syndics";
import type { Copropriete } from "./coproprietes";
import type { Debiteur } from "./debiteurs";

/** All possible case statuses, ordered by typical progression. */
export const DOSSIER_STATUTS = [
  "nouveau",
  "en_cours",
  "mise_en_demeure",
  "assignation",
  "injonction",
  "audience",
  "jugement",
  "execution",
  "paye",
  "cloture",
  "irrecovrable",
] as const;
export type DossierStatut = (typeof DOSSIER_STATUTS)[number];

/** High-level procedural phases. */
export const DOSSIER_PHASES = [
  "amiable",
  "pre_contentieux",
  "contentieux",
  "execution",
] as const;
export type DossierPhase = (typeof DOSSIER_PHASES)[number];

/** Priority levels. */
export const DOSSIER_PRIORITES = [
  "basse",
  "normale",
  "haute",
  "urgente",
] as const;
export type DossierPriorite = (typeof DOSSIER_PRIORITES)[number];

/** Core dossier record as stored in Directus. */
export interface Dossier {
  readonly id: string;
  /** Auto-generated reference, format `LR-YYYY-NNN`. */
  readonly reference: string;
  statut: DossierStatut;
  phase: DossierPhase;
  titre: string;
  description: string | null;
  /** FK to `syndics`. */
  syndic_id: string | Syndic;
  /** FK to `coproprietes`. */
  copropriete_id: string | Copropriete;
  /** FK to `debiteurs`. */
  debiteur_id: string | Debiteur;
  /** FK to `directus_users` (lawyer in charge). */
  avocat_responsable_id: string | null;
  date_ouverture: string;
  date_cloture: string | null;
  priorite: DossierPriorite;
  juridiction: string | null;
  /** Numero de Repertoire General (court reference). */
  numero_rg: string | null;
  prochaine_audience: string | null;
  /** Original debt amount. */
  montant_initial: number;
  /** Updated debt amount (with interest, fees, etc.). */
  montant_actualise: number | null;
  /** Amount already recovered. */
  montant_recouvre: number;
  readonly date_created: string;
  readonly date_updated: string | null;
  readonly user_created: string | null;
  readonly user_updated: string | null;
}

/** Payload for creating a new dossier. */
export interface DossierCreate {
  titre: string;
  syndic_id: string;
  copropriete_id: string;
  debiteur_id: string;
  montant_initial: number;
  date_ouverture: string;
  statut?: DossierStatut;
  phase?: DossierPhase;
  priorite?: DossierPriorite;
  description?: string | null;
  avocat_responsable_id?: string | null;
  date_cloture?: string | null;
  juridiction?: string | null;
  numero_rg?: string | null;
  prochaine_audience?: string | null;
  montant_actualise?: number | null;
  montant_recouvre?: number;
}

/** Payload for updating an existing dossier. */
export type DossierUpdate = Partial<DossierCreate>;
