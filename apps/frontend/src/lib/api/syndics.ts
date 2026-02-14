import { createDirectus, rest, staticToken, readItems, readItem, updateItem } from "@directus/sdk";

const DIRECTUS_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL!;

function getClient(token: string) {
  return createDirectus(DIRECTUS_URL).with(staticToken(token)).with(rest());
}

export async function getSyndic(token: string, id: string) {
  const client = getClient(token);
  return client.request(readItem("syndics", id, { fields: ["*"] }));
}

export async function getSyndicByUserId(token: string, userId: string) {
  const client = getClient(token);
  const results = await client.request(
    readItems("syndics", {
      fields: ["*"],
      filter: { user_id: { _eq: userId } },
      limit: 1,
    })
  );
  return (results as Record<string, unknown>[])[0] ?? null;
}

export async function updateSyndic(token: string, id: string, data: Record<string, unknown>) {
  const client = getClient(token);
  return client.request(updateItem("syndics", id, data));
}

export async function getSyndics(token: string) {
  const client = getClient(token);
  return client.request(
    readItems("syndics", {
      fields: ["*", "user_id.email", "user_id.first_name", "user_id.last_name"],
      sort: ["raison_sociale"],
    })
  );
}
