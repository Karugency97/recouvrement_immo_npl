import { internalMutation, type MutationCtx } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import type { Id } from "./_generated/dataModel";

// ─────────────────────────────────────────────────────────────────
// Constants from S0 infra (cf. MIGRATION_DIRECTUS_TO_CONVEX.md)
// ─────────────────────────────────────────────────────────────────
const NPL_ORG_LOGTO_ID = "9trwyqs3lm76";
const NPL_ORG_NAME = "NPL — Cabinet Nancy Pierre-Louis";

// ─────────────────────────────────────────────────────────────────
// S1 — provisionNplUser (also in PR #2 ; trivial merge if S1 lands first)
// ─────────────────────────────────────────────────────────────────

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
      if (!org) throw new ConvexError("seed.insert_failed: NPL organization row");
    }

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

// ─────────────────────────────────────────────────────────────────
// S2 — Fixture helpers (proper MutationCtx typing)
// ─────────────────────────────────────────────────────────────────

async function getNplOrgAndFirstUser(
  ctx: MutationCtx,
): Promise<{ orgId: Id<"organizations">; userId: Id<"users"> }> {
  const org = await ctx.db
    .query("organizations")
    .withIndex("by_logto_org", (q) => q.eq("logtoOrgId", NPL_ORG_LOGTO_ID))
    .unique();
  if (!org) throw new ConvexError("seed.prerequisite_missing: Run seed:provisionNplUser first — NPL org missing");
  const user = await ctx.db
    .query("users")
    .withIndex("by_organization", (q) => q.eq("organizationId", org._id))
    .first();
  if (!user) throw new ConvexError("seed.prerequisite_missing: Run seed:provisionNplUser first — no user in NPL org");
  return { orgId: org._id, userId: user._id };
}

async function getOrCreateFixtureCase(ctx: MutationCtx): Promise<Id<"cases">> {
  const { orgId, userId } = await getNplOrgAndFirstUser(ctx);
  const existing = await ctx.db
    .query("cases")
    .withIndex("by_org", (q) => q.eq("organizationId", orgId))
    .first();
  if (existing) return existing._id;
  const now = Date.now();
  return await ctx.db.insert("cases", {
    organizationId: orgId,
    authorUserId: userId,
    status: "CREE",
    statusChangedAt: now,
    statusChangedByUserId: userId,
    casSpecial: [],
    principalCents: 1000_00,
    principalDateExigibilite: now,
    pieces: [],
    createdAt: now,
    updatedAt: now,
  });
}

// ─────────────────────────────────────────────────────────────────
// S2 — Insert fixtures (1 par nouvelle table)
// ─────────────────────────────────────────────────────────────────

export const insertCaseFixture = internalMutation({
  args: {},
  handler: async (ctx) => {
    const { orgId, userId } = await getNplOrgAndFirstUser(ctx);
    const now = Date.now();
    const id = await ctx.db.insert("cases", {
      organizationId: orgId,
      authorUserId: userId,
      status: "CREE",
      statusChangedAt: now,
      statusChangedByUserId: userId,
      casSpecial: [],
      principalCents: 1500_00,
      principalDateExigibilite: now - 90 * 24 * 60 * 60 * 1000,
      pieces: [
        {
          type: "DECOMPTE_CHARGES",
          requirement: "obligatoire",
          status: "REQUESTED",
          requestedAt: now,
        },
      ],
      createdAt: now,
      updatedAt: now,
    });
    return { status: "inserted" as const, id };
  },
});

export const insertCaseDraftFixture = internalMutation({
  args: {},
  handler: async (ctx) => {
    const { orgId, userId } = await getNplOrgAndFirstUser(ctx);
    const now = Date.now();
    const id = await ctx.db.insert("caseDrafts", {
      organizationId: orgId,
      authorUserId: userId,
      casSpecial: [],
      debiteurNom: "FIXTURE — Mme Test",
      principalCents: 2500_00,
      currentStep: "DEBITEUR",
      wizardData: { adresseLine1: "12 rue de la fixture, 75001 Paris" },
      updatedAt: now,
      expiresAt: now + 30 * 24 * 60 * 60 * 1000,
    });
    return { status: "inserted" as const, id };
  },
});

