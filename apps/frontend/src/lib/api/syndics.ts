import { createDirectus, rest, staticToken, readItem, updateItem } from "@directus/sdk";

const DIRECTUS_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL!;

function getClient(token: string) {
  return createDirectus(DIRECTUS_URL).with(staticToken(token)).with(rest());
}

export async function getSyndic(token: string, id: string) {
  const client = getClient(token);
  return client.request(readItem("syndics", id, { fields: ["*"] }));
}

export async function updateSyndic(token: string, id: string, data: Record<string, unknown>) {
  const client = getClient(token);
  return client.request(updateItem("syndics", id, data));
}
