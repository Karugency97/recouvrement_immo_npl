import { createDirectus, rest, staticToken, readItems, createItem, updateItem } from "@directus/sdk";

const DIRECTUS_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL!;

function getClient(token: string) {
  return createDirectus(DIRECTUS_URL).with(staticToken(token)).with(rest());
}

export async function getFactures(token: string, filters?: Record<string, unknown>) {
  const client = getClient(token);
  return client.request(
    readItems("factures", {
      fields: ["*", "syndic_id.raison_sociale", "dossier_id.reference"],
      filter: filters,
      sort: ["-date_created"],
    })
  );
}

export async function createFacture(token: string, data: Record<string, unknown>) {
  const client = getClient(token);
  return client.request(createItem("factures", data));
}

export async function updateFacture(token: string, id: string, data: Record<string, unknown>) {
  const client = getClient(token);
  return client.request(updateItem("factures", id, data));
}
