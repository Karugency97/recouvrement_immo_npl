import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createDirectus, rest, readMe } from "@directus/sdk";

const directusUrl = process.env.NEXT_PUBLIC_DIRECTUS_URL!;

export type UserRole = "admin" | "avocat" | "syndic";

export interface CurrentUser {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: {
    id: string;
    name: string;
  };
}

/**
 * Get the auth token from HTTP-only cookie
 */
export async function getAuthToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get("auth_token")?.value ?? null;
}

/**
 * Get the current authenticated user from Directus
 * Returns null if not authenticated
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const token = await getAuthToken();
  if (!token) return null;

  try {
    const client = createDirectus(directusUrl).with(rest());
    const user = await client.request(
      readMe({
        fields: ["id", "email", "first_name", "last_name", "role.id", "role.name"],
      })
    );
    return user as unknown as CurrentUser;
  } catch {
    return null;
  }
}

/**
 * Get the current user or redirect to login
 */
export async function requireAuth(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

/**
 * Determine the user's role from their Directus role name
 */
export function getUserRole(user: CurrentUser): UserRole {
  const roleName = user.role.name.toLowerCase();
  if (roleName.includes("admin") || roleName.includes("administrateur")) {
    return "admin";
  }
  if (roleName.includes("avocat")) {
    return "avocat";
  }
  return "syndic";
}

/**
 * Get the dashboard path based on user role
 */
export function getDashboardPath(role: UserRole): string {
  switch (role) {
    case "admin":
    case "avocat":
      return "/admin/dashboard";
    case "syndic":
      return "/dashboard";
  }
}
