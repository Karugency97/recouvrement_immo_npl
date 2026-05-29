import { internalQuery, query } from "./_generated/server";
import { v } from "convex/values";

// Lookup a user by their Logto subject ID. Internal (not callable from client).
// Used by SECIB actions (via lib/auth.requireRole) to resolve identity → role.
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

// Public query — returns the calling user's identity + role + org name.
// Used by the /convex-poc/dossiers playground to show "Connected as X, role Y".
// Returns null if the caller is unauthenticated OR not provisioned.
export const me = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const user = await ctx.db
      .query("users")
      .withIndex("by_logto_user", (q) =>
        q.eq("logtoUserId", identity.subject),
      )
      .unique();
    if (!user) return null;
    const org = await ctx.db.get(user.organizationId);
    return {
      logtoUserId: user.logtoUserId,
      email: user.email,
      name: user.name,
      role: user.role,
      organizationName: org?.name ?? null,
      organizationKind: org?.kind ?? null,
    };
  },
});
