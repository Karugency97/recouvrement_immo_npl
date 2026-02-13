import { Plus, CalendarCheck, Clock, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  TACHE_STATUT_LABELS,
  TACHE_TYPE_LABELS,
  PRIORITE_LABELS,
} from "@/lib/utils/constants";

/* ------------------------------------------------------------------ */
/*  Placeholder data                                                   */
/* ------------------------------------------------------------------ */

const taches = [
  {
    id: "t1",
    titre: "Audience TGI Paris - SCI Bellevue",
    dossier_reference: "LR-2026-046",
    dossier_id: "d2",
    date_echeance: "14/02/2026",
    statut: "a_faire",
    priorite: "urgente",
    type: "audience",
  },
  {
    id: "t2",
    titre: "Relance mise en demeure - Dupont",
    dossier_reference: "LR-2026-047",
    dossier_id: "d1",
    date_echeance: "15/02/2026",
    statut: "a_faire",
    priorite: "haute",
    type: "relance",
  },
  {
    id: "t3",
    titre: "Depot assignation - Moreau",
    dossier_reference: "LR-2026-045",
    dossier_id: "d3",
    date_echeance: "17/02/2026",
    statut: "en_cours",
    priorite: "haute",
    type: "echeance",
  },
  {
    id: "t4",
    titre: "RDV syndic - Residence Les Oliviers",
    dossier_reference: "LR-2026-047",
    dossier_id: "d1",
    date_echeance: "18/02/2026",
    statut: "a_faire",
    priorite: "normale",
    type: "rdv",
  },
  {
    id: "t5",
    titre: "Signification jugement - Lefebvre",
    dossier_reference: "LR-2026-043",
    dossier_id: "d5",
    date_echeance: "20/02/2026",
    statut: "a_faire",
    priorite: "normale",
    type: "echeance",
  },
  {
    id: "t6",
    titre: "Preparation conclusions - SCI Panorama",
    dossier_reference: "LR-2026-041",
    dossier_id: "d7",
    date_echeance: "22/02/2026",
    statut: "a_faire",
    priorite: "basse",
    type: "tache",
  },
  {
    id: "t7",
    titre: "Audience Juge de l'execution - Durand",
    dossier_reference: "LR-2026-042",
    dossier_id: "d6",
    date_echeance: "25/02/2026",
    statut: "a_faire",
    priorite: "haute",
    type: "audience",
  },
  {
    id: "t8",
    titre: "Verification paiement - Lambert",
    dossier_reference: "LR-2026-044",
    dossier_id: "d4",
    date_echeance: "28/02/2026",
    statut: "terminee",
    priorite: "normale",
    type: "tache",
  },
];

const prioriteStyles: Record<string, string> = {
  basse: "bg-slate-100 text-slate-700 border-slate-200",
  normale: "bg-blue-100 text-blue-700 border-blue-200",
  haute: "bg-amber-100 text-amber-700 border-amber-200",
  urgente: "bg-red-100 text-red-700 border-red-200",
};

const statutStyles: Record<string, string> = {
  a_faire: "bg-blue-100 text-blue-700 border-blue-200",
  en_cours: "bg-amber-100 text-amber-700 border-amber-200",
  terminee: "bg-emerald-100 text-emerald-700 border-emerald-200",
  annulee: "bg-slate-100 text-slate-700 border-slate-200",
};

const typeIcons: Record<string, string> = {
  audience: "bg-purple-100 text-purple-600",
  echeance: "bg-amber-100 text-amber-600",
  relance: "bg-blue-100 text-blue-600",
  rdv: "bg-emerald-100 text-emerald-600",
  tache: "bg-slate-100 text-slate-600",
};

/* ------------------------------------------------------------------ */
/*  Page component                                                     */
/* ------------------------------------------------------------------ */

export default function AdminTachesPage() {
  return (
    <div className="animate-fade-in space-y-6">
      {/* Title + action */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Taches &amp; Audiences
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {taches.filter((t) => t.statut !== "terminee" && t.statut !== "annulee").length}{" "}
            taches en attente
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Nouvelle Tache
        </Button>
      </div>

      {/* Task list */}
      <Card>
        <CardContent className="p-0">
          <div className="divide-y">
            {taches.map((t) => (
              <div
                key={t.id}
                className={cn(
                  "flex items-center gap-4 px-6 py-4 transition-colors hover:bg-muted/50",
                  t.statut === "terminee" && "opacity-60"
                )}
              >
                {/* Type icon */}
                <div
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                    typeIcons[t.type] || "bg-slate-100 text-slate-600"
                  )}
                >
                  {t.type === "audience" ? (
                    <CalendarCheck className="h-5 w-5" />
                  ) : t.priorite === "urgente" ? (
                    <AlertTriangle className="h-5 w-5" />
                  ) : (
                    <Clock className="h-5 w-5" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p
                    className={cn(
                      "text-sm font-medium text-foreground",
                      t.statut === "terminee" && "line-through"
                    )}
                  >
                    {t.titre}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Dossier{" "}
                    <span className="font-medium text-indigo-600">
                      {t.dossier_reference}
                    </span>
                  </p>
                </div>

                {/* Type badge */}
                <span className="hidden sm:inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium border bg-slate-100 text-slate-700 border-slate-200">
                  {TACHE_TYPE_LABELS[t.type] || t.type}
                </span>

                {/* Priority badge */}
                <span
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-xs font-medium border inline-flex items-center",
                    prioriteStyles[t.priorite] ||
                      "bg-slate-100 text-slate-700 border-slate-200"
                  )}
                >
                  {PRIORITE_LABELS[t.priorite] || t.priorite}
                </span>

                {/* Status badge */}
                <span
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-xs font-medium border inline-flex items-center",
                    statutStyles[t.statut] ||
                      "bg-slate-100 text-slate-700 border-slate-200"
                  )}
                >
                  {TACHE_STATUT_LABELS[t.statut] || t.statut}
                </span>

                {/* Date */}
                <div className="hidden md:flex items-center gap-1.5 text-sm text-muted-foreground shrink-0 w-[100px] justify-end">
                  <CalendarCheck className="h-3.5 w-3.5" />
                  <span>{t.date_echeance}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
