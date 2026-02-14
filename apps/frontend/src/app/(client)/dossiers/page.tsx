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
import { requireAuth, getAuthToken, getUserRole } from "@/lib/dal";
import { getDossiers } from "@/lib/api/dossiers";
import { getSyndicByUserId } from "@/lib/api/syndics";

/* -------------------------------------------------------------------------- */
/*  Page component (Server Component — async)                                 */
/* -------------------------------------------------------------------------- */

export default async function DossiersPage() {
  const user = await requireAuth();
  const token = (await getAuthToken())!;
  const role = getUserRole(user);

  // Get syndic record if user is syndic
  const syndic = role === "syndic" ? await getSyndicByUserId(token, user.id) : null;
  const syndicId = (syndic as Record<string, unknown> | null)?.id as string | undefined;

  // Fetch dossiers (filtered by syndic for client users)
  const dossiersRaw = await (syndicId
    ? getDossiers(token, { syndic_id: { _eq: syndicId } })
    : getDossiers(token)
  ).catch(() => []);

  const dossiers = dossiersRaw as Record<string, unknown>[];

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
            const debiteur = dossier.debiteur_id as Record<string, unknown> | null;
            const copro = dossier.copropriete_id as Record<string, unknown> | null;
            const debiteurLabel = debiteur
              ? `${debiteur.prenom || ""} ${debiteur.nom || ""}`.trim()
              : "—";
            const coproLabel = (copro?.nom as string) || "—";
            const montantTotal = Number(dossier.montant_initial) || 0;
            const montantRecouvre = Number(dossier.montant_recouvre) || 0;
            const pourcentage =
              montantTotal > 0
                ? Math.round((montantRecouvre / montantTotal) * 100)
                : 0;

            return (
              <Link key={dossier.id as string} href={`/dossiers/${dossier.id}`}>
                <Card className="card-hover group cursor-pointer">
                  <CardContent className="p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      {/* Left: reference, debiteur, copropriete */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-foreground">
                            {(dossier.reference as string) || "—"}
                          </span>
                          <StatusBadge status={(dossier.statut as string) || "nouveau"} />
                        </div>
                        <p className="text-sm text-foreground mt-1">
                          {debiteurLabel}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {coproLabel}
                          {(dossier.lot_description as string) ? ` — ${dossier.lot_description}` : ""}
                        </p>
                      </div>

                      {/* Right: amounts + arrow */}
                      <div className="flex items-center gap-4 sm:text-right shrink-0">
                        <div>
                          <p className="text-sm font-semibold text-foreground">
                            {formatCurrency(montantTotal)}
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
                              ? `${formatCurrency(montantRecouvre)} recouvre (${pourcentage}%)`
                              : "Aucun recouvrement"}
                          </p>
                          {(dossier.date_created as string) ? (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Cree le {formatDate(dossier.date_created as string)}
                            </p>
                          ) : null}
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
