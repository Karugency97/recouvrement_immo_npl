import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { requireAuth, getAuthToken } from "@/lib/dal";
import { getSyndicByUserId } from "@/lib/api/syndics";
import { getCoproprietes } from "@/lib/api/coproprietes";
import { WizardForm } from "@/components/dossiers/WizardForm";

export default async function NouveauDossierPage() {
  const user = await requireAuth();
  const token = (await getAuthToken())!;

  const syndicRaw = await getSyndicByUserId(token, user.id).catch(() => null);
  const syndicId = (syndicRaw as Record<string, unknown> | null)?.id as string;

  const coproRaw = syndicId
    ? ((await getCoproprietes(token, syndicId).catch(() => [])) as Record<string, unknown>[])
    : [];

  const coproprietes = coproRaw.map((c) => ({
    id: c.id as string,
    nom: (c.nom as string) || "—",
  }));

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-3 -ml-2">
          <Link href="/dossiers">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Retour aux dossiers
          </Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Nouveau Dossier
        </h1>
        <p className="text-muted-foreground mt-1">
          Creez un nouveau dossier de recouvrement en quelques etapes
        </p>
      </div>

      <WizardForm coproprietes={coproprietes} userId={user.id} />
    </div>
  );
}
