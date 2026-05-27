import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  organizations: defineTable({
    logtoOrgId: v.string(),
    kind: v.union(v.literal("npl"), v.literal("syndic")),
    name: v.string(),
    secibSyndicPersonneId: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_logto_org", ["logtoOrgId"])
    .index("by_kind", ["kind"]),

  users: defineTable({
    logtoUserId: v.string(),
    email: v.string(),
    name: v.string(),
    role: v.union(
      v.literal("npl_admin"),
      v.literal("npl_assistant"),
      v.literal("npl_avocat"),
      v.literal("syndic_admin"),
      v.literal("syndic_gestionnaire"),
    ),
    organizationId: v.id("organizations"),
    createdAt: v.number(),
    lastSeenAt: v.optional(v.number()),
  })
    .index("by_logto_user", ["logtoUserId"])
    .index("by_organization", ["organizationId"]),

  auditLogs: defineTable({
    actorLogtoUserId: v.string(),
    actorRole: v.string(),
    action: v.string(),
    targetType: v.optional(v.string()),
    targetId: v.optional(v.string()),
    metadata: v.optional(v.any()),
    ip: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_actor", ["actorLogtoUserId"])
    .index("by_target", ["targetType", "targetId"])
    .index("by_created", ["createdAt"]),
});
