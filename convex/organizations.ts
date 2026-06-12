import { internalQuery } from "./_generated/server";
import { v } from "convex/values";

// Internal query used by secib.dossiersDuSyndic to resolve the caller's
// organization (and its secibSyndicPersonneId).
export const getById = internalQuery({
  args: { id: v.id("organizations") },
  handler: async (ctx, args) => await ctx.db.get(args.id),
});

// Résolution org syndic par sa référence SECIB. Utilisé par l'import S2d.
export const getBySecibPersonneId = internalQuery({
  args: { secibSyndicPersonneId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("organizations")
      .withIndex("by_secib_personne", (q) =>
        q.eq("secibSyndicPersonneId", args.secibSyndicPersonneId),
      )
      .unique();
  },
});
