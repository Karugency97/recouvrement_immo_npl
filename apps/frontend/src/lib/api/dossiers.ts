import { createDirectus, rest, staticToken, readItems, readItem, createItem, updateItem } from "@directus/sdk";

const DIRECTUS_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL!;

function getClient(token: string) {
  return createDirectus(DIRECTUS_URL).with(staticToken(token)).with(rest());
}

export async function getDossiers(token: string, filters?: Record<string, unknown>) {
  const client = getClient(token);
  return client.request(
    readItems("dossiers", {
      fields: [
        "*",
        "syndic_id.id",
        "syndic_id.raison_sociale",
        "debiteur_id.id",
        "debiteur_id.nom",
        "debiteur_id.prenom",
        "copropriete_id.id",
        "copropriete_id.nom",
      ],
      filter: filters,
      sort: ["-date_created"],
    })
  );
}

export async function getDossierById(token: string, id: string) {
  const client = getClient(token);
  return client.request(
    readItem("dossiers", id, {
      fields: [
        "*",
        "syndic_id.*",
        "debiteur_id.*",
        "copropriete_id.*",
      ],
    })
  );
}

export async function createDossier(token: string, data: Record<string, unknown>) {
  const client = getClient(token);
  return client.request(createItem("dossiers", data));
}

export async function updateDossier(token: string, id: string, data: Record<string, unknown>) {
  const client = getClient(token);
  return client.request(updateItem("dossiers", id, data));
}
