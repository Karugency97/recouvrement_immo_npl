import { z } from "zod";

export const creancePaymentSchema = z.object({
  creance_id: z.string().min(1, "La creance est requise"),
  dossier_id: z.string().min(1, "Le dossier est requis"),
  montant_paye: z.number().positive("Le montant doit etre positif"),
});

export type CreancePaymentData = z.infer<typeof creancePaymentSchema>;

export const recouvrementSchema = z.object({
  dossier_id: z.string().min(1, "Le dossier est requis"),
  montant: z.number().positive("Le montant doit etre positif"),
  commentaire: z.string().optional(),
});

export type RecouvrementData = z.infer<typeof recouvrementSchema>;
