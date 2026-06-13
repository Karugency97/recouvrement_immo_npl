"use node";

import { action } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { internal } from "./_generated/api";
import { withAuditLog } from "./lib/audit";
import { secibFetch } from "./lib/secibFetch";
import { NPL_FULL_ACCESS_ROLES } from "./lib/auth";
import { forbidden } from "./lib/errors";

// Extracteur défensif : la réponse de recherche personne SECIB n'a pas de
// forme garantie (array | { data } | { Resultats }). On renvoie un tableau
// best-effort de { PersonneId, Nom } pour que le cabinet repère un doublon ;
// jamais d'exception sur une forme inattendue (→ tableau vide).
function extractPersonneMatches(
  raw: unknown,
): { personneId: number; nom: string }[] {
  const candidates =
    Array.isArray(raw)
      ? raw
      : Array.isArray((raw as { data?: unknown })?.data)
        ? (raw as { data: unknown[] }).data
        : Array.isArray((raw as { Resultats?: unknown })?.Resultats)
          ? (raw as { Resultats: unknown[] }).Resultats
          : [];
  const out: { personneId: number; nom: string }[] = [];
  for (const item of candidates) {
    const o = item as { PersonneId?: unknown; Nom?: unknown; NomCourt?: unknown };
    if (typeof o.PersonneId === "number") {
      out.push({
        personneId: o.PersonneId,
        nom: String(o.NomCourt ?? o.Nom ?? o.PersonneId),
      });
    }
  }
  return out;
}

// Aperçu du push : ce qui sera créé dans SECIB. Aucune écriture. Réservé
// au cabinet (full access). Cherche un débiteur homonyme pour proposer la
// réutilisation (évite un doublon de Personne).
export const previewPush = action({
  args: { caseId: v.id("cases") },
  handler: async (ctx, args): Promise<unknown> => {
    return await withAuditLog(
      ctx,
      {
        action: "secib.preview_push",
        targetType: "case",
        targetId: args.caseId,
      },
      async (audit) => {
        if (!(NPL_FULL_ACCESS_ROLES as readonly string[]).includes(audit.role)) {
          throw forbidden(audit.role, NPL_FULL_ACCESS_ROLES);
        }
        const caseDoc = await ctx.runQuery(internal.cases.getByIdInternal, {
          caseId: args.caseId,
        });
        if (!caseDoc) {
          throw new ConvexError({
            code: "case.not_found",
            message: `Case ${args.caseId} introuvable.`,
          });
        }
        if (!caseDoc.debiteur) {
          throw new ConvexError({
            code: "push.no_debiteur",
            message:
              "Ce dossier n'a pas de débiteur structuré (créé hors wizard ?) — push impossible.",
          });
        }
        const org = await ctx.runQuery(internal.organizations.getById, {
          id: caseDoc.organizationId,
        });
        if (!org?.secibSyndicPersonneId) {
          throw new ConvexError({
            code: "push.no_syndic_personne",
            message: `L'organisation "${org?.name ?? "?"}" n'a pas de secibSyndicPersonneId — impossible de rattacher le syndic comme partie.`,
          });
        }
        // Recherche homonyme (lecture). Échec toléré : la recherche n'est
        // qu'une aide, son échec ne doit pas bloquer l'aperçu.
        let matches: { personneId: number; nom: string }[] = [];
        try {
          const searchRaw = await secibFetch(ctx, audit, {
            endpoint: "/personnes",
            targetType: "personne_search",
            targetId: caseDoc.debiteur.nom,
            params: { denomination: caseDoc.debiteur.nom },
          });
          matches = extractPersonneMatches(searchRaw);
        } catch {
          matches = [];
        }
        return {
          debiteur: caseDoc.debiteur,
          syndicPersonneId: org.secibSyndicPersonneId,
          syndicName: org.name,
          alreadyPushed: Boolean(caseDoc.secibDossierId),
          existingMatches: matches,
        };
      },
    );
  },
});
