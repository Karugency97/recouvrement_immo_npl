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
    // Intentionally v.string() not the status union — same valid values
    // but avoids a circular reference in v.union when storing the prior state.
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

    // Calculs financiers (cents = entiers).
    // Requis fonctionnellement pour les cases créées par le wizard S3 ;
    // absents sur les dossiers importés de SECIB (montant inconnu —
    // ne JAMAIS défaulter à 0 : fausserait intérêts et stats).
    principalCents: v.optional(v.number()),
    principalDateExigibilite: v.optional(v.number()),
    article700Cents: v.optional(v.number()),
    interetsLegauxFromYearMonth: v.optional(v.number()),

    // Snapshot SECIB inline (Q2 choix C — partie "hot")
    secibDossierId: v.optional(v.string()),
    secibLibelle: v.optional(v.string()),
    secibCodeMatiere: v.optional(v.string()),
    secibMatiereLibelle: v.optional(v.string()),
    secibDateOuverture: v.optional(v.number()),
    secibIntervenantId: v.optional(v.string()),
    secibResponsableNom: v.optional(v.string()),
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

    // ── Wizard syndic (S3b) — un dossier créé au portail, en attente de
    // contrôle + push SECIB par le cabinet (S5). Tous optionnels : les
    // cases importés de SECIB ne les portent pas.
    debiteur: v.optional(
      v.object({
        type: v.union(v.literal("PP"), v.literal("PM")),
        nom: v.string(),
        adresse: v.optional(v.string()),
        email: v.optional(v.string()),
        telephone: v.optional(v.string()),
        lotDescription: v.optional(v.string()),
      }),
    ),
    periodeDebut: v.optional(v.number()),
    periodeFin: v.optional(v.number()),
    nbRelances: v.optional(v.number()),
    observations: v.optional(v.string()),
    pendingSecibPush: v.optional(v.boolean()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["organizationId"])
    // Includes statusChangedAt so dashboard syndic queries "all dossiers of
    // org X with status Y sorted by most-recently-changed" don't fall back
    // to implicit _creationTime sort (Q1 server-side sort decision).
    .index("by_org_status", ["organizationId", "status", "statusChangedAt"])
    .index("by_status", ["status"])
    .index("by_secib_dossier", ["secibDossierId"])
    .index("by_secib_intervenant", ["secibIntervenantId"])
    .index("by_pending_push", ["pendingSecibPush"]),

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

  messages: defineTable({
    caseId: v.id("cases"),
    senderUserId: v.id("users"),
    senderRole: v.union(v.literal("syndic"), v.literal("avocat")),
    body: v.string(),
    attachmentSecibDocId: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_case_created", ["caseId", "createdAt"]),

  notes: defineTable({
    caseId: v.id("cases"),
    authorUserId: v.id("users"),
    body: v.string(),
    lastEditedAt: v.number(),
    pendingPush: v.boolean(),
    lastPushedToSecibAt: v.optional(v.number()),
    secibDocId: v.optional(v.string()),
  })
    .index("by_case", ["caseId"])
    .index("by_pending_push", ["pendingPush", "lastEditedAt"]),

  timeEntries: defineTable({
    caseId: v.id("cases"),
    userId: v.id("users"),
    description: v.string(),
    durationMinutes: v.number(),
    ratePerHourCents: v.optional(v.number()),
    startedAt: v.number(),
    pendingPush: v.boolean(),
    pushedToSecibAt: v.optional(v.number()),
    secibFactureId: v.optional(v.string()),
  })
    .index("by_case", ["caseId"])
    .index("by_user_started", ["userId", "startedAt"])
    .index("by_pending_push", ["pendingPush"]),

  notifications: defineTable({
    recipientUserId: v.id("users"),
    type: v.union(
      v.literal("NEW_MESSAGE"),
      v.literal("STATUS_CHANGE"),
      v.literal("DELAY_ALERT"),
      v.literal("DOCUMENT_ADDED"),
      v.literal("PIECE_REQUESTED"),
      v.literal("PIECE_RECEIVED"),
    ),
    caseId: v.optional(v.id("cases")),
    body: v.string(),
    // Frontend path, validated at insert time by the creating handler
    // (no schema-level constraint — see "Strings ouvertes" in S2 spec).
    link: v.string(),
    readAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_recipient_created", ["recipientUserId", "createdAt"])
    .index("by_recipient_unread", ["recipientUserId", "readAt"]),

  notificationPreferences: defineTable({
    userId: v.id("users"),
    channel: v.union(
      v.literal("EMAIL"),
      v.literal("PUSH"),
      v.literal("IN_APP"),
    ),
    notificationType: v.string(),
    enabled: v.boolean(),
  })
    .index("by_user", ["userId"])
    // Lookup key for upsert (Convex has no UNIQUE constraint, but the
    // upsert handler MUST query this index before insert to avoid duplicate
    // rows on (userId, channel, notificationType) races).
    .index("by_user_channel_type", ["userId", "channel", "notificationType"]),

  delayAlerts: defineTable({
    caseId: v.id("cases"),
    delayType: v.union(
      v.literal("PRESCRIPTION_QUINQUENNALE"),
      v.literal("SIGNIFICATION_ASSIGNATION"),
      v.literal("OPPOSITION_INJONCTION"),
      v.literal("PEREMPTION_INSTANCE"),
      v.literal("EXECUTION_JUGEMENT"),
    ),
    deadlineAt: v.number(),
    level: v.union(
      v.literal("J180"),
      v.literal("J90"),
      v.literal("J30"),
      v.literal("J7"),
      v.literal("EXPIRED"),
    ),
    computedAt: v.number(),
    acknowledged: v.boolean(),
  })
    .index("by_case", ["caseId"])
    .index("by_level_deadline", ["level", "deadlineAt"]),

  cachedReferentials: defineTable({
    kind: v.union(
      v.literal("CODES_ACTIVITES"),
      v.literal("CODES_FACTURATION"),
      v.literal("MATIERES_CONTENTIEUX"),
      v.literal("INTERVENANTS"),
      v.literal("ETAPES_PARAPHEUR"),
    ),
    payload: v.any(),
    fetchedAt: v.number(),
    ttlAt: v.number(),
  }).index("by_kind", ["kind"]),

  secibFetchLog: defineTable({
    endpoint: v.string(),
    targetType: v.string(),
    targetId: v.string(),
    requestParams: v.optional(v.any()),
    responsePayload: v.any(),
    status: v.number(),
    fetchedAt: v.number(),
    // Optionnel : les fetchs des crons système n'ont pas d'utilisateur.
    fetchedByUserId: v.optional(v.id("users")),
  })
    .index("by_target", ["targetType", "targetId", "fetchedAt"])
    .index("by_endpoint_time", ["endpoint", "fetchedAt"])
    .index("by_user_time", ["fetchedByUserId", "fetchedAt"]),

  auditLogs: defineTable({
    // S0 existant
    actorLogtoUserId: v.string(),
    actorRole: v.string(),
    action: v.string(),
    targetType: v.optional(v.string()),
    targetId: v.optional(v.string()),
    metadata: v.optional(v.any()),
    ip: v.optional(v.string()),
    createdAt: v.number(),
    // S2 enrichi
    actorUserId: v.optional(v.id("users")),
    actorOrganizationId: v.optional(v.id("organizations")),
  })
    .index("by_actor", ["actorLogtoUserId"])
    .index("by_target", ["targetType", "targetId"])
    .index("by_created", ["createdAt"])
    .index("by_org_created", ["actorOrganizationId", "createdAt"])
    .index("by_action_created", ["action", "createdAt"]),
});
