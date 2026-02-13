import Link from "next/link";
import { Search, Plus, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/shared/StatusBadge";
import {
  STATUT_LABELS,
  PHASE_LABELS,
} from "@/lib/utils/constants";

/* ------------------------------------------------------------------ */
/*  Placeholder data                                                   */
/* ------------------------------------------------------------------ */

const dossiers = [
  {
    id: "d1",
    reference: "LR-2026-047",
    copropriete: "Residence Les Oliviers",
    debiteur: "Martin Dupont",
    statut: "mise_en_demeure",
    phase: "pre_contentieux",
    montant: "18 450,00 \u20AC",
    date: "10/02/2026",
  },
  {
    id: "d2",
    reference: "LR-2026-046",
    copropriete: "Le Clos Saint-Jacques",
    debiteur: "SCI Bellevue",
    statut: "assignation",
    phase: "contentieux",
    montant: "34 200,00 \u20AC",
    date: "08/02/2026",
  },
  {
    id: "d3",
    reference: "LR-2026-045",
    copropriete: "Les Terrasses du Parc",
    debiteur: "Jean-Pierre Moreau",
    statut: "audience",
    phase: "contentieux",
    montant: "12 780,00 \u20AC",
    date: "05/02/2026",
  },
  {
    id: "d4",
    reference: "LR-2026-044",
    copropriete: "Domaine de la Source",
    debiteur: "Sophie Lambert",
    statut: "en_cours",
    phase: "amiable",
    montant: "8 920,00 \u20AC",
    date: "03/02/2026",
  },
  {
    id: "d5",
    reference: "LR-2026-043",
    copropriete: "Villa Marguerite",
    debiteur: "Pierre Lefebvre",
    statut: "jugement",
    phase: "contentieux",
    montant: "22 100,00 \u20AC",
    date: "01/02/2026",
  },
  {
    id: "d6",
    reference: "LR-2026-042",
    copropriete: "Les Hauts de Seine",
    debiteur: "Marie Durand",
    statut: "execution",
    phase: "execution",
    montant: "15 340,00 \u20AC",
    date: "28/01/2026",
  },
  {
    id: "d7",
    reference: "LR-2026-041",
    copropriete: "Residence du Lac",
    debiteur: "SCI Panorama",
    statut: "paye",
    phase: "execution",
    montant: "9 800,00 \u20AC",
    date: "25/01/2026",
  },
  {
    id: "d8",
    reference: "LR-2026-040",
    copropriete: "Le Hameau des Roses",
    debiteur: "Francois Bernard",
    statut: "nouveau",
    phase: "amiable",
    montant: "6 250,00 \u20AC",
    date: "22/01/2026",
  },
];

const phaseStyles: Record<string, string> = {
  amiable: "bg-blue-100 text-blue-700 border-blue-200",
  pre_contentieux: "bg-amber-100 text-amber-700 border-amber-200",
  contentieux: "bg-red-100 text-red-700 border-red-200",
  execution: "bg-purple-100 text-purple-700 border-purple-200",
};

/* ------------------------------------------------------------------ */
/*  Page component                                                     */
/* ------------------------------------------------------------------ */

export default function AdminDossiersPage() {
  return (
    <div className="animate-fade-in space-y-6">
      {/* Title + action */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Tous les Dossiers
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {dossiers.length} dossiers au total
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Nouveau Dossier
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Rechercher par reference, debiteur, copropriete..."
                className="pl-9"
              />
            </div>

            {/* Status filter */}
            <Select>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(STATUT_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Phase filter */}
            <Select>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Phase" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PHASE_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button variant="outline" size="icon" className="shrink-0">
              <SlidersHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Dossiers table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Reference</TableHead>
                <TableHead>Copropriete</TableHead>
                <TableHead>Debiteur</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Phase</TableHead>
                <TableHead className="text-right">Montant</TableHead>
                <TableHead className="pr-6 text-right">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dossiers.map((d) => (
                <TableRow key={d.id} className="table-row-hover">
                  <TableCell className="pl-6">
                    <Link
                      href={`/admin/dossiers/${d.id}`}
                      className="font-medium text-indigo-600 hover:underline"
                    >
                      {d.reference}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm">{d.copropriete}</TableCell>
                  <TableCell className="text-sm">{d.debiteur}</TableCell>
                  <TableCell>
                    <StatusBadge status={d.statut} />
                  </TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-0.5 text-xs font-medium border inline-flex items-center",
                        phaseStyles[d.phase] ||
                          "bg-slate-100 text-slate-700 border-slate-200"
                      )}
                    >
                      {PHASE_LABELS[d.phase] || d.phase}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-medium text-sm">
                    {d.montant}
                  </TableCell>
                  <TableCell className="pr-6 text-right text-sm text-muted-foreground">
                    {d.date}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
