import { NextRequest, NextResponse } from "next/server";

const DIRECTUS_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL!;

function getUserRoleFromName(roleName: string): "admin" | "avocat" | "syndic" {
  const lower = roleName.toLowerCase();
  if (lower.includes("admin") || lower.includes("administrateur")) return "admin";
  if (lower.includes("avocat")) return "avocat";
  return "syndic";
}

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    // Authenticate with Directus
    const res = await fetch(`${DIRECTUS_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const error = await res.json();
      return NextResponse.json(
        { error: error.errors?.[0]?.message || "Identifiants invalides" },
        { status: 401 }
      );
    }

    const data = await res.json();
    const { access_token, refresh_token, expires } = data.data;

    // Fetch user role for middleware-level route protection
    let userRole = "syndic";
    try {
      const meRes = await fetch(`${DIRECTUS_URL}/users/me?fields=role.name`, {
        headers: { Authorization: `Bearer ${access_token}` },
      });
      if (meRes.ok) {
        const meData = await meRes.json();
        userRole = getUserRoleFromName(meData.data?.role?.name || "");
      }
    } catch {
      // Default to syndic (most restrictive) if role fetch fails
    }

    const isSecure = request.nextUrl.protocol === "https:";
    const response = NextResponse.json({ success: true });

    // Set access token as HTTP-only cookie
    response.cookies.set("auth_token", access_token, {
      httpOnly: true,
      secure: isSecure,
      sameSite: "lax",
      path: "/",
      maxAge: Math.floor(expires / 1000),
    });

    // Set refresh token as HTTP-only cookie
    response.cookies.set("refresh_token", refresh_token, {
      httpOnly: true,
      secure: isSecure,
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    // Set user role cookie (non-httpOnly so middleware can read it)
    response.cookies.set("user_role", userRole, {
      httpOnly: false,
      secure: isSecure,
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });

    return response;
  } catch {
    return NextResponse.json(
      { error: "Erreur de connexion au serveur" },
      { status: 500 }
    );
  }
}
