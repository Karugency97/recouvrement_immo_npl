import { createDirectus, rest, staticToken, readItems, createItem, updateItem } from "@directus/sdk";

const DIRECTUS_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL!;

function getClient(token: string) {
  return createDirectus(DIRECTUS_URL).with(staticToken(token)).with(rest());
}

export async function getMessages(token: string, dossierId: string) {
  const client = getClient(token);
  return client.request(
    readItems("messages", {
      fields: [
        "*",
        "expediteur_id.id",
        "expediteur_id.first_name",
        "expediteur_id.last_name",
        "expediteur_id.role.name",
        "piece_jointe.id",
        "piece_jointe.filename_download",
        "piece_jointe.type",
      ],
      filter: { dossier_id: { _eq: dossierId } },
      sort: ["date_created"],
    })
  );
}

export async function sendMessage(token: string, data: { dossier_id: string; contenu: string; expediteur_id: string; piece_jointe?: string }) {
  const client = getClient(token);
  return client.request(createItem("messages", data));
}

export async function markAsRead(token: string, id: string) {
  const client = getClient(token);
  return client.request(
    updateItem("messages", id, {
      lu: true,
      date_lecture: new Date().toISOString(),
    })
  );
}

export async function getConversationsForSyndic(token: string, syndicId: string) {
  const client = getClient(token);
  return client.request(
    readItems("messages", {
      fields: [
        "*",
        "expediteur_id.id",
        "expediteur_id.first_name",
        "expediteur_id.last_name",
        "expediteur_id.role.name",
        "dossier_id.id",
        "dossier_id.reference",
        "dossier_id.debiteur_id.nom",
        "dossier_id.debiteur_id.prenom",
      ],
      filter: { dossier_id: { syndic_id: { _eq: syndicId } } },
      sort: ["-date_created"],
    })
  );
}

export async function getUnreadCountForUser(token: string, userId: string): Promise<number> {
  const client = getClient(token);
  try {
    const result = await client.request(
      readItems("messages", {
        filter: {
          lu: { _eq: false },
          expediteur_id: { _neq: userId },
        },
        aggregate: { count: ["id"] },
      })
    );
    const data = result as unknown as { count: { id: number } }[];
    return Number(data?.[0]?.count?.id) || 0;
  } catch {
    return 0;
  }
}

export async function getUnreadCountForSyndic(token: string, syndicId: string, userId: string): Promise<number> {
  const client = getClient(token);
  try {
    const result = await client.request(
      readItems("messages", {
        filter: {
          lu: { _eq: false },
          expediteur_id: { _neq: userId },
          dossier_id: { syndic_id: { _eq: syndicId } },
        },
        aggregate: { count: ["id"] },
      })
    );
    const data = result as unknown as { count: { id: number } }[];
    return Number(data?.[0]?.count?.id) || 0;
  } catch {
    return 0;
  }
}

export async function markMessagesAsRead(token: string, dossierId: string, userId: string) {
  const client = getClient(token);
  const unreadMessages = await client.request(
    readItems("messages", {
      fields: ["id"],
      filter: {
        dossier_id: { _eq: dossierId },
        lu: { _eq: false },
        expediteur_id: { _neq: userId },
      },
    })
  ) as { id: string }[];

  const now = new Date().toISOString();
  await Promise.all(
    unreadMessages.map((msg) =>
      client.request(updateItem("messages", msg.id, { lu: true, date_lecture: now }))
    )
  );

  return unreadMessages.length;
}

export async function getAllConversations(token: string) {
  const client = getClient(token);
  return client.request(
    readItems("messages", {
      fields: [
        "*",
        "expediteur_id.id",
        "expediteur_id.first_name",
        "expediteur_id.last_name",
        "expediteur_id.role.name",
        "dossier_id.id",
        "dossier_id.reference",
        "dossier_id.debiteur_id.nom",
        "dossier_id.debiteur_id.prenom",
        "dossier_id.syndic_id.raison_sociale",
      ],
      sort: ["-date_created"],
    })
  );
}
