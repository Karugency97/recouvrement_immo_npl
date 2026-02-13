/** Labels for dossier statuses */
export const STATUT_LABELS: Record<string, string> = {
  nouveau: "Nouveau",
  en_cours: "En cours",
  mise_en_demeure: "Mise en demeure",
  assignation: "Assignation",
  injonction: "Injonction",
  audience: "Audience",
  jugement: "Jugement",
  execution: "Execution",
  paye: "Paye",
  cloture: "Cloture",
  irrecovrable: "Irrecovrable",
};

/** Labels for dossier phases */
export const PHASE_LABELS: Record<string, string> = {
  amiable: "Amiable",
  pre_contentieux: "Pre-contentieux",
  contentieux: "Contentieux",
  execution: "Execution",
};

/** Labels for priorities */
export const PRIORITE_LABELS: Record<string, string> = {
  basse: "Basse",
  normale: "Normale",
  haute: "Haute",
  urgente: "Urgente",
};

/** Labels for task types */
export const TACHE_TYPE_LABELS: Record<string, string> = {
  tache: "Tache",
  audience: "Audience",
  echeance: "Echeance",
  relance: "Relance",
  rdv: "Rendez-vous",
};

/** Labels for task statuses */
export const TACHE_STATUT_LABELS: Record<string, string> = {
  a_faire: "A faire",
  en_cours: "En cours",
  terminee: "Terminee",
  annulee: "Annulee",
};

/** Labels for document types */
export const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  releve_compte: "Releve de compte",
  appel_fonds: "Appel de fonds",
  contrat_syndic: "Contrat syndic",
  mise_en_demeure: "Mise en demeure",
  assignation: "Assignation",
  jugement: "Jugement",
  proces_verbal: "Proces-verbal",
  correspondance: "Correspondance",
  autre: "Autre",
};

/** Labels for creance types */
export const CREANCE_TYPE_LABELS: Record<string, string> = {
  charges_copropriete: "Charges copropriete",
  travaux: "Travaux",
  fond_travaux: "Fond travaux",
  penalites: "Penalites",
  frais_recouvrement: "Frais de recouvrement",
  interets: "Interets",
  article_700: "Article 700",
  depens: "Depens",
};

/** Labels for invoice statuses */
export const FACTURE_STATUT_LABELS: Record<string, string> = {
  brouillon: "Brouillon",
  emise: "Emise",
  envoyee: "Envoyee",
  payee: "Payee",
  en_retard: "En retard",
  annulee: "Annulee",
};

/** Document category mapping for badges */
export const DOCUMENT_CATEGORIES: Record<string, string> = {
  releve_compte: "preuve",
  appel_fonds: "preuve",
  contrat_syndic: "preuve",
  mise_en_demeure: "procedure",
  assignation: "procedure",
  jugement: "procedure",
  proces_verbal: "procedure",
  correspondance: "correspondance",
  autre: "correspondance",
};
