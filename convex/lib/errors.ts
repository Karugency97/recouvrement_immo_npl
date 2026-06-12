import { ConvexError } from "convex/values";

// ─────────────────────────────────────────────────────────────────
// ConvexError factories — typed structured errors.
// Use these instead of `throw new Error(...)` so the client sees a
// meaningful payload even when REDACT_LOGS_TO_CLIENT=true.
//
// Format: ConvexError({ code: "scope.what_happened", message: "...", ...extras })
// ─────────────────────────────────────────────────────────────────

export function notAuthenticated(): ConvexError<{ code: string; message: string }> {
  return new ConvexError({
    code: "auth.not_authenticated",
    message:
      "Authentication required. SECIB data is confidential — only signed-in users may query it.",
  });
}

export function notProvisioned(
  logtoUserId: string,
): ConvexError<{ code: string; message: string; logtoUserId: string }> {
  return new ConvexError({
    code: "auth.not_provisioned",
    message: `User ${logtoUserId} is authenticated but not provisioned in immonpl. Contact an NPL admin to be granted access.`,
    logtoUserId,
  });
}

export function forbidden(
  role: string,
  allowed: readonly string[],
): ConvexError<{ code: string; message: string; role: string; allowed: string[] }> {
  return new ConvexError({
    code: "auth.forbidden",
    message: `Role "${role}" is not authorized for this action. Allowed: ${allowed.join(", ")}.`,
    role,
    // ConvexError payloads must be Convex Values — readonly arrays are not assignable
    allowed: [...allowed],
  });
}

export function noSecibPersonneId(
  orgName: string,
): ConvexError<{ code: string; message: string; orgName: string }> {
  return new ConvexError({
    code: "syndic.no_secib_personne_id",
    message: `Organization "${orgName}" has no secibSyndicPersonneId configured. Cannot scope to its SECIB dossiers.`,
    orgName,
  });
}

export function secibError(
  status: number,
  endpoint: string,
  body: string,
): ConvexError<{ code: string; message: string; status: number; endpoint: string; body: string }> {
  return new ConvexError({
    code: "secib.fetch_failed",
    message: `SECIB gateway ${status} on ${endpoint}: ${body.slice(0, 200)}`,
    status,
    endpoint,
    body,
  });
}

export function secibApiKeyMissing(): ConvexError<{ code: string; message: string }> {
  return new ConvexError({
    code: "secib.api_key_missing",
    message:
      "SECIB_GATEWAY_API_KEY is not set. Configure it via `npx convex env set SECIB_GATEWAY_API_KEY <key>`.",
  });
}
