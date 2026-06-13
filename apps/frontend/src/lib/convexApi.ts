import { makeFunctionReference } from "convex/server";

// Références type-erased vers les fonctions Convex (pattern playground :
// pas d'import de convex/_generated pour ne pas coupler le tsconfig
// frontend au codegen). Les types ci-dessous reflètent les champs
// réellement consommés par l'UI.

export const meQuery = makeFunctionReference<"query">("users:me");
export const casesDuSyndicQuery = makeFunctionReference<"query">("cases:duSyndic");
export const documentsDuDossierAction = makeFunctionReference<"action">(
  "secib:documentsDuDossier",
);
export const telechargerDocumentAction = makeFunctionReference<"action">(
  "secib:telechargerDocument",
);

export type CaseStatus =
  | "CREE"
  | "EN_ATTENTE_PIECES"
  | "PRET"
  | "MISE_EN_DEMEURE_ENVOYEE"
  | "INJONCTION_DE_PAYER"
  | "ASSIGNATION_AU_FOND"
  | "JUGEMENT_OBTENU"
  | "CLOTURE"
  | "SUSPENDU";

export type CaseDoc = {
  _id: string;
  status: CaseStatus;
  statusChangedAt: number;
  principalCents?: number;
  secibDossierId?: string;
  secibLibelle?: string;
  secibMatiereLibelle?: string;
  secibDateOuverture?: number;
  secibSnapshotAt?: number;
  secibResponsableNom?: string;
  pieces?: {
    type: string;
    requirement: "obligatoire" | "recommandee" | "utile";
    status: "REQUESTED" | "RECEIVED" | "REJECTED";
    requestedAt: number;
  }[];
  createdAt: number;
  updatedAt: number;
};

export type SecibDocumentEntry = {
  DocumentId: string;
  Libelle?: string | null;
  Extension?: string | null;
  DateCreation?: string | null;
  RepertoireLibelle?: string | null;
};

export type DocumentContent = {
  fileName: string;
  mimeType: string;
  contentBase64: string;
};

// Les réponses gateway sont enveloppées { data: T }.
export type GatewayResponse<T> = { data?: T };

export const messagesByCaseQuery = makeFunctionReference<"query">("messages:byCase");
export const sendMessageMutation = makeFunctionReference<"mutation">("messages:send");
export const messagerieInboxQuery = makeFunctionReference<"query">("messages:inbox");

export const getMyDraftQuery = makeFunctionReference<"query">("caseDrafts:getMyDraft");
export const saveDraftMutation = makeFunctionReference<"mutation">("caseDrafts:saveDraft");
export const submitDraftMutation = makeFunctionReference<"mutation">("caseDrafts:submitDraft");

export type CasSpecial =
  | "INDIVISION"
  | "DECEDE"
  | "REDRESSEMENT"
  | "LOT_LOUE"
  | "MULTI_LOTS";

export type WizardData = {
  debiteur: {
    type: "PP" | "PM";
    nom: string;
    adresse: string;
    email: string;
    telephone: string;
    lotDescription: string;
  };
  creance: {
    montant: string; // euros (string d'input) — converti en cents au submit
    dateExigibilite: string; // yyyy-mm-dd
    periodeDebut: string;
    periodeFin: string;
    nbRelances: string;
    observations: string;
  };
  casSpecial: CasSpecial[];
};

export type DraftDoc = {
  _id: string;
  currentStep: string;
  wizardData: WizardData;
  updatedAt: number;
};

export type MessageDoc = {
  _id: string;
  senderRole: "syndic" | "avocat";
  body: string;
  createdAt: number;
};

export type InboxEntry = {
  caseId: string;
  secibLibelle?: string;
  status: CaseStatus;
  lastMessageAt: number;
};