export const insertMessageFixture = internalMutation({
  args: {},
  handler: async (ctx) => {
    const { userId } = await getNplOrgAndFirstUser(ctx);
    const caseId = await getOrCreateFixtureCase(ctx);
    const id = await ctx.db.insert("messages", {
      caseId,
      senderUserId: userId,
      senderRole: "avocat",
      body: "FIXTURE — Message test S2",
      createdAt: Date.now(),
    });
    return { status: "inserted" as const, id };
  },
});

export const insertNoteFixture = internalMutation({
  args: {},
  handler: async (ctx) => {
    const { userId } = await getNplOrgAndFirstUser(ctx);
    const caseId = await getOrCreateFixtureCase(ctx);
    const now = Date.now();
    const id = await ctx.db.insert("notes", {
      caseId,
      authorUserId: userId,
      body: "FIXTURE — Note interne test S2",
      lastEditedAt: now,
      pendingPush: true,
    });
    return { status: "inserted" as const, id };
  },
});

export const insertTimeEntryFixture = internalMutation({
  args: {},
  handler: async (ctx) => {
    const { userId } = await getNplOrgAndFirstUser(ctx);
    const caseId = await getOrCreateFixtureCase(ctx);
    const id = await ctx.db.insert("timeEntries", {
      caseId,
      userId,
      description: "FIXTURE — Étude du dossier (test S2)",
      durationMinutes: 45,
      startedAt: Date.now(),
      pendingPush: true,
    });
    return { status: "inserted" as const, id };
  },
});

export const insertNotificationFixture = internalMutation({
  args: {},
  handler: async (ctx) => {
    const { userId } = await getNplOrgAndFirstUser(ctx);
    const id = await ctx.db.insert("notifications", {
      recipientUserId: userId,
      type: "NEW_MESSAGE",
      body: "FIXTURE — Vous avez un nouveau message (test S2)",
      link: "/dossiers/fixture",
      createdAt: Date.now(),
    });
    return { status: "inserted" as const, id };
  },
});

export const insertNotificationPreferenceFixture = internalMutation({
  args: {},
  handler: async (ctx) => {
    const { userId } = await getNplOrgAndFirstUser(ctx);
    const id = await ctx.db.insert("notificationPreferences", {
      userId,
      channel: "EMAIL",
      notificationType: "NEW_MESSAGE",
      enabled: true,
    });
    return { status: "inserted" as const, id };
  },
});

export const insertDelayAlertFixture = internalMutation({
  args: {},
  handler: async (ctx) => {
    const caseId = await getOrCreateFixtureCase(ctx);
    const now = Date.now();
    const id = await ctx.db.insert("delayAlerts", {
      caseId,
      delayType: "PRESCRIPTION_QUINQUENNALE",
      deadlineAt: now + 180 * 24 * 60 * 60 * 1000,
      level: "J180",
      computedAt: now,
      acknowledged: false,
    });
    return { status: "inserted" as const, id };
  },
});

export const insertCachedReferentialsFixture = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const id = await ctx.db.insert("cachedReferentials", {
      kind: "MATIERES_CONTENTIEUX",
      payload: { fixture: true, codes: ["RECOUVREMENT_COPRO"] },
      fetchedAt: now,
      ttlAt: now + 24 * 60 * 60 * 1000,
    });
    return { status: "inserted" as const, id };
  },
});

export const insertSecibFetchLogFixture = internalMutation({
  args: {},
  handler: async (ctx) => {
    const { userId } = await getNplOrgAndFirstUser(ctx);
    const id = await ctx.db.insert("secibFetchLog", {
      endpoint: "gw_cabinet_info",
      targetType: "cabinet",
      targetId: "fixture",
      responsePayload: { fixture: true },
      status: 200,
      fetchedAt: Date.now(),
      fetchedByUserId: userId,
    });
    return { status: "inserted" as const, id };
  },
});

// ─────────────────────────────────────────────────────────────────
// S2b — Provision a test syndic user (requires real secibSyndicPersonneId).
//
// Usage:
//   pnpm convex:run seed:seedSyndicTestUser '{
//     "logtoUserId": "<logto user id>",
//     "email":       "<user email>",
//     "name":        "Syndic Test",
//     "secibSyndicPersonneId": "<real SECIB personne id of the syndic>",
//     "syndicOrgName": "Syndic Test ABC"
//   }'
// ─────────────────────────────────────────────────────────────────

