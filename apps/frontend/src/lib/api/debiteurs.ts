import { createDirectus, rest, staticToken, readItem, readItems, createItem } from "@directus/sdk";

const DIRECTUS_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL!;

function getClient(token: string) {
  return createDirectus(DIRECTUS_URL).with(staticToken(token)).with(rest());
}

export async function getDebiteur(token: string, id: string) {
  const client = getClient(token);
  return client.request(readItem("debiteurs", id, { fields: ["*"] }));
}

export async function createDebiteur(token: string, data: Record<string, unknown>) {
  const client = getClient(token);
  return client.request(createItem("debiteurs", data));
}

export async function getDebiteurs(token: string, filters?: Record<string, unknown>) {
  const client = getClient(token);
  return client.request(
    readItems("debiteurs", {
      fields: ["*"],
      filter: filters,
      sort: ["nom"],
    })
  );
}
