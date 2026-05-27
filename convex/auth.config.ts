// Convex ↔ Logto NPL auth wiring.
// Configured at S1 (Fondations) — Logto NPL provisioned 2026-05-27.
// Refs: PLAN_V1.md §6 Auth & rôles (Logto), MIGRATION_DIRECTUS_TO_CONVEX.md.

export default {
  providers: [
    {
      // Logto NPL OIDC issuer (self-hosted on Coolify, Coolify project NPL)
      domain: process.env.LOGTO_ISSUER_URL ?? "https://auth.nplavocat.com/oidc",
      // Convex API resource indicator declared in Logto NPL
      // (see Logto admin → Resources → "Convex Immonpl API" id: ezx5hqihw9z9fo4pqnvus)
      applicationID:
        process.env.CONVEX_RESOURCE_INDICATOR ??
        "https://convex.immo.nplavocat.com",
    },
  ],
};
