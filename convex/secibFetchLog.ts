import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const append = internalMutation({
  args: {
    endpoint: v.string(),
    targetType: v.string(),
    targetId: v.string(),
    requestParams: v.optional(v.any()),
    responsePayload: v.any(),
    status: v.number(),
    fetchedByUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("secibFetchLog", {
      ...args,
      fetchedAt: Date.now(),
    });
  },
});
