import { cn } from "@/lib/utils";
import { FACTURE_STATUT_LABELS } from "@/lib/utils/constants";

const invoiceStatusStyles: Record<string, string> = {
  brouillon: "bg-slate-100 text-slate-700 border-slate-200",
  emise: "bg-blue-100 text-blue-700 border-blue-200",
  envoyee: "bg-indigo-100 text-indigo-700 border-indigo-200",
  payee: "bg-emerald-100 text-emerald-700 border-emerald-200",
  en_retard: "bg-red-100 text-red-700 border-red-200",
  annulee: "bg-slate-100 text-slate-500 border-slate-200",
};

interface InvoiceStatusBadgeProps {
  status: string;
  className?: string;
}

export function InvoiceStatusBadge({ status, className }: InvoiceStatusBadgeProps) {
  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-0.5 text-xs font-medium border inline-flex items-center",
        invoiceStatusStyles[status] || "bg-slate-100 text-slate-700 border-slate-200",
        className
      )}
    >
      {FACTURE_STATUT_LABELS[status] || status}
    </span>
  );
}
