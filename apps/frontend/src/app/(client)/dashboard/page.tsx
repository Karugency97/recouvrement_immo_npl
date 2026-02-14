import { FolderOpen, AlertCircle, TrendingUp, CheckCircle2, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatsCard } from "@/components/shared/StatsCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils/format-currency";
import { requireAuth, getAuthToken, getUserRole } from "@/lib/dal";
import { getClientStats } from "@/lib/api/stats";
import { getDossiers } from "@/lib/api/dossiers";
import { getSyndicByUserId } from "@/lib/api/syndics";

/* -------------------------------------------------------------------------- */
/*  Page component (Server Component — async)                                 */
/* -------------------------------------------------------------------------- */

export default async function DashboardPage() {
  const user = await requireAuth();
  const token = (await getAuthToken())!;
  const role = getUserRole(user);

  // Get syndic record for this user
  const syndic = role === "syndic" ? await getSyndicByUserId(token, user.id) : null;
  const syndicId = (syndic as Record<string, unknown> | null)?.id as string | undefined;

  // Fetch stats and recent dossiers in parallel
  const defaultStats = { dossiersActifs: 0, montantARecouvrer: 0, montantRecouvre: 0, dossiersClotures: 0 };
  const [stats, recentDossiersRaw] = await Promise.all([
    syndicId
      ? getClientStats(syndicId, token).catch(() => defaultStats)
      : defaultStats,
    syndicId
      ? getDossiers(token, { syndic_id: { _eq: syndicId } }).catch(() => [])
      : getDossiers(token).catch(() => []),
  ]);

  const recentDossiers = (recentDossiersRaw as Record<string, unknown>[]).slice(0, 5);

  return (
    <div className="animate-fade-in space-y-6">
      {/* Page heading */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Tableau de bord
        </h1>
        <p className="text-muted-foreground mt-1">
          Vue d&apos;ensemble de vos dossiers de recouvrement
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          label="Dossiers Actifs"
          value={stats.dossiersActifs.toString()}
          subtitle="Dossiers en cours de traitement"
          icon={FolderOpen}
          iconBgColor="bg-blue-100"
          iconColor="text-blue-600"
        />
        <StatsCard
          label="Montant a Recouvrer"
          value={formatCurrency(stats.montantARecouvrer)}
          subtitle="Total des creances en cours"
          icon={AlertCircle}
          iconBgColor="bg-red-100"
          iconColor="text-red-600"
          valueColor="text-red-600"
        />
        <StatsCard
          label="Montant Recouvre"
          value={formatCurrency(stats.montantRecouvre)}
          subtitle="Total recouvre ce trimestre"
          icon={TrendingUp}
          iconBgColor="bg-emerald-100"
          iconColor="text-emerald-600"
          valueColor="text-emerald-600"
        />
        <StatsCard
          label="Dossiers Clotures"
          value={stats.dossiersClotures.toString()}
          subtitle="Dossiers resolus cette annee"
          icon={CheckCircle2}
          iconBgColor="bg-slate-100"
          iconColor="text-slate-600"
        />
      </div>

      {/* Recent dossiers */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="text-base">Dossiers Recents</CardTitle>
          <Link
            href="/dossiers"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
          >
            Voir tous
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </CardHeader>
        <CardContent className="px-6 pb-6">
          {recentDossiers.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Aucun dossier pour le moment
            </p>
          ) : (
            <div className="space-y-0 divide-y divide-border">
              {recentDossiers.map((dossier) => {
                const debiteur = dossier.debiteur_id as Record<string, unknown> | null;
                const copro = dossier.copropriete_id as Record<string, unknown> | null;
                const debiteurLabel = debiteur
                  ? `${debiteur.prenom || ""} ${debiteur.nom || ""}`.trim()
                  : "—";
                const coproLabel = (copro?.nom as string) || "—";

                return (
                  <Link
                    key={dossier.id as string}
                    href={`/dossiers/${dossier.id}`}
                    className="flex items-center justify-between py-3.5 hover:bg-muted/50 -mx-2 px-2 rounded-lg transition-colors group first:pt-0"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-foreground">
                          {(dossier.reference as string) || "—"}
                        </span>
                        <StatusBadge status={(dossier.statut as string) || "nouveau"} />
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5 truncate">
                        {debiteurLabel} — {coproLabel}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 ml-4 shrink-0">
                      <span className="text-sm font-semibold text-foreground">
                        {formatCurrency((dossier.montant_total as number) || 0)}
                      </span>
                      <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
