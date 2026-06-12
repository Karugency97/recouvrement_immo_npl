"use node";

import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v, ConvexError } from "convex/values";
import { secibFetch, SYSTEM_FETCH_ACTOR } from "./lib/secibFetch";
import { cronRunRow } from "./lib/audit";

// ─────────────────────────────────────────────────────────────────
// Import one-shot (ré-exécutable) des dossiers SECIB d'un syndic
// pilote vers la table cases. Déclenché manuellement :
//   npx convex run importSecib:runForSyndic '{"secibSyndicPersonneId":"5847"}'
// Idempotent : upsert par secibDossierId (cases.upsertFromSecib).
// Réutilise l'acteur système S2c — chaque appel gateway est tracé
// dans secibFetchLog, le run dans auditLogs (job import-secib-dossiers).
// ─────────────────────────────────────────────────────────────────

// Réponses gateway : enveloppées { data: T }.
type PartiesResponse = {
  data?: Array<{ Dossier: { DossierId: number }; TypePartieId: number }>;
};
type DetailResponse = {
  data?: {
    DossierId: number;
    Nom: string;
    DateCreation?: string | null;
    IsArchive?: boolean;
    Matiere?: { MatiereId: number } | null;
    Responsable?: { UtilisateurId: number } | null;
  };
};

export const runForSyndic = internalAction({
  args: { secibSyndicPersonneId: v.string() },
  handler: async (
    ctx,
    args,
  ): Promise<{
    imported: number;
    updated: number;
    skippedArchived: number;
    failed: Record<string, string>;
  }> => {
    const org = await ctx.runQuery(internal.organizations.getBySecibPersonneId, {
      secibSyndicPersonneId: args.secibSyndicPersonneId,
    });
    if (!org) {
      throw new ConvexError({
        code: "import.org_not_found",
        message: `No organization with secibSyndicPersonneId ${args.secibSyndicPersonneId}. Run seed:upsertSyndicOrg first.`,
      });
    }
    const author = await ctx.runQuery(internal.users.getFirstNplAdmin, {});
    if (!author) {
      throw new ConvexError({
        code: "import.no_npl_admin",
        message: "No npl_admin user provisioned — needed as import author.",
      });
    }

    // 1. Dossiers où le syndic est partie, filtrés client (TypePartieId 1),
    //    dédoublonnés (un dossier peut porter plusieurs parties parent/enfant).
    const parties = await secibFetch<PartiesResponse>(ctx, SYSTEM_FETCH_ACTOR, {
      endpoint: `/personnes/${args.secibSyndicPersonneId}/dossiers`,
      targetType: "personne_dossiers",
      targetId: args.secibSyndicPersonneId,
    });
    const dossierIds = [
      ...new Set(
        (parties.data ?? [])
          .filter((p) => p.TypePartieId === 1)
          .map((p) => p.Dossier.DossierId),
      ),
    ];

    // 2. Détail par dossier — erreur isolée par dossier (pattern S2c).
    let imported = 0;
    let updated = 0;
    let skippedArchived = 0;
    const failed: Record<string, string> = {};

    for (const dossierId of dossierIds) {
      try {
        const detail = await secibFetch<DetailResponse>(ctx, SYSTEM_FETCH_ACTOR, {
          endpoint: `/dossiers/${dossierId}`,
          targetType: "dossier",
          targetId: String(dossierId),
        });
        const d = detail.data;
        if (!d) throw new Error("empty detail payload");
        if (d.IsArchive) {
          skippedArchived += 1;
          continue;
        }
        const parsedDate = d.DateCreation ? Date.parse(d.DateCreation) : NaN;
        const result = await ctx.runMutation(internal.cases.upsertFromSecib, {
          organizationId: org._id,
          authorUserId: author._id,
          snapshot: {
            secibDossierId: String(d.DossierId),
            secibLibelle: d.Nom,
            secibCodeMatiere: d.Matiere
              ? String(d.Matiere.MatiereId)
              : undefined,
            secibDateOuverture: Number.isNaN(parsedDate)
              ? undefined
              : parsedDate,
            secibIntervenantId: d.Responsable
              ? String(d.Responsable.UtilisateurId)
              : undefined,
          },
        });
        if (result === "inserted") imported += 1;
        else updated += 1;
      } catch (error) {
        failed[String(dossierId)] =
          error instanceof Error ? error.message.slice(0, 200) : String(error);
      }
    }

    const outcome = Object.keys(failed).length === 0 ? "completed" : "failed";
    await ctx.runMutation(
      internal.auditLogs.append,
      cronRunRow("import-secib-dossiers", outcome, {
        secibSyndicPersonneId: args.secibSyndicPersonneId,
        imported,
        updated,
        skippedArchived,
        failed,
      }),
    );

    return { imported, updated, skippedArchived, failed };
  },
});
