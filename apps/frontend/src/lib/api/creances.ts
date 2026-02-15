import { createDirectus, rest, staticToken, readItems, readItem, createItem, updateItem, deleteItem } from "@directus/sdk";

const DIRECTUS_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL!;

function getClient(token: string) {
  return createDirectus(DIRECTUS_URL).with(staticToken(token)).with(rest());
}

export async function getCreances(token: string, dossierId: string) {
  const client = getClient(token);
  return client.request(
    readItems("creances", {
      fields: ["*"],
      filter: { dossier_id: { _eq: dossierId } },
      sort: ["-date_created"],
    })
  );
}

export async function createCreance(token: string, data: Record<string, unknown>) {
  const client = getClient(token);
  return client.request(createItem("creances", data));
}

export async function updateCreance(token: string, id: string, data: Record<string, unknown>) {
  const client = getClient(token);
  return client.request(updateItem("creances", id, data));
}

export async function deleteCreance(token: string, id: string) {
  const client = getClient(token);
  return client.request(deleteItem("creances", id));
}

export async function getCreanceById(token: string, id: string) {
  const client = getClient(token);
  return client.request(readItem("creances", id, { fields: ["*"] }));
}
