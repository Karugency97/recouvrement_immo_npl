import { NextResponse } from "next/server";
import { getLogtoContext } from "@logto/next/server-actions";
import { logtoConfig } from "@/lib/logto";

// Lightweight session probe used by client-side ConvexAuthProvider.
// Returns only the boolean isAuthenticated + minimal claims — no access
// token here (tokens are fetched separately via /api/logto/token so we
// can scope them to the Convex resource without leaking them widely).
export async function GET() {
  const ctx = await getLogtoContext(logtoConfig);
  return NextResponse.json({
    isAuthenticated: ctx.isAuthenticated ?? false,
    claims: ctx.claims ?? null,
  });
}
