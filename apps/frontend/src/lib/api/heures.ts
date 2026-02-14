import { createDirectus, rest, staticToken, readItems, createItem } from "@directus/sdk";

const DIRECTUS_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL!;

function getClient(token: string) {
  return createDirectus(DIRECTUS_URL).with(staticToken(token)).with(rest());
}

export async function getHeures(token: string, filters?: Record<string, unknown>) {
  const client = getClient(token);
  return client.request(
    readItems("heures_facturables", {
      fields: ["*", "avocat_id.first_name", "avocat_id.last_name", "dossier_id.reference", "dossier_id.debiteur_id.nom", "dossier_id.debiteur_id.prenom"],
      filter: filters,
      sort: ["-date"],
    })
  );
}

export async function createHeure(token: string, data: Record<string, unknown>) {
  const client = getClient(token);
  return client.request(createItem("heures_facturables", data));
}
