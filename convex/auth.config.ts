// Convex ↔ Logto NPL auth wiring.
// Configured at S1 (Fondations) — Logto NPL provisioned 2026-05-27.
// Refs: PLAN_V1.md §6 Auth & rôles (Logto), MIGRATION_DIRECTUS_TO_CONVEX.md.

export default {
  providers: [
    {
      // Logto NPL OIDC issuer (self-hosted on Coolify, Coolify project NPL)
      domain: process.env.LOGTO_ISSUER_URL ?? "https://auth.nplavocat.com/oidc",
      // We validate Logto ID tokens (aud = the Traditional Web App id), not
      // resource access tokens: Logto access tokens have `typ: at+jwt`, which
      // convex-backend's OIDC verifier rejects (get-convex/convex-backend#75).
      applicationID: process.env.LOGTO_APP_ID ?? "ky0iisybs0g3l7avvju4y",
    },
  ],
};
