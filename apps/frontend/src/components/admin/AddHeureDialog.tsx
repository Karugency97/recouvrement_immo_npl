"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus, Loader2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { heureSchema, type HeureData } from "@/lib/validations/heure-schema";
import { createHeureAction } from "@/lib/actions";

interface AddHeureDialogProps {
  dossierId: string;
}

export function AddHeureDialog({ dossierId }: AddHeureDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<HeureData>({
    resolver: zodResolver(heureSchema),
    defaultValues: {
      dossier_id: dossierId,
      date: new Date().toISOString().split("T")[0],
      duree: 0,
      description: "",
      categorie: "",
    },
  });

  const onSubmit = (data: HeureData) => {
    startTransition(async () => {
      const formData = new FormData();
      Object.entries(data).forEach(([k, v]) => formData.append(k, String(v)));
      const result = await createHeureAction(null, formData);
      if (result.success) {
        toast.success("Heures ajoutees");
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
          <Plus className="h-4 w-4 mr-2" />
          Ajouter des heures
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajouter des heures</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <input type="hidden" {...register("dossier_id")} />

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date <span className="text-red-500">*</span></Label>
              <Input type="date" {...register("date")} />
              {errors.date && <p className="text-xs text-destructive">{errors.date.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Duree (heures) <span className="text-red-500">*</span></Label>
              <Input type="number" step="0.25" min="0.25" {...register("duree", { valueAsNumber: true })} />
              {errors.duree && <p className="text-xs text-destructive">{errors.duree.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description <span className="text-red-500">*</span></Label>
            <Textarea placeholder="Description de l'activite..." rows={3} {...register("description")} />
            {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Categorie</Label>
            <Input placeholder="Ex: Analyse, Redaction, Audience..." {...register("categorie")} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Ajouter
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
