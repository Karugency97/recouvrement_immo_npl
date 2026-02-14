import { z } from "zod";

export const messageSchema = z.object({
  contenu: z.string().min(1, "Le message ne peut pas etre vide"),
  dossier_id: z.string().min(1, "Le dossier est requis"),
});

export type MessageData = z.infer<typeof messageSchema>;
