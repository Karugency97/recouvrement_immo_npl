"use node";

import { action } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { internal } from "./_generated/api";
import { withAuditLog, type AuditContext } from "./lib/audit";
import { secibFetch } from "./lib/secibFetch";
import {
  NPL_FULL_ACCESS_ROLES,
  SYNDIC_ROLES,
  ALL_ROLES,
  type UserRole,
} from "./lib/auth";
import { forbidden, noSecibPersonneId } from "./lib/errors";

const SECIB_BASE_URL =
  process.env.SECIB_GATEWAY_BASE_URL ?? "https://apisecib.nplavocat.com/api/v1";

// ─────────────────────────────────────────────────────────────────
// assertRole — callsite role check inside a withAuditLog callback.
// withAuditLog resolves identity to any provisioned user (ALL_ROLES);
// the action then narrows that to its specific allow-list via this helper.
// ─────────────────────────────────────────────────────────────────
function assertRole(audit: AuditContext, allowed: readonly UserRole[]): void {
  if (!allowed.includes(audit.role)) {
    throw forbidden(audit.role, allowed);
  }
}

// ─────────────────────────────────────────────────────────────────
// gatewayHealth — public health probe. No audit, no SECIB API key.
// Calls /admin/health which is unauthenticated on the gateway side.
// Safe to call from monitoring/uptime tools.
// ─────────────────────────────────────────────────────────────────
export const gatewayHealth = action({
  args: {},
  handler: async () => {
    const res = await fetch(`${SECIB_BASE_URL}/admin/health`);
    if (!res.ok) {
      throw new ConvexError({
        code: "secib.health_check_failed",
        message: `SECIB gateway health ${res.status}`,
        status: res.status,
      });
    }
    return await res.json();
  },
});

// ─────────────────────────────────────────────────────────────────
// cabinetInfo — NPL cabinet identity. Allowed for ALL provisioned roles
// (even a syndic needs to know which cabinet handles its cases).
// ─────────────────────────────────────────────────────────────────
export const cabinetInfo = action({
  args: {},
  handler: async (ctx) => {
    return await withAuditLog(
      ctx,
      { action: "secib.cabinet_info", targetType: "cabinet", targetId: "self" },
      async (audit) => {
        assertRole(audit, ALL_ROLES);
        return await secibFetch(ctx, audit, {
          endpoint: "/cabinet/info",
          targetType: "cabinet",
          targetId: "self",
        });
      },
    );
  },
});

// ─────────────────────────────────────────────────────────────────
// dossiersRechercher — GLOBAL list of cabinet dossiers.
// Restricted to NPL_FULL_ACCESS_ROLES (admin + assistant). Scoped roles
// (npl_avocat, syndic_*) MUST use their dedicated scoped actions.
// ─────────────────────────────────────────────────────────────────
export const dossiersRechercher = action({
  args: {
    page: v.optional(v.number()),
    pageSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await withAuditLog(
      ctx,
      {
        action: "secib.dossiers_rechercher",
        targetType: "dossiers_global",
        targetId: "all",
        metadata: { page: args.page, pageSize: args.pageSize },
      },
      async (audit) => {
        assertRole(audit, NPL_FULL_ACCESS_ROLES);
        return await secibFetch(ctx, audit, {
          endpoint: "/dossiers",
          targetType: "dossiers_global",
          targetId: "all",
          params: {
            ...(args.page !== undefined && { page: args.page }),
            ...(args.pageSize !== undefined && { pageSize: args.pageSize }),
          },
        });
      },
    );
  },
});

// ─────────────────────────────────────────────────────────────────
// dossiersDuSyndic — SCOPED list for syndic users.
// Uses gw_personnes_dossiers(secibSyndicPersonneId) so the filter happens
// at the SECIB gateway (1 RTT, no over-fetch). No args : scope is deduced
// from the caller's organization.
// ─────────────────────────────────────────────────────────────────
export const dossiersDuSyndic = action({
  args: {},
  // Explicit return type breaks the circular inference through `internal`
  // (this action calls internal.organizations.getById, and `internal` includes
  // this very module's types).
  handler: async (ctx): Promise<unknown> => {
    return await withAuditLog(
      ctx,
      { action: "secib.dossiers_du_syndic" },
      async (audit) => {
        assertRole(audit, SYNDIC_ROLES);
        const org = await ctx.runQuery(internal.organizations.getById, {
          id: audit.organizationId,
        });
        if (!org?.secibSyndicPersonneId) {
          throw noSecibPersonneId(org?.name ?? "<unknown>");
        }
        return await secibFetch(ctx, audit, {
          endpoint: `/personnes/${org.secibSyndicPersonneId}/dossiers`,
          targetType: "personne_dossiers",
          targetId: org.secibSyndicPersonneId,
        });
      },
    );
  },
});
