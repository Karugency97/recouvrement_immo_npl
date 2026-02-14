"use client";

import { useState, useMemo, useTransition } from "react";
import { CalendarCheck, Clock, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { completeTaskAction } from "@/lib/actions";
import {
  TACHE_STATUT_LABELS, TACHE_TYPE_LABELS, PRIORITE_LABELS,
} from "@/lib/utils/constants";

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

interface Task {
  id: string;
  titre: string;
  statut: string;
  priorite: string;
  type: string;
  date_echeance: string;
  dossier_reference: string;
  dossier_id: string;
}

interface TaskListProps {
  tasks: Task[];
}

export function TaskList({ tasks: initialTasks }: TaskListProps) {
  const [tasks, setTasks] = useState(initialTasks);
  const [statusFilter, setStatusFilter] = useState("active");
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    if (statusFilter === "active") {
      return tasks.filter((t) => t.statut !== "terminee" && t.statut !== "annulee");
    }
    if (statusFilter === "all") return tasks;
    return tasks.filter((t) => t.statut === statusFilter);
  }, [tasks, statusFilter]);

  const handleComplete = (taskId: string) => {
    startTransition(async () => {
      const formData = new FormData();
      formData.append("task_id", taskId);
      const result = await completeTaskAction(null, formData);
      if (result.success) {
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, statut: "terminee" } : t))
        );
        toast.success("Tache terminee");
      } else {
        toast.error(result.error || "Erreur");
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filtrer" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">En attente</SelectItem>
            <SelectItem value="all">Toutes</SelectItem>
            <SelectItem value="a_faire">A faire</SelectItem>
            <SelectItem value="en_cours">En cours</SelectItem>
            <SelectItem value="terminee">Terminees</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="divide-y">
            {filtered.map((t) => (
              <div
                key={t.id}
                className={cn(
                  "flex items-center gap-4 px-6 py-4 transition-colors hover:bg-muted/50",
                  t.statut === "terminee" && "opacity-60"
                )}
              >
                <Checkbox
                  checked={t.statut === "terminee"}
                  disabled={t.statut === "terminee" || isPending}
                  onCheckedChange={() => handleComplete(t.id)}
                />

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

                <span className="hidden sm:inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium border bg-slate-100 text-slate-700 border-slate-200">
                  {TACHE_TYPE_LABELS[t.type] || t.type}
                </span>

                <span
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-xs font-medium border inline-flex items-center",
                    prioriteStyles[t.priorite] || "bg-slate-100 text-slate-700 border-slate-200"
                  )}
                >
                  {PRIORITE_LABELS[t.priorite] || t.priorite}
                </span>

                <span
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-xs font-medium border inline-flex items-center",
                    statutStyles[t.statut] || "bg-slate-100 text-slate-700 border-slate-200"
                  )}
                >
                  {TACHE_STATUT_LABELS[t.statut] || t.statut}
                </span>

                <div className="hidden md:flex items-center gap-1.5 text-sm text-muted-foreground shrink-0 w-[100px] justify-end">
                  <CalendarCheck className="h-3.5 w-3.5" />
                  <span>{t.date_echeance}</span>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="px-6 py-8 text-center text-muted-foreground text-sm">
                Aucune tache
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
