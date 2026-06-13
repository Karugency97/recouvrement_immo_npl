import { internalQuery, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { v, ConvexError } from "convex/values";
import {
  requireRoleQuery,
  requireRoleMutation,
  SYNDIC_ROLES,
  NPL_FULL_ACCESS_ROLES,
} from "./lib/auth";
import {
  assertCaseAccessQuery,
  assertCaseAccessMutation,
} from "./lib/caseAccess";

const READ_ROLES = [...SYNDIC_ROLES, ...NPL_FULL_ACCESS_ROLES] as const;

// Fil chronologique d'un dossier. senderRole pilote l'affichage côté UI
// (syndic = "Vous", avocat = "Cabinet NPL") — pas de join users nécessaire.
export const byCase = query({
  args: { caseId: v.id("cases") },
  handler: async (ctx, args) => {
    const user = await requireRoleQuery(ctx, READ_ROLES);
    await assertCaseAccessQuery(ctx, args.caseId, user);
    const rows = await ctx.db
      .query("messages")
      .withIndex("by_case_created", (q) => q.eq("caseId", args.caseId))
      .order("asc")
      .collect();
    return rows.map((m) => ({
      _id: m._id,
      senderRole: m.senderRole,
      body: m.body,
      createdAt: m.createdAt,
    }));
  },
});

// Envoi d'un message par le syndic. Schedule l'email cabinet (découplé :
// une mutation ne peut pas faire de HTTP ; un email raté ne casse rien).
export const send = mutation({
  args: { caseId: v.id("cases"), body: v.string() },
  handler: async (ctx, args): Promise<{ messageId: string }> => {
    const user = await requireRoleMutation(ctx, SYNDIC_ROLES);
    await assertCaseAccessMutation(ctx, args.caseId, user);
    if (!args.body.trim()) {
      throw new ConvexError({
        code: "message.empty",
        message: "Le message ne peut pas être vide.",
      });
    }
    const messageId = await ctx.db.insert("messages", {
      caseId: args.caseId,
      senderUserId: user._id,
      senderRole: "syndic" as const,
      body: args.body.trim(),
      createdAt: Date.now(),
    });
    await ctx.scheduler.runAfter(0, internal.email.notifyNewMessage, {
      caseId: args.caseId,
      messageId,
    });
    return { messageId };
  },
});

// Lecture interne d'un message (pour l'action email).
export const getByIdInternal = internalQuery({
  args: { messageId: v.id("messages") },
  handler: async (ctx, args) => ctx.db.get(args.messageId),
});

// Boîte de réception : cases de l'org du syndic ayant au moins un message,
// avec la date du dernier. Per-case last-message lookup isolé ici (PAS dans
// duSyndic, pour ne pas alourdir dashboard/liste). Volumétrie pilote ok.
export const inbox = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireRoleQuery(ctx, SYNDIC_ROLES);
    const cases = await ctx.db
      .query("cases")
      .withIndex("by_org", (q) => q.eq("organizationId", user.organizationId))
      .collect();
    const result: {
      caseId: string;
      secibLibelle?: string;
      status: string;
      lastMessageAt: number;
    }[] = [];
    for (const c of cases) {
      const last = await ctx.db
        .query("messages")
        .withIndex("by_case_created", (q) => q.eq("caseId", c._id))
        .order("desc")
        .first();
      if (last) {
        result.push({
          caseId: c._id,
          secibLibelle: c.secibLibelle,
          status: c.status,
          lastMessageAt: last.createdAt,
        });
      }
    }
    result.sort((a, b) => b.lastMessageAt - a.lastMessageAt);
    return result;
  },
});

// Réponse du cabinet sur un dossier. senderRole "avocat" (affiché
// "Cabinet NPL" côté syndic). Schedule la notif email au syndic (découplé,
// gracieux). Réservé NPL full access en S5a — l'avocat scopé viendra avec
// l'extension intervenant de caseAccess (note S5 dans caseAccess.ts).
export const sendAsCabinet = mutation({
  args: { caseId: v.id("cases"), body: v.string() },
  handler: async (ctx, args): Promise<{ messageId: string }> => {
    const user = await requireRoleMutation(ctx, NPL_FULL_ACCESS_ROLES);
    const caseDoc = await ctx.db.get(args.caseId);
    if (!caseDoc) {
      throw new ConvexError({
        code: "case.not_found",
        message: `Case ${args.caseId} introuvable.`,
      });
    }
    if (!args.body.trim()) {
      throw new ConvexError({
        code: "message.empty",
        message: "Le message ne peut pas être vide.",
      });
    }
    const messageId = await ctx.db.insert("messages", {
      caseId: args.caseId,
      senderUserId: user._id,
      senderRole: "avocat" as const,
      body: args.body.trim(),
      createdAt: Date.now(),
    });
    await ctx.scheduler.runAfter(0, internal.email.notifySyndicReply, {
      caseId: args.caseId,
      messageId,
    });
    return { messageId };
  },
});
