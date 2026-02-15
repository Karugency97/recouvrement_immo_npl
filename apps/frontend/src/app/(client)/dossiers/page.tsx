import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { requireAuth, getAuthToken, getUserRole } from "@/lib/dal";
import { getDossiers } from "@/lib/api/dossiers";
import { getSyndicByUserId } from "@/lib/api/syndics";
import { ClientDossiersList } from "@/components/client/ClientDossiersList";

/* -------------------------------------------------------------------------- */
/*  Page component (Server Component — async)                                 */
/* -------------------------------------------------------------------------- */

export default async function DossiersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const user = await requireAuth();
  const token = (await getAuthToken())!;
  const role = getUserRole(user);

  // Get syndic record if user is syndic
  const syndic = role === "syndic" ? await getSyndicByUserId(token, user.id) : null;
  const syndicId = (syndic as Record<string, unknown> | null)?.id as string | undefined;

  // Fetch dossiers (filtered by syndic for client users)
  const dossiersRaw = await (syndicId
    ? getDossiers(token, { syndic_id: { _eq: syndicId } })
    : getDossiers(token)
  ).catch(() => []);

  const dossiers = (dossiersRaw as Record<string, unknown>[]).map((d) => {
    const debiteur = d.debiteur_id as Record<string, unknown> | null;
    const copro = d.copropriete_id as Record<string, unknown> | null;
    return {
      id: d.id as string,
      reference: (d.reference as string) || "—",
      statut: (d.statut as string) || "nouveau",
      montant_initial: Number(d.montant_initial) || 0,
      montant_recouvre: Number(d.montant_recouvre) || 0,
      debiteur_nom: debiteur
        ? `${(debiteur.prenom as string) || ""} ${(debiteur.nom as string) || ""}`.trim()
        : "—",
      copropriete_nom: (copro?.nom as string) || "—",
      lot_description: (d.lot_description as string) || "",
      date_created: (d.date_created as string) || "",
    };
  });

  return (
    <div className="animate-fade-in space-y-6">
      {/* Page heading + action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Mes Dossiers
          </h1>
          <p className="text-muted-foreground mt-1">
            Suivez l&apos;avancement de vos dossiers de recouvrement
          </p>
        </div>
        <Button asChild>
          <Link href="/dossiers/nouveau">
            <Plus className="h-4 w-4 mr-2" />
            Nouveau Dossier
          </Link>
        </Button>
      </div>

      <ClientDossiersList dossiers={dossiers} initialSearch={q || ""} />
    </div>
  );
}
