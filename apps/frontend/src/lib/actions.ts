"use server";

import { revalidatePath } from "next/cache";
import { createDirectus, rest, staticToken, updateMe } from "@directus/sdk";
import { getAuthToken, getCurrentUser } from "@/lib/dal";
import { sendMessage, markMessagesAsRead } from "@/lib/api/messages";
import { updateTache, createTache } from "@/lib/api/taches";
import { createNote } from "@/lib/api/notes";
import { createHeure } from "@/lib/api/heures";
import { updateDossier } from "@/lib/api/dossiers";
import { updateSyndic } from "@/lib/api/syndics";
import { profileSchema } from "@/lib/validations/settings-schema";
import { syndicProfileSchema } from "@/lib/validations/settings-schema";
import { passwordSchema } from "@/lib/validations/settings-schema";
import { messageSchema } from "@/lib/validations/message-schema";
import { taskSchema } from "@/lib/validations/task-schema";
import { noteSchema } from "@/lib/validations/note-schema";
import { heureSchema } from "@/lib/validations/heure-schema";

const DIRECTUS_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL!;

function getClient(token: string) {
  return createDirectus(DIRECTUS_URL).with(staticToken(token)).with(rest());
}

export async function updateProfileAction(_prev: unknown, formData: FormData) {
  const token = await getAuthToken();
  if (!token) return { error: "Non authentifie" };

  const raw = {
    first_name: formData.get("first_name") as string,
    last_name: formData.get("last_name") as string,
    email: formData.get("email") as string,
    telephone: formData.get("telephone") as string,
  };

  const result = profileSchema.safeParse(raw);
  if (!result.success) return { error: "Donnees invalides" };

  try {
    const client = getClient(token);
    await client.request(
      updateMe({
        first_name: result.data.first_name,
        last_name: result.data.last_name,
        email: result.data.email,
      })
    );
    revalidatePath("/parametres");
    return { success: true };
  } catch {
    return { error: "Erreur lors de la mise a jour du profil" };
  }
}

export async function updateSyndicProfileAction(_prev: unknown, formData: FormData) {
  const token = await getAuthToken();
  if (!token) return { error: "Non authentifie" };

  const syndicId = formData.get("syndic_id") as string;
  if (!syndicId) return { error: "ID syndic manquant" };

  const raw = {
    raison_sociale: formData.get("raison_sociale") as string,
    adresse: formData.get("adresse") as string,
    telephone: formData.get("telephone") as string,
    email: formData.get("email") as string,
  };

  const result = syndicProfileSchema.safeParse(raw);
  if (!result.success) return { error: "Donnees invalides" };

  try {
    await updateSyndic(token, syndicId, result.data);
    revalidatePath("/parametres");
    return { success: true };
  } catch {
    return { error: "Erreur lors de la mise a jour du syndic" };
  }
}

