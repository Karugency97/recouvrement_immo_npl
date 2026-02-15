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
    const refreshToken = request.cookies.get("refresh_token")?.value;

    if (!refreshToken) {
      return NextResponse.json(
        { error: "Aucun token de rafraichissement" },
        { status: 401 }
      );
    }

    const res = await fetch(`${DIRECTUS_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        refresh_token: refreshToken,
        mode: "json",
      }),
    });

    if (!res.ok) {
      const response = NextResponse.json(
        { error: "Session expiree" },
        { status: 401 }
      );

      // Clear invalid cookies
      response.cookies.set("auth_token", "", { maxAge: 0, path: "/" });
      response.cookies.set("refresh_token", "", { maxAge: 0, path: "/" });
      response.cookies.set("user_role", "", { maxAge: 0, path: "/" });
      return response;
    }

    const data = await res.json();
    const { access_token, refresh_token: newRefreshToken, expires } = data.data;

    const isSecure = process.env.NODE_ENV === "production";
    const response = NextResponse.json({ success: true });

    response.cookies.set("auth_token", access_token, {
      httpOnly: true,
      secure: isSecure,
      sameSite: "lax",
      path: "/",
      maxAge: Math.floor(expires / 1000),
    });

    response.cookies.set("refresh_token", newRefreshToken, {
      httpOnly: true,
      secure: isSecure,
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });

    // Re-fetch and update user role cookie
    try {
      const meRes = await fetch(`${DIRECTUS_URL}/users/me?fields=role.name`, {
        headers: { Authorization: `Bearer ${access_token}` },
      });
      if (meRes.ok) {
        const meData = await meRes.json();
        const userRole = getUserRoleFromName(meData.data?.role?.name || "");
        response.cookies.set("user_role", userRole, {
          httpOnly: false,
          secure: isSecure,
          sameSite: "lax",
          path: "/",
          maxAge: 7 * 24 * 60 * 60,
        });
      }
    } catch {
      // Keep existing user_role cookie if fetch fails
    }

    return response;
  } catch {
    return NextResponse.json(
      { error: "Erreur de rafraichissement" },
      { status: 500 }
    );
  }
}
