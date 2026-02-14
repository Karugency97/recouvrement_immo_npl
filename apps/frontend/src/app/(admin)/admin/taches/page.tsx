import { requireAuth, getAuthToken } from "@/lib/dal";
import { getTaches } from "@/lib/api/taches";
import { getDossiers } from "@/lib/api/dossiers";
import { TaskList } from "@/components/admin/TaskList";
import { CreateTaskDialog } from "@/components/admin/CreateTaskDialog";
import { formatDate } from "@/lib/utils/format-date";

export default async function AdminTachesPage() {
  await requireAuth();
  const token = (await getAuthToken())!;

  const [tachesRaw, dossiersRaw] = await Promise.all([
    getTaches(token).catch(() => []) as Promise<Record<string, unknown>[]>,
    getDossiers(token).catch(() => []) as Promise<Record<string, unknown>[]>,
  ]);

  const tasks = (tachesRaw as Record<string, unknown>[]).map((t) => {
    const dossier = t.dossier_id as Record<string, unknown> | null;
    return {
      id: t.id as string,
      titre: (t.titre as string) || "—",
      statut: (t.statut as string) || "a_faire",
      priorite: (t.priorite as string) || "normale",
      type: (t.type as string) || "tache",
      date_echeance: t.date_echeance
        ? formatDate(t.date_echeance as string)
        : "—",
      dossier_reference: (dossier?.reference as string) || "—",
      dossier_id: (dossier?.id as string) || (t.dossier_id as string) || "",
    };
  });

  const dossierOptions = (dossiersRaw as Record<string, unknown>[]).map((d) => ({
    id: d.id as string,
    reference: (d.reference as string) || "—",
  }));

  const activeTasks = tasks.filter(
    (t) => t.statut !== "terminee" && t.statut !== "annulee"
  );

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Taches &amp; Audiences
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {activeTasks.length} tache{activeTasks.length > 1 ? "s" : ""} en attente
          </p>
        </div>
        <CreateTaskDialog dossiers={dossierOptions} />
      </div>

      <TaskList tasks={tasks} />
    </div>
  );
}
