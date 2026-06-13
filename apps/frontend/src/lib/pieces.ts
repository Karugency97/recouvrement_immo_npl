// COPIE du catalogue backend convex/lib/pieces.ts (le frontend ne peut
// pas importer convex/lib). Garder synchronisé. Sert à afficher la liste
// de pièces en live à l'étape Pièces du wizard.

export type PieceRequirement = "obligatoire" | "recommandee" | "utile";
export type PieceTemplate = { type: string; requirement: PieceRequirement };

export const ALWAYS_PIECES: PieceTemplate[] = [
  { type: "Décompte de charges détaillé", requirement: "obligatoire" },
  { type: "PV d'AG approuvant les comptes", requirement: "recommandee" },
  { type: "Mandat de syndic en cours", requirement: "recommandee" },
  { type: "Mise en demeure préalable du syndic", requirement: "recommandee" },
  { type: "Relevé d'identité du débiteur", requirement: "utile" },
];

export const CONDITIONAL_PIECES: Record<string, PieceTemplate | undefined> = {
  INDIVISION: { type: "Liste des indivisaires + état civil", requirement: "obligatoire" },
  DECEDE: { type: "Acte de notoriété + déclaration de succession", requirement: "obligatoire" },
  REDRESSEMENT: { type: "Justificatif de redressement / liquidation", requirement: "obligatoire" },
  LOT_LOUE: { type: "Bail locatif + identité du locataire", requirement: "recommandee" },
  MULTI_LOTS: undefined,
};

export function buildPieces(casSpecial: string[]): PieceTemplate[] {
  const seen = new Set<string>();
  const result: PieceTemplate[] = [];
  for (const p of ALWAYS_PIECES) {
    if (!seen.has(p.type)) {
      seen.add(p.type);
      result.push(p);
    }
  }
  for (const cas of casSpecial) {
    const p = CONDITIONAL_PIECES[cas];
    if (p && !seen.has(p.type)) {
      seen.add(p.type);
      result.push(p);
    }
  }
  return result;
}
