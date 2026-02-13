import { redirect } from "next/navigation";
import { getCurrentUser, getUserRole, getDashboardPath } from "@/lib/dal";

export default async function Home() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const role = getUserRole(user);
  redirect(getDashboardPath(role));
}
