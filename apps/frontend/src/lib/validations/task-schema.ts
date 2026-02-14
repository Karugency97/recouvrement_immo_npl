import { z } from "zod";

export const taskSchema = z.object({
  titre: z.string().min(1, "Le titre est requis"),
  type: z.string().min(1, "Le type est requis"),
  priorite: z.string().min(1, "La priorite est requise"),
  date_echeance: z.string().min(1, "La date d'echeance est requise"),
  dossier_id: z.string().min(1, "Le dossier est requis"),
  description: z.string(),
});

export type TaskData = z.infer<typeof taskSchema>;
