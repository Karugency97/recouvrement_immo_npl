import { Building2, User, Mail, Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { requireAuth, getAuthToken } from "@/lib/dal";
import { getSyndics } from "@/lib/api/syndics";
import { getDebiteurs } from "@/lib/api/debiteurs";
import { getDossiers } from "@/lib/api/dossiers";

export default async function AdminAnnuairePage() {
  await requireAuth();
  const token = (await getAuthToken())!;

  const [syndicsRaw, debiteursRaw, dossiersRaw] = await Promise.all([
    getSyndics(token).catch(() => []) as Promise<Record<string, unknown>[]>,
    getDebiteurs(token).catch(() => []) as Promise<Record<string, unknown>[]>,
    getDossiers(token).catch(() => []) as Promise<Record<string, unknown>[]>,
  ]);

  const syndics = syndicsRaw as Record<string, unknown>[];
  const debiteurs = debiteursRaw as Record<string, unknown>[];
  const dossiers = dossiersRaw as Record<string, unknown>[];

  // Count dossiers per syndic
  const dossiersBySyndic = dossiers.reduce<Record<string, number>>((acc, d) => {
    const syndicId =
      (d.syndic_id as Record<string, unknown>)?.id as string ||
      (d.syndic_id as string);
    if (syndicId) acc[syndicId] = (acc[syndicId] || 0) + 1;
    return acc;
  }, {});

  // Count dossiers per debiteur
  const dossiersByDebiteur = dossiers.reduce<Record<string, number>>((acc, d) => {
    const debiteurId =
      (d.debiteur_id as Record<string, unknown>)?.id as string ||
      (d.debiteur_id as string);
    if (debiteurId) acc[debiteurId] = (acc[debiteurId] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Annuaire</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Repertoire des syndics et debiteurs
        </p>
      </div>

      <Tabs defaultValue="syndics" className="space-y-4">
        <TabsList>
          <TabsTrigger value="syndics" className="gap-1.5">
            <Building2 className="h-4 w-4" />
            Syndics
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
              {syndics.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="debiteurs" className="gap-1.5">
            <User className="h-4 w-4" />
            Debiteurs
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
              {debiteurs.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="syndics">
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">Raison sociale</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Telephone</TableHead>
                    <TableHead className="text-right pr-6">Nb dossiers</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {syndics.map((s) => {
                    const userInfo = s.user_id as Record<string, unknown> | null;
                    return (
                      <TableRow key={s.id as string} className="table-row-hover">
                        <TableCell className="pl-6">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                              <Building2 className="h-4 w-4" />
                            </div>
                            <span className="text-sm font-medium">
                              {(s.raison_sociale as string) || "—"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <Mail className="h-3.5 w-3.5" />
                            {(s.email as string) || (userInfo?.email as string) || "—"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <Phone className="h-3.5 w-3.5" />
                            {(s.telephone as string) || "—"}
                          </div>
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <Badge variant="secondary">
                            {dossiersBySyndic[s.id as string] || 0}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {syndics.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        Aucun syndic
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="debiteurs">
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">Nom</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Adresse</TableHead>
                    <TableHead className="text-right pr-6">Nb dossiers</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {debiteurs.map((d) => {
                    const isPersonneMorale = (d.type as string) === "personne_morale";
                    const nom = `${(d.prenom as string) || ""} ${(d.nom as string) || ""}`.trim() || "—";
                    return (
                      <TableRow key={d.id as string} className="table-row-hover">
                        <TableCell className="pl-6">
                          <div className="flex items-center gap-3">
                            <div
                              className={cn(
                                "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                                isPersonneMorale
                                  ? "bg-purple-100 text-purple-600"
                                  : "bg-slate-100 text-slate-600"
                              )}
                            >
                              {isPersonneMorale ? (
                                <Building2 className="h-4 w-4" />
                              ) : (
                                <User className="h-4 w-4" />
                              )}
                            </div>
                            <span className="text-sm font-medium">{nom}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span
                            className={cn(
                              "rounded-full px-2.5 py-0.5 text-xs font-medium border inline-flex items-center",
                              isPersonneMorale
                                ? "bg-purple-100 text-purple-700 border-purple-200"
                                : "bg-slate-100 text-slate-700 border-slate-200"
                            )}
                          >
                            {isPersonneMorale ? "Personne morale" : "Personne physique"}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[300px] truncate">
                          {(d.adresse as string) || "—"}
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <Badge variant="secondary">
                            {dossiersByDebiteur[d.id as string] || 0}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {debiteurs.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        Aucun debiteur
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
