"use node";

import type { ActionCtx } from "../_generated/server";
import { internal } from "../_generated/api";
import type { AuditContext } from "./audit";
import { secibError, secibApiKeyMissing } from "./errors";

const SECIB_BASE_URL =
  process.env.SECIB_GATEWAY_BASE_URL ?? "https://apisecib.nplavocat.com/api/v1";

function secibHeaders(): HeadersInit {
  const apiKey = process.env.SECIB_GATEWAY_API_KEY;
  if (!apiKey) throw secibApiKeyMissing();
  return {
    "X-API-Key": apiKey,
    Accept: "application/json",
    "Content-Type": "application/json",
  };
}

export type SecibFetchOpts = {
  endpoint: string;
  targetType: string;
  targetId: string;
  method?: "GET" | "POST" | "PATCH";
  params?: Record<string, string | number | undefined>;
  body?: unknown;
};

// ─────────────────────────────────────────────────────────────────
// secibFetch — wraps SECIB gateway calls with automatic logging.
//
// Auto-populates secibFetchLog with full request + response + status +
// fetchedByUserId (taken from audit.userId). On non-2xx, throws
// secibError ConvexError so the caller gets a structured payload.
// ─────────────────────────────────────────────────────────────────

export async function secibFetch<T = unknown>(
  ctx: ActionCtx,
  audit: AuditContext,
  opts: SecibFetchOpts,
): Promise<T> {
  const method = opts.method ?? "GET";

  // Build URL with query params
  let url = `${SECIB_BASE_URL}${opts.endpoint}`;
  if (opts.params) {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(opts.params)) {
      if (value !== undefined) search.set(key, String(value));
    }
    const qs = search.toString();
    if (qs) url += `?${qs}`;
  }

  // Execute fetch
  const res = await fetch(url, {
    method,
    headers: secibHeaders(),
    ...(opts.body !== undefined ? { body: JSON.stringify(opts.body) } : {}),
  });

  // Read response (may be JSON or text on error)
  const responseText = await res.text();
  let responsePayload: unknown;
  try {
    responsePayload = JSON.parse(responseText);
  } catch {
    responsePayload = { raw: responseText };
  }

  // Auto-populate secibFetchLog regardless of success/failure
  await ctx.runMutation(internal.secibFetchLog.append, {
    endpoint: opts.endpoint,
    targetType: opts.targetType,
    targetId: opts.targetId,
    requestParams: { ...(opts.params ?? {}), method, body: opts.body },
    responsePayload,
    status: res.status,
    fetchedByUserId: audit.userId,
  });

  if (!res.ok) {
    throw secibError(res.status, opts.endpoint, responseText);
  }

  return responsePayload as T;
}
