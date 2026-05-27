import { NextResponse } from "next/server";
import { getAccessToken } from "@logto/next/server-actions";
import { logtoConfig, CONVEX_RESOURCE_INDICATOR } from "@/lib/logto";

// Returns an access token scoped to the Convex API resource. Used by the
// client-side useLogtoAuthForConvex hook to feed ConvexProviderWithAuth.
// Logto SDK transparently refreshes the underlying refresh_token when the
// access token is expired.
//
// We intentionally keep the response shape minimal: { token } | { error }.
// Never include the refresh_token here — that stays in the encrypted
// session cookie, never reaches the browser.
export async function GET() {
  try {
    const token = await getAccessToken(logtoConfig, CONVEX_RESOURCE_INDICATOR);
    return NextResponse.json({ token });
  } catch (error) {
    // No active session, or Logto refused the resource — treat as
    // "not authenticated for Convex" rather than 500ing the client.
    return NextResponse.json(
      { token: null, error: error instanceof Error ? error.message : "unknown" },
      { status: 401 },
    );
  }
}
