import { NextResponse } from "next/server";
import LogtoClient from "@logto/next/server-actions";
import { logtoConfig } from "@/lib/logto";

// Returns the Logto ID token (typ "JWT", aud = Logto app id). Used by the
// client-side useLogtoAuthForConvex hook to feed ConvexProviderWithAuth.
//
// Why the ID token and not a resource access token: Logto access tokens carry
// the RFC 9068 `typ: at+jwt` header, which convex-backend's OIDC verifier
// rejects (only `application/jwt`/`application/jose` are allowed — see
// get-convex/convex-backend#75). Convex's OIDC provider path is designed for
// ID tokens (same as Clerk/Auth0), so convex/auth.config.ts matches
// aud = NEXT_PUBLIC_LOGTO_APP_ID.
//
// We intentionally keep the response shape minimal: { token } | { error }.
// Never include the refresh_token here — that stays in the encrypted
// session cookie, never reaches the browser.
export async function GET() {
  try {
    const client = new LogtoClient(logtoConfig);
    const nodeClient = await client.createNodeClient({
      ignoreCookieChange: true,
    });
    // getAccessToken() first: it runs the refresh-token flow when the session
    // tokens are expired, which also rotates the stored ID token.
    await nodeClient.getAccessToken();
    const token = await nodeClient.getIdToken();
    return NextResponse.json({ token });
  } catch (error) {
    // No active session — treat as "not authenticated for Convex" rather
    // than 500ing the client.
    return NextResponse.json(
      { token: null, error: error instanceof Error ? error.message : "unknown" },
      { status: 401 },
    );
  }
}
