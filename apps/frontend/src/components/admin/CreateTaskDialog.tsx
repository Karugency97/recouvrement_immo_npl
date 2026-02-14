"use client";

import { useTransition } from "react";
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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { taskSchema, type TaskData } from "@/lib/validations/task-schema";
import { createTaskAction } from "@/lib/actions";
import { TACHE_TYPE_LABELS, PRIORITE_LABELS } from "@/lib/utils/constants";
import { useState } from "react";

interface DossierOption {
  id: string;
  reference: string;
}

interface CreateTaskDialogProps {
  dossiers: DossierOption[];
}

export function CreateTaskDialog({ dossiers }: CreateTaskDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<TaskData>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      titre: "",
      type: "",
      priorite: "",
      date_echeance: "",
      dossier_id: "",
      description: "",
    },
  });

  const onSubmit = (data: TaskData) => {
    startTransition(async () => {
      const formData = new FormData();
      Object.entries(data).forEach(([k, v]) => formData.append(k, v));
      const result = await createTaskAction(null, formData);
      if (result.success) {
        toast.success("Tache creee");
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
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Nouvelle Tache
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouvelle tache</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Titre <span className="text-red-500">*</span></Label>
            <Input placeholder="Titre de la tache" {...register("titre")} />
            {errors.titre && <p className="text-xs text-destructive">{errors.titre.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Dossier <span className="text-red-500">*</span></Label>
            <Select onValueChange={(v) => setValue("dossier_id", v)}>
              <SelectTrigger><SelectValue placeholder="Selectionnez un dossier" /></SelectTrigger>
              <SelectContent>
                {dossiers.map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.reference}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.dossier_id && <p className="text-xs text-destructive">{errors.dossier_id.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Type <span className="text-red-500">*</span></Label>
              <Select onValueChange={(v) => setValue("type", v)}>
                <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(TACHE_TYPE_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Priorite <span className="text-red-500">*</span></Label>
              <Select onValueChange={(v) => setValue("priorite", v)}>
                <SelectTrigger><SelectValue placeholder="Priorite" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(PRIORITE_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Date d&apos;echeance <span className="text-red-500">*</span></Label>
            <Input type="date" {...register("date_echeance")} />
            {errors.date_echeance && <p className="text-xs text-destructive">{errors.date_echeance.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea placeholder="Details de la tache..." rows={3} {...register("description")} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Creer
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
