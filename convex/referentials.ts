"use node";

import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { secibFetch, SYSTEM_FETCH_ACTOR } from "./lib/secibFetch";
import { cronRunRow } from "./lib/audit";

// ─────────────────────────────────────────────────────────────────
// Référentiels SECIB — cache quotidien dans cachedReferentials.
// Le cron referentials-refresh appelle refreshAll chaque nuit ; chaque
// kind est fetché indépendamment (un échec n'invalide pas les autres,
// le cache précédent reste servi — TTL 25h pour absorber un raté).
// L'upsert vit dans cachedReferentials.ts (les fichiers "use node"
// ne peuvent contenir que des actions).
// ─────────────────────────────────────────────────────────────────

// Paths côté gateway npl-api-gateway (src/routes/referentiel.ts).
// ⚠ MATIERES_CONTENTIEUX est bien "matieres/contentieux" (slash, pas tiret).
const KIND_ENDPOINTS = {
  CODES_ACTIVITES: "/referentiel/codes-activites",
  CODES_FACTURATION: "/referentiel/codes-facturation",
  MATIERES_CONTENTIEUX: "/referentiel/matieres/contentieux",
  INTERVENANTS: "/referentiel/intervenants",
  ETAPES_PARAPHEUR: "/referentiel/etapes-parapheur",
} as const;

type Kind = keyof typeof KIND_ENDPOINTS;

// Type de retour explicite : ce module référence internal.* — inférence
// circulaire TS7022 sinon (même piège qu'en S2B).
export const refreshAll = internalAction({
  args: {},
  handler: async (ctx): Promise<void> => {
    const refreshed: string[] = [];
    const failed: Record<string, string> = {};

    for (const kind of Object.keys(KIND_ENDPOINTS) as Kind[]) {
      try {
        const payload = await secibFetch(ctx, SYSTEM_FETCH_ACTOR, {
          endpoint: KIND_ENDPOINTS[kind],
          targetType: "referentiel",
          targetId: kind,
        });
        await ctx.runMutation(internal.cachedReferentials.upsertKind, {
          kind,
          payload,
        });
        refreshed.push(kind);
      } catch (error) {
        failed[kind] =
          error instanceof Error ? error.message.slice(0, 200) : String(error);
      }
    }

    // Tout échec partiel se logue .failed — le monitoring surveille les rows
    // .failed ; metadata.refreshed garde le détail du succès partiel.
    const outcome = Object.keys(failed).length === 0 ? "completed" : "failed";
    await ctx.runMutation(
      internal.auditLogs.append,
      cronRunRow("referentials-refresh", outcome, { refreshed, failed }),
    );
  },
});
