"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { TrendingUp, Loader2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { recouvrementSchema, type RecouvrementData } from "@/lib/validations/recouvrement-schema";
import { addRecouvrementAction } from "@/lib/actions";
import { formatCurrency } from "@/lib/utils/format-currency";

interface AddRecouvrementDialogProps {
  dossierId: string;
  montantTotal: number;
  montantDejaRecouvre: number;
}

export function AddRecouvrementDialog({
  dossierId,
  montantTotal,
  montantDejaRecouvre,
}: AddRecouvrementDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const restant = montantTotal - montantDejaRecouvre;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RecouvrementData>({
    resolver: zodResolver(recouvrementSchema),
    defaultValues: {
      dossier_id: dossierId,
      montant: 0,
      commentaire: "",
    },
  });

  const onSubmit = (data: RecouvrementData) => {
    startTransition(async () => {
      const formData = new FormData();
      formData.append("dossier_id", data.dossier_id);
      formData.append("montant", String(data.montant));
      if (data.commentaire) formData.append("commentaire", data.commentaire);
      const result = await addRecouvrementAction(null, formData);
      if (result.success) {
        toast.success("Recouvrement enregistre");
        reset();
        setOpen(false);
      } else {
        toast.error(result.error || "Erreur");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <TrendingUp className="h-4 w-4 mr-2" />
          Enregistrer un recouvrement
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enregistrer un recouvrement</DialogTitle>
        </DialogHeader>

        <div className="rounded-lg border bg-muted/30 p-3 text-sm space-y-1">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Montant total du</span>
            <span className="font-medium">{formatCurrency(montantTotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Deja recouvre</span>
            <span className="font-medium text-emerald-600">{formatCurrency(montantDejaRecouvre)}</span>
          </div>
          <div className="flex justify-between border-t pt-1">
            <span className="text-muted-foreground">Restant du</span>
            <span className="font-semibold text-red-600">{formatCurrency(restant > 0 ? restant : 0)}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <input type="hidden" {...register("dossier_id")} />

          <div className="space-y-2">
            <Label>Montant recouvre <span className="text-red-500">*</span></Label>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              {...register("montant", { valueAsNumber: true })}
            />
            {errors.montant && (
              <p className="text-xs text-destructive">{errors.montant.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Commentaire</Label>
            <Textarea
              placeholder="Details du recouvrement..."
              rows={3}
              {...register("commentaire")}
            />
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
