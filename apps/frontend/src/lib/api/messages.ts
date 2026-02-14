import { createDirectus, rest, staticToken, readItems, createItem, updateItem } from "@directus/sdk";

const DIRECTUS_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL!;

function getClient(token: string) {
  return createDirectus(DIRECTUS_URL).with(staticToken(token)).with(rest());
}

export async function getMessages(token: string, dossierId: string) {
  const client = getClient(token);
  return client.request(
    readItems("messages", {
      fields: [
        "*",
        "expediteur_id.id",
        "expediteur_id.first_name",
        "expediteur_id.last_name",
        "expediteur_id.role.name",
        "piece_jointe.id",
        "piece_jointe.filename_download",
        "piece_jointe.type",
      ],
      filter: { dossier_id: { _eq: dossierId } },
      sort: ["date_created"],
    })
  );
}

export async function sendMessage(token: string, data: { dossier_id: string; contenu: string; expediteur_id: string; piece_jointe?: string }) {
  const client = getClient(token);
  return client.request(createItem("messages", data));
}

export async function markAsRead(token: string, id: string) {
  const client = getClient(token);
  return client.request(
    updateItem("messages", id, {
      lu: true,
      date_lecture: new Date().toISOString(),
    })
  );
}

export async function getConversationsForSyndic(token: string, syndicId: string) {
  const client = getClient(token);
  return client.request(
    readItems("messages", {
      fields: [
        "*",
        "expediteur_id.id",
        "expediteur_id.first_name",
        "expediteur_id.last_name",
        "expediteur_id.role.name",
        "dossier_id.id",
        "dossier_id.reference",
        "dossier_id.debiteur_id.nom",
        "dossier_id.debiteur_id.prenom",
      ],
      filter: { dossier_id: { syndic_id: { _eq: syndicId } } },
      sort: ["-date_created"],
    })
  );
}
