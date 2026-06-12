import type { ActionCtx, QueryCtx } from "../_generated/server";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { notAuthenticated, notProvisioned, forbidden } from "./errors";

// ─────────────────────────────────────────────────────────────────
// Role unions kept in sync with convex/schema.ts users.role
// ─────────────────────────────────────────────────────────────────

export type UserRole =
  | "npl_admin"
  | "npl_assistant"
  | "npl_avocat"
  | "syndic_admin"
  | "syndic_gestionnaire";

// Authorization tiers per PLAN_V1 §6 visibility matrix:
//   npl_admin / npl_assistant   → tous dossiers, tous syndics (full access)
//   npl_avocat                  → uniquement dossiers où intervenant SECIB (scoped — S2d)
//   syndic_admin / gestionnaire → uniquement dossiers de leur syndic (scoped)
//
// IMPORTANT: never expand NPL_FULL_ACCESS_ROLES to include scoped roles.
// Each scoped role needs its own action that filters server-side.
export const NPL_FULL_ACCESS_ROLES = ["npl_admin", "npl_assistant"] as const;
export const NPL_SCOPED_ACCESS_ROLES = ["npl_avocat"] as const;
export const SYNDIC_ROLES = ["syndic_admin", "syndic_gestionnaire"] as const;
export const ALL_ROLES = [
  ...NPL_FULL_ACCESS_ROLES,
  ...NPL_SCOPED_ACCESS_ROLES,
  ...SYNDIC_ROLES,
] as const;

// ─────────────────────────────────────────────────────────────────
// requireRole — auth gate used by withAuditLog (and direct callers).
//
// Verifies the caller is:
//   1. Authenticated (Logto JWT validated by Convex auth.config.ts)
//   2. Provisioned in Convex users table
//   3. Holds one of the allowed roles
// SECIB data is confidential (secret professionnel RIN, art. 226-13 CP) so
// we fail closed: unknown identities and unknown roles are rejected.
//
// CLI calls via `npx convex run` have NO identity (auth.getUserIdentity()
// returns null) so they hit notAuthenticated. For seed/ops, use internal
// mutations (not actions).
// ─────────────────────────────────────────────────────────────────

export type AuthenticatedUser = {
  logtoUserId: string;
  userId: Id<"users">;
  role: UserRole;
  organizationId: Id<"organizations">;
};

export async function requireRole(
  ctx: ActionCtx,
  allowed: readonly UserRole[],
): Promise<AuthenticatedUser> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw notAuthenticated();

  const user = await ctx.runQuery(internal.users.getByLogtoId, {
    logtoUserId: identity.subject,
  });
  if (!user) throw notProvisioned(identity.subject);

  if (!allowed.includes(user.role as UserRole)) {
    throw forbidden(user.role, allowed);
  }

  return {
    logtoUserId: user.logtoUserId,
    userId: user._id,
    role: user.role as UserRole,
    organizationId: user.organizationId,
  };
}

// ─────────────────────────────────────────────────────────────────
// requireRoleQuery — même gate que requireRole, mais pour les QUERIES.
// Les queries n'ont pas ctx.runQuery : on lit users directement via
// ctx.db. Retourne le doc user complet (les queries scoped ont besoin
// de champs comme secibIntervenantId, pas seulement des ids).
// ─────────────────────────────────────────────────────────────────
export async function requireRoleQuery(
  ctx: QueryCtx,
  allowed: readonly UserRole[],
) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw notAuthenticated();

  const user = await ctx.db
    .query("users")
    .withIndex("by_logto_user", (q) => q.eq("logtoUserId", identity.subject))
    .unique();
  if (!user) throw notProvisioned(identity.subject);

  if (!allowed.includes(user.role as UserRole)) {
    throw forbidden(user.role, allowed);
  }

  return user;
}
