import { cn } from "@/lib/utils";
import { PRIORITE_LABELS } from "@/lib/utils/constants";

const priorityStyles: Record<string, string> = {
  basse: "bg-slate-100 text-slate-600 border-slate-200",
  normale: "bg-blue-100 text-blue-700 border-blue-200",
  haute: "bg-amber-100 text-amber-700 border-amber-200",
  urgente: "bg-red-100 text-red-700 border-red-200",
};

interface PriorityBadgeProps {
  priority: string;
  className?: string;
}

export function PriorityBadge({ priority, className }: PriorityBadgeProps) {
  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-0.5 text-xs font-medium border inline-flex items-center",
        priorityStyles[priority] || "bg-slate-100 text-slate-600 border-slate-200",
        className
      )}
    >
      {PRIORITE_LABELS[priority] || priority}
    </span>
  );
}
