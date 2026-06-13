// ─────────────────────────────────────────────────────────────────
// Catalogue des pièces justificatives (PLAN_V1 §3).
// Source de vérité backend ; le frontend en a une COPIE (il ne peut pas
// importer convex/lib). Garder les deux synchronisés (cf.
// apps/frontend/src/lib/pieces.ts).
// ─────────────────────────────────────────────────────────────────

export type PieceRequirement = "obligatoire" | "recommandee" | "utile";
export type PieceTemplate = { type: string; requirement: PieceRequirement };

// Toujours demandées.
export const ALWAYS_PIECES: PieceTemplate[] = [
  { type: "Décompte de charges détaillé", requirement: "obligatoire" },
  { type: "PV d'AG approuvant les comptes", requirement: "recommandee" },
  { type: "Mandat de syndic en cours", requirement: "recommandee" },
  { type: "Mise en demeure préalable du syndic", requirement: "recommandee" },
  { type: "Relevé d'identité du débiteur", requirement: "utile" },
];

// Cas spécial → pièce conditionnelle. MULTI_LOTS = regroupement
// procédural, pas de pièce dédiée (PLAN_V1).
export const CONDITIONAL_PIECES: Record<string, PieceTemplate | undefined> = {
  INDIVISION: {
    type: "Liste des indivisaires + état civil",
    requirement: "obligatoire",
  },
  DECEDE: {
    type: "Acte de notoriété + déclaration de succession",
    requirement: "obligatoire",
  },
  REDRESSEMENT: {
    type: "Justificatif de redressement / liquidation",
    requirement: "obligatoire",
  },
  LOT_LOUE: {
    type: "Bail locatif + identité du locataire",
    requirement: "recommandee",
  },
  MULTI_LOTS: undefined,
};

// Liste finale = toujours + conditionnelles des cas cochés, dédupliquées
// par `type` (l'ordre suit ALWAYS puis l'ordre des cas spéciaux).
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
