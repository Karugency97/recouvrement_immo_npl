import { createDirectus, rest, staticToken, readItems, createItem, updateItem, deleteItem } from "@directus/sdk";

const DIRECTUS_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL!;

function getClient(token: string) {
  return createDirectus(DIRECTUS_URL).with(staticToken(token)).with(rest());
}

export async function getNotes(token: string, dossierId: string) {
  const client = getClient(token);
  return client.request(
    readItems("notes", {
      fields: ["*", "auteur_id.first_name", "auteur_id.last_name"],
      filter: { dossier_id: { _eq: dossierId } },
      sort: ["-date_created"],
    })
  );
}

export async function createNote(token: string, data: Record<string, unknown>) {
  const client = getClient(token);
  return client.request(createItem("notes", data));
}

export async function updateNote(token: string, id: string, data: Record<string, unknown>) {
  const client = getClient(token);
  return client.request(updateItem("notes", id, data));
}

export async function deleteNote(token: string, id: string) {
  const client = getClient(token);
  return client.request(deleteItem("notes", id));
}
