import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

// Upsert d'un référentiel SECIB dans le cache. Appelé uniquement par
// l'action referentials.refreshAll (cron quotidien).

const TTL_MS = 25 * 60 * 60 * 1000; // 25h — couvre un cron raté sans trou de cache

const kindValidator = v.union(
  v.literal("CODES_ACTIVITES"),
  v.literal("CODES_FACTURATION"),
  v.literal("MATIERES_CONTENTIEUX"),
  v.literal("INTERVENANTS"),
  v.literal("ETAPES_PARAPHEUR"),
);

export const upsertKind = internalMutation({
  args: { kind: kindValidator, payload: v.any() },
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("cachedReferentials")
      .withIndex("by_kind", (q) => q.eq("kind", args.kind))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, {
        payload: args.payload,
        fetchedAt: now,
        ttlAt: now + TTL_MS,
      });
    } else {
      await ctx.db.insert("cachedReferentials", {
        kind: args.kind,
        payload: args.payload,
        fetchedAt: now,
        ttlAt: now + TTL_MS,
      });
    }
  },
});
