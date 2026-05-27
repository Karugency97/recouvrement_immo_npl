"use node";

import { action, ActionCtx } from "./_generated/server";
import { v } from "convex/values";

const SECIB_BASE_URL =
  process.env.SECIB_GATEWAY_BASE_URL ?? "https://apisecib.nplavocat.com/api/v1";

function secibHeaders(): HeadersInit {
  const apiKey = process.env.SECIB_GATEWAY_API_KEY;
  if (!apiKey) {
    throw new Error(
      "SECIB_GATEWAY_API_KEY is not set. Configure it in Convex env vars (npx convex env set SECIB_GATEWAY_API_KEY <key>).",
    );
  }
  return {
    "X-API-Key": apiKey,
    Accept: "application/json",
  };
}

// Auth gate. SECIB data is confidential (secret professionnel RIN, art. 226-13 CP)
// — no anonymous access allowed. Authentication is provided by Logto NPL via
// the JWT bearer passed by the frontend (see convex/auth.config.ts).
// CLI calls via `npx convex run` bypass this through the admin key, which is
// fine for ops/debug from a trusted machine.
async function requireAuthenticatedUser(ctx: ActionCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error(
      "Authentication required. SECIB data is confidential — only signed-in NPL/syndic users may query it.",
    );
  }
  return identity;
}

// Public health probe. Returns gateway/secib/redis status; no PII.
// Safe to call unauthenticated from monitoring/uptime tools.
export const gatewayHealth = action({
  args: {},
  handler: async () => {
    const res = await fetch(`${SECIB_BASE_URL}/admin/health`);
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`SECIB gateway health ${res.status}: ${body}`);
    }
    return await res.json();
  },
});

// Returns the NPL cabinet identity (name, version, locale).
// Auth-gated: cabinet metadata is not catastrophically sensitive but knowing
// which cabinet sits behind a given Convex deployment is an info leak we don't
// want exposed to anonymous clients.
export const cabinetInfo = action({
  args: {},
  handler: async (ctx) => {
    await requireAuthenticatedUser(ctx);
    const res = await fetch(`${SECIB_BASE_URL}/cabinet/info`, {
      headers: secibHeaders(),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`SECIB gateway ${res.status}: ${body}`);
    }
    return await res.json();
  },
});

// Lists real SECIB cases — strictly confidential. Auth-gated.
// TODO (S2): scope results by user's organization (org_syndic_X → only that
// syndic's cases; org_npl → all cases visible to NPL). See PLAN_V1 §5–§6.
// TODO (S2): write to auditLogs on every call (RGPD + RIN traceability).
export const dossiersRechercher = action({
  args: {
    page: v.optional(v.number()),
    pageSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx);

    const params = new URLSearchParams();
    if (args.page !== undefined) params.set("page", String(args.page));
    if (args.pageSize !== undefined) params.set("pageSize", String(args.pageSize));

    const qs = params.toString();
    const url = `${SECIB_BASE_URL}/dossiers${qs ? `?${qs}` : ""}`;

    const res = await fetch(url, { headers: secibHeaders() });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`SECIB gateway ${res.status}: ${body}`);
    }
    return await res.json();
  },
});
