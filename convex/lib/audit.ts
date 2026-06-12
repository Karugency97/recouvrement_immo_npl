import type { ActionCtx } from "../_generated/server";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { ALL_ROLES, requireRole, type UserRole } from "./auth";

// ─────────────────────────────────────────────────────────────────
// withAuditLog — wraps a privileged action handler.
//
// Flow:
//   1. Resolve identity via requireRole(ctx, ALL_ROLES) — accepts any
//      provisioned user. The action-specific role check (e.g. NPL only)
//      is the callsite's responsibility via assertRole(audit, ALLOWED).
//   2. Append "{action}.attempted" row to auditLogs.
//   3. Call fn(audit). The audit context carries role + ids for downstream
//      helpers like secibFetch (which auto-populates fetchedByUserId).
//   4. On success: append "{action}.succeeded" row, return result.
//   5. On error: append "{action}.failed" row with serialized error in
//      metadata, re-throw.
// ─────────────────────────────────────────────────────────────────

export type AuditMeta = {
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
};

export type AuditContext = {
  logtoUserId: string;
  userId: Id<"users">;
  role: UserRole;
  organizationId: Id<"organizations">;
  // forwarded for downstream helpers (used by secibFetch.fetchedByUserId)
  action: string;
  targetType?: string;
  targetId?: string;
};

export async function withAuditLog<T>(
  ctx: ActionCtx,
  meta: AuditMeta,
  fn: (audit: AuditContext) => Promise<T>,
): Promise<T> {
  // Step 1: resolve identity (any provisioned role).
  const user = await requireRole(ctx, ALL_ROLES);

  const auditBase = {
    actorLogtoUserId: user.logtoUserId,
    actorUserId: user.userId,
    actorRole: user.role,
    actorOrganizationId: user.organizationId,
    targetType: meta.targetType,
    targetId: meta.targetId,
  };

  // Step 2: log "attempted"
  await ctx.runMutation(internal.auditLogs.append, {
    ...auditBase,
    action: `${meta.action}.attempted`,
    metadata: meta.metadata,
  });

  // Step 3: build audit context for the callback
  const audit: AuditContext = {
    logtoUserId: user.logtoUserId,
    userId: user.userId,
    role: user.role,
    organizationId: user.organizationId,
    action: meta.action,
    targetType: meta.targetType,
    targetId: meta.targetId,
  };

  try {
    const result = await fn(audit);

    // Step 4: log "succeeded"
    await ctx.runMutation(internal.auditLogs.append, {
      ...auditBase,
      action: `${meta.action}.succeeded`,
      metadata: meta.metadata,
    });

    return result;
  } catch (error) {
    // Step 5: log "failed" with serialized error
    const errorPayload =
      error instanceof Error
        ? { name: error.name, message: error.message }
        : { raw: String(error) };

    await ctx.runMutation(internal.auditLogs.append, {
      ...auditBase,
      action: `${meta.action}.failed`,
      metadata: { ...meta.metadata, error: errorPayload },
    });

    throw error;
  }
}

// ─────────────────────────────────────────────────────────────────
// cronRunRow — ligne auditLogs pour une exécution de cron système.
// Retourne l'objet row : les mutations l'insèrent via ctx.db.insert,
// les actions via ctx.runMutation(internal.auditLogs.append, row).
// withAuditLog (user-centric) n'est pas concerné.
// ─────────────────────────────────────────────────────────────────
export function cronRunRow(
  job: string,
  outcome: "completed" | "failed",
  metadata?: Record<string, unknown>,
) {
  return {
    actorLogtoUserId: "system:cron",
    actorRole: "system",
    action: `cron.${job}.${outcome}`,
    metadata,
  };
}
