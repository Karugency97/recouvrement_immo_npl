import {
  Clock,
  Receipt,
  Plus,
  Download,
  Send,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatsCard } from "@/components/shared/StatsCard";
import { FACTURE_STATUT_LABELS } from "@/lib/utils/constants";

/* ------------------------------------------------------------------ */
/*  Placeholder data                                                   */
/* ------------------------------------------------------------------ */

const heuresNonFacturees = [
  {
    id: "h1",
    dossier_reference: "LR-2026-047",
    dossier_id: "d1",
    debiteur: "Martin Dupont",
    description: "Analyse pieces justificatives",
    date: "10/02/2026",
    duree: "1h30",
    tarif_horaire: "250,00 \u20AC",
    montant: "375,00 \u20AC",
    avocat: "Me Claire Fontaine",
  },
  {
    id: "h2",
    dossier_reference: "LR-2026-047",
    dossier_id: "d1",
    debiteur: "Martin Dupont",
    description: "Relance telephonique debiteur",
    date: "05/02/2026",
    duree: "0h15",
    tarif_horaire: "250,00 \u20AC",
    montant: "62,50 \u20AC",
    avocat: "Me Claire Fontaine",
  },
  {
    id: "h3",
    dossier_reference: "LR-2026-046",
    dossier_id: "d2",
    debiteur: "SCI Bellevue",
    description: "Preparation audience TGI",
    date: "08/02/2026",
    duree: "3h00",
    tarif_horaire: "250,00 \u20AC",
    montant: "750,00 \u20AC",
    avocat: "Me Claire Fontaine",
  },
  {
    id: "h4",
    dossier_reference: "LR-2026-045",
    dossier_id: "d3",
    debiteur: "Jean-Pierre Moreau",
    description: "Redaction conclusions",
    date: "03/02/2026",
    duree: "2h30",
    tarif_horaire: "250,00 \u20AC",
    montant: "625,00 \u20AC",
    avocat: "Me Claire Fontaine",
  },
  {
    id: "h5",
    dossier_reference: "LR-2026-042",
    dossier_id: "d6",
    debiteur: "Marie Durand",
    description: "Suivi execution forcee",
    date: "01/02/2026",
    duree: "1h00",
    tarif_horaire: "250,00 \u20AC",
    montant: "250,00 \u20AC",
    avocat: "Me Claire Fontaine",
  },
];

const factures = [
  {
    id: "f1",
    numero: "FAC-2026-012",
    syndic: "Foncia Paris Ouest",
    dossier_reference: "LR-2026-041",
    date_emission: "31/01/2026",
    montant_ht: "1 500,00 \u20AC",
    montant_ttc: "1 800,00 \u20AC",
    statut: "payee",
  },
  {
    id: "f2",
    numero: "FAC-2026-011",
    syndic: "Nexity Gestion",
    dossier_reference: "LR-2026-038",
    date_emission: "28/01/2026",
    montant_ht: "2 250,00 \u20AC",
    montant_ttc: "2 700,00 \u20AC",
    statut: "envoyee",
  },
  {
    id: "f3",
    numero: "FAC-2026-010",
    syndic: "Citya Immobilier",
    dossier_reference: "LR-2026-035",
    date_emission: "25/01/2026",
    montant_ht: "875,00 \u20AC",
    montant_ttc: "1 050,00 \u20AC",
    statut: "en_retard",
  },
  {
    id: "f4",
    numero: "FAC-2026-009",
    syndic: "Lamy - Gestrim",
    dossier_reference: "LR-2026-032",
    date_emission: "20/01/2026",
    montant_ht: "3 125,00 \u20AC",
    montant_ttc: "3 750,00 \u20AC",
    statut: "payee",
  },
  {
    id: "f5",
    numero: "FAC-2026-008",
    syndic: "Foncia Paris Ouest",
    dossier_reference: "LR-2026-030",
    date_emission: "15/01/2026",
    montant_ht: "1 875,00 \u20AC",
    montant_ttc: "2 250,00 \u20AC",
    statut: "emise",
  },
];

const factureStatutStyles: Record<string, string> = {
  brouillon: "bg-slate-100 text-slate-700 border-slate-200",
  emise: "bg-blue-100 text-blue-700 border-blue-200",
  envoyee: "bg-amber-100 text-amber-700 border-amber-200",
  payee: "bg-emerald-100 text-emerald-700 border-emerald-200",
  en_retard: "bg-red-100 text-red-700 border-red-200",
  annulee: "bg-slate-100 text-slate-700 border-slate-200",
};

