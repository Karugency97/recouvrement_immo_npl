import { NextRequest, NextResponse } from "next/server";
import { redirect } from "next/navigation";
import {
  signIn,
  signOut,
  handleSignIn,
} from "@logto/next/server-actions";
import { logtoConfig } from "@/lib/logto";

// Catch-all Logto auth handler. Mounted at /api/logto/[action].
//   GET /api/logto/sign-in   → 302 to Logto sign-in page
//   GET /api/logto/callback  → exchanges code, sets session, redirects to /
//   GET /api/logto/sign-out  → clears session, 302 to Logto sign-out, then home
//
// signIn() / signOut() / handleSignIn() throw a NEXT_REDIRECT internally —
// Next.js converts that into the proper 307 response, so the explicit
// NextResponse below is only the fallback for unknown actions.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ action: string }> },
) {
  const { action } = await params;
  const origin = request.nextUrl.origin;

  switch (action) {
    case "sign-in": {
      // @logto/next defaults to `${baseUrl}/callback`; our handler (and the
      // redirect URI registered in Logto) lives at /api/logto/callback.
      await signIn(logtoConfig, { redirectUri: `${origin}/api/logto/callback` });
      return NextResponse.json({ status: "redirecting" });
    }
    case "callback": {
      // Pass the full URL (not just searchParams) so the SDK verifies the
      // callback against /api/logto/callback instead of the default /callback.
      await handleSignIn(logtoConfig, new URL(request.url));
      // "/" is still guarded by the legacy Directus middleware (redirects to
      // its own /login) — land on the Convex playground instead.
      redirect("/convex-poc/dossiers");
    }
    case "sign-out": {
      await signOut(logtoConfig, origin);
      return NextResponse.json({ status: "redirecting" });
    }
    default:
      return NextResponse.json(
        { error: `Unknown Logto action "${action}"` },
        { status: 404 },
      );
  }
}
