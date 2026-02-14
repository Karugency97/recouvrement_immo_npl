import { z } from "zod";

export const debiteurStepSchema = z.object({
  type: z.string().min(1, "Le type est requis"),
  nom: z.string().min(1, "Le nom est requis"),
  adresse: z.string().min(1, "L'adresse est requise"),
  email: z.string().email("Email invalide").or(z.literal("")),
  telephone: z.string(),
  lot_description: z.string(),
});

export const creanceStepSchema = z.object({
  copropriete_id: z.string().min(1, "La copropriete est requise"),
  copropriete_nom: z.string(),
  montant: z.coerce.number().positive("Le montant doit etre positif"),
  periode_debut: z.string(),
  periode_fin: z.string(),
  nb_relances: z.string(),
  observations: z.string(),
});

export type DebiteurStepData = z.infer<typeof debiteurStepSchema>;
export type CreanceStepData = z.infer<typeof creanceStepSchema>;
