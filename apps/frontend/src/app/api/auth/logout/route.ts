import { NextRequest, NextResponse } from "next/server";

const DIRECTUS_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL!;

export async function POST(request: NextRequest) {
  try {
    const refreshToken = request.cookies.get("refresh_token")?.value;

    // Logout from Directus
    if (refreshToken) {
      await fetch(`${DIRECTUS_URL}/auth/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
    }
  } catch {
    // Silently fail — we still want to clear cookies
  }

  const isSecure = request.nextUrl.protocol === "https:";
  const response = NextResponse.json({ success: true });

  // Clear cookies
  response.cookies.set("auth_token", "", {
    httpOnly: true,
    secure: isSecure,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  response.cookies.set("refresh_token", "", {
    httpOnly: true,
    secure: isSecure,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  response.cookies.set("user_role", "", {
    httpOnly: false,
    secure: isSecure,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  return response;
}
