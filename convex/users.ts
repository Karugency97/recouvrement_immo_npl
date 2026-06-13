import { internalQuery, query } from "./_generated/server";
import { v } from "convex/values";

// Lookup a user by their Logto subject ID. Internal (not callable from client).
// Used by SECIB actions (via lib/auth.requireRole) to resolve identity → role.
export const getByLogtoId = internalQuery({
  args: { logtoUserId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_logto_user", (q) =>
        q.eq("logtoUserId", args.logtoUserId),
      )
      .unique();
  },
});

// Premier user npl_admin — auteur technique des cases importées de SECIB
// (authorUserId est requis au schéma ; l'import n'a pas d'auteur humain).
// Pas d'index sur role : table users minuscule, filter acceptable.
export const getFirstNplAdmin = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("role"), "npl_admin"))
      .first();
  },
});

// Public query — returns the calling user's identity + role + org name.
// Used by the /convex-poc/dossiers playground to show "Connected as X, role Y".
// Returns null if the caller is unauthenticated OR not provisioned.
export const me = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const user = await ctx.db
      .query("users")
      .withIndex("by_logto_user", (q) =>
        q.eq("logtoUserId", identity.subject),
      )
      .unique();
    if (!user) return null;
    const org = await ctx.db.get(user.organizationId);
    return {
      logtoUserId: user.logtoUserId,
      email: user.email,
      name: user.name,
      role: user.role,
      organizationName: org?.name ?? null,
      organizationKind: org?.kind ?? null,
    };
  },
});

// Emails des utilisateurs syndic d'une org — destinataires de la
// notification "réponse du cabinet" (S5a). Internal : appelée par l'action
// email. Filtre sur les rôles syndic (un npl_* rattaché à l'org ne doit
// pas recevoir la notif destinée au syndic).
export const syndicEmailsForOrg = internalQuery({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const users = await ctx.db
      .query("users")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId),
      )
      .collect();
    return users
      .filter(
        (u) => u.role === "syndic_admin" || u.role === "syndic_gestionnaire",
      )
      .map((u) => u.email);
  },
});