export async function changePasswordAction(_prev: unknown, formData: FormData) {
  const token = await getAuthToken();
  if (!token) return { error: "Non authentifie" };

  const user = await getCurrentUser();
  if (!user) return { error: "Non authentifie" };

  const raw = {
    current_password: formData.get("current_password") as string,
    new_password: formData.get("new_password") as string,
    confirm_password: formData.get("confirm_password") as string,
  };

  const result = passwordSchema.safeParse(raw);
  if (!result.success) {
    const firstError = Object.values(result.error.flatten().fieldErrors)[0]?.[0];
    return { error: firstError || "Donnees invalides" };
  }

  try {
    // Verify current password by attempting login
    const loginRes = await fetch(`${DIRECTUS_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: user.email, password: result.data.current_password }),
    });

    if (!loginRes.ok) {
      return { error: "Le mot de passe actuel est incorrect" };
    }

    // Update password
    const client = getClient(token);
    await client.request(updateMe({ password: result.data.new_password }));

    return { success: true };
  } catch {
    return { error: "Erreur lors du changement de mot de passe" };
  }
}

export async function sendMessageAction(_prev: unknown, formData: FormData) {
  const token = await getAuthToken();
  if (!token) return { error: "Non authentifie" };

  const user = await getCurrentUser();
  if (!user) return { error: "Non authentifie" };

  const raw = {
    contenu: formData.get("contenu") as string,
    dossier_id: formData.get("dossier_id") as string,
  };

  const result = messageSchema.safeParse(raw);
  if (!result.success) return { error: "Message invalide" };

  const pieceJointe = formData.get("piece_jointe") as string | null;

  try {
    await sendMessage(token, {
      dossier_id: result.data.dossier_id,
      contenu: result.data.contenu,
      expediteur_id: user.id,
      ...(pieceJointe ? { piece_jointe: pieceJointe } : {}),
    });
    revalidatePath(`/dossiers/${result.data.dossier_id}`);
    revalidatePath("/messagerie");
    return { success: true };
  } catch {
    return { error: "Erreur lors de l'envoi du message" };
  }
}

export async function completeTaskAction(_prev: unknown, formData: FormData) {
  const token = await getAuthToken();
  if (!token) return { error: "Non authentifie" };

  const taskId = formData.get("task_id") as string;
  if (!taskId) return { error: "ID tache manquant" };

  try {
    await updateTache(token, taskId, { statut: "terminee" });
    revalidatePath("/admin/taches");
    return { success: true };
  } catch {
    return { error: "Erreur lors de la mise a jour de la tache" };
  }
}

export async function createTaskAction(_prev: unknown, formData: FormData) {
  const token = await getAuthToken();
  if (!token) return { error: "Non authentifie" };

  const raw = {
    titre: formData.get("titre") as string,
    type: formData.get("type") as string,
    priorite: formData.get("priorite") as string,
    date_echeance: formData.get("date_echeance") as string,
    dossier_id: formData.get("dossier_id") as string,
    description: formData.get("description") as string || "",
  };

  const result = taskSchema.safeParse(raw);
  if (!result.success) return { error: "Donnees invalides" };

  try {
    await createTache(token, { ...result.data, statut: "a_faire" });
    revalidatePath("/admin/taches");
    return { success: true };
  } catch {
    return { error: "Erreur lors de la creation de la tache" };
  }
}

export async function createNoteAction(_prev: unknown, formData: FormData) {
  const token = await getAuthToken();
  if (!token) return { error: "Non authentifie" };

  const user = await getCurrentUser();
  if (!user) return { error: "Non authentifie" };

  const raw = {
    dossier_id: formData.get("dossier_id") as string,
    contenu: formData.get("contenu") as string,
    type: (formData.get("type") as string) || "interne",
  };

  const result = noteSchema.safeParse(raw);
  if (!result.success) return { error: "Donnees invalides" };

  try {
    await createNote(token, { ...result.data, auteur_id: user.id });
    revalidatePath(`/admin/dossiers/${result.data.dossier_id}`);
    return { success: true };
  } catch {
    return { error: "Erreur lors de la creation de la note" };
  }
}

export async function createHeureAction(_prev: unknown, formData: FormData) {
  const token = await getAuthToken();
  if (!token) return { error: "Non authentifie" };

  const user = await getCurrentUser();
  if (!user) return { error: "Non authentifie" };

  const raw = {
    dossier_id: formData.get("dossier_id") as string,
    date: formData.get("date") as string,
    duree: formData.get("duree") as string,
    description: formData.get("description") as string,
    categorie: (formData.get("categorie") as string) || "",
  };

  const result = heureSchema.safeParse(raw);
  if (!result.success) return { error: "Donnees invalides" };

  try {
    await createHeure(token, { ...result.data, avocat_id: user.id });
    revalidatePath(`/admin/dossiers/${result.data.dossier_id}`);
    revalidatePath("/admin/facturation");
    return { success: true };
  } catch {
    return { error: "Erreur lors de l'ajout des heures" };
  }
}

export async function updateDossierStatusAction(_prev: unknown, formData: FormData) {
  const token = await getAuthToken();
  if (!token) return { error: "Non authentifie" };

  const dossierId = formData.get("dossier_id") as string;
  const statut = formData.get("statut") as string;

  if (!dossierId || !statut) return { error: "Donnees manquantes" };

  try {
    await updateDossier(token, dossierId, { statut });
    revalidatePath(`/admin/dossiers/${dossierId}`);
    revalidatePath("/admin/dossiers");
    return { success: true };
  } catch {
    return { error: "Erreur lors du changement de statut" };
  }
}

export async function markMessagesAsReadAction(dossierId: string) {
  const token = await getAuthToken();
  if (!token) return { error: "Non authentifie" };

  const user = await getCurrentUser();
  if (!user) return { error: "Non authentifie" };

  try {
    await markMessagesAsRead(token, dossierId, user.id);
    revalidatePath("/messagerie");
    revalidatePath("/admin/messagerie");
    revalidatePath(`/dossiers/${dossierId}`);
    revalidatePath(`/admin/dossiers/${dossierId}`);
    return { success: true };
  } catch {
    return { error: "Erreur lors du marquage des messages" };
  }
}
