import { Plus, ArrowRight, Search, Filter, FolderOpen } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils/format-currency";
import { formatDate } from "@/lib/utils/format-date";

/* -------------------------------------------------------------------------- */
/*  Placeholder data (will be replaced by Directus API calls)                 */
/* -------------------------------------------------------------------------- */

const dossiers = [
  {
    id: "1",
    reference: "LR-2026-042",
    debiteur: "SCI Les Tilleuls",
    type_debiteur: "personne_morale",
    copropriete: "Residence Parc Monceau",
    statut: "mise_en_demeure",
    montant_total: 8450.0,
    montant_recouvre: 0,
    date_created: "2026-02-10T10:30:00",
    lot: "Lot 14 — T3, 2e etage",
  },
  {
    id: "2",
    reference: "LR-2026-041",
    debiteur: "M. Jean Dupont",
    type_debiteur: "personne_physique",
    copropriete: "Residence Les Lilas",
    statut: "en_cours",
    montant_total: 3200.0,
    montant_recouvre: 800.0,
    date_created: "2026-02-08T14:15:00",
    lot: "Lot 7 — T2, RDC",
  },
  {
    id: "3",
    reference: "LR-2026-039",
    debiteur: "Mme Sophie Martin",
    type_debiteur: "personne_physique",
    copropriete: "Residence Bellevue",
    statut: "assignation",
    montant_total: 12750.0,
    montant_recouvre: 0,
    date_created: "2026-02-05T09:00:00",
    lot: "Lot 22 — T4, 5e etage",
  },
  {
    id: "4",
    reference: "LR-2026-038",
    debiteur: "SCI Horizon",
    type_debiteur: "personne_morale",
    copropriete: "Les Jardins du Parc",
    statut: "nouveau",
    montant_total: 5800.0,
    montant_recouvre: 0,
    date_created: "2026-02-03T16:45:00",
    lot: "Lot 3 — Studio, 1er etage",
  },
  {
    id: "5",
    reference: "LR-2026-035",
    debiteur: "M. Pierre Lefebvre",
    type_debiteur: "personne_physique",
    copropriete: "Domaine des Roses",
    statut: "audience",
    montant_total: 15200.0,
    montant_recouvre: 2000.0,
    date_created: "2026-01-28T11:20:00",
    lot: "Lot 9 — T3, 3e etage",
  },
  {
    id: "6",
    reference: "LR-2026-030",
    debiteur: "M. Ahmed Benali",
    type_debiteur: "personne_physique",
    copropriete: "Residence Victor Hugo",
    statut: "jugement",
    montant_total: 9100.0,
    montant_recouvre: 4550.0,
    date_created: "2026-01-20T08:30:00",
    lot: "Lot 18 — T2, 4e etage",
  },
  {
    id: "7",
    reference: "LR-2026-027",
    debiteur: "Mme Claire Roux",
    type_debiteur: "personne_physique",
    copropriete: "Residence Parc Monceau",
    statut: "paye",
    montant_total: 4300.0,
    montant_recouvre: 4300.0,
    date_created: "2026-01-15T13:00:00",
    lot: "Lot 6 — T2, 1er etage",
  },
];

/* -------------------------------------------------------------------------- */
/*  Page component                                                            */
/* -------------------------------------------------------------------------- */

export default function DossiersPage() {
  return (
    <div className="animate-fade-in space-y-6">
      {/* Page heading + action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Mes Dossiers
          </h1>
          <p className="text-muted-foreground mt-1">
            Suivez l&apos;avancement de vos dossiers de recouvrement
          </p>
        </div>
        <Button asChild>
          <Link href="/dossiers/nouveau">
            <Plus className="h-4 w-4 mr-2" />
            Nouveau Dossier
          </Link>
        </Button>
      </div>

      {/* Search & filter bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par reference, debiteur, copropriete..."
            className="pl-9"
          />
        </div>
        <Button variant="outline" className="shrink-0">
          <Filter className="h-4 w-4 mr-2" />
          Filtrer
        </Button>
      </div>

      {/* Dossier list */}
      {dossiers.length === 0 ? (
        <Card>
          <CardContent className="p-6">
            <EmptyState
              icon={FolderOpen}
              title="Aucun dossier"
              description="Vous n'avez pas encore de dossier de recouvrement. Commencez par en creer un."
              action={
                <Button asChild>
                  <Link href="/dossiers/nouveau">
                    <Plus className="h-4 w-4 mr-2" />
                    Creer un dossier
                  </Link>
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {dossiers.map((dossier) => {
            const pourcentage =
              dossier.montant_total > 0
                ? Math.round(
                    (dossier.montant_recouvre / dossier.montant_total) * 100
                  )
                : 0;

            return (
              <Link key={dossier.id} href={`/dossiers/${dossier.id}`}>
                <Card className="card-hover group cursor-pointer">
                  <CardContent className="p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      {/* Left: reference, debiteur, copropriete */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-foreground">
                            {dossier.reference}
                          </span>
                          <StatusBadge status={dossier.statut} />
                        </div>
                        <p className="text-sm text-foreground mt-1">
                          {dossier.debiteur}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {dossier.copropriete} — {dossier.lot}
                        </p>
                      </div>

                      {/* Right: amounts + arrow */}
                      <div className="flex items-center gap-4 sm:text-right shrink-0">
                        <div>
                          <p className="text-sm font-semibold text-foreground">
                            {formatCurrency(dossier.montant_total)}
                          </p>
                          <p
                            className={cn(
                              "text-xs mt-0.5",
                              pourcentage === 100
                                ? "text-emerald-600"
                                : "text-muted-foreground"
                            )}
                          >
                            {pourcentage > 0
                              ? `${formatCurrency(dossier.montant_recouvre)} recouvre (${pourcentage}%)`
                              : "Aucun recouvrement"}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Cree le {formatDate(dossier.date_created)}
                          </p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
