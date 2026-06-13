import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import LogtoClient from "@logto/next/edge";
import { logtoConfig } from "@/lib/logto";

const publicPaths = ["/login", "/forgot-password"];

// Routes sous auth Logto/Convex. (client) ET (admin) sont sur Convex.
const logtoPaths = [
  "/convex-poc",
  "/dashboard",
  "/dossiers",
  "/documents",
  "/messagerie",
  "/parametres",
  "/admin",
];

const logtoClient = new LogtoClient(logtoConfig);

const DIRECTUS_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL!;

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (logtoPaths.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    // /convex-poc gère son propre état non-authentifié (lien Sign in).
    if (pathname.startsWith("/convex-poc")) return NextResponse.next();
    // Les requêtes RSC (préfetch <Link> ET soft-navigation client) ne
    // doivent PAS déclencher la redirection vers Logto : un fetch() RSC
    // redirigé cross-origin vers auth.nplavocat.com casse en CORS (24
    // erreurs console + préfetch mort). Le payload RSC d'une page client
    // ne porte aucune donnée serveur (tout vient des queries Convex,
    // authentifiées séparément), donc le laisser passer ne fuit rien.
    // La vraie navigation document (Accept: text/html) reste gardée.
    //
    // Détection via Accept: text/x-component — le SEUL signal fiable :
    // Next 15 strippe le param ?_rsc de request.nextUrl en middleware,
    // et le header RSC peut être filtré par le reverse-proxy. L'Accept,
    // lui, traverse Caddy/Traefik intact.
    const accept = request.headers.get("accept") ?? "";
    if (accept.includes("text/x-component")) {
      return NextResponse.next();
    }
    const { isAuthenticated } = await logtoClient.getLogtoContext(request);
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL("/api/logto/sign-in", request.url));
    }
    return NextResponse.next();
  }

  // Allow public paths, API routes, static files
  if (
    publicPaths.some((p) => pathname.startsWith(p)) ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get("auth_token")?.value;
  const refreshToken = request.cookies.get("refresh_token")?.value;

  // No token at all -> redirect to login
  if (!token) {
    // Try to refresh if we have a refresh token
    if (refreshToken) {
      return tryRefreshAndContinue(request, refreshToken, pathname);
    }

    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

async function tryRefreshAndContinue(
  request: NextRequest,
  refreshToken: string,
  pathname: string
): Promise<NextResponse> {
  try {
    const res = await fetch(`${DIRECTUS_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken, mode: "json" }),
    });

    if (!res.ok) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      const response = NextResponse.redirect(loginUrl);
      response.cookies.set("auth_token", "", { maxAge: 0, path: "/" });
      response.cookies.set("refresh_token", "", { maxAge: 0, path: "/" });
      return response;
    }

    const data = await res.json();
    const { access_token, refresh_token: newRefreshToken, expires } = data.data;

    // Continue to the original page with refreshed cookies
    const isSecure = request.nextUrl.protocol === "https:";
    const response = NextResponse.next();
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

    // Re-fetch user role after token refresh
    try {
      const meRes = await fetch(`${DIRECTUS_URL}/users/me?fields=role.name`, {
        headers: { Authorization: `Bearer ${access_token}` },
      });
      if (meRes.ok) {
        const meData = await meRes.json();
        const roleName = (meData.data?.role?.name || "").toLowerCase();
        let userRole = "syndic";
        if (roleName.includes("admin") || roleName.includes("administrateur")) userRole = "admin";
        else if (roleName.includes("avocat")) userRole = "avocat";
        response.cookies.set("user_role", userRole, {
          httpOnly: false,
          secure: isSecure,
          sameSite: "lax",
          path: "/",
          maxAge: 7 * 24 * 60 * 60,
        });
      }
    } catch {
      // Keep existing role cookie
    }

    return response;
  } catch {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (favicon)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
