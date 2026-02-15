"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Banknote, Loader2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { creancePaymentSchema, type CreancePaymentData } from "@/lib/validations/recouvrement-schema";
import { updateCreancePaymentAction } from "@/lib/actions";
import { formatCurrency } from "@/lib/utils/format-currency";

interface CreancePaymentDialogProps {
  creanceId: string;
  dossierId: string;
  creanceLibelle: string;
  montantTotal: number;
  montantDejaPaye: number;
}

export function CreancePaymentDialog({
  creanceId,
  dossierId,
  creanceLibelle,
  montantTotal,
  montantDejaPaye,
}: CreancePaymentDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const restant = montantTotal - montantDejaPaye;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreancePaymentData>({
    resolver: zodResolver(creancePaymentSchema),
    defaultValues: {
      creance_id: creanceId,
      dossier_id: dossierId,
      montant_paye: 0,
    },
  });

  const currentMontant = watch("montant_paye");

  const onSubmit = (data: CreancePaymentData) => {
    startTransition(async () => {
      const formData = new FormData();
      formData.append("creance_id", data.creance_id);
      formData.append("dossier_id", data.dossier_id);
      formData.append("montant_paye", String(data.montant_paye));
      const result = await updateCreancePaymentAction(null, formData);
      if (result.success) {
        toast.success("Paiement enregistre");
        reset();
        setOpen(false);
      } else {
        toast.error(result.error || "Erreur");
      }
    });
  };

  const handlePaiementTotal = (checked: boolean) => {
    if (checked) {
      setValue("montant_paye", montantTotal, { shouldValidate: true });
    } else {
      setValue("montant_paye", 0, { shouldValidate: true });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" title="Enregistrer un paiement">
          <Banknote className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Paiement — {creanceLibelle}</DialogTitle>
        </DialogHeader>

        <div className="rounded-lg border bg-muted/30 p-3 text-sm space-y-1">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Montant total</span>
            <span className="font-medium">{formatCurrency(montantTotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Deja paye</span>
            <span className="font-medium text-emerald-600">{formatCurrency(montantDejaPaye)}</span>
          </div>
          <div className="flex justify-between border-t pt-1">
            <span className="text-muted-foreground">Restant du</span>
            <span className="font-semibold text-red-600">{formatCurrency(restant)}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <input type="hidden" {...register("creance_id")} />
          <input type="hidden" {...register("dossier_id")} />

          <div className="space-y-2">
            <Label>Nouveau montant total paye <span className="text-red-500">*</span></Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              max={montantTotal}
              placeholder="0.00"
              {...register("montant_paye", { valueAsNumber: true })}
            />
            {errors.montant_paye && (
              <p className="text-xs text-destructive">{errors.montant_paye.message}</p>
            )}
            {currentMontant > montantTotal && (
              <p className="text-xs text-destructive">
                Le montant ne peut pas depasser {formatCurrency(montantTotal)}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="paiement_total"
              onCheckedChange={(checked) => handlePaiementTotal(checked === true)}
            />
            <Label htmlFor="paiement_total" className="text-sm cursor-pointer">
              Paiement total ({formatCurrency(montantTotal)})
            </Label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Enregistrer
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
