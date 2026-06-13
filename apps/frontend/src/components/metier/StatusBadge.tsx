import { Badge } from "@/components/ui/badge";
import type { CaseStatus } from "@/lib/convexApi";

// Mapping statuts → libellés FR + classes sémantiques du design system
// (tokens HSL de globals.css). Pill par convention badges.
const STATUS_CONFIG: Record<CaseStatus, { label: string; className: string }> = {
  CREE: { label: "Créé", className: "bg-info/15 text-info border-info/30" },
  EN_ATTENTE_PIECES: {
    label: "En attente de pièces",
    className: "bg-warning/15 text-warning border-warning/30",
  },
  PRET: { label: "Prêt", className: "bg-success/15 text-success border-success/30" },
  MISE_EN_DEMEURE_ENVOYEE: {
    label: "Mise en demeure envoyée",
    className: "bg-primary/15 text-primary border-primary/30",
  },
  INJONCTION_DE_PAYER: {
    label: "Injonction de payer",
    className: "bg-primary/15 text-primary border-primary/30",
  },
  ASSIGNATION_AU_FOND: {
    label: "Assignation au fond",
    className: "bg-primary/15 text-primary border-primary/30",
  },
  JUGEMENT_OBTENU: {
    label: "Jugement obtenu",
    className: "bg-success/15 text-success border-success/30",
  },
  CLOTURE: { label: "Clôturé", className: "bg-muted text-muted-foreground" },
  SUSPENDU: { label: "Suspendu", className: "bg-muted text-muted-foreground" },
};

export function StatusBadge({ status }: { status: CaseStatus }) {
  const config = STATUS_CONFIG[status] ?? {
    label: status,
    className: "bg-muted text-muted-foreground",
  };
  return (
    <Badge variant="outline" className={`rounded-full ${config.className}`}>
      {config.label}
    </Badge>
  );
}
