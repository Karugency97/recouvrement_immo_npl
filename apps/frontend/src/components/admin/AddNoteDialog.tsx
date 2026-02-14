"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Loader2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { createNoteAction } from "@/lib/actions";

interface AddNoteDialogProps {
  dossierId: string;
}

export function AddNoteDialog({ dossierId }: AddNoteDialogProps) {
  const [open, setOpen] = useState(false);
  const [contenu, setContenu] = useState("");
  const [type, setType] = useState("interne");
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contenu.trim()) return;

    startTransition(async () => {
      const formData = new FormData();
      formData.append("dossier_id", dossierId);
      formData.append("contenu", contenu);
      formData.append("type", type);
      const result = await createNoteAction(null, formData);
      if (result.success) {
        toast.success("Note ajoutee");
        setContenu("");
        setType("interne");
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
          Ajouter une note
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouvelle note</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="interne">Note interne</SelectItem>
                <SelectItem value="important">Important</SelectItem>
                <SelectItem value="suivi">Suivi</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Contenu <span className="text-red-500">*</span></Label>
            <Textarea
              placeholder="Contenu de la note..."
              rows={5}
              value={contenu}
              onChange={(e) => setContenu(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button type="submit" disabled={isPending || !contenu.trim()}>
              {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Ajouter
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
