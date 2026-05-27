import { internalQuery } from "./_generated/server";
import { v } from "convex/values";

// Lookup a user by their Logto subject ID. Internal (not callable from client).
// Used by SECIB actions to resolve identity → role for authorization checks.
export const getByLogtoId = internalQuery({
  args: { logtoUserId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_logto_user", (q) =>
        q.eq("logtoUserId", args.logtoUserId),
      )
      .unique();
  },
});
