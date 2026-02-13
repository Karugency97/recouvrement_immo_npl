import { createDirectus, rest, staticToken, readItems, createItem } from "@directus/sdk";

const DIRECTUS_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL!;

function getClient(token: string) {
  return createDirectus(DIRECTUS_URL).with(staticToken(token)).with(rest());
}

export async function getDocuments(token: string, dossierId?: string) {
  const client = getClient(token);
  const filter = dossierId ? { dossier_id: { _eq: dossierId } } : undefined;
  return client.request(
    readItems("documents", {
      fields: ["*", "uploaded_by.first_name", "uploaded_by.last_name"],
      filter,
      sort: ["-date_created"],
    })
  );
}

export async function createDocument(token: string, data: Record<string, unknown>) {
  const client = getClient(token);
  return client.request(createItem("documents", data));
}
