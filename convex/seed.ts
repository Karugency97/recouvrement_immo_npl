import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

// Provisions the NPL organization row + a user row.
// Idempotent — re-running with the same logtoUserId returns "exists".
//
// Workflow:
//   1. Create the user in Logto NPL (mcp__logto-npl__create_user) and add
//      them to the NPL organization with one of the npl_* org roles.
//   2. Set CONVEX_SELF_HOSTED_URL + CONVEX_SELF_HOSTED_ADMIN_KEY in the
//      shell env (admin key from https://admin.immo.nplavocat.com).
//   3. pnpm convex:deploy  (pushes schema + this file to Convex)
//   4. pnpm convex:run seed:provisionNplUser --json '{
//        "logtoUserId": "<id from create_user response>",
//        "email":       "<primary email>",
//        "name":        "<display name>",
//        "role":        "npl_admin"
//      }'
//
// The Logto NPL organization ID is hard-coded because it is part of the
// S0 infra (cf. MIGRATION_DIRECTUS_TO_CONVEX.md §Infra provisionnée).
// If Logto NPL is ever rebuilt, update this constant.
const NPL_ORG_LOGTO_ID = "9trwyqs3lm76";
const NPL_ORG_NAME = "NPL — Cabinet Nancy Pierre-Louis";

export const provisionNplUser = internalMutation({
  args: {
    logtoUserId: v.string(),
    email: v.string(),
    name: v.string(),
    role: v.union(
      v.literal("npl_admin"),
      v.literal("npl_assistant"),
      v.literal("npl_avocat"),
    ),
  },
  handler: async (ctx, args) => {
    // 1. Get or create the NPL organization row.
    let org = await ctx.db
      .query("organizations")
      .withIndex("by_logto_org", (q) => q.eq("logtoOrgId", NPL_ORG_LOGTO_ID))
      .unique();
    if (!org) {
      const orgId = await ctx.db.insert("organizations", {
        logtoOrgId: NPL_ORG_LOGTO_ID,
        kind: "npl",
        name: NPL_ORG_NAME,
        createdAt: Date.now(),
      });
      org = await ctx.db.get(orgId);
      if (!org) throw new Error("Failed to insert NPL organization row");
    }

    // 2. Get or create the user row.
    const existing = await ctx.db
      .query("users")
      .withIndex("by_logto_user", (q) =>
        q.eq("logtoUserId", args.logtoUserId),
      )
      .unique();
    if (existing) {
      return {
        status: "exists" as const,
        userId: existing._id,
        organizationId: org._id,
        role: existing.role,
      };
    }
    const userId = await ctx.db.insert("users", {
      logtoUserId: args.logtoUserId,
      email: args.email,
      name: args.name,
      role: args.role,
      organizationId: org._id,
      createdAt: Date.now(),
    });
    return {
      status: "created" as const,
      userId,
      organizationId: org._id,
      role: args.role,
    };
  },
});
