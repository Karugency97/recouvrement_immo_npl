import Link from "next/link";
import {
  FolderKanban,
  AlertCircle,
  TrendingUp,
  CalendarCheck,
  ArrowRight,
  Clock,
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
import { Button } from "@/components/ui/button";
import { StatsCard } from "@/components/shared/StatsCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatCurrency } from "@/lib/utils/format-currency";
import { formatDate } from "@/lib/utils/format-date";
import { requireAuth, getAuthToken } from "@/lib/dal";
import { getAdminStats } from "@/lib/api/stats";
import { getDossiers } from "@/lib/api/dossiers";
import { getTaches } from "@/lib/api/taches";

/* -------------------------------------------------------------------------- */
/*  Page component (Server Component — async)                                 */
/* -------------------------------------------------------------------------- */

export default async function AdminDashboardPage() {
  await requireAuth();
  const token = (await getAuthToken())!;

  // Fetch data in parallel
  const defaultStats = {
    dossiersActifs: 0,
    montantARecouvrer: 0,
    montantRecouvre: 0,
    dossiersClotures: 0,
    tachesUrgentes: 0,
    messagesNonLus: 0,
  };

  const [stats, dossiersRaw, tachesRaw] = await Promise.all([
    getAdminStats(token).catch(() => defaultStats),
    getDossiers(token).catch(() => []),
    getTaches(token, { statut: { _neq: "terminee" } }).catch(() => []),
  ]);

  const recentDossiers = (dossiersRaw as Record<string, unknown>[]).slice(0, 5);
  const upcomingTasks = (tachesRaw as Record<string, unknown>[]).slice(0, 5);

  return (
    <div className="animate-fade-in space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Tableau de Bord</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Vue d&apos;ensemble de l&apos;activite
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          label="Dossiers Actifs"
          value={stats.dossiersActifs.toString()}
          subtitle="Dossiers en cours de traitement"
          icon={FolderKanban}
          iconBgColor="bg-indigo-100"
          iconColor="text-indigo-600"
        />
        <StatsCard
          label="Montant a Recouvrer"
          value={formatCurrency(stats.montantARecouvrer)}
          subtitle={`Sur ${stats.dossiersActifs} dossiers actifs`}
          icon={AlertCircle}
          iconBgColor="bg-red-100"
          iconColor="text-red-600"
          valueColor="text-red-600"
        />
        <StatsCard
          label="Montant Recouvre"
          value={formatCurrency(stats.montantRecouvre)}
          subtitle="Recouvrement total"
          icon={TrendingUp}
          iconBgColor="bg-emerald-100"
          iconColor="text-emerald-600"
          valueColor="text-emerald-600"
        />
        <StatsCard
          label="Taches Urgentes"
          value={stats.tachesUrgentes.toString()}
          subtitle={`${stats.messagesNonLus} messages non lus`}
          icon={CalendarCheck}
          iconBgColor="bg-amber-100"
          iconColor="text-amber-600"
        />
      </div>

      {/* Main grid: dossiers + tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent dossiers (2 cols) */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-base">Dossiers Recents</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/admin/dossiers">
                Voir tout
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentDossiers.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Aucun dossier
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reference</TableHead>
                    <TableHead>Copropriete</TableHead>
                    <TableHead>Debiteur</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Montant</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentDossiers.map((d) => {
                    const debiteur = d.debiteur_id as Record<string, unknown> | null;
                    const copro = d.copropriete_id as Record<string, unknown> | null;
                    const debiteurLabel = debiteur
                      ? `${debiteur.prenom || ""} ${debiteur.nom || ""}`.trim()
                      : "—";

                    return (
                      <TableRow key={d.id as string} className="table-row-hover">
                        <TableCell>
                          <Link
                            href={`/admin/dossiers/${d.id}`}
                            className="font-medium text-indigo-600 hover:underline"
                          >
                            {(d.reference as string) || "—"}
                          </Link>
                        </TableCell>
                        <TableCell className="text-sm">
                          {(copro?.nom as string) || "—"}
                        </TableCell>
                        <TableCell className="text-sm">{debiteurLabel}</TableCell>
                        <TableCell>
                          <StatusBadge status={(d.statut as string) || "nouveau"} />
                        </TableCell>
                        <TableCell className="text-right font-medium text-sm">
                          {formatCurrency((d.montant_total as number) || 0)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Upcoming tasks (1 col) */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-base">Taches a venir</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/admin/taches">
                Voir tout
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {upcomingTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Aucune tache en cours
              </p>
            ) : (
              <div className="space-y-4">
                {upcomingTasks.map((t) => {
                  const isUrgent = (t.priorite as string) === "urgente" || (t.priorite as string) === "haute";
                  const dossierRef = (t.dossier_id as Record<string, unknown>)?.reference as string | undefined;

                  return (
                    <div
                      key={t.id as string}
                      className={cn(
                        "flex items-start gap-3 rounded-lg p-3 transition-colors",
                        isUrgent
                          ? "bg-red-50 border border-red-100"
                          : "bg-muted/40"
                      )}
                    >
                      <div
                        className={cn(
                          "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                          isUrgent
                            ? "bg-red-100 text-red-600"
                            : "bg-slate-100 text-slate-500"
                        )}
                      >
                        <Clock className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {(t.titre as string) || "—"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {dossierRef && `${dossierRef} — `}
                          {t.date_echeance ? formatDate(t.date_echeance as string) : "—"}
                        </p>
                      </div>
                      {isUrgent && (
                        <span className="rounded-full bg-red-100 text-red-700 border border-red-200 px-2 py-0.5 text-[10px] font-semibold shrink-0">
                          Urgent
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
