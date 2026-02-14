import { cn } from "@/lib/utils";
import { TACHE_STATUT_LABELS } from "@/lib/utils/constants";

const taskStatusStyles: Record<string, string> = {
  a_faire: "bg-slate-100 text-slate-700 border-slate-200",
  en_cours: "bg-blue-100 text-blue-700 border-blue-200",
  terminee: "bg-emerald-100 text-emerald-700 border-emerald-200",
  annulee: "bg-red-100 text-red-700 border-red-200",
};

interface TaskStatusBadgeProps {
  status: string;
  className?: string;
}

export function TaskStatusBadge({ status, className }: TaskStatusBadgeProps) {
  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-0.5 text-xs font-medium border inline-flex items-center",
        taskStatusStyles[status] || "bg-slate-100 text-slate-700 border-slate-200",
        className
      )}
    >
      {TACHE_STATUT_LABELS[status] || status}
    </span>
  );
}
