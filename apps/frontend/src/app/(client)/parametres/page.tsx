import { requireAuth, getAuthToken } from "@/lib/dal";
import { getSyndicByUserId } from "@/lib/api/syndics";
import { ProfileForm } from "@/components/settings/ProfileForm";

export default async function ParametresPage() {
  const user = await requireAuth();
  const token = (await getAuthToken())!;

  const syndicRaw = await getSyndicByUserId(token, user.id).catch(() => null);
  const syndic = syndicRaw
    ? {
        id: (syndicRaw as Record<string, unknown>).id as string,
        raison_sociale: ((syndicRaw as Record<string, unknown>).raison_sociale as string) || "",
        adresse: ((syndicRaw as Record<string, unknown>).adresse as string) || "",
        telephone: ((syndicRaw as Record<string, unknown>).telephone as string) || "",
        email: ((syndicRaw as Record<string, unknown>).email as string) || "",
      }
    : null;

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Parametres
        </h1>
        <p className="text-muted-foreground mt-1">
          Gerez votre profil et les preferences de votre compte
        </p>
      </div>

      <ProfileForm user={user} syndic={syndic} />
    </div>
  );
}
