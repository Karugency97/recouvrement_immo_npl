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
    .index("by_secib_personne", ["secibSyndicPersonneId"])
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
    // npl_avocat seulement — référence intervenant SECIB pour scope dossiersOuJeSuisIntervenant (S2b)
    secibIntervenantId: v.optional(v.string()),
    createdAt: v.number(),
    lastSeenAt: v.optional(v.number()),
  })
    .index("by_logto_user", ["logtoUserId"])
    .index("by_organization", ["organizationId"])
    .index("by_secib_intervenant", ["secibIntervenantId"]),

  cases: defineTable({
    organizationId: v.id("organizations"),
    authorUserId: v.id("users"),

    // State machine — 9 statuts PLAN_V1 §3
    status: v.union(
      v.literal("CREE"),
      v.literal("EN_ATTENTE_PIECES"),
      v.literal("PRET"),
      v.literal("MISE_EN_DEMEURE_ENVOYEE"),
      v.literal("INJONCTION_DE_PAYER"),
      v.literal("ASSIGNATION_AU_FOND"),
      v.literal("JUGEMENT_OBTENU"),
      v.literal("CLOTURE"),
      v.literal("SUSPENDU"),
    ),
    previousStatus: v.optional(v.string()),
    statusChangedAt: v.number(),
    statusChangedByUserId: v.id("users"),

    casSpecial: v.array(
      v.union(
        v.literal("INDIVISION"),
        v.literal("DECEDE"),
        v.literal("REDRESSEMENT"),
        v.literal("LOT_LOUE"),
        v.literal("MULTI_LOTS"),
      ),
    ),

    // Calculs financiers (cents = entiers)
    principalCents: v.number(),
    principalDateExigibilite: v.number(),
    article700Cents: v.optional(v.number()),
    interetsLegauxFromYearMonth: v.optional(v.number()),

    // Snapshot SECIB inline (Q2 choix C — partie "hot")
    secibDossierId: v.optional(v.string()),
    secibLibelle: v.optional(v.string()),
    secibCodeMatiere: v.optional(v.string()),
    secibDateOuverture: v.optional(v.number()),
    secibIntervenantId: v.optional(v.string()),
    secibSnapshotAt: v.optional(v.number()),

    // Pièces inline (5-10 items max par dossier)
    pieces: v.array(
      v.object({
        type: v.string(),
        requirement: v.union(
          v.literal("obligatoire"),
          v.literal("recommandee"),
          v.literal("utile"),
        ),
        status: v.union(
          v.literal("REQUESTED"),
          v.literal("RECEIVED"),
          v.literal("REJECTED"),
        ),
        secibDocId: v.optional(v.string()),
        requestedAt: v.number(),
        receivedAt: v.optional(v.number()),
      }),
    ),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["organizationId"])
    .index("by_org_status", ["organizationId", "status"])
    .index("by_status", ["status"])
    .index("by_secib_dossier", ["secibDossierId"])
    .index("by_secib_intervenant", ["secibIntervenantId"]),

  caseDrafts: defineTable({
    organizationId: v.id("organizations"),
    authorUserId: v.id("users"),
    casSpecial: v.array(
      v.union(
        v.literal("INDIVISION"),
        v.literal("DECEDE"),
        v.literal("REDRESSEMENT"),
        v.literal("LOT_LOUE"),
        v.literal("MULTI_LOTS"),
      ),
    ),
    debiteurNom: v.optional(v.string()),
    principalCents: v.optional(v.number()),
    currentStep: v.string(),
    wizardData: v.any(),
    updatedAt: v.number(),
    expiresAt: v.number(),
  })
    .index("by_author", ["authorUserId"])
    .index("by_org", ["organizationId"])
    .index("by_expires", ["expiresAt"]),

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
