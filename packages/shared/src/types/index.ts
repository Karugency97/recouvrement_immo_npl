/**
 * @immo-npl/shared — Shared TypeScript types for the IMMO NPL project.
 *
 * Re-exports every collection type, its Create/Update variants,
 * all `as const` value arrays, and the global Directus Schema.
 */

// ---- Syndics ----
export type { Syndic, SyndicCreate, SyndicUpdate, SyndicStatut } from "./syndics";
export { SYNDIC_STATUTS } from "./syndics";

// ---- Coproprietes ----
export type { Copropriete, CoproprieteCreate, CoproprieteUpdate } from "./coproprietes";

// ---- Debiteurs ----
export type {
  Debiteur,
  DebiteurCreate,
  DebiteurUpdate,
  DebiteurType,
  DebiteurCivilite,
} from "./debiteurs";
export { DEBITEUR_TYPES, DEBITEUR_CIVILITES } from "./debiteurs";

// ---- Dossiers ----
export type {
  Dossier,
  DossierCreate,
  DossierUpdate,
  DossierStatut,
  DossierPhase,
  DossierPriorite,
} from "./dossiers";
export { DOSSIER_STATUTS, DOSSIER_PHASES, DOSSIER_PRIORITES } from "./dossiers";

// ---- Creances ----
export type {
  Creance,
  CreanceCreate,
  CreanceUpdate,
  CreanceType,
  CreanceStatut,
} from "./creances";
export { CREANCE_TYPES, CREANCE_STATUTS } from "./creances";

// ---- Documents ----
export type {
  Document,
  DocumentCreate,
  DocumentUpdate,
  DocumentType,
} from "./documents";
export { DOCUMENT_TYPES } from "./documents";

// ---- Evenements ----
export type {
  Evenement,
  EvenementCreate,
  EvenementUpdate,
  EvenementType,
} from "./evenements";
export { EVENEMENT_TYPES } from "./evenements";

// ---- Taches ----
export type {
  Tache,
  TacheCreate,
  TacheUpdate,
  TacheType,
  TacheStatut,
  TachePriorite,
} from "./taches";
export { TACHE_TYPES, TACHE_STATUTS, TACHE_PRIORITES } from "./taches";

// ---- Heures Facturables ----
export type {
  HeureFacturable,
  HeureFacturableCreate,
  HeureFacturableUpdate,
  HeureFacturableCategorie,
} from "./heures-facturables";
export { HEURE_FACTURABLE_CATEGORIES } from "./heures-facturables";

// ---- Factures ----
export type {
  Facture,
  FactureCreate,
  FactureUpdate,
  FactureStatut,
} from "./factures";
export { FACTURE_STATUTS } from "./factures";

// ---- Messages ----
export type { Message, MessageCreate, MessageUpdate } from "./messages";

// ---- Notes ----
export type { Note, NoteCreate, NoteUpdate, NoteType } from "./notes";
export { NOTE_TYPES } from "./notes";

// ---- Global Schema ----
export type { Schema } from "./schema";
