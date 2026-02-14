import { createDirectus, rest, staticToken, readItems, readItem, createItem } from "@directus/sdk";

const DIRECTUS_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL!;

function getClient(token: string) {
  return createDirectus(DIRECTUS_URL).with(staticToken(token)).with(rest());
}

export async function getCoproprietes(token: string, syndicId?: string) {
  const client = getClient(token);
  const filter = syndicId ? { syndic_id: { _eq: syndicId } } : undefined;
  return client.request(
    readItems("coproprietes", {
      fields: ["*", "syndic_id.raison_sociale"],
      filter,
      sort: ["nom"],
    })
  );
}

export async function getCopropriete(token: string, id: string) {
  const client = getClient(token);
  return client.request(readItem("coproprietes", id, { fields: ["*", "syndic_id.*"] }));
}

export async function createCopropriete(token: string, data: Record<string, unknown>) {
  const client = getClient(token);
  return client.request(createItem("coproprietes", data));
}
