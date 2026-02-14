import { redirect } from "next/navigation";
import { requireAuth, getUserRole, getAuthToken } from "@/lib/dal";
import { ClientSidebar } from "@/components/layout/ClientSidebar";
import { Header } from "@/components/layout/Header";
import { getSyndicByUserId } from "@/lib/api/syndics";

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

  const userName = [user.first_name, user.last_name].filter(Boolean).join(" ") || user.email;

  return (
    <div className="flex min-h-screen bg-background">
      <ClientSidebar userName={userName} userCompany={companyName} />
      <main className="flex-1 ml-[280px]">
        <Header userName={userName} variant="client" />
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
