import { internalMutation, internalQuery, query } from "./_generated/server";
import { v } from "convex/values";
import { requireRoleQuery, SYNDIC_ROLES } from "./lib/auth";
import { noSecibIntervenantId } from "./lib/errors";

// ─────────────────────────────────────────────────────────────────
// cases — dossiers de recouvrement (hub central du schéma).
// S2d : upsert d'import SECIB + première query scopée avocat.
// Les queries de listing syndic arrivent avec le portail S3.
// ─────────────────────────────────────────────────────────────────

// Snapshot SECIB porté par l'import (sous-ensemble des champs secib* du schéma).
const snapshotValidator = v.object({
  secibDossierId: v.string(),
  secibLibelle: v.string(),
  secibCodeMatiere: v.optional(v.string()),
  secibMatiereLibelle: v.optional(v.string()),
  secibDateOuverture: v.optional(v.number()),
  secibIntervenantId: v.optional(v.string()),
  secibResponsableNom: v.optional(v.string()),
});

// Upsert idempotent par by_secib_dossier. Le patch ne touche QUE le
// snapshot secib* : un re-run d'import ne doit jamais écraser status,
// montants, pièces ou tout champ saisi par le cabinet entre-temps.
export const upsertFromSecib = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    authorUserId: v.id("users"),
    snapshot: snapshotValidator,
  },
  handler: async (ctx, args): Promise<"inserted" | "updated"> => {
    const now = Date.now();
    const existing = await ctx.db
      .query("cases")
      .withIndex("by_secib_dossier", (q) =>
        q.eq("secibDossierId", args.snapshot.secibDossierId),
      )
      .unique();

    if (existing) {
      // Patch champ par champ, PAS de spread : undefined est strippé à la
      // frontière runMutation, mais un undefined EXPLICITE dans db.patch
      // désactive le champ — requis pour qu'un Responsable retiré dans
      // SECIB révoque bien l'accès (secibIntervenantId porte le scoping).
      // organizationId est aussi SECIB-derived : un dossier transféré de
      // syndic suit son nouveau syndic au re-import.
      await ctx.db.patch(existing._id, {
        organizationId: args.organizationId,
        secibDossierId: args.snapshot.secibDossierId,
        secibLibelle: args.snapshot.secibLibelle,
        secibCodeMatiere: args.snapshot.secibCodeMatiere,
        secibMatiereLibelle: args.snapshot.secibMatiereLibelle,
        secibDateOuverture: args.snapshot.secibDateOuverture,
        secibIntervenantId: args.snapshot.secibIntervenantId,
        secibResponsableNom: args.snapshot.secibResponsableNom,
        secibSnapshotAt: now,
        updatedAt: now,
      });
      return "updated";
    }

    await ctx.db.insert("cases", {
      organizationId: args.organizationId,
      authorUserId: args.authorUserId,
      status: "CREE",
      statusChangedAt: now,
      statusChangedByUserId: args.authorUserId,
      casSpecial: [],
      pieces: [],
      ...args.snapshot,
      secibSnapshotAt: now,
      createdAt: now,
      updatedAt: now,
    });
    return "inserted";
  },
});

// Query scopée avocat : les cases dont l'appelant est l'intervenant
// SECIB (Responsable du dossier). QUERY et non action : les données
// sont locales (c'est la raison du report S2B→S2d), donc réactif et
// zéro appel gateway. npl_admin autorisé : une avocate-admin (Nancy)
// porte les deux casquettes. Pas d'audit log — query réactive appelée
// en continu par l'UI (même convention que users.me).
export const dossiersOuJeSuisIntervenant = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireRoleQuery(ctx, ["npl_avocat", "npl_admin"]);
    const intervenantId = user.secibIntervenantId;
    if (!intervenantId) throw noSecibIntervenantId(user.logtoUserId);
    return await ctx.db
      .query("cases")
      .withIndex("by_secib_intervenant", (q) =>
        q.eq("secibIntervenantId", intervenantId),
      )
      .collect();
  },
});

// Getter interne — utilisé par les actions secib.* pour la garde
// d'appartenance org (assertCaseInOrg) avant tout appel gateway.
export const getByIdInternal = internalQuery({
  args: { caseId: v.id("cases") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.caseId);
  },
});

// Liste des cases de l'org du syndic appelant — pendant LOCAL de
// secib.dossiersDuSyndic (qui interroge SECIB en direct). Realtime,
// zéro appel gateway. collect() : volumétrie pilote ≤ ~150 docs,
// tri/filtres côté client ; pagination quand le volume l'exigera.
export const duSyndic = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireRoleQuery(ctx, SYNDIC_ROLES);
    const rows = await ctx.db
      .query("cases")
      .withIndex("by_org", (q) => q.eq("organizationId", user.organizationId))
      .collect();
    // Projection explicite : ne JAMAIS renvoyer au syndic les champs
    // internes/cabinet (authorUserId, statusChangedByUserId, previousStatus,
    // secibIntervenantId, secibCodeMatiere, pieces, casSpecial). Le payload
    // réseau = exactement ce que l'UI consomme (cf. CaseDoc côté frontend).
    return rows.map((c) => ({
      _id: c._id,
      status: c.status,
      statusChangedAt: c.statusChangedAt,
      principalCents: c.principalCents,
      secibDossierId: c.secibDossierId,
      secibLibelle: c.secibLibelle,
      secibMatiereLibelle: c.secibMatiereLibelle,
      secibDateOuverture: c.secibDateOuverture,
      secibSnapshotAt: c.secibSnapshotAt,
      secibResponsableNom: c.secibResponsableNom,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));
  },
});
