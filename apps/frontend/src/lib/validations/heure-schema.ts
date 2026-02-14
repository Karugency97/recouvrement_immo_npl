import { z } from "zod";

export const heureSchema = z.object({
  dossier_id: z.string().min(1, "Le dossier est requis"),
  date: z.string().min(1, "La date est requise"),
  duree: z.number().positive("La duree doit etre positive"),
  description: z.string().min(1, "La description est requise"),
  categorie: z.string(),
});

export type HeureData = z.infer<typeof heureSchema>;
