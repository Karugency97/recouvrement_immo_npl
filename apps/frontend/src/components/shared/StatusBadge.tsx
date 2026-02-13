import { cn } from "@/lib/utils";
import { STATUT_LABELS } from "@/lib/utils/constants";

const statusStyles: Record<string, string> = {
  nouveau: "bg-blue-100 text-blue-700 border-blue-200",
  en_cours: "bg-blue-100 text-blue-700 border-blue-200",
  mise_en_demeure: "bg-amber-100 text-amber-700 border-amber-200",
  assignation: "bg-red-100 text-red-700 border-red-200",
  injonction: "bg-amber-100 text-amber-700 border-amber-200",
  audience: "bg-purple-100 text-purple-700 border-purple-200",
  jugement: "bg-slate-100 text-slate-700 border-slate-200",
  execution: "bg-red-100 text-red-700 border-red-200",
  paye: "bg-emerald-100 text-emerald-700 border-emerald-200",
  cloture: "bg-emerald-100 text-emerald-700 border-emerald-200",
  irrecovrable: "bg-slate-100 text-slate-700 border-slate-200",
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-0.5 text-xs font-medium border inline-flex items-center",
        statusStyles[status] || "bg-slate-100 text-slate-700 border-slate-200",
        className
      )}
    >
      {STATUT_LABELS[status] || status}
    </span>
  );
}

/** Document type badge */
const docCategoryStyles: Record<string, string> = {
  preuve: "bg-blue-100 text-blue-700 border-blue-200",
  procedure: "bg-purple-100 text-purple-700 border-purple-200",
  correspondance: "bg-slate-100 text-slate-700 border-slate-200",
};

interface DocumentTypeBadgeProps {
  category: string;
  label: string;
  className?: string;
}

export function DocumentTypeBadge({
  category,
  label,
  className,
}: DocumentTypeBadgeProps) {
  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-0.5 text-xs font-medium border inline-flex items-center",
        docCategoryStyles[category] ||
          "bg-slate-100 text-slate-700 border-slate-200",
        className
      )}
    >
      {label}
    </span>
  );
}

/** Financial status badge */
const financialStyles: Record<string, string> = {
  paye: "bg-emerald-100 text-emerald-700 border-emerald-200",
  en_attente: "bg-amber-100 text-amber-700 border-amber-200",
  facture: "bg-blue-100 text-blue-700 border-blue-200",
};

interface FinancialStatusBadgeProps {
  status: string;
  label: string;
  className?: string;
}

export function FinancialStatusBadge({
  status,
  label,
  className,
}: FinancialStatusBadgeProps) {
  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-0.5 text-xs font-medium border inline-flex items-center",
        financialStyles[status] ||
          "bg-slate-100 text-slate-700 border-slate-200",
        className
      )}
    >
      {label}
    </span>
  );
}

/** Debt amount badge */
interface DebtBadgeProps {
  amount: string;
  className?: string;
}

export function DebtBadge({ amount, className }: DebtBadgeProps) {
  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-0.5 text-xs font-semibold bg-red-100 text-red-700 border border-red-200",
        className
      )}
    >
      {amount}
    </span>
  );
}
