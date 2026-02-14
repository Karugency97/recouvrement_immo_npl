import { z } from "zod";

export const noteSchema = z.object({
  dossier_id: z.string().min(1, "Le dossier est requis"),
  contenu: z.string().min(1, "Le contenu est requis"),
  type: z.string().default("interne"),
});

export type NoteData = z.infer<typeof noteSchema>;
