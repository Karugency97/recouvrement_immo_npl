import { FolderOpen, AlertCircle, TrendingUp, CheckCircle2, ArrowRight, Calendar, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatsCard } from "@/components/shared/StatsCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils/format-currency";

/* -------------------------------------------------------------------------- */
/*  Placeholder data (will be replaced by Directus API calls)                 */
/* -------------------------------------------------------------------------- */

const stats = {
  dossiersActifs: 24,
  montantARecouvrer: 184320.5,
  montantRecouvre: 62499.0,
  dossiersClotures: 12,
};

const recentDossiers = [
  {
    id: "1",
    reference: "LR-2026-042",
    debiteur: "SCI Les Tilleuls",
    copropriete: "Residence Parc Monceau",
    statut: "mise_en_demeure",
    montant: 8450.0,
    date_created: "2026-02-10",
  },
  {
    id: "2",
    reference: "LR-2026-041",
    debiteur: "M. Jean Dupont",
    copropriete: "Residence Les Lilas",
    statut: "en_cours",
    montant: 3200.0,
    date_created: "2026-02-08",
  },
  {
    id: "3",
    reference: "LR-2026-039",
    debiteur: "Mme Sophie Martin",
    copropriete: "Residence Bellevue",
    statut: "assignation",
    montant: 12750.0,
    date_created: "2026-02-05",
  },
  {
    id: "4",
    reference: "LR-2026-038",
    debiteur: "SCI Horizon",
    copropriete: "Les Jardins du Parc",
    statut: "nouveau",
    montant: 5800.0,
    date_created: "2026-02-03",
  },
  {
    id: "5",
    reference: "LR-2026-035",
    debiteur: "M. Pierre Lefebvre",
    copropriete: "Domaine des Roses",
    statut: "audience",
    montant: 15200.0,
    date_created: "2026-01-28",
  },
];

const upcomingEvents = [
  {
    id: "1",
    titre: "Audience TGI Paris",
    description: "Dossier LR-2026-035 — M. Pierre Lefebvre",
    date: "18 fevrier 2026",
    heure: "14h30",
    type: "audience",
  },
  {
    id: "2",
    titre: "Echeance mise en demeure",
    description: "Dossier LR-2026-042 — SCI Les Tilleuls",
    date: "22 fevrier 2026",
    heure: "00h00",
    type: "echeance",
  },
  {
    id: "3",
    titre: "Relance amiable",
    description: "Dossier LR-2026-041 — M. Jean Dupont",
    date: "25 fevrier 2026",
    heure: "09h00",
    type: "relance",
  },
  {
    id: "4",
    titre: "Rendez-vous avocat",
    description: "Point sur les dossiers en cours",
    date: "28 fevrier 2026",
    heure: "10h00",
    type: "rdv",
  },
];

const eventTypeColors: Record<string, string> = {
  audience: "bg-purple-500",
  echeance: "bg-amber-500",
  relance: "bg-blue-500",
  rdv: "bg-emerald-500",
};

/* -------------------------------------------------------------------------- */
/*  Page component                                                            */
/* -------------------------------------------------------------------------- */

export default function DashboardPage() {
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

      {/* Content grid: Recent dossiers + Upcoming events */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent dossiers — spans 2 columns */}
        <Card className="lg:col-span-2">
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
            <div className="space-y-0 divide-y divide-border">
              {recentDossiers.map((dossier) => (
                <Link
                  key={dossier.id}
                  href={`/dossiers/${dossier.id}`}
                  className="flex items-center justify-between py-3.5 hover:bg-muted/50 -mx-2 px-2 rounded-lg transition-colors group first:pt-0"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">
                        {dossier.reference}
                      </span>
                      <StatusBadge status={dossier.statut} />
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5 truncate">
                      {dossier.debiteur} — {dossier.copropriete}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 ml-4 shrink-0">
                    <span className="text-sm font-semibold text-foreground">
                      {formatCurrency(dossier.montant)}
                    </span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming events */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Evenements a Venir</CardTitle>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <div className="space-y-0">
              {upcomingEvents.map((event, index) => (
                <div
                  key={event.id}
                  className={cn(
                    "relative flex gap-3 pb-6",
                    index === upcomingEvents.length - 1 && "pb-0"
                  )}
                >
                  {/* Vertical connector line */}
                  {index < upcomingEvents.length - 1 && (
                    <div className="absolute left-[7px] top-5 h-[calc(100%-12px)] w-0.5 bg-border" />
                  )}

                  {/* Dot */}
                  <div
                    className={cn(
                      "h-4 w-4 rounded-full mt-0.5 shrink-0 ring-4 ring-background",
                      eventTypeColors[event.type] || "bg-slate-400"
                    )}
                  />

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground leading-tight">
                      {event.titre}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {event.description}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {event.date}
                      </div>
                      {event.heure !== "00h00" && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {event.heure}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
