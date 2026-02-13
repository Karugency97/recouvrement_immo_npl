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

/* ------------------------------------------------------------------ */
/*  Placeholder data                                                   */
/* ------------------------------------------------------------------ */

const stats = [
  {
    label: "Dossiers Actifs",
    value: "47",
    subtitle: "+3 cette semaine",
    icon: FolderKanban,
    iconBgColor: "bg-indigo-100",
    iconColor: "text-indigo-600",
  },
  {
    label: "Montant a Recouvrer",
    value: "1 284 750,00 \u20AC",
    subtitle: "Sur 47 dossiers actifs",
    icon: AlertCircle,
    iconBgColor: "bg-red-100",
    iconColor: "text-red-600",
    valueColor: "text-red-600",
  },
  {
    label: "Montant Recouvre",
    value: "462 300,00 \u20AC",
    subtitle: "Taux de recouvrement : 26,4 %",
    icon: TrendingUp,
    iconBgColor: "bg-emerald-100",
    iconColor: "text-emerald-600",
    valueColor: "text-emerald-600",
  },
  {
    label: "Taches Urgentes",
    value: "12",
    subtitle: "4 audiences cette semaine",
    icon: CalendarCheck,
    iconBgColor: "bg-amber-100",
    iconColor: "text-amber-600",
  },
];

const recentDossiers = [
  {
    id: "d1",
    reference: "LR-2026-047",
    copropriete: "Residence Les Oliviers",
    debiteur: "Martin Dupont",
    statut: "mise_en_demeure",
    montant: "18 450,00 \u20AC",
  },
  {
    id: "d2",
    reference: "LR-2026-046",
    copropriete: "Le Clos Saint-Jacques",
    debiteur: "SCI Bellevue",
    statut: "assignation",
    montant: "34 200,00 \u20AC",
  },
  {
    id: "d3",
    reference: "LR-2026-045",
    copropriete: "Les Terrasses du Parc",
    debiteur: "Jean-Pierre Moreau",
    statut: "audience",
    montant: "12 780,00 \u20AC",
  },
  {
    id: "d4",
    reference: "LR-2026-044",
    copropriete: "Domaine de la Source",
    debiteur: "Sophie Lambert",
    statut: "en_cours",
    montant: "8 920,00 \u20AC",
  },
  {
    id: "d5",
    reference: "LR-2026-043",
    copropriete: "Villa Marguerite",
    debiteur: "Pierre Lefebvre",
    statut: "jugement",
    montant: "22 100,00 \u20AC",
  },
];

const upcomingTasks = [
  {
    id: "t1",
    titre: "Audience TGI Paris - SCI Bellevue",
    date: "14/02/2026",
    type: "audience",
    urgent: true,
  },
  {
    id: "t2",
    titre: "Relance mise en demeure - Dupont",
    date: "15/02/2026",
    type: "relance",
    urgent: true,
  },
  {
    id: "t3",
    titre: "Depot assignation - Moreau",
    date: "17/02/2026",
    type: "echeance",
    urgent: false,
  },
  {
    id: "t4",
    titre: "RDV syndic - Residence Les Oliviers",
    date: "18/02/2026",
    type: "rdv",
    urgent: false,
  },
  {
    id: "t5",
    titre: "Signification jugement - Lefebvre",
    date: "20/02/2026",
    type: "echeance",
    urgent: false,
  },
];

/* ------------------------------------------------------------------ */
/*  Page component                                                     */
/* ------------------------------------------------------------------ */

export default function AdminDashboardPage() {
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
        {stats.map((s) => (
          <StatsCard
            key={s.label}
            label={s.label}
            value={s.value}
            subtitle={s.subtitle}
            icon={s.icon}
            iconBgColor={s.iconBgColor}
            iconColor={s.iconColor}
            valueColor={s.valueColor}
          />
        ))}
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
                {recentDossiers.map((d) => (
                  <TableRow key={d.id} className="table-row-hover">
                    <TableCell>
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
                    <TableCell className="text-right font-medium text-sm">
                      {d.montant}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
            <div className="space-y-4">
              {upcomingTasks.map((t) => (
                <div
                  key={t.id}
                  className={cn(
                    "flex items-start gap-3 rounded-lg p-3 transition-colors",
                    t.urgent
                      ? "bg-red-50 border border-red-100"
                      : "bg-muted/40"
                  )}
                >
                  <div
                    className={cn(
                      "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                      t.urgent
                        ? "bg-red-100 text-red-600"
                        : "bg-slate-100 text-slate-500"
                    )}
                  >
                    <Clock className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {t.titre}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {t.date}
                    </p>
                  </div>
                  {t.urgent && (
                    <span className="rounded-full bg-red-100 text-red-700 border border-red-200 px-2 py-0.5 text-[10px] font-semibold shrink-0">
                      Urgent
                    </span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
