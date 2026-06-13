"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { STATUS_CONFIG } from "@/components/metier/StatusBadge";
import { setStatusMutation, type CaseStatus } from "@/lib/convexApi";

const ALL_STATUSES: CaseStatus[] = [
  "CREE",
  "EN_ATTENTE_PIECES",
  "PRET",
  "MISE_EN_DEMEURE_ENVOYEE",
  "INJONCTION_DE_PAYER",
  "ASSIGNATION_AU_FOND",
  "JUGEMENT_OBTENU",
  "CLOTURE",
  "SUSPENDU",
];

export function StatusSelect({
  caseId,
  status,
}: {
  caseId: string;
  status: CaseStatus;
}) {
  const setStatus = useMutation(setStatusMutation);
  const [saving, setSaving] = useState(false);

  const onChange = async (next: string) => {
    setSaving(true);
    try {
      await setStatus({ caseId, status: next as CaseStatus });
      toast.success("Statut mis à jour");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Échec du changement de statut");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Select value={status} onValueChange={onChange} disabled={saving}>
      <SelectTrigger className="w-64">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {ALL_STATUSES.map((s) => (
          <SelectItem key={s} value={s}>
            {STATUS_CONFIG[s].label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
