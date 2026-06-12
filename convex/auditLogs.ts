import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

// Internal mutation called by withAuditLog (lib/audit.ts) to append rows.
// Not exposed to clients — every audit row originates from a server-side
// helper, never from user input.
export const append = internalMutation({
  args: {
    actorLogtoUserId: v.string(),
    // Optionnels : les lignes système (crons) n'ont ni user ni org.
    actorUserId: v.optional(v.id("users")),
    actorRole: v.string(),
    actorOrganizationId: v.optional(v.id("organizations")),
    action: v.string(),
    targetType: v.optional(v.string()),
    targetId: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("auditLogs", {
      ...args,
      createdAt: Date.now(),
    });
  },
});
