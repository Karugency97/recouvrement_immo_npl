import { redirect } from "next/navigation";
import { requireAuth, getUserRole } from "@/lib/dal";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { Header } from "@/components/layout/Header";

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

  return (
    <div className="flex min-h-screen bg-background admin-theme">
      <AdminSidebar userName={userName} userCompany="Cabinet" />
      <main className="flex-1 ml-[280px]">
        <Header userName={userName} variant="admin" />
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
