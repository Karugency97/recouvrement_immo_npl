const DIRECTUS_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL!;

export interface ClientStats {
  dossiersActifs: number;
  montantARecouvrer: number;
  montantRecouvre: number;
  dossiersClotures: number;
}

export interface AdminStats extends ClientStats {
  tachesUrgentes: number;
  messagesNonLus: number;
}

export async function getClientStats(
  syndicId: string,
  token: string
): Promise<ClientStats> {
  const res = await fetch(
    `${DIRECTUS_URL}/directus-extension-dashboard-stats/client/${syndicId}`,
    {
      headers: { Authorization: `Bearer ${token}` },
      next: { revalidate: 60 },
    }
  );
  if (!res.ok) throw new Error("Failed to fetch client stats");
  return res.json();
}

export async function getAdminStats(token: string): Promise<AdminStats> {
  const res = await fetch(`${DIRECTUS_URL}/directus-extension-dashboard-stats/admin`, {
    headers: { Authorization: `Bearer ${token}` },
    next: { revalidate: 60 },
  });
  if (!res.ok) throw new Error("Failed to fetch admin stats");
  return res.json();
}
