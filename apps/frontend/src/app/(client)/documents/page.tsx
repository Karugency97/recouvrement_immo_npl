import { requireAuth, getAuthToken } from "@/lib/dal";
import { getSyndicByUserId } from "@/lib/api/syndics";
import { getDocumentsForSyndic } from "@/lib/api/documents";
import { DocumentSearch } from "@/components/documents/DocumentSearch";

export default async function DocumentsPage() {
  const user = await requireAuth();
  const token = (await getAuthToken())!;

  const syndic = await getSyndicByUserId(token, user.id).catch(() => null);
  const syndicId = (syndic as Record<string, unknown> | null)?.id as string;

  const documentsRaw = syndicId
    ? ((await getDocumentsForSyndic(token, syndicId).catch(() => [])) as Record<string, unknown>[])
    : [];

  const documents = documentsRaw.map((doc) => ({
    id: doc.id as string,
    nom: (doc.nom as string) || "Document",
    type: (doc.type as string) || "autre",
    fichier: (doc.fichier as string) || null,
    date_created: doc.date_created as string,
    dossier_id: doc.dossier_id as { id: string; reference: string } | null,
  }));

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Documents
        </h1>
        <p className="text-muted-foreground mt-1">
          Consultez et telechargez les documents lies a vos dossiers
        </p>
      </div>

      <DocumentSearch documents={documents} />
    </div>
  );
}
