import { internalQuery } from "./_generated/server";
import { v } from "convex/values";

// Internal query used by secib.dossiersDuSyndic to resolve the caller's
// organization (and its secibSyndicPersonneId).
export const getById = internalQuery({
  args: { id: v.id("organizations") },
  handler: async (ctx, args) => await ctx.db.get(args.id),
});