export const seedSyndicTestUser = internalMutation({
  args: {
    logtoUserId: v.string(),
    email: v.string(),
    name: v.string(),
    secibSyndicPersonneId: v.string(),
    syndicOrgName: v.string(),
    logtoOrgId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const logtoOrgId =
      args.logtoOrgId ?? `test_syndic_${args.secibSyndicPersonneId}`;
    let org = await ctx.db
      .query("organizations")
      .withIndex("by_logto_org", (q) => q.eq("logtoOrgId", logtoOrgId))
      .unique();
    if (!org) {
      const id = await ctx.db.insert("organizations", {
        logtoOrgId,
        kind: "syndic",
        name: args.syndicOrgName,
        secibSyndicPersonneId: args.secibSyndicPersonneId,
        createdAt: Date.now(),
      });
      org = await ctx.db.get(id);
      if (!org) {
        throw new ConvexError("seed.insert_failed: syndic test org");
      }
    }
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
      };
    }
    const userId = await ctx.db.insert("users", {
      logtoUserId: args.logtoUserId,
      email: args.email,
      name: args.name,
      role: "syndic_admin",
      organizationId: org._id,
      createdAt: Date.now(),
    });
    return {
      status: "created" as const,
      userId,
      organizationId: org._id,
    };
  },
});

// ─────────────────────────────────────────────────────────────────
// upsertSyndicOrg — crée l'org Convex d'un syndic pilote, ou promeut
// une org existante (cas : org de test S2B → org réelle). Lookup par
// by_secib_personne pour que la promotion conserve le même _id (les
// users/cases déjà rattachés restent valides).
// ─────────────────────────────────────────────────────────────────
export const upsertSyndicOrg = internalMutation({
  args: {
    logtoOrgId: v.string(),
    name: v.string(),
    secibSyndicPersonneId: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("organizations")
      .withIndex("by_secib_personne", (q) =>
        q.eq("secibSyndicPersonneId", args.secibSyndicPersonneId),
      )
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, {
        name: args.name,
        logtoOrgId: args.logtoOrgId,
      });
      return { organizationId: existing._id, action: "promoted" };
    }
    const organizationId = await ctx.db.insert("organizations", {
      kind: "syndic",
      name: args.name,
      logtoOrgId: args.logtoOrgId,
      secibSyndicPersonneId: args.secibSyndicPersonneId,
      createdAt: Date.now(),
    });
    return { organizationId, action: "created" };
  },
});

// ─────────────────────────────────────────────────────────────────
// setUserSecibIntervenantId — mappe un compte avocat/admin sur son
// intervenant SECIB (Responsable.UtilisateurId, ex. "3" = Nancy).
// Prérequis de cases.dossiersOuJeSuisIntervenant. Le provisioning S3
// posera ce champ à la création des comptes avocats.
// ─────────────────────────────────────────────────────────────────
export const setUserSecibIntervenantId = internalMutation({
  args: { logtoUserId: v.string(), secibIntervenantId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_logto_user", (q) => q.eq("logtoUserId", args.logtoUserId))
      .unique();
    if (!user) {
      throw new ConvexError({
        code: "seed.user_not_found",
        message: `No provisioned user for logtoUserId ${args.logtoUserId}.`,
      });
    }
    await ctx.db.patch(user._id, {
      secibIntervenantId: args.secibIntervenantId,
    });
    return { userId: user._id };
  },
});

// ─────────────────────────────────────────────────────────────────
// insertExpiredDraftFixture — draft expiré pour valider le cron
// casedrafts-cleanup (S2c). Rattaché au premier user provisionné.
// ─────────────────────────────────────────────────────────────────
export const insertExpiredDraftFixture = internalMutation({
  args: {},
  handler: async (ctx) => {
    const user = await ctx.db.query("users").first();
    if (!user) {
      throw new ConvexError({
        code: "seed.no_user",
        message: "Provision a user first (seed:provisionNplUser).",
      });
    }
    const draftId = await ctx.db.insert("caseDrafts", {
      organizationId: user.organizationId,
      authorUserId: user._id,
      casSpecial: [],
      currentStep: "fixture",
      wizardData: { fixture: "s2c-expired-draft" },
      updatedAt: Date.now() - 31 * 24 * 60 * 60 * 1000,
      expiresAt: Date.now() - 24 * 60 * 60 * 1000, // expiré depuis hier
    });
    return { draftId };
  },
});
