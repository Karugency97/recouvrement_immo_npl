import { redirect } from "next/navigation";
import { requireAuth, getUserRole, getAuthToken } from "@/lib/dal";
import { getUnreadCountForUser } from "@/lib/api/messages";
import { getAdminStats } from "@/lib/api/stats";
import { AdminLayoutWrapper } from "@/components/layout/AdminLayoutWrapper";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAuth();
  const role = getUserRole(user);

  // Redirect syndic to client portal
  if (role === "syndic") {
    redirect("/dashboard");
  }

  const userName = [user.first_name, user.last_name].filter(Boolean).join(" ") || user.email;
  const token = (await getAuthToken())!;
  const [unreadCount, stats] = await Promise.all([
    getUnreadCountForUser(token, user.id),
    getAdminStats(token).catch(() => null),
  ]);

  const activeDossiers = stats?.dossiersActifs ?? 0;
  const totalARecouvrer = stats?.montantARecouvrer ?? 0;
  const totalRecouvre = stats?.montantRecouvre ?? 0;
  const tauxRecouvrement = totalARecouvrer > 0
    ? Math.round((totalRecouvre / totalARecouvrer) * 100)
    : 0;

  return (
    <div className="flex min-h-screen bg-background admin-theme">
      <AdminLayoutWrapper
        userName={userName}
        userCompany="Cabinet"
        unreadCount={unreadCount}
        activeDossiers={activeDossiers}
        tauxRecouvrement={tauxRecouvrement}
      >
        {children}
      </AdminLayoutWrapper>
    </div>
  );
}
