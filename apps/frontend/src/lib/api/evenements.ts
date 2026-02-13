import { createDirectus, rest, staticToken, readItems } from "@directus/sdk";

const DIRECTUS_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL!;

function getClient(token: string) {
  return createDirectus(DIRECTUS_URL).with(staticToken(token)).with(rest());
}

export async function getEvenements(token: string, dossierId: string) {
  const client = getClient(token);
  return client.request(
    readItems("evenements", {
      fields: ["*", "auteur_id.first_name", "auteur_id.last_name"],
      filter: { dossier_id: { _eq: dossierId } },
      sort: ["-date_evenement"],
    })
  );
}

export async function getRecentEvenements(token: string, limit = 5) {
  const client = getClient(token);
  return client.request(
    readItems("evenements", {
      fields: ["*", "dossier_id.reference"],
      sort: ["-date_evenement"],
      limit,
    })
  );
}
