import { internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { cronRunRow } from "./lib/audit";

// ─────────────────────────────────────────────────────────────────
// caseDrafts — brouillons du wizard "nouveau dossier".
// expiresAt = 30j après le dernier update (posé à l'écriture par le
// portail, S3). Le cron casedrafts-cleanup purge les expirés chaque nuit.
// Batch de 500 + re-planification : aucune mutation ne touche plus de
// 500 docs (limites Convex), idempotent si relancé.
// ─────────────────────────────────────────────────────────────────

const BATCH_SIZE = 500;

export const cleanupExpired = internalMutation({
  args: { deletedSoFar: v.optional(v.number()) },
  handler: async (ctx, args): Promise<void> => {
    const now = Date.now();
    const batch = await ctx.db
      .query("caseDrafts")
      .withIndex("by_expires", (q) => q.lt("expiresAt", now))
      .take(BATCH_SIZE);

    for (const doc of batch) {
      await ctx.db.delete(doc._id);
    }

    const deleted = (args.deletedSoFar ?? 0) + batch.length;

    if (batch.length === BATCH_SIZE) {
      // Page pleine → il en reste peut-être : continuer dans une
      // mutation séparée plutôt que de grossir celle-ci.
      await ctx.scheduler.runAfter(0, internal.caseDrafts.cleanupExpired, {
        deletedSoFar: deleted,
      });
      return;
    }

    await ctx.db.insert("auditLogs", {
      ...cronRunRow("casedrafts-cleanup", "completed", { deleted }),
      createdAt: now,
    });
  },
});
