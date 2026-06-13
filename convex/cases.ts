import { internalMutation, internalQuery, query, mutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { internal } from "./_generated/api";
import {
  requireRoleQuery,
  requireRoleMutation,
  SYNDIC_ROLES,
  NPL_FULL_ACCESS_ROLES,
} from "./lib/auth";
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
    // secibIntervenantId, secibCodeMatiere, casSpecial). pieces EST exposé
    // (le syndic doit voir les pièces demandées). Cf. CaseDoc frontend.
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
      pieces: c.pieces,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));
  },
});

// Liste GLOBALE pour le cabinet — tous les dossiers, tous syndics, avec
// le nom de l'org résolu (le cabinet doit savoir de quel syndic vient
// chaque dossier). Réservé NPL full access ; npl_avocat passe par sa
// query scopée dossiersOuJeSuisIntervenant. Pas de projection restrictive :
// le cabinet voit tout. collect() : volumétrie pilote ≤ ~150 docs.
export const allForCabinet = query({
  args: {},
  handler: async (ctx) => {
    await requireRoleQuery(ctx, NPL_FULL_ACCESS_ROLES);
    const rows = await ctx.db.query("cases").collect();
    // Résolution org → nom. Cache local des orgs déjà vues pour éviter
    // N lectures redondantes quand plusieurs dossiers partagent une org.
    const orgNames = new Map<string, string>();
    const result = [];
    for (const c of rows) {
      let orgName = orgNames.get(c.organizationId);
      if (orgName === undefined) {
        const org = await ctx.db.get(c.organizationId);
        orgName = org?.name ?? "—";
        orgNames.set(c.organizationId, orgName);
      }
      result.push({
        _id: c._id,
        organizationName: orgName,
        status: c.status,
        statusChangedAt: c.statusChangedAt,
        principalCents: c.principalCents,
        debiteur: c.debiteur,
        secibDossierId: c.secibDossierId,
        secibLibelle: c.secibLibelle,
        secibMatiereLibelle: c.secibMatiereLibelle,
        pendingSecibPush: c.pendingSecibPush ?? false,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      });
    }
    return result;
  },
});

// Détail complet d'un case pour le cabinet (full access — aucune
// restriction de champ). Renvoie null si l'id n'existe pas.
export const getByIdForCabinet = query({
  args: { caseId: v.id("cases") },
  handler: async (ctx, args) => {
    await requireRoleQuery(ctx, NPL_FULL_ACCESS_ROLES);
    const c = await ctx.db.get(args.caseId);
    if (!c) return null;
    const org = await ctx.db.get(c.organizationId);
    return { ...c, organizationName: org?.name ?? "—" };
  },
});

// Union des 9 statuts — dupliqué du schéma pour valider l'argument côté
// mutation (le schéma n'exporte pas son union). Garder synchro avec
// convex/schema.ts cases.status.
const statusValidator = v.union(
  v.literal("CREE"),
  v.literal("EN_ATTENTE_PIECES"),
  v.literal("PRET"),
  v.literal("MISE_EN_DEMEURE_ENVOYEE"),
  v.literal("INJONCTION_DE_PAYER"),
  v.literal("ASSIGNATION_AU_FOND"),
  v.literal("JUGEMENT_OBTENU"),
  v.literal("CLOTURE"),
  v.literal("SUSPENDU"),
);

// Changement de statut par le cabinet. Transition libre (le cabinet sait
// ce qu'il fait — pas de machine à états contraignante en S5a). Pose
// previousStatus / statusChangedAt / statusChangedByUserId + trace audit.
// No-op silencieux si le statut est inchangé (évite une ligne d'audit vide).
export const setStatus = mutation({
  args: { caseId: v.id("cases"), status: statusValidator },
  handler: async (ctx, args): Promise<{ changed: boolean }> => {
    const user = await requireRoleMutation(ctx, NPL_FULL_ACCESS_ROLES);
    const caseDoc = await ctx.db.get(args.caseId);
    if (!caseDoc) {
      throw new ConvexError({
        code: "case.not_found",
        message: `Case ${args.caseId} introuvable.`,
      });
    }
    if (caseDoc.status === args.status) {
      return { changed: false };
    }
    const now = Date.now();
    await ctx.db.patch(args.caseId, {
      previousStatus: caseDoc.status,
      status: args.status,
      statusChangedAt: now,
      statusChangedByUserId: user._id,
      updatedAt: now,
    });
    await ctx.runMutation(internal.auditLogs.append, {
      actorLogtoUserId: user.logtoUserId,
      actorUserId: user._id,
      actorRole: user.role,
      actorOrganizationId: user.organizationId,
      action: "case.status_changed",
      targetType: "case",
      targetId: args.caseId,
      metadata: { from: caseDoc.status, to: args.status },
    });
    return { changed: true };
  },
});

// Applique le résultat d'un push SECIB réussi (appelée par secibPush.runPush
// après création complète Personne+Dossier+Parties). Patch le snapshot SECIB
// et lève le flag pendingSecibPush. Internal : jamais appelée par le client.
// Compare-and-set : la mutation (transactionnelle) est la dernière barrière
// contre un double push concurrent — l'action n'est pas transactionnelle, donc
// deux runPush parallèles peuvent tous deux franchir la garde côté action.
export const applyPushResult = internalMutation({
  args: {
    caseId: v.id("cases"),
    secibDossierId: v.string(),
    secibLibelle: v.string(),
    secibCodeMatiere: v.string(),
    secibIntervenantId: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.caseId);
    if (existing?.secibDossierId) {
      throw new ConvexError({
        code: "push.already_done",
        message: `Case ${args.caseId} déjà lié à SECIB (dossier ${existing.secibDossierId}).`,
      });
    }
    const now = Date.now();
    await ctx.db.patch(args.caseId, {
      secibDossierId: args.secibDossierId,
      secibLibelle: args.secibLibelle,
      secibCodeMatiere: args.secibCodeMatiere,
      secibIntervenantId: args.secibIntervenantId,
      secibSnapshotAt: now,
      pendingSecibPush: false,
      updatedAt: now,
    });
  },
});
