import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { requireAuth, getAuthToken } from "@/lib/dal";
import { getDossiers } from "@/lib/api/dossiers";
import { AdminDossiersList } from "@/components/admin/AdminDossiersList";

export default async function AdminDossiersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireAuth();
  const token = (await getAuthToken())!;
  const { q } = await searchParams;

  const dossiersRaw = (await getDossiers(token).catch(() => [])) as Record<string, unknown>[];

  const dossiers = dossiersRaw.map((d) => {
    const debiteur = d.debiteur_id as Record<string, unknown> | null;
    const copro = d.copropriete_id as Record<string, unknown> | null;
    return {
      id: d.id as string,
      reference: (d.reference as string) || "—",
      statut: (d.statut as string) || "nouveau",
      phase: (d.phase as string) || "amiable",
      montant_total: Number(d.montant_initial) || 0,
      date_created: d.date_created as string,
      copropriete: (copro?.nom as string) || "—",
      debiteur: debiteur
        ? `${(debiteur.prenom as string) || ""} ${(debiteur.nom as string) || ""}`.trim()
        : "—",
    };
  });

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Tous les Dossiers</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {dossiers.length} dossier{dossiers.length > 1 ? "s" : ""} au total
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Nouveau Dossier
        </Button>
      </div>

      <AdminDossiersList dossiers={dossiers} initialSearch={q || ""} />
    </div>
  );
}
