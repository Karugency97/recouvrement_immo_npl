import { redirect } from "next/navigation";
import { getAccessTokenRSC, getLogtoContext } from "@logto/next/server-actions";
import { ConvexHttpClient } from "convex/browser";
import { makeFunctionReference } from "convex/server";
import { CONVEX_RESOURCE_INDICATOR, logtoConfig } from "@/lib/logto";

// Server Component proof-of-life for the full S0+S1 chain:
//   Browser → Next.js (Logto session) → Convex action → SECIB gateway → SECIB API
//
// If the visitor is not signed in, we redirect to Logto sign-in. If they are
// signed in but their Convex user has no role / wrong role, the Convex
// action throws "Forbidden" and we render the raw error — that's the whole
// point of the proof-of-life: surface where in the chain things break.
//
// This page is intentionally not styled. It exists to validate wiring,
// not to ship UX. The real portails (S3–S5) will replace it.

// Convex codegen needs CONVEX_SELF_HOSTED_ADMIN_KEY which we don't have at
// build time, so we reference the action by string instead of via api.secib.
// Replace with `import { api } from "@/../convex/_generated/api"` once
// `convex dev` has been run locally and `_generated/` is in place.
const cabinetInfoRef = makeFunctionReference<
  "action",
  Record<string, never>,
  unknown
>("secib:cabinetInfo");

async function callCabinetInfo(token: string) {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) throw new Error("NEXT_PUBLIC_CONVEX_URL missing");
  const client = new ConvexHttpClient(url);
  client.setAuth(token);
  return await client.action(cabinetInfoRef, {});
}

export default async function ConvexPocPage() {
  const ctx = await getLogtoContext(logtoConfig);
  if (!ctx.isAuthenticated) {
    redirect("/api/logto/sign-in");
  }

  let payload: unknown = null;
  let error: string | null = null;
  try {
    const token = await getAccessTokenRSC(logtoConfig, CONVEX_RESOURCE_INDICATOR);
    payload = await callCabinetInfo(token);
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }

  return (
    <main style={{ padding: 24, fontFamily: "monospace" }}>
      <h1>Convex × Logto × SECIB — proof of life</h1>
      <p>
        Connecté en tant que <strong>{ctx.claims?.sub}</strong>
        {ctx.claims?.email ? ` (${ctx.claims.email})` : ""}
      </p>
      <h2>secib.cabinetInfo</h2>
      {error ? (
        <pre style={{ color: "#b00020", whiteSpace: "pre-wrap" }}>{error}</pre>
      ) : (
        <pre style={{ whiteSpace: "pre-wrap" }}>
          {JSON.stringify(payload, null, 2)}
        </pre>
      )}
      <hr />
      <form action="/api/logto/sign-out" method="get">
        <button type="submit">Se déconnecter</button>
      </form>
    </main>
  );
}
