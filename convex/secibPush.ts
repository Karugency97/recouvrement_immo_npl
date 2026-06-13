"use node";

import { action } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { internal } from "./_generated/api";
import { withAuditLog } from "./lib/audit";
import { secibFetch } from "./lib/secibFetch";
import {
  createPersonne,
  createDossier,
  createPartie,
} from "./lib/secibWrite";
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
            endpoint: "/personnes/rechercher",
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

// Push effectif dans SECIB. Séquence fail-loud (SECIB n'a pas de transaction
// multi-appels) : Personne (ou réutilisation) → Dossier (sans Code) →
// Partie syndic (client) → Partie débiteur (adversaire) → patch case.
// Idempotent : un case déjà poussé (secibDossierId présent) est refusé.
// En cas d'échec après création du Dossier, on throw avec les IDs créés
// dans metadata audit ; le case reste pendingSecibPush (nettoyage manuel
// du dossier orphelin par le cabinet — accepté au pilote, cf. spec).
export const runPush = action({
  args: {
    caseId: v.id("cases"),
    matiereId: v.number(),
    responsableId: v.number(),
    reuseDebiteurPersonneId: v.optional(v.number()),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{ secibDossierId: string; code: string | null }> => {
    return await withAuditLog(
      ctx,
      {
        action: "secib.run_push",
        targetType: "case",
        targetId: args.caseId,
        metadata: {
          matiereId: args.matiereId,
          responsableId: args.responsableId,
        },
      },
      async (audit) => {
        if (!(NPL_FULL_ACCESS_ROLES as readonly string[]).includes(audit.role)) {
          throw forbidden(audit.role, NPL_FULL_ACCESS_ROLES);
        }
        // v.number() accepte NaN/±Infinity → valider explicitement
        // (memory reference-convex-vnumber-accepts-nan).
        if (
          !Number.isFinite(args.matiereId) ||
          !Number.isFinite(args.responsableId)
        ) {
          throw new ConvexError({
            code: "push.invalid_referentiel",
            message: "Matière et responsable doivent être des entiers valides.",
          });
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
        // Idempotence : déjà poussé → refus.
        if (caseDoc.secibDossierId || caseDoc.pendingSecibPush === false) {
          throw new ConvexError({
            code: "push.already_done",
            message: "Ce dossier est déjà lié à SECIB (push refusé).",
          });
        }
        if (!caseDoc.debiteur) {
          throw new ConvexError({
            code: "push.no_debiteur",
            message: "Ce dossier n'a pas de débiteur structuré — push impossible.",
          });
        }
        const org = await ctx.runQuery(internal.organizations.getById, {
          id: caseDoc.organizationId,
        });
        if (!org?.secibSyndicPersonneId) {
          throw new ConvexError({
            code: "push.no_syndic_personne",
            message: `L'organisation "${org?.name ?? "?"}" n'a pas de secibSyndicPersonneId.`,
          });
        }
        const syndicPersonneId = Number(org.secibSyndicPersonneId);
        if (!Number.isFinite(syndicPersonneId)) {
          throw new ConvexError({
            code: "push.bad_syndic_personne",
            message: `secibSyndicPersonneId "${org.secibSyndicPersonneId}" n'est pas numérique.`,
          });
        }

        // 1. Débiteur : réutilisation confirmée par le cabinet, ou création.
        const debiteurPersonneId =
          args.reuseDebiteurPersonneId !== undefined
            ? args.reuseDebiteurPersonneId
            : (await createPersonne(ctx, audit, caseDoc.debiteur)).personneId;

        // 2. Dossier (SECIB assigne le Code).
        const nom = `${caseDoc.debiteur.nom} — recouvrement charges`;
        const { dossierId, code } = await createDossier(ctx, audit, {
          nom,
          matiereId: args.matiereId,
          responsableId: args.responsableId,
        });

        // 3. Parties : syndic = client (facturable), débiteur = adversaire.
        await createPartie(ctx, audit, {
          dossierId,
          personneId: syndicPersonneId,
          typePartieId: 1,
          facturable: true,
        });
        await createPartie(ctx, audit, {
          dossierId,
          personneId: debiteurPersonneId,
          typePartieId: 2,
          facturable: false,
        });

        // 4. Patch case (succès complet uniquement).
        await ctx.runMutation(internal.cases.applyPushResult, {
          caseId: args.caseId,
          secibDossierId: String(dossierId),
          secibLibelle: nom,
          secibCodeMatiere: String(args.matiereId),
          secibIntervenantId: String(args.responsableId),
        });

        return { secibDossierId: String(dossierId), code };
      },
    );
  },
});
