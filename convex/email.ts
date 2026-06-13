"use node";

import { internalAction } from "./_generated/server";
import type { ActionCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

// ─────────────────────────────────────────────────────────────────
// Email via Resend — DÉGRADATION GRACIEUSE. Sans RESEND_API_KEY,
// l'envoi est sauté proprement (log + audit), la messagerie n'est pas
// impactée. Un email raté ne throw jamais (côté appelant = scheduler).
// ─────────────────────────────────────────────────────────────────

// secibLibelle (import SECIB) et message.body (texte libre syndic) sont
// injectés dans l'HTML de l'email — échapper pour éviter markup cassé /
// injection dans le client mail du cabinet.
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function auditEmail(
  ctx: ActionCtx,
  outcome: "sent" | "skipped" | "failed",
  metadata: Record<string, unknown>,
) {
  await ctx.runMutation(internal.auditLogs.append, {
    actorLogtoUserId: "system:email",
    actorRole: "system",
    action: `email.${outcome}`,
    metadata,
  });
}

export const sendEmail = internalAction({
  args: { to: v.string(), subject: v.string(), html: v.string() },
  handler: async (ctx, args): Promise<{ sent: boolean }> => {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      await auditEmail(ctx, "skipped", { reason: "no_api_key", to: args.to });
      return { sent: false };
    }
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: process.env.RESEND_FROM ?? "immonpl@nplavocat.com",
          to: args.to,
          subject: args.subject,
          html: args.html,
        }),
      });
      if (!res.ok) {
        await auditEmail(ctx, "failed", {
          status: res.status,
          body: (await res.text()).slice(0, 200),
        });
        return { sent: false };
      }
      await auditEmail(ctx, "sent", { to: args.to, subject: args.subject });
      return { sent: true };
    } catch (error) {
      await auditEmail(ctx, "failed", {
        error: (error instanceof Error ? error.message : String(error)).slice(0, 200),
      });
      return { sent: false };
    }
  },
});

// Notifie le cabinet d'un nouveau message syndic.
export const notifyNewMessage = internalAction({
  args: { caseId: v.id("cases"), messageId: v.id("messages") },
  handler: async (ctx, args): Promise<void> => {
    const to = process.env.CABINET_NOTIFICATION_EMAIL;
    if (!to) {
      await auditEmail(ctx, "skipped", { reason: "no_recipient" });
      return;
    }
    const message = await ctx.runQuery(internal.messages.getByIdInternal, {
      messageId: args.messageId,
    });
    const caseDoc = await ctx.runQuery(internal.cases.getByIdInternal, {
      caseId: args.caseId,
    });
    if (!message || !caseDoc) {
      await auditEmail(ctx, "skipped", {
        reason: "message_or_case_missing",
        messageId: args.messageId,
        caseId: args.caseId,
      });
      return;
    }
    const libelle = escapeHtml(caseDoc.secibLibelle ?? "Dossier");
    const extrait = escapeHtml(message.body.slice(0, 300));
    const url = `https://immo.nplavocat.com/dossiers/${args.caseId}`;
    await ctx.runAction(internal.email.sendEmail, {
      to,
      subject: `Nouveau message — ${libelle}`,
      html: `<p>Un syndic a envoyé un message sur le dossier <strong>${libelle}</strong> :</p>
<blockquote>${extrait}</blockquote>
<p><a href="${url}">Ouvrir le dossier</a></p>`,
    });
  },
});
