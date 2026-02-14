"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { STATUT_LABELS } from "@/lib/utils/constants";
import { updateDossierStatusAction } from "@/lib/actions";

interface DossierStatusSelectProps {
  dossierId: string;
  currentStatus: string;
}

export function DossierStatusSelect({ dossierId, currentStatus }: DossierStatusSelectProps) {
  const [isPending, startTransition] = useTransition();

  const handleChange = (newStatus: string) => {
    if (newStatus === currentStatus) return;
    startTransition(async () => {
      const formData = new FormData();
      formData.append("dossier_id", dossierId);
      formData.append("statut", newStatus);
      const result = await updateDossierStatusAction(null, formData);
      if (result.success) {
        toast.success("Statut mis a jour");
      } else {
        toast.error(result.error || "Erreur");
      }
    });
  };

  return (
    <div className="flex items-center gap-2">
      {isPending && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      <Select value={currentStatus} onValueChange={handleChange} disabled={isPending}>
        <SelectTrigger className="w-[200px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(STATUT_LABELS).map(([key, label]) => (
            <SelectItem key={key} value={key}>{label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
