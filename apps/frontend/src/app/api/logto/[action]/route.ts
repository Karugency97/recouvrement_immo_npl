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
  // Never derive URLs from request.nextUrl.origin: behind the reverse proxy
  // the standalone Next server sees https://0.0.0.0:3000, which Logto rejects
  // (invalid_redirect_uri). logtoConfig.baseUrl = NEXT_PUBLIC_APP_URL is the
  // public origin in every environment.
  const callbackUri = `${logtoConfig.baseUrl}/api/logto/callback`;

  switch (action) {
    case "sign-in": {
      // @logto/next defaults to `${baseUrl}/callback`; our handler (and the
      // redirect URI registered in Logto) lives at /api/logto/callback.
      await signIn(logtoConfig, { redirectUri: callbackUri });
      return NextResponse.json({ status: "redirecting" });
    }
    case "callback": {
      // Rebuild the callback URL on the public origin (the SDK compares it
      // to the redirectUri stored at sign-in), keeping the incoming params.
      const callbackUrl = new URL(callbackUri);
      callbackUrl.search = request.nextUrl.search;
      await handleSignIn(logtoConfig, callbackUrl);
      // Le portail syndic (client) est la destination post-login.
      redirect("/dashboard");
    }
    case "sign-out": {
      await signOut(logtoConfig, logtoConfig.baseUrl);
      return NextResponse.json({ status: "redirecting" });
    }
    default:
      return NextResponse.json(
        { error: `Unknown Logto action "${action}"` },
        { status: 404 },
      );
  }
}
