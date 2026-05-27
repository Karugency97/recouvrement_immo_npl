"use node";

import { action, ActionCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

const SECIB_BASE_URL =
  process.env.SECIB_GATEWAY_BASE_URL ?? "https://apisecib.nplavocat.com/api/v1";

// Role unions kept in sync with convex/schema.ts users.role
type UserRole =
  | "npl_admin"
  | "npl_assistant"
  | "npl_avocat"
  | "syndic_admin"
  | "syndic_gestionnaire";

const NPL_ROLES = ["npl_admin", "npl_assistant", "npl_avocat"] as const;
const SYNDIC_ROLES = ["syndic_admin", "syndic_gestionnaire"] as const;
const ALL_ROLES = [...NPL_ROLES, ...SYNDIC_ROLES] as const;

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

// Authorization gate. Verifies the caller is:
//   1. Authenticated (Logto JWT validated by Convex)
//   2. Provisioned in Convex users table (someone explicitly granted them access)
//   3. Holds one of the allowed roles for this specific action
// SECIB data is confidential (secret professionnel RIN, art. 226-13 CP) so we
// fail closed: unknown identities and unknown roles are rejected.
// CLI calls via `npx convex run` bypass via the admin key — fine for ops/debug.
async function requireRole(
  ctx: ActionCtx,
  allowed: readonly UserRole[],
): Promise<{ logtoUserId: string; role: UserRole }> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error(
      "Authentication required. SECIB data is confidential — only signed-in users may query it.",
    );
  }

  const user = await ctx.runQuery(internal.users.getByLogtoId, {
    logtoUserId: identity.subject,
  });

  if (!user) {
    // The Logto JWT is valid but no one has provisioned this user in the
    // Convex users table. They cannot see any SECIB data.
    throw new Error(
      `Forbidden: user ${identity.subject} is authenticated but not provisioned in immonpl. Contact an NPL admin to be granted access.`,
    );
  }

  if (!allowed.includes(user.role as UserRole)) {
    throw new Error(
      `Forbidden: role "${user.role}" is not authorized for this action. Allowed: ${allowed.join(", ")}.`,
    );
  }

  return { logtoUserId: user.logtoUserId, role: user.role as UserRole };
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
// Allowed for ALL provisioned roles: even a syndic user needs to know which
// cabinet handles their cases. Knowing this is not a confidentiality breach
// since the syndic is already a client of NPL.
export const cabinetInfo = action({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, ALL_ROLES);
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

// Lists real SECIB cases — strictly confidential.
// Restricted to NPL staff (admin/assistant/avocat). Syndic users will get a
// scoped, filtered list via a DIFFERENT action in S2 (`dossiersDuSyndic`)
// that only returns cases belonging to their org_syndic_X. Returning the
// global list to a syndic would leak other syndics' confidential data.
// TODO (S2): write to auditLogs on every call (RGPD + RIN traceability per PLAN_V1 §8).
export const dossiersRechercher = action({
  args: {
    page: v.optional(v.number()),
    pageSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, NPL_ROLES);

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
