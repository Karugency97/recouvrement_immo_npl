import { redirect } from "next/navigation";
import { requireAuth, getUserRole, getAuthToken } from "@/lib/dal";
import { getSyndicByUserId } from "@/lib/api/syndics";
import { getUnreadCountForSyndic } from "@/lib/api/messages";
import { ClientLayoutWrapper } from "@/components/layout/ClientLayoutWrapper";

export default async function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAuth();
  const role = getUserRole(user);

  // Redirect admin/avocat to admin portal
  if (role === "admin" || role === "avocat") {
    redirect("/admin/dashboard");
  }

  const token = (await getAuthToken())!;
  const syndic = await getSyndicByUserId(token, user.id).catch(() => null);
  const companyName = (syndic as Record<string, unknown> | null)?.raison_sociale as string || "Syndic";
  const syndicId = (syndic as Record<string, unknown> | null)?.id as string | undefined;

  const userName = [user.first_name, user.last_name].filter(Boolean).join(" ") || user.email;
  const unreadCount = syndicId ? await getUnreadCountForSyndic(token, syndicId, user.id) : 0;

  return (
    <div className="flex min-h-screen bg-background">
      <ClientLayoutWrapper userName={userName} userCompany={companyName} unreadCount={unreadCount}>
        {children}
      </ClientLayoutWrapper>
    </div>
  );
}
