import { z } from "zod";

export const profileSchema = z.object({
  first_name: z.string().min(1, "Le prenom est requis"),
  last_name: z.string().min(1, "Le nom est requis"),
  email: z.string().email("Email invalide"),
  telephone: z.string(),
});

export const syndicProfileSchema = z.object({
  raison_sociale: z.string().min(1, "La raison sociale est requise"),
  adresse: z.string(),
  telephone: z.string(),
  email: z.string().email("Email invalide").or(z.literal("")),
});

export const passwordSchema = z
  .object({
    current_password: z.string().min(1, "Le mot de passe actuel est requis"),
    new_password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caracteres"),
    confirm_password: z.string().min(1, "La confirmation est requise"),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirm_password"],
  });

export type ProfileData = z.infer<typeof profileSchema>;
export type SyndicProfileData = z.infer<typeof syndicProfileSchema>;
export type PasswordData = z.infer<typeof passwordSchema>;
