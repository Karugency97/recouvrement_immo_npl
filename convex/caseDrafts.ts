import { internalMutation, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { cronRunRow } from "./lib/audit";
import { ConvexError } from "convex/values";
import { requireRoleQuery, requireRoleMutation, SYNDIC_ROLES } from "./lib/auth";
import { buildPieces } from "./lib/pieces";

// ─────────────────────────────────────────────────────────────────
// caseDrafts — brouillons du wizard "nouveau dossier".
// expiresAt = 30j après le dernier update (posé à l'écriture par le
// portail, S3). Le cron casedrafts-cleanup purge les expirés chaque nuit.
// Batch de 500 + re-planification : aucune mutation ne touche plus de
// 500 docs (marge sous la limite Convex de 8192 writes/mutation), idempotent si relancé.
// ─────────────────────────────────────────────────────────────────

// Union des 5 cas spéciaux — alignée sur schema.ts cases.casSpecial.
const casSpecialValidator = v.array(
  v.union(
    v.literal("INDIVISION"),
    v.literal("DECEDE"),
    v.literal("REDRESSEMENT"),
    v.literal("LOT_LOUE"),
    v.literal("MULTI_LOTS"),
  ),
);

const DRAFT_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30j (cron casedrafts-cleanup purge)

const BATCH_SIZE = 500;

export const cleanupExpired = internalMutation({
  args: { deletedSoFar: v.optional(v.number()) },
  handler: async (ctx, args): Promise<void> => {
    const now = Date.now();
    const batch = await ctx.db
      .query("caseDrafts")
      .withIndex("by_expires", (q) => q.lt("expiresAt", now))
      .take(BATCH_SIZE);

    for (const doc of batch) {
      await ctx.db.delete(doc._id);
    }

    const deleted = (args.deletedSoFar ?? 0) + batch.length;

    if (batch.length === BATCH_SIZE) {
      // Page pleine → il en reste peut-être : continuer dans une
      // mutation séparée plutôt que de grossir celle-ci.
      await ctx.scheduler.runAfter(0, internal.caseDrafts.cleanupExpired, {
        deletedSoFar: deleted,
      });
      return;
    }

    await ctx.db.insert("auditLogs", {
      ...cronRunRow("casedrafts-cleanup", "completed", { deleted }),
      createdAt: now,
    });
  },
});

// ─────────────────────────────────────────────────────────────────
// Wizard syndic (S3b) — un seul brouillon actif par syndic.
// ─────────────────────────────────────────────────────────────────

// Brouillon courant du syndic appelant (ou null).
export const getMyDraft = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireRoleQuery(ctx, SYNDIC_ROLES);
    return await ctx.db
      .query("caseDrafts")
      .withIndex("by_author", (q) => q.eq("authorUserId", user._id))
      .unique();
  },
});

// Upsert du brouillon (un par auteur). Auto-save debouncé côté wizard.
export const saveDraft = mutation({
  args: {
    casSpecial: casSpecialValidator,
    debiteurNom: v.optional(v.string()),
    principalCents: v.optional(v.number()),
    currentStep: v.string(),
    wizardData: v.any(),
  },
  handler: async (ctx, args) => {
    const user = await requireRoleMutation(ctx, SYNDIC_ROLES);
    const now = Date.now();
    const existing = await ctx.db
      .query("caseDrafts")
      .withIndex("by_author", (q) => q.eq("authorUserId", user._id))
      .unique();
    const fields = {
      organizationId: user.organizationId,
      authorUserId: user._id,
      casSpecial: args.casSpecial,
      debiteurNom: args.debiteurNom,
      principalCents: args.principalCents,
      currentStep: args.currentStep,
      wizardData: args.wizardData,
      updatedAt: now,
      expiresAt: now + DRAFT_TTL_MS,
    };
    if (existing) {
      await ctx.db.patch(existing._id, fields);
      return { draftId: existing._id };
    }
    const draftId = await ctx.db.insert("caseDrafts", fields);
    return { draftId };
  },
});

// Submit — crée le case (CREE, pendingSecibPush) puis supprime le draft.
// AUCUNE écriture SECIB : le cabinet contrôle puis pousse en S5.
export const submitDraft = mutation({
  args: {
    debiteur: v.object({
      type: v.union(v.literal("PP"), v.literal("PM")),
      nom: v.string(),
      adresse: v.optional(v.string()),
      email: v.optional(v.string()),
      telephone: v.optional(v.string()),
      lotDescription: v.optional(v.string()),
    }),
    principalCents: v.number(),
    principalDateExigibilite: v.number(),
    periodeDebut: v.optional(v.number()),
    periodeFin: v.optional(v.number()),
    nbRelances: v.optional(v.number()),
    observations: v.optional(v.string()),
    casSpecial: casSpecialValidator,
  },
  handler: async (ctx, args): Promise<{ caseId: string }> => {
    const user = await requireRoleMutation(ctx, SYNDIC_ROLES);

    // Validation serveur (le client valide aussi avant submit).
    if (!args.debiteur.nom.trim()) {
      throw new ConvexError({
        code: "wizard.debiteur_nom_required",
        message: "Le nom du débiteur est obligatoire.",
      });
    }
    if (args.principalCents <= 0) {
      throw new ConvexError({
        code: "wizard.principal_required",
        message: "Le montant principal doit être supérieur à 0.",
      });
    }

    const now = Date.now();
    const pieces = buildPieces(args.casSpecial).map((p) => ({
      type: p.type,
      requirement: p.requirement,
      status: "REQUESTED" as const,
      requestedAt: now,
    }));

    const caseId = await ctx.db.insert("cases", {
      organizationId: user.organizationId,
      authorUserId: user._id,
      status: "CREE" as const,
      statusChangedAt: now,
      statusChangedByUserId: user._id,
      casSpecial: args.casSpecial,
      principalCents: args.principalCents,
      principalDateExigibilite: args.principalDateExigibilite,
      debiteur: args.debiteur,
      periodeDebut: args.periodeDebut,
      periodeFin: args.periodeFin,
      nbRelances: args.nbRelances,
      observations: args.observations,
      pendingSecibPush: true,
      pieces,
      createdAt: now,
      updatedAt: now,
    });

    // Supprimer le brouillon (un par auteur).
    const draft = await ctx.db
      .query("caseDrafts")
      .withIndex("by_author", (q) => q.eq("authorUserId", user._id))
      .unique();
    if (draft) await ctx.db.delete(draft._id);

    // Trace audit (insertion directe — withAuditLog est action-only).
    await ctx.db.insert("auditLogs", {
      actorLogtoUserId: user.logtoUserId,
      actorUserId: user._id,
      actorRole: user.role,
      actorOrganizationId: user.organizationId,
      action: "case.created_via_wizard",
      targetType: "case",
      targetId: caseId,
      createdAt: now,
    });

    return { caseId };
  },
});