/* ------------------------------------------------------------------ */
/*  Page component                                                     */
/* ------------------------------------------------------------------ */

export default function AdminFacturationPage() {
  const totalHeuresNonFacturees = "8h15";
  const totalMontantEnAttente = "2 062,50 \u20AC";

  return (
    <div className="animate-fade-in space-y-6">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Facturation</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Suivi des heures et gestion des factures
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Nouvelle Facture
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatsCard
          label="Heures non facturees"
          value={totalHeuresNonFacturees}
          subtitle="5 entrees en attente de facturation"
          icon={Clock}
          iconBgColor="bg-amber-100"
          iconColor="text-amber-600"
        />
        <StatsCard
          label="Total en attente"
          value={totalMontantEnAttente}
          subtitle="A facturer aux syndics"
          icon={Receipt}
          iconBgColor="bg-indigo-100"
          iconColor="text-indigo-600"
          valueColor="text-indigo-600"
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="heures" className="space-y-4">
        <TabsList>
          <TabsTrigger value="heures" className="gap-1.5">
            <Clock className="h-4 w-4" />
            Heures non facturees
            <Badge
              variant="secondary"
              className="ml-1 h-5 px-1.5 text-[10px]"
            >
              {heuresNonFacturees.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="factures" className="gap-1.5">
            <FileText className="h-4 w-4" />
            Factures
            <Badge
              variant="secondary"
              className="ml-1 h-5 px-1.5 text-[10px]"
            >
              {factures.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        {/* ---- Heures non facturees ---- */}
        <TabsContent value="heures">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">
                Heures en attente de facturation
              </CardTitle>
              <Button size="sm" variant="outline">
                <Receipt className="h-4 w-4 mr-2" />
                Generer une facture
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">Dossier</TableHead>
                    <TableHead>Debiteur</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Duree</TableHead>
                    <TableHead className="text-right pr-6">Montant</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {heuresNonFacturees.map((h) => (
                    <TableRow key={h.id} className="table-row-hover">
                      <TableCell className="pl-6">
                        <span className="text-sm font-medium text-indigo-600">
                          {h.dossier_reference}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm">{h.debiteur}</TableCell>
                      <TableCell className="text-sm">
                        {h.description}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {h.date}
                      </TableCell>
                      <TableCell className="text-sm font-medium">
                        {h.duree}
                      </TableCell>
                      <TableCell className="text-right pr-6 text-sm font-medium">
                        {h.montant}
                      </TableCell>
                    </TableRow>
                  ))}
                  {/* Total row */}
                  <TableRow className="bg-muted/50 font-medium">
                    <TableCell
                      colSpan={4}
                      className="pl-6 text-sm font-semibold"
                    >
                      Total
                    </TableCell>
                    <TableCell className="text-sm font-semibold">
                      {totalHeuresNonFacturees}
                    </TableCell>
                    <TableCell className="text-right pr-6 text-sm font-semibold text-indigo-600">
                      {totalMontantEnAttente}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---- Factures ---- */}
        <TabsContent value="factures">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">Numero</TableHead>
                    <TableHead>Syndic</TableHead>
                    <TableHead>Dossier</TableHead>
                    <TableHead>Date emission</TableHead>
                    <TableHead>Montant HT</TableHead>
                    <TableHead>Montant TTC</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right pr-6">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {factures.map((f) => (
                    <TableRow key={f.id} className="table-row-hover">
                      <TableCell className="pl-6">
                        <span className="text-sm font-medium">
                          {f.numero}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm">{f.syndic}</TableCell>
                      <TableCell>
                        <span className="text-sm font-medium text-indigo-600">
                          {f.dossier_reference}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {f.date_emission}
                      </TableCell>
                      <TableCell className="text-sm">
                        {f.montant_ht}
                      </TableCell>
                      <TableCell className="text-sm font-medium">
                        {f.montant_ttc}
                      </TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            "rounded-full px-2.5 py-0.5 text-xs font-medium border inline-flex items-center",
                            factureStatutStyles[f.statut] ||
                              "bg-slate-100 text-slate-700 border-slate-200"
                          )}
                        >
                          {FACTURE_STATUT_LABELS[f.statut] || f.statut}
                        </span>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Download className="h-4 w-4" />
                          </Button>
                          {(f.statut === "emise" ||
                            f.statut === "brouillon") && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                            >
                              <Send className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
