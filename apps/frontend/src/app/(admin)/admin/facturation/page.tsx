import { Clock, Receipt, Plus, Download, Send, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatsCard } from "@/components/shared/StatsCard";
import { FACTURE_STATUT_LABELS } from "@/lib/utils/constants";
import { requireAuth, getAuthToken } from "@/lib/dal";
import { getHeures } from "@/lib/api/heures";
import { getFactures } from "@/lib/api/factures";
import { formatCurrency } from "@/lib/utils/format-currency";
import { formatDate } from "@/lib/utils/format-date";

const factureStatutStyles: Record<string, string> = {
  brouillon: "bg-slate-100 text-slate-700 border-slate-200",
  emise: "bg-blue-100 text-blue-700 border-blue-200",
  envoyee: "bg-amber-100 text-amber-700 border-amber-200",
  payee: "bg-emerald-100 text-emerald-700 border-emerald-200",
  en_retard: "bg-red-100 text-red-700 border-red-200",
  annulee: "bg-slate-100 text-slate-700 border-slate-200",
};

export default async function AdminFacturationPage() {
  await requireAuth();
  const token = (await getAuthToken())!;

  const [heuresRaw, facturesRaw] = await Promise.all([
    getHeures(token, { facture_id: { _null: true } }).catch(() => []) as Promise<Record<string, unknown>[]>,
    getFactures(token).catch(() => []) as Promise<Record<string, unknown>[]>,
  ]);

  const heures = heuresRaw as Record<string, unknown>[];
  const factures = facturesRaw as Record<string, unknown>[];

  // Calculate stats
  const totalMinutes = heures.reduce((sum, h) => sum + (Number(h.duree_minutes) || 0), 0);
  const totalDureeStr = `${Math.floor(totalMinutes / 60)}h${String(totalMinutes % 60).padStart(2, "0")}`;
  const tarifHoraire = 250;
  const totalMontant = (totalMinutes / 60) * tarifHoraire;

  return (
    <div className="animate-fade-in space-y-6">
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatsCard
          label="Heures non facturees"
          value={totalDureeStr}
          subtitle={`${heures.length} entree${heures.length > 1 ? "s" : ""} en attente de facturation`}
          icon={Clock}
          iconBgColor="bg-amber-100"
          iconColor="text-amber-600"
        />
        <StatsCard
          label="Total en attente"
          value={formatCurrency(totalMontant)}
          subtitle="A facturer aux syndics"
          icon={Receipt}
          iconBgColor="bg-indigo-100"
          iconColor="text-indigo-600"
          valueColor="text-indigo-600"
        />
      </div>

      <Tabs defaultValue="heures" className="space-y-4">
        <TabsList>
          <TabsTrigger value="heures" className="gap-1.5">
            <Clock className="h-4 w-4" />
            Heures non facturees
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
              {heures.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="factures" className="gap-1.5">
            <FileText className="h-4 w-4" />
            Factures
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
              {factures.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="heures">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Heures en attente de facturation</CardTitle>
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
                  {heures.map((h) => {
                    const dossier = h.dossier_id as Record<string, unknown> | null;
                    const debiteur = dossier?.debiteur_id as Record<string, unknown> | null;
                    const minutes = Number(h.duree_minutes) || 0;
                    const montant = (minutes / 60) * tarifHoraire;
                    const dureeStr = `${Math.floor(minutes / 60)}h${String(minutes % 60).padStart(2, "0")}`;
                    return (
                      <TableRow key={h.id as string} className="table-row-hover">
                        <TableCell className="pl-6">
                          <span className="text-sm font-medium text-indigo-600">
                            {(dossier?.reference as string) || "—"}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm">
                          {debiteur
                            ? `${(debiteur.prenom as string) || ""} ${(debiteur.nom as string) || ""}`.trim()
                            : "—"}
                        </TableCell>
                        <TableCell className="text-sm">{(h.description as string) || "—"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {h.date ? formatDate(h.date as string) : "—"}
                        </TableCell>
                        <TableCell className="text-sm font-medium">{dureeStr}</TableCell>
                        <TableCell className="text-right pr-6 text-sm font-medium">
                          {formatCurrency(montant)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {heures.length > 0 && (
                    <TableRow className="bg-muted/50 font-medium">
                      <TableCell colSpan={4} className="pl-6 text-sm font-semibold">Total</TableCell>
                      <TableCell className="text-sm font-semibold">{totalDureeStr}</TableCell>
                      <TableCell className="text-right pr-6 text-sm font-semibold text-indigo-600">
                        {formatCurrency(totalMontant)}
                      </TableCell>
                    </TableRow>
                  )}
                  {heures.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        Aucune heure non facturee
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

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
                  {factures.map((f) => {
                    const syndic = f.syndic_id as Record<string, unknown> | null;
                    const dossier = f.dossier_id as Record<string, unknown> | null;
                    const statut = (f.statut as string) || "brouillon";
                    return (
                      <TableRow key={f.id as string} className="table-row-hover">
                        <TableCell className="pl-6">
                          <span className="text-sm font-medium">{(f.numero as string) || "—"}</span>
                        </TableCell>
                        <TableCell className="text-sm">
                          {(syndic?.raison_sociale as string) || "—"}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm font-medium text-indigo-600">
                            {(dossier?.reference as string) || "—"}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {f.date_emission ? formatDate(f.date_emission as string) : "—"}
                        </TableCell>
                        <TableCell className="text-sm">
                          {f.montant_ht ? formatCurrency(f.montant_ht as number) : "—"}
                        </TableCell>
                        <TableCell className="text-sm font-medium">
                          {f.montant_ttc ? formatCurrency(f.montant_ttc as number) : "—"}
                        </TableCell>
                        <TableCell>
                          <span
                            className={cn(
                              "rounded-full px-2.5 py-0.5 text-xs font-medium border inline-flex items-center",
                              factureStatutStyles[statut] || "bg-slate-100 text-slate-700 border-slate-200"
                            )}
                          >
                            {FACTURE_STATUT_LABELS[statut] || statut}
                          </span>
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Download className="h-4 w-4" />
                            </Button>
                            {(statut === "emise" || statut === "brouillon") && (
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Send className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {factures.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        Aucune facture
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
