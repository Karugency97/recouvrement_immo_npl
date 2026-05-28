import { UserScope, type LogtoNextConfig } from "@logto/next";

// Logto NPL OIDC config — points at the dedicated NPL Logto instance
// provisioned on Coolify (https://auth.nplavocat.com).
//
// IMPORTANT: @logto/next requires a "Traditional Web App" in Logto (not SPA).
// The S0 setup created an SPA (Immonpl Frontend, app id hg2kdgwrvcg7l2xx86omc).
// Before this S1 wiring can authenticate users, create a Traditional Web App
// in Logto NPL with these settings:
//   - Redirect URI:           ${baseUrl}/api/logto/callback
//   - Post-sign-out URI:      ${baseUrl}
//   - Resource indicators:    NEXT_PUBLIC_LOGTO_RESOURCE (Convex API resource)
//   - Org roles required for the org scopes below
// Then put its appId/appSecret in env (see .env.example).
export const CONVEX_RESOURCE_INDICATOR =
  process.env.NEXT_PUBLIC_LOGTO_RESOURCE ?? "https://convex.immo.nplavocat.com";

export const logtoConfig: LogtoNextConfig = {
  endpoint: process.env.NEXT_PUBLIC_LOGTO_ENDPOINT ?? "https://auth.nplavocat.com",
  appId: process.env.NEXT_PUBLIC_LOGTO_APP_ID ?? "",
  appSecret: process.env.LOGTO_APP_SECRET ?? "",
  baseUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  cookieSecret: process.env.LOGTO_COOKIE_SECRET ?? "",
  cookieSecure: process.env.NODE_ENV === "production",
  // We request the Convex resource so Logto issues access tokens whose `aud`
  // matches the resource indicator Convex expects (see convex/auth.config.ts).
  resources: [CONVEX_RESOURCE_INDICATOR],
  // Organization scopes let Logto issue org-scoped access tokens carrying
  // org roles (npl_admin / npl_assistant / npl_avocat / syndic_*).
  // Convex action requireRole() reads the role from the user's Convex profile,
  // but we still need these scopes so the JWT carries enough context for
  // future multi-org switching and for the auditLogs.
  scopes: [
    UserScope.Email,
    UserScope.Profile,
    UserScope.Organizations,
    UserScope.OrganizationRoles,
  ],
};
