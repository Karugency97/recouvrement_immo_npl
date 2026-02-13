import { createDirectus, rest, staticToken, readItems, createItem, updateItem } from "@directus/sdk";

const DIRECTUS_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL!;

function getClient(token: string) {
  return createDirectus(DIRECTUS_URL).with(staticToken(token)).with(rest());
}

export async function getTaches(token: string, filters?: Record<string, unknown>) {
  const client = getClient(token);
  return client.request(
    readItems("taches", {
      fields: ["*", "dossier_id.reference", "assignee_id.first_name", "assignee_id.last_name"],
      filter: filters,
      sort: ["date_echeance"],
    })
  );
}

export async function createTache(token: string, data: Record<string, unknown>) {
  const client = getClient(token);
  return client.request(createItem("taches", data));
}

export async function updateTache(token: string, id: string, data: Record<string, unknown>) {
  const client = getClient(token);
  return client.request(updateItem("taches", id, data));
}
