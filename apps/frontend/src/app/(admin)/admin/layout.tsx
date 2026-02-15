import { redirect } from "next/navigation";
import { requireAuth, getUserRole, getAuthToken } from "@/lib/dal";
import { getUnreadCountForUser } from "@/lib/api/messages";
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
  const unreadCount = await getUnreadCountForUser(token, user.id);

  return (
    <div className="flex min-h-screen bg-background admin-theme">
      <AdminLayoutWrapper userName={userName} userCompany="Cabinet" unreadCount={unreadCount}>
        {children}
      </AdminLayoutWrapper>
    </div>
  );
}
