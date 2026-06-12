import { internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { cronRunRow } from "./lib/audit";

// fetchedAt doit rester assigné serveur (Date.now() dans le handler) : purgeOld s'appuie sur fetchedAt ≈ _creationTime pour son early-break.
export const append = internalMutation({
  args: {
    endpoint: v.string(),
    targetType: v.string(),
    targetId: v.string(),
    requestParams: v.optional(v.any()),
    responsePayload: v.any(),
    status: v.number(),
    fetchedByUserId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("secibFetchLog", {
      ...args,
      fetchedAt: Date.now(),
    });
  },
});

// ─────────────────────────────────────────────────────────────────
// purgeOld — cron secibfetchlog-purge : supprime les logs de fetch
// SECIB de plus de 90 jours. Pas d'index sur fetchedAt seul : on lit
// les plus anciens par _creationTime (ordre par défaut, asc) — comme
// fetchedAt ≈ _creationTime, dès qu'un doc de la page est trop récent,
// tout le reste l'est aussi.
// ─────────────────────────────────────────────────────────────────

const BATCH_SIZE = 500;
const RETENTION_MS = 90 * 24 * 60 * 60 * 1000;

export const purgeOld = internalMutation({
  args: { deletedSoFar: v.optional(v.number()) },
  handler: async (ctx, args): Promise<void> => {
    const cutoff = Date.now() - RETENTION_MS;
    const oldest = await ctx.db
      .query("secibFetchLog")
      .order("asc")
      .take(BATCH_SIZE);

    let deleted = args.deletedSoFar ?? 0;
    let everyDocExpired = true;
    for (const doc of oldest) {
      if (doc.fetchedAt >= cutoff) {
        everyDocExpired = false;
        break;
      }
      await ctx.db.delete(doc._id);
      deleted += 1;
    }

    if (everyDocExpired && oldest.length === BATCH_SIZE) {
      await ctx.scheduler.runAfter(0, internal.secibFetchLog.purgeOld, {
        deletedSoFar: deleted,
      });
      return;
    }

    await ctx.db.insert("auditLogs", {
      ...cronRunRow("secibfetchlog-purge", "completed", { deleted }),
      createdAt: Date.now(),
    });
  },
});
